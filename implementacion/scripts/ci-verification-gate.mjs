#!/usr/bin/env node
// Read-only delivery control. Every invocation retrieves and authenticates fresh
// registry bytes; saved issuance bundles and prior reports are never inputs.
import {readFileSync, writeFileSync, openSync, closeSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {downloadBundleInventory} from './download-bundle-inventory.mjs';
import {parseEnvelopes} from './check-missing-results.mjs';
import {IMAGE_SIGNATURE_TYPE} from './check-bundle-profile.mjs';
import {RESULTS_TYPE} from './lab-contracts.mjs';
import {statementFromVerifiedBundle} from './verified-bundle-statement.mjs';
import {validateGithubVerificationResults} from './github-attestation.mjs';
const SBOM = 'https://cyclonedx.org/bom', PROVENANCE = 'https://slsa.dev/provenance/v1';
const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

export function authenticateBundle({mode, image, directory, repository, commit, identity, ref}, bundle, type, file, prefix, run = spawnSync) {
  const digest = image.split('@')[1];
  const hostedProvenance = mode === 'github' && type === PROVENANCE;
  const args = hostedProvenance ? ['attestation', 'verify', 'oci://' + image,
    '--repo', repository.replace('https://github.com/', ''), '--cert-identity', identity,
    '--source-digest', commit, '--source-ref', ref, '--deny-self-hosted-runners',
    '--bundle', file, '--predicate-type', type, '--format', 'json'] : [
    'verify-blob-attestation', ...(mode === 'local' ? [
      '--key', join(directory, 'development-public-key.pem'),
      '--trusted-root', join(directory, 'local-trusted-root.json'), '--insecure-ignore-tlog',
    ] : ['--trusted-root', join(directory, 'sigstore-trusted-root.json'),
      '--certificate-identity', identity, '--certificate-oidc-issuer', 'https://token.actions.githubusercontent.com']),
    '--bundle', file, '--digest', digest.slice(7), '--digestAlg', 'sha256', '--type', type];
  const stdout = openSync(prefix + '.verify.json', 'wx'), stderr = openSync(prefix + '.verify.log', 'wx');
  let result;
  try { result = run(hostedProvenance ? 'gh' : 'cosign', args, {stdio:['ignore', stdout, stderr], timeout:120_000}); }
  finally { closeSync(stdout); closeSync(stderr); }
  if (result.error || result.status !== 0) throw new Error('Cryptographic verification failed for ' + type);
  if (hostedProvenance) {
    const output = JSON.parse(readFileSync(prefix + '.verify.json', 'utf8'));
    const contract = validateGithubVerificationResults(output, {image:image.split('@')[0], digest, repository, commit, identity, ref});
    save(prefix + '.provenance-contract.json', contract);
    return output;
  }
  return statementFromVerifiedBundle(JSON.stringify(bundle), digest, type, repository, commit);
}

export async function verifyDelivery(options, {download = downloadBundleInventory, authenticate = authenticateBundle} = {}) {
  const {mode, image, directory, prefix, phase = 'before-results'} = options;
  const output = join(directory, prefix);
  // A reused name is an error, never a cached success. Keep failed observations.
  writeFileSync(output + '.result.json', JSON.stringify({status:'INTEGRATION_FAILURE', image, reason:'verification incomplete'}) + '\n', {flag:'wx'});
  try {
    if (!['local', 'github'].includes(mode) || !['before-results', 'authorized'].includes(phase)
        || !/^[A-Za-z0-9-]+$/.test(prefix)) throw new Error('Invalid CI verification context');
    const snapshot = await download({mode, image, actor:process.env.GITHUB_ACTOR, token:process.env.GH_TOKEN});
    save(output + '.inventory.json', snapshot);
    if (snapshot.inventory.image !== image) throw new Error('Inventory target mismatch');
    const digest = image.split('@')[1];
    const statements = parseEnvelopes(JSON.stringify(snapshot.bundles), {bundlesOnly:true});
    if (statements.some(s => s.subject.some(subject => subject.digest.sha256 !== digest.slice(7)))) throw new Error('Inventory subject mismatch');
    const authenticated = new Map();
    for (let i = 0; i < statements.length; i++) {
      const type = statements[i].predicateType;
      if (![IMAGE_SIGNATURE_TYPE, SBOM, PROVENANCE, RESULTS_TYPE].includes(type)) throw new Error('Unexpected evidence predicate');
      const bundlePrefix = output + '-' + i;
      const file = bundlePrefix + '.bundle.json';
      save(file, snapshot.bundles[i]);
      const content = await authenticate(options, snapshot.bundles[i], type, file, bundlePrefix);
      save(bundlePrefix + '.statement.json', content);
      authenticated.set(type, content);
    }
    for (const type of [SBOM, PROVENANCE, ...(phase === 'authorized' ? [RESULTS_TYPE] : [])]) {
      if (!authenticated.has(type)) throw new Error('Missing required attestation: ' + type);
    }
    if (phase === 'before-results' && authenticated.has(RESULTS_TYPE)) throw new Error('Results already exist before authorization');
    const missing = !authenticated.has(IMAGE_SIGNATURE_TYPE);
    const result = {image, digest, phase, status:missing ? 'MISSING_IMAGE_SIGNATURE' : 'VERIFIED',
      predicate:IMAGE_SIGNATURE_TYPE, inventoryComplete:true, authenticatedPredicates:[...authenticated.keys()]};
    save(output + '.result.json', result);
    if (!missing) {
      for (const [type, name] of [[IMAGE_SIGNATURE_TYPE, 'signature'], [SBOM, 'sbom'], [PROVENANCE, 'provenance']]) {
        save(join(directory, 'verified-' + name + '.json'), authenticated.get(type));
      }
    }
    return result;
  } catch (error) {
    save(output + '.result.json', {image, phase, status:'INTEGRATION_FAILURE', reason:error.message});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [, , directory, prefix, phase] = process.argv;
    const state = JSON.parse(readFileSync(join(directory, 'state.json'), 'utf8'));
    const result = await verifyDelivery({directory, prefix, phase, mode:state.mode,
      image:state.imageRepository + '@' + state.digest, repository:state.sourceRepository,
      commit:state.sourceCommit, identity:state.identity, ref:process.env.GITHUB_REF});
    process.exitCode = result.status === 'VERIFIED' ? 0 : 42;
  } catch (error) { console.error('CI verification failed: ' + error.message); process.exitCode = 1; }
}
