// F13/F14 local laboratory fixtures. Never used to authorize a delivery.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,dirname,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {authorizeReplacement,validateBackup,mutatePlannedEvidence} from '../../scripts/f07-signature-evidence.mjs';
import {checkIsolation} from '../../scripts/sbom-scenario-evidence.mjs';
import {downloadBundleInventory,bytesOf} from '../../scripts/download-bundle-inventory.mjs';
import {checkInventoryConsistency} from '../../scripts/check-inventory-consistency.mjs';
import {authenticateBundle} from '../../scripts/ci-verification-gate.mjs';
import {parseEnvelopes} from '../../scripts/check-missing-results.mjs';
import {RESULTS_TYPE,RESULTS_POLICY_VERSION,validateResults} from '../../scripts/lab-contracts.mjs';
export {RESULTS_TYPE};
export const P0='laboratory-results-p0-fixture';
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const decode=s=>Buffer.from(s,'base64');
const json=p=>JSON.parse(readFileSync(p));
const save=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
export function fixturePredicate(original) {
  // Lab preparation requires a normal successful P1 contract first. P0 changes
  // only the policy label; it has the same mandatory successful checks.
  validateResults(original,original?.source?.repository,original?.source?.commit);
  return {...structuredClone(original),policyVersion:P0};
}
export function planFault(before,image,profile,bundleBytes) {
  if (profile!=='authorized') throw new Error('Results fault requires authorized starting delivery');
  const selected=validateBackup(before,image,profile,RESULTS_TYPE);
  if (!bundleBytes) return {selected};
  const [original]=parseEnvelopes(decode(selected.raw.bundle).toString(),{bundlesOnly:true});
  const [variant]=parseEnvelopes(bundleBytes.toString(),{bundlesOnly:true});
  if (variant.predicateType!==RESULTS_TYPE || JSON.stringify(variant.subject)!==JSON.stringify(original.subject)
      || JSON.stringify(variant.predicate)!==JSON.stringify(fixturePredicate(original.predicate))) throw new Error('F14 must alter only the selected policy property for the exact subject');
  const manifest=structuredClone(selected.manifest);
  manifest.layers[0]={...manifest.layers[0],digest:hash(bundleBytes),size:bundleBytes.length};
  const bytes=Buffer.from(JSON.stringify(manifest));
  return {selected,entry:{...selected.entry,digest:hash(bytes),size:bytes.length},
    raw:{manifestDigest:hash(bytes),manifest:bytes.toString('base64'),config:selected.raw.config,bundle:bundleBytes.toString('base64')}};
}
export function isolated(before,current,image,profile,plan,restored=false) {
  const {bundleBytesUnchanged, ...result}=checkIsolation(before,current,image,profile,plan,restored,RESULTS_TYPE);
  // P0 bytes differ from P1; the replay itself must preserve P0 unchanged.
  return {...result,check:restored?'exact-restoration':'isolated-results-fault',nonTargetBytesUnchanged:true,fixtureBytesMatchPlan:!!plan.raw};
}
export async function mutate(options) {
  return mutatePlannedEvidence({...options,validatePlan:planFault,checkSnapshot:isolated});
}
async function main() {
  const [command,stateDir,image,scenario,profile,phase]=process.argv.slice(2);
  if (!['F13','F14'].includes(scenario) || profile!=='authorized' || basename(stateDir)!=='L01-update') throw new Error('Invalid results scenario context');
  const state=json(join(stateDir,'state.json')),parent=json(join(dirname(stateDir),'state.json'));
  authorizeReplacement(state,parent,basename(dirname(stateDir)),image);
  const folder=scenario+'-admission',directory=join(stateDir,folder);
  const base='http://'+state.imageRepository.split('/')[0]+'/v2/'+state.imageRepository.split('/').slice(1).join('/');
  const options={directory:stateDir,mode:'local',image,repository:state.sourceRepository,commit:state.sourceCommit};
  const trust=()=>Object.fromEntries(['development-public-key.pem','local-trusted-root.json','state.json'].map(f=>[f,hash(readFileSync(join(stateDir,f)))]));
  const assertTrust=()=>{if(JSON.stringify(trust())!==JSON.stringify(json(join(directory,'trust.json')))) throw new Error('Results trial trust or configuration changed');};
  const authenticate=(raw,prefix)=>{
    const file=join(directory,prefix+'.bundle.json');writeFileSync(file,decode(raw.bundle),{flag:'wx'});
    return authenticateBundle(options,JSON.parse(decode(raw.bundle)),RESULTS_TYPE,file,join(directory,prefix));
  };
  const authenticateFault=(raw,prefix)=>{
    try {authenticate(raw,prefix);} catch(e) {
      if (JSON.stringify(e.resultsFailure?.violations)===JSON.stringify(['RESULTS_POLICY_VERSION'])) {
        save(join(directory,prefix+'-authentication.json'),{authenticated:true,violations:e.resultsFailure.violations,bundleSha256:hash(decode(raw.bundle))});return;
      }
      throw e;
    }
    throw new Error('Laboratory P0 unexpectedly accepted under P1');
  };
  if(command==='prepare') {
    const before=await downloadBundleInventory({mode:'local',image});save(join(directory,'before.json'),before);
    const selected=validateBackup(before,image,profile,RESULTS_TYPE);
    const original=authenticate(selected.raw,'original');save(join(directory,'original.statement.json'),original);
    save(join(directory,'trust.json'),trust());
    if(scenario==='F14') save(join(directory,'fixture-predicate.json'),fixturePredicate(original.predicate));
    save(join(directory,'fixture-label.json'),{scenario,kind:'controlled-local-laboratory-fixture',property:'policyVersion',P0,P1:RESULTS_POLICY_VERSION,preparationActor:'authorized-laboratory-producer',replayActor:'owned-registry-mutator-without-signing',historicalProductionPolicy:false});
    return;
  }
  const before=json(join(directory,'before.json'));
  if(command==='plan') {
    assertTrust();
    const plan=planFault(before,image,profile,scenario==='F14'?readFileSync(join(directory,'fixture.bundle.json')):undefined);
    if(plan.raw) authenticateFault(plan.raw,'fixture-checked');
    save(join(directory,'plan.json'),plan);return;
  }
  const plan=json(join(directory,'plan.json'));
  if(command==='alter' || command==='restore') {
    if(command==='alter') assertTrust();
    await mutate({state,parent,run:basename(dirname(stateDir)),before,plan,image,profile,restore:command==='restore'});return;
  }
  assertTrust();
  if(command==='snapshot') {
    if(!['negative','after-denial','restored'].includes(phase)) throw new Error('Invalid snapshot phase');
    const current=await downloadBundleInventory({mode:'local',image});save(join(directory,phase+'.json'),current);
    save(join(directory,phase+'-check.json'),isolated(before,current,image,profile,plan,phase==='restored'));
    const response=await fetch(base+'/manifests/'+state.digest,{headers:{Accept:'application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json'},redirect:'manual',signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw new Error('Image retrieval failed during results trial');
    const imageBytes=await bytesOf(response,4*1024*1024);
    if(hash(imageBytes)!==state.digest) throw new Error('Image bytes differ from the delivered digest');
    save(join(directory,phase+'-image.json'),{digest:state.digest,bytes:imageBytes.toString('base64')});
    if(phase==='after-denial') checkInventoryConsistency(json(join(directory,'negative.json')).inventory,current.inventory,image);
  } else if(command==='attribute') {
    const prefix='CI-'+folder+'-negative',gate=json(join(stateDir,prefix+'.result.json'));
    if(gate.image!==image || gate.phase!==profile || !gate.inventoryComplete || gate.predicate!==RESULTS_TYPE
        || gate.status!==(scenario==='F13'?'MISSING_RESULTS':'RESULTS_POLICY_VERSION_MISMATCH')) throw new Error('No attributable results rejection');
    if (!['https://sigstore.dev/cosign/sign/v1','https://cyclonedx.org/bom','https://slsa.dev/provenance/v1'].every(t=>gate.authenticatedPredicates?.includes(t))) throw new Error('Unrelated evidence authentication incomplete');
    if (scenario==='F14' && (!gate.resultsAuthenticated || JSON.stringify(gate.resultsFailure?.violations)!==JSON.stringify(['RESULTS_POLICY_VERSION']))) throw new Error('No isolated authenticated P0 mismatch');
    const received=json(join(stateDir,prefix+'.inventory.json'));
    isolated(before,received,image,profile,plan);
    checkInventoryConsistency(json(join(directory,'after-denial.json')).inventory,received.inventory,image);
    if(scenario==='F14') {
      const raw=received.rawArtifacts.find(r=>r.manifestDigest===plan.entry.digest);
      authenticateFault(raw,'received-fixture');
    }
    save(join(directory,'attribution.json'),{scenario,image,status:gate.status,nonTargetEvidenceAuthenticated:true,fixtureAuthenticated:scenario==='F14',trustUnchanged:true});
  } else throw new Error('Unknown results operation');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {await main();} catch(e) {console.error('Results scenario: '+e.message);process.exitCode=1;}
}
