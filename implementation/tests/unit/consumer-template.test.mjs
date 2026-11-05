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
 const workflow=join(c,'.github/workflows/ci.yml');writeFileSync(workflow,readFileSync(workflow,'utf8').replace(/actions\/checkout@[a-f0-9]{40}/,'actions/checkout@main'));
 const policy=spawnSync('conftest',['test','--policy',join(e,'implementation/policies/conftest'),'--namespace','workflow',workflow],{encoding:'utf8'});
 assert.equal(policy.status,1);assert.match(policy.stdout,/ACTION_SHA/);
});
test('configuration rejects unknown keys, mutable pins and arbitrary roots',()=>{
 const config={schema:CONSUMER_PROFILE,repository:'https://example.invalid/consumer',service:'service',engine:{repository:ENGINE_REPOSITORY,commit:'a'.repeat(40)}};
 for(const changed of [{...config,hooks:{}},{...config,service:'../outside'},{...config,engine:{...config.engine,commit:'main'}},{...config,engine:{...config.engine,repository:'https://example.invalid/engine'}}]) assert.throws(()=>validateConfig(changed));
});
test('selected consumer/engine changes, deletion, modes, symlink escape and origin mismatch fail',t=>{
 const {e,c}=fixture(t);
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
