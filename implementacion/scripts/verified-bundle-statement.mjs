import {createHash} from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseEnvelopes } from './check-missing-results.mjs';
import {validateSchema} from './validate-sbom-schema.mjs';
import { validateStatementPredicate } from './lab-contracts.mjs';

// Content validation only: the caller must first authenticate this exact saved
// bundle with verify-blob-attestation, including subject, predicate and trust.
// No registry verifier output can replace the payload examined here.
export function statementFromVerifiedBundle(text, digest, type, repository, commit, schemaReport) {
  if (typeof digest !== 'string' || digest.length !== 71 || !/^sha256:[a-f0-9]{64}$/.test(digest)) {
    throw new Error('Expected a canonical SHA-256 digest');
  }
  const bundle = JSON.parse(text);
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    throw new Error('Expected one authenticated saved bundle');
  }
  const [statement] = parseEnvelopes(text, { bundlesOnly: true });
  // This is already the authenticated statement, not another envelope. An extra
  // field named payload must never select a different nested statement.
  if (statement.predicateType !== type
    || !statement.subject.some(subject => subject.digest.sha256 === digest.slice(7))) {
    throw new Error('Authenticated statement does not have the required digest and type');
  }
  if (type === 'https://cyclonedx.org/bom') validateSchema(statement.predicate, schemaReport, undefined, undefined, {authenticatedBundleSha256:createHash('sha256').update(text).digest('hex'),documentRepresentation:'JSON.stringify(authenticated statement predicate)'});
  validateStatementPredicate(statement.predicate, type, repository, commit);
  return statement;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 7) throw new Error('Usage: verified-bundle-statement.mjs BUNDLE DIGEST TYPE REPOSITORY COMMIT');
    const [, , file, digest, type, repository, commit] = process.argv;
    const statement = statementFromVerifiedBundle(readFileSync(file, 'utf8'), digest, type, repository, commit, file + '.schema.json');
    console.log(JSON.stringify(statement, null, 2));
  } catch (error) {
    console.error('Authenticated bundle content failed: ' + error.message);
    process.exitCode = 1;
  }
}
