"""Synthetic regressions; no Kubernetes execution or human acceptance evidence."""
import copy
import errno
import json
from pathlib import Path
import subprocess
import threading
import socket
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import test_lifecycle as fixtures
import core
import coordinator as co
import ownership
import server


class ComparisonTests(unittest.TestCase):
    setUp = fixtures.SessionTests.setUp
    tearDown = fixtures.SessionTests.tearDown
    ready = fixtures.SessionTests.ready
    operation = fixtures.SessionTests.operation

    def comparison(self):
        self.state.update(profile='f11-comparison', f13Recovery='not-applicable')
        self.ready()

    def test_completion_without_f13_or_live_build_scan_issuance(self):
        self.comparison()
        with patch.object(co,'run_process',return_value=(0,False,None)):
            co.present(self.state,120)
        self.assertEqual(self.state['demoResult'],'CONFIRMED')
        self.assertEqual(self.state['f13Recovery'],'not-applicable')
        self.assertEqual([e['operation'] for e in core.events('synthetic-01')],['resume']+core.LIVE['f11-comparison'])
        self.assertFalse({'build','analysis','authorize','f13'} & set(core.LIVE['f11-comparison']))
        self.assertEqual(core.events('synthetic-01')[1]['arm'],'R')
        with self.assertRaises(co.Stopped):co.present(self.state,120)

    def test_prepare_authorizes_only_new_profile_and_does_not_present(self):
        self.state['profile']='f11-comparison'
        operations=[]
        def operation(state,op,phase):operations.append((op,phase))
        with patch.object(co,'run_operation',side_effect=operation):co.prepare(self.state)
        self.assertEqual([op for op,_ in operations],core.F11_PREPARE)
        self.assertTrue(all(phase=='preparation' for _,phase in operations))
        self.assertIn('authorize',core.F11_PREPARE)
        self.assertNotIn('missing-results',core.F11_PREPARE)
        self.assertIn('missing-results',core.PREPARE)
        self.assertNotIn('authorize',core.PREPARE)
        self.assertTrue(self.state['prepared'])
        self.assertIsNone(self.state['liveDurationSeconds'])

    def test_failure_does_not_confirm_or_replay_reference(self):
        self.comparison()
        with patch.object(co,'run_process',side_effect=[(0,False,None),(1,False,'synthetic PSA rejection')]):
            with self.assertRaises(co.Stopped):co.present(self.state,120)
        ev=core.events('synthetic-01')
        self.assertEqual(ev[1]['expectation'],'unconfirmed')
        self.assertTrue(all(e['operational']=='NOT_REACHED' for e in ev[2:]))
        self.assertFalse(self.state['prepared'])

    def test_no_f13_not_reached_events_after_prepare_failure(self):
        self.state['profile']='f11-comparison'
        with patch.object(co,'run_operation',side_effect=co.Stopped('synthetic prerequisite failure')):
            with self.assertRaises(co.Stopped):co.prepare(self.state)
        self.assertFalse({'f13','missing-results'} & {e['operation'] for e in core.events('synthetic-01')})

    def test_abandoned_owner_keeps_unknown_duration_and_partial_log(self):
        self.state.update(profile='f11-comparison', operational='RUNNING',
                          controller={'pid':123,'start':'fixture','bootId':'fixture'},
                          active={'operation':'preflight','phase':'preparation','instance':'preflight'})
        folder=core.evidence_root('synthetic-01')/'operations/preflight'
        folder.mkdir();(folder/'output-original.log').write_text('partial synthetic output')
        with patch.object(server,'process_identity',return_value=None): co.recover_abandoned(self.state)
        self.assertEqual(self.state['operational'],'ABORTED')
        event=core.events('synthetic-01')[0]
        self.assertIsNone(event['durationSeconds']);self.assertIsNone(event['exitCode'])
        self.assertEqual(event['expectation'],'unconfirmed')
        self.assertEqual((folder/'output-original.log').read_text(),'partial synthetic output')
        self.assertEqual(len(core.events('synthetic-01')),5)
        co.recover_abandoned(self.state)
        self.assertEqual(len(core.events('synthetic-01')),5)

    def test_abandoned_recovery_refuses_live_worker(self):
        owner={'pid':123,'start':'fixture','bootId':'fixture'}
        self.state.update(operational='RUNNING',active={'worker':owner})
        with patch.object(server,'process_identity',return_value=owner):
            with self.assertRaises(co.Stopped):co.recover_abandoned(self.state)
        self.assertEqual(self.state['operational'],'RUNNING')

    def test_incremental_copies_preserve_prior_artifact(self):
        lab=self.root/'lab';lab.mkdir();(lab/'a.json').write_text('{"v":1}')
        first=core.capture_files(lab,self.root/'first','first')
        previous={key:v['originalSha256'] for key,v in first.items()}
        self.assertEqual(core.capture_files(lab,self.root/'second','second',previous),{})
        (lab/'a.json').write_text('{"v":2}')
        self.assertIn('a.json',core.capture_files(lab,self.root/'third','third',previous))
        self.assertEqual((self.root/'first/a.json').read_text(),'{"v":1}')

    def test_enospc_releases_only_owned_metadata_margin(self):
        self.assertTrue((core.session_path('synthetic-01')/'.receipt-reserve.bin').exists())
        evidence=core.evidence_root('synthetic-01')/'keep.log';evidence.write_text('original')
        with patch.object(co,'run_process',side_effect=OSError(errno.ENOSPC,'synthetic full disk')):
            with self.assertRaises(co.Stopped):self.operation_enospc()
        self.assertFalse((core.session_path('synthetic-01')/'.receipt-reserve.bin').exists())
        self.assertEqual(evidence.read_text(),'original')
        self.assertIn('ENOSPC',core.events('synthetic-01')[0]['reason'])

    def operation_enospc(self):co.run_operation(self.state,'authorize','live')

    def test_inodes_and_real_device_deduplication(self):
        from types import SimpleNamespace
        fs=SimpleNamespace(f_bavail=20*1024**3,f_frsize=1,f_favail=9999)
        with patch.object(co.os,'statvfs',return_value=fs):
            observation=co.resources(3,True,'f11-comparison',docker_root=str(self.root))
        self.assertFalse(observation['sufficient'])
        self.assertEqual(len({m['device'] for m in observation['filesystems']}),len(observation['filesystems']))
        self.assertGreaterEqual(observation['requiredBytes'],8*1024**3)

    def test_monitor_failure_terminates_owned_process(self):
        import tempfile,time
        with tempfile.TemporaryFile() as stream:
            with self.assertRaises(OSError):
                co.run_process(['sleep','30'],stream,sample_interval=0,resource_check=lambda:(_ for _ in ()).throw(OSError(errno.ENOSPC,'synthetic')))

    def test_cleanup_uses_sealed_ids_preserves_directories_and_is_repeatable(self):
        session=core.session_path('synthetic-01');lab=self.root/'evidence/raw/run-synthetic';lab.mkdir()
        state={'cluster':'c','registry':'r','builder':'b','private':str(self.root/'private')}
        before={'clusterContainer':'id-c','registryContainer':'id-r','builderContainer':'id-b','digest':None}
        after={**before,**{key:None for key in ('clusterContainer','registryContainer','builderContainer')}}
        core.atomic(session/'ownership.json',before)
        for folder in ('evidence','snapshots','private'):
            (self.root/folder).mkdir(exist_ok=True);(self.root/folder/'retained').write_text('retain')
        with patch.object(ownership,'identity',side_effect=[before,after,after,after]),patch.object(ownership,'command') as command:
            ownership.retire('synthetic-01',session,lab,state)
            ownership.retire('synthetic-01',session,lab,state)
        self.assertEqual(command.call_count,3)
        self.assertEqual(command.call_args_list[0].args,('docker','rm','-f','id-c'))
        self.assertEqual(len(list((session/'cleanup-receipts').glob('*.json'))),2)
        self.assertTrue(all((self.root/f/'retained').exists() for f in ('evidence','snapshots','private')))

    def test_cleanup_rejects_unrecorded_or_replaced_resource(self):
        session=core.session_path('synthetic-01');actual={'clusterContainer':'new','registryContainer':None,'builderContainer':None}
        state={'cluster':'c','registry':'r','builder':'b'}
        with self.assertRaises(ValueError):ownership.cleanup_plan('synthetic-01',session,self.root,state,actual)
        core.atomic(session/'ownership.json',{**actual,'clusterContainer':'old'})
        with self.assertRaises(ValueError):ownership.cleanup_plan('synthetic-01',session,self.root,state,actual)

    def test_retirement_of_stopped_registry_does_not_require_its_old_ip(self):
        state={'cluster':'c','registry':'r','builder':'b',
               'imageRepository':'172.18.0.3:5000/quotes-node-run-synthetic'}
        registry={'Id':'id-r','Config':{'Labels':{'tfm.lab':'c'}},
                  'State':{'Running':False},'NetworkSettings':{'Networks':{'kind':{'IPAddress':''}}}}
        node={'Id':'id-c','Config':{'Labels':{'io.x-k8s.kind.cluster':'c'}},'State':{'Running':True}}
        with patch.object(ownership,'inspect',side_effect=[registry,node,None]):
            self.assertEqual(ownership.identity(state,self.root,False)['registryContainer'],'id-r')
        with patch.object(ownership,'inspect',side_effect=[registry,node,None]):
            with self.assertRaisesRegex(ValueError,'stopped'): ownership.identity(state,self.root,True)
        registry['State']['Running']=True
        with patch.object(ownership,'inspect',side_effect=[registry,node,None]):
            with self.assertRaisesRegex(ValueError,'address changed'): ownership.identity(state,self.root,True)

    def test_actions_require_cookie_origin_csrf_and_reject_duplicate_launch(self):
        self.comparison()
        with patch.dict(server.os.environ,{'GP_DEMO_ACTIONS':'1'}):api=server.make_server('synthetic-01',0,'public-health-token')
        thread=threading.Thread(target=api.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{api.server_port}'
        try:
            with urlopen(base+'/') as r:cookie=r.headers['Set-Cookie'].split(';')[0]
            with urlopen(Request(base+'/api/control',headers={'Cookie':cookie})) as r:csrf=json.load(r)['csrf']
            headers={'Cookie':cookie,'Origin':base,'X-Demo-CSRF':csrf,'Content-Type':'application/json'}
            for changed in ({'Cookie':''},{'Origin':'https://other.invalid'},{'X-Demo-CSRF':'public-health-token'}):
                with self.assertRaises(HTTPError) as error:urlopen(Request(base+'/api/action',data=b'{"action":"present"}',headers={**headers,**changed}))
                self.assertEqual(error.exception.code,403)
            with patch.object(server.subprocess,'Popen') as launch:
                launch.return_value.poll.return_value=None
                with urlopen(Request(base+'/api/action',data=b'{"action":"present"}',headers=headers)) as r:self.assertEqual(r.status,202)
                with self.assertRaises(HTTPError) as error:urlopen(Request(base+'/api/action',data=b'{"action":"present"}',headers=headers))
                self.assertEqual(error.exception.code,409)
                self.assertEqual(launch.call_count,1)
        finally:api.shutdown();api.server_close();thread.join()

    def test_streamed_large_artifact_has_bounded_excerpt_and_full_download(self):
        self.operation('f11-early')
        folder=core.evidence_root('synthetic-01')/'operations/f11-early';path=folder/'large.log';path.write_bytes(b'x'*70000)
        record=core.file_record(core.evidence_root('synthetic-01'),path,'synthetic','synthetic')
        core.publish_event('synthetic-01',{'operation':'synthetic','artifacts':[record]})
        api=server.make_server('synthetic-01',0,'synthetic');thread=threading.Thread(target=api.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{api.server_port}'
        try:
            with urlopen(base+'/artifact/'+record['id']) as r:
                self.assertEqual(len(r.read()),65536);self.assertEqual(r.headers['X-Evidence-View'],'excerpt')
            with urlopen(base+'/download/artifact/'+record['id']) as r:self.assertEqual(len(r.read()),70000)
        finally:api.shutdown();api.server_close();thread.join()

    def test_low_space_cleanup_does_not_require_archive_before_retirement(self):
        import sys, exporting
        self.state.update(profile='f11-comparison', operational='ERROR', workExitCode=42)
        core.atomic(core.session_path('synthetic-01')/'session.json', self.state)
        lab=self.root/'evidence/raw/run-synthetic';lab.mkdir()
        (lab/'retain.json').write_text('{"original":true}')
        with patch.object(sys,'argv',['demo','cleanup','--session','synthetic-01']), patch.object(co,'lab_path',return_value=lab), patch.object(exporting,'export_session',side_effect=exporting.ExportSpaceError('synthetic low space')), patch.object(co.subprocess,'run') as run:
            with self.assertRaisesRegex(co.Stopped,'Export pending'):co.main()
        self.assertEqual(run.call_args.args[0][-1],'recovery-cleanup')
        saved=core.public_session('synthetic-01')
        self.assertTrue(saved['exportPending']);self.assertFalse(saved['prepared'])
        self.assertEqual(saved['workExitCode'],42)
        self.assertTrue((lab/'retain.json').exists())
        self.assertTrue((core.session_path('synthetic-01')/'export-pending.json').exists())

    def test_metadata_parent_symlink_is_rejected(self):
        outside=self.root/'outside';outside.mkdir()
        alias=self.root/'alias';alias.symlink_to(outside,target_is_directory=True)
        with self.assertRaises(ValueError):core.atomic(alias/'plan.json',{})
        (outside/'plan.json').write_text('{}')
        with self.assertRaises(ValueError):core.read_json(alias/'plan.json')

    def test_optional_profile_reuses_pins_and_has_requested_minimums(self):
        repo=fixtures.REAL_ROOT.parent
        profile=repo/'.devcontainer/defense/devcontainer.json'
        value=json.loads(profile.read_text())
        base=json.loads((repo/'.devcontainer/implementacion/devcontainer.json').read_text())
        self.assertEqual(base['hostRequirements'],{'cpus':2,'memory':'8gb','storage':'32gb'})
        self.assertEqual(value['features'],base['features'])
        self.assertEqual(value['hostRequirements'],{'cpus':4,'memory':'16gb','storage':'32gb'})
        self.assertEqual((profile.parent/value['build']['dockerfile']).resolve(),fixtures.REAL_ROOT/'.devcontainer/Dockerfile')
        self.assertEqual((profile.parent/value['build']['context']).resolve(),fixtures.REAL_ROOT)
        self.assertEqual((profile.parent/'devcontainer-lock.json').read_bytes(),(repo/'.devcontainer/implementacion/devcontainer-lock.json').read_bytes())

    def test_busy_port_does_not_create_pending_session(self):
        with socket.socket() as listener:
            listener.bind(('127.0.0.1',0));listener.listen()
            port=listener.getsockname()[1]
            with patch('sys.argv',['coordinator','prepare','--session','new-synthetic','--serve','--port',str(port)]):
                with self.assertRaisesRegex(RuntimeError,'unavailable'):co.main()
            self.assertFalse(core.session_path('new-synthetic').exists())
            self.assertFalse(core.evidence_root('new-synthetic').exists())
            self.assertEqual(listener.getsockname()[1],port)

    def test_busy_owned_viewer_explains_safe_reopen_and_stop(self):
        with socket.socket() as listener:
            listener.bind(('127.0.0.1',0));listener.listen()
            port=listener.getsockname()[1]
            core.atomic(core.session_path('synthetic-01')/'server.json',{'port':port})
            with patch.object(server,'owned_server',return_value=True):
                with self.assertRaisesRegex(RuntimeError,'stop-server --session synthetic-01'):
                    server.check_viewer_port('new-synthetic',port)

    def test_stop_viewer_command_leaves_lab_and_state_unchanged(self):
        path=core.session_path('synthetic-01')/'session.json';before=path.read_bytes()
        with patch('sys.argv',['coordinator','stop-server','--session','synthetic-01']),patch.object(server,'stop_server') as stop,patch.object(co,'run_operation') as operation:
            self.assertEqual(co.main(),0)
            stop.assert_called_once_with('synthetic-01');operation.assert_not_called()
        self.assertEqual(path.read_bytes(),before)

    def test_snapshot_export_binds_bytes_and_rejects_drift(self):
        import tempfile, exporting
        with tempfile.TemporaryDirectory(prefix='golden-path-defense-synthetic-') as temp:
            name=Path(temp).name.removeprefix('golden-path-defense-')
            folder=Path(temp)/'snapshots/db-synthetic';(folder/'db').mkdir(parents=True)
            lab=self.root/'lab';lab.mkdir()
            values={'trivy.db':b'synthetic database fixture','metadata.json':b'{"Version":2,"UpdatedAt":"synthetic"}'}
            for name_in_db,content in values.items():(folder/'db'/name_in_db).write_bytes(content)
            core.atomic(lab/'database-identity.json',{'retrieval':{'directory':str(folder)},'sha256':{k:core.digest(v) for k,v in values.items()}})
            state={'profile':'f11-comparison','session':name}
            self.assertEqual(len(exporting.snapshot_paths(state,lab)),2)
            (folder/'db/trivy.db').write_bytes(b'drift')
            with self.assertRaisesRegex(ValueError,'drift'):exporting.snapshot_paths(state,lab)

    def test_cleanup_refuses_active_workload_operation(self):
        import os
        session=core.session_path('synthetic-01')
        self.state['active']={'operation':'comparison-reference','worker':server.process_identity(os.getpid())}
        core.atomic(session/'session.json',self.state)
        with patch.object(ownership,'command') as command:
            with self.assertRaisesRegex(ValueError,'active'):ownership.retire('synthetic-01',session,self.root,{})
        command.assert_not_called()

    def test_cleanup_refuses_another_session_reference(self):
        session=core.session_path('synthetic-01');actual={'clusterContainer':'same-id','registryContainer':None,'builderContainer':None}
        core.atomic(session/'ownership.json',actual)
        core.atomic(session.parent/'other-session/resource-ownership.json',actual)
        with self.assertRaisesRegex(ValueError,'another retained session'):
            ownership.cleanup_plan('synthetic-01',session,self.root,{'cluster':'c','registry':'r','builder':'b'},actual)
