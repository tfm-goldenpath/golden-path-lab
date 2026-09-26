import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGithubVerificationResults } from '../../scripts/github-attestation.mjs';

const expected = {
  image: 'ghcr.io/example/tfm-quotes-node',
  digest: `sha256:${'a'.repeat(64)}`,
  repository: 'https://github.com/example/golden-path',
  commit: 'b'.repeat(40),
  identity: 'https://github.com/example/golden-path/.github/workflows/golden-path.yml@refs/heads/main',
  ref: 'refs/heads/main',
};

// Synthetic fixture with the documented CLI/sigstore-go JSON structure.
// It deliberately contains no real signature and cannot test cryptography.
function fixture() {
  return [{
    attestation: { bundle: { synthetic: true } },
    verificationResult: {
      statement: {
        _type: 'https://in-toto.io/Statement/v1',
        subject: [{ name: expected.image, digest: { sha256: expected.digest.slice(7) } }],
        predicateType: 'https://slsa.dev/provenance/v1',
        predicate: { buildDefinition: {}, runDetails: {} },
      },
      signature: {
        certificate: {
          certificateIssuer: 'CN=synthetic test issuer',
          subjectAlternativeName: expected.identity,
          issuer: 'https://token.actions.githubusercontent.com',
          sourceRepositoryURI: expected.repository,
          sourceRepositoryDigest: expected.commit,
          sourceRepositoryRef: expected.ref,
          runnerEnvironment: 'github-hosted',
        },
      },
      verifiedTimestamps: [{ type: 'tlog', uri: 'https://example.invalid/test-log', timestamp: '2026-09-21T10:00:00Z' }],
    },
  }];
}

test('accepts the authorised digest, source commit and exact workflow identity', () => {
  const result = validateGithubVerificationResults(fixture(), expected);
  assert.equal(result.authorised, true);
  assert.equal(result.commit, expected.commit);
  assert.equal(result.matchedResult, 0);
});

for (const [field, wrong] of [
  ['subjectAlternativeName', `${expected.identity}-other`],
  ['issuer', 'https://example.invalid/issuer'],
  ['sourceRepositoryURI', 'https://github.com/attacker/golden-path'],
  ['sourceRepositoryDigest', 'c'.repeat(40)],
  ['sourceRepositoryRef', 'refs/heads/other'],
  ['runnerEnvironment', 'self-hosted'],
]) {
  test(`rejects a different certified ${field}`, () => {
    const results = fixture();
    results[0].verificationResult.signature.certificate[field] = wrong;
    assert.throws(() => validateGithubVerificationResults(results, expected), /No verified attestation/);
  });
}

test('matching user-controlled predicate fields cannot replace the certified source', () => {
  const results = fixture();
  results[0].verificationResult.signature.certificate.sourceRepositoryDigest = 'c'.repeat(40);
  results[0].verificationResult.statement.predicate = { repository: expected.repository, commit: expected.commit };
  assert.throws(() => validateGithubVerificationResults(results, expected), /Source commit mismatch/);
});

test('rejects an attestation for another image digest', () => {
  const results = fixture();
  results[0].verificationResult.statement.subject[0].digest.sha256 = 'd'.repeat(64);
  assert.throws(() => validateGithubVerificationResults(results, expected), /Subject does not match/);
});

test('rejects an attestation for another image name even if digest matches', () => {
  const results = fixture();
  results[0].verificationResult.statement.subject[0].name = 'ghcr.io/attacker/tfm-quotes-node';
  assert.throws(() => validateGithubVerificationResults(results, expected), /Subject does not match/);
});

test('rejects a different predicate type', () => {
  const results = fixture();
  results[0].verificationResult.statement.predicateType = 'https://cyclonedx.org/bom';
  assert.throws(() => validateGithubVerificationResults(results, expected), /predicate type/);
});

test('rejects results without a verified timestamp', () => {
  const results = fixture();
  results[0].verificationResult.verifiedTimestamps = [];
  assert.throws(() => validateGithubVerificationResults(results, expected), /verified signing timestamp/);
});

test('rejects missing, empty or incorrectly shaped CLI output', () => {
  for (const input of [null, {}, [], [{ statement: fixture()[0].verificationResult.statement }]]) {
    assert.throws(() => validateGithubVerificationResults(input, expected));
  }
});

test('each accepted result must satisfy the whole policy on its own', () => {
  const first = fixture()[0];
  const second = fixture()[0];
  first.verificationResult.signature.certificate.sourceRepositoryDigest = 'c'.repeat(40);
  second.verificationResult.statement.subject[0].digest.sha256 = 'd'.repeat(64);
  assert.throws(() => validateGithubVerificationResults([first, second], expected), /No verified attestation/);
});

test('selects an authorised result when other entries do not match', () => {
  const old = fixture()[0];
  old.verificationResult.signature.certificate.sourceRepositoryDigest = 'c'.repeat(40);
  assert.equal(validateGithubVerificationResults([old, fixture()[0]], expected).matchedResult, 1);
});

test('rejects an inconsistent policy before examining attestations', () => {
  assert.throws(() => validateGithubVerificationResults(fixture(), { ...expected, ref: 'refs/heads/other' }), /Workflow identity/);
  assert.throws(() => validateGithubVerificationResults(fixture(), { ...expected, commit: 'latest' }), /Invalid source commit/);
});
