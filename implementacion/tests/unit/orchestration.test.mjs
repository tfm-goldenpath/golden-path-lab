import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bash = process.env.BASH_BIN || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const modules = ['context', 'lab', 'delivery', 'attestations', 'workload'];
const scenarios = ['l01', 'f13', 'f07', 'f11'];
const repository = 'registry.invalid/quotes';
const digest = `sha256:${'a'.repeat(64)}`;
const image = `${repository}@${digest}`;
const shellPath = (value) => value.replaceAll('\\', '/');

// These are orchestration contract tests, not Docker, cryptographic or admission
// integration tests. Only the isolated copy overrides stage functions. The real
// demo.sh still decides order, phases, error propagation and the exit trap.
const stageStubs = String.raw`
event() { printf '%s|%s\n' "$1" "$image" >> "$GP_EVENTS"; }
step() {
  event "$1"
  if [[ "$1" == "$GP_FAIL_STAGE" ]]; then return "$GP_STEP_STATUS"; fi
  return 0
}
context_init() {
  state_dir="$GP_FIXTURE_STATE"; private="$GP_FIXTURE_PRIVATE"; preserve=0
  image=''; image_repo=''; digest=''; repository=fixture; commit=fixture
}
lab_check_environment() { step environment; }
create_state() {
  printf 'state_dir=%s\ndocker_config=%s\n' "$state_dir" "$private/docker" >> "$GITHUB_OUTPUT"
  step create-state
}
load_state() { state_dir="$GP_STATE_DIR"; step load-state; }
delivery_preflight() { step preflight; }
capture_source_context() { step source; }
lab_create() { step lab; }
delivery_build() {
  step build
  printf '%s\n' "$GP_IMAGE_REPO" > "$state_dir/image-repo"
  printf '%s\n' "$GP_DIGEST" > "$state_dir/digest"
}
lab_prepare_namespaces() { step namespaces; }
delivery_render_manifests() { step manifests; }
load_delivery_context() {
  read -r image_repo < "$state_dir/image-repo"
  read -r digest < "$state_dir/digest"
  image="$image_repo@$digest"
  step load-image
}
workload_reference() { step reference; }
delivery_check_manifest() { step check-manifest; }
scenario_f11_early() { step f11-early; }
delivery_analyze() { step analyze; }
scenario_l01_prepare_update() {
  step prepare-update
  if [[ "$mode" == github ]]; then
    printf 'update_image=%s\nupdate_digest=sha256:%064d\n' "$image_repo" 1 >> "$GITHUB_OUTPUT"
  fi
}
attestations_verify_delivery() { step verify; }
scenario_f13_prepare() { step f13-prepare; }
lab_install_admission() { step admission; }
scenario_f13_admission() { step f13-deny; }
attestations_authorize_results() { step authorize; }
scenario_f07_admission() { step f07; step f07-restore; }
scenario_f07_complete() {
  step f07-complete
  command jq -n --arg image "$image" '{status:"DIRECTED_ACCEPTANCE_COMPLETE",image:$image,sameDigestL01:"accepted-and-healthy"}' > "$state_dir/F07-completed.json"
}
scenario_f07_pending() {
  step f07-pending
  command jq -n '{status:"NOT_EXECUTED",reason:"Hosted GHCR mutation compatibility pending"}' > "$state_dir/F07-completed.json"
}
scenario_l01_accept() { step l01; }
scenario_f11_admission() { step f11-update; }
scenario_l01_update() {
  step l01-update
  command jq -n '{status:"PASS",sharedExecution:"L01-image-update"}' > "$state_dir/L04-result.json"
  command jq -n --arg mode "$mode" '{status:(if $mode=="local" then "CI_REJECTION_AND_L04_ACCEPTANCE_COMPLETE" else "NOT_EXECUTED" end)}' > "$state_dir/F07-CI-completed.json"
  command jq -n '{status:"PASS"}' > "$state_dir/L01-image-update.json"
}
cleanup() {
  event cleanup
  local status=FAIL
  if [[ -f "$state_dir/result.json" ]]; then status=$(command jq -r .status "$state_dir/result.json"); fi
  command python3 "$GP_SOURCE_ROOT/scripts/package-evidence.py" "$state_dir" "$GP_FIXTURE_ROOT/packages" "$status"
  return "$GP_CLEANUP_STATUS"
}
# jq only serializes the final report in this fixture. Any newly reached tool
# must fail explicitly instead of reaching a live registry, cluster or service.
jq() { event report; command jq "$@"; }
for tool in docker kind kubectl cosign trivy conftest helm curl node python3 git tar sha256sum; do
  eval "$tool() { event unexpected-tool-$tool; return 91; }"
done
`;

function fixture(t, { stubs = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gp-orchestration-'));
  t.after(() => {
    // Delete only the exact temporary directory created by this test.
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('gp-orchestration-'));
    rmSync(root, { recursive: true, force: true });
  });
  for (const relative of [
    'scripts/demo.sh', 'versions.env',
    ...modules.map((name) => `scripts/lib/${name}.sh`),
    ...scenarios.map((name) => `tests/scenarios/${name}.sh`),
  ]) {
    const destination = join(root, relative);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(sourceRoot, relative), destination);
  }
  if (stubs) appendFileSync(join(root, 'tests/scenarios/f11.sh'), stageStubs);
  const state = join(root, 'state');
  const privateDir = join(root, 'private');
  const events = join(root, 'events.log');
  const output = join(root, 'github-output');
  mkdirSync(state);
  mkdirSync(join(privateDir, 'docker'), { recursive: true });
  writeFileSync(events, '');
  writeFileSync(output, '');
  return { root, state, privateDir, events, output };
}

function run(f, args, extra = {}) {
  const env = {
    ...process.env,
    GP_SOURCE_ROOT: shellPath(sourceRoot),
    GP_FIXTURE_ROOT: shellPath(f.root),
    GP_FIXTURE_STATE: shellPath(f.state),
    GP_FIXTURE_PRIVATE: shellPath(f.privateDir),
    GP_STATE_DIR: shellPath(f.state),
    GP_EVENTS: shellPath(f.events),
    GP_IMAGE_REPO: repository,
    GP_DIGEST: digest,
    GITHUB_OUTPUT: shellPath(f.output),
    GP_FAIL_STAGE: '', GP_STEP_STATUS: '37', GP_CLEANUP_STATUS: '0',
    ...extra,
  };
  delete env.BASH_ENV;
  delete env.ENV;
  const result = spawnSync(bash, ['--noprofile', '--norc', ...args], {
    cwd: f.root, env, encoding: 'utf8', timeout: 15_000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  return {
    ...result,
    events: readFileSync(f.events, 'utf8').trim().split('\n').filter(Boolean)
      .map((line) => { const [stage, artifact] = line.split('|'); return { stage, artifact }; }),
  };
}

const stages = (result) => result.events.map((entry) => entry.stage);

function auditPackage(f) {
  const result = spawnSync('python3', ['-c', `
import hashlib,json,sys,tarfile
from pathlib import Path
archive_path=Path(sys.argv[1])
assert hashlib.sha256(archive_path.read_bytes()).hexdigest()==Path(str(archive_path)+'.sha256').read_text().split()[0]
with tarfile.open(archive_path) as archive:
    for line in archive.extractfile('state/SHA256SUMS.txt').read().decode().splitlines():
        digest,name=line.split('  ',1)
        assert hashlib.sha256(archive.extractfile('state/'+name).read()).hexdigest()==digest
    summary=json.load(archive.extractfile('state/execution-summary.json'))
    report=json.load(archive.extractfile('state/result.json')) if 'state/result.json' in archive.getnames() else None
    print(json.dumps({'summary':summary,'report':report}))
`, join(f.root, 'packages/state.tar.gz')], {encoding:'utf8'});
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

for (const [mode, ref, failBundle = 0] of [
  ['local', 'main'], ['github', 'main'], ['github', 'feat/cosign-bundles'],
  ...[1, 2, 3].map(stage => ['github', 'feat/cosign-bundles', stage]),
]) {
  test(`${mode}/${ref} requires bundles and preserves explicit trust (failure ${failBundle})`, t => {
    const fixtureState = fixture(t, { stubs: false });
    writeFileSync(join(fixtureState.privateDir, 'cosign.pub'), 'fixture public key');
    writeFileSync(join(fixtureState.privateDir, 'cosign.key'), 'fixture private key');
    const identity = `https://github.com/example/lab/.github/workflows/golden-path.yml@refs/heads/${ref}`;
    const result = run(fixtureState, ['-c', String.raw`
set -Eeuo pipefail
source "$GP_FIXTURE_ROOT/scripts/lib/attestations.sh"
mode="$GP_SIGNING_MODE"; state_dir="$GP_FIXTURE_STATE"; private="$GP_FIXTURE_PRIVATE"
contract=fixture; repository=https://github.com/example/lab; commit=fixture
image_repo="$GP_IMAGE_REPO"; digest="$GP_DIGEST"; image="$image_repo@$digest"
results_type=https://tfm-goldenpath.dev/attestations/verification-results/v1
GITHUB_REPOSITORY=example/lab; GITHUB_REF="$GP_SIGNING_REF"
record() { :; }
need() { :; }
get() { printf '%s' "$GP_SIGNING_IDENTITY"; }
capture() { printf '%s\0' "$@" >> "$GP_FIXTURE_ROOT/signing-commands"; printf '\0' >> "$GP_FIXTURE_ROOT/signing-commands"; }
node() { capture node "$@"; }
bundle_count=0
cosign() {
  capture cosign "$@"
  if [[ "$1" == verify-blob-attestation ]]; then
    bundle_count=$((bundle_count + 1))
    if [[ "$bundle_count" == "$GP_FAIL_BUNDLE" ]]; then return 19; fi
  fi
}
gh() { capture gh "$@"; }
attestations_verify_delivery
attestations_authorize_results
`], { GP_SIGNING_MODE: mode, GP_SIGNING_IDENTITY: identity, GP_SIGNING_REF: `refs/heads/${ref}`, GP_FAIL_BUNDLE: String(failBundle) });
    assert.equal(result.status, failBundle ? 19 : 0, result.stderr);
    const commands = readFileSync(join(fixtureState.root, 'signing-commands'), 'utf8')
      .split('\0\0').filter(Boolean).map(command => command.split('\0'));
    assert.ok(!commands.some(command => command.includes('scripts/complete-classic-chain.mjs')));
    assert.ok(!commands.some(command => command[0] === 'cosign' && command[1] === 'download'));
    assert.ok(!commands.flat().some(arg => /--new-bundle-format|--use-signing-config|--tlog-upload/.test(arg)));
    if (failBundle) {
      assert.equal(commands.at(-1)[1], 'verify-blob-attestation');
      assert.equal(commands.filter(command => command[1] === 'verify-blob-attestation').length, failBundle);
      return;
    }
    const signing = commands.filter(command => command[0] === 'cosign' && ['sign', 'attest'].includes(command[1]));
    assert.equal(signing.length, mode === 'local' ? 4 : 3);
    assert.equal(new Set(signing.map(command => command[command.indexOf('--bundle') + 1])).size, signing.length);
    for (const command of signing) {
      assert.equal(command.at(-1), image);
      assert.ok(command[command.indexOf('--bundle') + 1].endsWith('.bundle.json'));
      assert.equal(command.includes('--key'), mode === 'local');
      assert.equal(command.includes('--signing-config'), mode === 'local');
      assert.equal(command.includes('--allow-insecure-registry'), mode === 'local');
      assert.ok(command.includes('--trusted-root'));
    }
    const verification = commands.filter(command => command[0] === 'cosign' && command[1].startsWith('verify'));
    assert.equal(verification.length, mode === 'local' ? 4 : 3);
    for (const command of verification) {
      assert.equal(command[1], 'verify-blob-attestation', 'only the saved bundle can authenticate content checks');
      assert.equal(command.includes('--insecure-ignore-tlog'), mode === 'local');
      if (mode === 'github') {
        assert.equal(command[command.indexOf('--certificate-identity') + 1], identity);
        assert.equal(command[command.indexOf('--certificate-oidc-issuer') + 1], 'https://token.actions.githubusercontent.com');
      }
      if (command[1] === 'verify-blob-attestation') {
        assert.equal(command.includes('--allow-insecure-registry'), false);
        assert.equal(command[command.indexOf('--digest') + 1], digest.slice(7));
      }
      const content = commands[commands.indexOf(command) + 1];
      assert.equal(content[0], 'node');
      assert.equal(content[1], 'scripts/verified-bundle-statement.mjs');
      assert.equal(content[2], command[command.indexOf('--bundle') + 1]);
      assert.equal(content[3], digest);
      assert.equal(content[4], command[command.indexOf('--type') + 1]);
    }
    assert.equal(verification[0][verification[0].indexOf('--type') + 1], 'https://sigstore.dev/cosign/sign/v1');
    const provenance = commands.find(command => command[0] === 'gh' && command[1] === 'attestation');
    if (mode === 'github') {
      assert.equal(commands[0].slice(0, 4).join(' '), 'cosign trusted-root create --with-default-services');
      // Fresh native-provenance verification now belongs to the read-only gate.
      assert.equal(provenance, undefined);
      assert.deepEqual(commands.filter(c => c[1] === 'scripts/ci-verification-gate.mjs').map(c => c.slice(-2)),
        [['CI-delivery','before-results'], ['CI-authorization','before-results'], ['CI-authorized','authorized']]);
    } else {
      assert.equal(provenance, undefined);
      assert.deepEqual(commands[0], ['cosign', 'signing-config', 'create']);
      assert.deepEqual(commands[1], ['cosign', 'trusted-root', 'create']);
    }
    assert.ok(commands.some(command => command[1] === 'scripts/check-bundle-profile.mjs' && command.at(-1) === 'authorized'));
    assert.ok(commands.some(command => command[1] === 'scripts/download-bundle-inventory.mjs'
      && command[2] === mode && command[3] === image && command.at(-1).endsWith('/registry-inventory-authorized.json')));
  });
}

for (const dangling of [false, true]) {
  test(`cleanup rejects a ${dangling ? 'dangling' : 'live'} symlinked evidence marker`, t => {
    const fixtureState = fixture(t, {stubs:false});
    const target = join(fixtureState.root, 'outside.txt');
    if (!dangling) writeFileSync(target, 'preserve me');
    const marker = join(fixtureState.state, '.evidence-packaged');
    try { symlinkSync(target, marker); }
    catch (error) {
      if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows symlink privilege required');
      throw error;
    }
    const result = run(fixtureState, ['-c', String.raw`
set -Eeuo pipefail
source "$GP_FIXTURE_ROOT/scripts/lib/lab.sh"
root="$GP_FIXTURE_ROOT"; state_dir="$GP_FIXTURE_STATE"; private=''
port_pid=''; mode=github; registry=''; builder=''; cluster=fixture
python3() { printf 'unexpected-package\n' >> "$GP_EVENTS"; }
kind() { printf 'remove-cluster\n' >> "$GP_EVENTS"; }
cleanup
`]);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /refusing unsafe evidence marker/);
    assert.deepEqual(stages(result), ['remove-cluster']);
    assert.ok(lstatSync(marker).isSymbolicLink());
    assert.equal(existsSync(target), !dangling);
    if (!dangling) assert.equal(readFileSync(target, 'utf8'), 'preserve me');
  });
}

test('cleanup refuses a marker symlink introduced during packaging', t => {
  const fixtureState = fixture(t, {stubs:false});
  const target = join(fixtureState.root, 'outside.txt');
  const link = join(fixtureState.root, 'prepared-link');
  try { symlinkSync(target, link); }
  catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows symlink privilege required');
    throw error;
  }
  const result = run(fixtureState, ['-c', String.raw`
set -Eeuo pipefail
source "$GP_FIXTURE_ROOT/scripts/lib/lab.sh"
root="$GP_FIXTURE_ROOT"; state_dir="$GP_FIXTURE_STATE"; private=''
port_pid=''; mode=github; registry=''; builder=''; cluster=''
python3() { mv -- "$GP_FIXTURE_ROOT/prepared-link" "$state_dir/.evidence-packaged"; }
cleanup
`]);
  assert.equal(result.status, 1, result.stderr);
  assert.ok(!existsSync(target));
  assert.ok(lstatSync(join(fixtureState.state, '.evidence-packaged')).isSymbolicLink());
});

for (const name of ['registry.log', 'cluster-pods.txt', 'cluster-events.txt']) {
  for (const dangling of [false, true]) {
    test(`cleanup rejects a ${dangling ? 'dangling' : 'live'} diagnostic symlink for ${name}`, t => {
      const fixtureState = fixture(t, { stubs: false });
      const target = join(fixtureState.root, 'outside.txt');
      if (!dangling) writeFileSync(target, 'preserve me');
      writeFileSync(join(fixtureState.privateDir, 'kubeconfig'), 'fixture');
      try { symlinkSync(target, join(fixtureState.state, name)); }
      catch (error) {
        if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows symlink privilege required');
        throw error;
      }
      const result = run(fixtureState, ['-c', String.raw`
set -Eeuo pipefail
source "$GP_FIXTURE_ROOT/scripts/lib/lab.sh"
root="$GP_FIXTURE_ROOT"; state_dir="$GP_FIXTURE_STATE"; private="$GP_FIXTURE_PRIVATE"
port_pid=''; mode=local; registry=fixture; builder=''; cluster=fixture
k() { printf 'diagnostics\n'; }
docker() { if [[ "$1" == logs ]]; then printf 'registry diagnostics\n'; else printf 'remove-registry\n' >> "$GP_EVENTS"; fi; }
kind() { printf 'remove-cluster\n' >> "$GP_EVENTS"; }
python3() { printf 'unexpected-package\n' >> "$GP_EVENTS"; }
cleanup
`]);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /refusing unsafe diagnostic output/);
      assert.deepEqual(stages(result), ['remove-cluster', 'remove-registry']);
      assert.equal(existsSync(target), !dangling);
      if (!dangling) assert.equal(readFileSync(target, 'utf8'), 'preserve me');
      assert.ok(lstatSync(join(fixtureState.state, name)).isSymbolicLink());
      assert.ok(!existsSync(join(fixtureState.state, '.evidence-packaged')));
    });
  }
}

test('cleanup atomically replaces a diagnostic symlink introduced during collection', t => {
  const fixtureState = fixture(t, { stubs: false });
  const target = join(fixtureState.root, 'outside.txt');
  writeFileSync(target, 'preserve me');
  try { symlinkSync(target, join(fixtureState.root, 'prepared-link')); }
  catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows symlink privilege required');
    throw error;
  }
  writeFileSync(join(fixtureState.privateDir, 'kubeconfig'), 'fixture');
  const result = run(fixtureState, ['-c', String.raw`
set -Eeuo pipefail
source "$GP_FIXTURE_ROOT/scripts/lib/lab.sh"
root="$GP_FIXTURE_ROOT"; state_dir="$GP_FIXTURE_STATE"; private="$GP_FIXTURE_PRIVATE"
port_pid=''; mode=github; registry=''; builder=''; cluster=''
k() {
  if [[ "$2" == pods ]]; then mv -- "$GP_FIXTURE_ROOT/prepared-link" "$state_dir/cluster-pods.txt"; fi
  printf 'diagnostics\n'
  return 1
}
python3() { printf 'package\n' >> "$GP_EVENTS"; }
cleanup
`]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(target, 'utf8'), 'preserve me');
  assert.ok(!lstatSync(join(fixtureState.state, 'cluster-pods.txt')).isSymbolicLink());
  assert.equal(readFileSync(join(fixtureState.state, 'cluster-pods.txt'), 'utf8'), 'diagnostics\n');
  assert.deepEqual(stages(result), ['package']);
});

test('repeated cleanup preserves diagnostic files and the first package', t => {
  const fixtureState = fixture(t, {stubs:false});
  writeFileSync(join(fixtureState.privateDir, 'kubeconfig'), 'fixture');
  const result = run(fixtureState, ['-c', String.raw`
set -Eeuo pipefail
source "$GP_FIXTURE_ROOT/scripts/lib/lab.sh"
root="$GP_FIXTURE_ROOT"; state_dir="$GP_FIXTURE_STATE"; private="$GP_FIXTURE_PRIVATE"
port_pid=''; mode=github; registry=''; builder=''; cluster=''
k() { printf 'first diagnostics\n'; }
python3() { printf 'package\n' >> "$GP_EVENTS"; }
cleanup
k() { printf 'cluster is gone\n'; return 1; }
cleanup
`]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.events.length, 1);
  assert.equal(readFileSync(join(fixtureState.state, 'cluster-pods.txt'), 'utf8'), 'first diagnostics\n');
  assert.equal(readFileSync(join(fixtureState.state, 'cluster-events.txt'), 'utf8'), 'first diagnostics\n');
});

test('sourcing the real modules does not run tools or change cwd, options or traps', (t) => {
  const f = fixture(t, { stubs: false });
  const result = run(f, ['-c', String.raw`
set -Eeuo pipefail
trap 'printf sentinel >> "$GP_FIXTURE_ROOT/trap-fired"' EXIT
command_not_found_handle() { printf '%s\n' "$1" >> "$GP_EVENTS"; return 93; }
PATH="$GP_FIXTURE_ROOT/no-executables"
set +o > "$GP_FIXTURE_ROOT/options-before"
shopt -p > "$GP_FIXTURE_ROOT/shopt-before"
trap -p > "$GP_FIXTURE_ROOT/traps-before"
printf '%s' "$PWD" > "$GP_FIXTURE_ROOT/cwd-before"
for module in context lab delivery attestations workload; do
  source "$GP_SOURCE_ROOT/scripts/lib/$module.sh"
done
for scenario in l01 f13 f07 f11; do
  source "$GP_SOURCE_ROOT/tests/scenarios/$scenario.sh"
done
set +o > "$GP_FIXTURE_ROOT/options-after"
shopt -p > "$GP_FIXTURE_ROOT/shopt-after"
trap -p > "$GP_FIXTURE_ROOT/traps-after"
printf '%s' "$PWD" > "$GP_FIXTURE_ROOT/cwd-after"
`]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.events, []);
  for (const property of ['cwd', 'options', 'shopt', 'traps']) {
    assert.equal(readFileSync(join(f.root, `${property}-after`), 'utf8'),
      readFileSync(join(f.root, `${property}-before`), 'utf8'), property);
  }
  assert.equal(readFileSync(join(f.root, 'trap-fired'), 'utf8'), 'sentinel');
});

for (const [stage, status, cleanupStatus] of [['analyze', 37, 0], ['prepare-update', 38, 0], ['verify', 41, 19], ['f13-deny', 42, 19]]) {
  test(`a mandatory failure in ${stage} prevents authorization and preserves exit code ${status}`, (t) => {
    const f = fixture(t);
    const result = run(f, ['scripts/demo.sh', 'local'], {
      GP_FAIL_STAGE: stage, GP_STEP_STATUS: String(status), GP_CLEANUP_STATUS: String(cleanupStatus),
    });
    assert.equal(result.status, status, result.stderr);
    assert.ok(stages(result).includes(stage));
    assert.equal(stages(result).at(-1), 'cleanup');
    assert.equal(stages(result).filter((value) => value === 'cleanup').length, 1);
    assert.ok(!stages(result).includes('authorize'));
    assert.ok(!stages(result).includes('report'));
    assert.ok(!existsSync(join(f.state, 'result.json')));
    assert.doesNotMatch(result.stdout, /\bPASS\b/);
    assert.equal(JSON.parse(readFileSync(join(f.state, 'execution-summary.json'))).status, 'FAIL');
    const packaged = auditPackage(f);
    assert.equal(packaged.summary.status, 'FAIL');
    assert.equal(packaged.report, null);
  });
}

test('prepare publishes outputs and preserves resources without authorizing results', (t) => {
  const f = fixture(t);
  const result = run(f, ['scripts/demo.sh', 'github', 'prepare']);
  assert.equal(result.status, 0, result.stderr);
  const outputs = Object.fromEntries(readFileSync(f.output, 'utf8').trim().split('\n').map((line) => line.split('=')));
  assert.deepEqual(outputs, {
    state_dir: shellPath(f.state), docker_config: `${shellPath(f.privateDir)}/docker`, image: repository, digest,
    update_image: repository, update_digest: `sha256:${'0'.repeat(63)}1`,
  });
  assert.ok(stages(result).includes('analyze'));
  assert.ok(!stages(result).includes('cleanup'));
  assert.ok(!stages(result).includes('authorize'));
  assert.ok(!existsSync(join(f.state, 'result.json')));
});

test('finish restores the prepared image and preserves F13 → authorization → L01 without rebuilding', (t) => {
  const f = fixture(t);
  writeFileSync(join(f.state, 'image-repo'), `${repository}\n`);
  writeFileSync(join(f.state, 'digest'), `${digest}\n`);
  const result = run(f, ['scripts/demo.sh', 'github', 'finish']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(stages(result), [
    'environment', 'load-state', 'load-image', 'verify', 'f13-prepare', 'admission',
    'f13-deny', 'authorize', 'f07-pending', 'l01', 'f11-update', 'l01-update', 'report', 'cleanup',
  ]);
  for (const entry of result.events.slice(2)) assert.equal(entry.artifact, image, entry.stage);
  const report = JSON.parse(readFileSync(join(f.state, 'result.json'), 'utf8'));
  assert.equal(report.status, 'PASS');
  assert.equal(report.image, image);
  assert.equal(report.F07.status, 'NOT_EXECUTED');
  assert.deepEqual(auditPackage(f).report, report);
});

test('reference runs only R and cleans up on exit', (t) => {
  const f = fixture(t);
  const result = run(f, ['scripts/demo.sh', 'local', 'reference']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(stages(result), [
    'environment', 'create-state', 'preflight', 'source', 'lab', 'build', 'namespaces',
    'manifests', 'load-image', 'reference', 'report', 'cleanup',
  ]);
  assert.equal(JSON.parse(readFileSync(join(f.state, 'result.json'), 'utf8')).image, image);
});

 test('local coordinator requires F07 restoration then same-digest L01 before completion', t => {
  const f = fixture(t);
  const result = run(f, ['scripts/demo.sh', 'local']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(stages(result).slice(stages(result).indexOf('f13-deny')), [
    'f13-deny', 'authorize', 'f07', 'f07-restore', 'l01', 'f07-complete',
    'f11-update', 'l01-update', 'report', 'cleanup']);
  assert.equal(JSON.parse(readFileSync(join(f.state, 'result.json'))).F07.sameDigestL01, 'accepted-and-healthy');
  assert.equal(auditPackage(f).report.F07.status, 'DIRECTED_ACCEPTANCE_COMPLETE');
  for (const entry of result.events.filter(e => ['f07', 'f07-restore', 'l01', 'f07-complete'].includes(e.stage)))
    assert.equal(entry.artifact, image);
 });
 for (const stage of ['f07', 'f07-restore', 'l01', 'f07-complete', 'f11-update', 'l01-update']) {
  test(`local coordinator stops on ${stage} failure without PASS`, t => {
    const f = fixture(t);
    const result = run(f, ['scripts/demo.sh', 'local'], {GP_FAIL_STAGE:stage});
    assert.equal(result.status, 37, result.stderr);
    assert.equal(stages(result).at(-1), 'cleanup');
    assert.ok(!stages(result).includes('report'));
    assert.ok(!existsSync(join(f.state, 'result.json')));
    assert.doesNotMatch(result.stdout, /\bPASS\b/);
    assert.equal(JSON.parse(readFileSync(join(f.state, 'execution-summary.json'))).status, 'FAIL');
    const packaged = auditPackage(f);
    assert.equal(packaged.summary.status, 'FAIL');
    assert.equal(packaged.report, null);
  });
 }

// Keep both the coordinator and replacement function real; substitute only the
// external stages. The actual gate, recovery and rollout have separate tests.
for (const [mode, failure] of [['local',''],['github',''],...['update-issue','update-ci','update-ci-restore','update-authorize','update-apply','update-probe'].map(stage=>['local',stage])]) {
  test(`real coordinator and replacement preserve CI/L04 ordering (${mode}, ${failure || 'success'})`,t=>{
    const f=fixture(t);
    writeFileSync(join(f.state,'image-repo'),repository+'\n');
    writeFileSync(join(f.state,'digest'),digest+'\n');
    writeFileSync(join(f.state,'tfm-reference-quote.json'),'{}\n');
    const child=join(f.state,'L01-update'); mkdirSync(child);
    writeFileSync(join(child,'state.json'),'{}');
    writeFileSync(join(child,'image-repo'),repository+'-update\n');
    writeFileSync(join(child,'digest'),'sha256:'+'b'.repeat(64)+'\n');
    appendFileSync(join(f.root,'tests/scenarios/f11.sh'),String.raw`
source "$root/tests/scenarios/l01.sh"
scenario_l01_accept() { step l01; }
attestations_issue_delivery() { step update-issue; }
attestations_ci_gate() { step update-gate; }
scenario_f07_ci() {
  mkdir "$state_dir/F07-CI"
  echo '{"status":"attempted"}' > "$state_dir/F07-CI/attempt.json"
  step update-ci
  step update-ci-restore
  echo '{"status":"CI_REJECTION_AND_RECOVERY"}' > "$state_dir/F07-CI/result.json"
}
attestations_authorize_results() {
  if [[ "$state_dir" == */L01-update ]]; then step update-authorize; else step authorize; fi
}
actor() { step update-apply; }
probe() { step update-probe; cp "$GP_FIXTURE_STATE/tfm-reference-quote.json" "$state_dir/tfm-golden-quote.json"; }
k() { echo '{}'; }
node() {
  [[ "$1" == scripts/check-image-rollout.mjs ]] || return 91
  step update-rollout
  command jq -n --arg image "$image" '{status:"PASS",toImage:$image}'
}
`);
    const result=run(f,['scripts/demo.sh',mode,'finish'],{GP_FAIL_STAGE:failure});
    const order=stages(result);
    assert.ok(order.indexOf('f11-update')<order.indexOf('update-issue'));
    const archived=auditPackage(f);
    if(failure) {
      assert.equal(result.status,37,result.stderr);
      assert.equal(archived.summary.status,'FAIL');
      assert.equal(archived.report,null);
      assert.ok(!existsSync(join(f.state,'L04-result.json')));
      if(['update-issue','update-ci','update-ci-restore'].includes(failure)) assert.ok(!order.includes('update-authorize'));
      if(failure!=='update-probe') assert.ok(!order.includes('update-probe'));
    } else {
      assert.equal(result.status,0,result.stderr);
      const observed=order.filter(s=>s.startsWith('update-'));
      assert.deepEqual(observed,['update-issue',...(mode==='local'?['update-ci','update-ci-restore']:['update-gate']),'update-authorize','update-apply','update-probe','update-rollout']);
      assert.equal(archived.report.L04.sharedExecution,'L01-image-update');
      assert.equal(archived.report.L04.image,repository+'-update@sha256:'+'b'.repeat(64));
      assert.equal(archived.report.F07CI.status,mode==='local'?'CI_REJECTION_AND_L04_ACCEPTANCE_COMPLETE':'NOT_EXECUTED');
    }
  });
}
