import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseEnvelopes } from './check-missing-results.mjs';
import { RESULTS_TYPE } from './lab-contracts.mjs';

export const IMAGE_SIGNATURE_TYPE = 'https://sigstore.dev/cosign/sign/v1';

// Representation/presence checks only. CLI and admission independently verify
// signatures and trust. Reject classic entries so fallback cannot prove migration.
export function checkBundleProfile(text, digest, phase) {
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error('Expected a canonical SHA-256 digest');
  if (!['before-results', 'authorized'].includes(phase)) throw new Error('Unknown inventory phase');
  const statements = parseEnvelopes(text, { bundlesOnly: true });
  if (statements.some(statement => statement.subject.some(subject => subject.digest.sha256 !== digest.slice(7)))) {
    throw new Error('Bundle inventory contains a subject for a different digest');
  }
  const predicates = [...new Set(statements.map(statement => statement.predicateType))].sort();
  const required = [IMAGE_SIGNATURE_TYPE, 'https://cyclonedx.org/bom', 'https://slsa.dev/provenance/v1'];
  if (phase === 'authorized') required.push(RESULTS_TYPE);
  else if (predicates.includes(RESULTS_TYPE)) throw new Error('Results already exist before authorization');
  for (const type of required) {
    if (!predicates.includes(type)) throw new Error('Missing bundle predicate: ' + type);
  }
  return { format: 'sigstore-bundle-v0.3', digest, phase, predicates,
    check: 'representation-and-presence-only; trust verified separately' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 5) throw new Error('Usage: check-bundle-profile.mjs INVENTORY DIGEST PHASE');
  console.log(JSON.stringify(checkBundleProfile(fs.readFileSync(process.argv[2], 'utf8'), process.argv[3], process.argv[4]), null, 2));
}
