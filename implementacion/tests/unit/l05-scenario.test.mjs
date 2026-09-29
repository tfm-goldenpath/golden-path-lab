// Real L05 coordinator with synthetic external stage responses; no cluster claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const source=resolve(import.meta.dirname,'../..');
function run(t,fault='') {
  const root=mkdtempSync(join(tmpdir(),'l05-flow-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const state=join(root,'run-test'),privateDir=join(root,'private');mkdirSync(state);
  for(const n of ['from','to']) mkdirSync(join(privateDir,'L05-source',n),{recursive:true});
  writeFileSync(join(state,'state.json'),JSON.stringify({sourceRepository:'https://example.invalid/lab',sourceSnapshot:'a'.repeat(64)}));
  writeFileSync(join(state,'tfm-reference-quote.json'),'{}\n');
  if(fault!=='missing-predecessor') writeFileSync(join(state,'L04-result.json'),JSON.stringify({scenario:'L04',status:fault==='failed-predecessor'?'FAIL':'PASS',image:'registry/image@sha256:'+'b'.repeat(64),toImage:'registry/image@sha256:'+'b'.repeat(64),functionality:'healthy'}));
  writeFileSync(join(state,'L05-source-authorization.json'),JSON.stringify(Object.fromEntries(['from','to'].map((name,i)=>[name,{commit:String(i+1).repeat(40),directory:join(privateDir,'L05-source',name),snapshotSha256:String(i+1).repeat(64)}]))));
  const r=spawnSync('bash',['-c',String.raw`
set -Eeuo pipefail
source "$GP_SOURCE/scripts/lib/context.sh"
source "$GP_SOURCE/tests/scenarios/l05.sh"
state_dir="$GP_STATE"; private="$GP_PRIVATE"; root="$GP_SOURCE"; mode=local; image=registry/image@sha256:initial; port_pid=''
event() { echo "$name:$1" >> "$GP_STATE/events"; [[ "$GP_FAULT" != "$name:$1" ]]; }
delivery_preflight() { event tests; echo fresh > "$state_dir/unit-tests.log"; }
delivery_build() { event build; [[ "$1" == "$GP_PRIVATE/L05-source/$name" && "$3" == "$GP_STATE/L05-source-authorization.json" && "$4" == "$name" ]]; }
load_delivery_context() { image="registry/image@sha256:$name"; }
delivery_render_manifests() { event manifest; }
delivery_check_manifest() { event policy; }
delivery_analyze() { event scan; }
attestations_verify_delivery() { event verify; }
attestations_authorize_results() { event results; }
lab_apply_admission_policies() { event configure; }
actor() { event admission; }
k() { echo '{}'; }
probe() { event http; echo '{}' > "$state_dir/tfm-golden-quote.json"; }
node() { if [[ "$1" == --test ]]; then event source-tests; else event rollout; echo "$2" >> "$GP_STATE/predecessors"; echo '{}'; fi; }
scenario_l05
`],{env:{...process.env,BASH_ENV:'',GP_SOURCE:source,GP_STATE:state,GP_PRIVATE:privateDir,GP_FAULT:fault},encoding:'utf8'});
  assert.ifError(r.error);
  return {...r,state,events:existsSync(join(state,'events'))?readFileSync(join(state,'events'),'utf8').trim().split('\n'):[]};
}
test('L05 requires separate fresh tests/evidence and exact authorization before each admission',t=>{
  const r=run(t);assert.equal(r.status,0,r.stderr);
  const stages=['tests','source-tests','build','manifest','policy','scan','verify','results','configure','admission','http','rollout'];
  assert.deepEqual(r.events,['from','to'].flatMap(n=>stages.map(s=>n+':'+s)));
  const result=JSON.parse(readFileSync(join(r.state,'L05-result.json')));assert.notEqual(result.from.commit,result.to.commit);assert.notEqual(result.from.image,result.to.image);
  assert.deepEqual(readFileSync(join(r.state,'predecessors'),'utf8').trim().split('\n'),['registry/image@sha256:'+'b'.repeat(64),'registry/image@sha256:from']);
});
for(const fault of ['missing-predecessor','failed-predecessor']) test(`L05 stops before delivery on ${fault}`,t=>{
  const r=run(t,fault);assert.notEqual(r.status,0);assert.deepEqual(r.events,[]);
});
for(const step of ['tests','source-tests','build','scan','verify','results','configure','admission','http','rollout']) test(`L05 stops on second revision ${step} failure and preserves first result`,t=>{
  const r=run(t,'to:'+step);assert.notEqual(r.status,0,r.stderr);
  assert.ok(existsSync(join(r.state,'L05-from/result.json')));assert.ok(!existsSync(join(r.state,'L05-result.json')));
  assert.equal(r.events.at(-1),'to:'+step);
});
