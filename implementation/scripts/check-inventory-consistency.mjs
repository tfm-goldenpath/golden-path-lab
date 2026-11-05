#!/usr/bin/env node
// Compare strict retrieval sidecars across F13, not just predicate presence.
// Manifest digests bind config/layer descriptors already checked by retrieval.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {assertDigest} from './lab-contracts.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = value => JSON.stringify(value, function (_key, item) {
  return object(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item;
});

function descriptors(snapshot, image) {
  if (!object(snapshot) || snapshot.image !== image || !Array.isArray(snapshot.descriptors)
      || !snapshot.descriptors.length || snapshot.descriptors.length > 50) {
    throw new Error('Missing or invalid registry snapshot for the expected image.');
  }
  const entries = new Map();
  for (const entry of snapshot.descriptors) {
    if (!object(entry) || !/^sha256:[a-f0-9]{64}$/.test(entry.digest || '')
        || !Number.isSafeInteger(entry.size) || entry.size < 1 || entry.size > 4 * 1024 * 1024
        || typeof entry.mediaType !== 'string' || !entry.mediaType || entries.has(entry.digest)) {
      throw new Error('Registry snapshot has an invalid or duplicate referrer descriptor.');
    }
    entries.set(entry.digest, entry);
  }
  return [...entries.values()].sort((a, b) => a.digest.localeCompare(b.digest));
}

export function checkInventoryConsistency(before, after, image) {
  assertDigest(image);
  const original = descriptors(before, image);
  const current = descriptors(after, image);
  if (canonical(original) !== canonical(current)) throw new Error('F13 referrer inventory changed between preflight and denial.');
  return {scenario:'F13', image, referrers:original.length, check:'unchanged-referrer-descriptors'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 5) throw new Error('Usage: check-inventory-consistency.mjs BEFORE_INDEX AFTER_INDEX IMAGE');
    const [, , before, after, image] = process.argv;
    console.log(JSON.stringify(checkInventoryConsistency(
      JSON.parse(readFileSync(before, 'utf8')), JSON.parse(readFileSync(after, 'utf8')), image), null, 2));
  } catch (error) {
    console.error('Inventory consistency failed: ' + error.message);
    process.exitCode = 1;
  }
}
