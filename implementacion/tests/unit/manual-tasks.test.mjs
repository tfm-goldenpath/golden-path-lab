import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
test('manual task instrumentation: synthetic histories, not human measurements', () => {
  const r = spawnSync('python3', ['-S', resolve(import.meta.dirname, 'test_manual_tasks.py')], {encoding:'utf8'});
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
