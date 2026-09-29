// Real shell orchestration with synthetic Kubernetes responses; no cluster claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
function run(t,fault='') {
  const directory=mkdtempSync(join(tmpdir(),'admission-refresh-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const items=['runtime','signature','sbom','provenance','results'].map(name=>({metadata:{name:'tfm-'+name,uid:name,generation:2},spec:{revision:'new'},status:{conditions:[{type:'Ready',status:'True'}]}}));
  writeFileSync(join(directory,'policies.json'),JSON.stringify({items}));
  const r=spawnSync('bash',['-c',String.raw`
set -Eeuo pipefail
source "$GP_LIB"
state_dir="$GP_DIR"; private="$GP_DIR"; mode=local; repository=synthetic; commit=new; image_repo=synthetic
get() { echo 1.6; }
python3() { :; }
actor() { echo no; }
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
lab_apply_admission_policies
echo workload >> "$GP_DIR/events"
`],{encoding:'utf8',env:{...process.env,BASH_ENV:'',GP_LIB:resolve(import.meta.dirname,'../../scripts/lib/lab.sh'),GP_DIR:directory,GP_FAULT:fault}});
  return {...r,events:readFileSync(join(directory,'events'),'utf8')};
}
test('already Ready policies require a refreshed admission cache before workload',t=>{
  const r=run(t);assert.equal(r.status,0,r.stderr);
  assert.match(r.events,/rollout restart deployment\/kyverno-admission-controller[\s\S]*rollout status deployment\/kyverno-admission-controller[\s\S]*get [\s\S]*workload/);
});
for(const fault of ['restart','timeout','drift','bootstrap','not-ready','transport']) test(`admission refresh stops workload on ${fault}`,t=>{
  const r=run(t,fault);assert.notEqual(r.status,0);assert.doesNotMatch(r.events,/workload/);
});
