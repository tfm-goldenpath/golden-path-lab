import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statementFromVerifiedBundle } from '../../scripts/verified-bundle-statement.mjs';
import { CHECKS, RESULTS_TYPE, checkStatements, validateResults } from '../../scripts/lab-contracts.mjs';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bash = process.env.BASH_BIN || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const shellPath = value => value.replaceAll('\\', '/');
const digest = `sha256:${'a'.repeat(64)}`;
const repository = 'https://github.com/example/lab';
const commit = 'b'.repeat(40);
const imageType = 'https://sigstore.dev/cosign/sign/v1';
const sbomType = 'https://cyclonedx.org/bom';
const provenanceType = 'https://slsa.dev/provenance/v1';
const results = result => ({ policyVersion:'golden-path-v1', source:{repository,commit}, result,
  checks:Object.fromEntries(CHECKS.map(check => [check, 'PASS'])) });
const bundle = (type, predicate) => ({
  mediaType:'application/vnd.dev.sigstore.bundle.v0.3+json',
  verificationMaterial:{publicKey:{hint:'synthetic-unit-test-key'}},
  dsseEnvelope:{payloadType:'application/vnd.in-toto+json', signatures:[{sig:'c3ludGhldGlj'}],
    payload:Buffer.from(JSON.stringify({_type:'https://in-toto.io/Statement/v1',
      subject:[{digest:{sha256:digest.slice(7)}}], predicateType:type, predicate})).toString('base64')},
});
const component = {name:'fixture',type:'application'};

test('content extraction retains the same saved statement for every locally signed evidence type', () => {
  for (const [type, predicate] of [
    [imageType, {}],
    [sbomType, {bomFormat:'CycloneDX',specVersion:'1.7',version:1,metadata:{component},components:[component]}],
    [provenanceType, {buildDefinition:{externalParameters:{workflow:{repository}},resolvedDependencies:[{digest:{gitCommit:commit}}]}}],
    [RESULTS_TYPE, results('PASS')],
  ]) {
    const saved = bundle(type, predicate);
    const statement = statementFromVerifiedBundle(JSON.stringify(saved), digest, type, repository, commit);
    assert.deepEqual(statement, JSON.parse(Buffer.from(saved.dsseEnvelope.payload, 'base64').toString('utf8')));
  }
});

test('saved bundle content rejects a different subject/type and unacceptable predicates', () => {
  const saved = bundle(RESULTS_TYPE, results('PASS'));
  assert.throws(() => statementFromVerifiedBundle(JSON.stringify(saved), `sha256:${'c'.repeat(64)}`, RESULTS_TYPE, repository, commit));
  assert.throws(() => statementFromVerifiedBundle(JSON.stringify(saved), digest, imageType, repository, commit));
  for (const [type, predicate] of [
    [RESULTS_TYPE, results('FAIL')], [sbomType, {bomFormat:'CycloneDX',specVersion:'1.7'}],
    [provenanceType, {buildDefinition:{externalParameters:{workflow:{repository:'other'}}}}],
  ]) {
    assert.throws(() => statementFromVerifiedBundle(JSON.stringify(bundle(type, predicate)), digest, type, repository, commit),
      /authorized contract|Incomplete CycloneDX|Incorrect build origin/);
  }
});

test('an extra payload cannot replace the authenticated outer statement with nested PASS content', () => {
  const inner = JSON.parse(Buffer.from(bundle(RESULTS_TYPE, results('PASS')).dsseEnvelope.payload, 'base64').toString('utf8'));
  for (const [label, mutate, error] of [
    ['failed result', statement => { statement.predicate.result = 'FAIL'; }, /authorized contract/],
    ['wrong subject', statement => { statement.subject[0].digest.sha256 = 'c'.repeat(64); }, /required digest and type/],
    ['wrong predicate type', statement => { statement.predicateType = imageType; }, /required digest and type/],
  ]) {
    const saved = bundle(RESULTS_TYPE, results('PASS'));
    const outer = JSON.parse(Buffer.from(saved.dsseEnvelope.payload, 'base64').toString('utf8'));
    mutate(outer);
    outer.payload = Buffer.from(JSON.stringify(inner)).toString('base64');
    saved.dsseEnvelope.payload = Buffer.from(JSON.stringify(outer)).toString('base64');
    assert.throws(() => statementFromVerifiedBundle(JSON.stringify(saved), digest, RESULTS_TYPE, repository, commit), error, label);
  }
});

test('saved statement validation requires a canonical expected digest', () => {
  const saved = JSON.stringify(bundle(RESULTS_TYPE, results('PASS')));
  for (const invalid of [null, '', 'a'.repeat(64), 'sha256:' + 'A'.repeat(64), 'sha256:' + 'a'.repeat(63), digest + '\n']) {
    assert.throws(() => statementFromVerifiedBundle(saved, invalid, RESULTS_TYPE, repository, commit), /canonical SHA-256 digest/);
  }
});

test('classic output, bundle collections and malformed saved wrappers cannot replace the authenticated bundle', () => {
  const saved = bundle(RESULTS_TYPE, results('PASS'));
  for (const candidate of [saved.dsseEnvelope, [saved], null, {...saved, verificationMaterial:{}}]) {
    assert.throws(() => statementFromVerifiedBundle(JSON.stringify(candidate), digest, RESULTS_TYPE, repository, commit));
  }
});

for (const authenticationStatus of [0, 19]) {
  test(`results authorization cannot substitute alternate PASS registry content (authentication status ${authenticationStatus})`, t => {
    // Authentication is stubbed here to isolate orchestration and content binding.
    // The separate Cosign integration suite exercises real cryptography.
    const root = mkdtempSync(join(tmpdir(), 'gp-bundle-binding-'));
    t.after(() => {
      assert.equal(dirname(resolve(root)), resolve(tmpdir()));
      assert.ok(basename(root).startsWith('gp-bundle-binding-'));
      rmSync(root, {recursive:true,force:true});
    });
    const state = join(root, 'state');
    mkdirSync(state);
    for (const file of ['unit-tests.log', 'manifest-policy.json', 'workflow-policy.json', 'vulnerability-policy.json',
      'verified-signature.json', 'verified-sbom.json', 'verified-provenance.json']) writeFileSync(join(state,file), '{}\n');
    const saved = bundle(RESULTS_TYPE, results('FAIL'));
    const alternate = bundle(RESULTS_TYPE, results('PASS')).dsseEnvelope;
    checkStatements(JSON.stringify(alternate), digest, RESULTS_TYPE, predicate => validateResults(predicate,repository,commit));
    writeFileSync(join(root,'saved.json'), JSON.stringify(saved));
    writeFileSync(join(root,'alternate.json'), JSON.stringify(alternate));
    writeFileSync(join(root,'commands.log'), '');
    const env = {...process.env, GP_NODE:shellPath(process.execPath), GP_SOURCE:shellPath(sourceRoot),
      GP_PROBE:shellPath(root), GP_STATE:shellPath(state), GP_AUTH_STATUS:String(authenticationStatus)};
    delete env.BASH_ENV;
    delete env.ENV;
    const run = spawnSync(bash, ['--noprofile','--norc','-c',String.raw`
set -Eeuo pipefail
source "$GP_SOURCE/scripts/lib/attestations.sh"
state_dir="$GP_STATE"; contract="$GP_SOURCE/scripts/lab-contracts.mjs"
mode=local; repository=https://github.com/example/lab
commit=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
digest=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
image="registry.invalid/lab@$digest"
results_type=https://tfm-goldenpath.dev/attestations/verification-results/v1
sign_args=(--yes); verify_args=(--key fixture.pub)
# Gate behavior has its own regressions; isolate post-issuance content binding.
attestations_ci_gate() { :; }
node() { "$GP_NODE" "$@"; }
cosign() {
  printf '%s\n' "$1" >> "$GP_PROBE/commands.log"
  case "$1" in
    attest) cp "$GP_PROBE/saved.json" "$state_dir/results.bundle.json" ;;
    verify-blob-attestation) return "$GP_AUTH_STATUS" ;;
    verify-attestation) cat "$GP_PROBE/alternate.json" ;;
    *) return 91 ;;
  esac
}
attestations_authorize_results
`], {cwd:sourceRoot,env,encoding:'utf8',timeout:15_000});
    assert.ifError(run.error);
    assert.equal(run.signal,null,run.stderr);
    assert.equal(run.status,authenticationStatus || 1,run.stderr);
    assert.deepEqual(readFileSync(join(root,'commands.log'),'utf8').trim().split('\n'), ['attest','verify-blob-attestation']);
    if (authenticationStatus) assert.ok(!existsSync(join(state,'verified-results.json')));
    else {
      assert.match(run.stderr,/Authenticated bundle content failed/);
      assert.equal(readFileSync(join(state,'verified-results.json'),'utf8'),'');
    }
    assert.ok(!existsSync(join(state,'evidence-profile.json')));
  });
}
