// Real standalone Node starter in an independent, committed local Git repository.
// Four new runs; no remote consumer, Kubernetes or authenticated delivery claims.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {initialize} from '../../../src/consumer.mjs';
import {verifyQuality} from '../../../src/quality-gate.mjs';
const engine=path.resolve(import.meta.dirname,'../../..'),parent=path.resolve(process.argv[2]);
fs.mkdirSync(parent,{mode:0o700});
const consumer=path.join(parent,'consumer');
function git(...args) {return execFileSync('git',['-C',consumer,...args],{encoding:'utf8'}).trim();}
function commit() {git('add','.');git('-c','user.name=Local validation','-c','user.email=local@example.invalid','commit','-qm','Committed quality validation case');return git('rev-parse','HEAD');}
const engineCommit=execFileSync('git',['-C',engine,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
initialize(engine,consumer,'https://example.invalid/local-node-quality-validation',engineCommit);
git('init','-q');
const config={schema:'node-quality-gate/v1',include:['src/'],exclude:['src/index.js'],thresholds:{lines:80,functions:80,branches:70},limits:{timeoutSeconds:30,maxOutputBytes:1048576,workers:2}};
const write=(name,value)=>fs.writeFileSync(path.join(consumer,'service',name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const cases=[];
for(const [name,expected] of [['pass','PASS'],['threshold','FAIL'],['test-failure','FAIL'],['collection-error','ERROR']]) {
 write('quality-gate.json',name==='threshold'?{...config,thresholds:{...config.thresholds,branches:100}}:config);
 for(const file of ['failure.test.js','collection.test.js']) fs.rmSync(path.join(consumer,'service/test',file),{force:true});
 if(name==='test-failure') write('test/failure.test.js',"import {test} from 'node:test';import assert from 'node:assert/strict';test('controlled real failure',()=>assert.equal(1,2));\n");
 if(name==='collection-error') write('test/collection.test.js',"import {test} from 'node:test';import {symlinkSync} from 'node:fs';test('controlled unsafe output',()=>symlinkSync('/nonexistent-quality-sentinel','generated-link'));\n");
 const consumerCommit=commit(),output=path.join(parent,name);
 const run=spawnSync('bash',[path.join(engine,'bin/deliver'),'quality','--consumer',consumer,'--output',output],{cwd:name==='pass'?consumer:'/tmp',env:{...process.env,NODE_TEST_CONTEXT:''},encoding:'utf8',timeout:90000});
 fs.writeFileSync(path.join(parent,name+'.log'),run.stdout+run.stderr,{flag:'wx'});
 const result=JSON.parse(fs.readFileSync(path.join(output,'result.json'))),verification=verifyQuality(output);
 if(result.status!==expected||run.status!=={PASS:0,FAIL:1,ERROR:2}[expected]) throw new Error(name+': '+JSON.stringify(result));
 const manifest=fs.readFileSync(path.join(output,'checksums.json'));
 cases.push({name,expected,observed:result.status,exitCode:run.status,consumerCommit,engineCommit,output,verification,checksumsSha256:createHash('sha256').update(manifest).digest('hex')});
}
git('bundle','create',path.join(parent,'consumer.bundle'),'--all');git('bundle','verify',path.join(parent,'consumer.bundle'));
fs.writeFileSync(path.join(parent,'validation.json'),JSON.stringify({schema:'node-quality-validation/v1',engineCommit,consumerRepository:'https://example.invalid/local-node-quality-validation',remoteConsumer:false,cases},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(cases,null,2));
