// Validate existing lane A observations; this is not a new scenario oracle.
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyDeployedImage,verifyImageRollout} from './check-image-rollout.mjs';
import {authorize} from './vulnerability-evidence.mjs';
import {target,remediation} from '../tests/scenarios/vulnerability-evidence.mjs';
import {unchanged,updated,sameTag,earlyDecision,absent} from '../tests/scenarios/runtime-evidence.mjs';
export const pair=['7243334fe4ee7073801a86b25c90986b7d3c5ece','fc58e220e2d3f38d13216b23e61ffc31271f112f'];
const check=(ok,msg)=>{if(!ok) throw new Error(msg);};
export function audit(suite,directory,staticDirectory,main) {
  check(['demo','vulnerabilities'].includes(suite),'Unknown suite');
  const rows=[];
  const json=(p)=>JSON.parse(readFileSync(join(directory,p),'utf8'));
  const bytes=p=>{check(readFileSync(join(directory,p)).length>0,'Empty evidence: '+p);};
  const status=(p,wanted='PASS')=>{const v=json(p);check(v.status===wanted,`${p}: expected ${wanted}, found ${v.status}`);return v;};
  const boundary=(scenario,name,operation)=>{try {operation();rows.push({scenario,boundary:name,status:'PASS'});} catch(e){rows.push({scenario,boundary:name,status:'FAIL',reason:e.message});}};
  const http=(prefix,commit)=>execFileSync(process.execPath,[join(import.meta.dirname,'lab-contracts.mjs'),'response',...['health','quote','version'].map(k=>join(directory,prefix+k+'.json')),commit]);
  const admission=(log,policy,rule,name='quotes-node')=>execFileSync('bash',['-c','source "$1/tests/scenarios/f13.sh"; scenario_admission_single_reason "$2" "$3" "$4" "$5"','audit',resolve(import.meta.dirname,'..'),join(directory,log),policy,rule,name],{encoding:'utf8'}).trim();
  const positive=dir=>{
    const prefix=dir?dir+'/':'';
    const a=status(prefix+'analysis.json');authorize(join(directory,dir),a.image);
    const gate=status(prefix+'CI-authorized.result.json','VERIFIED');check(gate.image===a.image&&gate.phase==='authorized','Wrong authorized image/phase');
    for(const type of ['image','sbom','provenance','results']) bytes(prefix+type+'.bundle.json');
    for(const type of ['signature','sbom','provenance','results']) bytes(prefix+'verified-'+type+'.json');
    for(const key of ['health','version','quote']) bytes(prefix+'tfm-golden-'+key+'.json');
    http(prefix+'tfm-golden-',json(prefix+'build-inputs.json').commit);
    return a.image;
  };
  const rollout=(prefix,image,namespace='tfm-golden')=>verifyDeployedImage(image,json(prefix+'deployment.json'),json(prefix+'pods.json'),namespace);
  const recovery=prefix=>{
    const r=json(prefix+'recovery.json');check(r.originalStatus===0&&r.restorationStatus===0&&r.restorationAttempted===true,'Rejection/recovery did not complete');
    if(!prefix.endsWith('F07-CI/')) bytes(prefix+'attribution.json');
  };
  const fault=(id,phase)=>{
    const folder=`L01-update/${id}-${phase}/`;
    status(folder+'result.json',id==='F07'?'CI_REJECTION_AND_RECOVERY':'REJECTION_AND_RECOVERY');recovery(folder);
    const exit=json(folder+'attempt.json').exitStatus;
    check(exit===(['F06','F08'].includes(id)?1:42),'Wrong negative gate exit status');
    const prefix=(id==='F07'?'CI-F07':id==='F08'&&phase==='CI'?'CI-F08':`CI-${id}-${phase}`);
    const negative=json('L01-update/'+prefix+'-negative.result.json');
    const expected={F05:'MISSING_SBOM',F06:'INTEGRATION_FAILURE',F07:'MISSING_IMAGE_SIGNATURE',F08:'INTEGRATION_FAILURE',F09:'MISSING_PROVENANCE',F10:'PROVENANCE_REPOSITORY_UNAUTHORIZED',F13:'MISSING_RESULTS',F14:'RESULTS_POLICY_VERSION_MISMATCH'}[id];
    check(negative.status===expected,'Wrong gate attribution');
    const attribution=id==='F07'?negative:json(folder+'attribution.json');
    if(id==='F07') check(negative.inventoryComplete===true&&negative.predicate==='https://sigstore.dev/cosign/sign/v1','F07 evidence is incomplete');
    if(id!=='F07') check(attribution.nonTargetEvidenceAuthenticated===true,'Unrelated evidence was not authenticated');
    if(id==='F06') check(attribution.status==='AUTHENTIC_FOREIGN_SUBJECT','F06 lacks authenticated donor mismatch');
    if(id==='F08') check(attribution.status==='CRYPTOGRAPHIC_ALTERATION','F08 lacks controlled signature attribution');
    if(['F10','F14'].includes(id)) check(attribution.fixtureAuthenticated===true,'Fault fixture not authenticated');
    const restored=status('L01-update/'+prefix+'-restored.result.json','VERIFIED');
    check(restored.image===negative.image,'Recovery image changed');
    check(negative.phase===(phase==='CI'?'before-results':'authorized'),'Wrong fault boundary');
    if(phase==='admission') {
      check(json(folder+'admission.json').exitStatus!==0,'Unexpected admission');
      const rule=json(folder+'admission-attribution.json');
      const expectedRule={F05:'sbom',F06:'sbom',F08:'signature',F09:'provenance',F10:'provenance',F13:'results',F14:'results'}[id];
      const ruleName=expectedRule==='signature'?'require-image-signature':'require-'+expectedRule;
      check(rule.policy==='tfm-'+expectedRule&&[ruleName,'autogen-'+ruleName].includes(rule.rule),'Wrong admission rule');
      if(id==='F10') check(rule.reason.includes('PROVENANCE_REPOSITORY'),'Missing repository condition');
      if(id==='F14') check(rule.reason.includes('RESULTS_POLICY_VERSION'),'Missing policy version condition');
      const operation=json(folder+'admission-operation.json'),request=json(folder+'admission-request.json');
      const name='admission-'+id.toLowerCase();
      check(operation.operation==='CREATE'&&operation.kind==='Deployment'&&operation.namespace==='tfm-golden'&&operation.name===name&&operation.image===negative.image,'Not the required fresh admission operation');
      check(request.metadata.name===name&&request.metadata.namespace==='tfm-golden'&&request.spec.replicas===0&&request.spec.selector.matchLabels.app===name&&request.spec.template.metadata.labels.app===name&&request.spec.template.spec.containers[0].image===negative.image,'Directed request is not isolated on the expected image');
      check(status(folder+'before-absence.json').observation==='NotFound','Missing initial absence');
      absent(1,readFileSync(join(directory,folder+'before-observation.log'),'utf8'),'Deployment',name);
      const positiveBefore=readFileSync(join(directory,folder+'positive-before.log'),'utf8').trim();
      check(positiveBefore===`deployment.apps/${name} created (server dry run)`,'Missing successful server dry-run CREATE for the expected resource');
      check(status(folder+'rejected-absence.json').observation==='NotFound','Rejected CREATE did not prove absence');
      absent(1,readFileSync(join(directory,folder+'rejected-observation.log'),'utf8'),'Deployment',name);
      status(folder+'negative-cleanup.json');status(folder+'recovery-cleanup.json');
      check(status(folder+'recovery-after-cleanup-absence.json').observation==='NotFound','Missing recovery cleanup absence');
      const created=json(folder+'recovery-create.json');
      const owner=request.metadata?.labels?.['tfm.goldenpath/trial'];
      check(created.apiVersion==='apps/v1'&&created.kind==='Deployment'&&
        created.metadata?.name===name&&created.metadata?.namespace==='tfm-golden'&&
        typeof created.metadata?.uid==='string'&&created.metadata.uid.length>0&&
        typeof owner==='string'&&owner.length>0&&created.metadata?.labels?.['tfm.goldenpath/trial']===owner&&
        created.spec?.replicas===0&&created.spec?.selector?.matchLabels?.app===name&&
        created.spec?.template?.metadata?.labels?.app===name&&
        created.spec?.template?.spec?.containers?.[0]?.image===negative.image,
        'Missing actual recovery CREATE with expected Deployment identity, ownership and isolation');
      const parsed=admission(folder+'admission.log',rule.policy,ruleName,name);
      check(parsed===rule.rule+'\t'+rule.reason,'Raw admission differs from structured attribution');
      if(['F09','F10','F13','F14'].includes(id)) {
        check(json(folder+'result.json').legitimateRecovery==='accepted-and-healthy','Recovery acceptance missing');
        const image=json(folder+'result.json').image;
        verifyDeployedImage(image,json(folder+'recovery-deployment.json'),json(folder+'recovery-pods.json'));
        bytes(folder+'recovery-admission.log');
        http(folder+'recovery-',json('L01-update/build-inputs.json').commit);
      }
    }
  };
  boundary('F01/F02','static workflow policy',()=>{
    const v=JSON.parse(readFileSync(join(staticDirectory,'result.json')));
    check(v.status==='PASS'&&v.kind==='workflow-static','Static workflow trials incomplete');
    for(const id of ['F01','F02']) check(v[id]?.status==='STATIC_REJECTION_CONFIRMED','Missing '+id);
    check(v.L01?.status==='WORKFLOW_ACCEPTED','Missing workflow positive counterpart');
  });
  boundary('suite','aggregate',()=>status('result.json'));
  if(suite==='vulnerabilities') {
    for(const id of ['F03','F04','L02']) boundary(id,'completion',()=>status(id+(id==='L02'?'-result.json':'-completed.json')));
    for(const name of ['F03-vulnerable','F03-repaired','F04','L02']) boundary(name.split('-')[0],name+' real image analysis',()=>{
      const p=name+'/';target(join(directory,name),name);
      const a=json(p+'analysis.json');check(json(p+'build-metadata.json')['containerimage.digest']===a.image.split('@')[1],'Build digest mismatch');
      for(const scan of ['sbom-generation','vulnerability-scan']) check(readFileSync(join(directory,p+scan+'-exit.txt'),'utf8').trim()==='0','Scanner did not complete');
      bytes(p+'build-inputs.json');bytes(p+'analysis-association.json');
      if(['F03-vulnerable','F04'].includes(name)) {
        check(a.status==='BLOCKED','Negative image passed analysis');
        for(const forbidden of ['results.bundle.json','results-predicate.json','admission-response.log']) check(!existsSync(join(directory,p+forbidden)),'Negative image reached authorization/deployment');
      }
    });
    boundary('F03','remediation and reference functionality',()=>remediation(join(directory,'F03-vulnerable'),join(directory,'F03-repaired')));
    for(const name of ['F03-repaired','L02']) boundary(name.split('-')[0],'fresh authorization and protected rollout/HTTP',()=>{
      const image=positive(name);status(name+'/acceptance.json');bytes(name+'/admission-response.log');rollout(name+'/',image);
    });
  } else {
    boundary('L01','initial delivery',()=>{const image=positive('');const v=json('result.json');check(v.mode==='local'&&v.L01==='accepted-and-healthy','Not local legitimate delivery');bytes('L01-admission.log');verifyDeployedImage(image,json('runtime/L06/create-deployment.json'),json('runtime/L06/create-controller-pods.json'));});
    boundary('F13','preissuance',()=>{const r=json('F13-after-denial.json');check(r.decision==='DENY'&&r.reason==='RESULTS_ATTESTATION_MISSING','Preissuance absence missing');admission('F13-admission.log','tfm-results','require-results');});
    boundary('F07','directed admission and restoration',()=>{status('F07-completed.json','DIRECTED_ACCEPTANCE_COMPLETE');recovery('F07/');check(json('F07/admission.json').exitStatus!==0,'Unexpected signature acceptance');admission('F07/admission.log','tfm-signature','require-image-signature');});
    for(const id of ['F05','F06','F07','F08','F09','F10']) boundary(id,'early CI rejection and restoration',()=>fault(id,'CI'));
    for(const id of ['F05','F06','F08','F09','F10','F13','F14']) boundary(id,'postissuance directed admission and recovery',()=>fault(id,'admission'));
    for(const id of ['F11','F12']) for(const operation of ['Deployment-CREATE','Deployment-UPDATE','Pod-CREATE']) boundary(id,operation,()=>{
      status(id+'-completed.json','REJECTION_AND_L06_ACCEPTANCE_COMPLETE');
      const p=`runtime/${id}/${operation}/`;status(p+'result.json','ATTRIBUTED_REJECTION');status(p+'early.attribution.json');
      const a=json(p+'response.log.attribution.json');check(a.policy==='tfm-runtime','Wrong runtime policy');
      const name=operation.startsWith('Pod')?'runtime-'+id.toLowerCase():'quotes-node';
      const parsed=admission(p+'response.log','tfm-runtime',id==='F11'?'restricted-containers':'authorized-image-repository',name);
      check(parsed===a.rule+'\t'+a.diagnostic,'Raw runtime denial differs from attribution');
      if(id==='F11') {
        const prefix=`validation failure: validation error: RUNTIME: all containers must be unprivileged, without privilege escalation or capabilities. rule ${a.rule} failed at path /securityContext`;
        check(['privileged','allowPrivilegeEscalation'].some(field=>a.diagnostic===prefix+'/'+field+'/'),'Wrong controlled runtime diagnostic');
      } else check(a.diagnostic==='validation failure: IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest','Wrong image-reference diagnostic');
      earlyDecision(1,json(p+'early.json'),readFileSync(join(directory,p+'early.stderr.log'),'utf8'),join(directory,p+'request.json'),id);
      check(readFileSync(join(directory,p+'exit-status.txt'),'utf8').trim()==='1','Unexpected runtime command exit');bytes(p+'response.log');
      if(operation.endsWith('UPDATE')) unchanged(json(p+'before.json'),json(p+'after.json'));else {status(p+'after.assertion.json');absent(1,readFileSync(join(directory,p+'after.log'),'utf8'),operation.startsWith('Pod')?'Pod':'Deployment',name);}
      if(id==='F12') for(const which of ['before','after']) sameTag(json(p+'tag-'+which+'.json'));
    });
    boundary('L06','legal update, rollout and direct Pod cleanup',()=>{
      status('L06-result.json');const p='runtime/L06/';const before=json(p+'update-before.json'),after=json(p+'update-after.json');
      updated(before,after,after.spec.template.metadata.annotations['tfm.goldenpath/l06']);
      const image=json('L06-result.json').image;
      verifyDeployedImage(image,json(p+'update-deployment.json'),json(p+'update-controller-pods.json'));
      const pod=json(p+'pod-after.json');
      check(pod.metadata.name==='runtime-l06'&&pod.metadata.labels.app!=='quotes-node'&&pod.spec.containers[0].image===image,'Missing isolated positive Pod creation');
      bytes(p+'pod-response.log');bytes(p+'pod-cleanup.log');
      status(p+'pod-cleaned.assertion.json');absent(1,readFileSync(join(directory,p+'pod-cleaned.log'),'utf8'),'Pod','runtime-l06');
      http(p+'update-',json('build-inputs.json').commit);
    });
    boundary('L01/L03/L04','independent replacement delivery',()=>{
      const image=positive('L01-update');status('L03-result.json');status('L04-result.json');
      verifyImageRollout(json('result.json').image,image,json('L01-update/deployment.json'),json('L01-update/pods.json'));
    });
    boundary('L05','two authorized application source revisions',()=>{
      status('L05-result.json','ACCEPTED_TWO_SOURCE_REVISIONS');const selection=json('L05-source-authorization.json');
      check(selection.authorizedMain===main,'L05 main authorization changed');
      check(selection.from.commit===pair[0]&&selection.to.commit===pair[1]&&selection.from.applicationTree!==selection.to.applicationTree,'Wrong L05 source pair');
      let previous=json('L04-result.json').image;
      for(const [i,name] of ['from','to'].entries()) {
        const dir='L05-'+name, result=status(dir+'/result.json','ACCEPTED_AND_HEALTHY');
        check(result.commit===pair[i]&&result.freshEvidence===true,'Missing revision-specific delivery');
        const image=positive(dir);check(image===result.image,'Wrong L05 image');
        verifyImageRollout(previous,image,json(dir+'/deployment.json'),json(dir+'/pods.json'));previous=image;
        bytes(dir+'/source-unit-tests.log');bytes(dir+'/admission.log');
      }
    });
  }
  return {suite,lane:'A',status:rows.every(r=>r.status==='PASS')?'PASS':'FAIL',boundaries:rows,catalogueCount:20,measurement:'functional integration only',humanAcceptance:'pending',hostedOIDC:'NOT_EXECUTED'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [suite,dir,staticDir,main,output]=process.argv.slice(2);
  const result=audit(suite,dir,staticDir,main);writeFileSync(output,JSON.stringify(result,null,2)+'\n');process.exitCode=result.status==='PASS'?0:1;
}
