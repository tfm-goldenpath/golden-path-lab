import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const script = fileURLToPath(new URL('../../scripts/package-evidence.py', import.meta.url));
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gp-package-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'run-test');
  const output = path.join(directory, 'packages');
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, 'result.json'), '{"status":"PASS"}\n');
  fs.writeFileSync(path.join(source, 'run.log'), 'synthetic run: accepted\n');
  for (const name of ['state.json', 'config.json', 'kubeconfig', 'cosign.key']) {
    fs.writeFileSync(path.join(source, name), 'PRIVATE TEST FIXTURE\n');
  }
  return { source, output };
}

function inspectArchive(filename) {
  // Python's standard tar reader verifies the actual archive, without extracting it.
  const code = String.raw`
import hashlib,json,sys,tarfile
with tarfile.open(sys.argv[1], 'r:gz') as archive:
    names=archive.getnames()
    manifest=next(name for name in names if name.endswith('/SHA256SUMS.txt'))
    prefix=manifest.rsplit('/',1)[0]+'/'
    mismatches=[]
    for line in archive.extractfile(manifest).read().decode().splitlines():
        expected,name=line.split('  ',1)
        member=archive.extractfile(prefix+name)
        if member is None or hashlib.sha256(member.read()).hexdigest()!=expected:
            mismatches.append(name)
    print(json.dumps({'names':names,'mismatches':mismatches}))
`;
  return JSON.parse(execFileSync(python, ['-c', code, filename], { encoding: 'utf8' }));
}

test('the package preserves verifiable hashes and excludes state and credentials', t => {
  const { source, output } = fixture(t);
  execFileSync(python, [script, source, output, 'PASS']);
  const result = inspectArchive(path.join(output, 'run-test.tar.gz'));
  assert.deepEqual(result.mismatches, []);
  assert.ok(result.names.includes('run-test/result.json'));
  for (const name of ['state.json', 'config.json', 'kubeconfig', 'cosign.key']) {
    assert.ok(!result.names.includes('run-test/' + name));
  }
});

test('packaging twice preserves correct hashes and avoids duplicate members', t => {
  const { source, output } = fixture(t);
  execFileSync(python, [script, source, output, 'FAIL']);
  execFileSync(python, [script, source, output, 'PASS']);
  const result = inspectArchive(path.join(output, 'run-test.tar.gz'));
  assert.equal(new Set(result.names).size, result.names.length, 'The hash manifest must appear exactly once');
  assert.deepEqual(result.mismatches, []);
});
