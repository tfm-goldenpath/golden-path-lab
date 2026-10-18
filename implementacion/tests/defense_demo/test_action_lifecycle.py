"""Real harmless subprocesses; no Kubernetes or scenario-execution claims."""
import json
import os
import subprocess
import sys
import threading
import time
import unittest
from urllib.request import Request,urlopen
from unittest.mock import patch
import test_lifecycle as base
import core,coordinator as co,server

class ActionLifecycleTests(unittest.TestCase):
    def setUp(self):
        base.SessionTests.setUp(self)
        self.state.update(prepared=True,operational='PREPARED')
        core.atomic(core.session_path(self.state['session'])/'session.json',self.state)
        with patch.dict(os.environ,{'GP_DEMO_ACTIONS':'1'}):self.api=server.make_server(self.state['session'],0,'health')
        self.thread=threading.Thread(target=self.api.serve_forever,daemon=True);self.thread.start()
        self.url=f'http://127.0.0.1:{self.api.server_port}'
        with urlopen(self.url+'/') as r:self.cookie=r.headers['Set-Cookie'].split(';')[0]
        self.csrf=self.get('/api/control')['csrf']
    def tearDown(self):
        self.api.shutdown();self.api.server_close();self.thread.join();base.SessionTests.tearDown(self)
    def get(self,path):
        with urlopen(Request(self.url+path,headers={'Cookie':self.cookie})) as r:return json.load(r)
    def post(self,action):
        headers={'Cookie':self.cookie,'Origin':self.url,'X-Demo-CSRF':self.csrf,'Content-Type':'application/json'}
        with urlopen(Request(self.url+'/api/action',headers=headers,data=json.dumps({'action':action}).encode())) as r:return json.load(r)
    def test_finished_child_is_reaped_before_persisted_controller_is_trusted(self):
        real=subprocess.Popen;children=[];statefile=core.session_path(self.state['session'])/'session.json'
        script="""import json,os,time
from pathlib import Path
p=Path(%r);s=json.loads(p.read_text());stat=Path('/proc/self/stat').read_text();s['controller']={'pid':os.getpid(),'start':stat[stat.rindex(')')+2:].split()[19],'bootId':%r};p.write_text(json.dumps(s))
""" % (str(statefile),core.boot_id())
        def launch(*args,**kwargs):
            child=real([sys.executable,'-c',script],stdout=subprocess.DEVNULL,start_new_session=True);children.append(child);return child
        try:
            with patch.object(server.subprocess,'Popen',side_effect=launch):
                self.post('check');time.sleep(.15)
                self.assertFalse(self.get('/api/control')['busy'])
                self.post('check')
            self.assertEqual(len(children),2)
        finally:
            for child in children:child.wait(timeout=5)
    def launcher(self,body="print('synthetic readiness output',flush=True)",precondition=None):
        """Real command runner/coordinator; replace ONLY the expensive adapter."""
        real=subprocess.Popen
        def launch(argv,**kwargs):
            script=f"""
import sys,os
from pathlib import Path
sys.path.insert(0,{str(base.REAL_ROOT/'scripts/defense-demo')!r})
import core,coordinator as co,actions
core.ROOT=co.ROOT=actions.ROOT=Path({str(self.root)!r})
core.SESSIONS=co.SESSIONS=core.ROOT/'sessions'
co.assert_source=lambda state: None
original=co.run_process
def harmless(command,stream,deadline=None,on_start=None,**kw):
    return original([sys.executable,'-c',{body!r}],stream,deadline,on_start,**kw)
co.run_process=harmless
{precondition or ''}
sys.exit(actions.execute({self.state['session']!r},{argv[-1]!r}))
"""
            return real([sys.executable,'-c',script],**kwargs)
        return patch.object(server.subprocess,'Popen',side_effect=launch)
    def done(self):
        for _ in range(150):
            value=self.get('/api/control')
            if not value['busy']:return value
            time.sleep(.02)
        self.fail('Command did not release ownership')
    def test_fast_check_closes_correlates_and_preserves_two_independent_results(self):
        import actions
        with self.launcher():
            first=self.post('check');time.sleep(.3);control=self.done()
            self.assertEqual(control['command']['commandId'],first['commandId'])
            self.assertEqual(control['command']['status'],'COMPLETED')
            self.assertEqual(control['command']['operations'][0]['operationInstance'],'resume-check-1')
            self.assertNotIn('controller',core.public_session(self.state['session']))
            old={p:p.read_bytes() for p in actions.folder(self.state['session'],first['commandId']).glob('*') if p.is_file()}
            second=self.post('check');control=self.done()
        self.assertNotEqual(first['commandId'],second['commandId'])
        self.assertEqual(control['command']['operations'][0]['operationInstance'],'resume-check-2')
        self.assertTrue(all(p.read_bytes()==v for p,v in old.items()))
        es=core.events(self.state['session']);self.assertEqual([e['commandId'] for e in es],[first['commandId'],second['commandId']])
        self.assertIsNone(core.public_session(self.state['session'])['liveDurationSeconds'])
        # Fresh supervisor (viewer restart) and both tabs recover the SAME receipt.
        self.assertEqual(actions.Supervisor(self.state['session']).reconcile()[1]['commandId'],second['commandId'])
        self.assertEqual(self.get('/api/control')['command'],self.get('/api/control')['command'])
        late=self.post('stop');self.assertEqual(late['stopState'],'ALREADY_FINISHED')
        self.assertEqual(self.post('stop')['stopState'],'ALREADY_FINISHED')
        self.assertEqual(actions.current(self.state['session'])['status'],'COMPLETED')
    def test_silent_completion_has_own_receipt_and_no_invented_operation(self):
        with self.launcher(precondition='co.main=lambda:0'):
            accepted=self.post('check');control=self.done()
        self.assertEqual(control['command']['status'],'COMPLETED')
        self.assertEqual(control['command']['operations'],[])
        snap=self.get('/api/session');command=next(c for c in snap['commands'] if c['commandId']==accepted['commandId'])
        self.assertEqual(command['output'],'');self.assertEqual(len(command['artifacts']),2)
    def test_pre_operation_failure_visible_sanitized_and_allows_next(self):
        with self.launcher(precondition="def failed(): raise ValueError('Source/configuration changed; token=secret123')\nco.main=failed"):
            self.post('check');result=self.done()['command']
        self.assertEqual(result['status'],'FAILED');self.assertEqual(result['operations'],[])
        self.assertIn('Source/configuration',result['diagnostic'])
        self.assertNotIn('secret123',json.dumps(self.get('/api/session')['commands']))
        with self.launcher():self.post('check');self.assertEqual(self.done()['command']['status'],'COMPLETED')
    def test_startup_failure_is_closed_not_hidden_in_shared_log(self):
        with patch.object(server.subprocess,'Popen',side_effect=OSError('synthetic startup failure')):
            response=self.post('check')
        result=self.done()['command'];self.assertEqual(result['commandId'],response['commandId'])
        self.assertEqual(result['status'],'FAILED');self.assertIn('startup',result['diagnostic']);self.assertEqual(len(result['artifacts']),2)
    def test_stop_running_repeated_and_no_duplicate_launch(self):
        from urllib.error import HTTPError
        with self.launcher("import time;print('synthetic active',flush=True);time.sleep(20)"):
            self.post('check')
            for _ in range(80):
                if self.get('/api/session')['session'].get('active'):break
                time.sleep(.02)
            with self.assertRaises(HTTPError) as duplicate:self.post('check')
            self.assertEqual(duplicate.exception.code,409);duplicate.exception.close()
            self.assertIn(self.post('stop')['stopState'],('REQUESTED','STOPPING'))
            self.assertIn(self.post('stop')['stopState'],('STOPPING','CLOSING','ALREADY_FINISHED'))
            result=self.done()['command']
        self.assertEqual(result['status'],'CANCELLED');self.assertTrue(result['operations'])
        self.assertFalse(self.get('/api/control')['busy'])
    def test_real_timeout_propagates_to_check_adapter(self):
        # Only shrink the CLI budget in this test; run_process and termination are real.
        pre="original_main=co.main\ndef short():\n sys.argv[sys.argv.index('--budget-seconds')+1]='0.15'\n return original_main()\nco.main=short"
        with self.launcher('import time;time.sleep(20)',pre):
            self.post('check');result=self.done()['command']
        self.assertEqual(result['status'],'TIMED_OUT');self.assertEqual(result['exitCode'],124)
        event=core.events(self.state['session'])[-1];self.assertEqual(event['operation'],'resume')
        self.assertNotEqual(event['operational'],'COMPLETED')
    def test_pid_reuse_and_zombie_are_not_live_and_never_signalled(self):
        import actions
        proc=subprocess.Popen([sys.executable,'-c','pass'])
        try:
            identity=actions.process_identity(proc.pid);time.sleep(.15)
            observed=actions.observe_process(proc.pid)
            self.assertEqual(observed['state'],'Z');self.assertIsNone(actions.process_identity(proc.pid))
            self.state['controller']={**identity,'start':'different-start'}
            core.atomic(core.session_path(self.state['session'])/'session.json',self.state)
            with patch.object(actions.os,'kill') as kill:
                self.assertFalse(self.get('/api/control')['busy']);self.post('stop');kill.assert_not_called()
        finally:proc.wait(timeout=5)
    def test_cancelled_check_can_be_checked_again_without_restoring_prepared(self):
        state={**self.state,'operational':'ABORTED','active':None,'prepared':True}
        self.assertTrue(server.action_capabilities(state,True,False)['check']['enabled'])
        self.assertFalse(server.action_capabilities(state,True,False)['present']['enabled'])
        self.assertFalse(server.action_capabilities({**state,'cleaned':True},True,False)['check']['enabled'])
        self.assertFalse(server.action_capabilities({**state,'prepared':False},True,False)['check']['enabled'])
    def test_closing_stop_does_not_interrupt_or_relabel_result(self):
        import actions
        identifier='a'*32;path=actions.folder(self.state['session'],identifier)
        core.atomic(path/'command.json',{'commandId':identifier,'session':self.state['session'],'action':'check','status':'CLOSING','process':actions.process_identity(os.getpid()),'acceptedUTC':core.utc(),'operations':[]})
        core.atomic(core.session_path(self.state['session'])/'action-current.json',{'commandId':identifier})
        with patch.object(actions.os,'kill') as kill:
            result=self.post('stop');self.assertEqual(result['stopState'],'CLOSING');kill.assert_not_called()
        record=actions.finish(self.state['session'],identifier,0)
        self.assertEqual(record['status'],'COMPLETED')
        self.assertEqual(actions.records(self.state['session'],'stop-requests')[0]['commandId'],identifier)
    def test_receipt_space_failure_uses_only_owned_emergency_margin(self):
        import actions,errno
        with patch.object(server.subprocess,'Popen',side_effect=OSError('startup')):
            command=self.post('check')['commandId']
        # A separate admitted command supplies a writable, nonterminal receipt.
        path=actions.folder(self.state['session'],'b'*32)
        core.atomic(path/'command.json',{'commandId':'b'*32,'session':self.state['session'],'action':'check','status':'RUNNING','acceptedUTC':core.utc(),'operations':[]})
        original=actions.close_receipt;calls=[]
        def full(*args,**kwargs):
            calls.append(args)
            if len(calls)==1:raise OSError(errno.ENOSPC,'synthetic full disk')
            return original(*args,**kwargs)
        with patch.object(actions,'close_receipt',side_effect=full):result=actions.finish(self.state['session'],'b'*32,0)
        self.assertEqual(result['status'],'UNKNOWN');self.assertIn('RESOURCE_EXHAUSTED',result['diagnostic'])
        self.assertTrue(actions.folder(self.state['session'],command).exists())
        self.assertFalse((core.session_path(self.state['session'])/'.receipt-reserve.bin').exists())
    def test_fixture_receipts_and_output_bind_to_command_not_parent_last_command(self):
        import actions
        with patch.object(server.subprocess,'Popen',side_effect=OSError('test startup')):
            identifier=self.post('check')['commandId']
        # Independent second command with an owned child fixture (synthetic data).
        identifier='c'*32;path=actions.folder(self.state['session'],identifier)
        child=co.create(self.state['session']+'-f13-1','defense-short',1);child['fixtureParent']=self.state['session']
        child['active']={'operation':'f13','instance':'f13','commandId':identifier}
        self.state['activeFixture']=child['session'];self.state['f13Fixture']={'session':child['session'],'attempt':'case-f13-1'}
        core.atomic(core.session_path(child['session'])/'session.json',child);core.atomic(core.session_path(self.state['session'])/'session.json',self.state)
        out=core.evidence_root(child['session'])/'operations/f13/output-original.log';out.parent.mkdir(parents=True);out.write_text('synthetic child output')
        core.atomic(path/'command.json',{'commandId':identifier,'session':self.state['session'],'action':'case-f13','status':'RUNNING','acceptedUTC':core.utc(),'operations':[],'process':None})
        value=next(v for v in actions.public_records(self.state['session']) if v['commandId']==identifier)
        self.assertEqual(value['output'],'synthetic child output');self.assertEqual(value['activeOperation']['session'],child['session'])
        with patch.dict(os.environ,{'GP_DEMO_COMMAND_ID':identifier,'GP_DEMO_COMMAND_SESSION':self.state['session']}):
            core.publish_event(self.state['session'],{'operation':'f13','fixtureSession':child['session'],'operationInstance':'f13','artifacts':[]})
        self.assertEqual(actions.finish(self.state['session'],identifier,0)['operations'][0]['fixtureSession'],child['session'])
    def test_check_budget_also_bounds_pre_operation_wait(self):
        pre="actions.COMMAND_BUDGET_SECONDS=.15\ndef slow():\n import time;time.sleep(20)\nco.main=slow"
        with self.launcher(precondition=pre):
            self.post('check');result=self.done()['command']
        self.assertEqual(result['status'],'TIMED_OUT');self.assertEqual(result['operations'],[])
        self.assertIn('BUDGET_EXCEEDED',result['diagnostic'])
    def test_fresh_prepare_serve_enables_actions_without_presenting(self):
        args=['coordinator.py','prepare','--session','synthetic-browser-ready','--profile','defense','--reserve-gib','3','--serve','--enable-actions','--port','8776']
        with patch.dict(os.environ,{}),patch.object(sys,'argv',args),patch.object(co,'prepare') as prepare,patch.object(co,'present') as present,patch.object(server,'start_server') as serve:
            self.assertEqual(co.main(),0)
            prepare.assert_called_once();present.assert_not_called();serve.assert_called_once_with('synthetic-browser-ready',8776)
            self.assertEqual(os.environ['GP_DEMO_ACTIONS'],'1')
            self.assertEqual(prepare.call_args.args[0]['reserveGiB'],3)
    def test_restarted_supervisor_recovers_live_command_then_terminal_receipt(self):
        import actions
        with self.launcher('import time;time.sleep(.4)'):
            identifier=self.post('check')['commandId'];time.sleep(.1)
            restarted=actions.Supervisor(self.state['session'])
            busy,record=restarted.reconcile();self.assertTrue(busy);self.assertEqual(record['commandId'],identifier)
            final=self.done()['command'];busy,record=restarted.reconcile()
            self.assertFalse(busy);self.assertEqual(record,final)
    def test_metadata_lock_waits_for_concurrent_transition(self):
        import actions
        identifier='d'*32;path=actions.folder(self.state['session'],identifier)
        core.atomic(path/'command.json',{'commandId':identifier,'status':'RUNNING'})
        results=[]
        def transition():results.append(actions.update(self.state['session'],identifier,diagnostic='synthetic transition'))
        with core.locked(core.session_path(self.state['session'])/'.actions.lock'):
            thread=threading.Thread(target=transition);thread.start();time.sleep(.04)
            self.assertTrue(thread.is_alive())
        thread.join(timeout=3);self.assertFalse(thread.is_alive());self.assertEqual(results[0]['diagnostic'],'synthetic transition')
    def test_symlinked_command_output_cannot_read_an_unrelated_file(self):
        import actions
        identifier='e'*32;path=actions.folder(self.state['session'],identifier)
        core.atomic(path/'command.json',{'commandId':identifier,'status':'RUNNING'})
        private=self.root/'private-test';private.write_text('do not expose')
        (path/'output-original.log').symlink_to(private)
        with self.assertRaisesRegex(ValueError,'symlinked'):actions.finish(self.state['session'],identifier,0)
        self.assertEqual(private.read_text(),'do not expose');self.assertFalse((path/'output.log').exists())
    def test_export_keeps_command_and_stop_receipts_excludes_private_output(self):
        import actions,exporting,tarfile
        with patch.object(server.subprocess,'Popen',side_effect=OSError('startup token=secret123')):
            accepted=self.post('check')
        self.post('stop')
        with patch.object(co.subprocess,'run',return_value=subprocess.CompletedProcess([],0)):
            state=core.public_session(self.state['session']);exporting.export_session(state)
        package=self.root/'evidence/packages'/state['exports'][-1]['package']['path']
        exporting.verify_export(package)
        expected=[a['id'] for a in actions.current(self.state['session'])['artifacts']]
        with tarfile.open(package) as archive:
            names=archive.getnames()
            for identifier in expected:self.assertTrue(any(n.startswith('artifacts/'+identifier+'/') for n in names))
            self.assertFalse(any('output-original.log' in n for n in names))
            html=archive.extractfile('recorded.html').read().decode()
            self.assertIn(accepted['commandId'],html);self.assertNotIn('secret123',html)
            self.assertIn('stop-requests',html);self.assertIn('"actionsEnabled": false',html)
