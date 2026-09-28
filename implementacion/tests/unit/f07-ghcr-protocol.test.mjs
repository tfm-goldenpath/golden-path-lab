// Synthetic protocol responses only. No GHCR authorization/admission claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync, readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {workflowContext, assertFixture, assertInvocation, registryClient, runProtocol, imageWitness} from '../helpers/f07-ghcr-protocol.mjs';
import {fixture, response, bytes, digest, MANIFEST} from '../helpers/registry-fixture.mjs';
const env = {GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',RUNNER_ENVIRONMENT:'github-hosted',
  GITHUB_REF:'refs/heads/test/f07-hosted-admission-compatibility',GITHUB_REPOSITORY:'example/lab',
  GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',
  GITHUB_WORKFLOW_REF:'example/lab/.github/workflows/golden-path.yml@refs/heads/test/f07-hosted-admission-compatibility'};
const context = workflowContext(env);
function target() {
  const state = {mode:'github',imageRepository:'ghcr.io/example/lab-quotes-node',digest:'sha256:'+'a'.repeat(64),
    sourceRepository:'https://github.com/example/lab',sourceCommit:context.commit,identity:context.identity};
  const image = state.imageRepository+'@'+state.digest;
  return {context,receipt:{context,started:1000},state,run:'run-fixture',expectedImage:image,stateCreated:2000,now:3000,
    result:{status:'PASS',mode:'github',image,F07:{status:'NOT_EXECUTED'},source:{commit:context.commit,repository:state.sourceRepository}}};
}
test('only the selected hosted manual workflow can arm the probe', () => {
  assert.deepEqual(workflowContext(env),context);
  for (const changes of [{GITHUB_ACTIONS:'false'},{GITHUB_EVENT_NAME:'push'},{RUNNER_ENVIRONMENT:'self-hosted'},
    {GITHUB_REF:'refs/heads/main'},{GITHUB_WORKFLOW_REF:'other/workflow'},{GITHUB_RUN_ID:'0'}])
    assert.throws(() => workflowContext({...env,...changes}));
});
test('fresh receipt and exact original prepared image are mandatory', () => {
  assert.equal(assertFixture(target()),target().expectedImage);
  for (const mutate of [
    f=>{f.state.mode='local';},f=>{f.state.imageRepository='ghcr.io/example/release';},
    f=>{f.expectedImage+='suffix';},f=>{f.state.sourceCommit='b'.repeat(40);},f=>{f.state.identity+='wrong';},
    f=>{f.receipt={context:{...context,attempt:'2'},started:1000};},f=>{f.stateCreated=900;},
    f=>{f.now=10000000;},f=>{f.result.status='FAIL';},f=>{f.result.F07.status='PASS';},f=>{f.run='../run-fixture';},
  ]) { const f=target(); mutate(f); assert.throws(() => assertFixture(f)); }
});
async function protocol(options={}) {
  const f=fixture({mode:'github',types:['https://sigstore.dev/cosign/sign/v1','https://cyclonedx.org/bom',
    'https://slsa.dev/provenance/v1','https://tfm-goldenpath.dev/attestations/verification-results/v1']});
  const selected=f.descriptors[0]; const events=[],saved={}; let interrupted=false,gets=0;
  const request=async (url,opts)=>{
    const method=opts.method;
    if (method==='DELETE' || method==='PUT') {
      events.push(method);
      assert.equal(new URL(url).pathname,f.manifestPaths[0]);
      assert.equal(opts.redirect,'manual');
      if(method==='DELETE') {
        if(options.denied) return response('',MANIFEST,options.denied);
        f.descriptors.splice(0,1);
        if(options.lostResponse) throw Error('network');
        if(options.interrupt) interrupted=true;
        if(options.inventory) f.overrides.set(f.indexPath,()=>response('',MANIFEST,503));
        return response('',MANIFEST,202);
      }
      if(options.restoreFail) return response('',MANIFEST,403);
      assert.deepEqual(opts.body,f.contents.get(f.manifestPaths[0]).body);
      f.overrides.delete(f.indexPath);
      if(!f.descriptors.some(d=>d.digest===selected.digest)) f.descriptors.unshift(selected);
      return response('',MANIFEST,201,{'docker-content-digest':selected.digest});
    }
    if(options.missingBlob && events.includes('DELETE') && new URL(url).pathname===f.configPaths[0]) return response('',MANIFEST,404);
    return f.request(url,opts);
  };
  const client=await registryClient({image:f.image,actor:'actor',token:'test-workflow-token',request});
  const inventory=async ()=>{
    const current=await f.run({request}); gets++;
    if(options.fallback) current.inventory.source='referrers-tag';
    if(options.changing && gets===2) current.inventory.descriptors.pop();
    return current;
  };
  let error;
  try { await runProtocol({image:f.image,inventory,client,save:(name,value)=>{saved[name]=value;},
    verify:async ()=>{events.push('verify'); if(options.trust) throw Error('trust failure');},
    witness:async ()=>{if(options.imageChange && events.includes('DELETE') && !events.includes('PUT')) return {image:'changed'};return {image:f.image};},
    interrupted:()=>interrupted}); } catch(e) {error=e;}
  return {events,saved,error};
}
test('protocol restores exact manifest; completion never claims hosted admission',async()=>{
  const r=await protocol(); assert.ifError(r.error);
  assert.deepEqual(r.events,['verify','DELETE','PUT']);
  assert.equal(r.saved['recovery.json'].status,'PROTOCOL_ONLY_COMPLETE');
  assert.equal(r.saved['recovery.json'].hostedF07,'NOT_EXECUTED');
  for(const name of ['before.json','pre-delete.json','negative.json','restored.json','image-before.json','image-restored.json']) assert.ok(r.saved[name]);
});
for(const [name,options] of Object.entries({unsupported:{denied:405},forbidden:{denied:403},'lost response':{lostResponse:true},
  interruption:{interrupt:true},inventory:{inventory:true},restoration:{restoreFail:true},'both errors':{lostResponse:true,restoreFail:true},
  'missing shared blob':{missingBlob:true},'image changed':{imageChange:true}})) {
  test(`protocol preserves failure and attempts recovery: ${name}`,async()=>{
    const r=await protocol(options);assert.ok(r.error);
    assert.equal(r.saved['recovery.json'].status,'INTEGRATION_FAILURE');
    assert.equal(r.saved['recovery.json'].mutationAttempted,true);
    if(!options.missingBlob) assert.ok(r.events.includes('PUT'));
    if(options.restoreFail) assert.ok(r.saved['recovery.json'].restorationError);
    if(options.lostResponse) assert.ok(r.saved['recovery.json'].primaryError);
  });
}
for(const options of [{trust:true},{fallback:true},{changing:true}]) test(`no mutation on prerequisite failure ${JSON.stringify(options)}`,async()=>{
  const r=await protocol(options);assert.ok(r.error);assert.ok(!r.events.includes('DELETE'));assert.ok(!r.events.includes('PUT'));
});
test('credentials stay within exact GHCR endpoints; mutation redirects fail closed',async()=>{
  const calls=[];
  const client=await registryClient({image:target().expectedImage,actor:'actor',token:'workflow',request:async(url,opts)=>{
    calls.push({url,opts});
    if(new URL(url).pathname==='/token') return response(bytes({token:'scoped-token'}));
    return response('',MANIFEST,307,{location:'https://attacker.invalid/'});
  }});
  await assert.rejects(client.mutate({entry:{digest:'sha256:'+'b'.repeat(64)}},false),/HTTP 307/);
  assert.equal(calls.length,2);
  assert.equal(new URL(calls[0].url).searchParams.get('scope'),'repository:example/lab-quotes-node:pull,push,delete');
  assert.equal(calls[1].opts.headers.Authorization,'Bearer scoped-token');
});
test('image witness checks run label and every layer byte digest',async()=>{
  const config=bytes({config:{Labels:{'tfm.lab.run':'run-fixture'}}}),layer=bytes({synthetic:'image'});
  const manifest=bytes({mediaType:MANIFEST,config:{digest:digest(config)},layers:[{digest:digest(layer),size:layer.length}]});
  const data=new Map([[digest(manifest),manifest],[digest(config),config],[digest(layer),layer]]);
  const client={get:async(_kind,d)=>data.get(d)};
  assert.ok(await imageWitness(client,'ghcr.io/example/image@'+digest(manifest),'run-fixture'));
  await assert.rejects(imageWitness(client,'ghcr.io/example/image@'+digest(manifest),'run-other'),/labelled/);
});
test('existing hosted coordinator remains NOT_EXECUTED and does not load protocol helper',()=>{
  const demo=readFileSync(new URL('../../scripts/demo.sh',import.meta.url),'utf8');
  assert.match(demo,/if \[\[ "\$mode" == local \]\]; then\n  scenario_f07_admission\nelse\n  scenario_f07_pending/);
  assert.doesNotMatch(demo,/ghcr-protocol/);
  const local=readFileSync(new URL('../../scripts/f07-signature-evidence.mjs',import.meta.url),'utf8');
  assert.match(local,/state.mode !== 'local'/);
});

test('authenticated run identity rejects an earlier run or retry even at the same commit',()=>{
  const certificate={runInvocationURI:'https://github.com/example/lab/actions/runs/123/attempts/1'};
  assert.doesNotThrow(()=>assertInvocation(certificate,context));
  for(const change of [{run:'122'},{attempt:'2'},{repository:'other/lab'}])
    assert.throws(()=>assertInvocation(certificate,{...context,...change}));
  assert.throws(()=>assertInvocation({},context));
});

for (const exitStatus of [0,31,43]) test(`protocol wrapper packages exit ${exitStatus} without converting errors to success`,t=>{
  const root=mkdtempSync(join(tmpdir(),'gp-ghcr-wrapper-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for(const path of ['tests/integration','scripts','bin']) mkdirSync(join(root,path),{recursive:true});
  copyFileSync(new URL('../integration/f07-ghcr-protocol.sh',import.meta.url),join(root,'tests/integration/probe.sh'));
  copyFileSync(new URL('../../scripts/package-evidence.py',import.meta.url),join(root,'scripts/package-evidence.py'));
  // Synthetic external Node/Docker stages; the real wrapper and packager decide
  // exit propagation, credential cleanup and archive status.
  writeFileSync(join(root,'bin/docker'),'#!/bin/sh\ncat >/dev/null\n',{mode:0o755});
  writeFileSync(join(root,'bin/node'),`#!/bin/bash
if [[ "$1" == --input-type=module ]]; then exit 0; fi
mkdir "$5"
printf '%s\\n' '{"status":"PROTOCOL_ONLY_COMPLETE","hostedF07":"NOT_EXECUTED"}' > "$5/protocol-result.json"
printf '%s\\n' '{"primaryError":"synthetic","restorationError":"synthetic"}' > "$5/recovery.json"
exit "$GP_TEST_EXIT"
`,{mode:0o755});
  const result=spawnSync('bash',[join(root,'tests/integration/probe.sh'),'receipt'],{encoding:'utf8',
    env:{...process.env,PATH:join(root,'bin')+':'+process.env.PATH,GP_TEST_EXIT:String(exitStatus),
      GP_F07_PROTOCOL:'authorized',GP_STATE_DIR:'fixture',GP_F07_IMAGE:'fixture',GH_TOKEN:'synthetic',
      GITHUB_ACTOR:'test',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1'}});
  assert.ifError(result.error);assert.equal(result.status,exitStatus,result.stderr);
  const output=join(root,'evidence/raw/run-f07ghcr-123-1');
  assert.equal(JSON.parse(readFileSync(join(output,'execution-summary.json'))).status,
    exitStatus===0?'PROTOCOL_ONLY_COMPLETE':'INTEGRATION_FAILURE');
  assert.deepEqual(readdirSync(join(root,'.tmp')),[]);
  const audit=spawnSync('python3',['-c',`
import hashlib,json,sys,tarfile
from pathlib import Path
p=Path(sys.argv[1])
assert hashlib.sha256(p.read_bytes()).hexdigest()==Path(str(p)+'.sha256').read_text().split()[0]
with tarfile.open(p) as t:
    for line in t.extractfile('run-f07ghcr-123-1/SHA256SUMS.txt').read().decode().splitlines():
        digest,name=line.split('  ',1)
        assert hashlib.sha256(t.extractfile('run-f07ghcr-123-1/'+name).read()).hexdigest()==digest
    assert json.load(t.extractfile('run-f07ghcr-123-1/recovery.json'))['restorationError']=='synthetic'
`,join(root,'evidence/packages/run-f07ghcr-123-1.tar.gz')],{encoding:'utf8'});
  assert.ifError(audit.error);assert.equal(audit.status,0,audit.stderr);
});
