// Real shell orchestration with synthetic Kubernetes responses; no cluster claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
function run(t,fault='',lifecycle='update') {
  const directory=mkdtempSync(join(tmpdir(),'admission-refresh-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const items=['runtime','signature','sbom','provenance','results'].map(name=>({metadata:{name:'tfm-'+name,uid:name,generation:2},spec:{revision:'new'},status:{conditions:[{type:'Ready',status:'True'}]}}));
  writeFileSync(join(directory,'policies.json'),JSON.stringify({items}));
  const r=spawnSync('bash',['-c',String.raw`
set -Eeuo pipefail
source "$GP_LIB"
source "$GP_SCENARIO"
state_dir="$GP_DIR"; private="$GP_DIR"; mode=local; repository=synthetic; commit=new; image_repo=synthetic; root="$GP_ROOT"
get() { echo 1.6; }
python3() { :; }
actor() {
  if [[ "$*" == *'auth can-i'* ]]; then echo no; return; fi
  echo "probe:$*" >> "$GP_DIR/events"
  if [[ "$GP_FAULT" == probe-timeout ]]; then echo 'context deadline exceeded'; return 1; fi
  if [[ "$GP_FAULT" == unexpected-acceptance ]]; then return 0; fi
  if [[ "$GP_LIFECYCLE" == initial ]]; then
    echo 'resource Deployment/tfm-golden/quotes-node was blocked due to the following policies'
    echo 'tfm-results:'
    if [[ "$GP_FAULT" == multiple-policy ]]; then echo 'tfm-provenance:'; echo '  require-provenance: unrelated'; fi
    echo '  autogen-require-results: image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found'
    return 1
  fi
}
lab_wait_admission_controller() { echo controller-ready >> "$GP_DIR/events"; echo '{"status":"READY","pods":["new-pod"]}' > "$state_dir/admission-controller-ready.json"; }

fail() { echo "$*" >&2; exit 1; }
k() {
  echo "$*" >> "$GP_DIR/events"
  case "$*" in
    'apply '*) cat "$GP_DIR/policies.json";;
    'get '*)
      if [[ -f "$GP_DIR/restarted" && "$GP_FAULT" == drift ]]; then
        jq '.items[3].metadata.generation=3' "$GP_DIR/policies.json"
      elif [[ -f "$GP_DIR/restarted" && "$GP_FAULT" == not-ready ]]; then
        jq '.items[3].status.conditions[0].status="False"' "$GP_DIR/policies.json"
      elif [[ -f "$GP_DIR/restarted" && "$GP_FAULT" == transport ]]; then
        return 1
      else cat "$GP_DIR/policies.json"; fi;;
    *'rollout restart '*) touch "$GP_DIR/restarted"; [[ "$GP_FAULT" != restart ]];;
    *'rollout status '*) [[ "$GP_FAULT" != timeout ]];;
    *'logs '*) if [[ "$GP_FAULT" == bootstrap ]]; then echo 'failed to bootstrap non leader controllers'; fi;;
  esac
}
lab_apply_admission_policies "$GP_LIFECYCLE"
echo workload >> "$GP_DIR/events"
`],{encoding:'utf8',env:{...process.env,BASH_ENV:'',GP_LIB:resolve(import.meta.dirname,'../../scripts/lib/lab.sh'),GP_DIR:directory,GP_FAULT:fault,GP_LIFECYCLE:lifecycle,GP_ROOT:resolve(import.meta.dirname,'../..'),GP_SCENARIO:resolve(import.meta.dirname,'../scenarios/f13.sh')}});
  return {...r,events:readFileSync(join(directory,'events'),'utf8')};
}
test('already Ready policies require a refreshed admission cache before workload',t=>{
  const r=run(t);assert.equal(r.status,0,r.stderr);
  assert.match(r.events,/rollout restart deployment\/kyverno-admission-controller[\s\S]*rollout status deployment\/kyverno-admission-controller[\s\S]*get [\s\S]*workload/);
});
for(const fault of ['restart','timeout','drift','bootstrap','not-ready','transport']) test(`admission refresh stops workload on ${fault}`,t=>{
  const r=run(t,fault);assert.notEqual(r.status,0);assert.doesNotMatch(r.events,/workload/);
});

test('initial installation does not restart and requires an attributable server dry-run',t=>{
 const r=run(t,'','initial');assert.equal(r.status,0,r.stderr);
 assert.doesNotMatch(r.events,/rollout restart/);
 assert.match(r.events,/probe:tfm-golden apply --dry-run=server/);
});
test('updated policy logs come from selected current Pod, never Deployment selection',t=>{
 const r=run(t);assert.equal(r.status,0,r.stderr);
 assert.match(r.events,/logs pod\/new-pod/);assert.doesNotMatch(r.events,/logs deployment\//);
 assert.match(r.events,/probe:tfm-golden apply --dry-run=server/);
});
for(const lifecycle of ['initial','update']) test(`webhook timeout stops ${lifecycle} before trials`,t=>{
 const r=run(t,'probe-timeout',lifecycle);assert.notEqual(r.status,0);assert.doesNotMatch(r.events,/workload/);
});

for(const fault of ['unexpected-acceptance','multiple-policy']) test(`initial readiness rejects ${fault}`,t=>{
 const r=run(t,fault,'initial');assert.notEqual(r.status,0);assert.doesNotMatch(r.events,/workload/);
});
