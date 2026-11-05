import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const repository=resolve(import.meta.dirname,'../../..');
test('canonical delivery entry resolves from an unrelated working directory',()=>{
 const r=spawnSync('bash',[resolve(repository,'bin/deliver'),'--help'],{cwd:'/tmp',encoding:'utf8'});
 assert.equal(r.status,0,r.stderr); assert.match(r.stdout,/bin\/deliver/);
});

import {mkdtempSync,cpSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,symlinkSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {deliverySources,captureDeliverySource} from '../../../src/delivery-source.mjs';
const implementation=join(repository,'implementation');
function temporary(t) {const d=mkdtempSync(join(tmpdir(),'product-boundary-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return d;}
function run(command,args,cwd) {return spawnSync(command,args,{cwd,encoding:'utf8',env:{...process.env,BASH_ENV:'',NODE_TEST_CONTEXT:''}});}
function pass(r) {assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
for(const cwd of [repository,implementation,join(repository,'implementacion'),'/tmp']) test(`old and new entry points preserve help and usage statuses from ${cwd}`,()=>{
 for(const entry of ['bin/deliver','implementation/scripts/deliver.sh','implementacion/scripts/deliver.sh']) {
  const path=join(repository,entry);
  assert.match(pass(run('bash',[path,'--help'],cwd)),/cleanup/);
  assert.equal(run('bash',[path,'unsupported'],cwd).status,2);
  assert.equal(run('bash',[path,'cleanup'],cwd).status,2);
  assert.match(run('bash',[path,'cleanup','relative'],cwd).stderr,/absolute delivery directory/);
 }
});
test('canonical module imports cannot provision or access the network',t=>{
 const d=temporary(t);
 const script=`set -euo pipefail
for tool in docker kind kubectl curl node python3 jq mktemp git; do eval "$tool() { echo forbidden-$tool; return 99; }"; done
for module in context admission local-environment delivery attestations workload local-delivery; do source "${repository}/src/lib/$module.sh"; done`;
 assert.equal(pass(run('bash',['-c',script],d)),'');
});
test('ambiguous evidence/private/service roots are rejected before provisioning',t=>{
 for(const name of ['evidence','.tmp','services/quotes-node']) {
  const d=temporary(t),root=join(d,'implementation');mkdirSync(root);
  const target=join(root,name);mkdirSync(dirname(target),{recursive:true});symlinkSync('/tmp',target);
  const r=run('bash',['-c',`set -euo pipefail; source "${repository}/src/lib/context.sh"; root="$1"; delivery_roots`,'test',root],d);
  assert.notEqual(r.status,0);assert.match(r.stderr,/Ambiguous/);
 }
});
test('actual projected runtime executes source, service, policy and package operations with lab files absent',t=>{
 const d=temporary(t),root=join(d,'implementation');mkdirSync(root);
 for(const name of deliverySources) {
  const target=resolve(root,name);mkdirSync(dirname(target),{recursive:true});
  cpSync(resolve(implementation,name),target,{recursive:true,filter:p=>!p.includes('/node_modules')&&!p.includes('/__pycache__')});
 }
 for(const name of ['tests','scripts/lib','scripts/demo.sh','scripts/package-evidence.py','demo','evidence']) assert.equal(existsSync(join(root,name)),false,name);
 // Explicitly synthetic source metadata for a unit test; real integration uses
 // the original candidate commit through product-boundary.py's sparse checkout.
 pass(run('git',['init','-q'],d));pass(run('git',['add','.'],d));
 pass(run('git',['-c','user.name=Synthetic test','-c','user.email=synthetic@example.invalid','commit','-qm','Synthetic projected runtime test'],d));
 cpSync(join(implementation,'tooling/node_modules'),join(root,'tooling/node_modules'),{recursive:true});
 assert.equal(captureDeliverySource(root).sha256,captureDeliverySource(implementation).sha256);
 const capture=()=>run('node',[join(d,'src/delivery-source.mjs'),root],d);
 pass(capture());
 const raw=join(root,'evidence/raw/delivery-synthetic');mkdirSync(raw,{recursive:true});
 const script=`set -Eeuo pipefail
root="$1"; mode=local; execution_profile=delivery-v1
for module in context delivery; do source "$root/../src/lib/$module.sh"; done
context_init; state_dir="$2"
delivery_service_tests
delivery_workflow_policy
node "$contract" manifest 'registry.invalid/quotes@sha256:${'a'.repeat(64)}' tfm-golden "$state_dir/tfm-golden.json" local
delivery_check_manifest
node "$engine_root/capture-build-inputs.mjs" services/quotes-node base ${'a'.repeat(40)} '' '' delivery-v1 > "$state_dir/build-inputs.json"`;
 pass(run('bash',['-c',script,'test',root,raw],root));
 writeFileSync(join(raw,'result.json'),JSON.stringify({schema:'legitimate-delivery-result/v1',status:'ERROR'}));
 writeFileSync(join(raw,'state.json'),'private');
 pass(run('python3',[join(d,'src/package_evidence.py'),raw,join(root,'evidence/packages'),'ERROR'],d));
 const verified=JSON.parse(pass(run('python3',[join(d,'src/verify_package.py'),join(root,'evidence/packages/delivery-synthetic.tar.gz')],d)));
 assert.ok(verified.internalHashes>3);
 const runtime=join(d,'src/lib/attestations.sh'),original=readFileSync(runtime);
 writeFileSync(runtime,Buffer.concat([original,Buffer.from('\n# changed\n')]));
 assert.match(capture().stderr,/differs from committed source/);
 writeFileSync(runtime,original);chmodSync(runtime,0o755);
 assert.match(capture().stderr,/differs from committed source/);
});

test('bare entry filenames resolve from their own directories',()=>{
 for(const [cwd,name] of [[join(repository,'bin'),'deliver'],[join(implementation,'scripts'),'deliver.sh'],[join(repository,'implementacion/scripts'),'deliver.sh']])
  assert.match(pass(run('bash',[name,'--help'],cwd)),/cleanup/);
});

test('bare compatibility imports need no external path-resolution command',()=>{
 const script=`set -euo pipefail
for tool in dirname pwd realpath docker kind kubectl curl node python3 jq mktemp git; do eval "$tool() { echo forbidden-$tool; return 99; }"; done
for module in context admission lab delivery attestations workload local-delivery; do source "$module.sh"; done`;
 assert.equal(pass(run('bash',['-c',script],join(implementation,'scripts/lib'))),'');
});

test('initialization rejects missing context and establishes the implementation CWD',()=>{
 const missing=run('bash',['-c',`source "${repository}/src/lib/context.sh"; context_init`],'/tmp');
 assert.notEqual(missing.status,0);assert.match(missing.stderr,/Initialize root and mode/);
 const r=run('bash',['-c',`set -Eeuo pipefail; source "${repository}/src/lib/context.sh"; root="$1"; mode=local; context_init; pwd -P`,'test',implementation],'/tmp');
 assert.equal(pass(r).trim(),implementation);
});
for(const operation of ['local_install_admission','local_apply_admission_policies']) test(`${operation} rejects missing required callback before side effects`,()=>{
 const r=run('bash',['-c',`set -Eeuo pipefail
source "${repository}/src/lib/context.sh"
source "${repository}/src/lib/local-environment.sh"
for tool in curl helm k python3; do eval "$tool() { echo forbidden; return 99; }"; done
${operation} initial`],'/tmp');
 assert.notEqual(r.status,0);assert.match(r.stderr,/readiness adapter/);assert.doesNotMatch(r.stdout,/forbidden/);
});
test('build capture failure stops before image build and subsequent authorization',t=>{
 const d=temporary(t);
 const r=run('bash',['-c',`set -Eeuo pipefail
source "${repository}/src/lib/context.sh"
source "${repository}/src/lib/delivery.sh"
state_dir="$1"; engine_root="${repository}/src"; commit=${'a'.repeat(40)}; SERVICE_NODE_IMAGE=node@sha256:${'b'.repeat(64)}
printf '{}' > "$state_dir/state.json"
docker() { echo forbidden-build; }
delivery_build tests/fixtures/l03 '' '' '' delivery-v1
echo forbidden-authorization`,'test',d],implementation);
 assert.notEqual(r.status,0);assert.match(r.stderr,/requires the quotes-node/);assert.doesNotMatch(r.stdout,/forbidden/);
});
for(const variable of ['GP_REUSE_VULNERABILITY_DB','DELIVERY_CACHE_FROM']) test(`product rejects laboratory control ${variable} before creating state`,()=>{
 const r=spawnSync('bash',[join(repository,'bin/deliver'),'local'],{cwd:'/tmp',encoding:'utf8',env:{...process.env,[variable]:'1',GP_STATE_DIR:''}});
 assert.notEqual(r.status,0);assert.match(r.stderr,/Measurement\/manual/);
});

test('legacy sourced imports remain effect-free from their own directory',()=>{
 const script=`set -euo pipefail
for tool in dirname pwd realpath docker kind kubectl curl node python3 jq mktemp git; do eval "$tool() { echo forbidden-$tool; return 99; }"; done
for module in context admission lab delivery attestations workload local-delivery; do source "$module.sh"; done`;
 assert.equal(pass(run('bash',['-c',script],join(repository,'implementacion/scripts/lib'))),'');
});
test('legacy Make forwards arguments to the canonical implementation CWD',()=>{
 const r=run('make',['-n','-C',join(repository,'implementacion'),'test-unit'],repository);
 assert.match(pass(r),/implementation/);assert.match(r.stdout,/node --test/);
});
for(const historical of [false,true]) test(`delivery cleanup loads original owned paths; historical=${historical}`,t=>{
 const d=temporary(t),canonical=join(d,'implementation'),original=join(d,historical?'implementacion':'implementation');
 mkdirSync(canonical,{recursive:true});
 const state=join(original,'evidence/raw/delivery-test'),privatePath=join(original,'.tmp/private-test');
 mkdirSync(state,{recursive:true});mkdirSync(privatePath,{recursive:true});
 writeFileSync(join(state,'state.json'),JSON.stringify({profile:'delivery-v1',mode:'local',private:privatePath,cluster:'tfm-delivery-test',registry:'tfm-zot-delivery-test',builder:'tfm-build-delivery-test',ownedContainers:{}}));
 const script=`set -Eeuo pipefail
source "${repository}/src/lib/context.sh"
root="$1"; mode=local; context_init
load_delivery_state "$2"
printf '%s\\n' "$private" "$evidence_root" "$root"`;
 const r=run('bash',['-c',script,'test',canonical,state],'/tmp');
 assert.equal(pass(r),`${privatePath}\n${original}/evidence\n${canonical}\n`);
 writeFileSync(join(state,'state.json'),JSON.stringify({profile:'delivery-v1',mode:'local',private:'/tmp/private-foreign',cluster:'tfm-delivery-test',registry:'tfm-zot-delivery-test',builder:'tfm-build-delivery-test',ownedContainers:{}}));
 assert.match(run('bash',['-c',script,'test',canonical,state],'/tmp').stderr,/Invalid private recovery/);
});

test('product and laboratory service capture preserve the same JSON and logical identity',()=>{
 const args=['services/quotes-node','node@sha256:'+'a'.repeat(64),'b'.repeat(40),'','','delivery-v1'];
 const product=JSON.parse(pass(run('node',[join(repository,'src/capture-build-inputs.mjs'),...args],implementation)));
 const lab=JSON.parse(pass(run('node',[join(implementation,'scripts/capture-build-inputs.mjs'),...args],implementation)));
 assert.deepEqual(product,lab);assert.deepEqual(Object.keys(product),['context','base','commit','files']);
 assert.equal(product.context,args[0]);assert.equal(product.base,args[1]);assert.equal(product.commit,args[2]);
 assert.ok(product.files.some(f=>f.path==='src/index.js'));
 for(const file of product.files) {assert.deepEqual(Object.keys(file),['path','mode','sha256','content']);assert.match(file.sha256,/^[a-f0-9]{64}$/);}
});

// Synthetic repository: actual legacy file link and coordinator/context; no
// infrastructure implementations are installed. Cleanup only prints the state.
function legacyLabFixture(t) {
 const d=temporary(t),root=join(d,'implementation'),old=join(d,'implementacion');
 for(const p of ['scripts/lib','tests/scenarios']) mkdirSync(join(root,p),{recursive:true});
 mkdirSync(join(d,'src/lib'),{recursive:true});mkdirSync(join(old,'scripts'),{recursive:true});
 cpSync(join(repository,'src/lib/context.sh'),join(d,'src/lib/context.sh'));
 for(const p of ['scripts/demo.sh','scripts/lib/context.sh','versions.env']) cpSync(join(implementation,p),join(root,p));
 symlinkSync('../../implementation/scripts/demo.sh',join(old,'scripts/demo.sh'));
 symlinkSync('../../implementation/scripts/lib',join(old,'scripts/lib'));
 symlinkSync('../implementation/versions.env',join(old,'versions.env'));
 symlinkSync('../implementation/tests',join(old,'tests'));
 for(const name of ['delivery','attestations','workload']) writeFileSync(join(root,`scripts/lib/${name}.sh`),'');
 for(const name of ['l01','f13','f07','f08','sbom','provenance','results','l05','runtime','f11','vulnerabilities']) writeFileSync(join(root,`tests/scenarios/${name}.sh`),'');
 writeFileSync(join(root,'scripts/lib/lab.sh'),`lab_check_environment() { printf 'preflight:%s:%s:%s:%s:%s\\n' "$root" "$PWD" "$mode" "$phase" "$GP_TEST_VALUE"; exit 37; }
cleanup() { printf 'cleanup:%s:%s:%s:%s\\n' "$root" "$state_dir" "$private" "$evidence_root"; return 23; }\n`);
 return {d,root,old,entry:join(old,'scripts/demo.sh')};
}
test('legacy demo local reaches canonical preflight and forwards mode, phase, environment and status',t=>{
 const {d,root,old,entry}=legacyLabFixture(t);
 for(const cwd of [d,root,old,join(old,'scripts'),'/tmp']) {
  const r=spawnSync('bash',[cwd===join(old,'scripts')?'demo.sh':entry,'local','reference'],{cwd,encoding:'utf8',env:{...process.env,BASH_ENV:'',GP_TEST_VALUE:'value with spaces'}});
  assert.equal(r.status,37,r.stderr);assert.equal(r.stdout,`preflight:${root}:${root}:local:reference:value with spaces\n`);
  for(const args of [['bad-mode'],['local','bad-phase']]) assert.equal(run('bash',[entry,...args],cwd).status,2);
 }
 const r=spawnSync('bash',[entry,'local'],{cwd:d,encoding:'utf8',env:{...process.env,BASH_ENV:'',GP_TEST_VALUE:'default'}});
 assert.equal(r.status,37,r.stderr);assert.match(r.stdout,/:local:run:default/);
});
for(const historical of [false,true]) test(`legacy demo cleanup validates saved roots without deleting resources; historical=${historical}`,t=>{
 const {d,root,old,entry}=legacyLabFixture(t),original=historical?old:root;
 const state=join(original,'evidence/raw/run-synthetic'),privatePath=join(original,'.tmp/private-synthetic');
 mkdirSync(state,{recursive:true});mkdirSync(privatePath,{recursive:true});
 const saved={mode:'local',private:privatePath,cluster:'tfm-demo-run-synthetic',registry:'tfm-zot-run-synthetic',builder:'tfm-build-run-synthetic'};
 const stateFile=join(state,'state.json');writeFileSync(stateFile,JSON.stringify(saved));
 const execute=(cwd,selected=state)=>spawnSync('bash',[cwd===join(old,'scripts')?'demo.sh':entry,'local','cleanup'],{cwd,encoding:'utf8',env:{...process.env,BASH_ENV:'',GP_STATE_DIR:selected}});
 for(const cwd of [d,root,join(old,'scripts'),'/tmp']) {
  const r=execute(cwd);assert.equal(r.status,23,r.stderr);
  assert.equal(r.stdout,`cleanup:${root}:${state}:${privatePath}:${original}/evidence\n`);
  assert.equal(readFileSync(stateFile,'utf8'),JSON.stringify(saved));assert.ok(existsSync(privatePath));
 }
 for(const badPrivate of [join(d,'.tmp/private-foreign'),join(historical?root:old,'.tmp/private-mismatch')]) {
  writeFileSync(stateFile,JSON.stringify({...saved,private:badPrivate}));
  const r=execute('/tmp');assert.equal(r.status,1);assert.match(r.stderr,/Invalid state resources/);assert.equal(r.stdout,'');
 }
 const foreign=join(d,'foreign/run-synthetic');mkdirSync(foreign,{recursive:true});
 writeFileSync(join(foreign,'state.json'),JSON.stringify(saved));
 const r=execute('/tmp',foreign);assert.equal(r.status,1);assert.match(r.stderr,/State is outside the lab/);assert.equal(r.stdout,'');
});

const legacyRootEntries=['demo.sh','paired-delivery.sh','paired-cleanup.sh','paired-dependencies.sh','check-environment.sh','check-policies.sh','install-security-tools.sh','smoke-environment.sh','defense-demo.sh','defense-demo/adapters.sh','defense-demo/early-adapters.sh'];
for(const name of legacyRootEntries) test(`legacy ${name} startup selects the canonical root`,t=>{
 const d=temporary(t),root=join(d,'implementation'),old=join(d,'implementacion');
 const canonical=join(root,'scripts',name),alias=join(old,'scripts',name);
 mkdirSync(dirname(canonical),{recursive:true});mkdirSync(dirname(alias),{recursive:true});
 const lines=readFileSync(join(implementation,'scripts',name),'utf8').split('\n');
 const end=lines.findIndex(line=>line.startsWith('root=$(cd') || line.startsWith('cd -- '));
 assert.ok(end>=0);
 // Execute the real entry's startup only; installation, infrastructure and
 // session operations are deliberately outside this bounded unit check.
 writeFileSync(canonical,lines.slice(0,end+1).join('\n')+'\nprintf "%s" "${root:-$PWD}"\n');
 symlinkSync(canonical,alias);
 for(const cwd of [d,dirname(alias),'/tmp'])
  assert.equal(pass(run('bash',[cwd===dirname(alias)?name.split('/').at(-1):alias],cwd)),root);
});
