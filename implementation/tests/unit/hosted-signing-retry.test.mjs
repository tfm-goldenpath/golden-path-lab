// Synthetic Cosign process responses exercise the actual Bash helper. These
// tests cannot establish GitHub OIDC availability or cryptographic verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const source=resolve(import.meta.dirname,'../..');
function run(t,fault,mode='github') {
  const state=mkdtempSync(join(tmpdir(),'hosted-signing-'));
  t.after(()=>rmSync(state,{recursive:true,force:true}));
  const result=spawnSync('bash',['--noprofile','--norc','-c',String.raw`
set -Eeuo pipefail
source scripts/lib/attestations.sh
state_dir="$GP_STATE"; mode="$GP_MODE"; image=ghcr.io/example/image@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
calls=0
sleep() { echo "delay:$1" >> "$state_dir/events"; }
cosign() {
  calls=$((calls+1))
  printf '%s\n' "$*" >> "$state_dir/events"
  if [[ "$GP_FAULT" == success || ( "$GP_FAULT" == transient && "$calls" == 2 ) ]]; then
    echo '{}' > "$state_dir/image.bundle.json"
    echo 'Signing artifact...'
    return 0
  fi
  [[ "$GP_FAULT" == no-progress ]] || echo 'Generating ephemeral keys...'
  if [[ "$GP_FAULT" == partial ]]; then echo '{}' > "$state_dir/image.bundle.json"; fi
  if [[ "$GP_FAULT" == signing ]]; then echo 'Signing artifact...'; fi
  if [[ "$GP_FAULT" == upload ]]; then echo 'Pushing signature to: ghcr.io/example/image'; fi
  if [[ "$GP_FAULT" == other ]]; then echo 'certificate verification failed'; return 1; fi
  if [[ "$GP_FAULT" == bare-json ]]; then echo "invalid character 'u' looking for beginning of value"; return 1; fi
  echo "Error: signing [$image]: signing digest: getting keypair and token: retrieving ID token: reading ID token: fetching ambient OIDC credentials: invalid character 'u' looking for beginning of value"
  if [[ "$GP_FAULT" == signal ]]; then return 143; fi
  if [[ "$GP_FAULT" == exit2 ]]; then return 2; fi
  return 1
}
if [[ "$GP_FAULT" == existing ]]; then echo original > "$state_dir/image.bundle.json"; fi
attestations_sign_bundle image.bundle.json sign --yes --trusted-root "$state_dir/trusted-root.json"
echo downstream >> "$state_dir/events"
`],{cwd:source,env:{...process.env,GP_STATE:state,GP_FAULT:fault,GP_MODE:mode,BASH_ENV:''},encoding:'utf8',timeout:15000});
  assert.ifError(result.error);
  const events=existsSync(join(state,'events'))?readFileSync(join(state,'events'),'utf8').trim().split('\n'):[];
  return {...result,state,events,calls:events.filter(e=>e.startsWith('sign '))};
}
for(const fault of ['success','transient']) test(`hosted ${fault} token acquisition preserves signing arguments`,t=>{
  const r=run(t,fault);assert.equal(r.status,0,r.stderr);
  assert.equal(r.calls.length,fault==='success'?1:2);
  assert.equal(new Set(r.calls).size,1);
  assert.match(r.calls[0],/--trusted-root .* --bundle .*image.bundle.json ghcr.io\/example\/image@sha256:/);
  assert.ok(r.events.includes('downstream'));
  assert.equal(JSON.parse(readFileSync(join(r.state,'image.bundle.json.signing.json'))).status,'COMMAND_SUCCEEDED');
  if(fault==='transient') assert.match(readFileSync(join(r.state,'image.bundle.json.signing-attempt-1.log'),'utf8'),/fetching ambient OIDC credentials/);
});
test('persistent malformed token response stops after three attempts with original logs',t=>{
  const r=run(t,'persistent');assert.equal(r.status,1,r.stderr);assert.equal(r.calls.length,3);
  assert.deepEqual(r.events.filter(e=>e.startsWith('delay:')),['delay:2','delay:4']);
  assert.ok(!r.events.includes('downstream'));
  const report=JSON.parse(readFileSync(join(r.state,'image.bundle.json.signing.json')));
  assert.equal(report.status,'FAILED');assert.equal(report.attempts,3);
  for(let n=1;n<=3;n++) assert.ok(existsSync(join(r.state,`image.bundle.json.signing-attempt-${n}.log`)));
});
for(const fault of ['other','bare-json','partial','signing','upload','no-progress','signal','exit2']) test(`${fault} failure is never retried or promoted`,t=>{
  const r=run(t,fault);assert.notEqual(r.status,0,r.stderr);assert.equal(r.calls.length,1);
  assert.ok(!r.events.includes('downstream'));assert.ok(!r.events.some(e=>e.startsWith('delay:')));
});
test('local signing does not acquire hosted retry behavior',t=>{
  const r=run(t,'persistent','local');assert.equal(r.status,1,r.stderr);assert.equal(r.calls.length,1);
  assert.ok(!r.events.some(e=>e.startsWith('delay:')));
});
test('existing hosted bundle cannot be overwritten or reissued',t=>{
  const r=run(t,'existing');assert.notEqual(r.status,0);assert.equal(r.calls.length,0);
  assert.equal(readFileSync(join(r.state,'image.bundle.json'),'utf8'),'original\n');
});

for(const verificationFailure of [false,true]) test(`real results issuance retains mandatory verification (failure=${verificationFailure})`,t=>{
  const state=mkdtempSync(join(tmpdir(),'hosted-authorization-'));
  t.after(()=>rmSync(state,{recursive:true,force:true}));
  const result=spawnSync('bash',['--noprofile','--norc','-c',String.raw`
set -Eeuo pipefail
source scripts/lib/attestations.sh
state_dir="$GP_STATE"; mode=github; image=ghcr.io/example/image@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
digest=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
repository=https://github.com/example/lab; commit=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
results_type=https://tfm-goldenpath.dev/attestations/verification-results/v1
contract=synthetic-contract
sign_args=(--yes --trusted-root "$state_dir/sigstore-trusted-root.json")
event() { echo "$*" >> "$state_dir/events"; }
attestations_ci_gate() { event "gate:$*"; }
node() { event "node:$1"; echo '{}'; }
cosign() { event "cosign:$*"; echo '{}' > "$state_dir/results.bundle.json"; }
attestations_verify_bundle() { event "verify:$*"; [[ "$GP_VERIFY_FAILURE" != true ]] || return 37; }
attestations_authorize_results
event deployment
`],{cwd:source,env:{...process.env,GP_STATE:state,GP_VERIFY_FAILURE:String(verificationFailure),BASH_ENV:''},encoding:'utf8',timeout:15000});
  assert.ifError(result.error);assert.equal(result.status,verificationFailure?37:0,result.stderr);
  const events=readFileSync(join(state,'events'),'utf8').trim().split('\n');
  assert.equal(events[0],'gate:CI-authorization');
  const signing=events.filter(s=>s.startsWith('cosign:'));assert.equal(signing.length,1);
  assert.match(signing[0],/^cosign:attest --yes --trusted-root .* --type https:\/\/tfm-goldenpath.dev\/attestations\/verification-results\/v1/);
  assert.equal(events.filter(s=>s.startsWith('verify:')).length,1);
  assert.equal(events.includes('gate:CI-authorized authorized'),!verificationFailure);
  assert.equal(events.includes('deployment'),!verificationFailure);
});
