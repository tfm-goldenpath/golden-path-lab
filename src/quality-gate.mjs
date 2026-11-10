// Public opt-in gate: committed capture -> bounded runner -> deterministic decision.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {captureConsumer,CONSUMER_PROFILE,engineSources} from './consumer.mjs';
import {validateQualityConfig,expectedFiles,parseReport,evaluateCoverage,present} from './quality-contract.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const inside=(file,root)=>file===root||file.startsWith(root+path.sep);
export function safeRead(file,maximum=33554432) {
 const parent=path.dirname(file);
 if(fs.realpathSync(parent)!==parent) throw new Error('Symlinked evidence parent');
 const before=fs.lstatSync(file);
 if(!before.isFile()||before.nlink!==1||before.size>maximum) throw new Error('Unsafe or oversized evidence file: '+path.basename(file));
 const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
 try {
  const opened=fs.fstatSync(fd);
  if(opened.dev!==before.dev||opened.ino!==before.ino||opened.mode!==before.mode) throw new Error('Evidence changed during open');
  const bytes=Buffer.alloc(opened.size+1), count=fs.readSync(fd,bytes,0,bytes.length,0), after=fs.fstatSync(fd);
  if(count!==opened.size||after.size!==opened.size||after.mtimeMs!==opened.mtimeMs||after.ctimeMs!==opened.ctimeMs) throw new Error('Evidence changed during read');
  return bytes.subarray(0,count);
 } finally {fs.closeSync(fd);}
}
function capacity(place,growth) {
 const s=fs.statfsSync(place);
 if(s.bavail*s.bsize<3*1024**3+growth) throw new Error('Capacity requires 3 GiB reserve plus bounded growth: '+place);
}
function freshOutput(engine,consumer,requested) {
 const parent=requested?path.dirname(path.resolve(requested)):path.join(engine,'implementation/evidence/raw');
 if(!fs.existsSync(parent)&&!requested) fs.mkdirSync(parent,{recursive:true});
 if(fs.realpathSync(parent)!==parent) throw new Error('Symlinked output parent');
 const output=requested?path.resolve(requested):path.join(parent,'quality-'+randomUUID());
 if(inside(output,consumer)||engineSources.some(n=>inside(output,path.join(engine,n)))) throw new Error('Evidence must be outside selected inputs and consumer repository');
 capacity(parent,64*1024**2);
 fs.mkdirSync(output,{mode:0o700}); // Fresh and exclusive: even an empty old directory is rejected.
 return output;
}
function supervise(request,runner) {
 return new Promise((resolve,reject)=>{
  const child=spawn('python3',['-I',runner],{stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='';
  const forward=signal=>child.kill(signal);
  const term=()=>forward('SIGTERM'), interrupt=()=>forward('SIGINT');
  process.on('SIGTERM',term);process.on('SIGINT',interrupt);
  child.stdout.on('data',b=>{stdout+=b;if(stdout.length>2097152) child.kill('SIGTERM');});
  child.stderr.on('data',b=>{stderr+=b;if(stderr.length>65536) child.kill('SIGTERM');});
  child.on('error',reject);
  child.on('close',(code,signal)=>{
   process.off('SIGTERM',term);process.off('SIGINT',interrupt);
   if(code!==0||signal) reject(new Error('Supervisor failed: '+(stderr||signal||code)));
   else {try {resolve(JSON.parse(stdout));} catch {reject(new Error('Invalid supervisor receipt: '+stderr));}}
  });
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(request));
 });
}
export async function runQuality(engine,consumer,requested) {
 engine=fs.realpathSync(engine);consumer=path.resolve(consumer);
 const output=freshOutput(engine,consumer,requested), identity=fs.lstatSync(output), runId=randomUUID();
 const result={schema:'node-quality-result/v1',runId,status:'ERROR',exitCode:2,output,diagnostics:[],metrics:null,startedAt:new Date().toISOString()};
 const ensureOutput=()=>{
  const now=fs.lstatSync(output);
  if(!now.isDirectory()||now.dev!==identity.dev||now.ino!==identity.ino||fs.realpathSync(output)!==output) throw new Error('Evidence directory identity changed');
 };
 const write=(name,bytes)=>{ensureOutput();fs.writeFileSync(path.join(output,name),bytes,{flag:'wx',mode:0o600});};
 const watchers=[];let changed=false,work,workIdentity,producerStarted=false,receipt,config;
 try {
  receipt=captureConsumer(engine,consumer);
  write('inputs.json',json(receipt));
  result.binding={runId,consumerCommit:receipt.commit,...receipt.binding};
  const configFile=path.join(consumer,'service/quality-gate.json');
  if(receipt.schema!==CONSUMER_PROFILE) {
   result.status='NOT_APPLICABLE';result.exitCode=0;result.diagnostics.push('Quality coverage is supported only for the Node profile');
  } else if(!fs.existsSync(configFile)) {
   result.status='NOT_EXECUTED';result.exitCode=0;result.diagnostics.push('service/quality-gate.json is not configured; coverage was not evaluated');
  } else {
   const original=safeRead(configFile,16384);write('quality-gate.json',original);
   config=validateQualityConfig(JSON.parse(original));write('effective-config.json',json(config));
   result.binding.qualityConfigurationSha256=sha(original);
   result.binding.effectiveConfigurationSha256=sha(json(config));
   const expected=expectedFiles(config,receipt.source.files);write('scope.json',json(expected));
   const pin=/^NODE_VERSION=(.+)$/m.exec(fs.readFileSync(path.join(engine,'implementation/versions.env'),'utf8'))?.[1];
   if(process.version!=='v'+pin) throw new Error('Expected pinned Node '+pin+'; observed '+process.version);
   write('versions.json',json({node:process.version,v8:process.versions.v8,git:execFileSync('git',['--version'],{encoding:'utf8'}).trim(),platform:process.platform,architecture:process.arch}));
   if(process.platform!=='linux') throw new Error('Quality runner requires Linux');
   const inputs=receipt.source.files.filter(f=>f.path.startsWith('service/')).map(f=>({...f,path:f.path.slice(8)}));
   const tests=inputs.filter(f=>/^test\/[^/]+\.test\.js$/.test(f.path)).map(f=>f.path).sort();
   if(!tests.length) throw new Error('Zero test files selected by the fixed test/*.test.js runner');
   for(const root of [path.join(consumer,'service'),path.join(consumer,'.github'),path.join(consumer,'golden-path.json'),...engineSources.map(n=>path.join(engine,n))]) {
    watchers.push(fs.watch(root,{recursive:fs.statSync(root).isDirectory()},(_event,name)=>{
     if(name?.split(path.sep).some(n=>n==='__pycache__'||n==='node_modules')) return;
     changed=true;
    }));
   }
   capacity(os.tmpdir(),64*1024**2);
   work=fs.mkdtempSync(path.join(os.tmpdir(),'quality-work-'));workIdentity=fs.lstatSync(work);
   write('execution.json',json({runId,workingDirectory:work,tests,expected}));
   let inputBytes=0;
   for(const file of inputs) {
    const bytes=safeRead(path.join(consumer,'service',file.path),16777216);
    inputBytes+=bytes.length;if(inputBytes>16777216||inputs.length>1000) throw new Error('Committed input size/count limit exceeded');
    if(sha(bytes)!==file.sha256) throw new Error('Input changed during materialization');
    const target=path.join(work,file.path);fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,bytes,{flag:'wx',mode:parseInt(file.mode,8)});
    fs.chmodSync(target,parseInt(file.mode,8));
    if(expected.includes(file.path)&&/node:coverage\s+(?:disable|ignore)/.test(bytes.toString())) throw new Error('Inline coverage suppression is unsupported; use reviewed explicit scope');
   }
   const argv=[process.execPath,'--max-old-space-size=256','--test',`--test-concurrency=${config.limits.workers}`,'--experimental-test-coverage',
    '--test-reporter='+path.join(engine,'src/quality-reporter.mjs'),'--test-reporter-destination=stdout','--test-reporter=tap','--test-reporter-destination=stderr',
    ...expected.map(n=>'--test-coverage-include='+n),...tests];
   const env={PATH:path.dirname(process.execPath)+':/usr/bin:/bin',HOME:work,TMPDIR:work,LANG:'C.UTF-8',GP_QUALITY_BINDING:JSON.stringify(result.binding)};
   write('command.json',json({argv,cwd:work,limits:config.limits}));
   producerStarted=true;
   const runner=await supervise({argv,env,work,output,inputs,limits:config.limits},path.join(engine,'src/quality-runner.py'));
   write('execution-result.json',json(runner));result.runnerExitCode=runner.exitCode;
   if(runner.cleaned) work=undefined;
   result.diagnostics.push(...runner.errors);
   if(!runner.retired||!runner.collected||!runner.cleaned) result.diagnostics.push('Producer retirement, collection or cleanup incomplete');
   const later=captureConsumer(engine,consumer);
   if(changed||JSON.stringify(later)!==JSON.stringify(receipt)) throw new Error('Inputs changed during quality evaluation');
   const parsed=parseReport(safeRead(path.join(output,'coverage.ndjson'),config.limits.maxOutputBytes).toString(),result.binding,tests.map(n=>path.join(JSON.parse(safeRead(path.join(output,'execution.json'))).workingDirectory,n)));
   result.tests=parsed.summary.counts;
   if(parsed.summary.counts.failed) result.diagnostics.push('Test assertions or test code failed');
   if(![0,1].includes(runner.exitCode)||((runner.exitCode===0)!==parsed.summary.success)) throw new Error('Runner exit does not match test summary');
   const evaluated=evaluateCoverage(parsed.coverage,expected,JSON.parse(safeRead(path.join(output,'execution.json'))).workingDirectory,config.thresholds);
   result.metrics=evaluated.metrics;result.diagnostics.push(...evaluated.failures);
   if(runner.errors.length||!runner.retired||!runner.collected||!runner.cleaned) result.status='ERROR';
   else result.status=parsed.summary.counts.failed||evaluated.failures.length?'FAIL':'PASS';
   result.exitCode={PASS:0,FAIL:1,ERROR:2}[result.status];
  }
 } catch(error) {result.status='ERROR';result.exitCode=2;result.diagnostics.push(error.message);}
 finally {for(const watcher of watchers) watcher.close();}
 // Before spawn, this controller owns the temporary directory and no producer exists.
 if(work&&!producerStarted) {
  try {
   const now=fs.lstatSync(work);
   if(!now.isDirectory()||now.dev!==workIdentity.dev||now.ino!==workIdentity.ino) throw new Error('Work identity changed');
   fs.rmSync(work,{recursive:true});work=undefined;
  } catch(error) {result.diagnostics.push('Preparation cleanup: '+error.message);}
 }
 // After spawn only the supervisor can establish retirement and remove its work.
 if(work) result.recoveryWork=work;
 result.finishedAt=new Date().toISOString();
 try {
  ensureOutput();
  const artifacts=fs.readdirSync(output).sort().map(name=>{
   if(!['inputs.json','quality-gate.json','effective-config.json','scope.json','versions.json','execution.json','command.json','execution-result.json','coverage.ndjson','tests.log'].includes(name)) throw new Error('Unexpected evidence entry: '+name);
   return {path:name,sha256:sha(safeRead(path.join(output,name)))};
  });
  const summary=present(result), bytes=json(result);
  artifacts.push({path:'summary.txt',sha256:sha(summary)},{path:'result.json',sha256:sha(bytes)});
  write('checksums.json',json({schema:'node-quality-hashes/v1',runId,artifacts}));
  write('summary.txt',summary);write('result.json',bytes);
 } catch(error) {
  result.status='ERROR';result.exitCode=2;result.diagnostics.push('Evidence sealing: '+error.message);
  // Never leave an apparent accepted receipt when final collection failed.
  try {write('finalization-error.json',json(result));} catch { /* stderr remains authoritative on IO failure */ }
 }
 return result;
}
export function verifyQuality(directory) {
 const root=path.resolve(directory),manifest=JSON.parse(safeRead(path.join(root,'checksums.json')));
 if(manifest.schema!=='node-quality-hashes/v1'||!Array.isArray(manifest.artifacts)||fs.existsSync(path.join(root,'finalization-error.json'))) throw new Error('Unsealed quality evidence');
 const expected=['checksums.json',...manifest.artifacts.map(a=>a.path)].sort();
 if(new Set(expected).size!==expected.length||expected.join('\0')!==fs.readdirSync(root).sort().join('\0')) throw new Error('Evidence inventory mismatch');
 for(const item of manifest.artifacts) {
  if(!/^[a-z][a-z0-9.-]*$/.test(item.path)||sha(safeRead(path.join(root,item.path)))!==item.sha256) throw new Error('Evidence checksum mismatch: '+item.path);
 }
 const result=JSON.parse(safeRead(path.join(root,'result.json')));
 if(result.runId!==manifest.runId) throw new Error('Evidence run identity mismatch');
 return {status:'HASHES_VERIFIED',runId:result.runId,result:result.status,files:manifest.artifacts.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 try {
  const [engine,...args]=process.argv.slice(2);
  if(args.length===2&&args[0]==='--verify') console.log(json(verifyQuality(args[1])));
  else if((args.length===2||args.length===4)&&args[0]==='--consumer'&&(args.length===2||args[2]==='--output')) {
   const result=await runQuality(engine,args[1],args[3]);console.log(present(result));process.exitCode=result.exitCode;
  } else throw new Error('Usage: quality --consumer PATH [--output FRESH_DIRECTORY] | quality --verify DIRECTORY');
 } catch(error) {console.error('Quality ERROR: '+error.message);process.exitCode=2;}
}
