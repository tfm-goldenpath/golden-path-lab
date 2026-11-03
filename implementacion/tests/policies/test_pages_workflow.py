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
        cls.path = ROOT.parent / '.github/workflows/demo-pages.yml'
        parsed = subprocess.run(
            ['conftest', 'parse', '--parser', 'yaml', str(cls.path)],
            capture_output=True, text=True, check=True, timeout=30,
        )
        cls.workflow = json.loads(parsed.stdout)
        # Conftest exposes YAML 1.1's unquoted `on` as the JSON key `true`.
        cls.workflow['on'] = cls.workflow.pop('true', cls.workflow.get('on'))

    def evaluate(self, value):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'workflow.json'; path.write_text(json.dumps(value))
            return E.evaluate(path, ROOT/'policies/conftest/workflow.rego')

    def test_real_pages_workflow(self):
        result = E.evaluate(self.path, ROOT/'policies/conftest/workflow.rego')
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
            lambda w: w['jobs']['deploy']['steps'][1].update(uses='actions/deploy-pages@v5'),
            lambda w: w['jobs']['deploy']['steps'][0].update(uses='actions/configure-pages@v6'),
            lambda w: w['jobs']['deploy']['steps'][0].update(uses='actions/configure-pages@' + '0'*40),
            lambda w: w['jobs']['deploy']['steps'][1].update(uses='actions/deploy-pages@' + '0'*40),
            lambda w: w['jobs']['deploy']['steps'][0].update(env={'NODE_OPTIONS':'--require untrusted.js'}),
            lambda w: w['jobs']['deploy']['steps'].append({'uses':'actions/checkout@' + '0'*40}),
            lambda w: w['jobs']['deploy'].update(needs='unreviewed'),
            lambda w: w['jobs']['deploy'].update({'if':'always()'}),
            lambda w: w['jobs']['deploy']['steps'][0]['with'].update(enablement=True),
            lambda w: w['jobs']['deploy'].update(env={'NODE_OPTIONS':'--require untrusted.js'}),
            lambda w: w['jobs']['deploy'].update(container='attacker/image'),
            lambda w: w['jobs']['deploy'].update({'runs-on':'self-hosted'}),
            lambda w: w.update(env={'NODE_OPTIONS':'--require untrusted.js'}),
        ]
        for index, mutate in enumerate(mutations):
            value = copy.deepcopy(self.workflow); mutate(value)
            with self.subTest(index=index):
                self.assertEqual(self.evaluate(value)['classification'], 'DENY')

class WorkflowPackagingTests(unittest.TestCase):
    def test_cache_is_explicitly_disabled_and_node_remains_pinned(self):
        for name in ('ci', 'golden-path', 'paired-rg'):
            path = ROOT.parent / f'.github/workflows/{name}.yml'
            workflow = json.loads(subprocess.check_output(
                ['conftest', 'parse', '--parser', 'yaml', str(path)], text=True))
            setups = [s for j in workflow['jobs'].values() for s in j.get('steps', [])
                      if s.get('uses', '').startswith('actions/setup-node@')]
            self.assertTrue(setups)
            for step in setups:
                with self.subTest(workflow=name):
                    self.assertIs(step['with'].get('package-manager-cache'), False)
                    self.assertNotIn('cache', step['with'])
                    self.assertEqual(step['with']['node-version'], '${{ steps.versions.outputs.node }}')

    def test_pages_hidden_files_are_explicitly_excluded(self):
        path = ROOT.parent / '.github/workflows/demo-pages.yml'
        workflow = json.loads(subprocess.check_output(
            ['conftest', 'parse', '--parser', 'yaml', str(path)], text=True))
        uploads = [s for s in workflow['jobs']['validate']['steps']
                   if s.get('uses', '').startswith('actions/upload-pages-artifact@')]
        self.assertEqual(len(uploads), 1)
        self.assertIs(uploads[0]['with'].get('include-hidden-files'), False)


if __name__ == '__main__': unittest.main()
