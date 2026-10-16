"""Synthetic unit sessions. No Kubernetes, registry or acceptance claims."""
import copy
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/defense-demo'))
import core
import coordinator as co
import exporting
import server
import ownership

REAL_ROOT = core.ROOT
IDENTITY = {'commit': 'a'*40, 'contentHash': 'b'*64, 'changes': 'synthetic unit fixture', 'files': []}


class SessionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'evidence/raw').mkdir(parents=True)
        self.patches = [patch.object(core, 'ROOT', self.root), patch.object(core, 'SESSIONS', self.root/'sessions'),
                        patch.object(co, 'ROOT', self.root), patch.object(co, 'SESSIONS', self.root/'sessions'),
                        patch.object(server, 'ROOT', self.root), patch.object(exporting, 'ROOT', self.root),
                        patch.object(ownership, 'ROOT', self.root),
                        patch.object(co, 'source_identity', lambda: copy.deepcopy(IDENTITY))]
        for p in self.patches: p.start()
        self.state = co.create('synthetic-01', 'defense', 1)

    def tearDown(self):
        for p in reversed(self.patches): p.stop()
        self.temp.cleanup()

    def operation(self, operation, code=0, aborted=False):
        with patch.object(co, 'run_process', return_value=(code, aborted, 'synthetic fault' if code else None)):
            return co.run_operation(self.state, operation, 'live')

    def ready(self):
        self.state.update(prepared=True, operational='PREPARED')
        core.atomic(core.session_path('synthetic-01')/'session.json', self.state)

    def test_new_session_cannot_overwrite(self):
        with self.assertRaises(co.Stopped): co.create('synthetic-01', 'defense', 1)

    def test_source_change_stops_before_side_effect(self):
        with patch.object(co, 'source_identity', return_value={**IDENTITY, 'contentHash': 'c'*64}):
            with self.assertRaisesRegex(co.Stopped, 'Source/configuration changed'): self.operation('authorize')
        self.assertFalse((core.evidence_root('synthetic-01')/'operations/authorize').exists())

    def test_boot_change_does_not_make_continuous_time(self):
        self.state['bootId'] = 'old-system-boot'
        with self.assertRaisesRegex(co.Stopped, 'boot changed'): co.assert_source(self.state)
        self.assertIsNone(self.state['liveDurationSeconds'])

    def test_present_never_prepares(self):
        with patch.object(co, 'prepare') as prepare:
            with self.assertRaises(co.Stopped): co.present(self.state, 180)
            prepare.assert_not_called()

    def test_emission_not_repeated_after_success_or_failure(self):
        self.operation('authorize')
        with self.assertRaisesRegex(co.Stopped, 'already attempted'): self.operation('authorize')
        with self.assertRaises(co.Stopped): self.operation('delivery-evidence', 1)
        with self.assertRaisesRegex(co.Stopped, 'already attempted'): self.operation('delivery-evidence')

    def test_order_and_linked_recovery(self):
        self.ready()
        with patch.object(co, 'run_process', return_value=(0, False, None)): co.present(self.state, 180)
        ev = core.events('synthetic-01')
        self.assertEqual([e['operation'] for e in ev], ['resume'] + core.LIVE['defense'])
        self.assertEqual(ev[1]['decision'], 'deny')
        self.assertEqual(ev[1]['notReached'], ['admission','deployment'])
        self.assertEqual(ev[2]['notReached'], ['deployment'])
        self.assertEqual(ev[4]['linkedAttempt'], 'attempt-2')
        self.assertEqual(self.state['f13Recovery'], 'confirmed')

    def test_recovery_failure_leaves_global_incomplete(self):
        self.ready()
        calls = [(0,False,None)]*4 + [(1,False,'synthetic recovery failure')]
        with patch.object(co, 'run_process', side_effect=calls):
            with self.assertRaises(co.Stopped): co.present(self.state, 180)
        self.assertEqual(self.state['f13Recovery'], 'pending')
        self.assertNotEqual(self.state.get('demoResult'), 'CONFIRMED')
        self.assertEqual(core.events('synthetic-01')[-1]['operational'], 'NOT_REACHED')

    def test_errors_never_become_expected_denial(self):
        for code in (1, 42, 124, 137):
            self.assertEqual(core.outcome(code,False,'deny'), ('ERROR','indeterminate','unconfirmed'))

    def test_cancellation_kills_owned_process_group(self):
        target = self.root / 'must-not-appear'
        with tempfile.TemporaryFile() as stream:
            result = co.run_process([sys.executable,'-c',f'import time;from pathlib import Path;time.sleep(3);Path({str(target)!r}).touch()'], stream, time.monotonic()+.2)
        self.assertTrue(result[1]); self.assertEqual(result[2], 'BUDGET_EXCEEDED')
        self.assertFalse(target.exists())

    def test_budget_before_next_operation_does_not_start(self):
        with patch.object(co, 'run_process') as run:
            with self.assertRaises(co.Stopped): co.run_operation(self.state, 'authorize', 'live', time.monotonic()-1)
            run.assert_not_called()

    def test_budget_at_final_closure_retains_failed_work_exit(self):
        self.ready()
        self.state['f13Recovery']='confirmed'
        self.state['workExitCode']=0
        def operation(state, op, *args, **kwargs):
            state['completed'].append(op)
        with patch.object(co,'run_operation',side_effect=operation),patch.object(co,'not_reached'),patch.object(co.time,'monotonic',side_effect=[0,181,182]):
            with self.assertRaises(co.Stopped):co.present(self.state,180)
        self.assertEqual(self.state['operational'],'ABORTED')
        self.assertEqual(self.state['workExitCode'],124)

    def test_preparation_precondition_failure_is_not_previous_operation_success(self):
        self.state.update(operational='COMPLETED',workExitCode=0,lastExitCode=0)
        with patch.object(co,'run_operation',side_effect=co.Stopped('source changed',1)):
            with self.assertRaises(co.Stopped):co.prepare(self.state)
        self.assertEqual(self.state['operational'],'ERROR')
        self.assertEqual(self.state['workExitCode'],1)

    def test_interrupt_between_preparation_operations_is_aborted(self):
        with patch.object(co,'run_operation',side_effect=KeyboardInterrupt):
            with self.assertRaises(co.Stopped):co.prepare(self.state)
        self.assertEqual(self.state['operational'],'ABORTED')
        self.assertEqual(self.state['workExitCode'],130)

    def test_disk_failure_preserves_observation_and_no_infrastructure(self):
        with patch.object(co, 'resources', return_value={'sufficient':False,'freeBytes':100}), patch.object(co.subprocess,'run',return_value=subprocess.CompletedProcess([],0)):
            with self.assertRaisesRegex(co.Stopped,'Insufficient'): co.run_operation(self.state, 'environment', 'preparation')
        self.assertIsNone(co.lab_path('synthetic-01'))
        self.assertEqual(core.events('synthetic-01')[0]['decision'],'indeterminate')
        self.assertEqual(self.state['workExitCode'],1)

    def test_loss_of_infrastructure_stops_live_attempts(self):
        self.ready()
        with patch.object(co,'run_process',return_value=(1,False,'synthetic missing cluster')):
            with self.assertRaises(co.Stopped): co.present(self.state,180)
        self.assertTrue(all(e['operational']=='NOT_REACHED' for e in core.events('synthetic-01')[1:]))

    def test_historical_records_do_not_fill_current_pipeline(self):
        data=server.snapshot('synthetic-01')
        self.assertEqual(data['events'],[])
        self.assertEqual(len(data['catalogue']['scenarios']),20)
        self.assertTrue(all('history' in c for c in data['catalogue']['scenarios']))

    def test_immutable_closed_copy_survives_alias_refresh(self):
        source=self.root/'lab';source.mkdir();(source/'verified-sbom.json').write_text('{"synthetic":1}')
        first=self.root/'first';core.capture_files(source,first,'synthetic')
        (source/'verified-sbom.json').write_text('{"synthetic":2}')
        self.assertEqual((first/'verified-sbom.json').read_text(),'{"synthetic":1}')
        with self.assertRaises(FileExistsError): core.capture_files(source,first,'synthetic')

    def test_offline_export_inert_data_and_verified_package(self):
        self.operation('f11-early')
        folder=core.evidence_root('synthetic-01')/'operations/f11-early'
        (folder/'attack.log').write_text('</script><script>window.BAD=true</script>')
        record=core.file_record(core.evidence_root('synthetic-01'),folder/'attack.log','synthetic','synthetic')
        core.publish_event('synthetic-01',{'operation':'synthetic','artifacts':[record]})
        with patch.object(co.subprocess,'run',return_value=subprocess.CompletedProcess([],0)):
            output=Path(exporting.export_session(self.state))
        html=output.read_text()
        self.assertIn('Ejecución guardada; no en directo',html)
        self.assertNotIn('</script><script>window.BAD=true',html)
        self.assertIn('\\u003c/script',html)
        self.assertNotIn('src="/app.js"',html)
        self.assertNotIn('href="/style.css"',html)
        self.assertNotIn('window.BAD=true', (core.WEB/'app.js').read_text())
        self.assertTrue(self.state['exports'][-1]['verified'])

    def test_http_routes_integrity_and_read_only(self):
        self.operation('f11-early')
        api=server.make_server('synthetic-01',0,'synthetic-token')
        thread=threading.Thread(target=api.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{api.server_port}'
        try:
            with urlopen(base+'/api/session') as r:
                self.assertEqual(r.headers['Cache-Control'],'no-store')
                self.assertIsNone(r.headers.get('Access-Control-Allow-Origin'))
                data=json.load(r)
            self.assertNotIn('private',data['session'])
            for path in ('/state.json','/artifact/../../etc/passwd','/%2e%2e/etc/passwd','/artifact/'+'0'*24):
                with self.assertRaises(HTTPError): urlopen(base+path)
            for method in ('POST','PUT','DELETE','PATCH','OPTIONS'):
                with self.assertRaises(HTTPError) as caught:urlopen(Request(base+'/api/session',method=method))
                self.assertEqual(caught.exception.code,405)
            artifact=next(iter(core.artifact_index('synthetic-01').values()))
            target=core.evidence_root('synthetic-01')/artifact['path']
            with urlopen(base+'/artifact/'+artifact['id']) as r:self.assertIn('text/plain',r.headers['Content-Type'])
            target.write_text('tampered')
            with self.assertRaises(HTTPError) as caught:urlopen(base+'/artifact/'+artifact['id'])
            self.assertEqual(caught.exception.code,409)
        finally:api.shutdown();api.server_close();thread.join()

    def test_server_reuses_owned_process(self):
        import socket
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        first=server.start_server('synthetic-01',port)
        try:
            second=server.start_server('synthetic-01',port)
            self.assertEqual(first['pid'],second['pid'])
            with self.assertRaises(RuntimeError):server.start_server('synthetic-01',port+1)
        finally:server.stop_server('synthetic-01')

    def test_symlink_parent_and_size_are_rejected(self):
        outside=self.root/'outside';outside.mkdir();(outside/'x.log').write_text('synthetic')
        folder=self.root/'public';folder.mkdir();(folder/'link').symlink_to(outside,target_is_directory=True)
        with self.assertRaises(ValueError):core.safe_path(folder,'link/x.log')
        record=core.file_record(outside,outside/'x.log','test','synthetic')
        with self.assertRaises(ValueError):core.read_artifact(outside,{**record,'size':100})

    def test_catalogue_cannot_execute_shell(self):
        folder=self.root/'catalogue';folder.mkdir()
        value=core.catalogue();value['operations']['authorize']['command']='arbitrary shell'
        core.atomic(folder/'catalogue.json',value)
        with patch.object(core,'WEB',folder):
            with self.assertRaises(ValueError):core.catalogue()

    def test_cleanup_absence_query_does_not_recreate_private_docker_config(self):
        lab=self.root/'evidence/raw/run-synthetic';lab.mkdir()
        private=self.root/'private-synthetic'
        state={'mode':'local','cluster':'synthetic-cluster','registry':'synthetic-registry','builder':'synthetic-builder','private':str(private)}
        core.atomic(lab/'state.json',state)
        (core.session_path('synthetic-01')/'lab-path.txt').write_text(str(lab))
        def command(*args):
            if args[:3]==('docker','buildx','ls'):
                private.mkdir();(private/'current').touch()
            return ''
        with patch.object(ownership,'command',side_effect=command):ownership.main('synthetic-01','absent')
        self.assertFalse(private.exists())

    def test_rejected_replay_does_not_replace_completed_work_status(self):
        self.state.update(prepared=True,operational='COMPLETED',completed=core.LIVE['defense'],lastExitCode=0,demoResult='CONFIRMED')
        core.atomic(core.session_path('synthetic-01')/'session.json',self.state)
        with patch.object(sys,'argv',['demo','present','--session','synthetic-01']):
            with self.assertRaises(co.Stopped):co.main()
        saved=core.public_session('synthetic-01')
        self.assertEqual(saved['operational'],'COMPLETED')
        self.assertEqual(saved['lastExitCode'],0)

    def test_interrupt_during_evidence_closure_is_aborted(self):
        with patch.object(co,'run_process',return_value=(0,False,None)),patch.object(co,'lab_path',return_value=self.root/'lab'),patch.object(co,'capture_files',side_effect=KeyboardInterrupt):
            with self.assertRaises(co.Stopped):co.run_operation(self.state,'authorize','live')
        self.assertEqual(core.events('synthetic-01')[0]['operational'],'ABORTED')
        self.assertIsNone(self.state['active'])

    def test_no_observer_is_optional_and_preserves_errexit(self):
        module=REAL_ROOT/'scripts/lib/attestations.sh'
        result=subprocess.run(['bash','-c',f'set -Eeuo pipefail; source "{module}"; attestations_observe begin synthetic; echo retained'],capture_output=True,text=True)
        self.assertEqual(result.returncode,0)
        self.assertEqual(result.stdout.strip(),'retained')

    def test_unobserved_gate_retains_external_failure_even_when_caller_captures_it(self):
        module=REAL_ROOT/'scripts/lib/attestations.sh'
        script=f'''set -Eeuo pipefail
source "{module}"
state_dir=/synthetic
node() {{ return 42; }}
if attestations_ci_gate synthetic; then exit 0; else exit $?; fi
'''
        result=subprocess.run(['bash','-c',script],capture_output=True,text=True)
        self.assertEqual(result.returncode,42)


if __name__=='__main__':unittest.main()
