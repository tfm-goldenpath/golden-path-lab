"""Synthetic fault injection at collection/retirement boundaries; no delivery claims."""
import importlib.util
import json
import os
import hashlib
import errno
import sys
from types import SimpleNamespace
from contextlib import contextmanager
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('quality_runner', ROOT/'src/quality-runner.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class RetirementTests(unittest.TestCase):
    def request(self, directory):
        work, output = Path(directory)/'work', Path(directory)/'output'
        work.mkdir()
        output.mkdir()
        return {'work': str(work), 'output': str(output), 'argv': ['/missing/runner'],
                'env': {}, 'inputs': [], 'limits': {'timeoutSeconds': 1, 'maxOutputBytes': 4096}}

    def test_primary_execution_error_survives_cleanup_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            request = self.request(directory)
            with patch.object(runner.shutil, 'rmtree', side_effect=OSError('synthetic cleanup error')):
                result = runner.run(request)
            self.assertIn('/missing/runner', result['errors'][0])
            self.assertIn('synthetic cleanup error', result['errors'][-1])
            self.assertFalse(result['cleaned'])
            self.assertTrue(result['retired'])

    def test_output_root_link_is_rejected_before_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            request = self.request(directory)
            outside = Path(directory)/'outside'
            outside.mkdir()
            Path(request['output']).rmdir()
            Path(request['output']).symlink_to(outside, target_is_directory=True)
            with patch.object(runner.subprocess, 'Popen') as execute:
                result = runner.run(request)
            execute.assert_not_called()
            self.assertTrue(result['errors'])
            self.assertEqual(list(outside.iterdir()), [])

    def test_existing_report_link_cannot_overwrite_its_target(self):
        with tempfile.TemporaryDirectory() as directory:
            request = self.request(directory)
            request['argv'] = ['/usr/bin/true']
            sentinel = Path(directory)/'sentinel'
            sentinel.write_text('unchanged')
            (Path(request['output'])/'coverage.ndjson').symlink_to(sentinel)
            result = runner.run(request)
            self.assertTrue(result['errors'])
            self.assertTrue(result['retired'])
            self.assertEqual(sentinel.read_text(), 'unchanged')

    def test_failed_retirement_prevents_collection_and_cleanup(self):
        with tempfile.TemporaryDirectory() as directory:
            request = self.request(directory)
            with patch.object(runner, 'retire', side_effect=ValueError('synthetic retirement error')), patch.object(runner, 'inspect_tree') as collect:
                result = runner.run(request)
            collect.assert_not_called()
            self.assertFalse(result['retired'])
            self.assertFalse(result['cleaned'])
            self.assertTrue(Path(request['work']).exists())
            self.assertIn('/missing/runner', result['errors'][0])


class MonitorRaces(unittest.TestCase):
    """Deterministic filesystem races; hooks exist only in these tests."""
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='quality monitor ')
        self.addCleanup(self.temp.cleanup)
        self.work = Path(self.temp.name)/'work'
        self.output = Path(self.temp.name)/'output'
        self.work.mkdir(); self.output.mkdir()
        self.identity = self.work.lstat()

    def test_child_directory_removed_after_enumeration(self):
        child = self.work/'temporary'; child.mkdir()
        original = os.scandir
        class Entry:
            def __init__(self, entry): self.entry = entry
            def __getattr__(self, name): return getattr(self.entry, name)
            def stat(self, **kwargs):
                info = self.entry.stat(**kwargs)
                child.rmdir()  # Parent enumerated/stat'ed it; child not yet visited.
                return info
        @contextmanager
        def scan(directory):
            with original(directory) as entries:
                yield iter([Entry(entry) for entry in entries])
        with patch.object(runner.os, 'scandir', scan):
            runner.monitor(self.work, self.output, 4096, self.identity)
        self.assertFalse(child.exists())

    def test_file_removed_between_enumeration_and_stat(self):
        child = self.work/'temporary'; child.write_text('temporary bytes')
        original = os.scandir
        @contextmanager
        def scan(directory):
            with original(directory) as entries:
                snapshot = list(entries)
                child.unlink()  # DirEntry.stat has not been called or cached.
                yield iter(snapshot)
        with patch.object(runner.os, 'scandir', scan):
            runner.monitor(self.work, self.output, 4096, self.identity)
        self.assertFalse(child.exists())


    def test_missing_replaced_or_linked_root_is_error(self):
        self.work.rename(self.work.with_name('original'))
        with self.assertRaises(FileNotFoundError):
            runner.monitor(self.work, self.output, 4096, self.identity)
        self.work.mkdir()
        with self.assertRaisesRegex(ValueError, 'Work directory identity'):
            runner.monitor(self.work, self.output, 4096, self.identity)
        self.work.rmdir(); self.work.symlink_to(self.work.with_name('original'))
        with self.assertRaises(OSError):
            runner.monitor(self.work, self.output, 4096, self.identity)

    def test_root_deleted_or_replaced_during_enumeration_is_error(self):
        original = os.scandir
        for operation in ('delete', 'replace'):
            with self.subTest(operation=operation):
                if not self.work.exists(): self.work.mkdir()
                self.identity = self.work.lstat()
                @contextmanager
                def scan(fd):
                    with original(fd) as entries:
                        snapshot = list(entries)
                        self.work.rename(self.work.with_name('old-'+operation))
                        if operation == 'replace': self.work.mkdir()
                        yield iter(snapshot)
                with patch.object(runner.os, 'scandir', scan):
                    with self.assertRaises((FileNotFoundError, ValueError)):
                        runner.monitor(self.work, self.output, 4096, self.identity)

    def test_permission_and_storage_errors_are_not_hidden(self):
        child = self.work/'temporary'; child.mkdir()
        original = os.scandir
        class Entry:
            def __init__(self, entry): self.entry = entry
            def __getattr__(self, name): return getattr(self.entry, name)
            def stat(self, **kwargs): raise PermissionError('synthetic stat denied')
        @contextmanager
        def scan(fd):
            with original(fd) as entries: yield iter([Entry(e) for e in entries])
        with patch.object(runner.os, 'scandir', scan):
            with self.assertRaisesRegex(PermissionError, 'stat denied'):
                runner.monitor(self.work, self.output, 4096, self.identity)
        for fault in (PermissionError('synthetic denied'), OSError(errno.EIO, 'synthetic IO error')):
            with patch.object(runner.os, 'scandir', side_effect=fault):
                with self.assertRaises(type(fault)):
                    runner.monitor(self.work, self.output, 4096, self.identity)
        with patch.object(runner.shutil, 'disk_usage', side_effect=OSError(errno.ENOSPC, 'synthetic storage error')):
            with self.assertRaisesRegex(OSError, 'storage error'):
                runner.monitor(self.work, self.output, 4096, self.identity)

    def test_child_replaced_by_link_before_open_is_never_followed(self):
        child = self.work/'temporary'; child.mkdir()
        outside = self.work.with_name('outside'); outside.mkdir()
        (outside/'sentinel').write_text('harmless external bytes')
        original = os.scandir
        visited = []
        class Entry:
            def __init__(self, entry): self.entry = entry
            def __getattr__(self, name): return getattr(self.entry, name)
            def stat(self, **kwargs):
                info = self.entry.stat(**kwargs)
                child.rmdir(); child.symlink_to(outside)
                return info
        @contextmanager
        def scan(fd):
            visited.append(os.fstat(fd).st_ino)
            with original(fd) as entries: yield iter([Entry(e) for e in entries])
        with patch.object(runner.os, 'scandir', scan):
            with self.assertRaises(OSError):
                runner.monitor(self.work, self.output, 4096, self.identity)
        self.assertEqual(visited, [self.identity.st_ino])
        self.assertEqual((outside/'sentinel').read_text(), 'harmless external bytes')

    def test_child_identity_substitution_is_error(self):
        child = self.work/'temporary'; child.mkdir()
        original = os.open
        def opened(name, flags, **kwargs):
            if name == 'temporary':
                child.rename(self.work/'previous'); child.mkdir()
            return original(name, flags, **kwargs)
        with patch.object(runner.os, 'open', opened):
            with self.assertRaisesRegex(ValueError, 'Generated directory identity'):
                runner.monitor(self.work, self.output, 4096, self.identity)

    def test_open_child_removed_before_scandir_is_transient(self):
        child = self.work/'temporary'; child.mkdir()
        inode = child.stat().st_ino
        original = os.scandir
        def scan(fd):
            if os.fstat(fd).st_ino == inode:
                child.rmdir()
                raise FileNotFoundError('synthetic deleted open child')
            return original(fd)
        with patch.object(runner.os, 'scandir', scan):
            runner.monitor(self.work, self.output, 4096, self.identity)

    def test_size_count_depth_and_storage_reserve_remain_enforced(self):
        (self.work/'large').write_bytes(b'12345')
        with self.assertRaisesRegex(ValueError, 'aggregate size'):
            runner.monitor(self.work, self.output, 4, self.identity)
        (self.work/'large').unlink()
        for i in range(2001): (self.work/str(i)).touch()
        with self.assertRaisesRegex(ValueError, 'entry count'):
            runner.monitor(self.work, self.output, 4096, self.identity)
        for file in self.work.iterdir(): file.unlink()
        leaf = self.work
        for i in range(33):
            leaf /= str(i); leaf.mkdir()
        with self.assertRaisesRegex(ValueError, 'depth limit'):
            runner.monitor(self.work, self.output, 4096, self.identity)
        runner.shutil.rmtree(self.work/'0')
        with patch.object(runner.shutil, 'disk_usage', return_value=SimpleNamespace(free=3*1024**3-1)):
            with self.assertRaisesRegex(ValueError, 'storage reserve'):
                runner.monitor(self.work, self.output, 4096, self.identity)
        with patch.object(runner.shutil, 'disk_usage', return_value=SimpleNamespace(free=3*1024**3)):
            runner.monitor(self.work, self.output, 4096, self.identity)

    def test_final_collection_still_rejects_disappearance(self):
        child = self.work/'temporary'; child.write_text('bytes')
        original = os.listdir
        def listed(fd):
            names = original(fd)
            child.unlink()
            return names
        with patch.object(runner.os, 'listdir', listed):
            with self.assertRaises(FileNotFoundError): runner.inspect_tree(self.work, 4096)


class FinalInputTests(unittest.TestCase):
    request = RetirementTests.request
    def test_missing_or_modified_committed_input_is_error(self):
        for statement in ("Path('input.js').unlink()", "Path('input.js').write_text('modified')"):
            with self.subTest(statement=statement), tempfile.TemporaryDirectory() as directory:
                request = self.request(directory)
                source = Path(request['work'])/'input.js'; source.write_bytes(b'committed bytes')
                request['inputs'] = [{'path':'input.js', 'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                                      'mode':oct(source.stat().st_mode & 0o777)[2:]}]
                request['argv'] = [sys.executable, '-c', 'from pathlib import Path; '+statement]
                result = runner.run(request)
                self.assertEqual(result['exitCode'], 0)
                self.assertTrue(result['retired']); self.assertTrue(result['cleaned'])
                self.assertFalse(result['collected'])
                self.assertIn('Collection: Execution input changed: input.js', result['errors'])

    def test_collection_failure_does_not_skip_cleanup(self):
        with tempfile.TemporaryDirectory() as directory:
            request = self.request(directory); request['argv'] = ['/usr/bin/true']
            with patch.object(runner, 'inspect_tree', side_effect=OSError(errno.ENOSPC, 'synthetic collection failure')):
                result = runner.run(request)
            self.assertEqual(result['exitCode'], 0)
            self.assertTrue(result['retired']); self.assertTrue(result['cleaned'])
            self.assertFalse(result['collected'])
            self.assertIn('collection failure', result['errors'][0])


if __name__ == '__main__':
    unittest.main()
