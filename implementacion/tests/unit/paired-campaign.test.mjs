import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
test('campaign plan, authorization and analysis (explicitly synthetic fixtures)',()=>{
  const r=spawnSync('python3',['-S',resolve(import.meta.dirname,'test_paired_campaign.py')],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);
});
