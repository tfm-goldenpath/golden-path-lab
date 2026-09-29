// Local F05/F06 fixture operations. These never issue evidence or authorize delivery.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,dirname,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {authorizeReplacement,validateBackup} from './f07-signature-evidence.mjs';
import {downloadBundleInventory,bytesOf} from './download-bundle-inventory.mjs';
import {checkInventoryConsistency} from './check-inventory-consistency.mjs';
import {authenticateBundle} from './ci-verification-gate.mjs';
export const SBOM='https://cyclonedx.org/bom';
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const decode=s=>Buffer.from(s,'base64');
const json=p=>JSON.parse(readFileSync(p));
const save=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
export function planFault(before,image,profile,donor) {
  const selected=validateBackup(before,image,profile,SBOM);
  if (!donor) return {selected};
  const other=validateBackup(donor,donor.inventory.image,'authorized',SBOM);
  if (donor.inventory.image===image || donor.inventory.image.split('@')[1]===image.split('@')[1]) throw new Error('F06 needs a distinct donor image');
  const manifest=structuredClone(other.manifest);
  manifest.subject=selected.manifest.subject; // Only unsigned OCI association changes.
  const bytes=Buffer.from(JSON.stringify(manifest));
  return {selected,donorImage:donor.inventory.image,entry:{...other.entry,digest:hash(bytes),size:bytes.length},
    raw:{manifestDigest:hash(bytes),manifest:bytes.toString('base64'),config:other.raw.config,bundle:other.raw.bundle}};
}
export function checkIsolation(before,current,image,profile,plan,restored=false,selectedType=SBOM) {
  validateBackup(before,image,profile,selectedType);
  const expected=structuredClone(before.inventory);
  if (!restored) {
    expected.descriptors=expected.descriptors.filter(d=>d.digest!==plan.selected.entry.digest);
    if (plan.entry) expected.descriptors.push(plan.entry);
  }
  checkInventoryConsistency(expected,current.inventory,image);
  const expectedRaw=before.rawArtifacts.filter(r=>restored || r.manifestDigest!==plan.selected.entry.digest);
  if (!restored && plan.raw) expectedRaw.push(plan.raw);
  const sort=a=>[...a].sort((x,y)=>x.manifestDigest.localeCompare(y.manifestDigest));
  if (JSON.stringify(sort(expectedRaw))!==JSON.stringify(sort(current.rawArtifacts))) throw new Error('Target or non-target OCI bytes changed');
  return {image,check:restored?'exact-restoration':selectedType===SBOM?'isolated-sbom-fault':'isolated-provenance-fault',bundleBytesUnchanged:!!plan.raw};
}
async function send(url,options={},statuses=[200]) {
  const r=await fetch(url,{...options,redirect:'manual',signal:AbortSignal.timeout(30000)});
  if (!statuses.includes(r.status)) throw new Error('SBOM fixture registry HTTP '+r.status);
  return r;
}
async function checkBytes(base,path,encoded) {
  const expected=decode(encoded),r=await send(base+path),actual=await bytesOf(r,expected.length);
  if (!actual.equals(expected)) throw new Error('Registry bytes differ from retained original');
}
async function putManifest(base,entry,encoded) {
  const r=await send(base+'/manifests/'+entry.digest,{method:'PUT',headers:{'Content-Type':entry.mediaType},body:decode(encoded)},[201]);
  if (r.headers.get('docker-content-digest')!==entry.digest) throw new Error('Manifest publication digest mismatch');
}
async function main() {
  const [command,stateDir,image,scenario,profile,phase]=process.argv.slice(2);
  if (!['F05','F06'].includes(scenario) || !['before-results','authorized'].includes(profile) || basename(stateDir)!=='L01-update') throw new Error('Invalid SBOM scenario context');
  const state=json(join(stateDir,'state.json')),parent=json(join(dirname(stateDir),'state.json'));
  authorizeReplacement(state,parent,basename(dirname(stateDir)),image);
  const folder=scenario+(profile==='authorized'?'-admission':'-CI'), directory=join(stateDir,folder);
  const base='http://'+state.imageRepository.split('/')[0]+'/v2/'+state.imageRepository.split('/').slice(1).join('/');
  const options={directory:stateDir,mode:'local',image,repository:state.sourceRepository,commit:state.sourceCommit};
  const trust=()=>Object.fromEntries(['development-public-key.pem','local-trusted-root.json'].map(f=>[f,hash(readFileSync(join(stateDir,f)))]));
  const assertTrust=()=>{if (JSON.stringify(trust())!==JSON.stringify(json(join(directory,'trust.json')))) throw new Error('SBOM scenario trust changed');};
  const authenticate=(raw,type,prefix,target=image)=>{
    const file=join(directory,prefix+'.bundle.json'); writeFileSync(file,decode(raw.bundle),{flag:'wx'});
    save(join(directory,prefix+'.statement.json'),authenticateBundle({...options,image:target},JSON.parse(decode(raw.bundle)),type,file,join(directory,prefix)));
  };
  if (command==='prepare') {
    const before=await downloadBundleInventory({mode:'local',image}); save(join(directory,'before.json'),before);
    let donor;
    if (scenario==='F06') {
      donor=await downloadBundleInventory({mode:'local',image:parent.imageRepository+'@'+parent.digest});
      save(join(directory,'donor.json'),donor);
    }
    const plan=planFault(before,image,profile,donor); save(join(directory,'plan.json'),plan); save(join(directory,'trust.json'),trust());
    if (plan.raw) authenticate(plan.raw,SBOM,'donor-authenticated',plan.donorImage);
    const r=await send(base+'/manifests/'+state.digest,{headers:{Accept:'application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json'}});
    const bytes=await bytesOf(r,4*1024*1024);
    if(hash(bytes)!==state.digest) throw new Error('Image digest mismatch');
    save(join(directory,'image.json'),{digest:state.digest,bytes:bytes.toString('base64')});
    return;
  }
  const before=json(join(directory,'before.json')),plan=json(join(directory,'plan.json'));
  if (command==='alter' || command==='restore') {
    if (command==='alter') {
      assertTrust();
      const current=await downloadBundleInventory({mode:'local',image}); checkIsolation(before,current,image,profile,plan,true);
      if (plan.raw) {
        // Donor is in the same repository; verify existing blobs rather than upload or re-sign.
        const manifest=JSON.parse(decode(plan.raw.manifest));
        await checkBytes(base,'/blobs/'+manifest.config.digest,plan.raw.config);
        await checkBytes(base,'/blobs/'+manifest.layers[0].digest,plan.raw.bundle);
        await putManifest(base,plan.entry,plan.raw.manifest);
      }
      await send(base+'/manifests/'+plan.selected.entry.digest,{method:'DELETE'},[202]);
    } else {
      const errors=[];
      if (plan.entry) try {await send(base+'/manifests/'+plan.entry.digest,{method:'DELETE'},[202,404]);} catch(e) {errors.push(e.message);}
      try {
        await checkBytes(base,'/blobs/'+plan.selected.manifest.config.digest,plan.selected.raw.config);
        await checkBytes(base,'/blobs/'+plan.selected.manifest.layers[0].digest,plan.selected.raw.bundle);
        await putManifest(base,plan.selected.entry,plan.selected.raw.manifest);
      } catch(e) {errors.push(e.message);}
      if(errors.length) throw new Error('Recovery failures: '+errors.join('; '));
    }
    return;
  }
  assertTrust();
  if (command==='snapshot') {
    let current;
    try {current=await downloadBundleInventory({mode:'local',image});}
    catch(e) {
      if (scenario!=='F06' || phase==='restored' || !e.subjectMismatch) throw e;
      const mismatch=e.subjectMismatch;
      save(join(directory,phase+'-mismatch.json'),mismatch);
      if (mismatch.predicate!==SBOM || JSON.stringify(mismatch.received)!==JSON.stringify(plan.raw)) throw new Error('Consumer did not receive unchanged donor bytes');
      // The production consumer stops here. This separate diagnostic verifies
      // every expected non-target directly without weakening its subject check.
      const nonTargets=before.rawArtifacts.filter(r=>r.manifestDigest!==plan.selected.entry.digest);
      for(const raw of nonTargets) {
        const manifest=JSON.parse(decode(raw.manifest));
        await checkBytes(base,'/manifests/'+raw.manifestDigest,raw.manifest);
        await checkBytes(base,'/blobs/'+manifest.config.digest,raw.config);
        await checkBytes(base,'/blobs/'+manifest.layers[0].digest,raw.bundle);
      }
      current={inventory:{image,source:mismatch.source,descriptors:mismatch.descriptors,inventoryComplete:false,check:'independent diagnostic; production retrieval stopped at foreign subject'},rawArtifacts:[...nonTargets,mismatch.received]};
    }
    save(join(directory,phase+'.json'),current);
    save(join(directory,phase+'-check.json'),checkIsolation(before,current,image,profile,plan,phase==='restored'));
    await checkBytes(base,'/manifests/'+state.digest,json(join(directory,'image.json')).bytes);
    if (phase==='after-denial') {
      checkInventoryConsistency(json(join(directory,'negative.json')).inventory,current.inventory,image);
      for (const raw of current.rawArtifacts) {
        if (plan.raw && raw.manifestDigest===plan.raw.manifestDigest) continue;
        const type=before.inventory.artifacts.find(a=>a.manifestDigest===raw.manifestDigest)?.predicateType;
        authenticate(raw,type,'non-target-'+raw.manifestDigest.slice(7));
      }
    }
  } else if(command==='attribute') {
    const prefix='CI-'+folder+'-negative', gate=json(join(stateDir,prefix+'.result.json'));
    if(gate.image!==image || gate.phase!==profile) throw new Error('Wrong gate context');
    if(scenario==='F05') {
      if(gate.status!=='MISSING_SBOM' || gate.predicate!==SBOM || !gate.inventoryComplete) throw new Error('No attributable missing SBOM');
      checkIsolation(before,json(join(stateDir,prefix+'.inventory.json')),image,profile,plan);
    } else {
      const mismatch=gate.subjectMismatch;
      if(gate.status!=='INTEGRATION_FAILURE' || mismatch?.kind!=='SUBJECT_MISMATCH' || mismatch.boundary!=='registry-inventory' || mismatch.predicate!==SBOM
          || JSON.stringify(mismatch.received)!==JSON.stringify(plan.raw)) throw new Error('No exact donor subject mismatch at target consumer');
      checkInventoryConsistency(json(join(directory,'negative.json')).inventory,{...before.inventory,descriptors:mismatch.descriptors},image);
      authenticate(mismatch.received,SBOM,'received-donor-authenticated',plan.donorImage);
    }
    save(join(directory,'attribution.json'),{scenario,image,status:scenario==='F05'?'MISSING_SBOM':'AUTHENTIC_FOREIGN_SUBJECT',boundary:scenario==='F05'?'fresh-CI':'registry-inventory',
      targetCosignReached:false,productionGateAuthenticatedNonTargets:scenario==='F05',nonTargetEvidenceAuthenticated:true,donorDigest:plan.donorImage?.split('@')[1],receivedBundleDigest:plan.raw?hash(decode(plan.raw.bundle)):undefined});
  } else throw new Error('Unknown SBOM fixture operation');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {await main();} catch(e) {console.error('SBOM scenario: '+e.message);process.exitCode=1;}
}
