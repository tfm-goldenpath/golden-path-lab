import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
test('manual reviews and calibration eligibility: synthetic fixtures only', () => {
  const r = spawnSync('python3', ['-S', resolve(import.meta.dirname, 'test_manual_task_reviews.py')], {encoding:'utf8'});
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
