import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, X509Certificate } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { completeHostedChain, completeManifest } from '../../scripts/complete-classic-chain.mjs';

const CERTIFICATE = 'dev.sigstore.cosign/certificate';
const CHAIN = 'dev.sigstore.cosign/chain';
const MANIFEST_TYPE = 'application/vnd.oci.image.manifest.v1+json';
const imageDigest = 'a'.repeat(64);
const image = `ghcr.io/example/quotes-node@sha256:${imageDigest}`;
const actor = 'example-author';
const token = 'synthetic-workflow-secret';
const registryToken = 'synthetic-registry-secret';
const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
let directory;
let certificates;

before(() => {
  directory = mkdtempSync(join(tmpdir(), 'golden-path-classic-chain-'));
  const gitOpenSSL = 'C:/Program Files/Git/usr/bin/openssl.exe';
  const openssl = process.platform === 'win32' && existsSync(gitOpenSSL) ? gitOpenSSL : 'openssl';
  const run = args => execFileSync(openssl, args, { cwd: directory, stdio: 'pipe', timeout: 15_000 });
  // Generated PKI checks certificate signatures; it is not a Fulcio/Rekor integration test.
  writeFileSync(join(directory, 'request.cnf'), '[req]\ndistinguished_name=subject\n[subject]\n');
  writeFileSync(join(directory, 'ca.ext'), 'basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\n');
  writeFileSync(join(directory, 'leaf.ext'), 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=codeSigning\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\n');
  for (const name of ['root', 'intermediate', 'leaf', 'unrelated']) {
    run(['req', '-new', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes',
      '-keyout', `${name}.key`, '-out', `${name}.csr`, '-subj', `/CN=Laboratory ${name}`,
      '-config', 'request.cnf']);
    const issuer = name === 'intermediate' ? 'root' : 'intermediate';
    const signing = ['root', 'unrelated'].includes(name)
      ? ['-signkey', `${name}.key`]
      : ['-CA', `${issuer}.pem`, '-CAkey', `${issuer}.key`];
    run(['x509', '-req', '-in', `${name}.csr`, ...signing, '-set_serial', String(100 + ['root', 'intermediate', 'leaf', 'unrelated'].indexOf(name)),
      '-days', '2', '-extfile', name === 'leaf' ? 'leaf.ext' : 'ca.ext', '-out', `${name}.pem`]);
  }
  certificates = Object.fromEntries(['root', 'intermediate', 'leaf', 'unrelated']
    .map(name => [name, new X509Certificate(readFileSync(join(directory, `${name}.pem`)))]));
});

after(() => {
  if (directory) {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('golden-path-classic-chain-'));
    rmSync(directory, { recursive: true, force: true });
  }
});

function trustedRoot(chain = [certificates.intermediate, certificates.root]) {
  return {
    mediaType: 'application/vnd.dev.sigstore.trustedroot+json;version=0.1',
    certificateAuthorities: [{ uri: 'https://fulcio.sigstore.dev',
      certChain: { certificates: chain.map(cert => ({ rawBytes: cert.raw.toString('base64') })) } }],
  };
}

function fixture() {
  return {
    schemaVersion: 2, mediaType: MANIFEST_TYPE,
    config: { mediaType: 'application/vnd.oci.image.config.v1+json', digest: `sha256:${'b'.repeat(64)}`, size: 2 },
    annotations: { 'test.manifest': 'preserve this' },
    layers: ['c', 'd'].map(character => ({
      mediaType: 'application/vnd.dsse.envelope.v1+json', digest: `sha256:${character.repeat(64)}`, size: 456,
      annotations: {
        [CERTIFICATE]: certificates.leaf.toString(),
        'dev.cosignproject.cosign/signature': 'synthetic-signature-bytes',
        'dev.sigstore.cosign/bundle': '{"syntheticRekorEntry":"preserve byte for byte"}',
        'dev.sigstore.cosign/rfc3161timestamp': '{"syntheticTimestamp":"unchanged"}',
        predicateType: 'https://cyclonedx.org/bom', 'test.unknown': 'preserve this too',
      },
    })),
  };
}

function withoutChains(manifest) {
  const copy = structuredClone(manifest);
  for (const layer of copy.layers) delete layer.annotations[CHAIN];
  return copy;
}

test('adds the matching intermediate then root to every layer, preserving all other metadata', () => {
  const original = fixture();
  const snapshot = structuredClone(original);
  const result = completeManifest(original, trustedRoot());
  assert.equal(result.changed, true);
  assert.deepEqual(original, snapshot, 'the input manifest must not be mutated');
  assert.deepEqual(withoutChains(result.manifest), snapshot);
  for (const layer of result.manifest.layers) {
    const chain = layer.annotations[CHAIN].match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g)
      .map(pem => new X509Certificate(pem).fingerprint256);
    assert.deepEqual(chain, [certificates.intermediate.fingerprint256, certificates.root.fingerprint256]);
  }
  assert.ok(result.certificates.every(item => item.addedCertificates === 2));
});

test('completing an already correct chain is idempotent', () => {
  const first = completeManifest(fixture(), trustedRoot());
  const second = completeManifest(first.manifest, trustedRoot());
  assert.equal(second.changed, false);
  assert.deepEqual(second.manifest, first.manifest);
  assert.ok(second.certificates.every(item => item.addedCertificates === 0));
});

test('extends a matching intermediate-only prefix without replacing it', () => {
  const original = fixture();
  original.layers[0].annotations[CHAIN] = certificates.intermediate.toString();
  const result = completeManifest(original, trustedRoot());
  assert.equal(result.certificates[0].addedCertificates, 1);
  assert.equal(result.certificates[1].addedCertificates, 2);
});

test('rejects a missing, malformed, multiple or CA signing certificate', () => {
  for (const leaf of [undefined, 'not a certificate', certificates.leaf.toString() + certificates.root.toString(), certificates.intermediate.toString()]) {
    const manifest = fixture();
    manifest.layers[0].annotations[CERTIFICATE] = leaf;
    assert.throws(() => completeManifest(manifest, trustedRoot()));
  }
});

test('rejects a substituted existing chain instead of silently repairing it', () => {
  const manifest = fixture();
  manifest.layers[0].annotations[CHAIN] = certificates.unrelated.toString();
  assert.throws(() => completeManifest(manifest, trustedRoot()), /Existing chain differs/);
});

test('rejects untrusted leaf issuance and a broken CA chain', () => {
  assert.throws(() => completeManifest(fixture(), trustedRoot([certificates.unrelated])), /no unique matching/);
  assert.throws(() => completeManifest(fixture(), trustedRoot([certificates.intermediate, certificates.unrelated])), /does not link/);
  assert.throws(() => completeManifest(fixture(), trustedRoot([certificates.leaf, certificates.root])), /does not link/);
});

test('a parseable leaf with an altered certificate signature does not match its issuer', () => {
  const altered = Buffer.from(certificates.leaf.raw);
  altered[altered.length - 1] ^= 1;
  const manifest = fixture();
  manifest.layers[0].annotations[CERTIFICATE] = new X509Certificate(altered).toString();
  assert.throws(() => completeManifest(manifest, trustedRoot()), /no unique matching/);
});

test('rejects an unexpected trust-root format, CA service or malformed CA encoding', () => {
  for (const modify of [
    root => { root.mediaType = 'application/json'; },
    root => { root.certificateAuthorities[0].uri = 'https://attacker.invalid'; },
    root => { root.certificateAuthorities[0].certChain.certificates[0].rawBytes = '%%%'; },
  ]) {
    const root = trustedRoot();
    modify(root);
    assert.throws(() => completeManifest(fixture(), root));
  }
});

function registry({ kind = 'att', initial = fixture(), concurrent = false, wrongDigest = false, wrongPublished = false, tokenStatus = 200 } = {}) {
  let stored = Buffer.from(JSON.stringify(initial));
  let reads = 0;
  const calls = [];
  const endpoint = `https://ghcr.io/v2/example/quotes-node/manifests/sha256-${imageDigest}.${kind}`;
  async function request(url, options) {
    calls.push({ url, method: options.method || 'GET' });
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    if (url.startsWith('https://ghcr.io/token?')) {
      const parsed = new URL(url);
      assert.equal(parsed.searchParams.get('service'), 'ghcr.io');
      assert.equal(parsed.searchParams.get('scope'), 'repository:example/quotes-node:pull,push');
      assert.equal(options.headers.Authorization, `Basic ${Buffer.from(`${actor}:${token}`).toString('base64')}`);
      return new Response(JSON.stringify({ token: registryToken, sensitive: token }), { status: tokenStatus });
    }
    assert.equal(url, endpoint, 'credentials must only go to the exact GHCR evidence endpoint');
    assert.equal(options.headers.Authorization, `Bearer ${registryToken}`);
    if (options.method === 'PUT') {
      assert.equal(options.headers['Content-Type'], MANIFEST_TYPE);
      const submitted = JSON.parse(Buffer.from(options.body).toString('utf8'));
      assert.deepEqual(withoutChains(submitted), withoutChains(initial));
      stored = Buffer.from(options.body);
      if (wrongPublished) stored = Buffer.from(JSON.stringify({ ...submitted, annotations: { changed: 'elsewhere' } }));
      return new Response(null, { status: 201 });
    }
    reads += 1;
    if (concurrent && reads === 2) stored = Buffer.from(JSON.stringify({ ...initial, annotations: { concurrent: 'edit' } }));
    return new Response(stored, { headers: { 'docker-content-digest': wrongDigest ? `sha256:${'0'.repeat(64)}` : hash(stored) } });
  }
  return { request, calls };
}

for (const kind of ['sig', 'att']) {
  test(`publishes ${kind} chain metadata only and re-reads its exact manifest digest`, async () => {
    const mock = registry({ kind });
    const report = await completeHostedChain({ image, kind, actor, token, trustedRoot: trustedRoot(), request: mock.request });
    assert.equal(report.changed, true);
    assert.equal(report.image, image);
    assert.notEqual(report.originalManifestDigest, report.completedManifestDigest);
    assert.deepEqual(withoutChains(report.completedManifest), report.originalManifest);
    assert.deepEqual(mock.calls.map(call => call.method), ['GET', 'GET', 'GET', 'PUT', 'GET']);
    assert.ok(!JSON.stringify(report).includes(token));
    assert.ok(!JSON.stringify(report).includes(registryToken));
  });
}

test('does not publish an already completed manifest', async () => {
  const initial = completeManifest(fixture(), trustedRoot()).manifest;
  const mock = registry({ initial });
  const report = await completeHostedChain({ image, kind: 'att', actor, token, trustedRoot: trustedRoot(), request: mock.request });
  assert.equal(report.changed, false);
  assert.equal(report.originalManifestDigest, report.completedManifestDigest);
  assert.equal(mock.calls.length, 2);
});

test('refuses an observed concurrent change before PUT', async () => {
  const mock = registry({ concurrent: true });
  await assert.rejects(completeHostedChain({ image, kind: 'att', actor, token, trustedRoot: trustedRoot(), request: mock.request }), /changed concurrently/);
  assert.ok(mock.calls.every(call => call.method !== 'PUT'));
});

test('rejects a mismatched download digest or unexpected publication result', async () => {
  for (const options of [{ wrongDigest: true }, { wrongPublished: true }]) {
    const mock = registry(options);
    await assert.rejects(completeHostedChain({ image, kind: 'att', actor, token, trustedRoot: trustedRoot(), request: mock.request }), /digest does not match|did not match/);
  }
});

test('authentication errors expose neither the response body nor credentials', async () => {
  const mock = registry({ tokenStatus: 401 });
  await assert.rejects(completeHostedChain({ image, kind: 'att', actor, token, trustedRoot: trustedRoot(), request: mock.request }), error => {
    assert.match(error.message, /HTTP 401/);
    assert.ok(!error.message.includes(token));
    assert.ok(!error.message.includes(registryToken));
    return true;
  });
});

test('malformed token JSON never exposes the response body in an error', async () => {
  const request = async () => new Response(registryToken, { status: 200 });
  await assert.rejects(completeHostedChain({ image, kind: 'att', actor, token, trustedRoot: trustedRoot(), request }), error => {
    assert.equal(error.message, 'GHCR returned an invalid token response.');
    assert.ok(!error.message.includes(registryToken));
    return true;
  });
});

test('rejects other registries, mutable tags and invalid evidence kinds before requesting credentials', async () => {
  const request = () => assert.fail('invalid input must not make a network request');
  for (const options of [{ image: image.replace('ghcr.io', 'attacker.invalid') }, { image: 'ghcr.io/example/quotes-node:latest' }, { kind: 'bundle' }]) {
    await assert.rejects(completeHostedChain({ image, kind: 'att', actor, token, trustedRoot: trustedRoot(), request, ...options }), /Expected a GHCR image/);
  }
});
