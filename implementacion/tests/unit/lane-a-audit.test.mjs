// Synthetic complete/partial evidence tests; no real admission claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {audit,pair} from '../../scripts/lane-a-audit.mjs';
import {syntheticAnalysis} from './support/vulnerability-fixture.mjs';
const commit='c'.repeat(40),main='d'.repeat(40),image=n=>'registry.invalid/lab@sha256:'+n.repeat(64);
function fixture(t,suite) {
 const root=mkdtempSync(join(tmpdir(),'lane-a-audit-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const put=(name,value)=>{mkdirSync(dirname(join(root,name)),{recursive:true});writeFileSync(join(root,name),typeof value==='string'?value:JSON.stringify(value));};
 const json=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
 const http=(p,c=commit)=>{put(p+'health.json',{status:'ok'});put(p+'quote.json',{currency:'EUR',premiumCents:1000,tariffVersion:'demo-v1'});put(p+'version.json',{name:'quotes-node',buildCommit:c});};
 const deployment=(img,generation=1)=>({metadata:{name:'quotes-node',namespace:'tfm-golden',uid:'same-uid',generation},spec:{replicas:1,template:{metadata:{annotations:{}},spec:{containers:[{name:'quotes-node',image:img}]}}},status:{observedGeneration:generation,replicas:1,updatedReplicas:1,readyReplicas:1,availableReplicas:1}});
 const pods=img=>({items:[{metadata:{name:'quotes-node-pod',uid:'pod',namespace:'tfm-golden',labels:{app:'quotes-node'}},spec:{containers:[{name:'quotes-node',image:img}]},status:{phase:'Running',conditions:[{type:'Ready',status:'True'}],containerStatuses:[{name:'quotes-node',ready:true,state:{running:{}},imageID:img}]}}]});
 const positive=(dir,img,c=commit,name='F03-repaired')=>{mkdirSync(join(root,dir),{recursive:true});syntheticAnalysis(join(root,dir),name,{image:img});const p=dir?dir+'/':'';put(p+'build-inputs.json',{commit:c});put(p+'CI-authorized.result.json',{status:'VERIFIED',image:img,phase:'authorized'});for(const type of ['image','sbom','provenance','results']) put(p+type+'.bundle.json',{synthetic:true});for(const type of ['signature','sbom','provenance','results']) put(p+'verified-'+type+'.json',{synthetic:true});http(p+'tfm-golden-',c);};
 const recordRollout=(p,img)=>{put(p+'deployment.json',deployment(img));put(p+'pods.json',pods(img));};
 const denial=(p,policy,rule,name='quotes-node',reason='synthetic controlled denial')=>{put(p,`resource Deployment/tfm-golden/${name} was blocked due to the following policies\n${policy}:\n  ${rule}: ${reason}\n`);};
 put('static/result.json',{kind:'workflow-static',status:'PASS',F01:{status:'STATIC_REJECTION_CONFIRMED'},F02:{status:'STATIC_REJECTION_CONFIRMED'},L01:{status:'WORKFLOW_ACCEPTED'}});
 put('result.json',{status:'PASS',mode:'local',image:image('a'),L01:'accepted-and-healthy'});
 if(suite==='vulnerabilities') {
  for(const [i,name] of ['F03-vulnerable','F03-repaired','F04','L02'].entries()) {
   const img=image(String(i+1));mkdirSync(join(root,name));syntheticAnalysis(join(root,name),name,{image:img});
   put(name+'/build-inputs.json',{commit});put(name+'/build-metadata.json',{'containerimage.digest':img.split('@')[1]});put(name+'/analysis-association.json',{synthetic:true});for(const scan of ['sbom-generation','vulnerability-scan']) put(name+'/'+scan+'-exit.txt','0\n');
   if(name==='F03-repaired'||name==='L02') {positive(name,img,commit,name);put(name+'/acceptance.json',{status:'PASS'});put(name+'/admission-response.log','accepted');recordRollout(name+'/',img);}
   http(name+'/tfm-reference-');put(name+'/dependency-behavior.log','{"status":"PASS","result":{"coverage":"basic"}}\n');
  }
  for(const id of ['F03','F04','L02']) put(id+(id==='L02'?'-result.json':'-completed.json'),{status:'PASS'});
 } else {
  positive('',image('a'));positive('L01-update',image('b'));recordRollout('L01-update/',image('b'));
  put('L01-admission.log','accepted');put('runtime/L06/create-deployment.json',deployment(image('a')));put('runtime/L06/create-controller-pods.json',pods(image('a')));
  put('F13-after-denial.json',{decision:'DENY',reason:'RESULTS_ATTESTATION_MISSING'});denial('F13-admission.log','tfm-results','require-results');
  put('F07-completed.json',{status:'DIRECTED_ACCEPTANCE_COMPLETE'});put('F07/recovery.json',{originalStatus:0,restorationStatus:0,restorationAttempted:true});put('F07/attribution.json',{});put('F07/admission.json',{exitStatus:1});denial('F07/admission.log','tfm-signature','require-image-signature');
  for(const id of ['F05','F06','F07','F08','F09','F10','F13','F14']) for(const phase of ['CI','admission']) {
   if((id==='F07'&&phase==='admission')||(['F13','F14'].includes(id)&&phase==='CI')) continue;
   const p=`L01-update/${id}-${phase}/`,prefix=id==='F07'?'CI-F07':id==='F08'&&phase==='CI'?'CI-F08':`CI-${id}-${phase}`;
   const status={F05:'MISSING_SBOM',F06:'INTEGRATION_FAILURE',F07:'MISSING_IMAGE_SIGNATURE',F08:'INTEGRATION_FAILURE',F09:'MISSING_PROVENANCE',F10:'PROVENANCE_REPOSITORY_UNAUTHORIZED',F13:'MISSING_RESULTS',F14:'RESULTS_POLICY_VERSION_MISMATCH'}[id];
   put(p+'result.json',{status:id==='F07'?'CI_REJECTION_AND_RECOVERY':'REJECTION_AND_RECOVERY',legitimateRecovery:'accepted-and-healthy',image:image('b')});put(p+'recovery.json',{originalStatus:0,restorationStatus:0,restorationAttempted:true});put(p+'attribution.json',{status:id==='F06'?'AUTHENTIC_FOREIGN_SUBJECT':id==='F08'?'CRYPTOGRAPHIC_ALTERATION':status,nonTargetEvidenceAuthenticated:true,fixtureAuthenticated:true});put(p+'attempt.json',{exitStatus:['F06','F08'].includes(id)?1:42});
   put('L01-update/'+prefix+'-negative.result.json',{status,image:image('b'),phase:phase==='CI'?'before-results':'authorized',inventoryComplete:true,predicate:'https://sigstore.dev/cosign/sign/v1'});put('L01-update/'+prefix+'-restored.result.json',{status:'VERIFIED',image:image('b')});
   if(phase==='admission') {
    const control={F05:'sbom',F06:'sbom',F08:'signature',F09:'provenance',F10:'provenance',F13:'results',F14:'results'}[id],rule=control==='signature'?'require-image-signature':'require-'+control,reason=id==='F10'?'PROVENANCE_REPOSITORY':id==='F14'?'RESULTS_POLICY_VERSION':'synthetic denial';
    put(p+'admission.json',{exitStatus:1});put(p+'admission-attribution.json',{policy:'tfm-'+control,rule,reason});denial(p+'admission.log','tfm-'+control,rule,'admission-'+id.toLowerCase(),reason);
    const name='admission-'+id.toLowerCase(),request=deployment(image('b'));request.metadata.name=name;request.spec.replicas=0;request.spec.selector={matchLabels:{app:name}};request.spec.template.metadata.labels={app:name};
    put(p+'rejected-observation.log',`Error from server (NotFound): deployments.apps "${name}" not found\n`);put(p+'admission-operation.json',{operation:'CREATE',kind:'Deployment',namespace:'tfm-golden',name,image:image('b')});put(p+'admission-request.json',request);put(p+'recovery-create.json',request);
    for(const record of ['before-absence','rejected-absence','negative-cleanup','recovery-cleanup','recovery-after-cleanup-absence']) put(p+record+'.json',{status:'PASS',observation:'NotFound'});
    recordRollout(p+'recovery-',image('b'));put(p+'recovery-admission.log','accepted');http(p+'recovery-');
   }
  }
  for(const id of ['F11','F12']) {
   put(id+'-completed.json',{status:'REJECTION_AND_L06_ACCEPTANCE_COMPLETE'});
   for(const op of ['Deployment-CREATE','Deployment-UPDATE','Pod-CREATE']) {
    const p=`runtime/${id}/${op}/`,name=op.startsWith('Pod')?'runtime-'+id.toLowerCase():'quotes-node',rule=id==='F11'?'restricted-containers':'authorized-image-repository';put(p+'result.json',{status:'ATTRIBUTED_REJECTION'});put(p+'early.attribution.json',{status:'PASS'});const diagnostic=id==='F11'?`validation failure: validation error: RUNTIME: all containers must be unprivileged, without privilege escalation or capabilities. rule ${rule} failed at path /securityContext/privileged/`:'validation failure: IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest';put(p+'response.log.attribution.json',{policy:'tfm-runtime',rule,diagnostic});denial(p+'response.log','tfm-runtime',rule,name,diagnostic);put(p+'exit-status.txt','1\n');
    const msgs=id==='F11'?['ESCALATION: quotes-node must declare allowPrivilegeEscalation=false','PRIVILEGED: quotes-node must declare privileged=false']:['DIGEST: quotes-node requires an image pinned to a sha256 digest'];put(p+'early.json',[{namespace:'manifests',filename:join(root,p+'request.json'),successes:4,failures:msgs.map(msg=>({msg}))}]);put(p+'early.stderr.log','');
    if(op.endsWith('UPDATE')) {put(p+'before.json',deployment(image('a')));put(p+'after.json',deployment(image('a')));} else {put(p+'after.assertion.json',{status:'PASS'});put(p+'after.log',`Error from server (NotFound): ${op.startsWith('Pod')?'pods':'deployments.apps'} "${name}" not found\n`);}
    for(const which of ['before','after']) put(p+'tag-'+which+'.json',{httpStatus:200,expectedDigest:image('a').split('@')[1],resolvedDigest:image('a').split('@')[1]});
   }
  }
  put('L06-result.json',{status:'PASS',image:image('a')});const before=deployment(image('a')),after=deployment(image('a'),2);after.spec.template.metadata.annotations['tfm.goldenpath/l06']='changed';put('runtime/L06/update-before.json',before);put('runtime/L06/update-after.json',after);put('runtime/L06/update-deployment.json',after);put('runtime/L06/update-controller-pods.json',pods(image('a')));put('runtime/L06/pod-after.json',{metadata:{name:'runtime-l06',labels:{app:'runtime-l06'}},spec:{containers:[{image:image('a')}]}});put('runtime/L06/pod-response.log','created');put('runtime/L06/pod-cleanup.log','deleted');put('runtime/L06/pod-cleaned.log','Error from server (NotFound): pods "runtime-l06" not found\n');put('runtime/L06/pod-cleaned.assertion.json',{status:'PASS'});http('runtime/L06/update-');
  put('L03-result.json',{status:'PASS'});put('L04-result.json',{status:'PASS',image:image('b')});put('L05-result.json',{status:'ACCEPTED_TWO_SOURCE_REVISIONS'});put('L05-source-authorization.json',{authorizedMain:main,from:{commit:pair[0],applicationTree:'first'},to:{commit:pair[1],applicationTree:'second'}});
  for(const [i,name] of ['from','to'].entries()) {const p='L05-'+name,img=image(String(i+3));positive(p,img,pair[i]);recordRollout(p+'/',img);put(p+'/result.json',{status:'ACCEPTED_AND_HEALTHY',commit:pair[i],image:img,freshEvidence:true});put(p+'/source-unit-tests.log','passed');put(p+'/admission.log','accepted');}
 }
 return {root,put,json,run:()=>audit(suite,root,join(root,'static'),main)};
}
for(const suite of ['demo','vulnerabilities']) test(`synthetic complete ${suite} coverage is accepted`,t=>{const f=fixture(t,suite),r=f.run();assert.equal(r.status,'PASS',JSON.stringify(r.boundaries.filter(b=>b.status!=='PASS')));assert.equal(r.catalogueCount,20);assert.equal(r.humanAcceptance,'pending');});
for(const [path,change] of [
 ['F07-completed.json',v=>({...v,status:'NOT_EXECUTED'})],['L01-update/F09-admission/recovery.json',v=>({...v,restorationStatus:1})],['L01-update/F10-admission/admission-attribution.json',v=>({...v,reason:'transport error'})],['L01-update/F13-admission/result.json',v=>({...v,status:'INCOMPLETE'})],['L01-update/F14-admission/attempt.json',v=>({...v,exitStatus:0})],['L05-source-authorization.json',v=>({...v,from:{...v.from,applicationTree:v.to.applicationTree}})],['L05-to/result.json',v=>({...v,commit:'wrong'})],['runtime/L06/update-after.json',v=>({...v,metadata:{...v.metadata,generation:1}})]
]) test(`demo refuses missing or wrong boundary: ${path}`,t=>{const f=fixture(t,'demo');f.put(path,change(f.json(path)));assert.equal(f.run().status,'FAIL');});
for(const path of ['F04-completed.json','F03-repaired/CI-authorized.result.json','L02/rollout.json']) test(`vulnerability required observations cannot be inferred: ${path}`,t=>{const f=fixture(t,'vulnerabilities');if(path==='L02/rollout.json') rmSync(join(f.root,'L02/pods.json'));else f.put(path,{status:'NOT_EXECUTED'});assert.equal(f.run().status,'FAIL');});
test('successful aggregate alone cannot complete either suite',t=>{for(const suite of ['demo','vulnerabilities']){const f=fixture(t,suite);rmSync(join(f.root,'static/result.json'));assert.equal(f.run().status,'FAIL');}});
test('negative image successful authorization is an unfavorable observation',t=>{const f=fixture(t,'vulnerabilities');f.put('F04/results.bundle.json',{});assert.equal(f.run().status,'FAIL');});
test('positive Pod cleanup requires an actual NotFound response',t=>{const f=fixture(t,'demo');f.put('runtime/L06/pod-cleaned.log','connection refused');assert.equal(f.run().status,'FAIL');});
test('runtime attribution rejects a controlled-rule evaluation error',t=>{const f=fixture(t,'demo'),p='runtime/F11/Deployment-CREATE/';const a=f.json(p+'response.log.attribution.json');a.diagnostic='validation failure: internal evaluation error';f.put(p+'response.log.attribution.json',a);f.put(p+'response.log',`resource Deployment/tfm-golden/quotes-node was blocked due to the following policies\ntfm-runtime:\n  ${a.rule}: ${a.diagnostic}\n`);assert.equal(f.run().status,'FAIL');});

test('directed recovery cannot be an unchanged apply',t=>{const f=fixture(t,'demo');f.put('L01-update/F14-admission/recovery-create.json','deployment.apps/quotes-node unchanged');assert.equal(f.run().status,'FAIL');});
test('directed request must stay outside the workload selector',t=>{const f=fixture(t,'demo'),p='L01-update/F14-admission/admission-request.json',v=f.json(p);v.spec.selector.matchLabels.app='quotes-node';f.put(p,v);assert.equal(f.run().status,'FAIL');});
