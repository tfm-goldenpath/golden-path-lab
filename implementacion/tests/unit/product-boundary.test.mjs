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
const implementation=join(repository,'implementacion');
function temporary(t) {const d=mkdtempSync(join(tmpdir(),'product-boundary-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return d;}
function run(command,args,cwd) {return spawnSync(command,args,{cwd,encoding:'utf8',env:{...process.env,BASH_ENV:'',NODE_TEST_CONTEXT:''}});}
function pass(r) {assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
for(const cwd of [repository,implementation,'/tmp']) test(`old and new entry points preserve help and usage statuses from ${cwd}`,()=>{
 for(const entry of ['bin/deliver','implementacion/scripts/deliver.sh']) {
  const path=join(repository,entry);
  assert.match(pass(run('bash',[path,'--help'],cwd)),/cleanup/);
  assert.equal(run('bash',[path,'unsupported'],cwd).status,2);
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
  const d=temporary(t),root=join(d,'implementacion');mkdirSync(root);
  const target=join(root,name);mkdirSync(dirname(target),{recursive:true});symlinkSync('/tmp',target);
  const r=run('bash',['-c',`set -euo pipefail; source "${repository}/src/lib/context.sh"; root="$1"; delivery_roots`,'test',root],d);
  assert.notEqual(r.status,0);assert.match(r.stderr,/Ambiguous/);
 }
});
test('actual projected runtime executes source, service, policy and package operations with lab files absent',t=>{
 const d=temporary(t),root=join(d,'implementacion');mkdirSync(root);
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
