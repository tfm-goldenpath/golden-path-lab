// Synthetic fixtures for the opt-in gate; no delivery/admission claims.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateQualityConfig, expectedFiles, evaluateCoverage} from '../../../src/quality-contract.mjs';
const config={schema:'node-quality-gate/v1',include:['src/'],exclude:['src/index.js'],thresholds:{lines:80,functions:80,branches:70},limits:{timeoutSeconds:30,maxOutputBytes:1048576,workers:1}};
test('strict opt-in configuration, explicit committed scope and no arbitrary commands',()=>{
 assert.deepEqual(validateQualityConfig(config),config);
 for(const c of [{...config,command:'true'},{...config,schema:'v2'},{...config,thresholds:{...config.thresholds,lines:null}},{...config,include:['../escape']},{...config,limits:{...config.limits,workers:3}}]) assert.throws(()=>validateQualityConfig(c));
 assert.deepEqual(expectedFiles(config,[{path:'service/src/index.js'},{path:'service/src/server.js'}]),['src/server.js']);
 assert.throws(()=>expectedFiles(config,[{path:'service/src/index.js'}]),/empty/);
});

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {initialize,engineSources,ENGINE_REPOSITORY,captureConsumer} from '../../../src/consumer.mjs';
import {runQuality,verifyQuality,safeRead} from '../../../src/quality-gate.mjs';
import {parseReport} from '../../../src/quality-contract.mjs';
const root=path.resolve(import.meta.dirname,'../../..');
function command(cmd,args,cwd) {return execFileSync(cmd,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
function commit(root) {command('git',['add','.'],root);command('git',['-c','user.name=Fixture','-c','user.email=test@example.invalid','commit','-qm','Synthetic fixture'],root);return command('git',['rev-parse','HEAD'],root);}
function fixture(t) {
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'quality-fixture-'));t.after(()=>fs.rmSync(parent,{force:true,recursive:true}));
 const engine=path.join(parent,'engine'),consumer=path.join(parent,'consumer');fs.mkdirSync(engine);
 for(const name of engineSources) {fs.mkdirSync(path.dirname(path.join(engine,name)),{recursive:true});fs.cpSync(path.join(root,name),path.join(engine,name),{recursive:true,filter:p=>!p.includes('/node_modules')&&!p.includes('/__pycache__')});}
 command('git',['init','-q'],engine);command('git',['remote','add','origin',ENGINE_REPOSITORY],engine);
 initialize(engine,consumer,'https://example.invalid/quality-fixture',commit(engine));command('git',['init','-q'],consumer);
 const save=(name,content)=>{fs.writeFileSync(path.join(consumer,'service',name),typeof content==='string'?content:JSON.stringify(content));};
 save('quality-gate.json',config);commit(consumer);
 let count=0;
 return {engine,consumer,parent,save,run:()=>runQuality(engine,consumer,path.join(parent,'run-'+(++count)))};
}
test('real native coverage passes, binds committed config and verifies fresh hashes',async t=>{
 const f=fixture(t),r=await f.run();assert.equal(r.status,'PASS',JSON.stringify(r));
 assert.equal(r.metrics.branches.covered,8);assert.equal(r.metrics.branches.total,9);
 assert.equal(r.metrics.lines.percent,100);assert.equal(verifyQuality(r.output).result,'PASS');
 assert.ok(captureConsumer(f.engine,f.consumer).source.files.some(f=>f.path==='service/quality-gate.json'));
 const build=JSON.parse(command('node',[path.join(f.engine,'src/capture-build-inputs.mjs'),path.join(f.consumer,'service'),'base',command('git',['rev-parse','HEAD'],f.consumer),'','','consumer-v1',f.consumer],'/tmp'));
 assert.ok(build.files.some(f=>f.path==='quality-gate.json'));
 await assert.rejects(()=>runQuality(f.engine,f.consumer,r.output),/EEXIST/);
 fs.appendFileSync(path.join(r.output,'tests.log'),'tampered');assert.throws(()=>verifyQuality(r.output),/checksum/);
});
test('absent control is NOT_EXECUTED, invalid control ERROR and Java remains separate',async t=>{
 const f=fixture(t);fs.unlinkSync(path.join(f.consumer,'service/quality-gate.json'));commit(f.consumer);
 const r=await f.run();assert.equal(r.status,'NOT_EXECUTED');assert.equal(r.metrics,null);assert.equal(fs.existsSync(path.join(r.output,'tests.log')),false);
 f.save('quality-gate.json',{...config,command:'exit 0'});commit(f.consumer);assert.equal((await f.run()).status,'ERROR');
 // The fixed Java contract rejects an added quality config; no Java coverage adapter is installed.
 assert.equal(fs.readFileSync(path.join(f.engine,'templates/java-http/.github/workflows/ci.yml'),'utf8').includes('quality'),false);
});
test('threshold rejection and failing tests retain distinct reasons',async t=>{
 const f=fixture(t);f.save('quality-gate.json',{...config,thresholds:{...config.thresholds,branches:90}});commit(f.consumer);
 let r=await f.run();assert.equal(r.status,'FAIL',JSON.stringify(r));assert.ok(r.diagnostics.includes('branches threshold unmet'));assert.equal(r.exitCode,1);
 f.save('quality-gate.json',config);f.save('test/fail.test.js',"import {test} from 'node:test'; import assert from 'node:assert/strict'; test('real failure',()=>assert.equal(1,2));");commit(f.consumer);
 r=await f.run();assert.equal(r.status,'FAIL',JSON.stringify(r));assert.ok(r.diagnostics.includes('Test assertions or test code failed'));assert.equal(r.metrics.lines.percent,100);
});
test('native omission of a never-imported committed file cannot pass',async t=>{
 const f=fixture(t);f.save('src/unimported.js','export const missed = () => 42;\n');commit(f.consumer);
 let r=await f.run();assert.equal(r.status,'ERROR');assert.match(r.diagnostics.join(),/unimported expected file/);
 f.save('quality-gate.json',{...config,exclude:[...config.exclude,'src/unimported.js']});commit(f.consumer);
 r=await f.run();assert.equal(r.status,'PASS',JSON.stringify(r));
 f.save('quality-gate.json',{...config,exclude:['src/']});commit(f.consumer);assert.match((await f.run()).diagnostics.join(),/empty/);
});
test('zero tests and skipped tests cannot appear as a coverage PASS',async t=>{
 const f=fixture(t);f.save('test/server.test.js',"import '../src/server.js';\n");commit(f.consumer);
 let r=await f.run();assert.equal(r.status,'ERROR',JSON.stringify(r));assert.match(r.diagnostics.join(),/Zero tests/);
 f.save('test/server.test.js',"import '../src/server.js'; import {test} from 'node:test';test.skip('not run',()=>{});\n");commit(f.consumer);
 r=await f.run();assert.equal(r.status,'ERROR');assert.match(r.diagnostics.join(),/Skipped/);
});
test('timeout retains primary cause and retires descendants before sealing',async t=>{
 const f=fixture(t);f.save('quality-gate.json',{...config,limits:{...config.limits,timeoutSeconds:1}});
 f.save('test/hang.test.js',"import {test} from 'node:test';test('hang',async()=>new Promise(()=>{}));setInterval(()=>{},1000);\n");commit(f.consumer);
 const r=await f.run();assert.equal(r.status,'ERROR');assert.match(r.diagnostics[0],/timeout/);
 const execution=JSON.parse(safeRead(path.join(r.output,'execution-result.json')));assert.equal(execution.retired,true);assert.equal(execution.cleaned,true);assert.equal(verifyQuality(r.output).result,'ERROR');
});
for(const kind of ['symlink','fifo','hardlink']) test(`generated ${kind} causes collection ERROR without following it`,async t=>{
 const f=fixture(t),code={symlink:"symlinkSync('/etc/passwd','generated')",fifo:"execFileSync('mkfifo',['generated'])",hardlink:"linkSync('package.json','generated')"}[kind];
 f.save('test/output.test.js',`import {test} from 'node:test';import {symlinkSync,linkSync} from 'node:fs';import {execFileSync} from 'node:child_process';test('unsafe output',()=>{${code};});`);commit(f.consumer);
 const r=await f.run();assert.equal(r.status,'ERROR');assert.match(r.diagnostics.join(),/Unsafe generated entry/);assert.equal(verifyQuality(r.output).result,'ERROR');
});
test('original and execution source mutation both invalidate evaluation',async t=>{
 const f=fixture(t);
 for(const target of [path.join(f.consumer,'service/src/server.js'),'src/server.js']) {
  f.save('test/mutate.test.js',`import {test} from 'node:test';import {appendFileSync} from 'node:fs';test('mutate',()=>appendFileSync(${JSON.stringify(target)},'\\n// changed\\n'));`);commit(f.consumer);
  const r=await f.run();assert.equal(r.status,'ERROR');assert.match(r.diagnostics.join(),/changed|committed source/);
 }
});
test('public command works from consumer and unrelated CWD; output cannot be an input',t=>{
 const f=fixture(t);
 for(const [i,cwd] of [f.consumer,'/tmp'].entries()) {
  const run=spawnSync('bash',[path.join(f.engine,'bin/deliver'),'quality','--consumer',f.consumer,'--output',path.join(f.parent,'cwd-'+i)],{cwd,encoding:'utf8',env:{...process.env,NODE_TEST_CONTEXT:''}});
  assert.equal(run.status,0,run.stdout+run.stderr);assert.match(run.stdout,/gate: PASS/);
 }
 assert.rejects(()=>runQuality(f.engine,f.consumer,path.join(f.consumer,'output')),/outside/);
});
function coverage(covered=4,total=5) {
 const file={path:'/work/src/server.js'};
 for(const [name,title] of [['lines','Line'],['functions','Function'],['branches','Branch']]) {
  Object.assign(file,{['total'+title+'Count']:total,['covered'+title+'Count']:covered,['covered'+title+'Percent']:covered/total*100,[name]:Array.from({length:total},(_,i)=>({line:i+1,count:i<covered?1:0}))});
 }
 return {workingDirectory:'/work',files:[file],totals:{...file}};
}
test('exact threshold uses full precision; invalid/unknown/inconsistent metrics reject',()=>{
 const report=coverage(),thresholds={lines:80,functions:80,branches:80};
 assert.deepEqual(evaluateCoverage(report,['src/server.js'],'/work',thresholds).failures,[]);
 assert.equal(evaluateCoverage(report,['src/server.js'],'/work',{...thresholds,lines:80.00000000000001}).failures[0],'lines threshold unmet');
 for(const mutate of [r=>r.files[0].coveredLineCount=null,r=>r.files[0].totalLineCount=-1,r=>r.files[0].coveredLineCount=6,r=>r.files[0].coveredLinePercent=NaN,r=>r.files[0].coveredLinePercent=undefined,r=>r.files[0].coveredLinePercent=99,r=>r.files[0].lines.pop(),r=>r.totals.coveredLineCount=3,r=>r.files.push(r.files[0]),r=>r.files[0].path='/outside/source.js']) {
  const r=structuredClone(report);mutate(r);assert.throws(()=>evaluateCoverage(r,['src/server.js'],'/work',thresholds));
 }
 const empty=coverage(0,0);for(const entry of [...empty.files,empty.totals]) for(const title of ['Line','Function','Branch']) entry['covered'+title+'Percent']=100;
 assert.throws(()=>evaluateCoverage(empty,['src/server.js'],'/work',thresholds),/NOT_APPLICABLE/);
 const zero=coverage(0,5);assert.equal(evaluateCoverage(zero,['src/server.js'],'/work',thresholds).metrics.lines.percent,0);
});
test('original event report rejects missing/truncated/malformed data and foreign identities',async t=>{
 const f=fixture(t),r=await f.run(),bytes=safeRead(path.join(r.output,'coverage.ndjson')).toString(),exec=JSON.parse(safeRead(path.join(r.output,'execution.json'))),tests=exec.tests.map(n=>path.join(exec.workingDirectory,n));
 parseReport(bytes,r.binding,tests);
 for(const b of ['',bytes.slice(0,-1),'bad\n',bytes.replace('test:coverage','unsupported')]) assert.throws(()=>parseReport(b,r.binding,tests));
 for(const field of ['runId','consumerSnapshot','qualityConfigurationSha256']) assert.throws(()=>parseReport(bytes,{...r.binding,[field]:'foreign'},tests),/binding/);
 assert.throws(()=>parseReport(bytes,r.binding,['/foreign/test.js']),/inventory/);
});
test('evidence readers reject symlinks and FIFOs without hanging',t=>{
 const f=fixture(t);fs.symlinkSync('/etc/passwd',path.join(f.parent,'link'));assert.throws(()=>safeRead(path.join(f.parent,'link')),/Unsafe/);
 command('mkfifo',[path.join(f.parent,'fifo')],f.parent);assert.throws(()=>safeRead(path.join(f.parent,'fifo')),/Unsafe/);
});

test('supervisor preserves primary failures across failed cleanup and retirement',()=>{
 command('python3',['-I',path.join(root,'implementation/tests/unit/test_quality_runner.py')],root);
});
test('input drift reverted to the same Git bytes is still detected during execution',async t=>{
 const f=fixture(t),target=path.join(f.consumer,'service/src/server.js');
 f.save('test/restore.test.js',`import {test} from 'node:test';import {readFileSync,writeFileSync} from 'node:fs';test('restore bytes',async()=>{const p=${JSON.stringify(target)},b=readFileSync(p);writeFileSync(p,'temporary');await new Promise(r=>setTimeout(r,100));writeFileSync(p,b);});`);commit(f.consumer);
 const r=await f.run();assert.equal(r.status,'ERROR');assert.match(r.diagnostics.join(),/Inputs changed/);
 captureConsumer(f.engine,f.consumer); // committed bytes were restored; watch is additional evidence.
});
test('real malformed and absent report collection cannot become omission',async t=>{
 const f=fixture(t);
 for(const [index,operation] of ['malformed','unlinkSync'].entries()) {
  const report=path.join(f.parent,'run-'+(index+1),'coverage.ndjson');
  f.save('test/report.test.js',`import {test} from 'node:test';import fs from 'node:fs';test('report error',()=>{fs.unlinkSync(${JSON.stringify(report)});${operation==='malformed'?`fs.writeFileSync(${JSON.stringify(report)},'malformed\\n');`:''}});`);commit(f.consumer);
  const r=await f.run();assert.equal(r.status,'ERROR');assert.equal(r.exitCode,2);assert.equal(verifyQuality(r.output).result,'ERROR');
 }
});
test('runner output cap retains diagnostics and no inline suppressions are accepted',async t=>{
 const f=fixture(t);f.save('quality-gate.json',{...config,limits:{...config.limits,maxOutputBytes:4096}});
 f.save('test/noisy.test.js',"import {test} from 'node:test';test('noise',()=>console.log('x'.repeat(20000)));\n");commit(f.consumer);
 const r=await f.run();assert.equal(r.status,'ERROR');assert.match(r.diagnostics[0],/output size/);
 f.save('src/server.js',fs.readFileSync(path.join(f.consumer,'service/src/server.js'),'utf8')+'\n/* node:coverage disable */\n');commit(f.consumer);
 const suppressed=await f.run();assert.equal(suppressed.status,'ERROR');assert.match(suppressed.diagnostics.join(),/suppression/);
 if(suppressed.recoveryWork) fs.rmSync(suppressed.recoveryWork,{recursive:true});
});
test('detached descendants are reaped before final collection',async t=>{
 const f=fixture(t),pidFile=path.join(f.parent,'child.pid');
 f.save('test/child.test.js',`import {test} from 'node:test';import {spawn} from 'node:child_process';import {writeFileSync} from 'node:fs';test('detached child',()=>{const p=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:true,stdio:'ignore'});writeFileSync(${JSON.stringify(pidFile)},String(p.pid));p.unref();});`);commit(f.consumer);
 const r=await f.run();assert.equal(r.status,'PASS',JSON.stringify(r));assert.throws(()=>process.kill(Number(fs.readFileSync(pidFile)),0),{code:'ESRCH'});
});
test('consumer workflow uses exact engine, shared command, optional legacy tests and always-retained evidence',()=>{
 const workflow=fs.readFileSync(path.join(root,'templates/node-http/.github/workflows/ci.yml'),'utf8');
 assert.match(workflow,/ref: \$\{\{ steps.quality.outputs.commit \}\}/);
 assert.match(workflow,/\^\[a-f0-9\]\{40\}\$/);
 assert.match(workflow,/quality --consumer/);assert.match(workflow,/quality --verify/);
 assert.match(workflow,/enabled == 'false'[\s\S]*npm test/);
 assert.match(workflow,/always\(\) && steps.quality.outputs.enabled == 'true'/);
 assert.match(workflow,/GITHUB_STEP_SUMMARY/);assert.match(workflow,/retention-days: 14/);
 assert.equal((workflow.match(/npm test/g)||[]).length,1);assert.doesNotMatch(workflow,/pull_request_target|id-token:|packages:|secrets\./);
 for(const action of workflow.matchAll(/uses: (\S+)/g)) assert.match(action[1],/@[a-f0-9]{40}$/);
 command('conftest',['test','--policy',path.join(root,'implementation/policies/conftest'),'--namespace','workflow',path.join(root,'templates/node-http/.github/workflows/ci.yml')],root);
});

test('a killed test process reports the concrete signal, not a coverage threshold',async t=>{
 const f=fixture(t);f.save('test/signal.test.js',"import {test} from 'node:test';test('signal',()=>process.kill(process.pid,'SIGTERM'));\n");commit(f.consumer);
 const r=await f.run();assert.equal(r.status,'ERROR');assert.match(r.diagnostics.join(),/interrupted.*SIGTERM/);
});
test('Java quality is NOT_APPLICABLE and its committed profile is preserved',async t=>{
 const f=fixture(t),consumer=path.join(f.parent,'java');
 initialize(f.engine,consumer,'https://example.invalid/java-quality',command('git',['rev-parse','HEAD'],f.engine),'java-http-consumer/v1');
 command('git',['init','-q'],consumer);commit(consumer);
 const before=captureConsumer(f.engine,consumer),r=await runQuality(f.engine,consumer,path.join(f.parent,'java-result'));
 assert.equal(r.status,'NOT_APPLICABLE');assert.equal(r.exitCode,0);assert.deepEqual(captureConsumer(f.engine,consumer),before);
});
test('failed sealing never yields a PASS receipt or successful integrity check',async t=>{
 const f=fixture(t),target=path.join(f.parent,'run-1/result.json');
 f.save('test/seal.test.js',`import {test} from 'node:test';import {symlinkSync} from 'node:fs';test('unsafe evidence',()=>symlinkSync('/nonexistent-sentinel',${JSON.stringify(target)}));`);commit(f.consumer);
 const r=await f.run();assert.equal(r.status,'ERROR');assert.equal(r.exitCode,2);assert.match(r.diagnostics.join(),/sealing/);assert.throws(()=>verifyQuality(r.output));
});
