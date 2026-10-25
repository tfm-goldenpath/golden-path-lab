import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSbom} from '../../scripts/lab-contracts.mjs';
const valid = () => ({bomFormat:'CycloneDX',specVersion:'1.7',version:1,metadata:{component:{type:'container',name:'fixture'}},components:[{type:'library',name:'example',version:'1.0.0'}]});
test('official schema rejects nested invalid hash even with valid lab fields', () => {
  const b=valid(); b.components[0].hashes=[{alg:'SHA-256',content:'invalid'}];
  assert.throws(()=>validateSbom(b));
});
test('only explicitly supported CycloneDX version is accepted', () => {
  for (const version of ['1.6','1.8','1.99']) assert.throws(()=>validateSbom({...valid(),specVersion:version}));
  assert.equal(validateSbom(valid()),'1.7');
});
import {readFileSync,mkdtempSync,cpSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {validateSchema,compileSchema} from '../../scripts/validate-sbom-schema.mjs';
import {checkEvolution} from '../../scripts/check-sbom-evolution.mjs';
test('unmodified retained Trivy 1.7 output is valid',()=>{
  const b=JSON.parse(readFileSync(new URL('../fixtures/sbom/trivy-1.7.json',import.meta.url)));
  assert.equal(validateSbom(b),'1.7');
});
test('date and internationalized URI/email formats are enforced',()=>{
  for(const mutate of [b=>b.metadata.timestamp='yesterday',b=>b.components[0].supplier={url:['http://bad host']},b=>b.components[0].supplier={contact:[{email:'not-an-email'}]}]) {
    const b=valid(); mutate(b); assert.throws(()=>validateSbom(b));
  }
});
test('internationalized format fields accept valid Unicode content',()=>{
  const b=valid();b.components[0].supplier={url:['https://例え.テスト/'],contact:[{email:'person@éxample.com'}]};
  assert.equal(validateSbom(b),'1.7');
});
test('document schema URLs are never loaded and missing local references fail closed',t=>{
  const b=valid(); b.$schema='https://attacker.invalid/schema.json';
  // Official schema permits the URI as data; it cannot select another schema.
  assert.equal(validateSbom(b),'1.7');
  const d=mkdtempSync(join(tmpdir(),'schema-')); t.after(()=>rmSync(d,{recursive:true,force:true}));
  cpSync(new URL('../../schemas/cyclonedx-1.7/',import.meta.url),d,{recursive:true});
  rmSync(join(d,'spdx.schema.json'));
  assert.throws(()=>compileSchema(d));
  const lock=JSON.parse(readFileSync(join(d,'lock.json'))); delete lock.files['spdx.schema.json'];
  writeFileSync(join(d,'lock.json'),JSON.stringify(lock));
  assert.throws(()=>compileSchema(d),/resolve reference/);
});
test('invalid results retain validator, document hash and outcome',t=>{
  const d=mkdtempSync(join(tmpdir(),'schema-report-'));t.after(()=>rmSync(d,{recursive:true,force:true}));
  const b=valid(); b.components[0].hashes=[{alg:'SHA-256',content:'x'}];
  const file=join(d,'report.json'); assert.throws(()=>validateSchema(b,file));
  const report=JSON.parse(readFileSync(file)); assert.equal(report.status,'INVALID'); assert.equal(report.validator.version,'8.20.0'); assert.equal(report.documentSha256.length,64);
});
test('known component evolution ignores timestamps and requires distinct digests',()=>{
  const a=valid(),b=valid(); const first='sha256:'+'a'.repeat(64),second='sha256:'+'b'.repeat(64);
  assert.throws(()=>checkEvolution(a,b,first,second));
  b.components.push({type:'library',name:'is-number',version:'7.0.0',purl:'pkg:npm/is-number@7.0.0'});
  assert.equal(checkEvolution(a,b,first,second).observation,'absent-before-present-after');
  assert.throws(()=>checkEvolution(b,b,first,second)); assert.throws(()=>checkEvolution(a,b,first,first));
});

import {spawnSync} from 'node:child_process';
test('malformed document CLI retains a failure report',t=>{
  const d=mkdtempSync(join(tmpdir(),'malformed-sbom-'));t.after(()=>rmSync(d,{recursive:true,force:true}));
  const file=join(d,'bad.json'),report=join(d,'report.json');writeFileSync(file,'{"components":');
  const r=spawnSync(process.execPath,[new URL('../../scripts/validate-sbom-schema.mjs',import.meta.url).pathname,file,report],{stdio:'ignore'});
  assert.equal(r.status,1);assert.equal(JSON.parse(readFileSync(report)).status,'MALFORMED');
});

test('validation preserves supplied values and does not insert defaults or coerce input',()=>{
  const b=valid(); delete b.version; // Optional schema default must not be inserted.
  const before=JSON.stringify(b);
  validateSchema(b);
  assert.equal(JSON.stringify(b),before);
  b.version='1';
  const invalidBefore=JSON.stringify(b);
  assert.throws(()=>validateSchema(b));
  assert.equal(JSON.stringify(b),invalidBefore);
});

test('altered local schema bytes fail against the original lock',t=>{
  const d=mkdtempSync(join(tmpdir(),'altered-schema-'));t.after(()=>rmSync(d,{recursive:true,force:true}));
  cpSync(new URL('../../schemas/cyclonedx-1.7/',import.meta.url),d,{recursive:true});
  const file=join(d,'spdx.schema.json');writeFileSync(file,readFileSync(file,'utf8')+'\n');
  assert.throws(()=>compileSchema(d),/Schema integrity mismatch/);
});

test('an incompatible installed validator is rejected with its actual version recorded',t=>{
  // Isolate the installed package tree; never mutate the checkout's dependencies.
  const d=mkdtempSync(join(tmpdir(),'unpinned-validator-'));t.after(()=>rmSync(d,{recursive:true,force:true}));
  cpSync(new URL('../../tooling/',import.meta.url),join(d,'tooling'),{recursive:true});
  // Preserve the module-relative tooling path in this isolated layout.
  cpSync(new URL('../../scripts/validate-sbom-schema.mjs',import.meta.url),join(d,'scripts','validate-sbom-schema.mjs'),{recursive:true});
  const installed=join(d,'tooling/node_modules/ajv/package.json');
  const metadata=JSON.parse(readFileSync(installed));metadata.version='0.0.0-test-mismatch';
  writeFileSync(installed,JSON.stringify(metadata));
  const input=join(d,'sbom.json'),report=join(d,'report.json');writeFileSync(input,JSON.stringify(valid()));
  const result=spawnSync(process.execPath,[join(d,'scripts','validate-sbom-schema.mjs'),input,report],{encoding:'utf8'});
  assert.equal(result.status,1);assert.match(result.stderr,/Unpinned schema validator/);
  const retained=JSON.parse(readFileSync(report));
  assert.equal(retained.status,'ERROR');assert.equal(retained.validator.version,metadata.version);
  assert.equal(retained.documentSha256.length,64);
});

test('a document schema URL causes no network access during validation',t=>{
  const d=mkdtempSync(join(tmpdir(),'offline-schema-'));t.after(()=>rmSync(d,{recursive:true,force:true}));
  const b=valid();b.$schema='https://attacker.invalid/schema.json';
  const script=join(d,'check.mjs');
  writeFileSync(script,`
    import {createRequire,syncBuiltinESMExports} from 'node:module';
    const require=createRequire(import.meta.url);
    let calls=0;
    const deny=()=>{calls++;throw new Error('Unexpected network access');};
    globalThis.fetch=deny;
    for(const name of ['http','https']) {
      const api=require('node:'+name);api.get=deny;api.request=deny;
    }
    require('node:net').Socket.prototype.connect=deny;
    require('node:dns').lookup=deny;
    syncBuiltinESMExports();
    const {validateSchema}=await import(${JSON.stringify(new URL('../../scripts/validate-sbom-schema.mjs',import.meta.url).href)});
    validateSchema(${JSON.stringify(b)});
    if(calls!==0) throw new Error('Network attempted');
  `);
  const result=spawnSync(process.execPath,[script],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
