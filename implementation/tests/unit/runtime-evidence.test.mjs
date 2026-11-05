import test from 'node:test';
import assert from 'node:assert/strict';
import { earlyDecision, unchanged, updated, absent, tagReference } from '../scenarios/runtime-evidence.mjs';
const image='registry.example/quotes@sha256:'+'a'.repeat(64);
const before={metadata:{name:'quotes-node',namespace:'tfm-golden',uid:'uid',generation:1},spec:{template:{metadata:{annotations:{}},spec:{containers:[{image}]}}}};
test('runtime structured early attribution requires exact messages and successful policy execution',()=>{
 const messages=['PRIVILEGED: quotes-node must declare privileged=false','ESCALATION: quotes-node must declare allowPrivilegeEscalation=false'];
 const row={filename:'input.json',namespace:'manifests',successes:4,failures:messages.map(msg=>({msg}))};
 assert.equal(earlyDecision(1,[row],'','input.json','F11').status,'PASS');
 for(const data of [[{...row,failures:row.failures.slice(1)}],[{...row,failures:[...row.failures,{msg:'DIGEST: unrelated'}]}],[{...row,errors:['error']}],[]]) assert.throws(()=>earlyDecision(1,data,'','input.json','F11'));
 assert.throws(()=>earlyDecision(2,[row],'','input.json','F11'));
 assert.throws(()=>earlyDecision(1,[row],'error','input.json','F11'));
});
test('absence requires a real named NotFound, not lookup failure or success',()=>{
 assert.equal(absent(1,'Error from server (NotFound): deployments.apps "quotes-node" not found\n','Deployment','quotes-node').status,'PASS');
 for(const [code,text] of [[0,''],[1,'timeout'],[1,'Error from server (NotFound): deployments.apps "other" not found']]) assert.throws(()=>absent(code,text,'Deployment','quotes-node'));
});
test('rejected update ignores status/resourceVersion but preserves desired spec and identity',()=>{
 const after=structuredClone(before); after.status={replicas:2};after.metadata.resourceVersion='2';
 assert.equal(unchanged(before,after).status,'PASS');
 for(const edit of [v=>v.metadata.uid='new',v=>v.metadata.generation++,v=>v.spec.template.spec.containers[0].image='tag']) {const v=structuredClone(after);edit(v);assert.throws(()=>unchanged(before,v));}
});
test('L06 requires a real annotation-only template update and generation change',()=>{
 const after=structuredClone(before);after.metadata.generation++;after.spec.template.metadata.annotations['tfm.goldenpath/l06']='trial';
 assert.equal(updated(before,after,'trial').status,'PASS');
 assert.throws(()=>updated(before,before,'trial'));
 after.spec.template.spec.containers[0].image='changed';assert.throws(()=>updated(before,after,'trial'));
});
test('persisted tag must belong to exact authorized repository and be tag-only',()=>{
 assert.equal(tagReference('registry.example/quotes:run-abc',image),'run-abc');
 for(const tag of [image,'registry.example/other:run-abc','registry.example/quotes:']) assert.throws(()=>tagReference(tag,image));
});

test('read-only tag resolution retains bytes and rejects changed digest/header and lookup failures',async()=>{
 const {resolveTag,sameTag}=await import('../scenarios/runtime-evidence.mjs');
 const {createHash}=await import('node:crypto');
 const bytes=JSON.stringify({schemaVersion:2,synthetic:true});
 const digest='sha256:'+createHash('sha256').update(bytes).digest('hex');
 const image='127.0.0.1:5000/quotes@'+digest,tag='127.0.0.1:5000/quotes:run-test';
 const calls=[];
 const request=async(url,options)=>{calls.push([url,options]);return new Response(bytes,{status:200,headers:{'docker-content-digest':digest}});};
 const value=await resolveTag('local',tag,image,request);
 assert.equal(sameTag(value).status,'PASS');assert.equal(Buffer.from(value.manifestBase64,'base64').toString(),bytes);
 assert.equal(calls.length,1);assert.equal(calls[0][1].method,undefined);assert.equal(calls[0][1].redirect,'manual');
 assert.throws(()=>sameTag({...value,resolvedDigest:'sha256:'+'b'.repeat(64)}));
 assert.throws(()=>sameTag({...value,reportedDigest:'sha256:'+'b'.repeat(64)}));
 for(const status of [401,404,500,302]) await assert.rejects(resolveTag('local',tag,image,async()=>new Response('',{status})));
 await assert.rejects(resolveTag('local',tag,image,async()=>{throw Error('lookup failed');}));
});

test('F12 refuses automatic conversion and broadened verification matching scope',async()=>{
 const {profile}=await import('../scenarios/runtime-evidence.mjs');
 const policy={items:['tfm-runtime','tfm-signature','tfm-sbom','tfm-provenance','tfm-results'].map(name=>({metadata:{name},spec:{rules:name==='tfm-runtime'?[]:[{verifyImages:[{mutateDigest:false,verifyDigest:true,required:true,imageReferences:[image.split('@')[0]+'@sha256:*']}]}]}}))};
 assert.equal(profile(policy,image).status,'PASS');
 for(const mutate of [v=>v.mutateDigest=true,v=>v.imageReferences=['*'],v=>v.required=false,v=>v.verifyDigest=false]) {
  const v=structuredClone(policy);mutate(v.items[1].spec.rules[0].verifyImages[0]);assert.throws(()=>profile(v,image));
 }
});

test('hosted tag lookup uses pull scope and keeps credentials out of retained evidence',async t=>{
 const {resolveTag,sameTag}=await import('../scenarios/runtime-evidence.mjs');
 const {createHash}=await import('node:crypto');
 const saved={actor:process.env.GITHUB_ACTOR,token:process.env.GH_TOKEN};
 t.after(()=>{for(const [key,value] of [['GITHUB_ACTOR',saved.actor],['GH_TOKEN',saved.token]]) {if(value===undefined) delete process.env[key];else process.env[key]=value;}});
 process.env.GITHUB_ACTOR='synthetic-actor';process.env.GH_TOKEN='synthetic-secret';
 const bytes='{"schemaVersion":2}',digest='sha256:'+createHash('sha256').update(bytes).digest('hex');
 const calls=[];
 const evidence=await resolveTag('github','ghcr.io/example/quotes:run-test','ghcr.io/example/quotes@'+digest,async(url,options)=>{
  calls.push([url,options]);
  return url.includes('/token?')?new Response('{"token":"synthetic-bearer"}',{status:200}):new Response(bytes,{status:200});
 });
 assert.equal(sameTag(evidence).status,'PASS');
 assert.equal(new URL(calls[0][0]).searchParams.get('scope'),'repository:example/quotes:pull');
 assert.equal(calls[1][0],'https://ghcr.io/v2/example/quotes/manifests/run-test');
 assert.equal(calls[1][1].headers.Authorization,'Bearer synthetic-bearer');
 assert.doesNotMatch(JSON.stringify(evidence),/synthetic-(secret|bearer)/);
});
