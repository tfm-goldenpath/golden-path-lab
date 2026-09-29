#!/usr/bin/env node
// Local F08 scenario operations, never a delivery authorization control.
import {createHash, createPublicKey, verify} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {basename, dirname, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {authorizeReplacement, validateBackup, checkAlteration} from './f07-signature-evidence.mjs';
import {downloadBundleInventory, bytesOf} from './download-bundle-inventory.mjs';
import {checkInventoryConsistency} from './check-inventory-consistency.mjs';
import {authenticateBundle} from './ci-verification-gate.mjs';
import {IMAGE_SIGNATURE_TYPE} from './check-bundle-profile.mjs';
const hash = b => 'sha256:' + createHash('sha256').update(b).digest('hex');
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const save = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n', {flag:'wx'});
const decode = s => {
  if (typeof s !== 'string' || !s || Buffer.from(s,'base64').toString('base64') !== s) throw new Error('Noncanonical base64');
  return Buffer.from(s,'base64');
};
function signature(bundle) {
  const e = bundle.dsseEnvelope;
  if (!e || e.signatures?.length !== 1) throw new Error('F08 requires exactly one signature');
  const bytes = decode(e.signatures[0].sig);
  // Pinned local Cosign uses P-256 ECDSA, encoded as a DER sequence of two
  // minimally encoded positive integers. Change an interior value byte only.
  if (bytes[0] !== 0x30 || bytes[1] !== bytes.length - 2 || bytes.length > 72) throw new Error('Invalid ECDSA DER sequence');
  let offset = 2;
  for (let i=0;i<2;i++) {
    const size=bytes[offset+1], start=offset+2;
    if (bytes[offset]!==2 || size<1 || size>33 || start+size>bytes.length
        || bytes[start]&128 || (size>1 && bytes[start]===0 && !(bytes[start+1]&128))
        || bytes.subarray(start,start+size).every(x=>x===0)) throw new Error('Invalid ECDSA DER integer');
    offset=start+size;
  }
  if (offset!==bytes.length) throw new Error('Invalid ECDSA DER length');
  return bytes;
}
function pae(bundle) {
  const e=bundle.dsseEnvelope, payload=decode(e.payload);
  if (e.payloadType!=='application/vnd.in-toto+json') throw new Error('Unexpected DSSE payload type');
  return Buffer.concat([Buffer.from(`DSSEv1 ${Buffer.byteLength(e.payloadType)} ${e.payloadType} ${payload.length} `),payload]);
}
export function alterBundle(original) {
  const bytes=signature(original), variant=structuredClone(original);
  bytes[bytes.length-1]^=1;
  variant.dsseEnvelope.signatures[0].sig=bytes.toString('base64');
  signature(variant);
  return variant;
}
export function compareSignatures(original, variant, pem) {
  if (JSON.stringify(alterBundle(original))!==JSON.stringify(variant)) throw new Error('Not the isolated signature alteration');
  const key=createPublicKey(pem);
  if (key.asymmetricKeyType!=='ec' || key.asymmetricKeyDetails.namedCurve!=='prime256v1') throw new Error('Unsupported local F08 key');
  if (!verify('sha256',pae(original),key,signature(original))) throw new Error('Original signature is not valid under current trust');
  if (verify('sha256',pae(variant),key,signature(variant))) throw new Error('Altered signature unexpectedly valid');
  return {status:'CRYPTOGRAPHIC_ALTERATION',algorithm:'ECDSA-P256-SHA256',originalVerified:true,variantVerified:false,encoding:'canonical-base64-and-DER',payloadUnchanged:true};
}
export function prepareAlteration(before,image,profile='before-results') {
  const selected=validateBackup(before,image,profile);
  const original=JSON.parse(decode(selected.raw.bundle));
  const variant=alterBundle(original), bundle=Buffer.from(JSON.stringify(variant));
  const manifest=structuredClone(selected.manifest);
  manifest.layers[0]={...manifest.layers[0],digest:hash(bundle),size:bundle.length};
  const raw=Buffer.from(JSON.stringify(manifest));
  return {original,variant,selected,entry:{...selected.entry,digest:hash(raw),size:raw.length},
    raw:{manifestDigest:hash(raw),manifest:raw.toString('base64'),config:selected.raw.config,bundle:bundle.toString('base64')}};
}
export function checkAlteredInventory(before,current,image,profile='before-results') {
  const plan=prepareAlteration(before,image,profile), actual=validateBackup(current,image,profile);
  const expected=structuredClone(before.inventory);
  expected.descriptors=expected.descriptors.map(d=>d.digest===plan.selected.entry.digest?plan.entry:d);
  checkInventoryConsistency(expected,current.inventory,image);
  if (JSON.stringify(actual.raw)!==JSON.stringify(plan.raw)) throw new Error('Variant OCI bytes differ from planned alteration');
  for (const raw of current.rawArtifacts) {
    if (raw.manifestDigest===plan.entry.digest) continue;
    if (JSON.stringify(raw)!==JSON.stringify(before.rawArtifacts.find(b=>b.manifestDigest===raw.manifestDigest))) throw new Error('Non-target bytes changed');
  }
  return {scenario:'F08',image,originalManifest:plan.selected.entry.digest,alteredManifest:plan.entry.digest,check:'only-cryptographic-signature-changed'};
}

export async function mutateAlteredSignature({state,parent,run,image,backup,profile='before-results',restore=false,request=fetch}) {
  authorizeReplacement(state,parent,run,image);
  const plan=prepareAlteration(backup,image,profile);
  const base='http://'+state.imageRepository.split('/')[0]+'/v2/'+state.imageRepository.split('/').slice(1).join('/');
  const send=async (url,options={},statuses=[200])=>{
    const r=await request(url,{...options,redirect:'manual',signal:AbortSignal.timeout(30000)});
    if (!statuses.includes(r.status)) throw new Error(`F08 registry HTTP ${r.status}`);
    return r;
  };
  const putManifest=async (entry,raw)=>{
    const r=await send(base+'/manifests/'+entry.digest,{method:'PUT',headers:{'Content-Type':entry.mediaType},body:decode(raw)},[201]);
    if (r.headers.get('docker-content-digest')!==entry.digest) throw new Error('F08 manifest digest header mismatch');
  };
  if (restore) {
    // Attempt both actions even when one fails; restoration is idempotent after
    // a lost mutation response. Never remove image manifests or shared blobs.
    const errors=[];
    try { await send(base+'/manifests/'+plan.entry.digest,{method:'DELETE'},[202,404]); } catch(e) { errors.push(e.message); }
    try {
      for (const [entry,encoded] of [[plan.selected.manifest.config,plan.selected.raw.config],[plan.selected.manifest.layers[0],plan.selected.raw.bundle]]) {
        const r=await send(base+'/blobs/'+entry.digest), bytes=await bytesOf(r,entry.size);
        if (hash(bytes)!==entry.digest || !bytes.equals(decode(encoded))) throw new Error('Original recovery blob changed or unavailable');
      }
      await putManifest(plan.selected.entry,plan.selected.raw.manifest);
    } catch(e) { errors.push(e.message); }
    if (errors.length) throw new Error('F08 recovery errors: '+errors.join('; '));
    return;
  }
  checkAlteration(backup,await downloadBundleInventory({mode:'local',image,request}),image,true,profile);
  const upload=await send(base+'/blobs/uploads/',{method:'POST'},[202]);
  const location=upload.headers.get('location');
  if (!location) throw new Error('Missing F08 upload location');
  const url=new URL(location,base), origin=new URL(base);
  if (url.origin!==origin.origin || !url.pathname.startsWith(origin.pathname+'/blobs/uploads/') || url.username || url.password || url.hash) throw new Error('Upload escaped owned registry');
  const bytes=decode(plan.raw.bundle); url.searchParams.set('digest',hash(bytes));
  const uploaded=await send(url.href,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:bytes},[201]);
  if (uploaded.headers.get('docker-content-digest')!==hash(bytes)) throw new Error('F08 blob digest header mismatch');
  await putManifest(plan.entry,plan.raw.manifest);
  await send(base+'/manifests/'+plan.selected.entry.digest,{method:'DELETE'},[202]);
}

async function main() {
  const [command,stateDir,image,phase,profile='before-results']=process.argv.slice(2);
  if (!['before-results','authorized'].includes(profile) || basename(stateDir)!=='L01-update') throw new Error('F08 requires replacement context');
  const state=json(join(stateDir,'state.json')), parent=json(join(dirname(stateDir),'state.json'));
  const run=basename(dirname(stateDir)); authorizeReplacement(state,parent,run,image);
  const directory=join(stateDir,profile==='before-results'?'F08-CI':'F08-admission');
  const beforePath=join(directory,'before.json');
  const options={directory:stateDir,mode:'local',image,repository:state.sourceRepository,commit:state.sourceCommit};
  const trust=()=>Object.fromEntries(['development-public-key.pem','local-trusted-root.json'].map(f=>[f,hash(readFileSync(join(stateDir,f)))]));
  const assertTrust=()=>{
    if (JSON.stringify(trust())!==JSON.stringify(json(join(directory,'trust.json')))) throw new Error('F08 trust inputs changed');
  };
  if (command==='snapshot') {
    if (!['before','negative','after-denial','restored'].includes(phase)) throw new Error('Invalid F08 phase');
    const snapshot=await downloadBundleInventory({mode:'local',image});
    save(join(directory,phase+'.json'),snapshot);
    // Digest-check the actual image manifest as well as every evidence blob.
    const r=await fetch('http://'+state.imageRepository.split('/')[0]+'/v2/'+state.imageRepository.split('/').slice(1).join('/')+'/manifests/'+state.digest,
      {headers:{Accept:'application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json'},redirect:'manual',signal:AbortSignal.timeout(30000)});
    if (!r.ok) throw new Error('F08 image retrieval failed');
    const imageBytes=await bytesOf(r,4*1024*1024);
    if (hash(imageBytes)!==state.digest) throw new Error('F08 image bytes changed');
    save(join(directory,phase+'-image.json'),{digest:state.digest,bytes:imageBytes.toString('base64')});
    if (phase==='before') {
      const plan=prepareAlteration(snapshot,image,profile);
      save(join(directory,'plan.json'),plan);
      save(join(directory,'trust.json'),trust());
      save(join(directory,'cryptography.json'),compareSignatures(plan.original,plan.variant,readFileSync(join(stateDir,'development-public-key.pem'))));
    } else {
      assertTrust();
      save(join(directory,phase+'-check.json'),phase==='restored'?
        checkAlteration(json(beforePath),snapshot,image,true,profile):checkAlteredInventory(json(beforePath),snapshot,image,profile));
      if (phase==='after-denial') checkInventoryConsistency(json(join(directory,'negative.json')).inventory,snapshot.inventory,image);
    }
  } else if (['alter','restore'].includes(command)) {
    if (command==='alter') assertTrust();
    await mutateAlteredSignature({state,parent,run,image,backup:json(beforePath),profile,restore:command==='restore'});
  } else if (command==='attribute') {
    assertTrust();
    const before=json(beforePath), negative=json(join(directory,'after-denial.json'));
    const plan=prepareAlteration(before,image,profile);
    const isolation=checkAlteredInventory(before,negative,image,profile);
    const gatePrefix=profile==='before-results'?'CI-F08-negative':'CI-F08-admission-negative';
    const gate=json(join(stateDir,gatePrefix+'.result.json'));
    checkAlteredInventory(before,json(join(stateDir,gatePrefix+'.inventory.json')),image,profile);
    if (gate.image!==image || gate.phase!==profile || gate.status!=='INTEGRATION_FAILURE'
        || gate.verificationFailure?.predicate!==IMAGE_SIGNATURE_TYPE || gate.verificationFailure?.exitStatus!==1
        || gate.verificationFailure?.kind!=='VERIFIER_REJECTION') throw new Error('Gate did not establish actual image-signature verifier rejection');
    // Authenticate original again under exactly the same trust, independently
    // of traversal order in the fail-fast production gate.
    const originalFile=join(directory,'original.bundle.json'); save(originalFile,plan.original);
    save(join(directory,'original.statement.json'),authenticateBundle(options,plan.original,IMAGE_SIGNATURE_TYPE,originalFile,join(directory,'original')));
    for (const raw of negative.rawArtifacts) {
      if (raw.manifestDigest===plan.entry.digest) continue;
      const type=negative.inventory.artifacts.find(a=>a.manifestDigest===raw.manifestDigest).predicateType;
      const bundle=JSON.parse(decode(raw.bundle)), prefix=join(directory,raw.manifestDigest.slice(7));
      save(prefix+'.bundle.json',bundle);
      save(prefix+'.statement.json',authenticateBundle(options,bundle,type,prefix+'.bundle.json',prefix));
    }
    const crypto=compareSignatures(plan.original,JSON.parse(decode(validateBackup(negative,image,profile).raw.bundle)),readFileSync(join(stateDir,'development-public-key.pem')));
    save(join(directory,'attribution.json'),{...isolation,...crypto,gate:gatePrefix,nonTargetEvidenceAuthenticated:true,trustUnchanged:true});
  } else throw new Error('Unknown F08 operation');
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try { await main(); } catch(e) { console.error('F08 evidence failed: '+e.message); process.exitCode=1; }
}
