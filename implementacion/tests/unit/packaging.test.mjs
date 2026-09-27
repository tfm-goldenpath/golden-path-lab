import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash, generateKeyPairSync } from 'node:crypto';

const script = fileURLToPath(new URL('../../scripts/package-evidence.py', import.meta.url));
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const publicKey = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  .publicKey.export({ type: 'spki', format: 'pem' });

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gp-package-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'run-test');
  const output = path.join(directory, 'packages');
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, 'result.json'), '{"status":"PASS"}\n');
  fs.writeFileSync(path.join(source, 'run.log'), 'synthetic run: accepted\n');
  for (const name of ['state.json', 'config.json', 'kubeconfig', 'cosign.key', 'private-key.pem', 'private-key.txt']) {
    fs.writeFileSync(path.join(source, name), '-----BEGIN PRIVATE KEY-----\nSYNTHETIC\n-----END PRIVATE KEY-----\n');
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
  for (const name of ['state.json', 'config.json', 'kubeconfig', 'cosign.key', 'private-key.pem', 'private-key.txt']) {
    assert.ok(!result.names.includes('run-test/' + name));
  }
});

test('private-key PEM markers are excluded across encrypted and punctuated labels', t => {
  const { source, output } = fixture(t);
  const update = path.join(source, 'L01-update');
  fs.mkdirSync(update);
  const labels = ['PRIVATE KEY', 'ENCRYPTED PRIVATE KEY', 'ENCRYPTED COSIGN PRIVATE KEY',
    'ENCRYPTED SIGSTORE PRIVATE KEY', 'RSA PRIVATE KEY', 'EC PRIVATE KEY', 'OPENSSH PRIVATE KEY',
    'EC-CUSTOM PRIVATE KEY'];
  for (const directory of [source, update]) {
    for (const [index, label] of labels.entries()) {
      fs.writeFileSync(path.join(directory, `secret-${index}.txt`),
        `diagnostic output\n-----BEGIN ${label}-----\nSYNTHETIC\n-----END ${label}-----\n`);
    }
  }
  execFileSync(python, [script, source, output, 'PASS']);
  const result = inspectArchive(path.join(output, 'run-test.tar.gz'));
  assert.deepEqual(result.mismatches, []);
  assert.ok(!result.names.some(name => /\/secret-\d+\.txt$/.test(name)));
});

const invalidPublicKeys = [
  ['arbitrary text', 'sensitive fixture without a PEM header'],
  ['another PEM type', '-----BEGIN CERTIFICATE-----\nYQ==\n-----END CERTIFICATE-----\n'],
  ['invalid Base64', '-----BEGIN PUBLIC KEY-----\nnot!base64\n-----END PUBLIC KEY-----\n'],
  ['noncanonical Base64', '-----BEGIN PUBLIC KEY-----\nYR==\n-----END PUBLIC KEY-----\n'],
  ['leading text', `sensitive fixture\n${publicKey}`],
  ['trailing text', `${publicKey}sensitive fixture\n`],
  ['multiple public-key blocks', publicKey + publicKey],
  ['a public block followed by a private block', `${publicKey}-----BEGIN ENCRYPTED COSIGN PRIVATE KEY-----\nSYNTHETIC\n-----END ENCRYPTED COSIGN PRIVATE KEY-----\n`],
];

for (const [label, content] of invalidPublicKeys) {
  test(`the public-key filename does not admit ${label}`, t => {
    const { source, output } = fixture(t);
    const update = path.join(source, 'L01-update');
    fs.mkdirSync(update);
    for (const directory of [source, update]) {
      fs.writeFileSync(path.join(directory, 'development-public-key.pem'), content);
    }
    execFileSync(python, [script, source, output, 'PASS']);
    const result = inspectArchive(path.join(output, 'run-test.tar.gz'));
    assert.deepEqual(result.mismatches, []);
    assert.ok(!result.names.some(name => name.endsWith('/development-public-key.pem')));
    assert.ok(result.names.includes('run-test/result.json'));
  });
}

test('replacement evidence is retained with separate hashes and excludes its credentials', t => {
  const { source, output } = fixture(t);
  const update = path.join(source, 'L01-update');
  fs.mkdirSync(update);
  fs.writeFileSync(path.join(update, 'verified-results.json'), '{"replacement":true}\n');
  for (const directory of [source, update]) {
    for (const name of ['image.bundle.json', 'sbom.bundle.json', 'provenance.bundle.json', 'results.bundle.json', 'evidence-profile.json']) {
      fs.writeFileSync(path.join(directory, name), JSON.stringify({ synthetic: true, file: name, directory: path.basename(directory) }));
    }
    fs.writeFileSync(path.join(directory, 'development-public-key.pem'),
      directory === update ? publicKey.replaceAll('\n', '\r\n') : publicKey);
  }
  fs.writeFileSync(path.join(update, 'state.json'), '{"private":"fixture"}');
  fs.writeFileSync(path.join(update, 'secret.log'), '-----BEGIN PRIVATE KEY-----\nfixture');
  const unrelated = path.join(source, 'unrelated');
  fs.mkdirSync(unrelated);
  fs.writeFileSync(path.join(unrelated, 'ignored.json'), '{}');
  execFileSync(python, [script, source, output, 'PASS']);
  const result = inspectArchive(path.join(output, 'run-test.tar.gz'));
  assert.deepEqual(result.mismatches, []);
  assert.ok(result.names.includes('run-test/L01-update/verified-results.json'));
  for (const directory of ['run-test', 'run-test/L01-update']) {
    for (const name of ['image.bundle.json', 'sbom.bundle.json', 'provenance.bundle.json', 'results.bundle.json', 'evidence-profile.json', 'development-public-key.pem']) {
      assert.ok(result.names.includes(`${directory}/${name}`), `${directory}/${name}`);
    }
  }
  assert.ok(!result.names.includes('run-test/L01-update/state.json'));
  assert.ok(!result.names.includes('run-test/L01-update/secret.log'));
  assert.ok(!result.names.some(name => name.includes('/unrelated/')));
});

test('replacement evidence directory cannot redirect packaging outside the run', t => {
  const { source, output } = fixture(t);
  const external = path.join(path.dirname(source), 'external');
  fs.mkdirSync(external);
  fs.writeFileSync(path.join(external, 'unrelated.json'), '{}');
  fs.symlinkSync(external, path.join(source, 'L01-update'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => execFileSync(python, [script, source, output, 'PASS'], { stdio: 'pipe' }));
  assert.ok(!fs.existsSync(path.join(output, 'run-test.tar.gz')));
});

for (const name of ['execution-summary.json', 'SHA256SUMS.txt']) {
  test(`packaging rejects a symlinked ${name} without changing its target`, t => {
    const { source, output } = fixture(t);
    const target = path.join(path.dirname(source), 'outside.txt');
    fs.writeFileSync(target, 'preserve me');
    try { fs.symlinkSync(target, path.join(source, name)); }
    catch (error) {
      if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows symlink privilege required');
      throw error;
    }
    assert.throws(() => execFileSync(python, [script, source, output, 'PASS'], {stdio:'pipe'}));
    assert.equal(fs.readFileSync(target, 'utf8'), 'preserve me');
    assert.ok(!fs.existsSync(path.join(output, 'run-test.tar.gz')));
  });
}

for (const name of ['run-test.tar.gz', 'run-test.tar.gz.sha256']) {
  for (const dangling of [false, true]) {
    test(`packaging rejects a ${dangling ? 'dangling' : 'live'} output symlink for ${name}`, t => {
      const { source, output } = fixture(t);
      fs.mkdirSync(output);
      const target = path.join(path.dirname(source), 'outside.txt');
      if (!dangling) fs.writeFileSync(target, 'preserve me');
      const other = path.join(output, name.endsWith('.sha256') ? 'run-test.tar.gz' : 'run-test.tar.gz.sha256');
      fs.writeFileSync(other, 'previous output');
      try { fs.symlinkSync(target, path.join(output, name)); }
      catch (error) {
        if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows symlink privilege required');
        throw error;
      }
      assert.throws(() => execFileSync(python, [script, source, output, 'PASS'], { stdio: 'pipe' }));
      assert.equal(fs.existsSync(target), !dangling);
      if (!dangling) assert.equal(fs.readFileSync(target, 'utf8'), 'preserve me');
      assert.ok(fs.lstatSync(path.join(output, name)).isSymbolicLink());
      assert.equal(fs.readFileSync(other, 'utf8'), 'previous output');
      assert.deepEqual(fs.readdirSync(output).sort(), ['run-test.tar.gz', 'run-test.tar.gz.sha256']);
    });
  }
}

for (const name of ['run-test.tar.gz', 'run-test.tar.gz.sha256']) {
  test(`atomic publication does not follow a ${name} symlink introduced after validation`, t => {
    const { source, output } = fixture(t);
    const target = path.join(path.dirname(source), 'outside.txt');
    const probe = path.join(path.dirname(source), 'probe');
    fs.writeFileSync(target, 'preserve me');
    try { fs.symlinkSync(target, probe); }
    catch (error) {
      if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows symlink privilege required');
      throw error;
    }
    fs.unlinkSync(probe);
    const code = String.raw`
import importlib.util, os, sys
from pathlib import Path
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('packager', sys.argv[1])
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)
replace = os.replace
def raced_replace(temporary, destination):
    if Path(destination).name == sys.argv[5]:
        os.symlink(sys.argv[4], destination)
    replace(temporary, destination)
with patch.object(packager.os, 'replace', side_effect=raced_replace):
    packager.package(sys.argv[2], sys.argv[3], 'PASS')
`;
    execFileSync(python, ['-B', '-c', code, script, source, output, target, name]);
    assert.equal(fs.readFileSync(target, 'utf8'), 'preserve me');
    assert.ok(!fs.lstatSync(path.join(output, name)).isSymbolicLink());
    const archive = path.join(output, 'run-test.tar.gz');
    const digest = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
    assert.equal(fs.readFileSync(`${archive}.sha256`, 'utf8'), `${digest}  run-test.tar.gz\n`);
    assert.deepEqual(inspectArchive(archive).mismatches, []);
  });
}

test('packaging twice preserves correct hashes and avoids duplicate members', t => {
  const { source, output } = fixture(t);
  execFileSync(python, [script, source, output, 'FAIL']);
  execFileSync(python, [script, source, output, 'PASS']);
  const result = inspectArchive(path.join(output, 'run-test.tar.gz'));
  assert.equal(new Set(result.names).size, result.names.length, 'The hash manifest must appear exactly once');
  assert.deepEqual(result.mismatches, []);
  const archive = path.join(output, 'run-test.tar.gz');
  const digest = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  assert.equal(fs.readFileSync(`${archive}.sha256`, 'utf8'), `${digest}  run-test.tar.gz\n`);
  assert.deepEqual(fs.readdirSync(output).sort(), ['run-test.tar.gz', 'run-test.tar.gz.sha256']);
});
