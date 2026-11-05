// Synthetic Kubernetes snapshots; not evidence of actual webhook reachability.
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkController} from '../../scripts/check-admission-controller.mjs';
function fixture() {
 return {
 deployment:{metadata:{uid:'deployment',generation:2,annotations:{'deployment.kubernetes.io/revision':'2'}},spec:{replicas:1},status:{observedGeneration:2,updatedReplicas:1,replicas:1,availableReplicas:1}},
 replicasets:{items:[{metadata:{uid:'rs-new',annotations:{'deployment.kubernetes.io/revision':'2'},ownerReferences:[{uid:'deployment',controller:true}]}}]},
 pods:{items:[{metadata:{name:'new-pod',uid:'new',ownerReferences:[{uid:'rs-new',controller:true}]},status:{phase:'Running',podIP:'10.0.0.2',conditions:[{type:'Ready',status:'True'}]}}]},
 endpoints:{items:[{ports:[{port:9443}],endpoints:[{addresses:['10.0.0.2'],conditions:{ready:true},targetRef:{kind:'Pod',name:'new-pod',uid:'new'}}]}]}
 };
}
test('selects current ready Pods after the old revision is gone',()=>{
 assert.deepEqual(checkController(fixture()),{status:'READY',pods:['new-pod']});
});
for(const phase of ['Running','Succeeded']) test(`waits for old owned ${phase} Pod deletion`,()=>{
 const f=fixture();
 f.replicasets.items.push({metadata:{uid:'old-rs',ownerReferences:[{uid:'deployment',controller:true}]}});
 f.pods.items.unshift({metadata:{name:'old-pod',uid:'old',deletionTimestamp:'now',ownerReferences:[{uid:'old-rs',controller:true}]},status:{phase}});
 assert.equal(checkController(f).status,'PENDING');
});
test('waits for reported terminating replicas even if the Pod list has advanced',()=>{
 const f=fixture();f.deployment.status.terminatingReplicas=1;
 assert.equal(checkController(f).status,'PENDING');
});
for(const fault of ['old-endpoint','not-ready','terminating','old-generation','old-replicaset','wrong-address','missing-endpoint','unknown-ready']) test(`controller blocks ${fault}`,()=>{
 const f=fixture();
 if(fault==='old-endpoint') f.endpoints.items[0].endpoints[0].targetRef.uid='old';
 if(fault==='not-ready') f.pods.items[0].status.conditions[0].status='False';
 if(fault==='terminating') f.pods.items[0].metadata.deletionTimestamp='now';
 if(fault==='old-generation') f.deployment.status.observedGeneration=1;
 if(fault==='old-replicaset') f.replicasets.items[0].metadata.annotations['deployment.kubernetes.io/revision']='1';
 if(fault==='wrong-address') f.endpoints.items[0].endpoints[0].addresses=['10.0.0.1'];
 if(fault==='missing-endpoint') f.endpoints.items=[];
 if(fault==='unknown-ready') delete f.endpoints.items[0].endpoints[0].conditions.ready;
 assert.equal(checkController(f).status,'PENDING');
});
test('malformed snapshots are errors, not pending readiness',()=>{
 const f=fixture();f.endpoints={};assert.throws(()=>checkController(f),/snapshot/);
});

import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
for(const fault of ['none','converges','draining','never-drains','stale','transport','malformed']) test(`real wait helper: ${fault}`,t=>{
 const dir=mkdtempSync(join(tmpdir(),'controller-wait-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 for(const [name,data] of Object.entries(fixture())) writeFileSync(join(dir,name+'.json'),JSON.stringify(data));
 const r=spawnSync('bash',['-c',String.raw`
set -Eeuo pipefail
source "$GP_ROOT/scripts/lib/lab.sh"
root="$GP_ROOT"; state_dir="$GP_DIR"
fail() { echo "$*" >&2; exit 1; }
sleep() { :; }
k() {
 if [[ "$GP_FAULT" == transport ]]; then return 1; fi
 case "$*" in
  *'get deployment '*)
   if [[ "$GP_FAULT" == never-drains || ( "$GP_FAULT" == draining && ! -f "$GP_DIR/drained" ) ]]; then
    touch "$GP_DIR/drained"; jq '.status.terminatingReplicas=1' "$GP_DIR/deployment.json"
   else cat "$GP_DIR/deployment.json"; fi;;
  *'get replicasets '*) cat "$GP_DIR/replicasets.json";;
  *'get pods '*) cat "$GP_DIR/pods.json";;
  *'get endpointslices '*)
   if [[ "$GP_FAULT" == malformed ]]; then echo '{}'
   elif [[ "$GP_FAULT" == stale || ( "$GP_FAULT" == converges && ! -f "$GP_DIR/seen" ) ]]; then
    touch "$GP_DIR/seen"; jq '.items[0].endpoints[0].targetRef.uid="old"' "$GP_DIR/endpoints.json"
   else cat "$GP_DIR/endpoints.json"; fi;;
 esac
}
lab_wait_admission_controller
`],{encoding:'utf8',env:{...process.env,BASH_ENV:'',GP_ROOT:resolve(import.meta.dirname,'../..'),GP_DIR:dir,GP_FAULT:fault}});
 const success=['none','converges','draining'].includes(fault);
 assert.equal(r.status===0,success,r.stderr);
 assert.equal(existsSync(join(dir,'admission-controller-ready.json')),success);
 if(success) assert.deepEqual(JSON.parse(readFileSync(join(dir,'admission-controller-ready.json'))).pods,['new-pod']);
 if(['converges','draining'].includes(fault)) assert.ok(existsSync(join(dir,'admission-controller-2-check.json')));
 if(['stale','never-drains'].includes(fault)) assert.ok(existsSync(join(dir,'admission-controller-30-check.json')));
});
