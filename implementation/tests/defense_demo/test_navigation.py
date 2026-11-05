"""Bounded, read-only navigation metadata; synthetic fixtures, no delivery."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[2]/'scripts/defense-demo'))
import core
import server

class NavigationTests(unittest.TestCase):
    def test_inventory_bounds_and_allowlisted_fields(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(core, 'SESSIONS', Path(temp)):
            for name in ('bound','other'):
                core.atomic(Path(temp)/name/'session.json', {'session':name,'profile':'defense','operational':'PREPARED','source':{'commit':'a'*40,'secret':'no'},'privateKey':'never','sourceFiles':['never']})
            entries=core.local_session_inventory('bound')['entries']
            self.assertEqual(len(entries),2)
            self.assertTrue(next(e for e in entries if e['session']=='bound')['bound'])
            self.assertNotIn('never',json.dumps(entries));self.assertNotIn('secret',json.dumps(entries))
            limited=core.local_session_inventory('bound',limit=1)
            self.assertEqual(len(limited['entries']),1);self.assertTrue(limited['truncated'])

    def test_inventory_rejects_symlinks_large_corrupt_identity_and_fifo(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(core,'SESSIONS',Path(temp)):
            root=Path(temp)
            core.atomic(root/'good'/'session.json',{'session':'good'})
            (root/'linked').symlink_to(root/'good',target_is_directory=True)
            for name in ('file-link','large','corrupt','wrong','fifo','nested'):(root/name).mkdir()
            (root/'file-link/session.json').symlink_to(root/'good/session.json')
            (root/'large/session.json').write_text('x'*200)
            (root/'corrupt/session.json').write_text('{')
            (root/'wrong/session.json').write_text('{"session":"good"}')
            os.mkfifo(root/'fifo/session.json')
            (root/'nested/session.json').write_text('['*2000+']'*2000)
            entries=core.local_session_inventory('good',max_bytes=100)['entries']
            self.assertEqual([e['session'] for e in entries if 'error' not in e],['good'])
            self.assertEqual(len([e for e in entries if 'error' in e]),7)
            self.assertIn('error',next(e for e in core.local_session_inventory('good',max_bytes=5000)['entries'] if e['session']=='nested'))

    def test_capabilities_preserve_gates_and_consumed_sessions(self):
        state={'operational':'PENDING','prepared':False}
        caps=server.action_capabilities(state,False,False)
        self.assertTrue(caps['prepare']['enabled']);self.assertFalse(caps['present']['enabled'])
        state.update(operational='PREPARED',prepared=True)
        self.assertTrue(server.action_capabilities(state,True,False)['step']['enabled'])
        self.assertFalse(server.action_capabilities(state,True,False,'changed')['present']['enabled'])
        self.assertTrue(server.action_capabilities(state,True,True)['stop']['enabled'])
        self.assertFalse(server.action_capabilities(state,True,True)['cleanup']['enabled'])
        state['demoResult']='CONFIRMED'
        self.assertFalse(server.action_capabilities(state,True,False)['step']['enabled'])
        state.update(demoResult=None,active={'operation':'f13'})
        self.assertFalse(server.action_capabilities(state,True,False)['present']['enabled'])

    def test_workflow_jobs_come_from_captured_yaml_only(self):
        jobs=core.workflow_facts('name: fixture\njobs:\n  build:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 7\n    steps:\n      - name: Build fixture\n  verify:\n    needs: build\n    runs-on: ubuntu-24.04\n')
        self.assertEqual([j['id'] for j in jobs],['build','verify'])
        self.assertEqual(jobs[1]['needs'],'build')
        self.assertEqual(jobs[0]['steps'],['Build fixture'])
        self.assertNotIn('status',jobs[0])

    def test_presentation_model(self):
        subprocess.run(['node','--test',str(Path(__file__).with_name('model.test.mjs'))],check=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
