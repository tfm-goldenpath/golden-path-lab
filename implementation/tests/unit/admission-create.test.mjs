// Real shared shell/jq functions with a synthetic API; no live admission claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const image='registry.invalid/lab@sha256:'+'a'.repeat(64);
const baseline={apiVersion:'apps/v1',kind:'Deployment',metadata:{name:'quotes-node',namespace:'tfm-golden',annotations:{'kyverno.io/verify-images':'old'}},spec:{replicas:1,selector:{matchLabels:{app:'quotes-node'}},template:{metadata:{labels:{app:'quotes-node'}},spec:{containers:[{name:'quotes-node',image,securityContext:{privileged:false}}]}}}};
function run(t,fault='') {
 const dir=mkdtempSync(join(tmpdir(),'fresh-admission-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 writeFileSync(join(dir,'tfm-golden.json'),JSON.stringify(baseline));
 const result=spawnSync('bash',['-c',String.raw`
set -Eeuo pipefail
source "$LIB"
state_dir="$DIR"; cluster=run-owned; image="$IMAGE"
k() {
 echo "k:$*" >> "$DIR/events"
 if [[ "$*" == *'delete deployment'* ]]; then
   [[ "$FAULT" != cleanup ]] || return 40
   rm "$DIR/live.json"; return
 fi
 if [[ "$FAULT" == lookup ]]; then echo 'Error from server (Forbidden): denied' >&2; return 1; fi
 if [[ -f "$DIR/live.json" ]]; then cat "$DIR/live.json"; return; fi
 echo 'Error from server (NotFound): deployments.apps "admission-f14" not found' >&2; return 1
}
actor() {
 echo "actor:$*" >> "$DIR/events"
 [[ "$2" == create ]] || return 51
 [[ "$FAULT" != create ]] || return 38
 jq '.metadata.uid="owned-uid"' "$DIR/admission-request.json" > "$DIR/live.json"
 cat "$DIR/live.json"
}
if [[ "$FAULT" == occupied ]]; then cp "$DIR/tfm-golden.json" "$DIR/live.json"; fi
# Exercise explicit propagation even when the caller captures a failure.
workload_admission_prepare "$DIR" F14 || exit $?
if [[ "$FAULT" == accepted ]]; then actor tfm-golden create -f "$DIR/admission-request.json" >/dev/null; fi
workload_admission_cleanup "$DIR" negative || exit $?
if [[ "$FAULT" == foreign ]]; then
 jq '.metadata.labels["tfm.goldenpath/trial"]="foreign" | .metadata.uid="foreign"' "$DIR/admission-request.json" > "$DIR/live.json"
 workload_admission_cleanup "$DIR" recovery || exit $?
else
 workload_admission_recovery "$DIR" || exit $?
fi
cp "$DIR/recovery-object.json" "$DIR/first-observation.json"
workload_admission_cleanup "$DIR" recovery || exit $?
cmp "$DIR/first-observation.json" "$DIR/recovery-object.json"
`],{encoding:'utf8',env:{...process.env,BASH_ENV:'',LIB:resolve(import.meta.dirname,'../../scripts/lib/workload.sh'),DIR:dir,IMAGE:image,FAULT:fault}});
 return {...result,dir,events:readFileSync(join(dir,'events'),'utf8')};
}
test('fresh CREATE preserves image/spec, isolates selector, proves absence and cleans only its object',t=>{
 const r=run(t);assert.equal(r.status,0,r.stderr);
 const request=JSON.parse(readFileSync(join(r.dir,'admission-request.json')));
 assert.equal(request.metadata.name,'admission-f14');assert.equal(request.metadata.namespace,'tfm-golden');
 assert.equal(request.spec.replicas,0);assert.equal(request.metadata.annotations,undefined);
 assert.deepEqual(request.spec.template.spec,baseline.spec.template.spec);
 assert.equal(request.spec.selector.matchLabels.app,'admission-f14');
 assert.equal(request.spec.template.metadata.labels.app,'admission-f14');
 assert.match(r.events,/actor:tfm-golden create/);assert.doesNotMatch(r.events,/actor:.*apply|actor:.*delete/);
 assert.match(r.events,/k:.*delete deployment admission-f14/);
 assert.equal((r.events.match(/delete deployment/g)||[]).length,1);
 assert.ok(existsSync(join(r.dir,'before-absence.json')));
 assert.ok(existsSync(join(r.dir,'recovery-after-cleanup-absence.json')));
 assert.ok(!existsSync(join(r.dir,'live.json')));
});
for(const [fault,code] of [['lookup',1],['occupied',1],['create',38],['cleanup',40],['foreign',1]]) test(`fresh CREATE fails closed on ${fault}`,t=>{
 const r=run(t,fault);assert.equal(r.status,code,r.stderr);
 assert.ok(!existsSync(join(r.dir,'recovery-cleanup.json')));
 if(['lookup','occupied','foreign'].includes(fault)) assert.doesNotMatch(r.events,/delete deployment/);
 if(['occupied','cleanup','foreign'].includes(fault)) assert.ok(existsSync(join(r.dir,'live.json')));
});

test('unexpectedly created zero-replica object is captured and cleaned before restoration',t=>{
 const r=run(t,'accepted');assert.equal(r.status,0,r.stderr);
 const unfavorable=JSON.parse(readFileSync(join(r.dir,'negative-object.json')));
 assert.equal(unfavorable.metadata.name,'admission-f14');assert.equal(unfavorable.spec.replicas,0);
 assert.equal((r.events.match(/delete deployment/g)||[]).length,2);
});
