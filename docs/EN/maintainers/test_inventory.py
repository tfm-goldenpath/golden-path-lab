"""Synthetic inventory defects, independent of repository prose or lab runtime."""
import copy
from pathlib import Path
import tempfile
import unittest

from check_inventory import DETAILS, validate


class InventoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'helper.py').write_text('# synthetic fixture\n')
        self.tracked = {'helper.py'}
        self.data = {
            'format': 'repository-ownership-inventory/v1',
            'profiles': {'helper': {**dict.fromkeys(DETAILS, 'Explicit synthetic boundary'), 'classification': 'developer'}},
            'entries': [{'path': 'helper.py', 'profile': 'helper', 'responsibility': 'Check a fixture',
                         'destination': 'src/helper.py', 'action': 'extract', 'reason': 'Test extraction contract',
                         'references': [], 'callers': [], 'tests': [], 'caller_notes': [], 'unknowns': []}],
        }

    def errors(self):
        return validate(self.data, self.tracked, self.root)

    def test_valid_future_destination_need_not_exist(self):
        self.assertEqual([], self.errors())

    def test_missing_tracked_entry(self):
        self.data['entries'] = []
        self.assertIn('Missing inventory entry: helper.py', self.errors())

    def test_duplicate_entry_even_with_conflicting_ownership(self):
        other = copy.deepcopy(self.data['entries'][0])
        other['classification'] = 'laboratory'
        self.data['entries'].append(other)
        self.assertIn('Duplicate path: helper.py', self.errors())

    def test_untracked_or_stale_path(self):
        self.tracked = set()
        self.assertIn('Untracked/stale path: helper.py', self.errors())

    def test_missing_current_file(self):
        (self.root / 'helper.py').unlink()
        self.assertIn('Missing/nonregular current file: helper.py', self.errors())

    def test_unsafe_paths(self):
        for bad in ('../outside', '/absolute', './helper.py', 'dir\\file', ''):
            with self.subTest(path=bad):
                self.data['entries'][0]['destination'] = bad
                self.assertIn('Unsafe proposed destination: helper.py', self.errors())

    def test_invalid_classification_and_action(self):
        self.data['entries'][0].update(classification='unowned', action='delete-now')
        self.assertIn('Invalid classification: helper.py', self.errors())
        self.assertIn('Invalid action: helper.py', self.errors())

    def test_unknown_profile(self):
        self.data['entries'][0]['profile'] = 'missing'
        self.assertIn('Unknown profile: helper.py', self.errors())

    def test_missing_details_and_stale_caller(self):
        self.data['entries'][0].update(inputs='', callers=['unknown.sh'])
        self.assertIn('Empty inputs: helper.py', self.errors())
        self.assertTrue(any('Invalid callers reference' in e for e in self.errors()))

    def test_symlink_is_not_regular_inventory_source(self):
        (self.root / 'helper.py').unlink()
        (self.root / 'helper.py').symlink_to('outside.py')
        self.assertIn('Missing/nonregular current file: helper.py', self.errors())


if __name__ == '__main__':
    unittest.main()
