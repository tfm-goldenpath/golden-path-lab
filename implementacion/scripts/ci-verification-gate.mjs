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
  if (result.error || result.status !== 0) {
    const error = new Error('Cryptographic verification failed for ' + type);
    error.verificationFailure = {predicate:type, exitStatus:result.status,
      kind:result.error || result.signal || result.status !== 1 ? 'VERIFIER_ERROR' : 'VERIFIER_REJECTION'};
    throw error;
  }
  if (hostedProvenance) {
    const output = JSON.parse(readFileSync(prefix + '.verify.json', 'utf8'));
    const contract = validateGithubVerificationResults(output, {image:image.split('@')[0], digest, repository, commit, identity, ref});
    save(prefix + '.provenance-contract.json', contract);
    return output;
  }
  return statementFromVerifiedBundle(readFileSync(file, 'utf8'), digest, type, repository, commit, prefix + '.schema.json');
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
    let provenanceFailure;
    const seen = new Set();
    for (let i = 0; i < statements.length; i++) {
      const type = statements[i].predicateType;
      if (![IMAGE_SIGNATURE_TYPE, SBOM, PROVENANCE, RESULTS_TYPE].includes(type)) throw new Error('Unexpected evidence predicate');
      if (seen.has(type)) throw new Error('Duplicate evidence predicate');
      seen.add(type);
      const bundlePrefix = output + '-' + i;
      const file = bundlePrefix + '.bundle.json';
      save(file, snapshot.bundles[i]);
      let content;
      try { content = await authenticate(options, snapshot.bundles[i], type, file, bundlePrefix); }
      catch (error) {
        // Local content errors are emitted only after exact bundle authentication.
        // Continue checking every unrelated artifact before attributing F10.
        if (mode !== 'local' || type !== PROVENANCE || JSON.stringify(error.provenanceFailure?.violations) !== JSON.stringify(['PROVENANCE_REPOSITORY'])) throw error;
        provenanceFailure = error.provenanceFailure;
        continue;
      }
      save(bundlePrefix + '.statement.json', content);
      authenticated.set(type, content);
    }
    if (phase === 'authorized' && !authenticated.has(RESULTS_TYPE)) throw new Error('Missing required results');
    if (phase === 'before-results' && authenticated.has(RESULTS_TYPE)) throw new Error('Results already exist before authorization');
    const missingTypes = [IMAGE_SIGNATURE_TYPE, SBOM, PROVENANCE].filter(type => !authenticated.has(type) && !(type === PROVENANCE && provenanceFailure));
    if (missingTypes.length > 1 || (missingTypes.length && provenanceFailure)) throw new Error('Multiple mandatory predicates missing or invalid');
    const statuses = new Map([[IMAGE_SIGNATURE_TYPE,'MISSING_IMAGE_SIGNATURE'],[SBOM,'MISSING_SBOM'],[PROVENANCE,'MISSING_PROVENANCE']]);
    const result = {image, digest, phase, status:provenanceFailure ? 'PROVENANCE_REPOSITORY_UNAUTHORIZED' : missingTypes.length ? statuses.get(missingTypes[0]) : 'VERIFIED',
      predicate:provenanceFailure ? PROVENANCE : missingTypes[0], inventoryComplete:true, authenticatedPredicates:[...authenticated.keys()],
      ...(provenanceFailure ? {provenanceFailure, provenanceAuthenticated:true} : {})};
    save(output + '.result.json', result);
    if (result.status === 'VERIFIED') {
      for (const [type, name] of [[IMAGE_SIGNATURE_TYPE, 'signature'], [SBOM, 'sbom'], [PROVENANCE, 'provenance']]) {
        save(join(directory, 'verified-' + name + '.json'), authenticated.get(type));
      }
    }
    return result;
  } catch (error) {
    if (error.subjectMismatch) save(output + '.subject-mismatch.json', error.subjectMismatch);
    save(output + '.result.json', {image, phase, status:'INTEGRATION_FAILURE', reason:error.message, ...(error.subjectMismatch ? {subjectMismatch:error.subjectMismatch} : {}), ...(error.verificationFailure ? {verificationFailure:error.verificationFailure} : {})});
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
