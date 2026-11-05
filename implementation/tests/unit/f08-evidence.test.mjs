// Synthetic OCI fixtures test isolation; real registry acceptance needs a live run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign} from 'node:crypto';
import {fixture} from '../helpers/registry-fixture.mjs';
import {alterBundle, compareSignatures, prepareAlteration, checkAlteredInventory, mutateAlteredSignature} from '../../scripts/f08-signature-evidence.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const pem=publicKey.export({type:'spki',format:'pem'});
function valid() {
  const b=fixture().bundles[0];
  const e=b.dsseEnvelope, payload=Buffer.from(e.payload,'base64');
  const pae=Buffer.concat([Buffer.from(`DSSEv1 ${Buffer.byteLength(e.payloadType)} ${e.payloadType} ${payload.length} `),payload]);
  e.signatures[0].sig=sign('sha256',pae,privateKey).toString('base64');
  return b;
}
test('only signature value changes; readable ECDSA original verifies and variant fails',()=>{
  const b=valid(), altered=alterBundle(b);
  assert.equal(compareSignatures(b,altered,pem).status,'CRYPTOGRAPHIC_ALTERATION');
  const expected=structuredClone(b); expected.dsseEnvelope.signatures[0].sig=altered.dsseEnvelope.signatures[0].sig;
  assert.deepEqual(altered,expected);
  assert.equal(Buffer.from(b.dsseEnvelope.signatures[0].sig,'base64').length,Buffer.from(altered.dsseEnvelope.signatures[0].sig,'base64').length);
});
test('wrong trust, unchanged signature, malformed DER/base64 and payload changes cannot attribute F08',()=>{
  const b=valid(), other=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).publicKey.export({type:'spki',format:'pem'});
  assert.throws(()=>compareSignatures(b,alterBundle(b),other),/Original/);
  assert.throws(()=>compareSignatures(b,b,pem));
  const malformed=structuredClone(b); malformed.dsseEnvelope.signatures[0].sig='AA==';
  assert.throws(()=>alterBundle(malformed),/DER/);
  malformed.dsseEnvelope.signatures[0].sig='not-base64'; assert.throws(()=>alterBundle(malformed));
  const changed=alterBundle(b); changed.dsseEnvelope.payload=Buffer.from('{}').toString('base64');
  assert.throws(()=>compareSignatures(b,changed,pem));
});
test('additional signatures cannot mask the fault',()=>{
  const b=valid(); b.dsseEnvelope.signatures.push({...b.dsseEnvelope.signatures[0]});
  assert.throws(()=>alterBundle(b),/one signature/);
});

const transform=b=>{
  const e=b.dsseEnvelope,payload=Buffer.from(e.payload,'base64');
  e.signatures[0].sig=sign('sha256',Buffer.concat([Buffer.from(`DSSEv1 ${Buffer.byteLength(e.payloadType)} ${e.payloadType} ${payload.length} `),payload]),privateKey).toString('base64');
  return b;
};
async function registry() {
  const f=fixture({transform,imageDigest:'sha256:'+'b'.repeat(64)}),backup=await f.run();
  const state={mode:'local',registry:'tfm-zot-run-fixture',cluster:'owned',sourceRepository:'repo',sourceCommit:'commit',sourceSnapshot:'snapshot',imageRepository:f.image.split('@')[0],digest:f.image.split('@')[1]};
  const parent={...state,digest:'sha256:'+'a'.repeat(64)}, plan=prepareAlteration(backup,f.image);
  const mutations=[];
  const request=async(url,options={})=>{
    const path=new URL(url).pathname;
    if (options.method==='POST') return new Response(null,{status:202,headers:{location:f.path+'/blobs/uploads/test'}});
    if (options.method==='PUT' && path.includes('/blobs/uploads/')) {
      const d=new URL(url).searchParams.get('digest');
      f.contents.set(f.path+'/blobs/'+d,{body:options.body,type:'application/vnd.dev.sigstore.bundle.v0.3+json'});
      return new Response(null,{status:201,headers:{'docker-content-digest':d}});
    }
    if (['DELETE','PUT'].includes(options.method)) {
      mutations.push({path,method:options.method});
      const digest=path.split('/').pop(),index=f.descriptors.findIndex(d=>d.digest===digest);
      if (index!==-1) f.descriptors.splice(index,1);
      if (options.method==='PUT') {
        f.descriptors.push(digest===plan.entry.digest?plan.entry:plan.selected.entry);
        f.contents.set(path,{body:options.body,type:plan.entry.mediaType});
      }
      return new Response(null,{status:options.method==='PUT'?201:index===-1?404:202,headers:{'docker-content-digest':digest}});
    }
    return f.request(url,options);
  };
  return {f,backup,plan,mutations,args:{state,parent,run:'run-fixture',image:f.image,backup,request}};
}
test('real mutation helper publishes new OCI hashes, removes original and exactly restores with no blob deletion',async()=>{
  const {f,backup,plan,args,mutations}=await registry();
  await mutateAlteredSignature(args);
  assert.equal(checkAlteredInventory(backup,await f.run(),f.image).alteredManifest,plan.entry.digest);
  await mutateAlteredSignature({...args,restore:true});
  const {checkAlteration}=await import('../../scripts/f07-signature-evidence.mjs');
  assert.equal(checkAlteration(backup,await f.run(),f.image,true,'before-results').check,'original-evidence-restored');
  await mutateAlteredSignature({...args,restore:true});
  assert.ok(mutations.every(m=>m.path.includes('/manifests/')));
});
test('additional valid signature artifacts and changed non-target artifacts fail isolation',async()=>{
  const {f,backup,args,plan}=await registry();
  await mutateAlteredSignature(args);
  f.descriptors.push(plan.selected.entry);
  const masked=await f.run(); assert.throws(()=>checkAlteredInventory(backup,masked,f.image));
  f.descriptors.pop();
  const changed=await f.run();
  const nonTarget=changed.rawArtifacts.find(raw=>raw.manifestDigest!==plan.entry.digest);
  nonTarget.bundle=Buffer.from('changed non-target bytes').toString('base64');
  assert.throws(()=>checkAlteredInventory(backup,changed,f.image));
  f.descriptors.splice(f.descriptors.findIndex(d=>d.digest===f.manifestPaths[1].split('/').pop()),1);
  const missing=await f.run(); assert.throws(()=>checkAlteredInventory(backup,missing,f.image));
});
for (const fault of ['transport','denied','bad-upload','changed-inventory','restore-delete','restore-put','restore-blob']) {
  test(`actual mutation helper preserves ${fault} as failure`,async()=>{
    const {f,args,plan,mutations}=await registry();
    const restore=fault.startsWith('restore');
    if (restore) await mutateAlteredSignature(args);
    if (fault==='changed-inventory') f.descriptors.pop();
    const request=async(url,options={})=>{
      if (fault==='transport') throw new Error('transport');
      if (fault==='denied' || (fault==='restore-delete' && options.method==='DELETE') || (fault==='restore-put' && options.method==='PUT') || (fault==='restore-blob' && url.includes('/blobs/'))) return new Response(null,{status:503});
      if (fault==='bad-upload' && options.method==='POST') return new Response(null,{status:202,headers:{location:'http://external.invalid/upload'}});
      return args.request(url,options);
    };
    await assert.rejects(mutateAlteredSignature({...args,request,restore}));
    if (fault==='restore-delete') assert.ok(mutations.some(m=>m.method==='PUT' && m.path.endsWith(plan.selected.entry.digest)),'original restoration attempted despite injected deletion error');
  });
}
