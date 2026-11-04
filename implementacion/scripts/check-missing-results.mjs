import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {RESULTS_TYPE, validateSbom} from './lab-contracts.mjs';
import {parseEnvelopes} from '../../src/bundle-envelope.mjs';
export {parseEnvelopes};
const SBOM_TYPE='https://cyclonedx.org/bom';
export function checkMissingResults(text, digest) {
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error('The expected sha256 digest is required');
  const statements = parseEnvelopes(text);
  if (statements.some(statement => statement.predicateType === RESULTS_TYPE
    && statement.subject.some(subject => subject.digest.sha256 === digest.slice(7)))) {
    throw new Error('F13 is not ready: a results attestation already exists');
  }
  const sboms = statements.filter(statement => statement.predicateType === SBOM_TYPE
    && statement.subject.some(subject => subject.digest.sha256 === digest.slice('sha256:'.length)));
  if (!sboms.length) throw new Error('F13 is not isolated: the SBOM attestation for the expected digest is missing');
  // This is an inventory check. Cosign verifies the SBOM signature beforehand;
  // presence of signature bytes here is not a cryptographic verification.
  for (const sbom of sboms) validateSbom(sbom.predicate);
  return { scenario: 'F13', decision: 'DENY', reason: 'RESULTS_ATTESTATION_MISSING' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 4) throw new Error('Usage: check-missing-results.mjs INVENTORY_JSON DIGEST');
  console.log(JSON.stringify(checkMissingResults(fs.readFileSync(process.argv[2], 'utf8'), process.argv[3])));
}
