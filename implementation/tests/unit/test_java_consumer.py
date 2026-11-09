"""Synthetic reports/SQLite/containers; no genuine scanner or integration claim."""
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import errno
import sys
import hashlib
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]

def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT/'src'/name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

R = load('java-test-reports.py')
D = load('vulnerability-database.py')
J = load('java-tests.py')

class Reports(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='synthetic java reports ')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.file = self.root/'TEST-synthetic.xml'
        self.good = '<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="synthetic" classname="Fixture"/></testsuite>'
        self.file.write_text(self.good)

    def test_valid_report_and_process_status(self):
        self.assertEqual(R.validate(self.root, 0, 0)['tests'], 1)
        with self.assertRaisesRegex(ValueError, 'process failed'):
            R.validate(self.root, 0, 7)

    def test_empty_missing_failed_skipped_malformed_and_inconsistent(self):
        for data in ['', '<bad>', self.good.replace('tests="1"', 'tests="0"'),
                     self.good.replace('failures="0"', 'failures="1"'),
                     self.good.replace('skipped="0"', 'skipped="1"'),
                     self.good.replace('/>', '><skipped/></testcase>'),
                     self.good.replace('tests="1"', 'tests="2"'),
                     '<!DOCTYPE testsuite>'+self.good]:
            with self.subTest(data=data):
                self.file.write_text(data)
                with self.assertRaises(Exception): R.validate(self.root, 0, 0)
        self.file.unlink()
        with self.assertRaisesRegex(ValueError, 'Missing'): R.validate(self.root, 0, 0)

    def test_stale_and_symlink(self):
        os.utime(self.file, ns=(1, 1))
        with self.assertRaisesRegex(ValueError, 'Stale'): R.validate(self.root, 2, 0)
        self.file.unlink()
        sentinel = self.root/'harmless-sentinel'; sentinel.write_text('SYNTHETIC SENTINEL')
        self.file.symlink_to(sentinel)
        with self.assertRaisesRegex(ValueError, 'nonregular'): R.validate(self.root, 0, 0)

class Database(unittest.TestCase):
    def test_required_java_missing_corrupt_and_hash_change(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); (root/'db').mkdir()
            (root/'db/trivy.db').write_bytes(b'SYNTHETIC MAIN DB')
            (root/'db/metadata.json').write_text(json.dumps({'Version':2, 'UpdatedAt':'synthetic'}))
            old = D.identity(root)
            self.assertEqual(old['schema'], 1)
            with self.assertRaises(ValueError): D.identity(root, True)
            (root/'java-db').mkdir()
            file=root/'java-db/trivy-java.db'
            (root/'java-db/metadata.json').write_text(json.dumps({'Version':1, 'UpdatedAt':'synthetic'}))
            file.write_text('CORRUPT SYNTHETIC DB')
            with self.assertRaises(sqlite3.DatabaseError): D.identity(root, True)
            file.unlink()
            with sqlite3.connect(file) as db:
                db.execute('CREATE TABLE artifacts(id INTEGER PRIMARY KEY, group_id TEXT, artifact_id TEXT)')
                db.execute('CREATE TABLE indices(artifact_id INTEGER, version TEXT, sha1 BLOB, archive_type TEXT)')
            before=D.identity(root, True)
            self.assertEqual(before['schema'], 2)
            self.assertEqual(D.identity(root), old)
            with sqlite3.connect(file) as db: db.execute("INSERT INTO artifacts VALUES(1, 'synthetic', 'changed')")
            self.assertNotEqual(before['java']['sha256'], D.identity(root, True)['java']['sha256'])
            file.unlink(); file.symlink_to(root/'db/trivy.db')
            with self.assertRaises(ValueError): D.identity(root, True)

class Ownership(unittest.TestCase):
    def test_immutable_id_owner_and_image_required(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); cid='a'*64
            (root/'java-test-container.id').write_text(cid)
            correct={'Id':cid, 'Config':{'Labels':{'goldenpath.java-test':str(root)}, 'Image':J.PIN['builderImage']}}
            for key in ('Id', 'owner', 'image'):
                wrong=json.loads(json.dumps(correct))
                if key=='Id': wrong[key]='b'*64
                elif key=='owner': wrong['Config']['Labels']['goldenpath.java-test']='foreign'
                else: wrong['Config']['Image']='foreign'
                with patch.object(J, 'docker', side_effect=[cid,json.dumps([wrong])]) as docker:
                    with self.assertRaisesRegex(ValueError,'foreign'): J.cleanup(root)
                    self.assertEqual(docker.call_count,2)
            with patch.object(J, 'docker', side_effect=[cid,json.dumps([correct]),cid,'']) as docker:
                J.cleanup(root); self.assertEqual(docker.call_args_list[-2].args,('rm','-f',cid))
            with patch.object(J, 'docker', return_value='') as docker: J.cleanup(root)
            with patch.object(J, 'docker', side_effect=RuntimeError('transport')):
                with self.assertRaises(RuntimeError): J.cleanup(root)

    def test_absence_confirmation_and_ambiguous_creation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); cid = 'a'*64
            correct = {'Id':cid, 'Config':{'Labels':{'goldenpath.java-test':str(root)}, 'Image':J.PIN['builderImage']}}
            # In-memory ID allows retirement when receipt writing failed.
            with patch.object(J, 'docker', side_effect=[cid, json.dumps([correct]), cid, cid]):
                with self.assertRaisesRegex(ValueError, 'not confirmed'): J.cleanup(root, cid=cid)
            with patch.object(J, 'docker', return_value=cid) as docker:
                with self.assertRaisesRegex(ValueError, 'Unresolved'): J.cleanup(root, creation_attempted=True)
                self.assertEqual(docker.call_count, 1)  # No deletion by label alone.
            (root/'java-test-container.id').symlink_to(root/'missing')
            with self.assertRaisesRegex(ValueError, 'Symlinked'): J.cleanup(root)

class Execution(unittest.TestCase):
    def test_process_status_fresh_working_directory_limits_and_interrupt_cleanup(self):
        service=ROOT/'templates/java-http/service'
        for status in (0, 5, 'interrupt'):
            with self.subTest(status=status), tempfile.TemporaryDirectory() as temp:
                out=Path(temp)/'observations'
                calls=[]
                def docker(*args):
                    calls.append(args)
                    if args[0]=='create': return 'a'*64
                    if '--format' in args: return json.dumps({'ExitCode':0, 'OOMKilled':False, 'Running':False, 'Error':''})
                    return json.dumps([{'Image':'sha256:'+'b'*64}])
                def execute(command, **kwargs):
                    self.assertEqual(command, ['docker','start','-a','a'*64])
                    create=calls[0]
                    self.assertEqual(create[create.index('--workdir')+1], '/work/service')
                    self.assertEqual(create[create.index('--memory')+1], '1g')
                    self.assertEqual(create[create.index('--cpus')+1], '2')
                    self.assertNotIn('docker.sock', str(create))
                    mount=create[create.index('--mount')+1]
                    work=Path(mount.split('src=')[1].split(',dst=')[0])
                    self.assertTrue((work/'service/src/test/resources/greeting.json').is_file())
                    self.assertFalse((work/'service/target').exists())
                    reports=work/'service/target/surefire-reports'; reports.mkdir(parents=True)
                    (reports/'TEST-synthetic.xml').write_text('<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="synthetic" classname="Fixture"/></testsuite>')
                    if status=='interrupt': raise InterruptedError('synthetic interruption')
                    return type('Result', (), {'returncode':status})()
                with patch.object(J,'capacity'), patch.object(J,'docker',side_effect=docker), patch.object(J.subprocess,'run',side_effect=execute), patch.object(J,'cleanup') as cleanup:
                    if status==0:
                        J.run(service,out)
                        self.assertEqual(json.loads((out/'java-tests.json').read_text())['tests'],1)
                    else:
                        with self.assertRaises((ValueError,InterruptedError)): J.run(service,out)
                        self.assertFalse((out/'java-tests.json').exists())
                    cleanup.assert_called_once_with(out, cid='a'*64, creation_attempted=True)
                    self.assertTrue((out/'java-test-reports/TEST-synthetic.xml').is_file())
                    self.assertNotEqual((out/'java-test-exit.txt').read_text().strip(), '0' if status else '1')

class CollectionBoundary(unittest.TestCase):
    """Mocked Docker; all external contents are harmless synthetic sentinels."""
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='synthetic java boundary ')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root/'evidence'
        self.sentinel = self.root/'external'
        self.sentinel.write_bytes(b'HARMLESS EXTERNAL SENTINEL: MUST NOT BE COLLECTED')
        self.work = None
        self.produce = lambda: None
        self.exit = 0
        self.retired = False
        self.state = {'ExitCode':0, 'OOMKilled':False, 'Running':False, 'Error':''}
        self.good = '<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="synthetic" classname="Fixture"/></testsuite>'

    def docker(self, *args):
        if args[0] == 'create':
            mount = args[args.index('--mount')+1]
            self.work = Path(mount.split('src=')[1].split(',dst=')[0])
            self.addCleanup(J.shutil.rmtree, self.work, ignore_errors=True)
            Path(args[args.index('--cidfile')+1]).write_text('a'*64)
            return 'a'*64
        if '--format' in args:
            return json.dumps(self.state)
        return json.dumps([{'Image':'sha256:'+'b'*64}])

    def execute(self, *args, **kwargs):
        self.report = self.work/'service/target/surefire-reports'
        self.report.mkdir(parents=True)
        (self.report/'TEST-synthetic.xml').write_text(self.good)
        self.produce()
        if isinstance(self.exit, BaseException): raise self.exit
        return type('Result', (), {'returncode':self.exit})()

    def retire(self, *args, **kwargs):
        self.retired = True

    def run_mock(self):
        with patch.object(J, 'capacity'), patch.object(J, 'docker', side_effect=self.docker), \
             patch.object(J.subprocess, 'run', side_effect=self.execute), \
             patch.object(J, 'cleanup', side_effect=self.retire) as cleanup:
            try:
                J.run(ROOT/'templates/java-http/service', self.out)
            finally:
                self.cleanup_calls = cleanup.call_count

    def assert_no_external(self):
        for file in self.out.rglob('*'):
            if file.is_file():
                self.assertNotIn(self.sentinel.read_bytes(), file.read_bytes(), str(file))
        self.assertFalse((self.out/'java-tests.json').exists())

    def test_external_report_symlink_never_collected(self):
        self.produce = lambda: (self.report/'external.txt').symlink_to(self.sentinel)
        with self.assertRaises(Exception): self.run_mock()
        self.assert_no_external()
        self.assertTrue(self.retired)

    def test_timeout_and_exit_receipt_enospc_still_retire(self):
        self.exit = subprocess.TimeoutExpired('synthetic docker start', 900)
        original = Path.write_text
        def write(path, *args, **kwargs):
            if path.name == 'java-test-exit.txt': raise OSError(errno.ENOSPC, 'synthetic ENOSPC')
            return original(path, *args, **kwargs)
        with patch.object(Path, 'write_text', write):
            with self.assertRaises(subprocess.TimeoutExpired): self.run_mock()
        self.assertEqual(self.cleanup_calls, 1)
        self.assert_no_external()

    def test_symlinked_roots_intermediate_and_artifacts(self):
        for kind in ('report-root', 'intermediate', 'target', 'service', 'repository', 'jar', 'pom'):
            with self.subTest(kind=kind):
                self.out = self.root/kind
                def produce():
                    if kind == 'report-root':
                        J.shutil.rmtree(self.report); self.report.symlink_to(self.root, target_is_directory=True)
                    elif kind == 'intermediate':
                        (self.report/'nested').symlink_to(self.root, target_is_directory=True)
                    elif kind in ('target', 'service'):
                        folder = self.work/'service'
                        if kind == 'target': folder /= 'target'
                        J.shutil.rmtree(folder); folder.symlink_to(self.root, target_is_directory=True)
                    elif kind == 'repository':
                        (self.work/'repository').symlink_to(self.root, target_is_directory=True)
                    else:
                        (self.report.parent/('generated.'+kind)).symlink_to(self.sentinel)
                self.produce = produce
                with self.assertRaises((ValueError, OSError)): self.run_mock()
                self.assert_no_external()
                self.assertEqual(self.cleanup_calls, 1)

    def test_fifo_and_socket_reject_without_opening(self):
        import socket
        for kind in ('fifo', 'socket'):
            with self.subTest(kind=kind):
                self.out = self.root/kind
                sock = socket.socket(socket.AF_UNIX)
                def produce():
                    path = self.report/'nonregular'
                    if kind == 'fifo': os.mkfifo(path)
                    else: sock.bind(str(path))
                self.produce = produce
                try:
                    with self.assertRaisesRegex(ValueError, 'Unsafe'): self.run_mock()
                    self.assert_no_external()
                finally: sock.close()

    def test_link_swap_at_open_cannot_read_external_target(self):
        original = os.open
        def open_file(path, flags, *args, **kwargs):
            if path == 'TEST-synthetic.xml':
                file = self.report/path
                file.unlink(); file.symlink_to(self.sentinel)
            return original(path, flags, *args, **kwargs)
        with patch.object(J.os, 'open', open_file):
            with self.assertRaises(OSError): self.run_mock()
        self.assert_no_external()

    def test_retirement_before_collection_and_safe_original_bytes(self):
        original = J.collect
        def collect(*args):
            self.assertTrue(self.retired)
            return original(*args)
        with patch.object(J, 'collect', side_effect=collect): self.run_mock()
        report = self.out/'java-test-reports/TEST-synthetic.xml'
        self.assertEqual(report.read_text(), self.good)
        receipt = json.loads((self.out/'java-tests.json').read_text())
        self.assertEqual(receipt['reports']['TEST-synthetic.xml'], R.digest(report))
        self.assertFalse(self.work.exists())

    def test_cleanup_failure_preserves_work_and_skips_collection(self):
        def fail(*args, **kwargs): raise RuntimeError('synthetic retirement failure')
        self.retire = fail
        with patch.object(J, 'collect') as collect:
            with self.assertRaisesRegex(RuntimeError, 'retirement failure'): self.run_mock()
            collect.assert_not_called()
        self.assertTrue(self.work.is_dir())
        self.assertTrue((self.out/'java-test-work.json').is_file())
        self.assertEqual((self.out/'java-test-container.id').read_text(), 'a'*64)
        self.assertFalse((self.out/'java-tests.json').exists())
        self.assertFalse((self.out/'java-test-exit.txt').exists())

    def test_interruption_collection_enospc_keeps_primary(self):
        self.exit = InterruptedError('synthetic SIGINT')
        with patch.object(J, 'collect', side_effect=OSError(errno.ENOSPC, 'synthetic ENOSPC')):
            with self.assertRaisesRegex(InterruptedError, 'SIGINT') as caught: self.run_mock()
        self.assertIn('ENOSPC', str(caught.exception.__notes__))
        self.assertEqual(self.cleanup_calls, 1)
        self.assertTrue(self.work.is_dir())
        self.assert_no_external()

    def test_exit_and_manifest_write_failures(self):
        original = Path.write_text
        for name in ('java-test-container.json', 'java-test-exit.txt', 'java-build-artifacts.json', 'java-tests.json.partial'):
            with self.subTest(name=name):
                self.out = self.root/name
                def write(path, *args, **kwargs):
                    if path.name == name: raise OSError(errno.ENOSPC, 'synthetic write failure')
                    return original(path, *args, **kwargs)
                with patch.object(Path, 'write_text', write):
                    with self.assertRaisesRegex(OSError, 'write failure'): self.run_mock()
                self.assertEqual(self.cleanup_calls, 1)
                self.assert_no_external()

    def test_artifact_read_and_hash_failures(self):
        self.produce = lambda: (self.report.parent/'app.jar').write_bytes(b'synthetic jar')
        for operation in ('read', 'hash'):
            self.out = self.root/operation
            if operation == 'read':
                failure = patch.object(J.os, 'read', side_effect=OSError('synthetic read failure'))
            else:
                failure = patch.object(J.hashlib, 'sha256', side_effect=ValueError('synthetic hash failure'))
            with failure:
                with self.assertRaisesRegex((OSError, ValueError), 'failure'): self.run_mock()
            self.assertEqual(self.cleanup_calls, 1)
            self.assert_no_external()

    def test_collection_limits_and_normal_artifact(self):
        self.produce = lambda: (self.report.parent/'app.jar').write_bytes(b'synthetic jar')
        for bound in ('MAX_ENTRIES', 'MAX_DEPTH', 'MAX_FILE_BYTES', 'MAX_ARTIFACT_BYTES',
                      'MAX_REPORT_FILE_BYTES', 'MAX_REPORT_BYTES'):
            with self.subTest(bound=bound):
                self.out = self.root/bound
                with patch.object(J, bound, 0):
                    with self.assertRaisesRegex(ValueError, 'limit exceeded'): self.run_mock()
                self.assertEqual(self.cleanup_calls, 1)
                self.assert_no_external()
        self.out = self.root/'normal'
        self.run_mock()
        manifest = json.loads((self.out/'java-build-artifacts.json').read_text())
        self.assertEqual(manifest, [{'path':'service/target/app.jar',
                                   'sha256':J.hashlib.sha256(b'synthetic jar').hexdigest()}])

    def test_process_failure_with_valid_reports_remains_failure(self):
        self.exit = 7
        with self.assertRaisesRegex(ValueError, 'exit status 7'): self.run_mock()
        self.assertTrue((self.out/'java-test-reports/TEST-synthetic.xml').exists())
        self.assert_no_external()

    def test_oom_running_and_daemon_error_are_failures(self):
        for key, value in (('OOMKilled', True), ('Running', True), ('Error', 'synthetic daemon failure'), ('ExitCode', 137)):
            with self.subTest(key=key):
                self.out = self.root/key
                self.state = {'ExitCode':0, 'OOMKilled':False, 'Running':False, 'Error':''}
                self.state[key] = value
                with self.assertRaisesRegex(ValueError, 'process failed'): self.run_mock()
                self.assert_no_external()

    def test_runner_preserves_stale_report_times(self):
        self.produce = lambda: os.utime(self.report/'TEST-synthetic.xml', ns=(1, 1))
        with self.assertRaisesRegex(ValueError, 'Stale'): self.run_mock()
        self.assertEqual((self.out/'java-test-reports/TEST-synthetic.xml').stat().st_mtime_ns, 1)
        self.assert_no_external()

    def test_execution_and_cleanup_failures_both_recorded(self):
        self.exit = subprocess.TimeoutExpired('synthetic docker start', 900)
        def fail(*args, **kwargs): raise RuntimeError('synthetic retirement failure')
        self.retire = fail
        with self.assertRaises(subprocess.TimeoutExpired) as caught: self.run_mock()
        self.assertIn('retirement failure', str(caught.exception.__notes__))
        self.assertTrue(self.work.exists())
        self.assert_no_external()

def real_link_negative(output):
    """Real pinned-container fixture; deliberately creates a harmless dangling link.

    Runs sequentially after the normal real service test in CI. The sentinel is
    outside the producer mount; neither credentials nor the Docker socket enter.
    Capacity and ownership checks are the ordinary runner's, without overrides.
    """
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=False)
    with tempfile.TemporaryDirectory(prefix='gp-real-java-link-') as temporary:
        fixture = Path(temporary)
        sentinel = fixture/'harmless-external-sentinel'
        content = ('HARMLESS EXTERNAL SENTINEL '+os.urandom(32).hex()).encode()
        sentinel.write_bytes(content)
        service = fixture/'service'
        J.shutil.copytree(ROOT/'templates/java-http/service', service)
        (service/'src/test/java/trial/GeneratedLinkTest.java').write_text(
            'package trial;\nimport java.nio.file.*;\nimport org.junit.jupiter.api.Test;\n'
            'class GeneratedLinkTest { @Test void generatedLink() throws Exception {\n'
            'Files.createDirectories(Path.of("target/surefire-reports"));\n'
            'Files.createSymbolicLink(Path.of("target/surefire-reports/external.txt"), '
            'Path.of('+json.dumps(str(sentinel))+'));\n}}\n')
        attempt = output/'attempt'
        with (output/'runner.log').open('w') as log:
            process = subprocess.run([sys.executable, str(ROOT/'src/java-tests.py'),
                                      str(service), str(attempt)], stdout=log, stderr=subprocess.STDOUT)
        if process.returncode == 0 or (attempt/'java-tests.json').exists():
            raise AssertionError('Unsafe generated link was accepted')
        errors = json.loads((attempt/'java-test-errors.json').read_text())
        if len(errors) != 1 or errors[0]['stage'] != 'collection' or errors[0]['type'] != 'ValueError' or not errors[0]['message'].startswith('Unsafe Java generated entry'):
            raise AssertionError('Failure is not attributable to generated-link rejection: '+str(errors))
        if (attempt/'java-test-exit.txt').read_text().strip() != '0':
            raise AssertionError('Maven did not complete successfully before collection rejection')
        cid = (attempt/'java-test-container.id').read_text().strip()
        if J.docker('ps', '-aq', '--no-trunc', '--filter', 'id='+cid):
            raise AssertionError('Producer was not retired')
        hashes = {}
        for file in output.rglob('*'):
            if file.is_symlink(): raise AssertionError('Uploadable evidence contains a symlink')
            if file.is_file():
                data = file.read_bytes()
                if content in data: raise AssertionError('External sentinel contents retained')
                hashes[str(file.relative_to(output))] = hashlib.sha256(data).hexdigest()
        (output/'boundary-result.json').write_text(json.dumps({
            'boundary': 'real-java-container-generated-link', 'result': 'REJECTED',
            'container': cid, 'retired': True, 'externalBytesRetained': False,
            'runnerExit': process.returncode, 'files': hashes}, indent=2)+'\n')
        # The runner deliberately retains rejected work for diagnosis. This test
        # owns it, has verified producer absence and has retained original logs.
        recovery = json.loads((attempt/'java-test-work.json').read_text())
        work = Path(recovery['path'])
        info = work.lstat()
        if work.is_symlink() or (info.st_dev, info.st_ino) != (recovery['device'], recovery['inode']):
            raise AssertionError('Recovery work identity changed')
        J.shutil.rmtree(work)  # fd-safe shutil.rmtree does not follow fixture links.


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--real-link-negative':
        real_link_negative(sys.argv[2])
    else:
        unittest.main()
