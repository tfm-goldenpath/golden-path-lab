// Fixed Java profile adapter. Node evidence v1 remains a separate contract.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {captureConsumer} from './consumer.mjs';
import {safeRead} from './quality-gate.mjs';
import {present} from './quality-contract.mjs';
const json=x=>JSON.stringify(x,null,2)+'\n';
const sha=x=>createHash('sha256').update(x).digest('hex');
function files(root,relative='',state={count:0,bytes:0}) {
 const directory=path.join(root,relative);
 if(fs.realpathSync(directory)!==directory||!fs.lstatSync(directory).isDirectory()) throw new Error('Unsafe Java evidence directory');
 if(relative.split('/').length>40) throw new Error('Java evidence depth limit');
 return fs.readdirSync(directory).sort().flatMap(name=>{
  if(!/^[A-Za-z0-9_.$-]+$/.test(name)||++state.count>20000) throw new Error('Unsafe Java evidence entry/count');
  const file=relative?relative+'/'+name:name, target=path.join(root,file), s=fs.lstatSync(target);
  if(s.isDirectory()) return files(root,file,state);
  const bytes=safeRead(target,64*1024**2);state.bytes+=bytes.length;
  if(state.bytes>128*1024**2) throw new Error('Java evidence byte limit');
  return [{path:file,sha256:sha(bytes)}];
 });
}
export function verifyJavaQuality(root,manifest) {
 if(manifest.schema!=='java-quality-hashes/v1'||!Array.isArray(manifest.artifacts)||fs.existsSync(path.join(root,'finalization-error.json'))) throw new Error('Unsealed Java evidence');
 const actual=files(root).filter(x=>x.path!=='checksums.json');
 if(JSON.stringify(actual)!==JSON.stringify(manifest.artifacts)) throw new Error('Java evidence inventory/checksum mismatch');
 const result=JSON.parse(safeRead(path.join(root,'result.json')));
 if(result.schema!=='java-quality-result/v1'||result.runId!==manifest.runId||!['PASS','FAIL','ERROR','NOT_EXECUTED'].includes(result.status)) throw new Error('Java evidence identity mismatch');
 return {status:'HASHES_VERIFIED',runId:result.runId,result:result.status,files:actual.length};
}
export async function runJavaQuality(engine,consumer,output,receipt,result) {
 result.schema='java-quality-result/v1';
 const write=(name,data)=>fs.writeFileSync(path.join(output,name),data,{flag:'wx',mode:0o600});
 try {
  const configFile=path.join(consumer,'service/quality-gate.json');
  if(!fs.existsSync(configFile)) {
   result.status='NOT_EXECUTED';result.exitCode=0;result.diagnostics.push('service/quality-gate.json is not configured; Java coverage was not evaluated');
  } else {
   const original=safeRead(configFile,16384),config=JSON.parse(original);
   write('quality-gate.json',original);write('effective-config.json',json(config));
   result.binding.qualityConfigurationSha256=sha(original);result.binding.effectiveConfigurationSha256=sha(json(config));
   const request={engine,consumer,output,receipt,config,runId:result.runId,node:process.execPath};
   const execution=await new Promise((resolve,reject)=>{
    const child=spawn('python3',['-I',path.join(engine,'src/java-quality-runner.py')],{stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='';
    const term=()=>child.kill('SIGTERM'),interrupt=()=>child.kill('SIGINT');
    process.on('SIGTERM',term);process.on('SIGINT',interrupt);
    child.stdout.on('data',b=>{stdout+=b;if(stdout.length>2097152) term();});
    child.stderr.on('data',b=>{stderr+=b;if(stderr.length>65536) term();});
    child.on('error',reject);
    child.on('close',(code,signal)=>{
     process.off('SIGTERM',term);process.off('SIGINT',interrupt);
     if(code!==0||signal) reject(new Error('Java supervisor failed: '+(stderr||signal||code)));
     else {try {resolve(JSON.parse(stdout));}catch {reject(new Error('Invalid Java supervisor receipt: '+stderr));}}
    });
    child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(request));
   });
   write('execution-result.json',json(execution));Object.assign(result,execution);
   if(JSON.stringify(captureConsumer(engine,consumer))!==JSON.stringify(receipt)) throw new Error('Inputs changed during Java quality evaluation');
  }
 } catch(error) {result.status='ERROR';result.exitCode=2;result.diagnostics.push(error.message);}
 result.finishedAt=new Date().toISOString();
 try {
  // Inspect every file before emitting a result. Producers are already retired.
  files(output);
  write('summary.txt',present(result));write('result.json',json(result));
  write('checksums.json',json({schema:'java-quality-hashes/v1',runId:result.runId,artifacts:files(output)}));
 } catch(error) {
  result.status='ERROR';result.exitCode=2;result.diagnostics.push('Evidence sealing: '+error.message);
  try {write('finalization-error.json',json(result));}catch { /* caller stderr remains authoritative */ }
 }
 return result;
}
