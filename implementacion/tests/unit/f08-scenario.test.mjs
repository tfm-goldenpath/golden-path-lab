// Real scenario with synthetic external registry/gate responses. The separate
// gate tests exercise retrieval/crypto orchestration; live runs establish trust.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const source=resolve(import.meta.dirname,'../..');
function run(t, fail='', restoreFail=false, profile='before-results') {
  const root=mkdtempSync(join(tmpdir(),'f08-ci-scenario-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const parent=join(root,'run-fixture'), state=join(parent,'L01-update');
  mkdirSync(state,{recursive:true});
  const env={...process.env,GP_SOURCE:source,GP_STATE:state,GP_ROOT:root,GP_FAIL:fail,GP_RESTORE_FAIL:String(restoreFail),GP_PROFILE:profile};
  delete env.BASH_ENV; delete env.ENV;
  const result=spawnSync('bash',['--noprofile','--norc','-c',String.raw`
set -Eeuo pipefail
cd "$GP_SOURCE"
source scripts/lib/context.sh
source tests/scenarios/f13.sh
source tests/scenarios/f08.sh
state_dir="$GP_STATE"; mode=local; registry=tfm-zot-run-fixture; cluster=tfm-demo-run-fixture
image_repo=172.18.0.2:5000/quotes-node-run-fixture
image="$image_repo@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
event() { echo "$1" >> "$GP_ROOT/events"; }
docker() { if [[ "$3" == *IPAddress* ]]; then echo 172.18.0.2; else echo tfm-demo-run-fixture; fi; }
k() {
  if [[ "$*" == *deployments* ]]; then
    echo '{"items":[{"metadata":{"name":"kyverno-admission-controller"},"spec":{"template":{"spec":{"containers":[{"name":"kyverno","args":["--imageVerifyCacheEnabled=false"]}]}}}}]}'
  else echo '{"items":[]}'; fi
}
actor() {
  if [[ "$*" == *dry-run* ]]; then event positive; [[ "$GP_FAIL" != positive ]]; return; fi
  event admission
  if [[ "$GP_FAIL" == admitted ]]; then return 0; fi
  if [[ "$GP_FAIL" == transport ]]; then echo 'registry connection refused'; return 1; fi
  echo 'Error from server: admission webhook "validate.kyverno.svc-fail" denied the request:'
  echo 'resource Deployment/tfm-golden/quotes-node was blocked due to the following policies'
  echo 'tfm-signature:'
  echo '  autogen-require-image-signature: image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found'
  if [[ "$GP_FAIL" == additional-policy ]]; then echo 'tfm-other:'; echo '  other-rule: forbidden'; fi
  return 1
}
attestations_ci_gate() { node scripts/ci-verification-gate.mjs "$state_dir" "$1" before-results; }
node() {
  local stage
  if [[ "$1" == scripts/ci-verification-gate.mjs ]]; then stage=$3; else stage=$2; [[ "$stage" != snapshot ]] || stage=$5; fi
  event "$stage"
  if [[ "$stage" == restore && "$GP_RESTORE_FAIL" == true ]]; then return 43; fi
  if [[ "$stage" == "$GP_FAIL" ]]; then return 37; fi
  if [[ "$stage" == attribute && "$GP_FAIL" == wrong-attribution ]]; then return 38; fi
  if [[ "$stage" == CI-F08-negative || "$stage" == CI-F08-admission-negative ]]; then
    if [[ "$GP_FAIL" == interrupt ]]; then kill -TERM "$BASHPID"; fi
    if [[ "$GP_FAIL" == unexpected ]]; then
      echo '{"status":"VERIFIED"}' > "$state_dir/CI-F08-negative.result.json"
      return 0
    fi
    local status=INTEGRATION_FAILURE
    [[ "$GP_FAIL" != wrong-attribution ]] || status=INTEGRATION_FAILURE
    command jq -n --arg image "$image" --arg status "$status" '{image:$image,status:$status,phase:"before-results",inventoryComplete:true,predicate:"https://sigstore.dev/cosign/sign/v1"}' > "$state_dir/CI-F08-negative.result.json"
    return 1
  fi
  if [[ "$stage" == before || "$stage" == negative || "$stage" == after-denial || "$stage" == restored ]]; then
    echo '{"synthetic":true}' > "$state_dir/$folder/$stage.json"
  fi
}
scenario_f08 "$GP_PROFILE"
event authorization
event deployment
`],{env,encoding:'utf8',timeout:15000});
  assert.ifError(result.error);
  const events=readFileSync(join(root,'events'),'utf8').trim().split('\n');
  const folder=profile==='before-results'?'F08-CI':'F08-admission';
  const recovery=JSON.parse(readFileSync(join(state,folder,'recovery.json')));
  const packaged=spawnSync('python3',[join(source,'scripts/package-evidence.py'),parent,join(root,'packages'),'FAIL'],{encoding:'utf8'});
  assert.equal(packaged.status,0,packaged.stderr);
  const audit=spawnSync('python3',['-c',`
import hashlib,sys,tarfile,json
from pathlib import Path
p=Path(sys.argv[1])
assert hashlib.sha256(p.read_bytes()).hexdigest()==Path(str(p)+'.sha256').read_text().split()[0]
with tarfile.open(p) as a:
 for line in a.extractfile('run-fixture/SHA256SUMS.txt').read().decode().splitlines():
  digest,name=line.split('  ',1)
  assert hashlib.sha256(a.extractfile('run-fixture/'+name).read()).hexdigest()==digest
 assert a.extractfile('run-fixture/L01-update/${folder}/recovery.json')
 assert json.load(a.extractfile('run-fixture/execution-summary.json'))['status']=='FAIL'
`,join(root,'packages/run-fixture.tar.gz')],{encoding:'utf8'});
  assert.equal(audit.status,0,audit.stderr);
  return {...result,events,recovery,state};
}
test('real early F08 restores and freshly verifies before any downstream action',t=>{
  const r=run(t);
  assert.equal(r.status,0,r.stderr);
  assert.deepEqual(r.events,['before','CI-F08-before','alter','negative','CI-F08-negative','after-denial','attribute','restore','restored','CI-F08-restored','authorization','deployment']);
  assert.deepEqual(r.recovery,{originalStatus:0,restorationStatus:0,restorationAttempted:true});
  assert.equal(JSON.parse(readFileSync(join(r.state,'F08-CI/result.json'))).L04,'pending');
});
for (const fault of ['before','CI-F08-before','alter','negative','CI-F08-negative','after-denial','attribute','unexpected','wrong-attribution','interrupt','restore','restored','CI-F08-restored']) {
  test(`early F08 preserves ${fault} failure and prevents downstream authorization`,t=>{
    const r=run(t,fault);
    assert.notEqual(r.status,0,r.stderr);
    assert.ok(!r.events.includes('authorization'));
    assert.ok(!r.events.includes('deployment'));
    assert.ok(!existsSync(join(r.state,'F08-CI/result.json')));
    if (!['before','CI-F08-before'].includes(fault)) assert.ok(r.events.includes('restore'));
    if (fault==='unexpected') assert.equal(JSON.parse(readFileSync(join(r.state,'F08-CI/attempt.json'))).observation,'UNEXPECTED_ACCEPTANCE');
    if (fault==='interrupt') assert.equal(r.recovery.originalStatus,143);
  });
}
test('early F08 retains primary and restoration errors together',t=>{
  const r=run(t,'alter',true);
  assert.equal(r.status,37);
  assert.equal(r.recovery.originalStatus,37);
  assert.equal(r.recovery.restorationStatus,43);
});

for (const fault of ['', 'positive', 'admitted', 'transport', 'additional-policy', 'interrupt', 'restore']) {
  test(`directed F08 actual admission function: ${fault || 'attributable rejection'}`,t=>{
    const r=run(t,fault,false,'authorized');
    assert.equal(r.status===0,fault==='',r.stderr);
    if (fault==='') {
      assert.ok(r.events.indexOf('positive')<r.events.indexOf('alter'));
      assert.ok(r.events.indexOf('admission')<r.events.indexOf('restore'));
      assert.ok(r.events.indexOf('CI-F08-admission-restored')<r.events.indexOf('deployment'));
      assert.equal(JSON.parse(readFileSync(join(r.state,'F08-admission/admission-attribution.json'))).policy,'tfm-signature');
    } else assert.ok(!r.events.includes('deployment'));
  });
}
