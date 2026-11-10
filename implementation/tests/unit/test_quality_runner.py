"""Synthetic fault injection at collection/retirement boundaries; no delivery claims."""
import importlib.util
import json
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


if __name__ == '__main__':
    unittest.main()
