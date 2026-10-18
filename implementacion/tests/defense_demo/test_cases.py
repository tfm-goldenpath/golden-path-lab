"""Synthetic orchestration only. Stage substitutions never establish real admission."""
import copy
import subprocess
import signal
import sys
import tarfile
import unittest
import threading
from urllib.request import urlopen, Request
from urllib.error import HTTPError
import json
from pathlib import Path
from unittest.mock import patch
import test_lifecycle as base
import core, coordinator as co, cases, server, exporting

class CaseTests(unittest.TestCase):
    def setUp(self):
        base.SessionTests.setUp(self);self.patch=patch.object(cases,'ROOT',self.root);self.patch.start()
        self.state.update(prepared=True,operational='COMPLETED',demoResult='CONFIRMED',completed=list(core.LIVE['defense']),liveDurationSeconds=17)
        self.lab=self.root/'evidence/raw/run-Synthetic';self.lab.mkdir()
        core.atomic(self.lab/'state.json',{'digest':'sha256:'+'a'*64,'imageRepository':'synthetic'})
        core.atomic(self.lab/'tfm-golden.json',{'synthetic':True})
        (core.session_path(self.state['session'])/'lab-path.txt').write_text(str(self.lab))
        core.atomic(core.session_path(self.state['session'])/'session.json',self.state)
    def tearDown(self):
        self.patch.stop();base.SessionTests.tearDown(self)
    def test_web_repeat_remains_authenticated_bound_and_exclusive(self):
        with patch.dict(server.os.environ,{'GP_DEMO_ACTIONS':'1'}): api=server.make_server(self.state['session'],0,'health-only')
        worker=threading.Thread(target=api.serve_forever,daemon=True);worker.start();url=f'http://127.0.0.1:{api.server_port}'
        try:
            with urlopen(url+'/') as r:cookie=r.headers['Set-Cookie'].split(';')[0]
            with urlopen(Request(url+'/api/control',headers={'Cookie':cookie})) as r:csrf=json.load(r)['csrf']
            headers={'Cookie':cookie,'Origin':url,'X-Demo-CSRF':csrf,'Content-Type':'application/json'}
            for body,extra in ((b'{"action":"case-f11-early","session":"other"}',{}),(b'{"action":"case-shell"}',{}),(b'{"action":"case-f11-early"}',{'X-Demo-CSRF':'health-only'})):
                with self.assertRaises(HTTPError):urlopen(Request(url+'/api/action',data=body,headers={**headers,**extra}))
            with patch.object(server.subprocess,'Popen') as launch:
                launch.return_value.poll.return_value=None
                with urlopen(Request(url+'/api/action',data=b'{"action":"case-f11-early"}',headers=headers)) as r:self.assertEqual(r.status,202)
                with self.assertRaises(HTTPError):urlopen(Request(url+'/api/action',data=b'{"action":"case-f11-early"}',headers=headers))
                self.assertEqual(launch.call_count,1);command=launch.call_args.args[0]
                self.assertEqual(command[command.index('--session')+1],self.state['session'])
                self.assertEqual(command[-2:],['--case-action','case-f11-early'])
        finally:api.shutdown();api.server_close();worker.join()
    def test_repeat_new_ids_files_preserve_original_timing_and_inputs(self):
        original=(self.lab/'tfm-golden.json').read_bytes()
        def stage(command,stream,*args,**kwargs):
            stream.write('synthetic fresh invocation '+command[-1]);stream.flush()
            return 0,False,None
        resources={'sufficient':True,'freeBytes':10*1024**3}
        with patch.object(co,'resources',return_value=resources),patch.object(co,'run_process',side_effect=stage):
            cases.execute(self.state,'case-f11-early',120)
            first=core.events(self.state['session']);saved={f: f.read_bytes() for f in core.evidence_root(self.state['session']).glob('operations/*/*') if f.is_file()}
            cases.execute(self.state,'case-f11-early',120)
        es=[e for e in core.events(self.state['session']) if e['operation']=='f11-early']
        self.assertEqual([e['attempt'] for e in es],['case-f11-early-1','case-f11-early-2'])
        self.assertEqual(es[1]['precedingAttempt'],es[0]['attempt']);self.assertEqual(self.state['liveDurationSeconds'],17)
        self.assertEqual((self.lab/'tfm-golden.json').read_bytes(),original)
        self.assertTrue(all(f.read_bytes()==v for f,v in saved.items()))
        self.assertEqual(first,core.events(self.state['session'])[:len(first)])
    def test_repeat_rejects_retired_incompatible_and_busy(self):
        self.assertFalse(cases.capabilities({**self.state,'cleaned':True})['case-f11-early']['enabled'])
        self.assertFalse(cases.capabilities(self.state,True)['case-f11-early']['enabled'])
        with patch.object(co,'assert_source',side_effect=co.Stopped('changed')):
            with self.assertRaises(co.Stopped):cases.execute(self.state,'case-f11-early',120)
    def test_f13_without_fixture_does_not_replay_authorized_image(self):
        caps=cases.capabilities(self.state)
        self.assertFalse(caps['case-f13']['enabled']);self.assertTrue(caps['prepare-f13-case']['enabled'])
        with self.assertRaises(co.Stopped):cases.execute(self.state,'case-f13',120)
    def test_child_fixture_is_separate_and_recovery_stays_associated(self):
        def prepared(child):
            child.update(prepared=True,operational='PREPARED',image='independent@sha256:'+'b'*64)
        resources={'sufficient':True,'freeBytes':10*1024**3}
        with patch.object(co,'resources',return_value=resources),patch.object(co,'prepare',side_effect=prepared):
            cases.execute(self.state,'prepare-f13-case',120)
        child=cases.fixture(self.state);self.assertNotEqual(child['session'],self.state['session'])
        with patch.object(co,'resources',return_value=resources),patch.object(co,'run_process',return_value=(0,False,None)):
            cases.execute(self.state,'case-f13',120)
            self.assertFalse(cases.capabilities(self.state)['case-f13']['enabled'])
            cases.execute(self.state,'recover-f13-case',120)
        es=core.events(self.state['session']);rejection=next(e for e in es if e['operation']=='f13');recovery=next(e for e in es if e['operation']=='accept')
        self.assertEqual(recovery['linkedAttempt'],rejection['attempt'])
        self.assertEqual(recovery['fixtureSession'],rejection['fixtureSession'])
        self.assertNotEqual(recovery['attempt'],rejection['attempt'])
    def test_wrong_fixture_owner_and_symlink_inputs_refused(self):
        self.state['f13Fixture']={'session':'unrelated'}
        with self.assertRaises(ValueError):cases.fixture(self.state)
        (self.lab/'tfm-golden.json').unlink();(self.lab/'tfm-golden.json').symlink_to(self.lab/'state.json')
        with self.assertRaises(co.Stopped):cases.make_inputs(self.state,'case-f11-early-1')
        # Preserve the first failed attempt, then test a separate unsafe parent path.
        other=self.root/'outside';other.mkdir()
        with patch.object(cases,'evidence_root',return_value=self.root/'another'):
            (self.root/'another').mkdir();(self.root/'another/case-inputs').symlink_to(other,target_is_directory=True)
            with self.assertRaisesRegex(co.Stopped,'Symlinked'):cases.make_inputs(self.state,'case-f11-early-2')
        self.assertEqual(list(other.iterdir()),[])

    def test_resource_stop_is_persisted_by_cli_case_exception_handler(self):
        # Execute the actual entry-point module under __main__, without laboratory work.
        import runpy
        import types
        script = Path(co.__file__)
        fake = types.ModuleType('cases')
        fake.ACTIONS = cases.ACTIONS
        def rejected(state, action, budget):
            import coordinator
            raise coordinator.Stopped('RESOURCE_EXHAUSTED synthetic boundary')
        fake.execute = rejected
        args = [str(script), 'case', '--session', self.state['session'], '--case-action', 'case-f11-early']
        with patch.dict(sys.modules, {'cases': fake}), patch.object(sys, 'argv', args):
            original = sys.modules['coordinator']; handler = signal.getsignal(signal.SIGTERM)
            try:
                with self.assertRaises(SystemExit) as end: runpy.run_path(str(script), run_name='__main__')
                self.assertEqual(end.exception.code, 1)
            finally:
                sys.modules['coordinator'] = original
                signal.signal(signal.SIGTERM, handler)
        state = core.read_json(core.session_path(self.state['session'])/'session.json')
        self.assertEqual(state['lastCommand']['error'], 'RESOURCE_EXHAUSTED synthetic boundary')
        self.assertEqual(core.events(self.state['session']), [])

    def test_closed_hardlinked_artifacts_export_as_regular_files(self):
        root = core.evidence_root(self.state['session'])
        first = root/'operations/one/output.log'; first.parent.mkdir(parents=True)
        first.write_text('Synthetic closed fixture log')
        second = root/'operations/two/output.log'; second.parent.mkdir(parents=True)
        second.hardlink_to(first)
        core.publish_event(self.state['session'], {'operation':'f13', 'artifacts':[
            core.file_record(root, f, 'f13', 'synthetic fixture') for f in (first,second)]})
        # No laboratory package for this focused relay/export regression.
        (core.session_path(self.state['session'])/'lab-path.txt').unlink()
        with patch.object(co.subprocess, 'run', return_value=subprocess.CompletedProcess([],0)):
            exporting.export_session(self.state)
        package = self.root/'evidence/packages'/self.state['exports'][-1]['package']['path']
        exporting.verify_export(package)
        with tarfile.open(package) as archive:
            self.assertTrue(all(m.isfile() for m in archive.getmembers()))

    def test_orphan_fixture_worker_is_observed_and_stopped_only_by_identity(self):
        child=co.create(self.state['session']+'-f13-1','defense-short',3)
        child['fixtureParent']=self.state['session']
        self.state['f13Fixture']={'session':child['session'],'attempt':'case-f13-1'}
        self.state['activeFixture']=child['session']
        proc=subprocess.Popen([sys.executable,'-c','import time; time.sleep(30)'],start_new_session=True)
        try:
            identity=server.process_identity(proc.pid)
            child['active']={'operation':'f13','worker':identity}
            core.atomic(core.session_path(child['session'])/'session.json',child)
            self.assertEqual(server.owned_worker(self.state),identity)
            child['active']['worker']={**identity,'start':'wrong'}
            core.atomic(core.session_path(child['session'])/'session.json',child)
            self.assertIsNone(server.owned_worker(self.state))
            child['active']['worker']=identity
            core.atomic(core.session_path(child['session'])/'session.json',child)
            core.atomic(core.session_path(self.state['session'])/'session.json',self.state)
            with patch.dict(server.os.environ,{'GP_DEMO_ACTIONS':'1'}):api=server.make_server(self.state['session'],0,'health')
            worker=threading.Thread(target=api.serve_forever,daemon=True);worker.start();url=f'http://127.0.0.1:{api.server_port}'
            try:
                with urlopen(url+'/') as r:cookie=r.headers['Set-Cookie'].split(';')[0]
                with urlopen(Request(url+'/api/control',headers={'Cookie':cookie})) as r:
                    control=json.load(r);self.assertTrue(control['capabilities']['stop']['enabled'])
                headers={'Cookie':cookie,'Origin':url,'X-Demo-CSRF':control['csrf'],'Content-Type':'application/json'}
                with urlopen(Request(url+'/api/action',data=b'{"action":"stop"}',headers=headers)) as r:self.assertTrue(json.load(r)['stopRequested'])
                self.assertEqual(proc.wait(timeout=5),-15)
                self.assertEqual(core.events(self.state['session']),[])
            finally:api.shutdown();api.server_close();worker.join()
        finally:
            if proc.poll() is None:proc.terminate()
            proc.wait(timeout=5)
