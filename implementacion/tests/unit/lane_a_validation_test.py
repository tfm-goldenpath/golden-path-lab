"""Synthetic process/filesystem regressions, never integration observations."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[2] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location('validation', SCRIPTS / 'lane-a-validation.py')
V = importlib.util.module_from_spec(spec); spec.loader.exec_module(V)
import lane_a_evidence as E


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'implementacion'; self.root.mkdir()
        self.out = self.root / 'evidence/lane-a/demo'; self.out.mkdir(parents=True)
        E.write(self.out / 'source.json', {'suite': 'demo', 'sourceCommit': 'head', 'main': 'main'})
        (self.root / 'versions.env').write_text('SERVICE_NODE_IMAGE=registry/node@sha256:' + 'a' * 64 + '\n')
        E.write(self.root / 'tools.lock.json', {'images': {'buildkit': {'reference': 'buildkit@sha256:' + 'b' * 64}}})

    def fake(self, failure=None, cleanup=0):
        def execute(args, **kwargs):
            stage = Path(kwargs['stdout'].name).stem
            if stage == 'scenarios':
                run = self.root / 'evidence/raw/run-UNIT'; run.mkdir(parents=True)
                Path(kwargs['env']['GITHUB_OUTPUT']).write_text('state_dir=' + str(run) + '\ndocker_config=never-export\n')
                self.assertNotIn('GH_TOKEN', kwargs['env'])
                self.assertEqual(kwargs['env']['GP_L05_FROM_COMMIT'], V.PAIR[0])
                self.assertEqual(kwargs['env']['GP_L05_TO_COMMIT'], V.PAIR[1])
            kwargs['stdout'].write('synthetic ' + stage + '\n')
            return subprocess.CompletedProcess(args, cleanup if stage == 'buildkit-cleanup' else 37 if stage == failure else 0)
        return execute

    def test_prerequisite_stops_and_retains_original_code(self):
        for failed in ['doctor', 'shared-tests', 'smoke', 'buildkit-network', 'buildkit-create', 'buildkit-probe', 'l05-source', 'scenarios', 'required-results']:
            with self.subTest(stage=failed):
                # Fresh per-attempt output and scenario ownership.
                for p in (self.root / 'evidence/raw').glob('run-*'):
                    p.rmdir()
                V.write(self.out / 'stages.json', [])
                driver = V.Validation(self.out, 'demo', self.root, self.fake(failed))
                with patch.object(V, 'git', side_effect=lambda *a: 'main' if 'refs/heads/main^{commit}' in a else 'head'), patch.object(driver, 'collect'):
                    self.assertEqual(driver.perform(), 37)
                result = E.read(self.out / 'result.json')
                self.assertEqual(result['originalExitCode'], 37)
                self.assertEqual(result['status'], 'FAIL')
                self.assertTrue((self.out / (failed + '.log')).exists())
                stages = [r['stage'] for r in E.read(self.out / 'stages.json')]
                if failed not in ['scenarios', 'required-results']:
                    self.assertNotIn('scenarios', stages)

    def test_retention_failure_never_replaces_original_failure(self):
        driver = V.Validation(self.out, 'demo', self.root, self.fake('doctor'))
        with patch.object(V, 'git', side_effect=lambda *a: 'main' if 'refs/heads/main^{commit}' in a else 'head'), patch.object(driver, 'collect', side_effect=ValueError('copy failed')):
            self.assertEqual(driver.perform(), 37)
        result = E.read(self.out / 'result.json'); self.assertEqual(result['retentionExitCode'], 1)
        self.assertTrue((self.out / 'retention-error.json').exists())

    def test_successful_commands_without_coverage_cannot_pass(self):
        driver = V.Validation(self.out, 'demo', self.root, self.fake())
        with patch.object(V, 'git', side_effect=lambda *a: 'main' if 'refs/heads/main^{commit}' in a else 'head'), patch.object(driver, 'collect'):
            self.assertEqual(driver.perform(), 1)
        self.assertEqual(E.read(self.out / 'result.json')['status'], 'FAIL')

    def test_checksum_failure_preserves_original_status(self):
        driver = V.Validation(self.out, 'demo', self.root, self.fake('doctor'))
        with patch.object(V, 'git', side_effect=lambda *a: 'main' if 'refs/heads/main^{commit}' in a else 'head'), patch.object(driver, 'collect'), patch.object(V, 'hash_export', side_effect=OSError('hash failed')):
            self.assertEqual(driver.perform(), 37)
        self.assertEqual(E.read(self.out / 'result.json')['exitCode'], 37)
        self.assertTrue((self.out / 'checksum-error.json').exists())

    def test_capture_failure_preserves_original_status(self):
        driver = V.Validation(self.out, 'demo', self.root, self.fake('scenarios'))
        with patch.object(V, 'git', side_effect=lambda *a: 'main' if 'refs/heads/main^{commit}' in a else 'head'), patch.object(driver, 'collect'), patch.object(driver, 'find_run', side_effect=ValueError('bad capture')):
            self.assertEqual(driver.perform(), 37)
        self.assertTrue((self.out / 'capture-error.json').exists())

    def test_package_checks_original_internal_and_external_hashes(self):
        import io
        import hashlib
        package = self.out / 'run-UNIT.tar.gz'
        for corrupt in [False, True]:
            with tarfile.open(package, 'w:gz') as archive:
                for name, data in [('result.json', b'{"status":"FAIL"}'), ('SHA256SUMS.txt', ((('0'*64) if corrupt else hashlib.sha256(b'{"status":"FAIL"}').hexdigest())+'  result.json\n').encode())]:
                    member = tarfile.TarInfo('run-UNIT/'+name); member.size = len(data)
                    archive.addfile(member, io.BytesIO(data))
            Path(str(package)+'.sha256').write_text(E.sha(package)+'  '+package.name+'\n')
            if corrupt:
                with self.assertRaisesRegex(ValueError, 'Internal checksum'): E.verify_package(package)
            else:
                self.assertEqual(E.verify_package(package)['internalHashes'], 1)
                Path(str(package)+'.sha256').write_text('0'*64+'  '+package.name+'\n')
                with self.assertRaisesRegex(ValueError, 'Package checksum'): E.verify_package(package)

    def test_probe_bound_configuration_and_cleanup_failure(self):
        for failure in [None, 'buildkit-probe']:
            driver = V.Validation(self.out, 'demo', self.root, self.fake(failure, 29))
            with self.assertRaises(V.StageFailure) as raised:
                driver.buildkit()
            self.assertEqual(raised.exception.code, 37 if failure else 29)
            commands = {s['stage']: s['command'] for s in driver.stages}
            self.assertIn('network=kind', commands['buildkit-create'])
            self.assertIn('image=buildkit@sha256:' + 'b' * 64, commands['buildkit-create'])
            self.assertEqual(commands['buildkit-probe'][:4], ['timeout', '--signal=TERM', '--kill-after=10s', '60s'])
            self.assertIn('registry/node@sha256:', (self.out / 'buildkit-Dockerfile.txt').read_text())

    def test_real_bash_subprocess_keeps_errexit(self):
        driver = V.Validation(self.out, 'demo', self.root)
        with self.assertRaises(V.StageFailure) as raised:
            driver.command('errexit', ['bash', '-Eeuo', 'pipefail', '-c', 'false; echo forbidden'])
        self.assertEqual(raised.exception.code, 1)
        self.assertNotIn('forbidden', (self.out / 'errexit.log').read_text())

    def test_suite_selection_and_environment_allowlist(self):
        with patch.dict(os.environ, {'GH_TOKEN': 'secret', 'GITHUB_TOKEN': 'secret', 'GP_CGROUP_V1_COMPAT': '1', 'GP_L05_FROM_COMMIT': 'wrong'}):
            env = V.child_environment()
        self.assertFalse(any(k in env for k in ['GH_TOKEN', 'GITHUB_TOKEN', 'GP_CGROUP_V1_COMPAT', 'GP_L05_FROM_COMMIT']))
        driver = V.Validation(self.out, 'bogus', self.root)
        with self.assertRaises(ValueError): driver.perform()
        E.write(self.out / 'source.json', {'suite': 'vulnerabilities', 'sourceCommit': 'head', 'main': 'main'})
        def fake(args, **kwargs):
            if args == ['make', 'vulnerabilities']:
                self.assertNotIn('GP_L05_FROM_COMMIT', kwargs['env'])
                return subprocess.CompletedProcess(args, 31)
            return subprocess.CompletedProcess(args, 0)
        driver = V.Validation(self.out, 'vulnerabilities', self.root, fake)
        with patch.object(V, 'git', side_effect=lambda *a: 'main' if 'refs/heads/main^{commit}' in a else 'head'), patch.object(driver, 'collect'):
            self.assertEqual(driver.perform(), 31)
        self.assertFalse(any(r['stage'] == 'l05-source' for r in driver.stages))

    def test_effective_versions_survive_doctor_failure(self):
        driver = V.Validation(self.out, 'demo', self.root, self.fake('doctor'))
        with patch.object(V, 'git', side_effect=lambda *a: 'main' if 'refs/heads/main^{commit}' in a else 'head'):
            self.assertEqual(driver.perform(), 37)
        self.assertTrue((self.out / 'versions-docker-server.log').exists())
        self.assertEqual(E.read(self.out / 'databases/index.json')['status'], 'NOT_CREATED')
        self.assertTrue((self.out / 'SHA256SUMS.txt').exists())

    def database(self):
        run = self.root / 'evidence/raw/run-UNIT'; run.mkdir(parents=True)
        snapshot = self.root / '.tmp/vulnerability-db-run-UNIT'; (snapshot / 'db').mkdir(parents=True)
        (snapshot / 'db/trivy.db').write_bytes(b'synthetic database')
        E.write(snapshot / 'db/metadata.json', {'Version': 2, 'UpdatedAt': 'synthetic'})
        value = {'retrieval': {'directory': str(snapshot)}, 'sha256': {n: E.sha(snapshot / 'db' / n) for n in ['trivy.db','metadata.json']}, 'metadata': E.read(snapshot / 'db/metadata.json')}
        E.write(run / 'database-identity.json', value)
        (snapshot / 'cosign.key').write_text('SECRET')
        return run, snapshot

    def test_database_export_allowlist_integrity_and_drift(self):
        run, snapshot = self.database()
        for drift in [False, True]:
            if drift: (snapshot / 'db/trivy.db').write_bytes(b'changed')
            result = E.preserve_databases(run, self.out / 'databases', self.root)
            self.assertEqual(result[0]['status'], 'DATABASE_DRIFT' if drift else 'PASS')
            archive = self.out / 'databases' / result[0]['archive']
            self.assertEqual(E.sha(archive), Path(str(archive)+'.sha256').read_text().split()[0])
            with tarfile.open(archive) as tar:
                self.assertEqual(set(tar.getnames()), {'db/trivy.db','db/metadata.json','identity.json','SHA256SUMS.txt'})
                import hashlib
                for line in tar.extractfile('SHA256SUMS.txt').read().decode().splitlines():
                    digest, name = line.split('  ',1); self.assertEqual(hashlib.sha256(tar.extractfile(name).read()).hexdigest(), digest)

    def test_database_symlink_refused(self):
        run, snapshot = self.database()
        (snapshot / 'db/trivy.db').unlink(); (snapshot / 'db/trivy.db').symlink_to(snapshot / 'cosign.key')
        with self.assertRaises(ValueError): E.preserve_databases(run, self.out / 'databases', self.root)

    def test_database_preserved_even_if_original_package_is_invalid(self):
        run, _ = self.database(); packages = self.root / 'evidence/packages'; packages.mkdir()
        (packages / 'run-UNIT.tar.gz').write_text('invalid package')
        driver = V.Validation(self.out, 'demo', self.root); driver.run = run
        with self.assertRaises(ValueError): driver.collect()
        self.assertEqual(E.read(self.out / 'databases/index.json')['status'], 'PASS')

    def test_safe_smoke_copy_excludes_private_material(self):
        smoke = self.root / 'smoke'; smoke.mkdir()
        for name in ['run.log','result.json','kubeconfig','cosign.key']:
            (smoke / name).write_text('synthetic')
        E.copy_smoke(smoke, self.out / 'smoke')
        self.assertEqual({p.name for p in (self.out / 'smoke').iterdir()}, {'run.log','result.json'})

    def test_workflow_has_independent_restricted_jobs_and_locked_launcher(self):
        # Reuse the lab's pinned parser; the devcontainer has no PyYAML.
        parsed = subprocess.run(['conftest', 'parse', str(SCRIPTS.parents[1] / '.github/workflows/lane-a-validation.yml')], capture_output=True, text=True, check=True)
        workflow = json.loads(parsed.stdout)
        self.assertEqual(workflow.get('on', workflow.get('true')), {'workflow_dispatch': None})
        self.assertEqual(workflow['permissions'], {'contents': 'read'})
        job = workflow['jobs']['validation']
        self.assertFalse(job['strategy']['fail-fast'])
        self.assertEqual(job['strategy']['matrix']['suite'], list(V.SUITES))
        steps = job['steps']
        checkout = next(s for s in steps if s.get('uses', '').startswith('actions/checkout@'))
        self.assertEqual(checkout['with']['fetch-depth'], 0)
        self.assertFalse(checkout['with']['persist-credentials'])
        container = next(s for s in steps if s.get('id') == 'container')
        self.assertEqual(container['uses'], 'devcontainers/ci@513af61f4de4f75d37e4438f184ba4358f0fc1ca')
        self.assertEqual(container['with']['configFile'], '.devcontainer/implementacion/devcontainer.json')
        self.assertEqual(container['with']['push'], 'never')
        self.assertFalse(container['with']['inheritEnv'])
        self.assertEqual(container['with']['env'].strip(), 'CI=true')
        self.assertIn('make -C implementacion lane-a-validation', container['with']['runCmd'])
        for step in steps:
            if 'uses' in step:
                self.assertRegex(step['uses'], r'@[a-f0-9]{40}$')
            if step.get('uses', '').startswith('actions/upload-artifact@'):
                self.assertEqual(step['if'], 'always()')
                self.assertNotIn('.tmp', step['with']['path'])
        lock = E.read(SCRIPTS.parent / 'tooling/package-lock.json')
        self.assertEqual(lock['packages']['node_modules/@devcontainers/cli']['version'], '0.89.0')
        self.assertTrue(lock['packages']['node_modules/@devcontainers/cli']['integrity'].startswith('sha512-'))

    def test_main_preparation_records_explicit_ref_and_preserves_source(self):
        with patch.object(V, 'ROOT', self.root), patch.object(V, 'git', side_effect=lambda *a: V.REPOSITORY if a[:2] == ('remote','get-url') else 'mainhash' if any('origin/main' in v or 'heads/main^' in v for v in a) else 'headhash'), patch.object(V.subprocess, 'run', return_value=subprocess.CompletedProcess([],0,stdout='refs/heads/feature')), patch.dict(os.environ, {'GITHUB_ACTIONS':'true'}), patch.object(V.shutil, 'copyfile'):
            output = self.root / 'fresh'
            V.prepare(output, 'demo', True)
            self.assertEqual(E.read(output / 'source.json')['main'], 'mainhash')
            calls = V.subprocess.run.call_args_list
            self.assertTrue(any('update-ref' in c.args[0] and 'refs/heads/main' in c.args[0] for c in calls))


if __name__ == '__main__': unittest.main()
