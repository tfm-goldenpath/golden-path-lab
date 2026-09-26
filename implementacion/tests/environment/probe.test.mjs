import test from 'node:test';
import assert from 'node:assert/strict';
import { environmentProbe } from './probe.mjs';

test('the probe identifies the check and its runtime', () => {
  assert.deepEqual(environmentProbe(), {
    check: 'environment-smoke', ok: true, node: process.version,
    platform: process.platform, arch: process.arch,
  });
});
