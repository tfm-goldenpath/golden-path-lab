// F09/F10 local laboratory fixtures. Never used to authorize a delivery.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,dirname,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {authorizeReplacement,validateBackup} from './f07-signature-evidence.mjs';
import {checkIsolation} from './sbom-scenario-evidence.mjs';
import {downloadBundleInventory,bytesOf} from './download-bundle-inventory.mjs';
import {checkInventoryConsistency} from './check-inventory-consistency.mjs';
import {authenticateBundle} from './ci-verification-gate.mjs';
import {parseEnvelopes} from './check-missing-results.mjs';
export const PROVENANCE='https://slsa.dev/provenance/v1';
export const UNAUTHORIZED='https://example.invalid/unauthorized-provenance-fixture';
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const decode=s=>Buffer.from(s,'base64');
const json=p=>JSON.parse(readFileSync(p));
const save=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
export function fixturePredicate(original) {
  const p=structuredClone(original);
  if (!p?.buildDefinition?.externalParameters?.workflow?.repository || p.buildDefinition.externalParameters.workflow.repository===UNAUTHORIZED) throw new Error('Invalid original provenance repository');
  p.buildDefinition.externalParameters.workflow.repository=UNAUTHORIZED;
  return p;
}
export function planFault(before,image,profile,bundleBytes) {
  const selected=validateBackup(before,image,profile,PROVENANCE);
  if (!bundleBytes) return {selected};
  const [original]=parseEnvelopes(decode(selected.raw.bundle).toString(),{bundlesOnly:true});
  const [variant]=parseEnvelopes(bundleBytes.toString(),{bundlesOnly:true});
  if (variant.predicateType!==PROVENANCE || JSON.stringify(variant.subject)!==JSON.stringify(original.subject)
      || JSON.stringify(variant.predicate)!==JSON.stringify(fixturePredicate(original.predicate))) throw new Error('F10 must alter only the selected repository property for the exact subject');
  const manifest=structuredClone(selected.manifest);
  manifest.layers[0]={...manifest.layers[0],digest:hash(bundleBytes),size:bundleBytes.length};
  const bytes=Buffer.from(JSON.stringify(manifest));
  return {selected,entry:{...selected.entry,digest:hash(bytes),size:bytes.length},
    raw:{manifestDigest:hash(bytes),manifest:bytes.toString('base64'),config:selected.raw.config,bundle:bundleBytes.toString('base64')}};
}
export function isolated(before,current,image,profile,plan,restored=false) {
  const {bundleBytesUnchanged, ...result}=checkIsolation(before,current,image,profile,plan,restored,PROVENANCE);
  // F10 intentionally has different signed bytes from the original provenance.
  return {...result,nonTargetBytesUnchanged:true,fixtureBytesMatchPlan:!!plan.raw};
}
export async function mutate({state,parent,run,before,plan,image,profile,restore=false,request=fetch}) {
  authorizeReplacement(state,parent,run,image);
  const expected=planFault(before,image,profile,plan.raw ? decode(plan.raw.bundle) : undefined);
  if(JSON.stringify(expected)!==JSON.stringify(plan)) throw new Error('Mutation plan differs from validated backup and isolated fixture');
  const base='http://'+state.imageRepository.split('/')[0]+'/v2/'+state.imageRepository.split('/').slice(1).join('/');
  const send=async (url,options={},statuses=[200])=>{
    const r=await request(url,{...options,redirect:'manual',signal:AbortSignal.timeout(30000)});
    if (!statuses.includes(r.status)) throw new Error('Provenance fixture registry HTTP '+r.status);
    return r;
  };
  const put=async (entry,raw)=>{
    const r=await send(base+'/manifests/'+entry.digest,{method:'PUT',headers:{'Content-Type':entry.mediaType},body:decode(raw)},[201]);
    if (r.headers.get('docker-content-digest')!==entry.digest) throw new Error('Manifest publication digest mismatch');
  };
  if (restore) {
    const errors=[];
    if (plan.entry) try {await send(base+'/manifests/'+plan.entry.digest,{method:'DELETE'},[202,404]);} catch(e) {errors.push(e.message);}
    try {
      for (const [entry,encoded] of [[plan.selected.manifest.config,plan.selected.raw.config],[plan.selected.manifest.layers[0],plan.selected.raw.bundle]]) {
        const bytes=await bytesOf(await send(base+'/blobs/'+entry.digest),entry.size);
        if (!bytes.equals(decode(encoded))) throw new Error('Original recovery blob differs');
      }
      await put(plan.selected.entry,plan.selected.raw.manifest);
    } catch(e) {errors.push(e.message);}
    if (errors.length) throw new Error('Recovery failures: '+errors.join('; '));
    return;
  }
  isolated(before,await downloadBundleInventory({mode:'local',image,request}),image,profile,plan,true);
  if (plan.raw) {
    const upload=await send(base+'/blobs/uploads/',{method:'POST'},[202]);
    const location=upload.headers.get('location');
    if (!location) throw new Error('Missing upload location');
    const url=new URL(location,base),origin=new URL(base);
    if(url.origin!==origin.origin || !url.pathname.startsWith(origin.pathname+'/blobs/uploads/') || url.username || url.password || url.hash) throw new Error('Upload escaped owned registry');
    const bytes=decode(plan.raw.bundle);url.searchParams.set('digest',hash(bytes));
    const r=await send(url.href,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:bytes},[201]);
    if (r.headers.get('docker-content-digest')!==hash(bytes)) throw new Error('Uploaded blob digest mismatch');
    await put(plan.entry,plan.raw.manifest);
  }
  await send(base+'/manifests/'+plan.selected.entry.digest,{method:'DELETE'},[202]);
}
async function main() {
  const [command,stateDir,image,scenario,profile,phase]=process.argv.slice(2);
  if (!['F09','F10'].includes(scenario) || !['before-results','authorized'].includes(profile) || basename(stateDir)!=='L01-update') throw new Error('Invalid provenance scenario context');
  const state=json(join(stateDir,'state.json')),parent=json(join(dirname(stateDir),'state.json'));
  authorizeReplacement(state,parent,basename(dirname(stateDir)),image);
  const folder=scenario+(profile==='authorized'?'-admission':'-CI'),directory=join(stateDir,folder);
  const base='http://'+state.imageRepository.split('/')[0]+'/v2/'+state.imageRepository.split('/').slice(1).join('/');
  const options={directory:stateDir,mode:'local',image,repository:state.sourceRepository,commit:state.sourceCommit};
  const trust=()=>Object.fromEntries(['development-public-key.pem','local-trusted-root.json','state.json'].map(f=>[f,hash(readFileSync(join(stateDir,f)))]));
  const assertTrust=()=>{if(JSON.stringify(trust())!==JSON.stringify(json(join(directory,'trust.json')))) throw new Error('Provenance trial trust or configuration changed');};
  const authenticate=(raw,prefix)=>{
    const file=join(directory,prefix+'.bundle.json');writeFileSync(file,decode(raw.bundle),{flag:'wx'});
    return authenticateBundle(options,JSON.parse(decode(raw.bundle)),PROVENANCE,file,join(directory,prefix));
  };
  const authenticateFault=(raw,prefix)=>{
    try {authenticate(raw,prefix);} catch(e) {
      if (JSON.stringify(e.provenanceFailure?.violations)===JSON.stringify(['PROVENANCE_REPOSITORY'])) {
        save(join(directory,prefix+'-authentication.json'),{authenticated:true,violations:e.provenanceFailure.violations,bundleSha256:hash(decode(raw.bundle))});return;
      }
      throw e;
    }
    throw new Error('Unauthorized repository unexpectedly accepted');
  };
  if(command==='prepare') {
    const before=await downloadBundleInventory({mode:'local',image});save(join(directory,'before.json'),before);
    const selected=validateBackup(before,image,profile,PROVENANCE);
    const original=authenticate(selected.raw,'original');save(join(directory,'original.statement.json'),original);
    save(join(directory,'trust.json'),trust());
    if(scenario==='F10') save(join(directory,'fixture-predicate.json'),fixturePredicate(original.predicate));
    save(join(directory,'fixture-label.json'),{scenario,kind:'controlled-local-laboratory-fixture',property:'buildDefinition.externalParameters.workflow.repository',notNativeGithubProvenance:true});
    return;
  }
  const before=json(join(directory,'before.json'));
  if(command==='plan') {
    assertTrust();
    const plan=planFault(before,image,profile,scenario==='F10'?readFileSync(join(directory,'fixture.bundle.json')):undefined);
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
    if(!response.ok) throw new Error('Image retrieval failed during provenance trial');
    const imageBytes=await bytesOf(response,4*1024*1024);
    if(hash(imageBytes)!==state.digest) throw new Error('Image bytes differ from the delivered digest');
    save(join(directory,phase+'-image.json'),{digest:state.digest,bytes:imageBytes.toString('base64')});
    if(phase==='after-denial') checkInventoryConsistency(json(join(directory,'negative.json')).inventory,current.inventory,image);
  } else if(command==='attribute') {
    const prefix='CI-'+folder+'-negative',gate=json(join(stateDir,prefix+'.result.json'));
    if(gate.image!==image || gate.phase!==profile || !gate.inventoryComplete || gate.predicate!==PROVENANCE
        || gate.status!==(scenario==='F09'?'MISSING_PROVENANCE':'PROVENANCE_REPOSITORY_UNAUTHORIZED')) throw new Error('No attributable provenance rejection');
    const received=json(join(stateDir,prefix+'.inventory.json'));
    isolated(before,received,image,profile,plan);
    checkInventoryConsistency(json(join(directory,'after-denial.json')).inventory,received.inventory,image);
    if(scenario==='F10') {
      const raw=received.rawArtifacts.find(r=>r.manifestDigest===plan.entry.digest);
      authenticateFault(raw,'received-fixture');
    }
    save(join(directory,'attribution.json'),{scenario,image,status:gate.status,nonTargetEvidenceAuthenticated:true,fixtureAuthenticated:scenario==='F10',trustUnchanged:true});
  } else throw new Error('Unknown provenance operation');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {await main();} catch(e) {console.error('Provenance scenario: '+e.message);process.exitCode=1;}
}
