// Synthetic OCI structure tests. Exact bytes do not prove signatures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../helpers/registry-fixture.mjs';
import {planFault,isolated,fixturePredicate,PROVENANCE} from '../../scripts/provenance-scenario-evidence.mjs';
function registry() {return fixture({transform:b=>{
  const s=JSON.parse(Buffer.from(b.dsseEnvelope.payload,'base64'));
  if(s.predicateType===PROVENANCE) s.predicate={buildDefinition:{externalParameters:{workflow:{repository:'https://example.invalid/authorized'}},buildType:'local',resolvedDependencies:[{digest:{gitCommit:'b'.repeat(40)}}]},runDetails:{builder:{id:'local'}}};
  b.dsseEnvelope.payload=Buffer.from(JSON.stringify(s)).toString('base64');return b;
}});}
test('F09 removes only provenance; exact recovery and non-target isolation required',async()=>{
  const f=registry(),before=await f.run(),plan=planFault(before,f.image,'before-results');
  f.descriptors.splice(f.descriptors.findIndex(d=>d.digest===plan.selected.entry.digest),1);
  const current=await f.run();const report=isolated(before,current,f.image,'before-results',plan);
  assert.equal(report.nonTargetBytesUnchanged,true);assert.equal('bundleBytesUnchanged' in report,false);
  assert.throws(()=>isolated(before,current,f.image,'before-results',plan,true));
  current.rawArtifacts[0].bundle+='A';assert.throws(()=>isolated(before,current,f.image,'before-results',plan));
  isolated(before,before,f.image,'before-results',plan,true);
});
for(const change of ['repository','digest','builder','revision','buildType']) test(`F10 fixture plan admits only selected repository alteration: ${change}`,async()=>{
  const f=registry(),before=await f.run(),original=planFault(before,f.image,'before-results');
  const b=JSON.parse(Buffer.from(original.selected.raw.bundle,'base64')),s=JSON.parse(Buffer.from(b.dsseEnvelope.payload,'base64'));
  s.predicate=fixturePredicate(s.predicate);
  if(change==='digest') s.subject[0].digest.sha256='c'.repeat(64);
  if(change==='builder') s.predicate.runDetails.builder.id='other';
  if(change==='revision') s.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit='c'.repeat(40);
  if(change==='buildType') s.predicate.buildDefinition.buildType='other';
  b.dsseEnvelope.payload=Buffer.from(JSON.stringify(s)).toString('base64');
  const invoke=()=>planFault(before,f.image,'before-results',Buffer.from(JSON.stringify(b)));
  if(change==='repository') assert.ok(invoke().entry);else assert.throws(invoke,/only the selected/);
});

import {mutate} from '../../scripts/provenance-scenario-evidence.mjs';
function owned(image) {
  const imageRepository=image.split('@')[0];
  const parent={mode:'local',registry:'tfm-zot-run-fixture',imageRepository,digest:'sha256:'+'d'.repeat(64),sourceRepository:'https://example.invalid/lab',sourceCommit:'b'.repeat(40),sourceSnapshot:'c'.repeat(64),cluster:'tfm-demo-run-fixture'};
  return {parent,state:{...parent,digest:image.split('@')[1]},run:'run-fixture'};
}
test('provenance mutation rejects unowned state and changed plans before any request',async()=>{
  const f=registry(),before=await f.run(),plan=planFault(before,f.image,'before-results'),ownership=owned(f.image);
  let calls=0;const args={...ownership,before,plan,image:f.image,profile:'before-results',request:()=>{calls++;throw new Error('must not fetch');}};
  await assert.rejects(mutate({...args,state:{...ownership.state,mode:'github'}}),/Unauthorized/);
  await assert.rejects(mutate({...args,plan:{...plan,entry:{digest:'other'}}}),/plan differs/);
  assert.equal(calls,0);
});
test('F09 real mutation helper deletes/restores only retained target manifest',async()=>{
  const f=registry(),before=await f.run(),plan=planFault(before,f.image,'before-results'),calls=[];
  const request=async(url,options={})=>{
    calls.push({url,options});
    if(options.method==='DELETE') return new Response(null,{status:202});
    if(options.method==='PUT') return new Response(null,{status:201,headers:{'docker-content-digest':plan.selected.entry.digest}});
    return f.request(url,options);
  };
  const args={...owned(f.image),before,plan,image:f.image,profile:'before-results',request};
  await mutate(args);await mutate({...args,restore:true});
  const writes=calls.filter(c=>['PUT','DELETE'].includes(c.options.method));
  assert.deepEqual(writes.map(c=>c.options.method),['DELETE','PUT']);
  assert.ok(writes.every(c=>c.url.endsWith('/manifests/'+plan.selected.entry.digest)));
  assert.deepEqual(writes[1].options.body,Buffer.from(plan.selected.raw.manifest,'base64'));
  await assert.rejects(mutate({...args,restore:true,request:async()=>new Response(null,{status:503})}),/Recovery failures/);
});
