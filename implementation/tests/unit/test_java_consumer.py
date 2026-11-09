"""Synthetic reports/SQLite/containers; no genuine scanner or integration claim."""
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
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
        self.file.unlink(); self.file.symlink_to('/etc/passwd')
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
            with patch.object(J, 'docker', side_effect=[cid,json.dumps([correct]),cid]) as docker:
                J.cleanup(root); self.assertEqual(docker.call_args.args,('rm','-f',cid))
            with patch.object(J, 'docker', return_value='') as docker: J.cleanup(root)
            with patch.object(J, 'docker', side_effect=RuntimeError('transport')):
                with self.assertRaises(RuntimeError): J.cleanup(root)

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
                    cleanup.assert_called_once_with(out)
                    self.assertTrue((out/'java-test-reports/TEST-synthetic.xml').is_file())
                    self.assertNotEqual((out/'java-test-exit.txt').read_text().strip(), '0' if status else '1')

if __name__ == '__main__': unittest.main()
