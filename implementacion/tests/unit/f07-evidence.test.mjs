import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../helpers/registry-fixture.mjs';
import {authorizeTarget, validateBackup, checkAlteration, mutateSignature} from '../../scripts/f07-signature-evidence.mjs';
const types = ['https://sigstore.dev/cosign/sign/v1', 'https://cyclonedx.org/bom', 'https://slsa.dev/provenance/v1',
  'https://tfm-goldenpath.dev/attestations/verification-results/v1'];
const setup = () => fixture({types});
const stateFor = f => ({mode:'local', registry:'tfm-zot-run-fixture', imageRepository:f.image.split('@')[0], digest:f.image.split('@')[1]});
// Tests below use labelled synthetic OCI bytes, not successful delivery evidence.
const authorized = stateFor;

test('unique predicate and subject identify exact raw OCI material independent of list position', async () => {
  const f = setup(); const before = await f.run();
  const selected = validateBackup(before, f.image);
  assert.equal(selected.entry.digest, f.descriptors[0].digest);
  f.descriptors.splice(0, 1);
  const altered = await f.run();
  assert.equal(checkAlteration(before, altered, f.image).check, 'only-independent-image-signature-absent');
  f.descriptors.push(selected.entry);
  assert.equal(checkAlteration(before, await f.run(), f.image, true).check, 'original-evidence-restored');
});

test('ambiguous signatures, wrong subjects, missing requirements and damaged backup fail closed', async () => {
  const before = await setup().run();
  for (const change of [
    b => { b.rawArtifacts[0].manifest = Buffer.from('{}').toString('base64'); },
    b => { b.rawArtifacts[0].config = Buffer.from('bad').toString('base64'); },
    b => { b.rawArtifacts[0].bundle = Buffer.from('bad').toString('base64'); },
    b => { b.inventory.artifacts[0].subjectDigest = 'sha256:' + 'b'.repeat(64); },
    b => { b.inventory.artifacts[0].predicateType = 'wrong'; },
    b => { b.rawArtifacts.pop(); },
    b => { b.bundles.pop(); },
  ]) {
    const bad = structuredClone(before); change(bad);
    assert.throws(() => validateBackup(bad, before.inventory.image));
  }
  const f = fixture({types:[...types, types[0]]});
  await assert.rejects(async () => validateBackup(await f.run(), f.image), /unambiguous/);
  const noSignature = fixture({types:types.slice(1)});
  await assert.rejects(async () => validateBackup(await noSignature.run(), noSignature.image), /Missing bundle predicate/);
});

test('run ownership, image digest and hosted boundary are checked before any mutation', async () => {
  const f = setup(), state = authorized(f);
  const image = state.imageRepository + '@' + state.digest;
  authorizeTarget(state, 'run-fixture', image);
  for (const bad of [{...state,mode:'github'}, {...state,registry:'other'}, {...state,digest:'wrong'}, {...state,imageRepository:'127.0.0.1:5000/other'}]) {
    let called = false;
    await assert.rejects(mutateSignature({state:bad, run:'run-fixture', image, backup:{}, request:() => {called = true;}}));
    assert.equal(called, false);
  }
  assert.throws(() => authorizeTarget(state, 'run-other', image), /Unauthorized/);
  assert.throws(() => authorizeTarget(state, 'run-fixture', image.replace(/a$/, 'b')), /Unauthorized/);
});

test('missing non-targets, signature still present and changed descriptors fail alteration checks', async () => {
  const f = setup(), before = await f.run();
  assert.throws(() => checkAlteration(before, before, f.image));
  f.descriptors.splice(0, 2);
  const after = await f.run();
  assert.throws(() => checkAlteration(before, after, f.image));
});

test('mutation deletes only the selected manifest; restoration PUT uses original bytes and never deletes blobs', async () => {
  const f = setup(), backup = await f.run(), selected = validateBackup(backup, f.image);
  const mutations = [];
  const request = async (url, options = {}) => {
    if (['DELETE', 'PUT'].includes(options.method)) {
      mutations.push({url, ...options});
      if (options.method === 'DELETE') f.descriptors.splice(f.descriptors.findIndex(d => d.digest === selected.entry.digest), 1);
      else f.descriptors.push(selected.entry);
      return new Response(null, {status:options.method === 'PUT' ? 201 : 202, headers:{'docker-content-digest':selected.entry.digest}});
    }
    return f.request(url, options);
  };
  const args = {state:stateFor(f), run:'run-fixture', image:f.image, backup, request};
  await mutateSignature(args);
  checkAlteration(backup, await f.run(), f.image);
  await mutateSignature({...args, restore:true});
  checkAlteration(backup, await f.run(), f.image, true);
  assert.deepEqual(mutations.map(m => m.method), ['DELETE', 'PUT']);
  assert.ok(mutations.every(m => m.url.endsWith('/manifests/' + selected.entry.digest)));
  assert.deepEqual(mutations[1].body, Buffer.from(selected.raw.manifest, 'base64'));
});

for (const failure of ['transport', 'denied', 'lost-blob', 'wrong-blob', 'wrong-manifest-header', 'inventory-change']) {
  test(`mutation/restoration fails for ${failure}`, async () => {
    const f = setup(), backup = await f.run();
    const restore = !['inventory-change', 'transport', 'denied'].includes(failure);
    if (failure === 'inventory-change') f.descriptors.pop();
    const request = async (url, options = {}) => {
      if (failure === 'lost-blob' && url.includes('/blobs/')) return new Response(null, {status:404});
      if (failure === 'wrong-blob' && url.includes('/blobs/')) return new Response('wrong');
      if (['DELETE', 'PUT'].includes(options.method)) {
        if (failure === 'transport') throw new Error('synthetic network loss');
        return new Response(null, {status:failure === 'denied' ? 403 : 201, headers:{'docker-content-digest':'wrong'}});
      }
      return f.request(url, options);
    };
    await assert.rejects(mutateSignature({state:stateFor(f),run:'run-fixture',image:f.image,backup,restore,request}));
  });
}

test('malformed evidence and changing inventory contents cannot establish isolated absence', async () => {
  const f = setup(), before = await f.run();
  f.descriptors.splice(0, 1);
  const current = await f.run();
  for (const mutate of [
    value => { value.bundles[0].dsseEnvelope.payload = 'malformed'; },
    value => { value.rawArtifacts[0].bundle = 'unreadable'; },
    value => { value.inventory.descriptors[0].size++; },
    value => { value.inventory.artifacts[0].subjectDigest = 'sha256:' + 'b'.repeat(64); },
    value => { value.rawArtifacts.pop(); },
    value => { value.bundles.pop(); },
  ]) {
    const bad = structuredClone(current); mutate(bad);
    assert.throws(() => checkAlteration(before,bad,f.image));
  }
});

for (const restore of [false, true]) {
  test(`direct ${restore ? 'restoration' : 'removal'} rejects nested run-name suffixes before registry access`, async () => {
    for (const repo of ['other/quotes-node-run-fixture', 'quotes-node-run-fixture/quotes-node-run-fixture', 'other/nested/quotes-node-run-fixture']) {
      const f = fixture({types, repo}), backup = await f.run();
      const state = stateFor(f);
      let requests = 0;
      await assert.rejects(mutateSignature({state, run:'run-fixture', image:f.image, backup, restore,
        request:async () => { requests++; throw new Error('Unexpected registry access'); },
      }), /Unauthorized F07 mutation target/);
      assert.equal(requests, 0, 'both DELETE and PUT must reject the target before registry access');
    }
  });
}

test('pre-results mutation requires the exact distinct replacement and parent ownership', async () => {
  const parentFixture = setup();
  const parent = {...stateFor(parentFixture), cluster:'tfm-demo-run-fixture', sourceRepository:'repo', sourceCommit:'commit', sourceSnapshot:'snapshot'};
  const f = fixture({repo:'quotes-node-run-fixture', imageDigest:'sha256:'+'b'.repeat(64), types:types.slice(0,3)});
  const state = {...parent, imageRepository:f.image.split('@')[0], digest:f.image.split('@')[1]};
  const backup = await f.run();
  assert.throws(() => validateBackup(backup, f.image), /Missing bundle predicate/);
  const selected = validateBackup(backup, f.image, 'before-results');
  const mutations = [];
  const request = async (url, options = {}) => {
    if (['DELETE','PUT'].includes(options.method)) {
      mutations.push({url, ...options});
      if (options.method === 'DELETE') f.descriptors.splice(f.descriptors.findIndex(d => d.digest === selected.entry.digest), 1);
      else f.descriptors.push(selected.entry);
      return new Response(null, {status:options.method === 'DELETE' ? 202 : 201, headers:{'docker-content-digest':selected.entry.digest}});
    }
    return f.request(url, options);
  };
  const args = {state, parent, purpose:'ci-replacement', run:'run-fixture', image:f.image, backup, request};
  for (const bad of [{mode:'github'}, {digest:parent.digest}, {registry:'other'}, {sourceCommit:'other'}, {sourceSnapshot:'other'}, {cluster:'other'}, {imageRepository:state.imageRepository+'/nested'}, {imageRepository:parent.imageRepository+'-update'}]) {
    await assert.rejects(mutateSignature({...args, state:{...state,...bad}}));
    assert.equal(mutations.length, 0);
  }
  await assert.rejects(mutateSignature({...args, purpose:'admission'}));
  await mutateSignature(args);
  checkAlteration(backup, await f.run(), f.image, false, 'before-results');
  await mutateSignature({...args,restore:true});
  checkAlteration(backup, await f.run(), f.image, true, 'before-results');
  assert.deepEqual(mutations.map(m=>m.method), ['DELETE','PUT']);
  assert.ok(mutations.every(m=>m.url.endsWith('/manifests/'+selected.entry.digest)));
  assert.deepEqual(mutations[1].body, Buffer.from(selected.raw.manifest,'base64'));
});
