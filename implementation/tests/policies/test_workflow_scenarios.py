"""Real Conftest scenarios and explicitly synthetic classifier responses."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]

def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value

E = module('workflow_evaluation', ROOT / 'scripts/workflow-evaluation.py')
S = module('workflow_scenarios', ROOT / 'tests/scenarios/workflows.py')

class WorkflowTests(unittest.TestCase):
    def test_real_family(self):
        with tempfile.TemporaryDirectory() as directory:
            result = S.run(Path(directory) / 'trial')
            self.assertEqual(result['status'], 'PASS', result)
            self.assertEqual([v['classification'] for v in result['cases']], ['ACCEPT', 'DENY', 'DENY'])

    def test_synthetic_classifier(self):
        def report(messages):
            return json.dumps([{'filename': 'input.yaml', 'namespace': 'workflow', 'successes': 8,
                                'failures': [{'msg': m} for m in messages]}])
        for messages, code, expected in [([], 0, 'ACCEPT'), (['ACTION_SHA: x'], 1, 'DENY'),
                                         ([], 1, 'COMMAND_FAILURE'), (['x'], 0, 'INVALID_OUTPUT')]:
            self.assertEqual(E.classify(code, report(messages), '', 'input.yaml')['classification'], expected)
        for bad in ['not json', '{}', '[]', '[{}]',
                    report(['x', 'x']), report([]).replace('workflow', 'other'),
                    report([]).replace('8', 'true'), report([]).replace('input.yaml', 'other.yaml')]:
            self.assertEqual(E.classify(0, bad, '', 'input.yaml')['classification'], 'INVALID_OUTPUT')
        self.assertEqual(E.classify(2, '', 'process failure', 'input.yaml')['classification'], 'COMMAND_FAILURE')
        self.assertEqual(E.classify(1, '', 'Error: parse configurations: broken', 'input.yaml')['classification'], 'MALFORMED_INPUT')
        self.assertEqual(E.classify(1, '', 'rego_parse_error: bad policy', 'input.yaml')['classification'], 'POLICY_ERROR')

    def test_real_variants_and_errors(self):
        original = S.original_text()
        variants = S.variants(original)
        inputs = [
            (original, 'ACCEPT', []),
            (variants['F01'], 'DENY', [S.F01]),
            (variants['F01'].replace('on:', '"on":', 1), 'DENY', [S.F01]),
            (original.replace('on:\n  workflow_dispatch:', 'on: pull_request_target'), 'DENY', [S.F01]),
            (original.replace('on:\n  workflow_dispatch:', 'on: [pull_request_target]'), 'DENY', [S.F01]),
            (original + '\n"on": pull_request_target\n', 'DENY', [S.F01]),
            (variants['F02'], 'DENY', [S.F02]),
            (variants['F01'].replace(S.SHA, 'v7.0.1'), 'DENY', sorted([S.F01, S.F02])),
            (original.replace('actions/checkout@' + S.SHA, './local'), 'ACCEPT', []),
            (original.replace(S.SHA, S.SHA[:12]), 'DENY', None),
            ('on: [broken', 'MALFORMED_INPUT', []),
        ]
        with tempfile.TemporaryDirectory() as directory:
            for index, (content, classification, messages) in enumerate(inputs):
                path = Path(directory) / f'input-{index}.yaml'
                path.write_text(content)
                value = E.evaluate(path, S.POLICY)
                self.assertEqual(value['classification'], classification, value)
                if messages is not None:
                    self.assertEqual(value['diagnostics'], messages)
            policy = Path(directory) / 'broken.rego'
            policy.write_text('package workflow\nthis is invalid')
            path.write_text(original)
            self.assertEqual(E.evaluate(path, policy)['classification'], 'POLICY_ERROR')

    def test_exact_oracle(self):
        self.assertTrue(S.matches({'classification': 'DENY', 'diagnostics': [S.F01]}, [S.F01]))
        self.assertFalse(S.matches({'classification': 'DENY', 'diagnostics': [S.F01, S.F02]}, [S.F01]))
        self.assertFalse(S.matches({'classification': 'ACCEPT', 'diagnostics': []}, [S.F01]))

    def test_reference_scope_real(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'input.yaml'
            for reference, accepted in [('owner/repo/.github/workflows/build.yml@' + S.SHA, True),
                                        ('owner/repo/.github/workflows/build.yml@main', False),
                                        ('./.github/workflows/local.yml', True),
                                        ('docker://alpine:3', False),
                                        ('actions/checkout@' + S.SHA.upper(), False)]:
                path.write_text(json.dumps({'on': 'workflow_dispatch', 'permissions': {},
                                            'jobs': {'delivery': {'uses': reference}}}))
                self.assertEqual(E.evaluate(path, S.POLICY)['classification'], 'ACCEPT' if accepted else 'DENY')

    def test_synthetic_process_errors(self):
        with patch.object(E.subprocess, 'run', side_effect=subprocess.TimeoutExpired(['conftest'], 1, b'partial', b'diagnostic')):
            result = E.evaluate('/tmp/input.yaml', S.POLICY)
            self.assertEqual(result['classification'], 'TIMEOUT')
            self.assertEqual(result['stdout'], 'partial')
        with patch.object(E.subprocess, 'run', side_effect=PermissionError('denied')):
            self.assertEqual(E.evaluate('/tmp/input.yaml', S.POLICY)['classification'], 'COMMAND_FAILURE')
        with patch.object(E, 'command', return_value={'stdout': 'Conftest: 0.1.0', 'stderr': '', 'exitStatus': 0, 'processError': None}):
            self.assertEqual(E.prerequisite()['error'], 'VERSION_MISMATCH')

    def test_synthetic_scenario_failures_are_retained(self):
        for classification, messages, expected in [('ACCEPT', [], 'UNEXPECTED_ACCEPTANCE'),
                                                    ('DENY', [S.F01, S.F02], 'UNEXPECTED_DENIAL'),
                                                    ('TIMEOUT', [], 'TIMEOUT')]:
            responses = [{'classification': 'ACCEPT', 'diagnostics': [], 'stdout': '', 'stderr': ''},
                         {'classification': classification, 'diagnostics': messages, 'stdout': '', 'stderr': ''}]
            with tempfile.TemporaryDirectory() as directory, patch.object(S.E, 'evaluate', side_effect=responses):
                output = Path(directory) / 'trial'
                result = S.run(output)
                self.assertEqual(result['status'], 'FAIL')
                self.assertEqual(result['error'], expected)
                self.assertTrue((output / 'hashes.json').is_file())

    def test_inert_path_and_no_overwrite(self):
        with self.assertRaises(ValueError):
            S.run(ROOT.parent / '.github/workflows')
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(FileExistsError):
                S.run(directory)

    def test_make_wrong_tool_version_propagates(self):
        # Synthetic executable response; this does not claim Conftest behavior.
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            for name, executable in [('git', '/usr/bin/git'), ('python3', sys.executable)]:
                os.symlink(executable, directory / name)
            tool = directory / 'conftest'
            tool.write_text('#!/bin/sh\nprintf "Conftest: 0.0.0\\n"\n')
            tool.chmod(0o755)
            output = directory / 'trial'
            result = subprocess.run(['/usr/bin/make', '-C', str(ROOT), 'test-workflows',
                                     'WORKFLOW_EVIDENCE=' + str(output)],
                                    env={**os.environ, 'PATH': str(directory)}, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(json.loads((output / 'result.json').read_text())['error'], 'VERSION_MISMATCH')

    def test_cli_missing_tool_propagates(self):
        with tempfile.TemporaryDirectory() as directory:
            os.symlink('/usr/bin/git', Path(directory) / 'git')
            result = subprocess.run(['/usr/bin/python3', str(ROOT / 'tests/scenarios/workflows.py'),
                                     '--output', str(Path(directory) / 'trial')],
                                    env={**os.environ, 'PATH': directory}, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            saved = json.loads((Path(directory) / 'trial/result.json').read_text())
            self.assertEqual(saved['status'], 'FAIL')
            self.assertEqual(saved['error'], 'MISSING_TOOL')

if __name__ == '__main__':
    unittest.main()
