"""Synthetic unit fixtures; these tests do not establish laboratory execution."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/defense-demo'))
import core


class SafetyTests(unittest.TestCase):
    def test_names(self):
        for name in ('../escape', '', 'a/b', '-bad', 'A', 'x' * 65):
            with self.assertRaises(ValueError): core.valid_name(name)
        self.assertEqual(core.valid_name('rehearsal-01'), 'rehearsal-01')

    def test_catalogue_has_exact_twenty_and_allowed_adapters(self):
        value = core.catalogue()
        self.assertEqual({c['id'] for c in value['scenarios']},
                         {f'F{i:02}' for i in range(1, 15)} | {f'L{i:02}' for i in range(1, 7)})
        self.assertEqual(core.LIVE['defense'], ['f11-early', 'f13', 'authorize', 'accept', 'f11-admission'])
        self.assertEqual(core.LIVE['defense-short'], core.LIVE['defense'][:-1])

    def test_paths_and_integrity(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'x.log').write_text('synthetic observation')
            record = core.file_record(root, root / 'x.log', 'test', 'synthetic')
            self.assertEqual(core.read_artifact(root, record), b'synthetic observation')
            for path in ('../x.log', '/etc/passwd'):
                with self.assertRaises(ValueError): core.read_artifact(root, {**record, 'path': path})
            (root / 'link.log').symlink_to(root / 'x.log')
            with self.assertRaises(ValueError): core.file_record(root, root / 'link.log', 'test', 'synthetic')
            (root / 'x.log').write_text('changed')
            with self.assertRaises(ValueError): core.read_artifact(root, record)

    def test_secret_sanitization_has_different_identity(self):
        value = 'Authorization: Bearer secret-value\n-----BEGIN PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----'
        safe = core.sanitize(value)
        self.assertNotIn('secret-value', safe)
        self.assertNotIn('\nprivate\n', safe)

    def test_lock_exclusion(self):
        with tempfile.TemporaryDirectory() as temp:
            lock = Path(temp) / 'lock'
            with core.locked(lock):
                with self.assertRaises(RuntimeError):
                    with core.locked(lock): pass

    def test_no_pass_from_text(self):
        self.assertEqual(core.outcome(1, False, 'deny'), ('ERROR', 'indeterminate', 'unconfirmed'))
        self.assertEqual(core.outcome(0, True, 'allow'), ('ABORTED', 'indeterminate', 'unconfirmed'))
        self.assertEqual(core.outcome(0, False, 'deny'), ('COMPLETED', 'deny', 'confirmed'))


if __name__ == '__main__': unittest.main()
