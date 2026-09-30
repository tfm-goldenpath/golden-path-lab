// Synthetic fixtures exercise content and fresh gate decisions, not cryptography.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateResults,CHECKS,RESULTS_TYPE} from '../../scripts/lab-contracts.mjs';
import {statementFromVerifiedBundle} from '../../scripts/verified-bundle-statement.mjs';
import {verifyDelivery} from '../../scripts/ci-verification-gate.mjs';
import {fixture} from '../helpers/registry-fixture.mjs';
const repository='https://github.com/example/lab',commit='b'.repeat(40);
const sig='https://sigstore.dev/cosign/sign/v1',sbom='https://cyclonedx.org/bom',prov='https://slsa.dev/provenance/v1';
const predicate=()=>({policyVersion:'golden-path-v1',source:{repository,commit},result:'PASS',checks:Object.fromEntries(CHECKS.map(c=>[c,'PASS']))});
test('valid P1 accepted; P0-only produces precise content violation',()=>{
  validateResults(predicate(),repository,commit);
  assert.throws(()=>validateResults({...predicate(),policyVersion:'laboratory-results-p0-fixture'},repository,commit),e=>{
    assert.deepEqual(e.resultsFailure.violations,['RESULTS_POLICY_VERSION']);return true;
  });
});
for(const fault of ['source','commit','unsuccessful','missing-check','failed-check']) test(`P0 plus ${fault} cannot be attributed solely to policy`,()=>{
  const p={...predicate(),policyVersion:'laboratory-results-p0-fixture'};
  if(fault==='source') p.source.repository+='-other';
  if(fault==='commit') p.source.commit='c'.repeat(40);
  if(fault==='unsuccessful') p.result='FAIL';
  if(fault==='missing-check') delete p.checks.sbom;
  if(fault==='failed-check') p.checks.signature='FAIL';
  assert.throws(()=>validateResults(p,repository,commit),e=>e.resultsFailure.violations.length>1);
});
for(const fault of ['valid','absent','before-results','P0','masking','wrong-digest','signature','signer','source','predicate','unsuccessful','missing-check','missing-sbom','unrelated-trust','registry','transport','incomplete','missing-policy','absent-and-missing-sbom','premature']) test(`fresh results gate: ${fault}`,async t=>{
  const directory=mkdtempSync(join(tmpdir(),'results-gate-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const absent=['absent','before-results','absent-and-missing-sbom'].includes(fault);
  const types=[sig,...(['missing-sbom','absent-and-missing-sbom'].includes(fault)?[]:[sbom]),prov,...(absent?[]:[RESULTS_TYPE]),...(fault==='masking'?[RESULTS_TYPE]:[])];
  let resultsCount=0;
  const f=fixture({types,transform:b=>{
    const s=JSON.parse(Buffer.from(b.dsseEnvelope.payload,'base64'));
    if(s.predicateType===RESULTS_TYPE) {
      s.predicate=predicate();
      if(!['valid','wrong-digest','signature','signer','predicate','registry','transport','incomplete'].includes(fault)) s.predicate.policyVersion=resultsCount++?'golden-path-v1':'laboratory-results-p0-fixture';
      if(fault==='wrong-digest') s.subject[0].digest.sha256='c'.repeat(64);
      if(fault==='source') s.predicate.source.repository+='-other';
      if(fault==='predicate') s.predicateType='https://example.invalid/other';
      if(fault==='unsuccessful') s.predicate.result='FAIL';
      if(fault==='missing-policy') delete s.predicate.policyVersion;
      if(fault==='missing-check') delete s.predicate.checks.sbom;
    }
    b.dsseEnvelope.payload=Buffer.from(JSON.stringify(s)).toString('base64');return b;
  }});
  const calls=[];
  const dependencies={download:()=>f.run(),authenticate:(_o,b,type)=>{
    calls.push(type);
    if((['signature','signer'].includes(fault)&&type===RESULTS_TYPE)||(fault==='unrelated-trust'&&type===sbom)) throw new Error('Synthetic trust rejection');
    return type===RESULTS_TYPE?statementFromVerifiedBundle(JSON.stringify(b),f.image.split('@')[1],type,repository,commit):b;
  }};
  if(fault==='incomplete') f.contents.delete(f.layerPaths[0]);
  if(['registry','transport'].includes(fault)) dependencies.download=()=>{throw new Error(fault);};
  const run=()=>verifyDelivery({directory,prefix:'trial',mode:'local',image:f.image,repository,commit,phase:['before-results','premature'].includes(fault)?'before-results':'authorized'},dependencies);
  const expected={valid:'VERIFIED',absent:'MISSING_RESULTS','before-results':'VERIFIED',P0:'RESULTS_POLICY_VERSION_MISMATCH'}[fault];
  if(expected) {
    assert.equal((await run()).status,expected);
    assert.ok([sig,sbom,prov].every(type=>calls.includes(type)));
  } else await assert.rejects(run());
  const result=JSON.parse(readFileSync(join(directory,'trial.result.json')));
  assert.equal(result.status,expected||'INTEGRATION_FAILURE');
  if(fault==='P0') assert.equal(result.resultsAuthenticated,true);
});

import {authenticateBundle} from '../../scripts/ci-verification-gate.mjs';
import {writeFileSync} from 'node:fs';
test('actual results adapter authenticates saved bytes before evaluating P0 fields',t=>{
  const directory=mkdtempSync(join(tmpdir(),'p0-adapter-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const f=fixture({types:[RESULTS_TYPE],transform:b=>{
    const s=JSON.parse(Buffer.from(b.dsseEnvelope.payload,'base64'));
    s.predicate={...predicate(),policyVersion:'laboratory-results-p0-fixture'};
    b.dsseEnvelope.payload=Buffer.from(JSON.stringify(s)).toString('base64');return b;
  }});
  const file=join(directory,'P0.bundle.json');writeFileSync(file,JSON.stringify(f.bundles[0]));
  const options={mode:'local',image:f.image,directory,repository,commit};let called=false;
  assert.throws(()=>authenticateBundle(options,f.bundles[0],RESULTS_TYPE,file,join(directory,'verified'),(cmd,args)=>{
    called=true;assert.equal(cmd,'cosign');assert.equal(args[args.indexOf('--bundle')+1],file);return {status:0};
  }),e=>called && e.resultsFailure?.violations.join()==='RESULTS_POLICY_VERSION');
  assert.throws(()=>authenticateBundle(options,f.bundles[0],RESULTS_TYPE,file,join(directory,'bad-signature'),()=>({status:1})),e=>!e.resultsFailure && !!e.verificationFailure);
});

for(const check of CHECKS) test(`normal P1 requires successful ${check}`,()=>{
 const p=predicate();delete p.checks[check];assert.throws(()=>validateResults(p,repository,commit),/RESULTS_CHECKS/);
 p.checks[check]='FAIL';assert.throws(()=>validateResults(p,repository,commit),/RESULTS_CHECKS/);
});
