import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
test('Codespaces forwarding: synthetic guards, idempotency and rollback',()=>{
  const result=spawnSync('python3',['-S',resolve(import.meta.dirname,'codespaces_network_test.py')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
});
// Synthetic commands stop at registry/builder creation; no infrastructure exists.
for (const [mode,codespaces,failure] of [['local','true',0],['local','true',23],['local','false',0],['github','true',0]]) {
  test(`lab networking hook: ${mode}, Codespaces=${codespaces}, status=${failure}`,t=>{
    const dir=mkdtempSync(resolve(tmpdir(),'synthetic-network-'));
    t.after(()=>rmSync(dir,{recursive:true,force:true}));
    const result=spawnSync('bash',['--noprofile','--norc','-c',String.raw`
set -Eeuo pipefail
source "$LAB"
private=$FIXTURE;state_dir=$FIXTURE;lock=synthetic-lock
cluster=tfm-demo-run-synthetic;registry=synthetic-registry;builder=synthetic-builder
image_repo=synthetic-repository;KIND_NODE_IMAGE=synthetic-image
record() { :; }
put() { :; }
kind() { echo cluster >> "$FIXTURE/trace"; }
jq() { echo synthetic-image; }
python3() { printf 'helper %s\n' "$*" >> "$FIXTURE/trace"; return "$FAILURE"; }
docker() {
  if [[ $1 == info ]]; then echo 2; return; fi
  echo "docker $1" >> "$FIXTURE/trace"
  return 39
}
lab_create
echo unexpected-success
`],{encoding:'utf8',env:{...process.env,BASH_ENV:'',LAB:resolve(import.meta.dirname,'../../scripts/lib/lab.sh'),
      FIXTURE:dir,mode,CODESPACES:codespaces,FAILURE:String(failure)}});
    assert.equal(result.status,failure || 39,result.stderr);
    const trace=readFileSync(resolve(dir,'trace'),'utf8');
    if (mode==='local' && codespaces==='true') {
      assert.match(trace,/^cluster\nhelper scripts\/codespaces-network.py ensure --cluster tfm-demo-run-synthetic --output .*\/codespaces-network.json\n/);
      if (failure) assert.doesNotMatch(trace,/docker/);
    } else assert.doesNotMatch(trace,/helper/);
    assert.doesNotMatch(result.stdout,/unexpected-success/);
  });
}

// CLI acceptance only: no network, Docker or firewall operations are executed.
for(const [cluster,status] of [['tfm-demo-run-historical',0],['tfm-delivery-abcdefgh',0],['tfm-delivery-short',2]]) {
 test(`network adapter cluster scope: ${cluster}`,()=>{
  const script=`import importlib.util, contextlib, sys
spec=importlib.util.spec_from_file_location("network",sys.argv[1]); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
class Fake:
    data={"status":"SYNTHETIC"}
    def __init__(self,*args): pass
    def execute(self,*args): return 0
mod.Recovery=Fake; mod.mutation_lock=contextlib.nullcontext
sys.argv=["network","check","--cluster",sys.argv[2]]
sys.exit(mod.main())`;
  const r=spawnSync('python3',['-c',script,resolve(import.meta.dirname,'../../scripts/codespaces-network.py'),cluster],{encoding:'utf8'});
  assert.equal(r.status,status,r.stderr);
 });
}
