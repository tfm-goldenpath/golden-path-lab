import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, openSync, closeSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
const script = resolve(import.meta.dirname, '../../scripts/package-evidence.py');
function command(root, args) {
  const out = openSync(join(root,'out'), 'w'), err = openSync(join(root,'err'), 'w');
  const result = spawnSync('python3', args, {stdio:['ignore',out,err]});
  closeSync(out); closeSync(err);
  assert.ifError(result.error);
  return {...result, stdout:readFileSync(join(root,'out'),'utf8'), stderr:readFileSync(join(root,'err'),'utf8')};
}
for (const symlink of [false,true]) {
  test(`F07 packaging ${symlink ? 'rejects symlinked scenario directory' : 'retains backup, attribution and failed recovery with valid hashes'}`, t => {
    const root = mkdtempSync(join(tmpdir(),'gp-f07-package-'));
    t.after(() => rmSync(root,{recursive:true,force:true}));
    const run = join(root,'run-fixture'); mkdirSync(run);
    const scenario = join(run,'F07');
    if (symlink) { mkdirSync(join(root,'outside')); symlinkSync(join(root,'outside'),scenario); }
    else {
      mkdirSync(scenario);
      for (const name of ['before.json','negative.json','after-denial.json','restored.json','attribution.json','recovery.json']) writeFileSync(join(scenario,name),'{}\n');
      writeFileSync(join(scenario,'restore.log'),'synthetic restoration failure\n');
      writeFileSync(join(scenario,'state.json'),'sensitive\n');
      writeFileSync(join(scenario,'secret.txt'),'-----BEGIN PRIVATE KEY-----\nsynthetic\n');
    }
    const result = command(root,[script,run,join(root,'packages'),'FAIL']);
    if (symlink) { assert.notEqual(result.status,0); assert.match(result.stderr,/symlinked/); return; }
    assert.equal(result.status,0,result.stderr);
    const check = command(root,['-c',String.raw`
import hashlib,json,sys,tarfile
with tarfile.open(sys.argv[1]) as archive:
    names=archive.getnames()
    for line in archive.extractfile('run-fixture/SHA256SUMS.txt').read().decode().splitlines():
        expected,name=line.split('  ',1)
        assert hashlib.sha256(archive.extractfile('run-fixture/'+name).read()).hexdigest()==expected
    print(json.dumps(names))
`,join(root,'packages/run-fixture.tar.gz')]);
    assert.equal(check.status,0,check.stderr);
    const names = JSON.parse(check.stdout);
    for (const name of ['before.json','negative.json','after-denial.json','restored.json','attribution.json','recovery.json','restore.log']) assert.ok(names.includes('run-fixture/F07/'+name));
    for (const name of ['state.json','secret.txt']) assert.ok(!names.includes('run-fixture/F07/'+name));
    const summary = JSON.parse(readFileSync(join(run,'execution-summary.json')));
    assert.equal(summary.status,'FAIL');
    assert.match(summary.F07,/evidence-retained/);
  });
}
