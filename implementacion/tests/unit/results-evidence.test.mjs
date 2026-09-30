// Synthetic OCI structure tests. Exact bytes do not prove signatures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../helpers/registry-fixture.mjs';
import {planFault,isolated,fixturePredicate,RESULTS_TYPE} from '../../tests/scenarios/results-evidence.mjs';
function registry() {return fixture({types:['https://sigstore.dev/cosign/sign/v1','https://cyclonedx.org/bom','https://slsa.dev/provenance/v1',RESULTS_TYPE],transform:b=>{
 const s=JSON.parse(Buffer.from(b.dsseEnvelope.payload,'base64'));
 if(s.predicateType===RESULTS_TYPE) s.predicate={policyVersion:'golden-path-v1',source:{repository:'https://example.invalid/lab',commit:'b'.repeat(40)},result:'PASS',checks:{unitTests:'PASS',manifestPolicy:'PASS',workflowPolicy:'PASS',vulnerabilityPolicy:'PASS',signature:'PASS',sbom:'PASS',provenance:'PASS'}};
 b.dsseEnvelope.payload=Buffer.from(JSON.stringify(s)).toString('base64');return b;
}});}
test('F13 removes only results; exact recovery and non-target isolation required',async()=>{
  const f=registry(),before=await f.run(),plan=planFault(before,f.image,'authorized');
  f.descriptors.splice(f.descriptors.findIndex(d=>d.digest===plan.selected.entry.digest),1);
  const current=await f.run();const report=isolated(before,current,f.image,'authorized',plan);
  assert.equal(report.nonTargetBytesUnchanged,true);assert.equal('bundleBytesUnchanged' in report,false);
  assert.throws(()=>isolated(before,current,f.image,'authorized',plan,true));
  current.rawArtifacts[0].bundle+='A';assert.throws(()=>isolated(before,current,f.image,'authorized',plan));
  isolated(before,before,f.image,'authorized',plan,true);
});
for(const change of ['policy','digest','source','result','checks']) test(`F14 fixture plan admits only selected policy alteration: ${change}`,async()=>{
  const f=registry(),before=await f.run(),original=planFault(before,f.image,'authorized');
  const b=JSON.parse(Buffer.from(original.selected.raw.bundle,'base64')),s=JSON.parse(Buffer.from(b.dsseEnvelope.payload,'base64'));
  s.predicate=fixturePredicate(s.predicate);
  if(change==='digest') s.subject[0].digest.sha256='c'.repeat(64);
  if(change==='source') s.predicate.source.repository='https://example.invalid/other';
  if(change==='result') s.predicate.result='FAIL';
  if(change==='checks') delete s.predicate.checks.sbom;
  b.dsseEnvelope.payload=Buffer.from(JSON.stringify(s)).toString('base64');
  const invoke=()=>planFault(before,f.image,'authorized',Buffer.from(JSON.stringify(b)));
  if(change==='policy') assert.ok(invoke().entry);else assert.throws(invoke,/only the selected/);
});

import {mutate} from '../../tests/scenarios/results-evidence.mjs';
function owned(image) {
  const imageRepository=image.split('@')[0];
  const parent={mode:'local',registry:'tfm-zot-run-fixture',imageRepository,digest:'sha256:'+'d'.repeat(64),sourceRepository:'https://example.invalid/lab',sourceCommit:'b'.repeat(40),sourceSnapshot:'c'.repeat(64),cluster:'tfm-demo-run-fixture'};
  return {parent,state:{...parent,digest:image.split('@')[1]},run:'run-fixture'};
}
test('results mutation rejects unowned state and changed plans before any request',async()=>{
  const f=registry(),before=await f.run(),plan=planFault(before,f.image,'authorized'),ownership=owned(f.image);
  let calls=0;const args={...ownership,before,plan,image:f.image,profile:'authorized',request:()=>{calls++;throw new Error('must not fetch');}};
  await assert.rejects(mutate({...args,state:{...ownership.state,mode:'github'}}),/Unauthorized/);
  await assert.rejects(mutate({...args,plan:{...plan,entry:{digest:'other'}}}),/plan differs/);
  assert.equal(calls,0);
});
test('F13 real mutation helper deletes/restores only retained target manifest',async()=>{
  const f=registry(),before=await f.run(),plan=planFault(before,f.image,'authorized'),calls=[];
  const request=async(url,options={})=>{
    calls.push({url,options});
    if(options.method==='DELETE') return new Response(null,{status:202});
    if(options.method==='PUT') return new Response(null,{status:201,headers:{'docker-content-digest':plan.selected.entry.digest}});
    return f.request(url,options);
  };
  const args={...owned(f.image),before,plan,image:f.image,profile:'authorized',request};
  await mutate(args);await mutate({...args,restore:true});
  const writes=calls.filter(c=>['PUT','DELETE'].includes(c.options.method));
  assert.deepEqual(writes.map(c=>c.options.method),['DELETE','PUT']);
  assert.ok(writes.every(c=>c.url.endsWith('/manifests/'+plan.selected.entry.digest)));
  assert.deepEqual(writes[1].options.body,Buffer.from(plan.selected.raw.manifest,'base64'));
  await assert.rejects(mutate({...args,restore:true,request:async()=>new Response(null,{status:503})}),/Recovery failures/);
});

test('P1 alongside P0 invalidates fixture; exact P0-only replay and restoration retain bytes',async()=>{
  const f=registry(),before=await f.run(),selected=planFault(before,f.image,'authorized').selected;
  const bundle=JSON.parse(Buffer.from(selected.raw.bundle,'base64'));
  const statement=JSON.parse(Buffer.from(bundle.dsseEnvelope.payload,'base64'));
  statement.predicate=fixturePredicate(statement.predicate);
  bundle.dsseEnvelope.payload=Buffer.from(JSON.stringify(statement)).toString('base64');
  const bytes=Buffer.from(JSON.stringify(bundle,null,2)+'\n'),plan=planFault(before,f.image,'authorized',bytes);
  const current=structuredClone(before);
  current.inventory.descriptors=current.inventory.descriptors.filter(d=>d.digest!==selected.entry.digest);
  current.inventory.descriptors.push(plan.entry);
  current.rawArtifacts=current.rawArtifacts.filter(r=>r.manifestDigest!==selected.entry.digest);
  current.rawArtifacts.push(plan.raw);
  isolated(before,current,f.image,'authorized',plan);
  current.inventory.descriptors.push(selected.entry);
  current.rawArtifacts.push(selected.raw);
  assert.throws(()=>isolated(before,current,f.image,'authorized',plan),/changed/);
  const calls=[];
  const request=async(url,options={})=>{
    calls.push({url,options});
    if(options.method==='POST') return new Response(null,{status:202,headers:{location:'/v2/quotes-node-run-fixture/blobs/uploads/trial'}});
    if(options.method==='DELETE') return new Response(null,{status:202});
    if(options.method==='PUT') return new Response(null,{status:201,headers:{'docker-content-digest':new URL(url).searchParams.get('digest')||url.split('/').at(-1)}});
    return f.request(url,options);
  };
  const args={...owned(f.image),before,plan,image:f.image,profile:'authorized',request};
  await mutate(args);await mutate({...args,restore:true});
  assert.deepEqual(calls.filter(c=>c.options.method==='DELETE').map(c=>c.url.split('/').at(-1)),[selected.entry.digest,plan.entry.digest]);
  assert.deepEqual(calls.find(c=>c.options.method==='PUT'&&c.url.includes('/blobs/uploads/')).options.body,bytes);
  assert.deepEqual(calls.at(-1).options.body,Buffer.from(selected.raw.manifest,'base64'));
});
