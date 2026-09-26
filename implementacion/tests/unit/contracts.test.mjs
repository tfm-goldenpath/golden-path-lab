import test from 'node:test';
import assert from 'node:assert/strict';
import { manifest, validateResults, validateSbom, checkStatements, CHECKS, RESULTS_TYPE } from '../../scripts/lab-contracts.mjs';
const digest = 'a'.repeat(64), commit = 'b'.repeat(40), repository = 'https://example.invalid/tfm/local';
const valid = () => ({policyVersion:'golden-path-v1',source:{repository,commit},result:'PASS',checks:Object.fromEntries(CHECKS.map(c=>[c,'PASS']))});
test('the manifest uses a digest and restricted execution', () => {
  const m = manifest('registry.test/quotes@sha256:' + digest);
  assert.equal(m.spec.template.spec.containers[0].securityContext.privileged, false);
  assert.equal(m.spec.template.spec.automountServiceAccountToken, false);
  assert.throws(() => manifest('registry.test/quotes:latest'));
});
test('a missing or failed check or a different source prevents authorization', () => {
  validateResults(valid(), repository, commit);
  for (const check of CHECKS) {
    const v = valid(); delete v.checks[check]; assert.throws(() => validateResults(v, repository, commit));
    v.checks[check] = 'FAIL'; assert.throws(() => validateResults(v, repository, commit));
  }
  assert.throws(() => validateResults(valid(), repository, 'c'.repeat(40)));
  assert.throws(() => validateResults(valid(), 'https://example.invalid/other', commit));
});
test('a verified signature is insufficient for a different digest or predicate', () => {
  const s = {subject:[{digest:{sha256:digest}}],predicateType:RESULTS_TYPE,predicate:valid()};
  const envelope = {payload:Buffer.from(JSON.stringify(s)).toString('base64')};
  const check = p => validateResults(p,repository,commit);
  checkStatements(JSON.stringify(envelope),digest,RESULTS_TYPE,check);
  assert.throws(() => checkStatements(JSON.stringify(envelope),'d'.repeat(64),RESULTS_TYPE,check));
  assert.throws(() => checkStatements(JSON.stringify(envelope),digest,'other-type',check));
});
test('an empty SBOM or a different format is insufficient evidence', () => {
  assert.throws(() => validateSbom({bomFormat:'SPDX'}));
  assert.throws(() => validateSbom({bomFormat:'CycloneDX',specVersion:'1.6',version:1,components:[]}));
  assert.equal(validateSbom({bomFormat:'CycloneDX',specVersion:'1.6',version:1,metadata:{component:{}},components:[{}]}),'1.6');
});
