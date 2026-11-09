// Real offline Cosign verification of labelled synthetic consumer predicates.
// No image publication, Kubernetes or hosted identity claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {authenticateBundle} from '../../../src/ci-verification-gate.mjs';
import {CHECKS,RESULTS_TYPE} from '../../../src/contracts.mjs';
import {CONSUMER_PROFILE,CONSUMER_PRODUCER,ENGINE_REPOSITORY} from '../../../src/consumer.mjs';
const directory=fs.mkdtempSync(join(tmpdir(),'gp-consumer-crypto-'));
const write=(name,value)=>fs.writeFileSync(join(directory,name),JSON.stringify(value));
const run=(command,args)=>execFileSync(command,args,{encoding:'utf8',env:{...process.env,COSIGN_PASSWORD:''},stdio:['ignore','pipe','pipe']});
let index=0;
try {
 run('cosign',['generate-key-pair','--output-key-prefix',join(directory,'local')]);
 fs.copyFileSync(join(directory,'local.pub'),join(directory,'development-public-key.pem'));
 run('cosign',['signing-config','create','--out',join(directory,'signing.json')]);
 run('cosign',['trusted-root','create','--out',join(directory,'local-trusted-root.json')]);
 fs.writeFileSync(join(directory,'artifact'),'Synthetic consumer cryptography fixture\n');
 const digest='sha256:'+createHash('sha256').update(fs.readFileSync(join(directory,'artifact'))).digest('hex');
 const binding={profile:CONSUMER_PROFILE,producer:CONSUMER_PRODUCER,engineRepository:ENGINE_REPOSITORY,engineCommit:'b'.repeat(40),engineSnapshot:'c'.repeat(64),configurationSha256:'d'.repeat(64),consumerSnapshot:'e'.repeat(64)};
 const repository='https://example.invalid/consumer-crypto-fixture',commit='a'.repeat(40);
 write('state.json',{consumerBinding:binding});write('delivery-config.json',{binding});
 run('node',[resolve(import.meta.dirname,'../../../src/contracts.mjs'),'provenance',repository,commit,binding.consumerSnapshot,'synthetic-offline',join(directory,'provenance.json'),CONSUMER_PRODUCER,'consumer-v1',directory]);
 const provenance=JSON.parse(fs.readFileSync(join(directory,'provenance.json')));
 const results={policyVersion:'golden-path-v1',source:{repository,commit},result:'PASS',checks:Object.fromEntries(CHECKS.map(c=>[c,'PASS'])),goldenPath:binding};
 function sign(predicate,type) {
  const prefix=String(index++);write(prefix+'.predicate.json',predicate);
  const file=join(directory,prefix+'.bundle.json');
  run('cosign',['attest-blob','--yes','--key',join(directory,'local.key'),'--signing-config',join(directory,'signing.json'),'--trusted-root',join(directory,'local-trusted-root.json'),'--type',type,'--predicate',join(directory,prefix+'.predicate.json'),'--bundle',file,join(directory,'artifact')]);
  return file;
 }
 const options={directory,mode:'local',image:'registry.invalid/consumer@'+digest,repository,commit,producer:CONSUMER_PRODUCER,binding};
 function authenticate(file,type,expected=options) {
  return authenticateBundle(expected,JSON.parse(fs.readFileSync(file)),type,file,join(directory,'verification-'+index++));
 }
 for(const [predicate,type] of [[provenance,'https://slsa.dev/provenance/v1'],[results,RESULTS_TYPE]]) {
  const file=sign(predicate,type);authenticate(file,type);
  for(const key of ['engineCommit','engineSnapshot','configurationSha256','consumerSnapshot']) {
   const changed={...binding,[key]:(key==='engineCommit'?'f'.repeat(40):'f'.repeat(64))};
   assert.throws(()=>authenticate(file,type,{...options,binding:changed}),/binding mismatch/);
  }
  for(const expected of [{...options,repository:'https://example.invalid/wrong'},{...options,commit:'f'.repeat(40)}]) assert.throws(()=>authenticate(file,type,expected),/SOURCE|PROVENANCE_/);
  const missing=structuredClone(predicate);
  if(type===RESULTS_TYPE) delete missing.goldenPath; else delete missing.buildDefinition.externalParameters.goldenPath;
  assert.throws(()=>authenticate(sign(missing,type),type),/binding mismatch/);
 }
 for(const check of CHECKS) {
  const missing=structuredClone(results);delete missing.checks[check];
  assert.throws(()=>authenticate(sign(missing,RESULTS_TYPE),RESULTS_TYPE),/RESULTS_CHECKS/);
 }
 console.log('PASS: real offline consumer provenance/results cryptography; wrong source, engine/configuration snapshots, absent binding and each missing required check rejected after authentication. Synthetic fixtures only.');
} finally {fs.rmSync(directory,{recursive:true,force:true});}
