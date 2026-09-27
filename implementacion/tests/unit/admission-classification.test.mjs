import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bash = process.env.BASH_BIN || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const resultsType = 'https://tfm-goldenpath.dev/attestations/verification-results/v1';
const shellPath = (value) => value.replaceAll('\\', '/');
// Fixtures follow Kyverno v1.19.1 imageverifier.go and validate_resource.go.
// These exercise the real scenario classifiers; they do not verify signatures
// or replace a run against the admission webhook.
const missingResults = (trust = 'keyless') => `image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: .attestations[0].attestors[0].entries[0].${trust}: attestions not found for predicate type ${resultsType}`;
const runtimeReason = (rule = 'autogen-restricted-containers', field = 'privileged') => `validation failure: validation error: RUNTIME: all containers must be unprivileged, without privilege escalation or capabilities. rule ${rule} failed at path /securityContext/${field}/`;
const denial = (policy, rule, reason) => `Error from server: admission webhook "validate.kyverno.svc-fail" denied the request:\n\nresource Deployment/tfm-golden/quotes-node was blocked due to the following policies\n\n${policy}:\n  ${rule}: '${reason}'\n`;

function runScenario(t, scenario, output, status = 1) {
  const root = mkdtempSync(join(tmpdir(), 'gp-admission-classification-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('gp-admission-classification-'));
    rmSync(root, { recursive: true, force: true });
  });
  writeFileSync(join(root, 'response.log'), output);
  const env = {
    ...process.env,
    GP_SOURCE_ROOT: shellPath(sourceRoot), GP_TEST_STATE: shellPath(root),
    GP_SCENARIO_FUNCTION: `scenario_${scenario.toLowerCase()}_admission`, GP_ACTOR_STATUS: String(status),
  };
  delete env.BASH_ENV;
  delete env.ENV;
  const result = spawnSync(bash, ['--noprofile', '--norc', '-c', String.raw`
set -euo pipefail
source "$GP_SOURCE_ROOT/tests/scenarios/f13.sh"
source "$GP_SOURCE_ROOT/tests/scenarios/f11.sh"
state_dir="$GP_TEST_STATE"
results_type='https://tfm-goldenpath.dev/attestations/verification-results/v1'
record() { :; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
actor() { cat "$state_dir/response.log"; return "$GP_ACTOR_STATUS"; }
"$GP_SCENARIO_FUNCTION"
`], { env, encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error);
  assert.equal(readFileSync(join(root, `${scenario}-admission.log`), 'utf8'), output, 'retain the complete original rejection evidence');
  return result;
}

const accepted = [
  ['F13', 'missing results with keyless trust', denial('tfm-results', 'autogen-require-results', missingResults())],
  ['F13', 'missing results with local key trust', denial('tfm-results', 'require-results', missingResults('keys'))],
  ['F13', 'wrapped YAML reason', denial('tfm-results', 'autogen-require-results', missingResults()).replace('requiredCount: 1, error:', '\n    requiredCount: 1, error:')],
  ['F11', 'privileged Deployment denial', denial('tfm-runtime', 'autogen-restricted-containers', runtimeReason())],
  ['F11', 'privilege escalation denial', denial('tfm-runtime', 'autogen-restricted-containers', runtimeReason(undefined, 'allowPrivilegeEscalation'))],
  ['F11', 'direct Pod denial', denial('tfm-runtime', 'restricted-containers', runtimeReason('restricted-containers'))],
  ['F11', 'wrapped YAML reason', denial('tfm-runtime', 'autogen-restricted-containers', runtimeReason()).replace('without privilege', '\n    without privilege')],
];
for (const [scenario, label, output] of accepted) {
  test(`${scenario} attributes only the intended rejection: ${label}`, (t) => {
    const result = runScenario(t, scenario, output);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
}

const resultsDenial = (reason) => denial('tfm-results', 'autogen-require-results', reason);
const runtimeDenial = (reason) => denial('tfm-runtime', 'autogen-restricted-containers', reason);
const rejected = [
  ['F13', 'results-only certificate failure', resultsDenial('image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: no matching attestations: cert verification failed: x509: certificate signed by unknown authority')],
  ['F13', 'results-only registry failure', resultsDenial('image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: Get "https://registry.invalid": i/o timeout')],
  ['F13', 'results-only evaluation failure', resultsDenial('failed to check attestations: failed to substitute variables')],
  ['F13', 'generic missing attestations', resultsDenial('no matching attestations')],
  ['F13', 'wrong predicate', resultsDenial(missingResults().replace(resultsType, 'https://cyclonedx.org/bom'))],
  ['F13', 'unknown result format', resultsDenial('UNKNOWN integration failure')],
  ['F13', 'different rule', denial('tfm-results', 'wrong-require-results', missingResults())],
  ['F13', 'additional policy failure', resultsDenial(missingResults()) + 'tfm-signature:\n  verify-signature: x509: certificate signed by unknown authority\n'],
  ['F13', 'additional result rule failure', resultsDenial(missingResults()) + '  unexpected-rule: evaluation failed\n'],
  ['F13', 'extra error after expected reason', resultsDenial(missingResults() + '; x509: certificate signed by unknown authority')],
  ['F11', 'runtime plus certificate failure', runtimeDenial(runtimeReason()) + 'tfm-signature:\n  verify-signature: x509: certificate signed by unknown authority\n'],
  ['F11', 'another runtime rule', denial('tfm-runtime', 'autogen-authorized-image-repository', 'IMAGE_REPOSITORY: unauthorized repository')],
  ['F11', 'another field in the correct rule', runtimeDenial(runtimeReason().replace('/privileged/', '/runAsNonRoot/'))],
  ['F11', 'rule execution error', runtimeDenial('validation failure: validation error: RUNTIME: all containers must be unprivileged, without privilege escalation or capabilities. rule autogen-restricted-containers execution error: failed to evaluate expression')],
  ['F11', 'foreach evaluation error', runtimeDenial('failed to process foreach')],
  ['F11', 'unknown result format', runtimeDenial('UNKNOWN integration failure')],
  ['F11', 'additional runtime rule failure', runtimeDenial(runtimeReason()) + '  no-host-path: HOST_PATH: volume denied\n'],
  ['F11', 'wrong rule inside message', runtimeDenial(runtimeReason('another-rule'))],
  ['F13', 'transport error before policy evaluation', 'Unable to connect to the server: context deadline exceeded\n'],
  ['F11', 'transport error before policy evaluation', 'Unable to connect to the server: context deadline exceeded\n'],
];
for (const [scenario, label, output] of rejected) {
  test(`${scenario} refuses to count an integration or unrelated failure: ${label}`, (t) => {
    const result = runScenario(t, scenario, output);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /ERROR:/);
  });
}

for (const [scenario, output] of [['F13', resultsDenial(missingResults())], ['F11', runtimeDenial(runtimeReason())]]) {
  test(`${scenario} never counts a successful apply as rejection`, (t) => {
    const result = runScenario(t, scenario, output, 0);
    assert.equal(result.status, 1, result.stdout + result.stderr);
  });
}
