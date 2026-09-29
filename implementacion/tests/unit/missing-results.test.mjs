import test from 'node:test';
import assert from 'node:assert/strict';
import { checkMissingResults } from '../../scripts/check-missing-results.mjs';
import { RESULTS_TYPE } from '../../scripts/lab-contracts.mjs';

const digest = 'sha256:' + 'a'.repeat(64);
const bom = {bomFormat:'CycloneDX',specVersion:'1.7',version:1,metadata:{component:{name:'synthetic',type:'container'}},components:[{name:'synthetic',type:'library'}]};
function envelope(type = 'https://cyclonedx.org/bom', predicate = bom, hash = digest.slice(7)) {
  return {payloadType:'application/vnd.in-toto+json', signatures:[{sig:Buffer.from('synthetic-not-a-real-signature').toString('base64')}],
    payload:Buffer.from(JSON.stringify({_type:'https://in-toto.io/Statement/v1', subject:[{name:'registry.example/quotes',digest:{sha256:hash}}],predicateType:type,predicate})).toString('base64')};
}

function bundle(dsseEnvelope = envelope()) {
  return {mediaType:'application/vnd.dev.sigstore.bundle.v0.3+json',
    verificationMaterial:{certificate:{rawBytes:Buffer.from('synthetic-not-a-real-certificate').toString('base64')}},dsseEnvelope};
}

const syntheticBytes = Buffer.from('synthetic bytes, not cryptographic evidence').toString('base64');
const logEntry = () => ({logIndex:'1',logId:{keyId:syntheticBytes},kindVersion:{kind:'dsse',version:'0.0.1'},
  integratedTime:'1',canonicalizedBody:syntheticBytes,inclusionPromise:{signedEntryTimestamp:syntheticBytes},
  inclusionProof:{logIndex:'1',treeSize:'2',rootHash:syntheticBytes,hashes:[syntheticBytes],checkpoint:{envelope:'synthetic checkpoint'}}});

test('bundle signatures require protobuf bytes and a string keyid without changing the classic parser', () => {
  for (const signature of [
    {sig:'%%%NOT-BASE64%%%'}, {sig:''}, {sig:42}, {sig:syntheticBytes,keyid:42},
    {sig:syntheticBytes,keyid:null}, {sig:syntheticBytes,unknown:true},
  ]) {
    const value = bundle();
    value.dsseEnvelope.signatures = [signature];
    assert.throws(() => checkMissingResults(JSON.stringify(value), digest), /Malformed bundle DSSE signature/);
  }
  for (const signature of [{sig:syntheticBytes}, {sig:syntheticBytes,keyid:''}, {sig:syntheticBytes,keyid:'synthetic-key'}]) {
    const value = bundle();
    value.dsseEnvelope.signatures = [signature];
    assert.equal(checkMissingResults(JSON.stringify(value), digest).reason, 'RESULTS_ATTESTATION_MISSING');
  }
  const classic = envelope();
  classic.signatures = [{sig:'synthetic-not-a-real-signature'}];
  assert.equal(checkMissingResults(JSON.stringify(classic), digest).reason, 'RESULTS_ATTESTATION_MISSING');
});

test('accepts defined verification-material shapes without claiming authentication', () => {
  const defaultFields = logEntry();
  defaultFields.logIndex = '0';
  defaultFields.integratedTime = 0;
  defaultFields.inclusionProof.logIndex = 0;
  defaultFields.inclusionProof.hashes = [];
  for (const verificationMaterial of [
    {certificate:{rawBytes:syntheticBytes}},
    {publicKey:{hint:'out-of-band-key'}},
    {publicKey:{}},
    {x509CertificateChain:{certificates:[{rawBytes:syntheticBytes}]}},
    {certificate:{rawBytes:syntheticBytes},tlogEntries:[],timestampVerificationData:{}},
    {certificate:{rawBytes:syntheticBytes},tlogEntries:[defaultFields],timestampVerificationData:{rfc3161Timestamps:[]}},
    {certificate:{rawBytes:syntheticBytes},tlogEntries:[logEntry()],
      timestampVerificationData:{rfc3161Timestamps:[{signedTimestamp:syntheticBytes}]}},
  ]) {
    assert.equal(checkMissingResults(JSON.stringify({...bundle(), verificationMaterial}), digest).reason, 'RESULTS_ATTESTATION_MISSING');
  }
});

test('rejects malformed verification material even alongside a valid classic SBOM', () => {
  const certificate = {rawBytes:syntheticBytes};
  const malformed = [
    {bogus:true}, {certificate:null}, {certificate:[]}, {certificate:{}},
    {certificate:{rawBytes:1}}, {certificate:{rawBytes:''}}, {certificate:{rawBytes:'not-base64'}},
    {certificate:{...certificate,bogus:true}}, {certificate,bogus:true},
    {publicKey:'key'}, {publicKey:{hint:42}}, {publicKey:{bogus:true}},
    {certificate,publicKey:{hint:'key'}}, {x509CertificateChain:{}},
    {x509CertificateChain:{certificates:[]}}, {x509CertificateChain:{certificates:[{}]}},
    {certificate,tlogEntries:{}}, {certificate,tlogEntries:[null]}, {certificate,tlogEntries:[{}]},
    {certificate,timestampVerificationData:[]}, {certificate,timestampVerificationData:{bogus:true}},
    {certificate,timestampVerificationData:{rfc3161Timestamps:'bad'}},
    {certificate,timestampVerificationData:{rfc3161Timestamps:[{}]}},
    {certificate,timestampVerificationData:{rfc3161Timestamps:[{signedTimestamp:42}]}},
  ];
  for (const [field, value] of [
    ['logIndex',true], ['logIndex','-1'], ['logIndex','9223372036854775808'],
    ['logId',{keyId:42}], ['kindVersion',{kind:42,version:'1'}],
    ['integratedTime',1.5], ['canonicalizedBody','not-base64'],
    ['inclusionPromise',{signedEntryTimestamp:[]}], ['inclusionProof',{}],
  ]) malformed.push({certificate,tlogEntries:[{...logEntry(),[field]:value}]});
  for (const [field, value] of [
    ['logIndex',null], ['treeSize',-1], ['rootHash',42], ['hashes',['not-base64']], ['checkpoint',{envelope:42}],
  ]) {
    const entry = logEntry();
    entry.inclusionProof[field] = value;
    malformed.push({certificate,tlogEntries:[entry]});
  }
  for (const verificationMaterial of malformed) {
    const inventory = [envelope(), {...bundle(),verificationMaterial}];
    assert.throws(() => checkMissingResults(JSON.stringify(inventory), digest), /verification material/, JSON.stringify(verificationMaterial));
  }
});

test('accepts v0.3 bundles and mixed hosted inventories in JSON and JSONL', () => {
  const provenance = bundle(envelope('https://slsa.dev/provenance/v1', {buildDefinition:{}}));
  for (const inventory of [[provenance, envelope()], [envelope(), provenance], [bundle(), provenance]]) {
    for (const text of [JSON.stringify(inventory), inventory.map(value => JSON.stringify(value)).join('\n')]) {
      assert.equal(checkMissingResults(text, digest).reason, 'RESULTS_ATTESTATION_MISSING');
    }
  }
  assert.equal(checkMissingResults(JSON.stringify(bundle()), digest).reason, 'RESULTS_ATTESTATION_MISSING');
});

test('required transparency-log and proof fields cannot be omitted', () => {
  for (const [section, required] of [
    ['entry', ['logId', 'kindVersion', 'inclusionProof']],
    ['proof', ['rootHash', 'treeSize', 'checkpoint']],
  ]) {
    for (const field of required) {
      const entry = logEntry();
      delete (section === 'entry' ? entry : entry.inclusionProof)[field];
      const value = bundle();
      value.verificationMaterial.tlogEntries = [entry];
      assert.throws(() => checkMissingResults(JSON.stringify([envelope(), value]), digest),
        /verification material/, `${section}.${field} must be present`);
    }
  }
});

test('protobuf JSON defaults permit Rekor v2 and first-leaf proof representations', () => {
  const value = bundle();
  const entry = logEntry();
  delete entry.integratedTime;
  delete entry.logIndex;
  delete entry.inclusionProof.logIndex;
  delete entry.inclusionProof.hashes;
  value.verificationMaterial.tlogEntries = [entry];
  assert.equal(checkMissingResults(JSON.stringify(value), digest).reason, 'RESULTS_ATTESTATION_MISSING');
  entry.logIndex = null;
  assert.throws(() => checkMissingResults(JSON.stringify(value), digest), /verification material/);
});

test('bundles require exactly one DSSE signature without restricting classic envelopes', () => {
  for (const count of [0, 2, 3]) {
    const value = envelope();
    value.signatures = Array.from({length:count}, () => ({sig:'synthetic-not-a-real-signature'}));
    assert.throws(() => checkMissingResults(JSON.stringify([envelope(), bundle(value)]), digest), /exactly one DSSE signature/);
    if (count > 0) assert.equal(checkMissingResults(JSON.stringify(value), digest).reason, 'RESULTS_ATTESTATION_MISSING');
  }
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
  assert.throws(() => checkMissingResults(JSON.stringify(bundle(envelope(undefined, {}))), digest), /Incomplete CycloneDX|Unsupported CycloneDX/);
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
