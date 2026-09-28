#!/usr/bin/env node
// Controlled F07 fixture operations. Inventory and hashes do not authenticate signatures.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {basename, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {downloadBundleInventory, bytesOf} from './download-bundle-inventory.mjs';
import {checkBundleProfile, IMAGE_SIGNATURE_TYPE} from './check-bundle-profile.mjs';
import {parseEnvelopes} from './check-missing-results.mjs';
import {checkInventoryConsistency} from './check-inventory-consistency.mjs';

const BUNDLE = 'application/vnd.dev.sigstore.bundle.v0.3+json';
const MANIFEST = 'application/vnd.oci.image.manifest.v1+json';
const hash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n', {flag:'wx'});

export function authorizeTarget(state, run, image) {
  if (state.mode !== 'local') throw new Error('Hosted F07 pending: precise GHCR referrer mutation/restoration has not been established with the existing authorization scope.');
  if (!/^run-[A-Za-z0-9]+$/.test(run) || state.registry !== 'tfm-zot-' + run.toLowerCase()
      || !/^sha256:[a-f0-9]{64}$/.test(state.digest || '')
      || image !== state.imageRepository + '@' + state.digest
      || !state.imageRepository.endsWith('/quotes-node-' + run.toLowerCase())
      || !/^(?:10\.\d+\.\d+\.\d+|127\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+):[1-9]\d{0,4}\//.test(state.imageRepository)) {
    throw new Error('Unauthorized F07 mutation target: expected the current run image and registry.');
  }
}

export function validateBackup(snapshot, image) {
  if (snapshot.inventory?.image !== image) throw new Error('Backup image differs from the authorized target.');
  const digest = image.split('@')[1];
  checkBundleProfile(JSON.stringify(snapshot.bundles), digest, 'authorized');
  checkInventoryConsistency(snapshot.inventory, snapshot.inventory, image);
  const candidates = [];
  if (!Array.isArray(snapshot.rawArtifacts)) throw new Error('Missing raw OCI backup.');
  const artifacts = snapshot.inventory.artifacts;
  if (!Array.isArray(artifacts)) throw new Error('Missing predicate-to-manifest mapping.');
  const rawDigests = new Set();
  const bundles = [];
  for (const raw of snapshot.rawArtifacts) {
    if (rawDigests.has(raw.manifestDigest)) throw new Error('Duplicate raw manifest.');
    rawDigests.add(raw.manifestDigest);
    const decode = value => {
      if (typeof value !== 'string' || !value || Buffer.from(value, 'base64').toString('base64') !== value) throw new Error('Malformed raw OCI backup.');
      return Buffer.from(value, 'base64');
    };
    const manifestBytes = decode(raw.manifest), configBytes = decode(raw.config), bundleBytes = decode(raw.bundle);
    const manifest = JSON.parse(manifestBytes);
    const entry = snapshot.inventory.descriptors.find(item => item.digest === raw.manifestDigest);
    const mapping = artifacts.filter(item => item.manifestDigest === raw.manifestDigest);
    const matches = (bytes, descriptor) => descriptor && descriptor.size === bytes.length && descriptor.digest === hash(bytes);
    if (!matches(manifestBytes, entry) || entry.digest === digest || entry.mediaType !== MANIFEST
        || manifest.schemaVersion !== 2 || manifest.mediaType !== MANIFEST || manifest.artifactType !== BUNDLE
        || (entry.artifactType && entry.artifactType !== BUNDLE)
        || manifest.config?.mediaType !== 'application/vnd.oci.empty.v1+json'
        || JSON.stringify(JSON.parse(configBytes)) !== '{}'
        || manifest.subject?.digest !== digest || manifest.layers?.length !== 1 || manifest.layers[0].mediaType !== BUNDLE
        || !matches(configBytes, manifest.config) || !matches(bundleBytes, manifest.layers[0])
        || mapping.length !== 1 || mapping[0].kind !== 'sigstore-bundle-v0.3'
        || mapping[0].bundleSize !== bundleBytes.length || mapping[0].configSize !== configBytes.length
        || mapping[0].bundleDigest !== hash(bundleBytes)
        || mapping[0].configDigest !== hash(configBytes) || mapping[0].subjectDigest !== digest) throw new Error('OCI backup digest, subject or mapping mismatch.');
    const bundle = JSON.parse(bundleBytes);
    const [statement] = parseEnvelopes(JSON.stringify(bundle), {bundlesOnly:true});
    if (statement.subject.some(subject => subject.digest.sha256 !== digest.slice(7))
        || statement.predicateType !== mapping[0].predicateType) throw new Error('OCI predicate or subject mismatch.');
    bundles.push(bundle);
    if (statement.predicateType === IMAGE_SIGNATURE_TYPE) candidates.push({raw, manifest, entry});
  }
  if (artifacts.filter(item => item.kind === 'sigstore-bundle-v0.3').length !== rawDigests.size
      || JSON.stringify(bundles) !== JSON.stringify(snapshot.bundles)) throw new Error('Incomplete OCI backup.');
  if (candidates.length !== 1) throw new Error('F07 requires one unambiguous image-signature artifact.');
  return candidates[0];
}

export function checkAlteration(before, current, image, restored = false) {
  const selected = validateBackup(before, image);
  const expected = structuredClone(before.inventory);
  if (!restored) expected.descriptors = expected.descriptors.filter(item => item.digest !== selected.entry.digest);
  checkInventoryConsistency(expected, current.inventory, image);
  // Reconstruct the required normal profile only for structural comparison;
  // no altered inventory is used to authorize results or authenticate evidence.
  const complete = structuredClone(current);
  if (!restored) {
    complete.rawArtifacts.push(selected.raw);
    complete.inventory.descriptors.push(selected.entry);
    complete.inventory.artifacts.push(before.inventory.artifacts.find(item => item.manifestDigest === selected.entry.digest));
    complete.bundles.push(JSON.parse(Buffer.from(selected.raw.bundle, 'base64')));
  }
  validateBackup(complete, image);
  const statements = parseEnvelopes(JSON.stringify(current.bundles), {bundlesOnly:true});
  if (!restored && statements.some(item => item.predicateType === IMAGE_SIGNATURE_TYPE)) throw new Error('Independent image signature remains during F07.');
  const bundles = restored ? current.bundles : [...current.bundles, JSON.parse(Buffer.from(selected.raw.bundle, 'base64'))];
  checkBundleProfile(JSON.stringify(bundles), image.split('@')[1], 'authorized');
  for (const artifact of current.rawArtifacts) {
    const original = before.rawArtifacts.find(item => item.manifestDigest === artifact.manifestDigest);
    if (JSON.stringify(original) !== JSON.stringify(artifact)) throw new Error('Evidence bytes changed during F07.');
  }
  return {scenario:'F07', image, signatureManifest:selected.entry.digest, check:restored ? 'original-evidence-restored' : 'only-independent-image-signature-absent'};
}

export async function mutateSignature({state, run, image, backup, restore = false, request = fetch}) {
  authorizeTarget(state, run, image);
  const selected = validateBackup(backup, image);
  const origin = 'http://' + state.imageRepository.split('/')[0];
  const base = origin + '/v2/' + state.imageRepository.split('/').slice(1).join('/');
  const send = async (url, options) => {
    let response;
    try { response = await request(url, {...options, redirect:'manual', signal:AbortSignal.timeout(30_000)}); }
    catch { throw new Error('F07 registry mutation/restore transport failed.'); }
    return response;
  };
  if (restore) {
    // Never delete blobs. Check retained config/layer bytes before restoring the
    // exact original manifest; missing blobs make recovery fail explicitly.
    for (const [entry, encoded] of [[selected.manifest.config, selected.raw.config], [selected.manifest.layers[0], selected.raw.bundle]]) {
      const response = await send(base + '/blobs/' + entry.digest, {});
      if (!response.ok) throw new Error(`F07 restoration blob unavailable (HTTP ${response.status}).`);
      const bytes = await bytesOf(response, entry.size);
      if (bytes.length !== entry.size || hash(bytes) !== entry.digest || !bytes.equals(Buffer.from(encoded, 'base64'))) throw new Error('F07 restoration blob digest mismatch.');
    }
  } else {
    const current = await downloadBundleInventory({mode:state.mode, image, request});
    checkAlteration(backup, current, image, true);
  }
  const response = await send(base + '/manifests/' + selected.entry.digest, restore ? {
    method:'PUT', headers:{'Content-Type':selected.entry.mediaType}, body:Buffer.from(selected.raw.manifest, 'base64'),
  } : {method:'DELETE'});
  if (response.status !== (restore ? 201 : 202)) throw new Error(`F07 ${restore ? 'restoration' : 'removal'} failed (HTTP ${response.status}).`);
  if (restore && response.headers.get('docker-content-digest') !== selected.entry.digest) throw new Error('F07 restored manifest digest header mismatch.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [, , command, stateDir, image, phase] = process.argv;
    const state = read(join(stateDir, 'state.json'));
    const directory = join(stateDir, 'F07');
    authorizeTarget(state, basename(stateDir), image);
    if (command === 'snapshot') {
      if (!['before', 'negative', 'after-denial', 'restored'].includes(phase)) throw new Error('Invalid F07 snapshot phase.');
      const snapshot = await downloadBundleInventory({mode:state.mode, image});
      if (phase === 'before') {
        validateBackup(snapshot, image);
        for (const artifact of snapshot.rawArtifacts) {
          save(join(directory, artifact.manifestDigest.slice(7) + '.bundle.json'), JSON.parse(Buffer.from(artifact.bundle, 'base64')));
        }
      }
      save(join(directory, phase + '.json'), snapshot);
      if (phase !== 'before') {
        const result = checkAlteration(read(join(directory, 'before.json')), snapshot, image, phase === 'restored');
        if (phase === 'after-denial') checkInventoryConsistency(read(join(directory, 'negative.json')).inventory, snapshot.inventory, image);
        save(join(directory, phase + '-check.json'), result);
      }
    } else if (['remove', 'restore'].includes(command)) {
      await mutateSignature({state, run:basename(stateDir), image, backup:read(join(directory, 'before.json')), restore:command === 'restore'});
    } else throw new Error('Unknown F07 evidence operation.');
  } catch (error) {
    console.error('F07 evidence failed: ' + error.message);
    process.exitCode = 1;
  }
}
