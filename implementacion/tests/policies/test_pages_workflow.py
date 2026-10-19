"""Real Conftest evaluation of the Pages workflow and synthetic unsafe mutations."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('workflow_evaluation', ROOT/'scripts/workflow-evaluation.py')
E = importlib.util.module_from_spec(spec); spec.loader.exec_module(E)


class PagesWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Same pinned parser as the production workflow checker.
        cls.text = (ROOT.parent/'.github/workflows/demo-pages.yml').read_text()
        import yaml
        cls.workflow = yaml.safe_load(cls.text)
        cls.workflow['on'] = cls.workflow.pop(True, cls.workflow.get('on'))

    def evaluate(self, value):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'workflow.json'; path.write_text(json.dumps(value))
            return E.evaluate(path, ROOT/'policies/conftest/workflow.rego')

    def test_real_pages_workflow(self):
        result = self.evaluate(self.workflow)
        self.assertEqual(result['classification'], 'ACCEPT', result)

    def test_manual_main_guard_and_permissions_cannot_be_bypassed(self):
        mutations = [
            lambda w: w.update(on={'pull_request':None}),
            lambda w: w.update(on={'pull_request_target':None}),
            lambda w: w.update(permissions={'pages':'write'}),
            lambda w: w['jobs']['deploy'].update(permissions='write-all'),
            lambda w: w['jobs']['deploy']['permissions'].update(contents='write'),
            lambda w: w['jobs']['validate']['permissions'].update(pages='write'),
            lambda w: w['jobs']['deploy'].update({'if':"github.ref == 'refs/heads/other'"}),
            lambda w: w['jobs']['validate'].pop('if'),
            lambda w: w['jobs']['deploy'].pop('needs'),
            lambda w: w['jobs']['deploy']['steps'].append({'run':'echo unsafe'}),
            lambda w: w['jobs']['deploy']['steps'][1].update(uses='actions/deploy-pages@v4'),
            lambda w: w['jobs']['deploy']['steps'][0]['with'].update(enablement=True),
            lambda w: w['jobs']['deploy'].update(env={'NODE_OPTIONS':'--require untrusted.js'}),
            lambda w: w['jobs']['deploy'].update(container='attacker/image'),
            lambda w: w.update(env={'NODE_OPTIONS':'--require untrusted.js'}),
        ]
        for index, mutate in enumerate(mutations):
            value = copy.deepcopy(self.workflow); mutate(value)
            with self.subTest(index=index):
                self.assertEqual(self.evaluate(value)['classification'], 'DENY')

if __name__ == '__main__': unittest.main()
