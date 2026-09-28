// Synthetic external responses exercise the real F07 preparation, classifier and
// recovery functions. They do not establish registry compatibility or admission.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, openSync, closeSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fixture} from '../helpers/registry-fixture.mjs';
const source = resolve(import.meta.dirname, '../..');
const types = ['https://sigstore.dev/cosign/sign/v1', 'https://cyclonedx.org/bom', 'https://slsa.dev/provenance/v1',
  'https://tfm-goldenpath.dev/attestations/verification-results/v1'];
const reason = 'image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found';
const denial = (rule = 'autogen-require-image-signature', message = reason) => `resource Deployment/tfm-golden/quotes-node was blocked due to the following policies\n\ntfm-signature:\n  ${rule}: '${message}'\n`;
async function run(t, options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gp-f07-synthetic-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const state = join(root, 'run-fixture'); mkdirSync(state);
  const f = fixture({types});
  const before = await f.run(); f.descriptors.splice(0, 1);
  const negative = await f.run();
  writeFileSync(join(root, 'before.json'), JSON.stringify(before));
  writeFileSync(join(root, 'negative.json'), JSON.stringify(negative));
  writeFileSync(join(root, 'response.log'), options.response ?? denial());
  writeFileSync(join(state, 'state.json'), JSON.stringify({imageRepository:f.image.split('@')[0],digest:f.image.split('@')[1]}));
  const env = {...process.env, GP_FIXTURE:root, GP_SOURCE:source, GP_IMAGE:f.image,
    GP_FAIL:options.fail ?? '', GP_CHANGE:options.change ?? '', GP_ACTOR_STATUS:String(options.actorStatus ?? 1), GP_RECOVERY_FAIL:options.restoreFail ? '1' : '0'};
  delete env.BASH_ENV; delete env.ENV;
  const output = openSync(join(root, 'stdout.log'), 'w'), errors = openSync(join(root, 'stderr.log'), 'w');
  const result = spawnSync('bash', ['--noprofile', '--norc', '-c', String.raw`
set -Eeuo pipefail
cd "$GP_SOURCE"
source scripts/lib/context.sh
source tests/scenarios/f13.sh
source tests/scenarios/f07.sh
state_dir="$GP_FIXTURE/run-fixture"; mode=local; image="$GP_IMAGE"; image_repo="\${image%@*}"; digest="\${image#*@}"
registry=tfm-zot-run-fixture; cluster=tfm-demo-run-fixture
record() { :; }
event() { echo "$1" >> "$GP_FIXTURE/events"; }
docker() {
  if [[ "$3" == *IPAddress* ]]; then echo 172.18.0.2; else echo tfm-demo-run-fixture; fi
}
k() { echo '{"items":[{"metadata":{"name":"kyverno-admission-controller"},"spec":{"template":{"spec":{"containers":[{"name":"kyverno","args":["--imageVerifyCacheEnabled=false"]}]}}}}]}'; }
attestations_verify_bundle() { event verify; [[ "$GP_FAIL" != verify ]] || return 31; }
actor() {
  event actor
  cat "$GP_FIXTURE/response.log"
  if [[ "$GP_FAIL" == interrupt ]]; then kill -TERM "$BASHPID"; fi
  return "$GP_ACTOR_STATUS"
}
node() {
  [[ "$1" == scripts/f07-signature-evidence.mjs ]] || { command node "$@"; return; }
  local operation=$2 phase=\${5:-}
  event "\${phase:-$operation}"
  [[ "$GP_FAIL" != "\${phase:-$operation}" ]] || return 37
  if [[ "$operation" == restore && "$GP_RECOVERY_FAIL" == 1 ]]; then return 43; fi
  if [[ "$operation" == snapshot ]]; then
    # Keep actual contract/inventory validators in the synthetic path.
    command node --input-type=module - "$GP_FIXTURE" "$GP_SOURCE" "$phase" "$image" <<'NODE'
import {readFileSync, writeFileSync} from 'node:fs';
const [root, source, phase, image] = process.argv.slice(2);
const {validateBackup, checkAlteration} = await import(source + '/scripts/f07-signature-evidence.mjs');
const before = JSON.parse(readFileSync(root + '/before.json'));
const current = JSON.parse(readFileSync(root + (['before','restored'].includes(phase) ? '/before.json' : '/negative.json')));
if (process.env.GP_CHANGE === phase) current.inventory.descriptors.pop();
if (phase === 'before') validateBackup(current, image);
else checkAlteration(before, current, image, phase === 'restored');
writeFileSync(root + '/run-fixture/F07/' + phase + '.json', JSON.stringify(current));
NODE
  fi
}
scenario_f07_admission
 event returned
` .replaceAll('\\' + '$', '$')], {env, encoding:'utf8', timeout:15000, stdio:['ignore', output, errors]});
  closeSync(output); closeSync(errors);
  result.stdout = readFileSync(join(root, 'stdout.log'), 'utf8');
  result.stderr = readFileSync(join(root, 'stderr.log'), 'utf8');
  assert.ifError(result.error);
  // This function only establishes the intermediate observation. Package it as
  // incomplete even when rejection/restoration succeeds; L01 has not run here.
  const packaged = spawnSync('python3', [source + '/scripts/package-evidence.py', state, root + '/packages', 'FAIL'], {encoding:'utf8'});
  assert.equal(packaged.status, 0, packaged.stderr);
  const audit = spawnSync('python3', ['-c', `
import hashlib,sys,tarfile
with tarfile.open(sys.argv[1]) as archive:
    prefix='run-fixture/'
    for line in archive.extractfile(prefix+'SHA256SUMS.txt').read().decode().splitlines():
        digest,name=line.split('  ',1)
        assert hashlib.sha256(archive.extractfile(prefix+name).read()).hexdigest()==digest
    for name in ('recovery.json','admission.json','attribution.json','restore.log','result.json'):
        from pathlib import Path
        if Path(sys.argv[2]+'/F07/'+name).is_file():
            assert archive.extractfile(prefix+'F07/'+name).read()==Path(sys.argv[2]+'/F07/'+name).read_bytes()
`, root + '/packages/run-fixture.tar.gz', state], {encoding:'utf8'});
  assert.equal(audit.status, 0, audit.stderr);
  assert.equal(JSON.parse(readFileSync(join(state, 'execution-summary.json'))).status, 'FAIL');
  return {...result, state, events:readFileSync(join(root, 'events'), 'utf8').trim().split('\n')};
}
for (const rule of ['require-image-signature', 'autogen-require-image-signature']) {
  test(`F07 strictly attributes ${rule} and restores before returning`, async t => {
    const result = await run(t, {response:denial(rule)});
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(result.events, ['before', 'verify', 'verify', 'verify', 'verify', 'remove', 'negative', 'actor', 'after-denial', 'restore', 'restored', 'returned']);
    assert.equal(JSON.parse(readFileSync(join(result.state,'F07/attribution.json'))).rule, rule);
    assert.equal(JSON.parse(readFileSync(join(result.state,'F07/result.json'))).rule, rule);
    assert.equal(JSON.parse(readFileSync(join(result.state,'F07/result.json'))).sameDigestL01, 'pending');
  });
}
for (const [label, options] of [
  ['unexpected admission', {actorStatus:0}],
  ['additional policy', {response:denial() + 'tfm-results:\n  require-results: failed\n'}],
  ['wrong rule', {response:denial('require-results')}],
  ['certificate error', {response:denial(undefined, 'x509: certificate signed by unknown authority')}],
  ['generic missing signature', {response:denial(undefined, 'no matching signatures found')}],
  ['transport error', {response:'Unable to connect to the server: timeout'}],
  ['unreadable inventory', {fail:'negative'}],
  ['changing post-request inventory', {change:'after-denial'}],
  ['missing non-target before request', {change:'negative'}],
  ['post-request inventory error', {fail:'after-denial'}],
  ['uncertain DELETE failure', {fail:'remove'}],
  ['interruption', {fail:'interrupt'}],
  ['restoration failure', {restoreFail:true}],
  ['primary and restoration failures', {fail:'negative',restoreFail:true}],
]) {
  test(`F07 retains failure and recovers: ${label}`, async t => {
    const result = await run(t, options);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.ok(result.events.includes('restore'));
    assert.ok(!result.events.includes('returned'));
    assert.equal(existsSync(join(result.state,'F07/result.json')), false);
    const recovery = JSON.parse(readFileSync(join(result.state,'F07/recovery.json')));
    assert.equal(recovery.restorationStatus, options.restoreFail ? 43 : 0);
    if (options.fail === 'negative') assert.equal(recovery.originalStatus, 37);
    if (options.fail === 'interrupt') assert.equal(recovery.originalStatus, 143);
    if (options.actorStatus === 0) assert.equal(JSON.parse(readFileSync(join(result.state,'F07/admission.json'))).observation, 'UNEXPECTED_ADMISSION');
  });
}
test('failed cryptographic verification stops before mutation and admission', async t => {
  const result = await run(t, {fail:'verify'});
  assert.equal(result.status, 31, result.stderr);
  assert.deepEqual(result.events, ['before', 'verify']);
});
