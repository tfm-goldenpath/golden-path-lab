import test from 'node:test';
import assert from 'node:assert/strict';
import { checkMissingResults } from '../../scripts/check-missing-results.mjs';
import { RESULTS_TYPE } from '../../scripts/lab-contracts.mjs';

const digest = 'sha256:' + 'a'.repeat(64);
const bom = {bomFormat:'CycloneDX',specVersion:'1.6',version:1,metadata:{component:{name:'synthetic',type:'container'}},components:[{name:'synthetic',type:'library'}]};
function envelope(type = 'https://cyclonedx.org/bom', predicate = bom, hash = digest.slice(7)) {
  return {payloadType:'application/vnd.in-toto+json', signatures:[{sig:'synthetic-not-a-real-signature'}],
    payload:Buffer.from(JSON.stringify({_type:'https://in-toto.io/Statement/v1', subject:[{name:'registry.example/quotes',digest:{sha256:hash}}],predicateType:type,predicate})).toString('base64')};
}

function bundle(dsseEnvelope = envelope()) {
  return {mediaType:'application/vnd.dev.sigstore.bundle.v0.3+json',
    verificationMaterial:{certificate:{rawBytes:'synthetic-not-a-real-certificate'}},dsseEnvelope};
}

test('accepts v0.3 bundles and mixed hosted inventories in JSON and JSONL', () => {
  const provenance = bundle(envelope('https://slsa.dev/provenance/v1', {buildDefinition:{}}));
  for (const inventory of [[provenance, envelope()], [envelope(), provenance], [bundle(), provenance]]) {
    for (const text of [JSON.stringify(inventory), inventory.map(value => JSON.stringify(value)).join('\n')]) {
      assert.equal(checkMissingResults(text, digest).reason, 'RESULTS_ATTESTATION_MISSING');
    }
  }
  assert.equal(checkMissingResults(JSON.stringify(bundle()), digest).reason, 'RESULTS_ATTESTATION_MISSING');
});

test('bundled results for the expected digest block F13 regardless of their result', () => {
  for (const result of ['PASS', 'FAIL']) {
    const inventory = [envelope(), bundle(envelope(RESULTS_TYPE, {result}))];
    for (const text of [JSON.stringify(inventory), inventory.map(value => JSON.stringify(value)).join('\n')]) {
      assert.throws(() => checkMissingResults(text, digest), /results attestation already exists/);
    }
  }
});

test('bundle matching preserves the expected digest and required SBOM checks', () => {
  assert.throws(() => checkMissingResults(JSON.stringify(bundle(envelope(undefined, bom, 'b'.repeat(64)))), digest), /SBOM attestation/);
  const inventory = [bundle(), bundle(envelope(RESULTS_TYPE, {result:'PASS'}, 'b'.repeat(64)))];
  assert.equal(checkMissingResults(JSON.stringify(inventory), digest).reason, 'RESULTS_ATTESTATION_MISSING');
  assert.throws(() => checkMissingResults(JSON.stringify(bundle(envelope(undefined, {}))), digest), /Incomplete CycloneDX/);
});

test('malformed or unsupported bundles fail closed even beside a valid SBOM', () => {
  for (const value of [
    {...bundle(), mediaType:'application/vnd.dev.sigstore.bundle.v99+json'},
    {...bundle(), mediaType:undefined},
    {...bundle(), verificationMaterial:undefined},
    {...bundle(), verificationMaterial:[]},
    {...bundle(), verificationMaterial:{}},
    {...bundle(), dsseEnvelope:undefined},
    {...bundle(), dsseEnvelope:null},
    {...bundle(), dsseEnvelope:[]},
    {...bundle(), dsseEnvelope:bundle()},
    {...bundle(), ...envelope()},
    bundle({...envelope(), signatures:[]}),
    bundle({...envelope(), payload:'not-base64'}),
    bundle({...envelope(), payload:Buffer.from('{}').toString('base64')}),
  ]) {
    assert.throws(() => checkMissingResults(JSON.stringify([envelope(), value]), digest));
  }
});

test('F13 identifies missing results only when an SBOM exists for the same digest', () => {
  assert.deepEqual(checkMissingResults(JSON.stringify(envelope()), digest), {
    scenario:'F13',decision:'DENY',reason:'RESULTS_ATTESTATION_MISSING'
  });
  assert.throws(() => checkMissingResults(JSON.stringify(envelope(undefined, bom, 'b'.repeat(64))), digest));
});

test('accepts JSON array and JSONL inventories produced by Cosign', () => {
  const extra = envelope('https://slsa.dev/provenance/v1', {buildDefinition:{}});
  for (const text of [JSON.stringify([envelope(),extra]), JSON.stringify(envelope())+'\n'+JSON.stringify(extra)+'\n']) {
    assert.equal(checkMissingResults(text, digest).reason, 'RESULTS_ATTESTATION_MISSING');
  }
});

test('an existing results attestation prevents attribution to missing results', () => {
  for (const result of ['PASS', 'FAIL']) {
    assert.throws(() => checkMissingResults(JSON.stringify([envelope(),envelope(RESULTS_TYPE,{result})]), digest));
  }
});

test('results for another digest do not hide missing authorization', () => {
  const inventory = [envelope(), envelope(RESULTS_TYPE, {result:'PASS'}, 'b'.repeat(64))];
  assert.equal(checkMissingResults(JSON.stringify(inventory), digest).reason, 'RESULTS_ATTESTATION_MISSING');
});

test('an empty or malformed inventory is not reported as F13 detection', () => {
  for (const text of ['', '[]', '{}', 'not-json', 'null', JSON.stringify(envelope())+'\nnot-json']) {
    assert.throws(() => checkMissingResults(text, digest));
  }
});

test('missing payload, subject or signature does not establish a usable inventory', () => {
  const missingSignature = envelope(); missingSignature.signatures = [];
  const invalidPayload = envelope(); invalidPayload.payload = 'not-base64';
  const incompleteStatement = envelope(); incompleteStatement.payload = Buffer.from('{}').toString('base64');
  for (const value of [missingSignature, invalidPayload, incompleteStatement]) {
    assert.throws(() => checkMissingResults(JSON.stringify(value), digest));
  }
  assert.throws(() => checkMissingResults(JSON.stringify(envelope(undefined, {})), digest));
  assert.throws(() => checkMissingResults(JSON.stringify(envelope()), 'latest'));
});
