import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bash = process.env.BASH_BIN || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const imageRepository = 'registry.invalid/quotes-node';
const initialDigest = `sha256:${'a'.repeat(64)}`;
const replacementDigest = `sha256:${'b'.repeat(64)}`;
const initialImage = `${imageRepository}@${initialDigest}`;
const replacementImage = `${imageRepository}@${replacementDigest}`;
const shellPath = value => value.replaceAll('\\', '/');

// Exercise the real scenario functions and rollout validator. Only their build,
// signing, scanning and cluster dependencies are controlled fixtures: these are
// orchestration regressions, not cryptographic or Kubernetes integration tests.
const driver = String.raw`
set -Eeuo pipefail
source "$GP_SOURCE_ROOT/scripts/lib/context.sh"
source "$GP_SOURCE_ROOT/tests/scenarios/l01.sh"
state_dir="$GP_FIXTURE_STATE"; mode="$GP_MODE"; id=run-parent; port_pid=''; image=''
event() {
  local detail=''
  [[ "$#" -lt 2 ]] || detail=$2
  printf '%s|%s|%s|%s\n' "$1" "$state_dir" "$image" "$detail" >> "$GP_EVENTS"
}
step() {
  event "$@"
  if [[ "$GP_FAIL_STAGE" == "$1" ]]; then return 37; fi
}
record() { :; }
get() { command node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))[process.argv[2]])' "$state_dir/state.json" "$1"; }
put() {
  command node -e 'const fs=require("fs"), p=process.argv[1], v=JSON.parse(fs.readFileSync(p,"utf8")); v[process.argv[2]]=process.argv[3]; fs.writeFileSync(p,JSON.stringify(v));' "$state_dir/state.json" "$1" "$2"
}

delivery_build() {
  step build "$id"
  digest="$GP_REPLACEMENT_DIGEST"
  put digest "$digest"
}
delivery_render_manifests() {
  step manifests
  printf '{"image":"%s"}\n' "$image" > "$state_dir/tfm-golden.json"
}
delivery_check_manifest() {
  step manifest-policy
  printf '{"image":"%s","status":"PASS"}\n' "$image" > "$state_dir/manifest-policy.json"
}
delivery_analyze() {
  step analyze
  printf '{"image":"%s","freshScan":true}\n' "$image" > "$state_dir/vulnerabilities.json"
  printf '{"image":"%s","freshSbom":true}\n' "$image" > "$state_dir/sbom.cdx.json"
  put sbomVersion "$GP_SBOM_VERSION"
}
attestations_issue_delivery() {
  step issue
  printf '{"image":"%s","verified":true}\n' "$image" > "$state_dir/verified-signature.json"
  printf '{"image":"%s","verified":true}\n' "$image" > "$state_dir/verified-provenance.json"
}
attestations_ci_gate() { step verify; }
scenario_f07_ci() {
  step f07-ci
  step f07-ci-restore
  attestations_ci_gate CI-F07-restored
  mkdir "$state_dir/F07-CI"
  command jq -n '{status:"CI_REJECTION_AND_RECOVERY"}' > "$state_dir/F07-CI/result.json"
}
scenario_f08() {
  step "f08-$1"
  local folder=F08-CI
  [[ "$1" != authorized ]] || folder=F08-admission
  mkdir "$state_dir/$folder"
  command jq -n '{status:"REJECTION_AND_RECOVERY"}' > "$state_dir/$folder/result.json"
}
attestations_authorize_results() {
  step authorize
  printf '{"image":"%s","authorized":true}\n' "$image" > "$state_dir/verified-results.json"
}
actor() {
  [[ "$#" == 4 && "$1" == tfm-golden && "$2" == apply && "$3" == -f && "$4" == "$state_dir/tfm-golden.json" ]] || fail 'Unexpected apply arguments'
  step apply "$4"
  command node -e 'if(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).image!==process.argv[2]) process.exit(48)' "$4" "$image"
  printf 'deployment.apps/quotes-node configured\n'
}
probe() {
  [[ "$1" == tfm-golden ]] || fail 'Unexpected probe namespace'
  # No real process is started; the fake PID tests the scenario-owned exit trap.
  if [[ "$GP_FAIL_STAGE" == probe ]]; then port_pid=424242; fi
  step probe
  cp "$GP_FIXTURE_STATE/tfm-reference-quote.json" "$state_dir/tfm-golden-quote.json"
}
kill() { event stop-port-forward "$*"; }
wait() { event wait-port-forward "$*"; }
k() {
  if [[ "$*" == '-n tfm-golden get deployment quotes-node -o json' ]]; then
    step deployment
    cat "$GP_FIXTURE_ROOT/deployment.json"
  elif [[ "$*" == '-n tfm-golden get pods -l app=quotes-node -o json' ]]; then
    step pods
    cat "$GP_FIXTURE_ROOT/pods.json"
  else
    fail 'Unexpected cluster read'
  fi
}
node() {
  [[ "$1" == scripts/check-image-rollout.mjs ]] || fail 'Unexpected scenario Node invocation'
  event rollout-check "$*"
  command node "$@"
}
load_delivery_context
trap 'event parent-cleanup' EXIT
scenario_l01_prepare_update
printf '%s\n%s\n%s\n%s\n' "$state_dir" "$image" "$digest" "$id" > "$GP_FIXTURE_ROOT/after-prepare.txt"
if [[ "$GP_PHASE" == both ]]; then
  scenario_l01_update
  printf '%s\n%s\n%s\n%s\n' "$state_dir" "$image" "$digest" "$id" > "$GP_FIXTURE_ROOT/after-update.txt"
fi
`;

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'gp-l01-update-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('gp-l01-update-'));
    rmSync(root, { recursive: true, force: true });
  });
  const state = join(root, 'run-parent');
  mkdirSync(state);
  const stateText = JSON.stringify({ imageRepository, digest: initialDigest,
    sourceRepository: 'https://github.com/example/lab', sourceCommit: 'c'.repeat(40), sbomVersion: '1.6' });
  writeFileSync(join(state, 'state.json'), stateText);
  for (const name of ['unit-tests.log', 'workflow-policy.json', 'versions.txt', 'tools-lock.json']) {
    writeFileSync(join(state, name), `shared-source-evidence:${name}\n`);
  }
  for (const name of ['sbom.cdx.json', 'vulnerabilities.json', 'verified-results.json', 'verified-provenance.json']) {
    writeFileSync(join(state, name), JSON.stringify({ image: initialImage, parentOnly: true }));
  }
  writeFileSync(join(state, 'tfm-reference-quote.json'), '{"currency":"EUR","premiumCents":1000,"tariffVersion":"demo-v1"}\n');
  const deployment = {
    metadata: { name: 'quotes-node', namespace: 'tfm-golden', generation: 2 },
    spec: { replicas: 1, template: { spec: { containers: [{ name: 'quotes-node', image: replacementImage }] } } },
    status: { observedGeneration: 2, replicas: 1, updatedReplicas: 1, readyReplicas: 1, availableReplicas: 1 },
  };
  const pods = { items: [{
    metadata: { name: 'replacement-pod', uid: 'replacement-uid', namespace: 'tfm-golden', labels: { app: 'quotes-node' } },
    spec: { containers: [{ name: 'quotes-node', image: replacementImage }] },
    status: { phase: 'Running', conditions: [{ type: 'Ready', status: 'True' }], containerStatuses: [{
      name: 'quotes-node', ready: true, state: { running: {} }, imageID: `docker-pullable://${replacementImage}`,
    }] },
  }] };
  writeFileSync(join(root, 'deployment.json'), JSON.stringify(deployment));
  writeFileSync(join(root, 'pods.json'), JSON.stringify(pods));
  const events = join(root, 'events.log');
  const output = join(root, 'github-output');
  writeFileSync(events, '');
  writeFileSync(output, '');
  return { root, state, stateText, events, output, pods };
}

function run(f, overrides = {}) {
  const env = { ...process.env, GP_SOURCE_ROOT: shellPath(sourceRoot), GP_FIXTURE_ROOT: shellPath(f.root),
    GP_FIXTURE_STATE: shellPath(f.state), GP_EVENTS: shellPath(f.events), GITHUB_OUTPUT: shellPath(f.output),
    GP_MODE: 'github', GP_PHASE: 'both', GP_REPLACEMENT_DIGEST: replacementDigest, GP_SBOM_VERSION: '1.6', GP_FAIL_STAGE: '', ...overrides };
  delete env.BASH_ENV;
  delete env.ENV;
  const result = spawnSync(bash, ['--noprofile', '--norc', '-c', driver], {
    cwd: sourceRoot, env, encoding: 'utf8', timeout: 20_000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  const events = readFileSync(f.events, 'utf8').trim().split('\n').filter(Boolean).map(line => {
    const [stage, state, image, detail] = line.split('|');
    return { stage, state, image, detail };
  });
  assert.equal(readFileSync(join(f.state, 'state.json'), 'utf8'), f.stateText, 'Parent state must not be rewritten');
  assert.deepEqual(events.filter(e => e.stage === 'parent-cleanup').map(e => e.state), [shellPath(f.state)],
    'Only the parent owns infrastructure cleanup, including on child failure');
  return { ...result, events, stages: events.map(e => e.stage) };
}

for (const mode of ['local', 'github']) {
  test(`real L01 scenario replaces the image with separate evidence and isolated parent state (${mode})`, t => {
    const f = fixture(t);
    const result = run(f, { GP_MODE: mode });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(result.stages, ['build', 'manifests', 'manifest-policy', 'analyze', 'issue', ...(mode === 'local' ? ['f07-ci', 'f07-ci-restore'] : []), 'verify', ...(mode === 'local' ? ['f08-before-results'] : []), 'authorize', ...(mode === 'local' ? ['f08-authorized'] : []),
      'apply', 'probe', 'deployment', 'pods', 'rollout-check', 'parent-cleanup']);
    const child = join(f.state, 'L01-update');
    assert.equal(JSON.parse(readFileSync(join(child, 'state.json'), 'utf8')).digest, replacementDigest);
    for (const name of ['sbom.cdx.json', 'vulnerabilities.json', 'verified-results.json', 'verified-provenance.json']) {
      const evidence = JSON.parse(readFileSync(join(child, name), 'utf8'));
      assert.equal(evidence.image, replacementImage);
      assert.equal(evidence.parentOnly, undefined, 'Image-specific evidence must not be copied');
      assert.equal(JSON.parse(readFileSync(join(f.state, name), 'utf8')).image, initialImage);
    }
    for (const name of ['unit-tests.log', 'workflow-policy.json', 'versions.txt', 'tools-lock.json']) {
      assert.equal(readFileSync(join(child, name), 'utf8'), readFileSync(join(f.state, name), 'utf8'));
    }
    assert.equal(result.events.find(e => e.stage === 'build').detail, 'run-parent-update');
    for (const stage of ['verify', 'authorize', 'apply', 'probe', 'rollout-check']) {
      const event = result.events.find(e => e.stage === stage);
      assert.equal(event.image, replacementImage);
      assert.equal(event.state, shellPath(child));
    }
    for (const file of ['after-prepare.txt', 'after-update.txt']) {
      assert.equal(readFileSync(join(f.root, file), 'utf8'), `${shellPath(f.state)}\n${initialImage}\n${initialDigest}\nrun-parent\n`);
    }
    const report = JSON.parse(readFileSync(join(f.state, 'L01-image-update.json'), 'utf8'));
    assert.equal(report.status, 'PASS');
    assert.equal(report.fromImage, initialImage);
    assert.equal(report.toImage, replacementImage);
    assert.equal(report.pods[0].uid, 'replacement-uid');
    const l04 = JSON.parse(readFileSync(join(f.state, 'L04-result.json')));
    assert.equal(l04.image, replacementImage);
    assert.equal(l04.sharedExecution, 'L01-image-update');
    assert.equal(JSON.parse(readFileSync(join(f.state, 'F07-CI-completed.json'))).status, mode === 'local' ? 'CI_REJECTION_AND_L04_ACCEPTANCE_COMPLETE' : 'NOT_EXECUTED');
    assert.equal(readFileSync(f.output, 'utf8'), mode === 'github'
      ? `update_image=${imageRepository}\nupdate_digest=${replacementDigest}\n` : '');
  });
}

for (const stage of ['build', 'manifest-policy', 'analyze', 'issue', 'f07-ci', 'f07-ci-restore', 'f08-before-results', 'f08-authorized', 'verify', 'authorize', 'apply', 'probe']) {
  test(`real L01 scenario propagates ${stage} failure without reaching later delivery steps`, t => {
    const f = fixture(t);
    const result = run(f, { GP_FAIL_STAGE: stage, GP_MODE:'local' });
    assert.equal(result.status, 37, result.stdout + result.stderr);
    assert.ok(result.stages.includes(stage));
    assert.ok(!result.stages.includes('rollout-check'));
    if (['build', 'manifest-policy', 'analyze', 'issue', 'verify', 'f07-ci', 'f07-ci-restore', 'f08-before-results', 'f08-authorized', 'authorize'].includes(stage)) {
      assert.ok(!result.stages.includes('apply'), 'A failed prerequisite must prevent deployment');
    }
    if (stage === 'verify') assert.ok(!result.stages.includes('authorize'));
    if (stage === 'apply') assert.ok(!result.stages.includes('probe'));
    if (stage === 'probe') {
      assert.equal(result.events.find(e => e.stage === 'stop-port-forward').detail, '424242');
      assert.equal(result.events.find(e => e.stage === 'wait-port-forward').detail, '424242');
    }
    assert.ok(!existsSync(join(f.state, 'L01-image-update.json')));
  });
}

test('replacement preparation refuses an unchanged digest before scanning or signing', t => {
  const f = fixture(t);
  const result = run(f, { GP_REPLACEMENT_DIGEST: initialDigest });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /different replacement digest/);
  assert.deepEqual(result.stages, ['build', 'parent-cleanup']);
  assert.equal(readFileSync(f.output, 'utf8'), '');
});

test('replacement preparation refuses an SBOM schema outside the installed admission contract', t => {
  const f = fixture(t);
  const result = run(f, { GP_SBOM_VERSION: '1.7' });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Replacement SBOM schema differs/);
  assert.ok(!result.stages.includes('verify'));
  assert.equal(readFileSync(f.output, 'utf8'), '');
});

test('the real rollout checker prevents PASS when admission succeeds but the old digest is running', t => {
  const f = fixture(t);
  f.pods.items[0].status.containerStatuses[0].imageID = `docker-pullable://${initialImage}`;
  writeFileSync(join(f.root, 'pods.json'), JSON.stringify(f.pods));
  const result = run(f);
  assert.equal(result.status, 1, result.stderr);
  assert.ok(result.stages.includes('apply'));
  assert.ok(result.stages.includes('rollout-check'));
  assert.match(result.stderr, /Pod is not ready on the replacement image digest/);
  assert.equal(readFileSync(join(f.state, 'L01-image-update.json'), 'utf8'), '');
  assert.ok(!existsSync(join(f.root, 'after-update.txt')));
});
