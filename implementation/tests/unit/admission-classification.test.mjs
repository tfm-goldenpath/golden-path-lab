import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bash = process.env.BASH_BIN || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const resultsType = 'https://tfm-goldenpath.dev/attestations/verification-results/v1';
const digest = 'sha256:' + 'a'.repeat(64);
const image = 'registry.example/quotes-node@' + digest;
const shellPath = (value) => value.replaceAll('\\', '/');
// Fixtures follow Kyverno v1.19.1 imageverifier.go and validate_resource.go.
// These exercise the real scenario classifiers; they do not verify signatures
// or replace a run against the admission webhook.
const missingResults = (trust = 'keyless') => `image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: .attestations[0].attestors[0].entries[0].${trust}: attestions not found for predicate type ${resultsType}`;
const missingBundle = 'image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found';
const sbom = {bomFormat:'CycloneDX', specVersion:'1.7', version:1,
  metadata:{component:{name:'synthetic', type:'container'}}, components:[{name:'synthetic', type:'library'}]};
function bundle(type, predicate = {}, hash = digest.slice(7)) {
  return {mediaType:'application/vnd.dev.sigstore.bundle.v0.3+json',
    verificationMaterial:{publicKey:{hint:'synthetic-development-key'}},
    dsseEnvelope:{payloadType:'application/vnd.in-toto+json',
      signatures:[{sig:Buffer.from('synthetic; not cryptographic evidence').toString('base64')}],
      payload:Buffer.from(JSON.stringify({_type:'https://in-toto.io/Statement/v1',
        subject:[{name:'registry.example/quotes-node', digest:{sha256:hash}}], predicateType:type, predicate})).toString('base64')}};
}
const inventory = () => [bundle('https://sigstore.dev/cosign/sign/v1'),
  bundle('https://cyclonedx.org/bom', sbom), bundle('https://slsa.dev/provenance/v1')];
const inventoryText = value => typeof value === 'string' ? value : JSON.stringify(value);
function registrySnapshot(values) {
  const hash = data => 'sha256:' + createHash('sha256').update(data).digest('hex');
  return {image, descriptors:(Array.isArray(values) ? values : inventory()).map(value => {
    const blob = Buffer.from(JSON.stringify(value));
    const manifest = Buffer.from(JSON.stringify({schemaVersion:2, mediaType:'application/vnd.oci.image.manifest.v1+json',
      artifactType:'application/vnd.dev.sigstore.bundle.v0.3+json',
      config:{mediaType:'application/vnd.oci.empty.v1+json',digest:hash('{}'),size:2},
      subject:{mediaType:'application/vnd.oci.image.manifest.v1+json',digest,size:123},
      layers:[{mediaType:'application/vnd.dev.sigstore.bundle.v0.3+json',digest:hash(blob),size:blob.length}]}));
    return {digest:hash(manifest),size:manifest.length,mediaType:'application/vnd.oci.image.manifest.v1+json',
      artifactType:'application/vnd.dev.sigstore.bundle.v0.3+json'};
  })};
}
const runtimeReason = (rule = 'autogen-restricted-containers', field = 'privileged') => `validation failure: validation error: RUNTIME: all containers must be unprivileged, without privilege escalation or capabilities. rule ${rule} failed at path /securityContext/${field}/`;
const denial = (policy, rule, reason) => `Error from server: admission webhook "validate.kyverno.svc-fail" denied the request:\n\nresource Deployment/tfm-golden/quotes-node was blocked due to the following policies\n\n${policy}:\n  ${rule}: '${reason}'\n`;
// Recorded kubectl response with Actions prefixes and trailing whitespace removed:
// https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36303967179/job/108576831438
// Source commit: 1ae111fc6e1614b32ee86461771836ada60e1d42.
// Contains public image metadata and a Secret name, never Secret contents.
const hostedUpdateDenial = readFileSync(join(sourceRoot, 'tests/unit/fixtures/f11-update-kyverno-1.19.1.log'), 'utf8');

function runScenario(t, scenario, output, status = 1, options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gp-admission-classification-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('gp-admission-classification-'));
    rmSync(root, { recursive: true, force: true });
  });
  writeFileSync(join(root, 'response.log'), output);
  const before = options.before ?? inventory();
  const after = options.after ?? inventory();
  if (!options.absentPreflight) {
    writeFileSync(join(root, 'attestation-inventory-before-results.json'), inventoryText(before));
  }
  if (!options.absentBeforeRegistry) {
    writeFileSync(join(root, 'registry-inventory-before-results.json'), inventoryText(
      Object.hasOwn(options, 'beforeRegistry') ? options.beforeRegistry : registrySnapshot(before)));
  }
  writeFileSync(join(root, 'download.json'), inventoryText(after));
  writeFileSync(join(root, 'download-registry.json'), inventoryText(
    Object.hasOwn(options, 'afterRegistry') ? options.afterRegistry : registrySnapshot(after)));
  // A stale report must never substitute for revalidating the actual inventory.
  writeFileSync(join(root, 'F13-early.json'), JSON.stringify({scenario:'F13', decision:'DENY'}));
  const env = {
    ...process.env,
    GP_SOURCE_ROOT: shellPath(sourceRoot), GP_TEST_STATE: shellPath(root),
    GP_SCENARIO_FUNCTION: `scenario_${scenario.toLowerCase()}_${options.prepare ? 'prepare' : 'admission'}`, GP_ACTOR_STATUS: String(status),
    GP_DOWNLOAD_STATUS: String(options.downloadStatus ?? 0), GP_MODE: options.mode ?? 'local',
    GP_DOWNLOAD_METADATA: options.absentAfterRegistry ? '0' : '1',
    GP_IMAGE: image, GP_DIGEST: digest,
  };
  delete env.BASH_ENV;
  delete env.ENV;
  const result = spawnSync(bash, ['--noprofile', '--norc', '-c', String.raw`
set -euo pipefail
cd "$GP_SOURCE_ROOT"
source "$GP_SOURCE_ROOT/tests/scenarios/f13.sh"
source "$GP_SOURCE_ROOT/tests/scenarios/f11.sh"
state_dir="$GP_TEST_STATE"
results_type='https://tfm-goldenpath.dev/attestations/verification-results/v1'
mode="$GP_MODE"
image="$GP_IMAGE"
digest="$GP_DIGEST"
record() { :; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
actor() { printf called > "$state_dir/actor.called"; cat "$state_dir/response.log"; return "$GP_ACTOR_STATUS"; }
node() {
  if [[ "$1" == scripts/download-bundle-inventory.mjs ]]; then
    printf '%s\n' "$*" >> "$state_dir/download.log"
    [[ "$GP_DOWNLOAD_METADATA" != 1 ]] || cp "$state_dir/download-registry.json" "$4"
    cat "$state_dir/download.json"
    return "$GP_DOWNLOAD_STATUS"
  fi
  command node "$@"
}
"$GP_SCENARIO_FUNCTION"
`], { env, encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error);
  if (existsSync(join(root, 'actor.called'))) {
    assert.equal(readFileSync(join(root, `${scenario}-admission.log`), 'utf8'), output, 'retain the complete original rejection evidence');
  }
  result.stateDir = root;
  return result;
}

const accepted = [
  ['F13', 'missing results with complete bundle inventories', denial('tfm-results', 'autogen-require-results', missingBundle)],
  ['F13', 'direct Pod bundle denial', denial('tfm-results', 'require-results', missingBundle).replace('resource Deployment/', 'resource Pod/')],
  ['F13', 'wrapped YAML bundle reason', denial('tfm-results', 'autogen-require-results', missingBundle).replace('requiredCount: 1, error:', '\n    requiredCount: 1, error:')],
  ['F11', 'privileged Deployment denial', denial('tfm-runtime', 'autogen-restricted-containers', runtimeReason())],
  ['F11', 'privilege escalation denial', denial('tfm-runtime', 'autogen-restricted-containers', runtimeReason(undefined, 'allowPrivilegeEscalation'))],
  ['F11', 'direct Pod denial', denial('tfm-runtime', 'restricted-containers', runtimeReason('restricted-containers')).replace('resource Deployment/', 'resource Pod/')],
  ['F11', 'wrapped YAML reason', denial('tfm-runtime', 'autogen-restricted-containers', runtimeReason()).replace('without privilege', '\n    without privilege')],
  ['F11', 'recorded hosted PATCH denial with the kubectl preamble', hostedUpdateDenial],
];
for (const [scenario, label, output] of accepted) {
  test(`${scenario} attributes only the intended rejection: ${label}`, (t) => {
    const result = runScenario(t, scenario, output);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    if (scenario === 'F13') {
      assert.deepEqual(JSON.parse(readFileSync(join(result.stateDir, 'attestation-inventory-after-denial.json'), 'utf8')), inventory());
      for (const file of ['bundle-profile-before-results.json', 'bundle-profile-after-denial.json']) {
        assert.equal(JSON.parse(readFileSync(join(result.stateDir, file), 'utf8')).digest, digest);
      }
      for (const file of ['F13-early.json', 'F13-after-denial.json']) {
        assert.equal(JSON.parse(readFileSync(join(result.stateDir, file), 'utf8')).reason, 'RESULTS_ATTESTATION_MISSING');
      }
      assert.equal(JSON.parse(readFileSync(join(result.stateDir, 'F13-inventory-consistency.json'), 'utf8')).check,
        'unchanged-referrer-descriptors');
    }
  });
}

const resultsDenial = (reason) => denial('tfm-results', 'autogen-require-results', reason);
const runtimeDenial = (reason) => denial('tfm-runtime', 'autogen-restricted-containers', reason);
const rejected = [
  ['F13', 'legacy keyless predicate message', resultsDenial(missingResults())],
  ['F13', 'legacy local predicate message', resultsDenial(missingResults('keys'))],
  ['F13', 'results-only certificate failure', resultsDenial('image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: no matching attestations: cert verification failed: x509: certificate signed by unknown authority')],
  ['F13', 'results-only registry failure', resultsDenial('image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: Get "https://registry.invalid": i/o timeout')],
  ['F13', 'results-only evaluation failure', resultsDenial('failed to check attestations: failed to substitute variables')],
  ['F13', 'generic missing attestations', resultsDenial('no matching attestations')],
  ['F13', 'wrong predicate', resultsDenial(missingResults().replace(resultsType, 'https://cyclonedx.org/bom'))],
  ['F13', 'unknown result format', resultsDenial('UNKNOWN integration failure')],
  ['F13', 'different rule', denial('tfm-results', 'wrong-require-results', missingBundle)],
  ['F13', 'additional policy failure', resultsDenial(missingBundle) + 'tfm-signature:\n  verify-signature: x509: certificate signed by unknown authority\n'],
  ['F13', 'additional result rule failure', resultsDenial(missingBundle) + '  unexpected-rule: evaluation failed\n'],
  ['F13', 'extra error after expected reason', resultsDenial(missingBundle + '; x509: certificate signed by unknown authority')],
  ['F11', 'runtime plus certificate failure', runtimeDenial(runtimeReason()) + 'tfm-signature:\n  verify-signature: x509: certificate signed by unknown authority\n'],
  ['F11', 'another runtime rule', denial('tfm-runtime', 'autogen-authorized-image-repository', 'IMAGE_REPOSITORY: unauthorized repository')],
  ['F11', 'another field in the correct rule', runtimeDenial(runtimeReason().replace('/privileged/', '/runAsNonRoot/'))],
  ['F11', 'rule execution error', runtimeDenial('validation failure: validation error: RUNTIME: all containers must be unprivileged, without privilege escalation or capabilities. rule autogen-restricted-containers execution error: failed to evaluate expression')],
  ['F11', 'foreach evaluation error', runtimeDenial('failed to process foreach')],
  ['F11', 'unknown result format', runtimeDenial('UNKNOWN integration failure')],
  ['F11', 'additional runtime rule failure', runtimeDenial(runtimeReason()) + '  no-host-path: HOST_PATH: volume denied\n'],
  ['F11', 'wrong rule inside message', runtimeDenial(runtimeReason('another-rule'))],
  ['F11', 'recorded PATCH response with a second policy failure', hostedUpdateDenial + 'tfm-signature:\n  verify-signature: x509: certificate signed by unknown authority\n'],
  ['F11', 'recorded PATCH response with an unrelated rule failure', hostedUpdateDenial.replace('  autogen-restricted-containers:', '  autogen-authorized-image-repository:')],
  ['F11', 'recorded PATCH response with a rule execution error', hostedUpdateDenial.replace('failed at path /securityContext/allowPrivilegeEscalation/', 'execution error: failed to evaluate expression')],
  ['F11', 'missing denial marker', runtimeDenial(runtimeReason()).replace(/^resource .*\n/m, '')],
  ['F11', 'marker text embedded in a quoted patch value', runtimeDenial(runtimeReason()).replace(/^resource (.*)$/m, '{"annotation":"resource $1"}')],
  ['F11', 'unrelated resource kind in the marker', runtimeDenial(runtimeReason()).replace('resource Deployment/', 'resource ConfigMap/')],
  ['F11', 'unrelated namespace in the marker', runtimeDenial(runtimeReason()).replace('resource Deployment/tfm-golden/', 'resource Deployment/tfm-reference/')],
  ['F11', 'unrelated workload in the marker', runtimeDenial(runtimeReason()).replace('resource Deployment/tfm-golden/quotes-node', 'resource Deployment/tfm-golden/another-service')],
  ['F11', 'repeated denial marker', runtimeDenial(runtimeReason()).replace(/^resource (.*)$/m, 'resource $1\nresource $1')],
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

for (const [scenario, output] of [['F13', resultsDenial(missingBundle)], ['F11', runtimeDenial(runtimeReason())]]) {
  test(`${scenario} never counts a successful apply as rejection`, (t) => {
    const result = runScenario(t, scenario, output, 0);
    assert.equal(result.status, 1, result.stdout + result.stderr);
  });
}

const invalidInventories = [
  ['malformed JSON', '{'],
  ['empty inventory', []],
  ['classic evidence', inventory().map(value => value.dsseEnvelope)],
  ['missing image-signature bundle', inventory().slice(1)],
  ['missing provenance bundle', inventory().slice(0, 2)],
  ['wrong digest', [...inventory(), bundle('https://sigstore.dev/cosign/sign/v1', {}, 'b'.repeat(64))]],
  ['results already present', [...inventory(), bundle(resultsType, {result:'PASS'})]],
  ['invalid CycloneDX SBOM', [bundle('https://sigstore.dev/cosign/sign/v1'), bundle('https://cyclonedx.org/bom', {}), bundle('https://slsa.dev/provenance/v1')]],
  ['malformed bundle', [...inventory(), {...bundle(resultsType), verificationMaterial:{}}]],
];
for (const [label, signature] of [
  ['invalid base64 signature', {sig:'%%%NOT-BASE64%%%'}],
  ['invalid key identifier', {sig:'c3ludGhldGlj',keyid:42}],
]) {
  const evidence = inventory();
  evidence[0].dsseEnvelope.signatures = [signature];
  invalidInventories.push([label, evidence]);
}
for (const [label, value] of invalidInventories) {
  for (const phase of ['before', 'after']) {
    test(`F13 refuses bundle attribution with ${label} ${phase} denial`, (t) => {
      const result = runScenario(t, 'F13', resultsDenial(missingBundle), 1, {[phase]:value});
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /ERROR:/);
      assert.equal(existsSync(join(result.stateDir, 'actor.called')), phase === 'after');
    });
  }
}

test('F13 rejects an absent preflight inventory even with a stale success report', (t) => {
  const result = runScenario(t, 'F13', resultsDenial(missingBundle), 1, {absentPreflight:true});
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(existsSync(join(result.stateDir, 'actor.called')), false);
});

test('F13 rejects failed registry retrieval after denial even when stdout looks valid', (t) => {
  const result = runScenario(t, 'F13', resultsDenial(missingBundle), 1, {downloadStatus:1});
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /could not retrieve the inventory after denial/);
});

test('F13 accepts reordered referrers without treating order as changed evidence', (t) => {
  const result = runScenario(t, 'F13', resultsDenial(missingBundle), 1, {after:inventory().reverse()});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

const changedSignature = inventory();
changedSignature[0].dsseEnvelope.signatures[0].sig = Buffer.from('changed synthetic signature bytes').toString('base64');
for (const [label, options] of [
  ['changed image-signature bundle', {after:changedSignature}],
  ['added unrelated referrer', {after:[...inventory(), bundle('https://example.test/other/v1')]}],
  ['removed unrelated referrer', {before:[...inventory(), bundle('https://example.test/other/v1')]}],
  ['missing original registry snapshot', {absentBeforeRegistry:true}],
  ['missing new registry snapshot', {absentAfterRegistry:true}],
  ['malformed original registry snapshot', {beforeRegistry:'{'}],
  ['malformed new registry snapshot', {afterRegistry:'{'}],
  ['original snapshot for another image', {beforeRegistry:{...registrySnapshot(inventory()),image:image.replace('quotes-node','other')}}],
  ['new snapshot for another image', {afterRegistry:{...registrySnapshot(inventory()),image:image.replace('quotes-node','other')}}],
]) {
  test(`F13 refuses attribution with ${label} despite valid predicate inventories`, (t) => {
    const result = runScenario(t, 'F13', resultsDenial(missingBundle), 1, options);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /F13 registry evidence changed or its snapshots are unavailable/);
    assert.equal(existsSync(join(result.stateDir, 'actor.called')), true);
  });
}

for (const mode of ['local', 'github']) {
  test(`F13 ${mode} preflight retains complete bundle and missing-results reports`, (t) => {
    const result = runScenario(t, 'F13', '', 1, {prepare:true, absentPreflight:true, mode});
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(join(result.stateDir, 'attestation-inventory-before-results.json'), 'utf8')), inventory());
    assert.equal(JSON.parse(readFileSync(join(result.stateDir, 'bundle-profile-before-results.json'), 'utf8')).phase, 'before-results');
    assert.equal(JSON.parse(readFileSync(join(result.stateDir, 'F13-early.json'), 'utf8')).reason, 'RESULTS_ATTESTATION_MISSING');
    const args = readFileSync(join(result.stateDir, 'download.log'), 'utf8');
    assert.ok(args.startsWith(`scripts/download-bundle-inventory.mjs ${mode} `));
    assert.ok(args.includes('registry-inventory-before-results.json'));
    assert.ok(args.includes(image));
  });
}

for (const [label, options] of [
  ['registry failure', {downloadStatus:1}],
  ['malformed inventory', {after:'{'}],
  ['present results', {after:[...inventory(), bundle(resultsType)]}],
]) {
  test(`F13 preflight stops on ${label}`, (t) => {
    const result = runScenario(t, 'F13', '', 1, {prepare:true, ...options});
    assert.equal(result.status, 1, result.stdout + result.stderr);
  });
}
