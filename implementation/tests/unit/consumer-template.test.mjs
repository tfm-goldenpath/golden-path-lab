// Synthetic isolated Git fixtures; real parsing, Git and Conftest, no delivery claims.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const engine=resolve(import.meta.dirname,'../../..');
test('initializer preserves a nonempty destination',()=>{
 const dest=mkdtempSync(join(tmpdir(),'consumer with spaces '));
 try {
  writeFileSync(join(dest,'keep'),'original');
  const r=spawnSync('bash',[join(engine,'bin/deliver'),'init',dest,'--repository','https://example.invalid/test','--engine-commit',execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()],{encoding:'utf8',cwd:tmpdir()});
  assert.notEqual(r.status,0); assert.match(r.stderr,/nonempty/);
  assert.equal(readFileSync(join(dest,'keep'),'utf8'),'original');
 } finally {rmSync(dest,{recursive:true,force:true});}
});

import {cpSync,mkdirSync,existsSync,symlinkSync,chmodSync} from 'node:fs';
import {captureConsumer,initialize,engineSources,ENGINE_REPOSITORY,CONSUMER_PROFILE,CONSUMER_PRODUCER,validateConfig} from '../../../src/consumer.mjs';
import {validateConsumerBinding,validateProvenance,validateResults,CHECKS} from '../../../src/contracts.mjs';
function command(cmd,args,cwd) {return execFileSync(cmd,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_TEST_CONTEXT:''}}).trim();}
function commit(root) {command('git',['add','.'],root);command('git',['-c','user.name=Synthetic','-c','user.email=test@example.invalid','commit','-qm','Synthetic fixture'],root);return command('git',['rev-parse','HEAD'],root);}
function fixture(t) {
 const parent=mkdtempSync(join(tmpdir(),'independent consumer '));t.after(()=>rmSync(parent,{recursive:true,force:true}));
 const e=join(parent,'engine'),c=join(parent,'service owner');mkdirSync(e);
 for(const name of engineSources) {mkdirSync(resolve(e,name,'..'),{recursive:true});cpSync(join(engine,name),join(e,name),{recursive:true,filter:p=>!p.includes('/__pycache__')&&!p.includes('/node_modules')});}
 command('git',['init','-q'],e);command('git',['remote','add','origin',ENGINE_REPOSITORY],e);const sha=commit(e);
 initialize(e,c,'https://example.invalid/independent-consumer',sha);command('git',['init','-q'],c);const consumerCommit=commit(c);
 return {e,c,sha,consumerCommit};
}
test('separate repository, exact pin, unrelated CWD, no laboratory dependencies and real service/workflow checks',t=>{
 const {e,c,sha,consumerCommit}=fixture(t), receipt=captureConsumer(e,c);
 assert.throws(()=>initialize(e,join(c,'../wrong pin'),'https://example.invalid/consumer','0'.repeat(40)),/checkout/);
 assert.notEqual(sha,consumerCommit);assert.equal(receipt.commit,consumerCommit);assert.equal(receipt.binding.engineCommit,sha);assert.equal(receipt.remoteOriginVerified,false);
 for(const n of ['implementation/tests','implementation/scripts/lib','implementation/scripts/demo.sh']) assert.equal(existsSync(join(e,n)),false);
 assert.equal(existsSync(join(c,'src/lib')),false);
 const cli=command('node',[join(e,'src/consumer.mjs'),'capture',e,c],'/tmp'); assert.equal(JSON.parse(cli).commit,consumerCommit);
 command('node',['--test',join(c,'service/test/server.test.js')],c);
 command('conftest',['test','--policy',join(e,'implementation/policies/conftest'),'--namespace','workflow',join(c,'.github/workflows/ci.yml')],'/tmp');
 const state=join(c,'observations');mkdirSync(state);
 const workflowStage=()=>spawnSync('bash',['-c','set -Eeuo pipefail; source "$1/src/lib/context.sh"; source "$1/src/lib/delivery.sh"; root="$1/implementation"; consumer_root="$2"; state_dir="$3"; delivery_workflow_policy','test',e,c,state],{cwd:'/tmp',encoding:'utf8'});
 assert.equal(workflowStage().status,0);
 const build=JSON.parse(command('node',[join(e,'src/capture-build-inputs.mjs'),join(c,'service'),'base',consumerCommit,'','','consumer-v1',c],'/tmp'));
 assert.ok(build.files.some(f=>f.path==='src/server.js' && f.content.includes('independent-node')));
 const workflow=join(c,'.github/workflows/ci.yml');writeFileSync(workflow,readFileSync(workflow,'utf8').replace(/actions\/checkout@[a-f0-9]{40}/,'actions/checkout@main'));
 assert.equal(workflowStage().status,1);
 assert.match(readFileSync(join(state,'workflow-policy.json'),'utf8'),/ACTION_SHA/);
 const policy=spawnSync('conftest',['test','--policy',join(e,'implementation/policies/conftest'),'--namespace','workflow',workflow],{encoding:'utf8'});
 assert.equal(policy.status,1);assert.match(policy.stdout,/ACTION_SHA/);
 rmSync(workflow);const missing=workflowStage();assert.notEqual(missing.status,0);assert.match(missing.stderr,/No workflows/);
});
test('configuration rejects unknown keys, mutable pins and arbitrary roots',()=>{
 const config={schema:CONSUMER_PROFILE,repository:'https://example.invalid/consumer',service:'service',engine:{repository:ENGINE_REPOSITORY,commit:'a'.repeat(40)}};
 for(const changed of [{...config,hooks:{}},{...config,service:'../outside'},{...config,engine:{...config.engine,commit:'main'}},{...config,engine:{...config.engine,repository:'https://example.invalid/engine'}}]) assert.throws(()=>validateConfig(changed));
});
test('selected consumer/engine changes, deletion, modes, symlink escape and origin mismatch fail',t=>{
 const {e,c}=fixture(t);
 mkdirSync(join(e,'src/__pycache__'));writeFileSync(join(e,'src/__pycache__/generated.pyc'),'generated bytecode');
 captureConsumer(e,c);
 mkdirSync(join(c,'service/src/__pycache__'));writeFileSync(join(c,'service/src/__pycache__/untracked.pyc'),'must be captured because Docker copies src');
 assert.throws(()=>captureConsumer(e,c),/committed source/);rmSync(join(c,'service/src/__pycache__'),{recursive:true});
 for(const [root,name] of [[c,'service/src/server.js'],[c,'service/test/server.test.js'],[c,'.github/workflows/ci.yml'],[c,'golden-path.json'],[e,'src/contracts.mjs'],[e,'implementation/policies/kyverno/render.py']]) {
  const file=join(root,name),bytes=readFileSync(file),mode=statSync(file).mode & 0o777;writeFileSync(file,Buffer.concat([bytes,Buffer.from('\nchanged')]));assert.throws(()=>captureConsumer(e,c));writeFileSync(file,bytes);
  chmodSync(file,mode&0o111?0o644:0o755);assert.throws(()=>captureConsumer(e,c));chmodSync(file,mode);
 }
 const file=join(c,'service/src/server.js'),bytes=readFileSync(file);rmSync(file);assert.throws(()=>captureConsumer(e,c),/missing/);symlinkSync('/etc/passwd',file);assert.throws(()=>captureConsumer(e,c),/Symlink/);rmSync(file);writeFileSync(file,bytes);
 command('git',['remote','add','origin','https://example.invalid/wrong'],c);assert.throws(()=>captureConsumer(e,c),/origin/);
 command('git',['remote','set-url','origin','https://example.invalid/independent-consumer'],c);assert.equal(captureConsumer(e,c).remoteOriginVerified,true);
 command('git',['remote','set-url','origin','https://example.invalid/wrong-engine'],e);assert.throws(()=>captureConsumer(e,c),/checkout/);
});
test('committed Docker context expansion and missing workflow never authorize',t=>{
 const {e,c}=fixture(t);writeFileSync(join(c,'service/Dockerfile'),readFileSync(join(c,'service/Dockerfile'),'utf8')+'\nCOPY ../ /escape\n');commit(c);assert.throws(()=>captureConsumer(e,c),/build context/);
 command('git',['checkout','HEAD~1','--','service/Dockerfile'],c);rmSync(join(c,'.github/workflows/ci.yml'));commit(c);assert.throws(()=>captureConsumer(e,c),/workflow|ENOENT/);
});
const binding={profile:CONSUMER_PROFILE,producer:CONSUMER_PRODUCER,engineRepository:ENGINE_REPOSITORY,engineCommit:'b'.repeat(40),engineSnapshot:'c'.repeat(64),configurationSha256:'d'.repeat(64),consumerSnapshot:'e'.repeat(64)};
test('both signed contracts require every configured binding and consumer source',()=>{
 const repository='https://example.invalid/consumer',commit='a'.repeat(40);
 const provenance={buildDefinition:{buildType:'https://tfm-goldenpath.dev/buildtypes/local/v1',externalParameters:{workflow:{repository,path:CONSUMER_PRODUCER},goldenPath:binding},resolvedDependencies:[{digest:{gitCommit:commit}}]},runDetails:{builder:{id:'https://tfm-goldenpath.dev/builders/local-development'}}};
 const result={policyVersion:'golden-path-v1',source:{repository,commit},result:'PASS',checks:Object.fromEntries(CHECKS.map(c=>[c,'PASS'])),goldenPath:binding};
 const options={repository,commit,mode:'local',producer:CONSUMER_PRODUCER,binding};
 validateProvenance(provenance,options);validateResults(result,repository,commit,binding);
 for(const key of Object.keys(binding)) {
  const wrong={...binding,[key]:'wrong'};
  assert.throws(()=>validateProvenance({...provenance,buildDefinition:{...provenance.buildDefinition,externalParameters:{...provenance.buildDefinition.externalParameters,goldenPath:wrong}}},options),/binding/);
  assert.throws(()=>validateResults({...result,goldenPath:wrong},repository,commit,binding),/binding/);
 }
 for(const source of [{repository:'https://example.invalid/wrong',commit},{repository,commit:'f'.repeat(40)}]) {
  assert.throws(()=>validateProvenance(provenance,{...options,...source}));assert.throws(()=>validateResults(result,source.repository,source.commit,binding));
 }
 assert.throws(()=>validateProvenance(provenance,{...options,binding:undefined}));
 for(const check of CHECKS) {const checks={...result.checks};delete checks[check];assert.throws(()=>validateResults({...result,checks},repository,commit,binding),/CHECKS/);}
 assert.throws(()=>validateConsumerBinding(binding,{...binding,extra:true}));
});

for(const staged of [false,true]) for(const target of ['consumer','engine']) test(`immutable inventory rejects ${staged?'staged':'unstaged'} ${target} deletion with unchanged HEAD`,t=>{
 const {e,c}=fixture(t),root=target==='consumer'?c:e;
 const name=target==='consumer'?'service/test/server.test.js':'implementation/policies/conftest/workflow.rego';
 const before=command('git',['rev-parse','HEAD'],root);
 // Both selected directories retain other committed files; no top-level ENOENT shortcut.
 if(target==='consumer') {writeFileSync(join(c,'service/test/remaining.test.js'),"import 'node:test';\n");commit(c);}
 const pinned=command('git',['rev-parse','HEAD'],root);
 assert.ok(existsSync(join(root,target==='consumer'?'service/package.json':'implementation/policies/conftest/manifests.rego')));
 if(staged) command('git',['rm','--',name],root);else rmSync(join(root,name));
 assert.equal(command('git',['rev-parse','HEAD'],root),pinned);
 if(target==='engine') assert.equal(pinned,before);
 assert.throws(()=>captureConsumer(e,c),/missing/);
});

test('shared consumer test stage uses service CWD, preserves caller CWD and propagates a real failure',t=>{
 const {e,c}=fixture(t),service=join(c,'service'),state=join(c,'test observations');mkdirSync(state);
 mkdirSync(join(service,'test/fixtures'));
 writeFileSync(join(service,'test/fixtures/message.txt'),'consumer fixture');
 writeFileSync(join(service,'test/cwd.test.js'),`import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('consumer CWD inputs',()=>{
 assert.equal(JSON.parse(readFileSync('./package.json')).name,'independent-node');
 assert.equal(readFileSync('./test/fixtures/message.txt','utf8'),'consumer fixture');
 assert.notEqual(process.env.NODE_TEST_CONTEXT,'parent-context');
});\n`);
 mkdirSync(join(e,'implementation/test/fixtures'),{recursive:true});
 writeFileSync(join(e,'implementation/package.json'),'{"name":"wrong-engine-package"}');
 writeFileSync(join(e,'implementation/test/fixtures/message.txt'),'engine fixture');
 const script=`set -Eeuo pipefail
source "$1/src/lib/context.sh"
source "$1/src/lib/delivery.sh"
service_root="$2"; state_dir="$3"; execution_profile=consumer-v1; contract="$1/src/contracts.mjs"
printf '{"profile":"consumer-v1"}' > "$state_dir/state.json"
node "$contract" delivery-init "$state_dir"
before=$PWD
delivery_step unitTests delivery_service_tests
[[ "$PWD" == "$before" ]]
printf 'stage-completed in %s\\n' "$PWD"
`;
 const invoke=(cwd,output)=>spawnSync('bash',['-c',script,'test',engine,service,output],{cwd,encoding:'utf8',env:{...process.env,NODE_TEST_CONTEXT:'parent-context'}});
 for(const cwd of [join(e,'implementation'),'/tmp']) {
  const out=join(state,cwd==='/tmp'?'unrelated':'engine');mkdirSync(out);
  const r=invoke(cwd,out);assert.equal(r.status,0,r.stdout+r.stderr+readFileSync(join(out,'unit-tests.log'),'utf8'));
  assert.match(r.stdout,/stage-completed/);assert.equal(JSON.parse(readFileSync(join(out,'delivery-steps.json'))).unitTests.status,'PASS');
 }
 // Matching engine files must not rescue a bad consumer fixture.
 writeFileSync(join(e,'implementation/package.json'),readFileSync(join(service,'package.json')));
 writeFileSync(join(e,'implementation/test/fixtures/message.txt'),'consumer fixture');
 writeFileSync(join(service,'test/fixtures/message.txt'),'intentional consumer failure');
 const out=join(state,'failure');mkdirSync(out);const r=invoke(join(e,'implementation'),out);
 assert.notEqual(r.status,0);assert.doesNotMatch(r.stdout,/stage-completed/);
 assert.match(readFileSync(join(out,'unit-tests.log'),'utf8'),/intentional consumer failure/);
 assert.notEqual(JSON.parse(readFileSync(join(out,'delivery-steps.json'))).unitTests.status,'PASS');
});

test('immutable inventory is independent of index removal and handles literal unusual Git paths',t=>{
 const {e,c}=fixture(t);
 const name='service/test/space [glob]\tline\nfixture.txt';
 writeFileSync(join(c,name),'committed fixture');commit(c);
 const before=captureConsumer(e,c);
 assert.ok(before.source.files.some(f=>f.path===name));
 command('git',['update-index','--force-remove','--',name],c);
 assert.deepEqual(captureConsumer(e,c),before); // Working bytes still match the immutable tree.
 rmSync(join(c,name));
 assert.throws(()=>captureConsumer(e,c),/missing/);
});

test('clean pinned sparse engine succeeds with only selected roots and precise cache exclusions',t=>{
 const {e,c}=fixture(t);
 mkdirSync(join(e,'laboratory-only'));writeFileSync(join(e,'laboratory-only/unselected'),'not a product input');
 const sha=commit(e),config=JSON.parse(readFileSync(join(c,'golden-path.json')));
 config.engine.commit=sha;writeFileSync(join(c,'golden-path.json'),JSON.stringify(config));commit(c);
 command('git',['sparse-checkout','init','--no-cone'],e);
 command('git',['sparse-checkout','set','--no-cone','--',...engineSources.map(n=>'/'+n)],e);
 assert.equal(existsSync(join(e,'laboratory-only')),false);
 mkdirSync(join(e,'src/__pycache__'));writeFileSync(join(e,'src/__pycache__/cache.pyc'),'generated');
 mkdirSync(join(c,'service/node_modules'));writeFileSync(join(c,'service/node_modules/ignored'),'installed');
 assert.equal(captureConsumer(e,c).binding.engineCommit,sha);
 command('git',['update-index','--force-remove','--','implementation/policies/conftest/workflow.rego'],e);
 rmSync(join(e,'implementation/policies/conftest/workflow.rego'));
 assert.throws(()=>captureConsumer(e,c),/missing/);
});

test('selected parent symlinks and committed nonregular inputs are rejected',t=>{
 const {e,c}=fixture(t),outside=join(c,'../workflow copy');
 cpSync(join(c,'.github'),outside,{recursive:true});rmSync(join(c,'.github'),{recursive:true});symlinkSync(outside,join(c,'.github'));
 assert.throws(()=>captureConsumer(e,c),/Symlink/);
 rmSync(join(c,'.github'));cpSync(outside,join(c,'.github'),{recursive:true});
 symlinkSync('server.test.js',join(c,'service/test/link'));commit(c);
 assert.throws(()=>captureConsumer(e,c),/Nonregular committed/);
 rmSync(join(c,'service/test/link'));command('git',['rm','--cached','service/test/link'],c);commit(c);
 command('mkfifo',[join(c,'service/test/pipe')],c);
 assert.throws(()=>captureConsumer(e,c),/Nonregular selected/);
});
