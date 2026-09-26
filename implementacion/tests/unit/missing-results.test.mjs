import test from 'node:test';
import assert from 'node:assert/strict';
import { checkMissingResults } from '../../scripts/check-missing-results.mjs';
import { RESULTS_TYPE } from '../../scripts/lab-contracts.mjs';

const digest = 'sha256:' + 'a'.repeat(64);
const bom = {bomFormat:'CycloneDX',specVersion:'1.6',version:1,metadata:{component:{name:'synthetic'}},components:[{name:'synthetic',type:'library'}]};
function envelope(type = 'https://cyclonedx.org/bom', predicate = bom, hash = digest.slice(7)) {
  return {payloadType:'application/vnd.in-toto+json', signatures:[{sig:'synthetic-not-a-real-signature'}],
    payload:Buffer.from(JSON.stringify({_type:'https://in-toto.io/Statement/v1', subject:[{name:'registry.example/quotes',digest:{sha256:hash}}],predicateType:type,predicate})).toString('base64')};
}

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
