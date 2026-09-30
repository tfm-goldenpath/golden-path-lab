"""Execute rendered results field conditions with Kyverno's engine.

An adapter places predicate fields in a synthetic resource and inverts Equals
into deny/NotEquals. This tests expressions and expected values; bundle retrieval,
cryptography and verifyImages diagnostic formatting need live admission.
"""
import copy
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from test_render import RenderTests, renderer


class ResultsConditions(unittest.TestCase):
    def test_rendered_conditions(self):
        kyverno = shutil.which('kyverno')
        self.assertIsNotNone(kyverno, 'Pinned Kyverno CLI required')
        for mode in ('local', 'github'):
            config = RenderTests().config(mode)
            conditions = renderer.render(config)['items'][-1]['spec']['rules'][0]['verifyImages'][0]['attestations'][0]['conditions'][0]['all']
            policy_condition = next(c for c in conditions if 'policyVersion' in c['key'])
            self.assertEqual(policy_condition['message'], 'RESULTS_POLICY_VERSION')
            self.assertEqual(policy_condition['value'], 'golden-path-v1')
            policy = {'apiVersion': 'kyverno.io/v1', 'kind': 'ClusterPolicy', 'metadata': {'name': 'results-condition-probe'},
                      'spec': {'background': False, 'rules': [{'name': 'results-fields', 'match': {'any': [{'resources': {'kinds': ['ResultsFixture']}}]},
                              'validate': {'message': 'results field requirements', 'deny': {'conditions': {'any': [
                                  {**c, 'key': c['key'].replace('{{ ', '{{ request.object.spec.predicate.'), 'operator': 'NotEquals'} for c in conditions
                              ]}}}}]}}
            original = {'policyVersion': 'golden-path-v1', 'source': {'repository': config['repository'], 'commit': config['commit']},
                        'result': 'PASS', 'checks': {c: 'PASS' for c in renderer.CHECKS}}
            for fault in ('valid', 'P0', 'missing-policy', 'source', 'revision', 'unsuccessful', 'missing-check', 'failed-check'):
                with self.subTest(mode=mode, fault=fault), tempfile.TemporaryDirectory(prefix='results-conditions-') as tmp:
                    value = copy.deepcopy(original)
                    if fault == 'P0': value['policyVersion'] = 'laboratory-results-p0-fixture'
                    if fault == 'missing-policy': del value['policyVersion']
                    if fault == 'source': value['source']['repository'] = 'https://example.invalid/other'
                    if fault == 'revision': value['source']['commit'] = 'f' * 40
                    if fault == 'unsuccessful': value['result'] = 'FAIL'
                    if fault == 'missing-check': del value['checks']['sbom']
                    if fault == 'failed-check': value['checks']['signature'] = 'FAIL'
                    resource = {'apiVersion': 'lab.invalid/v1', 'kind': 'ResultsFixture', 'metadata': {'name': 'synthetic'}, 'spec': {'predicate': value}}
                    directory = Path(tmp)
                    (directory / 'policy.yaml').write_text(json.dumps(policy))
                    (directory / 'resource.yaml').write_text(json.dumps(resource))
                    result = subprocess.run([kyverno, 'apply', str(directory / 'policy.yaml'), '--resource', str(directory / 'resource.yaml')], capture_output=True, text=True, timeout=30)
                    output = result.stdout + result.stderr
                    self.assertEqual(result.returncode, 0 if fault == 'valid' else 1, output)
                    self.assertIn('pass: 1, fail: 0, warn: 0, error: 0' if fault == 'valid' else 'pass: 0, fail: 1, warn: 0, error: 0', output)
