// Synthetic Git/evidence fixtures. No Docker, admission or runtime claims.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {initialize,captureConsumer,engineSources,ENGINE_REPOSITORY,validateConfig} from '../../../src/consumer.mjs';
import {JAVA_PROFILE,consumerProfile} from '../../../src/consumer-profiles.mjs';
import {validateConsumerBinding,validateProvenance,validateResults,CHECKS,checkStatements} from '../../../src/contracts.mjs';
const engine=resolve(import.meta.dirname,'../../..');
const run=(c,a,cwd)=>execFileSync(c,a,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function commit(root) {run('git',['add','.'],root);run('git',['-c','user.name=Synthetic','-c','user.email=fixture@example.invalid','commit','-qm','Synthetic fixture'],root);return run('git',['rev-parse','HEAD'],root);}
function fixture(t) {
 const d=fs.mkdtempSync(join(tmpdir(),'java consumer with spaces '));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
 const e=join(d,'engine'),c=join(d,'consumer');fs.mkdirSync(e);
 for(const name of engineSources) {fs.mkdirSync(resolve(e,name,'..'),{recursive:true});fs.cpSync(join(engine,name),join(e,name),{recursive:true,filter:p=>!p.includes('/__pycache__')});}
 run('git',['init','-q'],e);run('git',['remote','add','origin',ENGINE_REPOSITORY],e);const sha=commit(e);
 run('bash',[join(e,'bin/deliver'),'init',c,'--profile',JAVA_PROFILE,'--repository','https://example.invalid/java-trial','--engine-commit',sha],'/tmp');
 run('git',['init','-q'],c);commit(c);return {e,c,sha};
}
test('Java initialization selects only Java and captures main, tests, resources and binary resources',t=>{
 const {e,c,sha}=fixture(t),r=captureConsumer(e,c);
 assert.equal(r.binding.profile,JAVA_PROFILE);assert.equal(r.binding.producer,consumerProfile(JAVA_PROFILE).producer);assert.equal(r.binding.engineCommit,sha);
 assert.equal(fs.existsSync(join(c,'service/package.json')),false);
 const resource=join(c,'service/src/main/resources');fs.mkdirSync(resource);fs.writeFileSync(join(resource,'binary.dat'),Buffer.from([255,0,128]));commit(c);
 fs.mkdirSync(join(c,'service/target'));fs.writeFileSync(join(c,'service/target/host.jar'),'must never be input');
 captureConsumer(e,c);
 const capture=JSON.parse(run('node',[join(e,'src/capture-build-inputs.mjs'),join(c,'service'),'base','a'.repeat(40),'','','consumer-v1',c],'/tmp'));
 assert.ok(capture.files.some(f=>f.path==='src/test/java/trial/ServerTest.java'));
 assert.ok(capture.files.some(f=>f.path==='src/test/resources/greeting.json'));
 assert.ok(!capture.files.some(f=>f.path.startsWith('target/')));
 assert.equal(capture.files.find(f=>f.path.endsWith('binary.dat')).encoding,'base64');
 fs.writeFileSync(join(c,'capture.json'),JSON.stringify(capture));
 run('python3',[join(e,'src/materialize-build-inputs.py'),join(c,'capture.json'),join(c,'build copy')],'/tmp');
 assert.deepEqual(fs.readFileSync(join(c,'build copy/src/main/resources/binary.dat')),Buffer.from([255,0,128]));
 assert.equal(fs.existsSync(join(c,'build copy/target')),false);
});
for(const staged of [true,false]) test(`Java immutable inventory rejects ${staged?'staged':'unstaged'} deletion`,t=>{
 const {e,c}=fixture(t),file='service/src/test/java/trial/ServerTest.java';
 const before=run('git',['rev-parse','HEAD'],c);
 if(staged) run('git',['rm',file],c);else fs.rmSync(join(c,file));
 assert.equal(run('git',['rev-parse','HEAD'],c),before);
 assert.throws(()=>captureConsumer(e,c),/missing/);
});
test('Java fixed configuration rejects mutable POMs, added Maven settings and generated input contamination',t=>{
 const {e,c}=fixture(t),pom=join(c,'service/pom.xml'),bytes=fs.readFileSync(pom,'utf8');
 for(const version of ['1.0-SNAPSHOT','LATEST','[1,2)']) {
  fs.writeFileSync(pom,bytes.replace('<version>1.0.0</version>',`<version>${version}</version>`));commit(c);
  assert.throws(()=>captureConsumer(e,c),/build context/);
  fs.writeFileSync(pom,bytes);commit(c);
 }
 fs.mkdirSync(join(c,'service/.mvn'));fs.writeFileSync(join(c,'service/.mvn/maven.config'),'-DskipTests');commit(c);
 assert.throws(()=>captureConsumer(e,c),/configuration/);
 fs.rmSync(join(c,'service/.mvn'),{recursive:true});commit(c);
 fs.writeFileSync(join(c,'service/src/main/java/trial/generated.class'),'generated');
 assert.throws(()=>captureConsumer(e,c),/committed source/);commit(c);
 assert.throws(()=>captureConsumer(e,c),/Unsupported Java source/);
 const config=JSON.parse(fs.readFileSync(join(c,'golden-path.json')));
 for(const change of [{schema:'other/v1'},{schema:'__proto__'},{extra:'bad'},{engine:{...config.engine,commit:'main'}}]) assert.throws(()=>validateConfig({...config,...change}));
});
test('exact Java profile/producer bindings cannot authorize Node and all source fields remain required',()=>{
 const binding={profile:JAVA_PROFILE,producer:consumerProfile(JAVA_PROFILE).producer,engineRepository:ENGINE_REPOSITORY,engineCommit:'b'.repeat(40),engineSnapshot:'c'.repeat(64),configurationSha256:'d'.repeat(64),consumerSnapshot:'e'.repeat(64)};
 const repository='https://example.invalid/java',commit='a'.repeat(40);
 const predicate={buildDefinition:{buildType:'https://tfm-goldenpath.dev/buildtypes/local/v1',externalParameters:{workflow:{repository,path:binding.producer},goldenPath:binding},resolvedDependencies:[{digest:{gitCommit:commit}}]},runDetails:{builder:{id:'https://tfm-goldenpath.dev/builders/local-development'}}};
 const options={repository,commit,mode:'local',producer:binding.producer,binding};
 const results={policyVersion:'golden-path-v1',source:{repository,commit},result:'PASS',checks:Object.fromEntries(CHECKS.map(k=>[k,'PASS'])),goldenPath:binding};
 validateProvenance(predicate,options);validateResults(results,repository,commit,binding);
 for(const key of Object.keys(binding)) assert.throws(()=>validateConsumerBinding({...binding,[key]:'wrong'},binding));
 const node={...binding,profile:'node-http-consumer/v1',producer:'bin/deliver:node-http-consumer/v1'};
 assert.throws(()=>validateResults(results,repository,commit,node),/binding/);
 assert.throws(()=>validateProvenance(predicate,{...options,producer:node.producer,binding:node}),/binding/);
 assert.throws(()=>validateProvenance(predicate,{...options,binding:undefined}),/explicit/);
 assert.throws(()=>validateConsumerBinding(binding,{...binding,producer:node.producer}));
 for(const type of ['https://cyclonedx.org/bom','https://tfm-goldenpath.dev/attestations/verification-results/v1']) assert.throws(()=>checkStatements(JSON.stringify({predicateType:type,subject:[{digest:{sha256:'a'.repeat(64)}}],predicate:results}),'a'.repeat(64),'https://sigstore.dev/cosign/sign/v1',()=>{}));
});
test('Python report, database and lifecycle regressions',()=>{
 const result=spawnSync('python3',['-I','-S',join(import.meta.dirname,'test_java_consumer.py')],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
});
