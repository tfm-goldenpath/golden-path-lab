"""Early profile regressions. Static fixtures are inert; never Kubernetes trials."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import test_core
import core
import coordinator as co
import early
import server

spec=importlib.util.spec_from_file_location('early_adapter',core.ROOT/'scripts/defense-demo/early-adapter.py')
adapter=importlib.util.module_from_spec(spec);spec.loader.exec_module(adapter)

class EarlyTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.folder=Path(self.temp.name);self.raw=self.folder/'raw';self.session=self.folder/'session'
        (self.raw/'operations').mkdir(parents=True);self.session.mkdir()
        self.state={'session':'synthetic-early','profile':'early-security','source':{'commit':'a'*40,'contentHash':'b'*64},'operational':'PENDING','completed':[]}
        self.patches=[patch.object(early,'evidence_root',lambda _:self.raw),patch.object(adapter,'evidence_root',lambda _:self.raw),patch.object(adapter,'session_path',lambda _:self.session)]
        for p in self.patches:p.start()
        self.save()
    def tearDown(self):
        for p in reversed(self.patches):p.stop()
        self.temp.cleanup()
    def save(self):core.atomic(self.session/'session.json',self.state)
    def prepare(self,case):
        op=f'early-{case}-prepare';(self.raw/'operations'/op).mkdir();adapter.main(op,self.state['session'],op)
        self.state.setdefault('earlyPreparation',{})[case]={'status':'READY','operationInstance':op};self.save();return self.raw/'operations'/op
    def test_static_originals_and_seal_without_docker_or_kubernetes(self):
        # Any accidental direct invocation fails, even on a machine with Docker.
        original=adapter.subprocess.run
        def guard(command,*args,**kwargs):
            self.assertNotIn(Path(str(command[0])).name,('docker','kind','kubectl','helm'))
            return original(command,*args,**kwargs)
        with patch.object(adapter.subprocess,'run',side_effect=guard):
            for case in ('f02','f12'):
                folder=self.prepare(case)
                for side in ('negative','positive'):
                    op=f'early-{case}-{side}';instance=op+'-1';out=self.raw/'operations'/instance;out.mkdir()
                    # The Bash adapter enforces production evidence-root confinement;
                    # invoke the shared F12 oracle directly for this temporary fixture.
                    if case=='f12':
                        path=folder/(side+'.json');r=adapter.W.E.command(['conftest','test','--policy',str(core.ROOT/'policies/conftest'),'--namespace','manifests','--output','json',str(path)])
                        (out/'control.json').write_text(r['stdout']);(out/'stderr.log').write_text(r['stderr'])
                        expected='F12' if side=='negative' else 'L06'
                        check=original(['node',str(core.ROOT/'tests/scenarios/runtime-evidence.mjs'),'early',str(r['exitStatus']),str(out/'control.json'),str(out/'stderr.log'),str(path),expected],capture_output=True,text=True)
                        self.assertEqual(check.returncode,0,check.stderr)
                    else:
                        adapter.main(op,self.state['session'],instance)
                        self.assertEqual(core.read_json(out/'result.json')['decision'],'deny' if side=='negative' else 'allow')
                original_text=(folder/('positive.yaml' if case=='f02' else 'positive.json')).read_text()
                (folder/('positive.yaml' if case=='f02' else 'positive.json')).write_text(original_text+' ')
                with self.assertRaisesRegex(ValueError,'changed'):early.prepared(self.state,case)
    def test_failure_isolated_and_capabilities_are_bound(self):
        self.prepare('f02');self.state['earlyPreparation']['f03']={'status':'INCOMPLETE'}
        gates=early.capabilities(self.state)
        self.assertTrue(gates['case-early-f02']['enabled']);self.assertFalse(gates['case-early-f03']['enabled'])
        self.assertFalse(early.capabilities(self.state,True)['case-early-f02']['enabled'])
        self.assertFalse(early.capabilities(self.state,source_error='Source changed')['case-early-f02']['enabled'])
        self.assertFalse(early.capabilities({**self.state,'cleaned':True})['case-early-f02']['enabled'])
        self.assertFalse(server.action_capabilities(self.state,True,False)['present']['enabled'])
    def test_workflow_errors_are_not_expected_detection(self):
        response={'classification':'COMMAND_FAILURE','diagnostics':[adapter.W.F02]}
        self.assertFalse(adapter.W.matches(response,[adapter.W.F02]))
        self.assertFalse(adapter.W.matches({'classification':'DENY','diagnostics':[adapter.W.F02,'extra']},[adapter.W.F02]))
    def test_sealed_symlink_rejected(self):
        folder=self.prepare('f02');target=folder/'positive.yaml';original=self.folder/'foreign';original.write_bytes(target.read_bytes());target.unlink();target.symlink_to(original)
        with self.assertRaises(ValueError):early.prepared(self.state,'f02')
    def test_profiles_preserve_original_sequence(self):
        self.assertEqual(core.LIVE['defense'],['f11-early','f13','authorize','accept','f11-admission'])
        self.assertEqual(len(core.LIVE['early-security']),6)
        self.assertFalse(any(op in core.PREPARE for op in core.EARLY_PREPARE))
        self.assertEqual(len(core.catalogue()['scenarios']),20)

if __name__=='__main__':unittest.main()

class EarlyLifecycleTests(unittest.TestCase):
    # Synthetic stage substitution establishes orchestration, not control detection.
    from test_lifecycle import SessionTests as Base
    setUp=Base.setUp
    tearDown=Base.tearDown
    def ready_early(self):
        self.state['profile']='early-security'
        folder=core.evidence_root(self.state['session'])/'operations/early-f02-prepare';folder.mkdir()
        core.atomic(folder/'input-seal.json',{'case':'f02','source':self.state['source'],'files':{}})
        self.state['earlyPreparation']={'f02':{'status':'READY','operationInstance':folder.name}}
    def test_repetitions_have_two_new_operations_and_immutable_history(self):
        self.ready_early()
        with patch.object(co,'resources',return_value={'sufficient':True,'freeBytes':10*1024**3}),patch.object(co,'run_process',return_value=(0,False,None)):
            early.execute(self.state,'case-early-f02',120)
            originals=core.events(self.state['session']);files={p:p.read_bytes() for p in core.evidence_root(self.state['session']).rglob('*') if p.is_file()}
            early.execute(self.state,'case-early-f02',120)
        observed=core.events(self.state['session'])
        self.assertEqual([x['attempt'] for x in observed],['early-f02-negative-1','early-f02-positive-1','early-f02-negative-2','early-f02-positive-2'])
        self.assertEqual(observed[:2],originals);self.assertEqual([x['decision'] for x in observed],['deny','allow','deny','allow'])
        # Append-only session/event indices change; closed operation files do not.
        self.assertTrue(all(p.read_bytes()==raw for p,raw in files.items() if 'operations' in p.parts))
        self.assertIsNone(self.state['active']);self.assertIsNone(self.state['liveDurationSeconds'])
    def test_cancel_does_not_launch_positive_or_invalidate_other_preparation(self):
        self.ready_early()
        with patch.object(co,'resources',return_value={'sufficient':True,'freeBytes':10*1024**3}),patch.object(co,'run_process',return_value=(130,True,'INTERRUPTED')):
            with self.assertRaises(co.Stopped):early.execute(self.state,'case-early-f02',120)
        self.assertEqual(len(core.events(self.state['session'])),1)
        self.assertEqual(self.state['earlyComparisons'][0]['operations'],['early-f02-negative-1'])
        self.assertEqual(core.events(self.state['session'])[0]['decision'],'indeterminate')
        self.assertIsNone(self.state['active']);self.assertTrue(early.capabilities(self.state)['case-early-f02']['enabled'])

    def test_tool_failure_is_not_a_block_and_positive_still_has_own_result(self):
        self.ready_early()
        with patch.object(co,'resources',return_value={'sufficient':True,'freeBytes':10*1024**3}),patch.object(co,'run_process',side_effect=[(2,False,None),(0,False,None)]):
            with self.assertRaises(co.Stopped):early.execute(self.state,'case-early-f02',120)
        negative,positive=core.events(self.state['session'])
        self.assertEqual(negative['decision'],'indeterminate')
        self.assertEqual(negative['operational'],'ERROR')
        self.assertEqual(positive['decision'],'allow')
        self.assertEqual(negative['linkedAttempt'],positive['attempt'])
        self.assertEqual(positive['linkedAttempt'],negative['attempt'])
        self.assertEqual(self.state['earlyComparisons'][0]['status'],'ERROR')
        self.assertIsNone(self.state['active'])

    def test_timeout_does_not_launch_positive(self):
        self.ready_early()
        with patch.object(co,'resources',return_value={'sufficient':True,'freeBytes':10*1024**3}),patch.object(co,'run_process',return_value=(124,True,'BUDGET_EXCEEDED')):
            with self.assertRaises(co.Stopped):early.execute(self.state,'case-early-f02',.01)
        self.assertEqual(len(core.events(self.state['session'])),1)
        self.assertEqual(self.state['earlyComparisons'][0]['operations'],['early-f02-negative-1'])
        self.assertEqual(core.events(self.state['session'])[0]['decision'],'indeterminate')
        self.assertIsNone(self.state['active'])
