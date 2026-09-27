import test from 'node:test';
import assert from 'node:assert/strict';
import {checkInventoryConsistency} from '../../scripts/check-inventory-consistency.mjs';

const image = 'registry.example/quotes-node@sha256:' + 'a'.repeat(64);
const descriptor = (letter, extra = {}) => ({mediaType:'application/vnd.oci.image.manifest.v1+json',
  digest:'sha256:' + letter.repeat(64), size:600, artifactType:'application/vnd.dev.sigstore.bundle.v0.3+json', ...extra});
const snapshot = () => ({image, source:'referrers-api', descriptors:[descriptor('b'), descriptor('c')]});

test('equal descriptor contents ignore listing order, object key order and retrieval metadata', () => {
  const before = snapshot();
  before.descriptors[0].annotations = {first:'one', second:'two'};
  const after = structuredClone(before);
  after.descriptors[0] = Object.fromEntries(Object.entries(after.descriptors[0]).reverse());
  after.descriptors[0].annotations = {second:'two', first:'one'};
  after.descriptors.reverse();
  after.source = 'referrers-tag';
  after.check = 'the transport used for retrieval is not evidence content';
  assert.deepEqual(checkInventoryConsistency(before, after, image), {
    scenario:'F13', image, referrers:2, check:'unchanged-referrer-descriptors',
  });
});

for (const [label, change] of [
  ['added descriptor', value => value.descriptors.push(descriptor('d'))],
  ['removed descriptor', value => value.descriptors.pop()],
  ['replaced manifest digest', value => {value.descriptors[0].digest = 'sha256:' + 'd'.repeat(64);}],
  ['changed size', value => {value.descriptors[0].size++;}],
  ['changed media type', value => {value.descriptors[0].mediaType = 'application/changed';}],
  ['changed artifact type', value => {value.descriptors[0].artifactType = 'application/changed';}],
  ['changed annotation', value => {value.descriptors[0].annotations = {revision:'changed'};}],
]) {
  test(`refuses ${label}`, () => {
    const before = snapshot();
    const after = structuredClone(before);
    change(after);
    assert.throws(() => checkInventoryConsistency(before, after, image), /inventory changed/);
  });
}

test('missing, malformed, duplicate or unrelated snapshots fail on either side', () => {
  const invalid = [null, {}, {image}, {image,descriptors:[]}, {image,descriptors:{}},
    {...snapshot(),image:image.replace('quotes-node', 'other-image')},
    {...snapshot(),image:image.slice(0,-1) + 'b'},
    {image,descriptors:[descriptor('b'),descriptor('b')]},
    {image,descriptors:[null]}, {image,descriptors:[{}]},
    ...[0, -1, 1.5, '600', 4194305].map(size => ({image,descriptors:[descriptor('b',{size})]})),
    {image,descriptors:[descriptor('b',{digest:'bad'})]},
    {image,descriptors:[descriptor('b',{mediaType:''})]},
    {image,descriptors:Array.from({length:51}, (_, i) => descriptor('b',{digest:'sha256:' + i.toString(16).padStart(64,'0')}))},
  ];
  for (const value of invalid) {
    assert.throws(() => checkInventoryConsistency(value, snapshot(), image), /snapshot/);
    assert.throws(() => checkInventoryConsistency(snapshot(), value, image), /snapshot/);
  }
  assert.throws(() => checkInventoryConsistency(snapshot(), snapshot(), 'registry.example/quotes-node:latest'), /digest/);
});
