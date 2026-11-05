// Real scenario with synthetic external registry/gate responses. The separate
// gate tests exercise retrieval/crypto orchestration; live runs establish trust.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const source=resolve(import.meta.dirname,'../..');
function run(t, fail='', restoreFail=false, profile='authorized', scenario='F13') {
  const root=mkdtempSync(join(tmpdir(),'results-ci-scenario-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const parent=join(root,'run-fixture'), state=join(parent,'L01-update');
  mkdirSync(state,{recursive:true});
  const env={...process.env,GP_SOURCE:source,GP_STATE:state,GP_ROOT:root,GP_FAIL:fail,GP_RESTORE_FAIL:String(restoreFail),GP_PROFILE:profile,GP_CASE:scenario};
  delete env.BASH_ENV; delete env.ENV;
  const result=spawnSync('bash',['--noprofile','--norc','-c',String.raw`
set -Eeuo pipefail
cd "$GP_SOURCE"
source scripts/lib/context.sh
source tests/scenarios/f13.sh
source tests/scenarios/results.sh
results_type=https://tfm-goldenpath.dev/attestations/verification-results/v1
state_dir="$GP_STATE"; mode=local; registry=tfm-zot-run-fixture; cluster=tfm-demo-run-fixture
image_repo=172.18.0.2:5000/quotes-node-run-fixture
image="$image_repo@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
event() { echo "$1" >> "$GP_ROOT/events"; }
cosign() { event fixture-signing; [[ "$GP_FAIL" != fixture-signing ]]; }
docker() { if [[ "$3" == *IPAddress* ]]; then echo 172.18.0.2; else echo tfm-demo-run-fixture; fi; }
k() {
  if [[ "$*" == *deployments* ]]; then
    echo '{"items":[{"metadata":{"name":"kyverno-admission-controller"},"spec":{"template":{"spec":{"containers":[{"name":"kyverno","args":["--imageVerifyCacheEnabled=false"]}]}}}}]}'
  else echo '{"items":[]}'; fi
}
workload_admission_absent() { event rejected-absence; [[ "$GP_FAIL" != rejected-absence ]]; }
workload_admission_prepare() { event create-prepared; [[ "$GP_FAIL" != create-prepare ]]; }
workload_admission_cleanup() { event "create-cleanup-$2"; [[ "$GP_FAIL" != create-cleanup ]]; }
workload_admission_recovery() { event create-recovery; [[ "$GP_FAIL" != create-recovery ]]; }
actor() {
  if [[ "$*" == *dry-run* ]]; then event positive; [[ "$GP_FAIL" != positive ]]; return; fi
  if [[ -f "$state_dir/$folder/restored.json" ]]; then event recovery-admission; [[ "$GP_FAIL" != recovery-admission ]]; return; fi
  if [[ "$2" != create ]]; then echo "deployment.apps/quotes-node unchanged"; return 0; fi
  event admission
  if [[ "$GP_FAIL" == admitted ]]; then return 0; fi
  if [[ "$GP_FAIL" == transport ]]; then echo 'registry connection refused'; return 1; fi
  echo 'Error from server: admission webhook "validate.kyverno.svc-fail" denied the request:'
  echo "resource Deployment/tfm-golden/$admission_name was blocked due to the following policies"
  echo 'tfm-results:'
  if [[ "$GP_CASE" == F14 && "$GP_FAIL" != wrong-reason ]]; then
    echo "  autogen-require-results: image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: .attestations[0].attestors[0].entries[0].keys: attestation checks failed for $image and predicate https://tfm-goldenpath.dev/attestations/verification-results/v1: RESULTS_POLICY_VERSION"
  else
    echo '  autogen-require-results: image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found'
  fi
  if [[ "$GP_FAIL" == additional-policy ]]; then echo 'tfm-other:'; echo '  other-rule: forbidden'; fi
  return 1
}
probe() { event probe; [[ "$GP_FAIL" != probe ]] || return 37; for response in health version quote; do echo '{}' > "$state_dir/tfm-golden-$response.json"; done; }
attestations_ci_gate() { node scripts/ci-verification-gate.mjs "$state_dir" "$1" before-results; }
node() {
  local stage
  if [[ "$1" == scripts/check-image-rollout.mjs ]]; then event rollout; [[ "$GP_FAIL" != rollout ]]; return; fi
  if [[ "$1" == scripts/ci-verification-gate.mjs ]]; then stage=$3; else stage=$2; [[ "$stage" != snapshot ]] || stage=$7; [[ "$stage" != prepare ]] || stage=before; fi
  event "$stage"
  if [[ "$stage" == restore && "$GP_RESTORE_FAIL" == true ]]; then return 43; fi
  if [[ "$stage" == "$GP_FAIL" ]]; then return 37; fi
  if [[ "$stage" == attribute && "$GP_FAIL" == wrong-attribution ]]; then return 38; fi
  if [[ "$stage" == CI-F13-CI-negative || "$stage" == CI-F13-admission-negative ]]; then
    if [[ "$GP_FAIL" == interrupt ]]; then kill -TERM "$BASHPID"; fi
    if [[ "$GP_FAIL" == unexpected ]]; then
      echo '{"status":"VERIFIED"}' > "$state_dir/CI-F13-CI-negative.result.json"
      return 0
    fi
    local status=INTEGRATION_FAILURE
    [[ "$GP_FAIL" != wrong-attribution ]] || status=INTEGRATION_FAILURE
    command jq -n --arg image "$image" --arg status "$status" '{image:$image,status:$status,phase:"before-results",inventoryComplete:true,predicate:"https://sigstore.dev/cosign/sign/v1"}' > "$state_dir/CI-F13-CI-negative.result.json"
    return 42
  fi
  if [[ "$stage" == before || "$stage" == negative || "$stage" == after-denial || "$stage" == restored ]]; then
    echo '{"synthetic":true}' > "$state_dir/$folder/$stage.json"
  fi
}
scenario_results_fault F13 "$GP_PROFILE"
event authorization
event deployment
`.replaceAll('F13',scenario)],{env,encoding:'utf8',timeout:15000});
  assert.ifError(result.error);
  const events=readFileSync(join(root,'events'),'utf8').trim().split('\n');
  const folder=scenario+(profile==='before-results'?'-CI':'-admission');
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
for (const fault of ['', 'positive', 'admitted', 'transport', 'additional-policy', 'interrupt', 'restore', 'recovery-admission', 'probe', 'rollout']) {
  test(`directed F13 actual admission function: ${fault || 'attributable rejection'}`,t=>{
    const r=run(t,fault,false,'authorized');
    assert.equal(r.status===0,fault==='',r.stderr);
    if (fault==='') {
      assert.ok(r.events.indexOf('positive')<r.events.indexOf('alter'));
      assert.ok(r.events.indexOf('admission')<r.events.indexOf('restore'));
      assert.ok(r.events.indexOf('CI-F13-admission-restored')<r.events.indexOf('deployment'));
      assert.equal(JSON.parse(readFileSync(join(r.state,'F13-admission/admission-attribution.json'))).policy,'tfm-results');
    } else assert.ok(!r.events.includes('deployment'));
  });
}

for(const profile of ['authorized']) for(const fault of ['', 'fixture-signing', 'plan', 'unexpected', 'wrong-attribution', 'interrupt', 'restore', ...(profile==='authorized'?['admitted','transport','additional-policy','wrong-reason','recovery-admission','probe','rollout']:[])]) {
  test(`real F14 scenario (${profile}): ${fault || 'isolated rejection and recovery'}`,t=>{
    const r=run(t,fault,false,profile,'F14');
    assert.equal(r.status===0,fault==='',r.stderr);
    if(fault) {
      assert.ok(!r.events.includes('deployment'));
      assert.ok(!existsSync(join(r.state,'F14-admission/result.json')));
      if(fault==='interrupt') {assert.equal(r.recovery.originalStatus,143);assert.ok(r.events.includes('restore'));}
    }
    else {
      assert.ok(r.events.indexOf('CI-F14-admission-before')<r.events.indexOf('fixture-signing'));
      assert.ok(r.events.indexOf('fixture-signing')<r.events.indexOf('plan'));
      assert.ok(r.events.indexOf('fixture-signing')<r.events.indexOf('alter'));
      if(profile==='authorized') assert.ok(r.events.includes('recovery-admission'));
    }
  });
}

for(const scenario of ['F13','F14']) test(`${scenario} preserves original and recovery failures`,t=>{
 const r=run(t,'alter',true,'authorized',scenario);
 assert.equal(r.status,37);assert.equal(r.recovery.originalStatus,37);assert.equal(r.recovery.restorationStatus,43);
});

for(const scenario of ['F13','F14']) for(const fault of ['create-prepare','create-cleanup','create-recovery','rejected-absence']) test(`${scenario} stops on isolated CREATE ${fault}`,t=>{
 const r=run(t,fault,false,'authorized',scenario);
 assert.notEqual(r.status,0);assert.ok(!r.events.includes('deployment'));
 assert.ok(!existsSync(join(r.state,scenario+'-admission/result.json')));
 if(['create-cleanup','create-recovery'].includes(fault)) assert.equal(r.recovery.restorationStatus,1);
});
