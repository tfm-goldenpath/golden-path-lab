import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { RESULTS_TYPE, validateSbom } from './lab-contracts.mjs';

const SBOM_TYPE = 'https://cyclonedx.org/bom';
const STATEMENT_TYPES = new Set(['https://in-toto.io/Statement/v0.1', 'https://in-toto.io/Statement/v1']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function parseEnvelopes(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Empty attestation inventory');
  let envelopes;
  try {
    const value = JSON.parse(text);
    envelopes = Array.isArray(value) ? value : [value];
  } catch {
    try {
      envelopes = text.trim().split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
    } catch {
      throw new Error('Malformed attestation inventory: expected JSON or JSONL');
    }
  }
  if (!envelopes.length) throw new Error('The inventory contains no attestations');
  return envelopes.map(envelope => {
    if (!object(envelope) || envelope.payloadType !== 'application/vnd.in-toto+json'
      || typeof envelope.payload !== 'string' || !envelope.payload
      || !Array.isArray(envelope.signatures) || !envelope.signatures.length
      || envelope.signatures.some(signature => !object(signature) || typeof signature.sig !== 'string' || !signature.sig)) {
      throw new Error('Incomplete attestation envelope');
    }
    const decoded = Buffer.from(envelope.payload, 'base64');
    if (decoded.toString('base64') !== envelope.payload) throw new Error('Attestation payload is not valid base64');
    let statement;
    try { statement = JSON.parse(decoded.toString('utf8')); }
    catch { throw new Error('Attestation payload does not contain valid JSON'); }
    if (!object(statement) || !STATEMENT_TYPES.has(statement._type)
      || typeof statement.predicateType !== 'string' || !statement.predicateType
      || !object(statement.predicate) || !Array.isArray(statement.subject) || !statement.subject.length
      || statement.subject.some(subject => !object(subject) || !/^[a-f0-9]{64}$/.test(subject.digest?.sha256 || ''))) {
      throw new Error('Incomplete or unsupported in-toto statement');
    }
    return statement;
  });
}

export function checkMissingResults(text, digest) {
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error('The expected sha256 digest is required');
  const statements = parseEnvelopes(text);
  if (statements.some(statement => statement.predicateType === RESULTS_TYPE)) {
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
