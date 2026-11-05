import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBundleProfile, IMAGE_SIGNATURE_TYPE } from '../../scripts/check-bundle-profile.mjs';
import { RESULTS_TYPE } from '../../scripts/lab-contracts.mjs';

const digest = `sha256:${'a'.repeat(64)}`;
const sbom = 'https://cyclonedx.org/bom';
const provenance = 'https://slsa.dev/provenance/v1';
const bundle = (type, hash = digest.slice(7)) => ({
  mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json',
  verificationMaterial: { publicKey: { hint: 'synthetic-unit-test-key' } },
  dsseEnvelope: { payloadType: 'application/vnd.in-toto+json', signatures: [{ sig: 'c3ludGhldGlj' }],
    payload: Buffer.from(JSON.stringify({ _type: 'https://in-toto.io/Statement/v1',
      subject: [{ name: 'registry.invalid/lab', digest: { sha256: hash } }], predicateType: type, predicate: {},
    })).toString('base64') },
});

test('bundle profile requires a distinct image-signature predicate alongside attestations', () => {
  const evidence = [bundle(IMAGE_SIGNATURE_TYPE), bundle(sbom), bundle(provenance)];
  assert.equal(checkBundleProfile(JSON.stringify(evidence), digest, 'before-results').format, 'sigstore-bundle-v0.3');
  assert.throws(() => checkBundleProfile(JSON.stringify(evidence.slice(1)), digest, 'before-results'), /Missing bundle predicate.*cosign\/sign\/v1/);
});

test('bundle profile requires results only after authorization', () => {
  const evidence = [bundle(IMAGE_SIGNATURE_TYPE), bundle(sbom), bundle(provenance)];
  assert.throws(() => checkBundleProfile(JSON.stringify(evidence), digest, 'authorized'), /Missing bundle predicate.*verification-results/);
  evidence.push(bundle(RESULTS_TYPE));
  assert.equal(checkBundleProfile(evidence.map(v => JSON.stringify(v)).join('\n'), digest, 'authorized').predicates.length, 4);
  assert.throws(() => checkBundleProfile(JSON.stringify(evidence), digest, 'before-results'), /Results already exist/);
});

test('classic evidence, wrong digests and malformed wrappers cannot establish bundle compatibility', () => {
  const good = [bundle(IMAGE_SIGNATURE_TYPE), bundle(sbom), bundle(provenance)];
  assert.throws(() => checkBundleProfile(JSON.stringify([...good, bundle(sbom).dsseEnvelope]), digest, 'before-results'), /Only Sigstore bundles/);
  assert.throws(() => checkBundleProfile(JSON.stringify([bundle(IMAGE_SIGNATURE_TYPE, 'b'.repeat(64)), ...good.slice(1)]), digest, 'before-results'), /different digest/);
  assert.throws(() => checkBundleProfile(JSON.stringify([{ ...good[0], verificationMaterial: {} }, ...good.slice(1)]), digest, 'before-results'), /verification material/);
  assert.throws(() => checkBundleProfile('[]', digest, 'authorized'), /no attestations/);
  assert.throws(() => checkBundleProfile(JSON.stringify(good), digest, 'other'), /Unknown inventory phase/);
});

test('malformed signature bytes and key identifiers cannot establish either bundle phase', () => {
  for (const phase of ['before-results', 'authorized']) {
    for (const signature of [{sig:'%%%NOT-BASE64%%%'}, {sig:'c3ludGhldGlj',keyid:42}]) {
      const evidence = [bundle(IMAGE_SIGNATURE_TYPE), bundle(sbom), bundle(provenance)];
      if (phase === 'authorized') evidence.push(bundle(RESULTS_TYPE));
      evidence[0].dsseEnvelope.signatures = [signature];
      assert.throws(() => checkBundleProfile(JSON.stringify(evidence), digest, phase), /Malformed bundle DSSE signature/);
    }
  }
});
