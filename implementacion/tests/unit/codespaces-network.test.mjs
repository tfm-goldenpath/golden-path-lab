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
