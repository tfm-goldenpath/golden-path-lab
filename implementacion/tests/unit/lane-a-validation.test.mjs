import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
test('lane A runner: synthetic prerequisite, status, ownership and retention regressions',()=>{
 const run=spawnSync('python3',[resolve(import.meta.dirname,'lane_a_validation_test.py')],{encoding:'utf8',timeout:60000});
 assert.equal(run.status,0,run.stdout+run.stderr);
});
