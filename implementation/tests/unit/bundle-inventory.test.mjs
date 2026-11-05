import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadBundleInventory} from '../../scripts/download-bundle-inventory.mjs';
import {fixture, BUNDLE, INDEX, MANIFEST, EMPTY_CONFIG, bytes, digest, response} from '../helpers/registry-fixture.mjs';
const imageDigest = 'sha256:' + 'a'.repeat(64);

test('retains every raw bundle after hash-bound retrieval and stable second listing', async () => {
  const f = fixture();
  const result = await f.run();
  assert.deepEqual(new Set(result.bundles.map(JSON.stringify)), new Set(f.bundles.map(JSON.stringify)));
  assert.equal(result.inventory.descriptors.length, 3);
  assert.equal(result.inventory.artifacts.length, 3);
  for (const artifact of result.inventory.artifacts) {
    assert.equal(artifact.configDigest, digest(Buffer.from('{}')));
    assert.equal(artifact.configSize, 2);
  }
  assert.equal(f.calls.filter(call => new URL(call.url).pathname === f.configPaths[0]).length, 1,
    'retrieve a shared config once while validating every descriptor');
  assert.equal(f.calls.filter(call => new URL(call.url).pathname === f.indexPath).length, 2);
  assert.ok(f.calls.every(call => call.options.redirect === 'manual' && !call.options.headers.Authorization));
});

for (const status of [400, 404, 405, 406]) {
  test(`uses OCI fallback tag only for unsupported referrer API (${status})`, async () => {
    const f = fixture({mode:'github'});
    f.overrides.set(f.indexPath, () => response('', 'text/plain', status));
    const result = await f.run();
    assert.equal(result.inventory.source, 'referrers-tag');
    assert.equal(f.calls.filter(call => new URL(call.url).pathname === f.fallbackPath).length, 2);
  });
}

test('supports wrong-content-type API fallback and never falls back on authentication errors', async () => {
  const f = fixture();
  f.overrides.set(f.indexPath, () => response('unsupported', 'text/plain'));
  assert.equal((await f.run()).inventory.source, 'referrers-tag');
  const denied = fixture();
  denied.overrides.set(denied.indexPath, () => response('', INDEX, 401));
  await assert.rejects(denied.run(), /Reading referrers failed \(HTTP 401\)/);
  assert.ok(!denied.calls.some(call => new URL(call.url).pathname === denied.fallbackPath));
});

test('supported empty inventory fails without trying a fallback tag', async () => {
  const f = fixture();
  f.overrides.set(f.indexPath, () => f.index([]));
  await assert.rejects(f.run(), /no supported Sigstore bundles/);
  assert.ok(!f.calls.some(call => new URL(call.url).pathname === f.fallbackPath));
});

test('reads every bounded pagination page and refuses endpoint escapes', async () => {
  const f = fixture();
  f.overrides.set(f.indexPath, () => response(bytes({schemaVersion:2,mediaType:INDEX,manifests:f.descriptors.slice(0,1)}), INDEX, 200,
    {link:`<${f.indexPath}?last=one&n=2>; rel="next"`}));
  f.overrides.set(f.indexPath + '?last=one&n=2', () => f.index(f.descriptors.slice(1)));
  assert.equal((await f.run()).bundles.length, 3);
  for (const target of ['https://attacker.invalid/steal', f.indexPath + '?artifactType=hidden', f.path + '/manifests/other']) {
    const bad = fixture({mode:'github'});
    bad.overrides.set(bad.indexPath, () => response(bytes({schemaVersion:2,mediaType:INDEX,manifests:[]}), INDEX, 200,
      {link:`<${target}>; rel="next"`}));
    await assert.rejects(bad.run(), /pagination escapes/);
    assert.equal(bad.calls.length, 2, 'only token and authorized first index endpoint requested');
  }
});

test('fails on duplicate descriptors, oversized counts, repeated pages and changed listings', async () => {
  const duplicate = fixture();
  duplicate.overrides.set(duplicate.indexPath, () => duplicate.index([...duplicate.descriptors, duplicate.descriptors[0]]));
  await assert.rejects(duplicate.run(), /duplicate descriptor/);
  const excessive = fixture();
  excessive.overrides.set(excessive.indexPath, () => excessive.index(Array.from({length:51}, (_, i) => ({
    ...excessive.descriptors[0], digest:'sha256:' + i.toString(16).padStart(64, '0'),
  }))));
  await assert.rejects(excessive.run(), /Referrer count exceeds/);
  const loop = fixture();
  loop.overrides.set(loop.indexPath, () => response(bytes({schemaVersion:2,mediaType:INDEX,manifests:[]}), INDEX, 200,
    {link:`<${loop.indexPath}>; rel="next"`}));
  await assert.rejects(loop.run(), /pagination is repeated/);
  const changed = fixture();
  let reads = 0;
  changed.overrides.set(changed.indexPath, () => changed.index(++reads === 1 ? changed.descriptors : changed.descriptors.slice(1)));
  await assert.rejects(changed.run(), /changed during retrieval/);
});

for (const target of ['manifest', 'config', 'layer']) {
  test(`a failed ${target} for one referrer cannot be silently omitted`, async () => {
    const f = fixture({types:['https://sigstore.dev/cosign/sign/v1', 'https://cyclonedx.org/bom', 'https://slsa.dev/provenance/v1',
      'https://tfm-goldenpath.dev/attestations/verification-results/v1']});
    const path = (target === 'manifest' ? f.manifestPaths : target === 'config' ? f.configPaths : f.layerPaths)[3];
    f.overrides.set(path, () => response('', 'text/plain', 503));
    await assert.rejects(f.run(), /Reading registry content failed \(HTTP 503\)/);
  });
}

test('network failures and truncated or substituted content fail without leaking request data', async () => {
  for (const target of ['network', 'digest', 'length', 'header', 'size']) {
    const f = fixture();
    const value = f.contents.get(f.layerPaths[0]);
    f.overrides.set(f.layerPaths[0], () => {
      if (target === 'network') throw new Error('SECRET REQUEST TOKEN');
      if (target === 'digest') return response(Buffer.alloc(value.body.length, 65), BUNDLE);
      if (target === 'length') return response(value.body.subarray(1), BUNDLE);
      if (target === 'header') return response(value.body, BUNDLE, 200, {'docker-content-digest':imageDigest});
      return response(value.body, BUNDLE, 200, {'content-length':'10000001'});
    });
    await assert.rejects(f.run(), error => !error.message.includes('SECRET') && /failed|does not match|size limit/.test(error.message));
  }
});

function replaceManifest(f, index, mutate) {
  const manifest = JSON.parse(f.contents.get(f.manifestPaths[index]).body);
  mutate(manifest);
  const body = bytes(manifest);
  const entry = {...f.descriptors[index], digest:digest(body), size:body.length};
  f.descriptors[index] = entry;
  const path = f.path + '/manifests/' + entry.digest;
  f.contents.set(path, {body, type:MANIFEST});
  f.manifestPaths[index] = path;
}

test('both pinned publishers empty-config descriptors are accepted', async () => {
  for (const withArtifactType of [false, true]) {
    const f = fixture();
    replaceManifest(f, 0, manifest => {
      if (withArtifactType) manifest.config.artifactType = BUNDLE;
    });
    assert.equal((await f.run()).bundles.length, 3);
  }
});

test('Sigstore configs require valid bounded descriptors before retrieval', async () => {
  for (const config of [
    {}, {mediaType:EMPTY_CONFIG, size:2}, {mediaType:EMPTY_CONFIG, digest:imageDigest},
    {mediaType:'', digest:imageDigest, size:2}, {mediaType:42, digest:imageDigest, size:2},
    {mediaType:EMPTY_CONFIG, digest:'not-a-digest', size:2},
    ...[0, -1, 1.5, '2', 65537].map(size => ({mediaType:EMPTY_CONFIG, digest:imageDigest, size})),
  ]) {
    const f = fixture();
    replaceManifest(f, 0, manifest => {manifest.config = config;});
    await assert.rejects(f.run(), /invalid or oversized OCI descriptor/);
    assert.ok(!f.calls.some(call => new URL(call.url).pathname === f.path + '/blobs/' + imageDigest));
  }
  const unsupported = fixture();
  replaceManifest(unsupported, 0, manifest => {manifest.config.mediaType = 'application/json';});
  await assert.rejects(unsupported.run(), /Unsupported Sigstore config media type/);
});

test('config transport, size and digest failures are never accepted as a complete inventory', async () => {
  for (const failure of ['missing', 'network', 'length', 'digest', 'header', 'declared-size', 'stream-size']) {
    const f = fixture();
    f.overrides.set(f.configPaths[0], () => {
      if (failure === 'missing') return response('', 'text/plain', 404);
      if (failure === 'network') throw new Error('SECRET CONFIG REQUEST');
      if (failure === 'length') return response('{', EMPTY_CONFIG);
      if (failure === 'digest') return response('[]', EMPTY_CONFIG);
      if (failure === 'header') return response('{}', EMPTY_CONFIG, 200, {'docker-content-digest':imageDigest});
      if (failure === 'declared-size') return response('{}', EMPTY_CONFIG, 200, {'content-length':'65537'});
      return response(Buffer.alloc(65537, 32), EMPTY_CONFIG);
    });
    await assert.rejects(f.run(), error => !error.message.includes('SECRET')
      && /failed|does not match|size limit/.test(error.message), failure);
  }
});

test('config bytes must parse as the advertised empty JSON object', async () => {
  for (const body of ['{', '[]', 'null', '{"hidden":"content"}']) {
    const f = fixture();
    const raw = Buffer.from(body);
    replaceManifest(f, 0, manifest => {
      manifest.config = {mediaType:EMPTY_CONFIG, digest:digest(raw), size:raw.length};
    });
    f.contents.set(f.path + '/blobs/' + digest(raw), {body:raw, type:EMPTY_CONFIG});
    await assert.rejects(f.run(), /malformed JSON|must contain an empty JSON object/);
  }
});

test('cached config content still checks every descriptor size', async () => {
  const f = fixture();
  replaceManifest(f, 0, manifest => {manifest.config.size = 3;});
  await assert.rejects(f.run(), /Shared config descriptors disagree|does not match its OCI size and digest/);
});

test('non-Sigstore referrers are explicitly manifest-only without fetching unrelated config or layer data', async () => {
  const f = fixture();
  const unrelatedConfigDigest = 'sha256:' + 'b'.repeat(64);
  const unrelatedLayerDigest = 'sha256:' + 'c'.repeat(64);
  replaceManifest(f, 0, manifest => {
    manifest.artifactType = 'application/example';
    manifest.config = {mediaType:'application/example.config', digest:unrelatedConfigDigest, size:5000000};
    manifest.layers = [{mediaType:'application/example.content', digest:unrelatedLayerDigest, size:50000000}];
  });
  f.descriptors[0].artifactType = 'application/example';
  const result = await f.run();
  assert.equal(result.bundles.length, 2);
  assert.deepEqual(result.inventory.artifacts.find(artifact => artifact.kind === 'non-sigstore'), {
    manifestDigest:f.descriptors[0].digest, kind:'non-sigstore', check:'manifest-only',
  });
  assert.match(result.inventory.check, /Sigstore configs, bundle layers/);
  for (const unrelatedDigest of [unrelatedConfigDigest, unrelatedLayerDigest]) {
    assert.ok(!f.calls.some(call => new URL(call.url).pathname === f.path + '/blobs/' + unrelatedDigest));
  }
});

test('unsupported bundle media, subject, layer count and malformed wrapper fail closed', async () => {
  for (const mutate of [
    manifest => { manifest.artifactType = 'application/vnd.dev.sigstore.bundle.v9+json'; },
    manifest => { manifest.subject.digest = 'sha256:' + 'b'.repeat(64); },
    manifest => { manifest.layers.push(manifest.layers[0]); },
  ]) {
    const f = fixture();
    replaceManifest(f, 0, mutate);
    await assert.rejects(f.run(), /artifact types disagree|Unsupported Sigstore referrer/);
  }
  const malformed = fixture();
  const bad = {...malformed.bundles[0], verificationMaterial:{}};
  const raw = bytes(bad);
  replaceManifest(malformed, 0, manifest => {
    manifest.layers[0].digest = digest(raw);
    manifest.layers[0].size = raw.length;
  });
  malformed.contents.set(malformed.path + '/blobs/' + digest(raw), {body:raw, type:BUNDLE});
  await assert.rejects(malformed.run(), /verification material/);
});

test('GHCR authenticates only its fixed pull endpoints and strips credentials on blob redirects', async () => {
  const f = fixture({mode:'github'});
  const value = f.contents.get(f.layerPaths[0]);
  f.overrides.set(f.layerPaths[0], () => response('', 'text/plain', 307,
    {location:'https://pkg-containers.githubusercontent.com/storage/blob?signature=TEST'}));
  f.overrides.set('/storage/blob?signature=TEST', () => response(value.body, BUNDLE));
  assert.equal((await f.run()).bundles.length, 3);
  const tokenRequest = f.calls[0];
  assert.equal(new URL(tokenRequest.url).searchParams.get('scope'), 'repository:example/quotes-run-fixture:pull');
  assert.ok(tokenRequest.options.headers.Authorization.startsWith('Basic '));
  const storage = f.calls.find(call => new URL(call.url).hostname === 'pkg-containers.githubusercontent.com');
  assert.equal(storage.options.headers.Authorization, undefined);
  assert.ok(f.calls.slice(1).filter(call => new URL(call.url).hostname === 'ghcr.io')
    .every(call => call.options.headers.Authorization === 'Bearer TEST-PULL-TOKEN'));
});

test('config blobs use the same GHCR redirect protections without forwarding credentials', async () => {
  const f = fixture({mode:'github'});
  f.overrides.set(f.configPaths[0], () => response('', 'text/plain', 307,
    {location:'https://pkg-containers.githubusercontent.com/storage/config'}));
  f.overrides.set('/storage/config', () => response('{}', 'application/octet-stream'));
  assert.equal((await f.run()).bundles.length, 3);
  const storage = f.calls.find(call => new URL(call.url).hostname === 'pkg-containers.githubusercontent.com');
  assert.equal(storage.options.headers.Authorization, undefined);
  const local = fixture();
  local.overrides.set(local.configPaths[0], () => response('', 'text/plain', 302, {location:local.origin + '/anything'}));
  await assert.rejects(local.run(), /Unexpected or excessive registry redirect/);
});

test('redirects never send credentials to arbitrary hosts or loopback and remain bounded', async () => {
  for (const destination of ['http://pkg-containers.githubusercontent.com/x', 'https://127.0.0.1/x', 'https://attacker.invalid/x', 'https://user:pass@ghcr.io/x']) {
    const f = fixture({mode:'github'});
    f.overrides.set(f.layerPaths[0], () => response('', 'text/plain', 302, {location:destination}));
    await assert.rejects(f.run(), /outside the permitted HTTPS/);
    assert.ok(!f.calls.some(call => call.url === destination));
  }
  const local = fixture();
  local.overrides.set(local.layerPaths[0], () => response('', 'text/plain', 302, {location:local.origin + '/anything'}));
  await assert.rejects(local.run(), /Unexpected or excessive registry redirect/);
  const loop = fixture({mode:'github'});
  loop.overrides.set(loop.layerPaths[0], () => response('', 'text/plain', 302, {location:'https://pkg-containers.githubusercontent.com/loop'}));
  loop.overrides.set('/loop', () => response('', 'text/plain', 302, {location:'https://pkg-containers.githubusercontent.com/loop'}));
  await assert.rejects(loop.run(), /Unexpected or excessive registry redirect/);
});

test('invalid local or hosted image locations fail before any request', async () => {
  for (const [mode, image] of [
    ['local', '8.8.8.8:5000/quotes@' + imageDigest], ['local', 'localhost:5000/quotes@' + imageDigest],
    ['local', '172.32.0.1:5000/quotes@' + imageDigest], ['local', '172.18.00.1:5000/quotes@' + imageDigest],
    ['local', '172.18.0.1:99999/quotes@' + imageDigest], ['github', 'attacker.invalid/example/app@' + imageDigest],
    ['github', 'ghcr.io/example/../app@' + imageDigest], ['other', 'ghcr.io/example/app@' + imageDigest],
  ]) {
    let called = false;
    await assert.rejects(downloadBundleInventory({mode, image, request:() => {called = true;}}));
    assert.equal(called, false);
  }
});
