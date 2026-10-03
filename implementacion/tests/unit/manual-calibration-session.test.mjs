// Synthetic command dispatch only; no Docker or human calibration is executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'synthetic-calibration-session-'));
  t.after(() => rmSync(repo, {recursive:true, force:true}));
  const bin = join(repo, 'bin'), db = join(repo, 'database/db');
  mkdirSync(bin); mkdirSync(db, {recursive:true});
  for (const name of ['trivy.db', 'metadata.json']) writeFileSync(join(db,name), 'synthetic');
  const script = join(repo,'session.sh');
  cpSync(resolve(import.meta.dirname,'../../scripts/manual-calibration-session.sh'),script);
  writeFileSync(join(bin,'git'), '#!/bin/bash\nprintf "%s\\n" "$SYNTHETIC_REPO"\n', {mode:0o755});
  writeFileSync(join(bin,'make'), '#!/bin/bash\necho doctor >> "$SYNTHETIC_REPO/calls"\n', {mode:0o755});
  writeFileSync(join(bin,'python3'), `#!/bin/bash
printf '%s\\n' "$*" >> "$SYNTHETIC_REPO/calls"
if [[ "$2" == prepare ]]; then exit "$SYNTHETIC_PREPARE_EXIT"; fi
if [[ "$2" == plan ]]; then exit "$SYNTHETIC_PLAN_EXIT"; fi
`, {mode:0o755});
  const env = {...process.env, PATH:bin+':'+process.env.PATH, BASH_ENV:'', SYNTHETIC_REPO:repo,
    SYNTHETIC_PREPARE_EXIT:'0', SYNTHETIC_PLAN_EXIT:'0', MANUAL_DB:join(repo,'database'),
    MANUAL_SESSION:'synthetic-session', MANUAL_EDITOR:'Synthetic editor 1', MANUAL_PARTICIPANT:'synthetic actor',
    MANUAL_KNOWLEDGE:'synthetic previous exposure', MANUAL_SCENARIO:'F11', MANUAL_ARM:'G'};
  return {repo, script, env};
}
for (const [plan,prepare] of [[0,0],[0,130],[1,0]]) {
  test(`session prepares once and never starts a timer: plan=${plan}, prepare=${prepare}`, t => {
    const f=fixture(t);
    const r=spawnSync('bash',[f.script,'prepare'],{env:{...f.env,SYNTHETIC_PLAN_EXIT:String(plan),SYNTHETIC_PREPARE_EXIT:String(prepare)},encoding:'utf8'});
    assert.equal(r.status,plan || prepare,r.stderr);
    const calls=readFileSync(join(f.repo,'calls'),'utf8');
    assert.match(calls,/plan --reuse/);
    assert.equal(calls.includes('prepare --follow'),plan===0);
    assert.doesNotMatch(calls,/manual-tasks.py start|manual-tasks.py event|manual-tasks.py check/);
  });
}
test('session requires declared inputs before any preparation command',t=>{
  const f=fixture(t);
  const r=spawnSync('bash',[f.script,'prepare'],{env:{...f.env,MANUAL_EDITOR:''},encoding:'utf8'});
  assert.equal(r.status,1);assert.match(r.stderr,/Set MANUAL_EDITOR/);
  assert.throws(()=>readFileSync(join(f.repo,'calls')), {code:'ENOENT'});
});
test('session uses the saved task path and forwards the human note unchanged',t=>{
  const f=fixture(t), session=join(f.repo,'implementacion/evidence/manual-tasks/synthetic-session');
  mkdirSync(session,{recursive:true});
  const task=join(session,'calibration/task-synthetic');
  writeFileSync(join(session,'current-task.json'),JSON.stringify({taskDirectory:task}));
  const r=spawnSync('bash',[f.script,'event','investigate','--note','synthetic real argument with spaces'],{env:f.env,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  assert.match(readFileSync(join(f.repo,'calls'),'utf8'),new RegExp('event '+task+' investigate --note synthetic real argument with spaces'));
  writeFileSync(join(session,'current-task.json'),JSON.stringify({taskDirectory:'/outside/task'}));
  const wrong=spawnSync('bash',[f.script,'start'],{env:f.env,encoding:'utf8'});
  assert.equal(wrong.status,1);assert.match(wrong.stderr,/another session/);
});
