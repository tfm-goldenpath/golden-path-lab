import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// This checks authorisation AFTER `gh attestation verify` has succeeded.
// A JSON file is not itself cryptographic evidence. Keep the CLI output and bundle.
// Contract: https://cli.github.com/manual/gh_attestation_verify
// Certificate extensions are flattened into the certificate JSON by sigstore-go:
// https://github.com/sigstore/sigstore-go/blob/v1.3.0/pkg/fulcio/certificate/summarize.go
// https://github.com/sigstore/sigstore-go/blob/v1.3.0/pkg/fulcio/certificate/extensions.go
const predicateType = 'https://slsa.dev/provenance/v1';
const issuer = 'https://token.actions.githubusercontent.com';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateGithubVerificationResults(results, expected) {
  requireCondition(object(expected), 'Expected authorisation is required.');
  const { image, digest, repository, commit, identity, ref } = expected;
  requireCondition(typeof image === 'string' && /^ghcr\.io\/[a-z0-9][a-z0-9._/-]*$/.test(image), 'Invalid GHCR image name.');
  requireCondition(typeof digest === 'string' && /^sha256:[a-f0-9]{64}$/.test(digest), 'Invalid image digest.');
  requireCondition(typeof commit === 'string' && /^[a-f0-9]{40}$/.test(commit), 'Invalid source commit.');
  requireCondition(typeof repository === 'string' && /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/.test(repository), 'Invalid source repository.');
  requireCondition(typeof ref === 'string' && /^refs\/(heads|tags)\/[^\s]+$/.test(ref), 'Invalid source ref.');
  requireCondition(typeof identity === 'string' && identity.startsWith(`${repository}/.github/workflows/`) && identity.endsWith(`@${ref}`), 'Workflow identity must belong to the expected repository and ref.');
  requireCondition(Array.isArray(results) && results.length > 0, 'No verified GitHub attestations.');

  const rejected = [];
  for (let index = 0; index < results.length; index += 1) {
    try {
      const verification = results[index]?.verificationResult;
      requireCondition(object(verification), 'Missing verificationResult.');
      const statement = verification.statement;
      requireCondition(object(statement) && statement._type === 'https://in-toto.io/Statement/v1', 'Expected an in-toto v1 statement.');
      requireCondition(statement.predicateType === predicateType, 'Unexpected predicate type.');
      requireCondition(object(statement.predicate), 'Missing provenance predicate.');
      requireCondition(Array.isArray(statement.subject) && statement.subject.some(subject =>
        subject?.name === image && subject?.digest?.sha256 === digest.slice('sha256:'.length)), 'Subject does not match the requested image and digest.');

      const certificate = verification.signature?.certificate;
      requireCondition(object(certificate), 'Missing verified certificate.');
      requireCondition(certificate.subjectAlternativeName === identity, 'Workflow identity mismatch.');
      requireCondition(certificate.issuer === issuer, 'OIDC issuer mismatch.');
      requireCondition(certificate.sourceRepositoryURI === repository, 'Source repository mismatch.');
      requireCondition(certificate.sourceRepositoryDigest === commit, 'Source commit mismatch.');
      requireCondition(certificate.sourceRepositoryRef === ref, 'Source ref mismatch.');
      requireCondition(certificate.runnerEnvironment === 'github-hosted', 'The laboratory requires a GitHub-hosted runner.');
      requireCondition(Array.isArray(verification.verifiedTimestamps) && verification.verifiedTimestamps.some(timestamp =>
        typeof timestamp?.timestamp === 'string' && Number.isFinite(Date.parse(timestamp.timestamp))), 'Missing verified signing timestamp.');

      return {
        authorised: true,
        matchedResult: index,
        image,
        digest,
        repository,
        commit,
        identity,
        ref,
        predicateType,
        prerequisite: 'successful-gh-attestation-verify',
      };
    } catch (error) {
      rejected.push(`result ${index}: ${error.message}`);
    }
  }
  throw new Error(`No verified attestation satisfies the authorisation policy (${rejected.join('; ')}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    requireCondition(args.length === 7, 'Usage: node scripts/github-attestation.mjs <verified.json> <image> <digest> <repository> <commit> <identity> <ref>');
    const [path, image, digest, repository, commit, identity, ref] = args;
    const results = JSON.parse(readFileSync(path, 'utf8'));
    const authorised = validateGithubVerificationResults(results, { image, digest, repository, commit, identity, ref });
    process.stdout.write(`${JSON.stringify(authorised, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`GitHub provenance authorisation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
