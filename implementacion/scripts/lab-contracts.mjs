import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

import {validateSchema} from './validate-sbom-schema.mjs';

export const RESULTS_TYPE = 'https://tfm-goldenpath.dev/attestations/verification-results/v1';
export const CHECKS = ['unitTests', 'manifestPolicy', 'workflowPolicy', 'vulnerabilityPolicy', 'signature', 'sbom', 'provenance'];
export function assertDigest(image) {
  if (!/^[a-z0-9][a-z0-9._:/-]*@sha256:[a-f0-9]{64}$/.test(image)) throw new Error('An immutable image reference pinned by digest is required');
}
export function manifest(image, namespace = 'tfm-golden', secret = false) {
  assertDigest(image);
  if (!['tfm-golden', 'tfm-reference'].includes(namespace)) throw new Error('Namespace is outside the lab');
  return {
    apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: 'quotes-node', namespace },
    spec: { replicas: 1, selector: { matchLabels: { app: 'quotes-node' } }, template: {
      metadata: { labels: { app: 'quotes-node' } }, spec: {
        automountServiceAccountToken: false,
        securityContext: { seccompProfile: { type: 'RuntimeDefault' } },
        ...(secret ? { imagePullSecrets: [{ name: 'gp-ghcr' }] } : {}),
        containers: [{ name: 'quotes-node', image, imagePullPolicy: 'Always', ports: [{ containerPort: 3000 }],
          securityContext: { runAsUser: 10001, runAsGroup: 10001, runAsNonRoot: true, privileged: false,
            allowPrivilegeEscalation: false, readOnlyRootFilesystem: true, capabilities: { drop: ['ALL'] } },
          resources: { requests: { cpu: '50m', memory: '64Mi' }, limits: { cpu: '500m', memory: '192Mi' } },
          readinessProbe: { httpGet: { path: '/healthz', port: 3000 }, initialDelaySeconds: 2, periodSeconds: 2 },
          livenessProbe: { httpGet: { path: '/healthz', port: 3000 }, initialDelaySeconds: 10, periodSeconds: 10 }
        }]
      }
    } }
  };
}
export function validateSbom(bom) {
  validateSchema(bom);
  const component = value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && typeof value.name === 'string' && value.name.trim().length > 0
    && typeof value.type === 'string' && value.type.trim().length > 0;
  if (bom?.bomFormat !== 'CycloneDX' || !/^1\.[0-9]+$/.test(bom.specVersion) || !Number.isInteger(bom.version)
    || bom.version < 1 || !Array.isArray(bom.components) || bom.components.length === 0
    || !component(bom.metadata?.component) || !bom.components.every(component)) {
    throw new Error('Incomplete CycloneDX SBOM: format, version, component metadata and components are required');
  }
  return bom.specVersion;
}
// Trusted laboratory requirement shared by issuance and authenticated CI content.
export const RESULTS_POLICY_VERSION = 'golden-path-v1';
export function validateResults(value, repository, commit) {
  const violations = [];
  if (typeof value?.policyVersion !== 'string' || !value.policyVersion.trim()) violations.push('RESULTS_STRUCTURE');
  if (value?.policyVersion !== RESULTS_POLICY_VERSION) violations.push('RESULTS_POLICY_VERSION');
  if (value?.result !== 'PASS') violations.push('RESULTS_UNSUCCESSFUL');
  if (value?.source?.repository !== repository || value?.source?.commit !== commit
      || !/^https:\/\/[^\s]+$/.test(repository || '') || !/^[0-9a-f]{40}$/.test(commit || '')) violations.push('RESULTS_SOURCE');
  if (CHECKS.some(check => value?.checks?.[check] !== 'PASS')) violations.push('RESULTS_CHECKS');
  if (violations.length) {
    const error = new Error(violations.join(', ') + ': Results attestation does not satisfy the authorized contract');
    error.resultsFailure = {violations, expectedPolicy:RESULTS_POLICY_VERSION, actualPolicy:value?.policyVersion};
    throw error;
  }
  return value;
}
export function validateStatementPredicate(predicate, type, repository, commit) {
  if (type === RESULTS_TYPE) validateResults(predicate, repository, commit);
  else if (type === 'https://cyclonedx.org/bom') validateSbom(predicate);
  else if (type === 'https://sigstore.dev/cosign/sign/v1') {
    if (!predicate || typeof predicate !== 'object' || Array.isArray(predicate)) throw new Error('Invalid image-signature predicate');
  }
  else if (type === 'https://slsa.dev/provenance/v1') validateProvenance(predicate, {repository, commit, mode:'local'});
  else throw new Error('Unsupported predicate type');
}
// Content checks only. The caller must authenticate the exact statement first.
// Expected values come from run configuration, never from the predicate.
export function validateProvenance(predicate, {repository, commit, mode, identity}) {
  if (!['local','github'].includes(mode) || !/^https:\/\/[^\s]+$/.test(repository || '')
      || !/^[a-f0-9]{40}$/.test(commit || '') || (mode === 'github' && !identity?.startsWith(repository + '/.github/workflows/'))) {
    throw new Error('Invalid expected provenance authorization');
  }
  const fields = [
    ['PROVENANCE_REPOSITORY', predicate?.buildDefinition?.externalParameters?.workflow?.repository, repository],
    ['PROVENANCE_REVISION', predicate?.buildDefinition?.resolvedDependencies?.[0]?.digest?.gitCommit, commit],
    ['PROVENANCE_BUILD_TYPE', predicate?.buildDefinition?.buildType, mode === 'local' ? 'https://tfm-goldenpath.dev/buildtypes/local/v1' : 'https://actions.github.io/buildtypes/workflow/v1'],
    ['PROVENANCE_BUILDER', predicate?.runDetails?.builder?.id, mode === 'local' ? 'https://tfm-goldenpath.dev/builders/local-development' : identity],
  ];
  if (fields.some(([,actual]) => typeof actual !== 'string' || !actual.trim())) throw new Error('PROVENANCE_STRUCTURE: required string field missing');
  if (!/^https:\/\/[^\s]+$/.test(fields[0][1]) || !/^[a-f0-9]{40}$/.test(fields[1][1])) throw new Error('PROVENANCE_STRUCTURE: malformed origin');
  const violations = fields.filter(([,actual,expected]) => actual !== expected).map(([code]) => code);
  if (violations.length) {
    const error = new Error(violations.join(', ') + ': authenticated provenance violates configured authorization');
    error.provenanceFailure = {violations};
    throw error;
  }
  return predicate;
}
export function checkStatements(text, digest, predicateType, validate) {
  if (typeof digest !== 'string' || !/^(?:sha256:)?[a-f0-9]{64}$/.test(digest)) {
    throw new Error('A canonical SHA-256 digest is required');
  }
  const expectedDigest = digest.replace(/^sha256:/, '');
  // Authentication is a prerequisite. Callers supply verified CLI output or the
  // statement extracted from the same saved bundle after its authentication.
  let values;
  try { const v = JSON.parse(text); values = Array.isArray(v) ? v : [v]; }
  catch { values = text.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
  for (const envelope of values) {
    const statement = envelope.payload ? JSON.parse(Buffer.from(envelope.payload, 'base64').toString('utf8')) : envelope;
    if (statement?.predicateType !== predicateType || !Array.isArray(statement.subject)
      || !statement.subject.some(subject => subject?.digest?.sha256 === expectedDigest)) continue;
    try { validate(statement.predicate); return statement; } catch { /* Another verified attestation may match. */ }
  }
  throw new Error('No verified attestation has the required digest, type and content');
}
function json(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function main([command, ...args]) {
  switch (command) {
    case 'manifest': write(args[2], manifest(args[0], args[1], args[3] === 'github')); break;
    case 'sbom': console.log(validateSbom(json(args[0]))); break;
    case 'provenance': {
      const [repository, commit, sourceHash, run, out] = args;
      write(out, { buildDefinition: {
        buildType: 'https://tfm-goldenpath.dev/buildtypes/local/v1',
        externalParameters: { workflow: { repository, path: 'implementacion/scripts/demo.sh', ref: 'local' } },
        internalParameters: { mode: 'local-key', sourceSnapshotSha256: sourceHash, gitCommitAvailable: commit !== '0'.repeat(40) },
        resolvedDependencies: [{ uri: repository, digest: { gitCommit: commit, sha256: sourceHash } }]
      }, runDetails: { builder: { id: 'https://tfm-goldenpath.dev/builders/local-development' }, metadata: { invocationId: run } } });
      break;
    }
    case 'results': {
      const [directory, repository, commit, out] = args;
      const files = {
        unitTests: 'unit-tests.log', manifestPolicy: 'manifest-policy.json', workflowPolicy: 'workflow-policy.json',
        vulnerabilityPolicy: 'vulnerability-policy.json', signature: 'verified-signature.json',
        sbom: 'verified-sbom.json', provenance: 'verified-provenance.json'
      };
      const evidence = Object.fromEntries(Object.entries(files).map(([key, file]) => {
        const bytes = fs.readFileSync(path.join(directory, file));
        if (!bytes.length) throw new Error('Empty evidence: ' + file);
        return [key, { file, sha256: createHash('sha256').update(bytes).digest('hex') }];
      }));
      // Only the orchestrator calls this after successful exit codes and content validation.
      const result = { policyVersion: RESULTS_POLICY_VERSION, source: { repository, commit }, result: 'PASS',
        checks: Object.fromEntries(CHECKS.map(check => [check, 'PASS'])), evidence };
      write(out, validateResults(result, repository, commit)); break;
    }
    case 'verify-statement': {
      const [file, digest, type, repository, commit] = args;
      checkStatements(fs.readFileSync(file, 'utf8'), digest, type,
        predicate => validateStatementPredicate(predicate, type, repository, commit)); break;
    }
    case 'response': {
      const [health, quote, version, commit] = args;
      if (json(health).status !== 'ok' || JSON.stringify(json(quote)) !== JSON.stringify({currency:'EUR',premiumCents:1000,tariffVersion:'demo-v1'})
        || json(version).buildCommit !== commit || json(version).name !== 'quotes-node') throw new Error('Incorrect functional response');
      break;
    }
    default: throw new Error('Unknown contract command');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
