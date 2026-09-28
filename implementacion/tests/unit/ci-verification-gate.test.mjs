// Synthetic registry/crypto responses exercise the real gate. Real Cosign and
// admission evidence is recorded separately; these tests make no trust claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyDelivery} from '../../scripts/ci-verification-gate.mjs';
import {fixture} from '../helpers/registry-fixture.mjs';
const signature = 'https://sigstore.dev/cosign/sign/v1';
const sbom = 'https://cyclonedx.org/bom', provenance = 'https://slsa.dev/provenance/v1';
const results = 'https://tfm-goldenpath.dev/attestations/verification-results/v1';
function setup(t, types = [signature, sbom, provenance]) {
  const directory = mkdtempSync(join(tmpdir(), 'ci-gate-'));
  t.after(() => rmSync(directory, {recursive:true, force:true}));
  const f = fixture({types});
  const calls = [];
  const options = {mode:'local', directory, prefix:'fresh', image:f.image};
  const dependencies = {download:() => f.run(), authenticate:async (_o, b, type) => { calls.push(type); return b; }};
  const run = () => verifyDelivery(options, dependencies);
  const report = () => JSON.parse(readFileSync(join(directory, 'fresh.result.json')));
  return {f, options, dependencies, calls, run, report, directory};
}
test('fresh complete signed candidate passes; each current bundle is authenticated', async t => {
  const f = setup(t);
  assert.equal((await f.run()).status, 'VERIFIED');
  assert.deepEqual([...f.calls].sort(), [signature, sbom, provenance].sort());
  assert.ok(f.f.calls.length > 3);
  await assert.rejects(f.run(), /EEXIST/);
});
for (const authorized of [false, true]) test(`only signature missing, valid attestations cannot substitute (authorized=${authorized})`, async t => {
  const f = setup(t, [sbom, provenance, ...(authorized ? [results] : [])]);
  f.options.phase = authorized ? 'authorized' : 'before-results';
  writeFileSync(join(f.directory, 'image.bundle.json'), 'stale signed artifact');
  writeFileSync(join(f.directory, 'verified-signature.json'), '{"status":"PASS"}');
  writeFileSync(join(f.directory, 'CI-delivery.result.json'), '{"status":"VERIFIED"}');
  assert.equal((await f.run()).status, 'MISSING_IMAGE_SIGNATURE');
  assert.equal(f.report().inventoryComplete, true);
  assert.deepEqual([...f.calls].sort(), [sbom, provenance, ...(authorized ? [results] : [])].sort());
});
for (const fault of ['registry', 'transport', 'malformed', 'digest', 'trust', 'missing-provenance', 'premature-results']) {
  test(`${fault} is an integration failure, never attributable absence`, async t => {
    const f = setup(t, fault === 'missing-provenance' ? [sbom] : fault === 'premature-results' ? [sbom, provenance, results] : [sbom, provenance]);
    if (['registry', 'transport'].includes(fault)) f.dependencies.download = async () => { throw new Error(fault); };
    if (fault === 'malformed') f.f.contents.set(f.f.layerPaths[0], {body:Buffer.from('{}'), type:'application/json'});
    if (fault === 'digest') f.options.image = f.options.image.replace(/a{64}$/, 'b'.repeat(64));
    if (fault === 'trust') f.dependencies.authenticate = () => { throw new Error('unauthorized key'); };
    await assert.rejects(f.run());
    assert.equal(f.report().status, 'INTEGRATION_FAILURE');
  });
}
test('restoration requires a new fetch and new authentication, not a saved acceptance', async t => {
  const f = setup(t);
  await f.run();
  const target = f.f.descriptors.shift();
  f.options.prefix = 'negative';
  assert.equal((await f.run()).status, 'MISSING_IMAGE_SIGNATURE');
  f.f.descriptors.unshift(target);
  f.options.prefix = 'restored';
  assert.equal((await f.run()).status, 'VERIFIED');
  assert.equal(f.calls.length, 8);
});

// Exercise the actual verifier adapter with a synthetic process boundary. This
// checks exact command arguments and content binding, not cryptographic validity.
import {authenticateBundle} from '../../scripts/ci-verification-gate.mjs';
for (const mode of ['local','github']) test(`gate verifier binds exact bundle, digest and ${mode} trust without issuance`,t=>{
  const f=setup(t);
  const bundle=f.f.bundles[0];
  const options={...f.options,mode,repository:'https://github.com/example/lab',commit:'b'.repeat(40),
    identity:'https://github.com/example/lab/.github/workflows/golden-path.yml@refs/heads/main',ref:'refs/heads/main'};
  let observed;
  const runner=(command,args)=>{observed={command,args}; return {status:0};};
  const result=authenticateBundle(options,bundle,signature,join(f.directory,'fresh.bundle.json'),join(f.directory,'adapter'),runner);
  assert.equal(result.predicateType,signature);
  assert.equal(observed.command,'cosign');
  const args=observed.args;
  assert.equal(args[0],'verify-blob-attestation');
  assert.equal(args[args.indexOf('--bundle')+1],join(f.directory,'fresh.bundle.json'));
  assert.equal(args[args.indexOf('--digest')+1],f.options.image.split('@sha256:')[1]);
  assert.equal(args[args.indexOf('--type')+1],signature);
  assert.equal(args.includes('--insecure-ignore-tlog'),mode==='local');
  assert.equal(args.includes('--key'),mode==='local');
  if(mode==='github') {
    assert.equal(args[args.indexOf('--certificate-identity')+1],options.identity);
    assert.equal(args[args.indexOf('--certificate-oidc-issuer')+1],'https://token.actions.githubusercontent.com');
    assert.equal(args.includes('--insecure-ignore-sct'),false);
  }
  assert.throws(()=>authenticateBundle(options,bundle,signature,'fresh',join(f.directory,'rejected'),()=>({status:19})),/Cryptographic verification failed/);
  const wrong={...options,image:options.image.replace(/a{64}$/,'b'.repeat(64))};
  assert.throws(()=>authenticateBundle(wrong,bundle,signature,'fresh',join(f.directory,'wrong'),runner),/required digest and type/);
});
test('hosted provenance uses the exact retrieved bundle with all existing identity/source constraints',t=>{
  const f=setup(t);
  const repository='https://github.com/example/lab',commit='b'.repeat(40),ref='refs/heads/main';
  const identity=repository+'/.github/workflows/golden-path.yml@'+ref;
  const options={...f.options,mode:'github',image:'ghcr.io/example/image@sha256:'+'a'.repeat(64),repository,commit,identity,ref};
  const output=[{verificationResult:{statement:{_type:'https://in-toto.io/Statement/v1',subject:[{name:'ghcr.io/example/image',digest:{sha256:'a'.repeat(64)}}],predicateType:provenance,predicate:{}},
    signature:{certificate:{subjectAlternativeName:identity,issuer:'https://token.actions.githubusercontent.com',sourceRepositoryURI:repository,sourceRepositoryDigest:commit,sourceRepositoryRef:ref,runnerEnvironment:'github-hosted'}},verifiedTimestamps:[{timestamp:'2026-09-28T00:00:00Z'}]}}];
  let observed;
  const runner=(command,args,{stdio})=>{observed={command,args}; writeFileSync(stdio[1],JSON.stringify(output)); return {status:0};};
  authenticateBundle(options,{},provenance,'retrieved.bundle.json',join(f.directory,'native'),runner);
  assert.equal(observed.command,'gh');
  for(const [flag,value] of [['--bundle','retrieved.bundle.json'],['--cert-identity',identity],['--source-digest',commit],['--source-ref',ref],['--repo','example/lab']])
    assert.equal(observed.args[observed.args.indexOf(flag)+1],value);
  assert.ok(observed.args.includes('--deny-self-hosted-runners'));
  assert.ok(!observed.args.includes('--bundle-from-oci'));
  output[0].verificationResult.signature.certificate.issuer='untrusted';
  assert.throws(()=>authenticateBundle(options,{},provenance,'retrieved.bundle.json',join(f.directory,'wrong-issuer'),runner),/issuer mismatch/);
});
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
test('normal results authorization stops at a failed real gate without invoking signing or promotion',t=>{
  const f=setup(t);
  // Invalid lane forces a deterministic real gate failure before network access.
  writeFileSync(join(f.directory,'state.json'),JSON.stringify({mode:'invalid',imageRepository:'invalid',digest:'sha256:'+'a'.repeat(64)}));
  const source=resolve(import.meta.dirname,'../..');
  const result=spawnSync('bash',['--noprofile','--norc','-c',`
set -Eeuo pipefail
source scripts/lib/attestations.sh
state_dir="$GP_STATE"
cosign() { echo forbidden-signing; return 91; }
attestations_authorize_results
echo forbidden-deployment
`],{cwd:source,env:{...process.env,GP_STATE:f.directory,BASH_ENV:''},encoding:'utf8'});
  assert.equal(result.status,1,result.stderr);
  assert.doesNotMatch(result.stdout,/forbidden/);
  assert.equal(JSON.parse(readFileSync(join(f.directory,'CI-authorization.result.json'))).status,'INTEGRATION_FAILURE');
});
