// Synthetic fixtures: structural isolation only, no admission claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import {privilegeDiff} from '../scenarios/runtime-evidence.mjs';
const base=()=>({apiVersion:'apps/v1',kind:'Deployment',metadata:{name:'quotes-node',namespace:'tfm-golden',uid:'synthetic',generation:1},spec:{template:{metadata:{labels:{app:'quotes-node'}},spec:{containers:[{image:'registry/quotes-node@sha256:'+'a'.repeat(64),securityContext:{privileged:false,allowPrivilegeEscalation:false}}]}}}});
const fault=b=>{const r=structuredClone(b);Object.assign(r.spec.template.spec.containers[0].securityContext,{privileged:true,allowPrivilegeEscalation:true});return r;};
test('F11 records exactly two fault fields with unchanged digest',()=>{const b=base();assert.equal(privilegeDiff(b,fault(b)).faultChanges.length,2);});
for(const [name,change] of Object.entries({image:r=>r.spec.template.spec.containers[0].image+='bad',namespace:r=>r.metadata.namespace='other',generation:r=>r.metadata.generation++,host:r=>r.spec.template.spec.hostPID=true,oneField:r=>r.spec.template.spec.containers[0].securityContext.privileged=false}))test('reject undeclared '+name,()=>{const b=base(),r=fault(b);change(r);assert.throws(()=>privilegeDiff(b,r));});
test('reference ownership is separate from privilege alteration',()=>{const b=base();b.metadata.namespace='tfm-reference';const r=fault(b);r.metadata.labels={'tfm.goldenpath/comparison':'synthetic'};r.spec.template.metadata.labels['tfm.goldenpath/comparison']='synthetic';assert.equal(privilegeDiff(b,r,'synthetic').identityChanges.length,2);assert.throws(()=>privilegeDiff(b,r));});

import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
for(const failure of ['', 'admission','pods','privileges','digest','http','cleanup'])test('actual reference operation and withdrawal: '+(failure||'observed'),t=>{
 const dir=mkdtempSync(join(tmpdir(),'f11-reference-synthetic-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 mkdirSync(join(dir,'comparison'));mkdirSync(join(dir,'runtime/L06'),{recursive:true});
 const b=JSON.parse(readFileSync(join(root,'tests/policies/fixtures/base.json'))).manifests;
 b.metadata={...b.metadata,namespace:'tfm-reference',uid:'synthetic-owned',generation:1};b.spec.replicas=1;
 b.spec.template.spec.containers[0].image='registry/quotes-node@sha256:'+'a'.repeat(64);
 writeFileSync(join(dir,'deployment.json'),JSON.stringify(b));writeFileSync(join(dir,'runtime/L06/create-quote.json'),'{}');
 const result=spawnSync('bash',['-c',String.raw`
set -Eeuo pipefail
source tests/scenarios/runtime.sh
source tests/scenarios/f11-comparison.sh
state_dir="$TEST_STATE";session=synthetic;image="registry/quotes-node@sha256:$(printf 'a%.0s' {1..64})";port_pid=''
actor() {
  if [[ "$TEST_FAILURE" == admission ]]; then printf 'synthetic PodSecurity denial\n' >&2; return 1; fi
  jq '.metadata.generation+=1 | .status={observedGeneration:.metadata.generation,replicas:1,updatedReplicas:1,readyReplicas:1,availableReplicas:1}' "$state_dir/comparison/reference/request.json" > "$state_dir/deployment.json"
  printf 'synthetic accepted\n'
}
probe() {
  [[ "$TEST_FAILURE" != http ]] || return 8
  for file in health version quote; do printf '{}' > "$state_dir/tfm-reference-$file.json"; done
}
k() {
  if [[ "$*" == 'get namespace tfm-reference -o json' ]]; then printf '{"metadata":{"uid":"synthetic-namespace"}}'; return; fi
  if [[ "$3 $4" == 'delete deployment' ]]; then
    printf attempted > "$state_dir/cleanup-attempt.txt"
    [[ "$TEST_FAILURE" != cleanup ]] || return 9
    mv "$state_dir/deployment.json" "$state_dir/deleted.json"; return
  fi
  if [[ "$3" == wait ]]; then return; fi
  if [[ "$4" == deployment ]]; then
    if [[ -f "$state_dir/deployment.json" ]]; then cat "$state_dir/deployment.json"; else printf 'Error from server (NotFound): deployments.apps "quotes-node" not found\n' >&2; return 1; fi
  elif [[ "$4" == pods ]]; then
    if [[ "$TEST_FAILURE" == pods ]]; then printf '{"items":[]}'; return; fi
    jq --arg fault "$TEST_FAILURE" '{items:[{metadata:{namespace:"tfm-reference",name:"synthetic-pod",uid:"synthetic",labels:{app:"quotes-node"}},spec:.spec.template.spec,status:{phase:"Running",conditions:[{type:"Ready",status:"True"}],containerStatuses:[{name:"quotes-node",ready:true,state:{running:{}},imageID:.spec.template.spec.containers[0].image}]}}]} | if $fault=="privileges" then .items[0].spec.containers[0].securityContext.privileged=false elif $fault=="digest" then .items[0].status.containerStatuses[0].imageID="wrong" else . end' "$state_dir/deployment.json"
  else printf 'unexpected synthetic k request\n' >&2; return 99; fi
}
comparison_reference
`],{cwd:root,env:{...process.env,TEST_STATE:dir,TEST_FAILURE:failure},encoding:'utf8',timeout:10000});
 assert.ifError(result.error);assert.equal(result.status===0,failure==='',result.stdout+result.stderr);
 assert.ok(existsSync(join(dir,'cleanup-attempt.txt')),result.stderr);
 if(!failure)assert.equal(JSON.parse(readFileSync(join(dir,'comparison/reference/cleaned-check.json'))).status,'PASS');
 assert.ok(existsSync(join(dir,'comparison/reference/response.log')));
});
