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
const scenarios = ['l01', 'f13', 'f11'];
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
attestations_verify_delivery() { step verify; }
scenario_f13_prepare() { step f13-prepare; }
lab_install_admission() { step admission; }
scenario_f13_admission() { step f13-deny; }
attestations_authorize_results() { step authorize; }
scenario_l01_accept() { step l01; }
scenario_f11_admission() { step f11-update; }
scenario_l01_update() { step l01-update; }
cleanup() { event cleanup; return "$GP_CLEANUP_STATUS"; }
# jq only serializes the final report in this fixture. Any newly reached tool
# must fail explicitly instead of reaching a live registry, cluster or service.
jq() { event report; printf '{"status":"PASS","image":"%s"}\n' "$image"; }
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
for scenario in l01 f13 f11; do
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

for (const [stage, status, cleanupStatus] of [['analyze', 37, 0], ['verify', 41, 19], ['f13-deny', 42, 19]]) {
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
  });
}

test('prepare publishes outputs and preserves resources without authorizing results', (t) => {
  const f = fixture(t);
  const result = run(f, ['scripts/demo.sh', 'github', 'prepare']);
  assert.equal(result.status, 0, result.stderr);
  const outputs = Object.fromEntries(readFileSync(f.output, 'utf8').trim().split('\n').map((line) => line.split('=')));
  assert.deepEqual(outputs, {
    state_dir: shellPath(f.state), docker_config: `${shellPath(f.privateDir)}/docker`, image: repository, digest,
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
    'f13-deny', 'authorize', 'l01', 'f11-update', 'l01-update', 'report', 'cleanup',
  ]);
  for (const entry of result.events.slice(2)) assert.equal(entry.artifact, image, entry.stage);
  assert.deepEqual(JSON.parse(readFileSync(join(f.state, 'result.json'), 'utf8')), { status: 'PASS', image });
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
