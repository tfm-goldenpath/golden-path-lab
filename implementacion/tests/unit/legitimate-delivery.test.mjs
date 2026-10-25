// Synthetic orchestration and source-boundary tests, not live admission or crypto.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
const root=resolve(import.meta.dirname,'../..');

test('legitimate coordinator documents its supported invocation without starting work',()=>{
 const result=spawnSync('bash',['scripts/deliver.sh','--help'],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/local/);
 assert.match(result.stdout,/cleanup/);
});

import {DELIVERY_STEPS, CHECKS, RESULT_EVIDENCE, validateDeliveryChecks, validateProvenance} from '../../scripts/lab-contracts.mjs';
import {captureDeliverySource, deliverySources} from '../../scripts/delivery-source.mjs';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function directory(t) {
 const d=mkdtempSync(join(tmpdir(),'legitimate-delivery-'));
 t.after(()=>rmSync(d,{recursive:true,force:true}));return d;
}
const stubs=String.raw`
context_init() {
  contract="$P03_REAL/scripts/lab-contracts.mjs"
  state_dir=; private=; cluster=; registry=; builder=; port_pid=
}
create_delivery_state() {
 state_dir="$root/evidence/raw/delivery-synthetic"; private="$root/.tmp/private-synthetic"
 mkdir -p "$state_dir" "$private"
 echo '{"profile":"delivery-v1","mode":"local"}' > "$state_dir/state.json"
 node "$contract" delivery-init "$state_dir"
}
perform() {
 echo "$1" >> "$root/events"
 if [[ "$1" == "$P03_FAIL" ]]; then false; fi
 echo "$1-completed" >> "$root/events"
}
capture_source_context() {
 perform source
 put sourceCommit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
 put sourceSnapshot synthetic
 put sourceRepository https://example.invalid/synthetic
}
environment_check() { perform environment; }
delivery_service_tests() { perform unitTests; echo synthetic > "$state_dir/unit-tests.log"; }
delivery_workflow_policy() { perform workflowPolicy; echo '[]' > "$state_dir/workflow-policy.json"; }
delivery_versions() { perform versions; }
environment_create() { perform environmentCreate; }
delivery_source_recheck() {
 local step
 step=$(jq -r 'to_entries[] | select(.value.status=="RUNNING") | .key' "$state_dir/delivery-steps.json")
 perform "$step"
}
delivery_build() { perform build; put imageRepository registry.invalid/quotes; put digest "sha256:$(printf 'b%.0s' {1..64})"; }
environment_capacity() { [[ "$1" != after-build ]] || perform storageAfterBuild; }
environment_namespaces() { perform namespaces; }
delivery_render_manifests() { perform manifest; [[ "$*" == tfm-golden ]]; }
delivery_check_manifest() { perform manifestPolicy; echo '[]' > "$state_dir/manifest-policy.json"; }
delivery_analyze() { perform vulnerabilityPolicy; echo '[]' > "$state_dir/vulnerability-policy.json"; }
attestations_verify_delivery() {
 perform evidence
 for file in signature sbom provenance; do echo '{}' > "$state_dir/verified-$file.json"; done
}
attestations_authorize_results() { perform authorization; }
environment_admission() { perform admission; }
workload_deploy() { perform deploy; }
workload_rollout() { perform rollout; }
workload_image() { perform deployedDigest; }
workload_http() { perform http; }
environment_cleanup() { echo cleanup >> "$root/events"; return "$P03_CLEANUP"; }
`;
function orchestration(t, fail='', cleanup=0, packageStatus=0) {
 const d=directory(t), implementation=join(d,'implementacion');
 mkdirSync(join(implementation,'scripts/lib'),{recursive:true});
 for(const file of ['deliver.sh',...['context','admission','lab','delivery','attestations','workload','local-delivery'].map(n=>'lib/'+n+'.sh')]) cpSync(join(root,'scripts',file),join(implementation,'scripts',file));
 cpSync(join(root,'versions.env'),join(implementation,'versions.env'));
 writeFileSync(join(implementation,'scripts/lib/local-delivery.sh'),readFileSync(join(root,'scripts/lib/local-delivery.sh'))+'\n'+stubs+(packageStatus?'\ndelivery_package() { return '+packageStatus+'; }\n':''));
 // Package with the real helper; no scenario/fixture/measurement/presentation tree exists.
 cpSync(join(root,'scripts/package-evidence.py'),join(implementation,'scripts/package-evidence.py'));
 const r=spawnSync('bash',['scripts/deliver.sh','local'],{cwd:implementation,encoding:'utf8',env:{...process.env,BASH_ENV:'',GP_STATE_DIR:'',P03_REAL:root,P03_FAIL:fail,P03_CLEANUP:String(cleanup)}});
 const state=join(implementation,'evidence/raw/delivery-synthetic');
 return {...r,implementation,state,events:readFileSync(join(implementation,'events'),'utf8'),result:JSON.parse(readFileSync(join(state,'result.json')))};
}
test('isolated coordinator delivers without any laboratory tree and packages no scenarios',t=>{
 const r=orchestration(t);assert.equal(r.status,0,r.stderr);
 assert.equal(r.result.status,'PASS');
 assert.deepEqual(Object.keys(r.result.stages),DELIVERY_STEPS);
 const summary=JSON.parse(readFileSync(join(r.state,'execution-summary.json')));
 assert.equal(summary.schema,'legitimate-delivery-package/v1');
 assert.equal(summary.scenarios,undefined);assert.equal(summary.F07,undefined);
 assert.equal(summary.measurementClassification,undefined);
 assert.doesNotMatch(r.events,/reference|scenario|measurement/);
});
for(const step of DELIVERY_STEPS) test(`substituted failure at ${step} prevents every subsequent protected stage`,t=>{
 const r=orchestration(t,step,23);
 assert.notEqual(r.status,0,r.stderr);
 assert.equal(r.result.stages[step].status,'ERROR');
 for(const later of DELIVERY_STEPS.slice(DELIVERY_STEPS.indexOf(step)+1)) assert.equal(r.result.stages[later].status,'NOT_REACHED');
 assert.doesNotMatch(r.events,new RegExp('^'+step+'-completed$','m'));
 assert.match(r.events,/cleanup/);
 assert.equal(r.status,1,'first stage error survives cleanup failure');
});
test('cleanup failure cannot produce global PASS after all stages pass',t=>{
 const r=orchestration(t,'',23);assert.equal(r.status,23);assert.equal(r.result.status,'ERROR');
});
test('new entry rejects prior state instead of resuming a laboratory',()=>{
 const r=spawnSync('bash',['scripts/deliver.sh','local'],{cwd:root,encoding:'utf8',env:{...process.env,GP_STATE_DIR:'/previous/laboratory'}});
 assert.notEqual(r.status,0);assert.match(r.stderr,/resume is unsupported/);
});
test('function-only imports perform no commands or writes',t=>{
 const d=directory(t);
 const r=spawnSync('bash',['-c',String.raw`
set -euo pipefail
for tool in docker kind kubectl curl node python3 jq mktemp git; do eval "$tool() { echo forbidden-$tool; return 99; }"; done
for module in context admission lab delivery attestations workload local-delivery; do source "$REAL/scripts/lib/$module.sh"; done
`],{cwd:d,encoding:'utf8',env:{...process.env,REAL:root}});
 assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'');
});
test('source capture retains service tests/build controls but reads no laboratory inputs',()=>{
 const captured=captureDeliverySource(root);
 const paths=captured.files.map(f=>f.path);
 assert.ok(paths.includes('implementacion/services/quotes-node/test/http.test.js'));
 assert.ok(paths.includes('implementacion/services/quotes-node/.dockerignore'));
 assert.ok(paths.includes('implementacion/scripts/lib/attestations.sh'));
 assert.ok(paths.includes('.github/workflows/golden-path.yml'));
 assert.ok(paths.every(p=>!/^implementacion\/(tests|demo|evidence)\//.test(p) && !p.includes('/defense-demo/')));
});
test('delivery build input profile refuses fault fixtures before reading them',()=>{
 const r=spawnSync('node',['scripts/capture-build-inputs.mjs','tests/fixtures/l03','base','a'.repeat(40),'','','delivery-v1'],{cwd:root,encoding:'utf8'});
 assert.notEqual(r.status,0);assert.match(r.stderr,/requires the quotes-node build context/);
});
test('provenance names the real coordinator and rejects an unrecognized producer',t=>{
 const d=directory(t), out=join(d,'provenance.json'), repo='https://example.invalid/source', commit='a'.repeat(40);
 for(const producer of ['implementacion/scripts/deliver.sh','implementacion/scripts/demo.sh']) {
  const r=spawnSync('node',['scripts/lab-contracts.mjs','provenance',repo,commit,'b'.repeat(64),'synthetic',out,producer],{cwd:root,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);const p=JSON.parse(readFileSync(out));
  assert.equal(p.buildDefinition.externalParameters.workflow.path,producer);
  assert.doesNotThrow(()=>validateProvenance(p,{repository:repo,commit,mode:'local',producer}));
  if(producer.endsWith('demo.sh')) assert.throws(()=>validateProvenance(p,{repository:repo,commit,mode:'local',producer:'implementacion/scripts/deliver.sh'}),/PROVENANCE_PRODUCER/);
 }
 const r=spawnSync('node',['scripts/lab-contracts.mjs','provenance',repo,commit,'b'.repeat(64),'synthetic',out,'arbitrary.sh'],{cwd:root,encoding:'utf8'});
 assert.notEqual(r.status,0);
});
test('a real failing service test cannot create a successful receipt or continue',t=>{
 const d=directory(t);mkdirSync(join(d,'services/quotes-node/test'),{recursive:true});
 writeFileSync(join(d,'services/quotes-node/test/fail.test.js'),"require('node:test')('failure',()=>{throw new Error('intentional synthetic failure')})");
 writeFileSync(join(d,'state.json'),'{"profile":"delivery-v1"}');
 const r=spawnSync('bash',['-c',String.raw`
set -Eeuo pipefail
source "$REAL/scripts/lib/context.sh"
source "$REAL/scripts/lib/delivery.sh"
state_dir="$PWD"; contract="$REAL/scripts/lab-contracts.mjs"; execution_profile=delivery-v1
node "$contract" delivery-init "$state_dir"
delivery_step unitTests delivery_service_tests
echo forbidden-authorization
`],{cwd:d,encoding:'utf8',env:{...process.env,NODE_TEST_CONTEXT:'',REAL:root}});
 assert.notEqual(r.status,0,JSON.stringify({stdout:r.stdout,stderr:r.stderr,log:readFileSync(join(d,'unit-tests.log'),'utf8')}));assert.doesNotMatch(r.stdout,/forbidden/);
 assert.match(readFileSync(join(d,'unit-tests.log'),'utf8'),/intentional synthetic failure/);
 assert.equal(JSON.parse(readFileSync(join(d,'delivery-steps.json'))).unitTests.status,'RUNNING');
});
test('nonempty or stale logs cannot authorize the seven canonical checks',t=>{
 const d=directory(t), repository='https://example.invalid/source', commit='a'.repeat(40), image='registry.invalid/quotes@sha256:'+'b'.repeat(64);
 writeFileSync(join(d,'delivery-config.json'),'{}');
 const state={profile:'delivery-v1',sourceRepository:repository,sourceCommit:commit,sourceSnapshot:'snapshot',imageRepository:image.split('@')[0],digest:image.split('@')[1],configurationSha256:hash('{}')};
 writeFileSync(join(d,'state.json'),JSON.stringify(state));
 const steps={};
 for(const check of CHECKS) {
  writeFileSync(join(d,RESULT_EVIDENCE[check]),'synthetic');
  const stage=['signature','sbom','provenance'].includes(check)?'evidence':check;
  steps[stage]??={status:'PASS',sourceSnapshot:'snapshot',sourceCommit:commit,image,evidence:{}};
  steps[stage].evidence[check]=hash('synthetic');
 }
 writeFileSync(join(d,'CI-authorization.result.json'),JSON.stringify({status:'VERIFIED',phase:'before-results',image}));
 const save=()=>writeFileSync(join(d,'delivery-steps.json'),JSON.stringify(steps));save();
 assert.doesNotThrow(()=>validateDeliveryChecks(d,repository,commit));
 for(const check of CHECKS) {
  const stage=['signature','sbom','provenance'].includes(check)?'evidence':check;
  steps[stage].status='RUNNING';save();assert.throws(()=>validateDeliveryChecks(d,repository,commit),/Mandatory/);steps[stage].status='PASS';save();
 }
 steps.evidence.image=image.replace(/b/g,'c');save();assert.throws(()=>validateDeliveryChecks(d,repository,commit),/Mandatory/);
});

test('cleanup validates immutable IDs, is repeatable and preserves the first diagnostics',t=>{
 for(const changed of [false,true]) {
 const d=directory(t), owned='a'.repeat(64), actual=(changed?'b':'a').repeat(64);
 writeFileSync(join(d,'state.json'),JSON.stringify({ownedContainers:{'tfm-zot-delivery-synthetic':owned}}));
 const r=spawnSync('bash',['-c',String.raw`
set -Eeuo pipefail
source "$REAL/scripts/lib/context.sh"
source "$REAL/scripts/lib/lab.sh"
source "$REAL/scripts/lib/local-delivery.sh"
state_dir="$PWD"; private="$PWD/private"; registry=tfm-zot-delivery-synthetic; port_pid=
docker() {
 echo "$*" >> "$PWD/docker-commands"
 case "$1" in
   logs) echo first-diagnostic ;;
   inspect) echo "$ACTUAL" ;;
   rm) touch "$PWD/removed" ;;
   *) return 92 ;;
 esac
}
environment_cleanup
echo completed >> "$PWD/events"
environment_cleanup
`],{cwd:d,encoding:'utf8',env:{...process.env,REAL:root,ACTUAL:actual}});
 const commands=readFileSync(join(d,'docker-commands'),'utf8');
 if(changed) {assert.notEqual(r.status,0);assert.doesNotMatch(commands,/^rm /m);}
 else {assert.equal(r.status,0,r.stderr);assert.equal(commands.split('\n').filter(l=>l.startsWith('rm ')).length,1);}
 assert.equal(readFileSync(join(d,'registry.log'),'utf8'),'first-diagnostic\n');
 }
});
test('delivery packaging excludes credentials and preserves its first archive',t=>{
 const d=directory(t), raw=join(d,'delivery-synthetic'), output=join(d,'packages');mkdirSync(raw);
 writeFileSync(join(raw,'result.json'),JSON.stringify({schema:'legitimate-delivery-result/v1',status:'ERROR'}));
 writeFileSync(join(raw,'state.json'),'private configuration');writeFileSync(join(raw,'cosign.key'),'secret');
 writeFileSync(join(raw,'leaked.log'),'-----BEGIN PRIVATE KEY-----\nsecret\n');
 const args=['scripts/package-evidence.py',raw,output,'ERROR','delivery-v1'];
 const first=spawnSync('python3',args,{cwd:root,encoding:'utf8'});assert.equal(first.status,0,first.stderr);
 const archive=join(output,'delivery-synthetic.tar.gz'), before=hash(readFileSync(archive));
 const verify=spawnSync('python3',['-c','from lane_a_evidence import verify_package; import sys; verify_package(sys.argv[1])',archive],{cwd:join(root,'scripts'),encoding:'utf8'});
 assert.equal(verify.status,0,verify.stderr);
 const list=spawnSync('tar',['-tzf',archive],{encoding:'utf8'});assert.doesNotMatch(list.stdout,/state.json|cosign.key|leaked.log/);
 const repeat=spawnSync('python3',args,{cwd:root,encoding:'utf8'});assert.notEqual(repeat.status,0);assert.equal(hash(readFileSync(archive)),before);
});

test('TAP service evidence rejects empty, skipped and non-executed summaries',t=>{
 const d=directory(t), log=join(d,'unit-tests.log');
 for(const text of ['nonempty log', '# tests 0\n# pass 0\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n', '# tests 1\n# pass 0\n# fail 0\n# cancelled 0\n# skipped 1\n# todo 0\n']) {
  writeFileSync(log,text);
  const r=spawnSync('node',['scripts/lab-contracts.mjs','service-tests',log],{cwd:root,encoding:'utf8'});
  assert.notEqual(r.status,0);
 }
});
test('actual Conftest rejects a prohibited manifest and stops the stage',t=>{
 const d=directory(t);
 writeFileSync(join(d,'state.json'),'{"profile":"delivery-v1"}');
 const image='registry.invalid/quotes@sha256:'+'a'.repeat(64);
 const rendered=spawnSync('node',['scripts/lab-contracts.mjs','manifest',image,'tfm-golden',join(d,'tfm-golden.json'),'local'],{cwd:root,encoding:'utf8'});
 assert.equal(rendered.status,0,rendered.stderr);
 const manifest=JSON.parse(readFileSync(join(d,'tfm-golden.json')));manifest.spec.template.spec.containers[0].securityContext.privileged=true;
 writeFileSync(join(d,'tfm-golden.json'),JSON.stringify(manifest));
 const r=spawnSync('bash',['-c',String.raw`
set -Eeuo pipefail
source scripts/lib/context.sh
source scripts/lib/delivery.sh
state_dir="$STATE"; contract="$PWD/scripts/lab-contracts.mjs"
node "$contract" delivery-init "$state_dir"
delivery_step manifestPolicy delivery_check_manifest
echo forbidden-authorization
`],{cwd:root,encoding:'utf8',env:{...process.env,STATE:d}});
 assert.notEqual(r.status,0);assert.doesNotMatch(r.stdout,/forbidden/);
 assert.match(readFileSync(join(d,'manifest-policy.json'),'utf8'),/privileged|PRIVILEGED/i);
 const report=spawnSync('node',['scripts/lab-contracts.mjs','delivery-result',d,'1','0'],{cwd:root,encoding:'utf8'});
 assert.equal(report.status,0,report.stderr);
 assert.equal(JSON.parse(readFileSync(join(d,'result.json'))).status,'POLICY_REJECTED');
});

test('real source capture succeeds with all laboratory trees absent',t=>{
 const d=directory(t), isolated=join(d,'implementacion');mkdirSync(isolated);
 for(const name of deliverySources) {
   const target=resolve(isolated,name);mkdirSync(dirname(target),{recursive:true});
   cpSync(resolve(root,name),target,{recursive:true});
 }
 assert.equal(captureDeliverySource(isolated).sha256,captureDeliverySource(root).sha256);
});

test('packaging failure preserves delivery observations but marks overall finalization ERROR',t=>{
 const r=orchestration(t,'',0,37);assert.equal(r.status,37);
 const final=JSON.parse(readFileSync(join(r.state,'finalization.json')));
 assert.equal(final.status,'ERROR');assert.equal(final.packagingExitStatus,37);
 assert.equal(JSON.parse(readFileSync(join(r.state,'package-failure.json'))).status,'ERROR');
});
