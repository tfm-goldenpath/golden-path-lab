"""Combined profile sequencing; substituted stages are not Kubernetes evidence."""
import unittest
from unittest.mock import patch
import test_core
import core
import coordinator as co
import early
import server
import test_lifecycle

class CombinedTests(unittest.TestCase):
    setUp=test_lifecycle.SessionTests.setUp
    tearDown=test_lifecycle.SessionTests.tearDown

    def combined(self):
        self.state['profile']='defense-all'
        core.atomic(core.evidence_root(self.state['session'])/'catalogue.json',core.profile_catalogue('defense-all'))
        return self.state

    def test_order_preserves_f13_absence_and_all_original_profiles(self):
        self.assertEqual(core.LIVE['defense'],['f11-early','f13','authorize','accept','f11-admission'])
        seq=core.LIVE['defense-all']
        self.assertEqual(seq[:5],core.LIVE['defense'])
        self.assertLess(seq.index('f13'),seq.index('authorize'))
        self.assertLess(seq.index('accept'),seq.index('comparison-inputs'))
        self.assertEqual(seq[-3:],['comparison-reference','comparison-admission','comparison-legitimate'])
        self.assertNotIn('authorize',core.preparation_operations('defense-all'))
        self.assertTrue(set(core.LIVE['early-security']).issubset(core.display_operations('defense-all')))

    def test_real_coordinator_records_separate_recovery_and_comparison(self):
        self.combined();self.state.update(prepared=True,operational='PREPARED')
        with patch.object(co,'resources',return_value={'sufficient':True,'freeBytes':10*1024**3}),patch.object(co,'run_process',return_value=(0,False,None)):
            co.present(self.state,180)
        es=core.events(self.state['session'])
        self.assertEqual([e['operation'] for e in es],['resume']+core.LIVE['defense-all'])
        self.assertEqual(self.state['f13Recovery'],'confirmed')
        self.assertEqual(next(e for e in es if e['operation']=='accept')['linkedAttempt'],'attempt-2')
        self.assertEqual(next(e for e in es if e['operation']=='comparison-inputs')['attempt'],'comparison-setup')
        self.assertEqual(next(e for e in es if e['operation']=='comparison-legitimate')['scenario'],'L06')

    def test_static_work_before_lab_does_not_consume_preparation(self):
        self.combined()
        self.state['operational']='ERROR'
        caps=server.action_capabilities(self.state,True,False)
        self.assertTrue(caps['prepare']['enabled'])
        self.assertTrue(caps['prepare-early-f02']['enabled'])
        self.assertFalse(caps['prepare-early-f03']['enabled'])
        self.state['completed']=['environment']
        self.assertFalse(server.action_capabilities(self.state,True,False)['prepare']['enabled'])

    def test_failed_early_comparison_does_not_replace_lab_outcome(self):
        self.combined();self.state.update(prepared=True,operational='COMPLETED',demoResult='CONFIRMED',workExitCode=0,digest='sha256:baseline')
        folder=core.evidence_root(self.state['session'])/'operations/early-f02-prepare';folder.mkdir()
        core.atomic(folder/'input-seal.json',{'case':'f02','source':self.state['source'],'files':{}})
        self.state['earlyPreparation']={'f02':{'status':'READY','operationInstance':folder.name}}
        with patch.object(co,'resources',return_value={'sufficient':True,'freeBytes':10*1024**3}),patch.object(co,'run_process',side_effect=[(2,False,'tool failure'),(0,False,None)]):
            with self.assertRaises(co.Stopped):early.execute(self.state,'case-early-f02',120)
        self.assertEqual(self.state['operational'],'COMPLETED')
        self.assertTrue(self.state['prepared'])
        self.assertEqual(self.state['earlyComparisons'][-1]['status'],'ERROR')
        self.assertEqual(core.events(self.state['session'])[0]['decision'],'indeterminate')
        self.assertEqual(self.state['workExitCode'],0)
        self.assertEqual(self.state['digest'],'sha256:baseline')
        self.assertTrue(all(e['digest'] is None for e in core.events(self.state['session'])))

    def test_f13_error_never_authorizes_or_runs_comparison(self):
        self.combined();self.state.update(prepared=True,operational='PREPARED')
        with patch.object(co,'resources',return_value={'sufficient':True,'freeBytes':10*1024**3}),patch.object(co,'run_process',side_effect=[(0,False,None),(0,False,None),(1,False,'registry failure')]):
            with self.assertRaises(co.Stopped):co.present(self.state,180)
        es=core.events(self.state['session'])
        self.assertTrue(all(e['operational']=='NOT_REACHED' for e in es if e['operation'] in ('authorize','comparison-reference','comparison-legitimate')))
        self.assertFalse(self.state['prepared'])

    def test_f03_requires_shared_preparation_and_never_enables_after_cleanup(self):
        self.combined()
        self.assertFalse(early.capabilities(self.state)['prepare-early-f03']['enabled'])
        self.state.update(prepared=True,operational='PREPARED')
        self.assertTrue(early.capabilities(self.state)['prepare-early-f03']['enabled'])
        self.assertFalse(early.capabilities(self.state,source_error='Source mismatch')['prepare-early-f03']['enabled'])
        self.state['cleaned']=True
        self.assertFalse(early.capabilities(self.state)['prepare-early-f03']['enabled'])

    def test_combined_seal_keeps_original_contract_when_live_comparison_files_appear(self):
        import ownership
        lab=self.root/'lab';private=self.root/'private';lab.mkdir();private.mkdir()
        state={'cluster':'cluster','registry':'registry','builder':'builder','digest':'sha256:fixture','private':str(private)}
        for name in ('cosign.key','cosign.pub','kubeconfig'):(private/name).write_text('synthetic, not a credential')
        for name in ('state.json','development-public-key.pem','local-signing-config.json','local-trusted-root.json','tfm-golden.json','tfm-reference.json','sbom.cdx.json','vulnerabilities.json','analysis.json','analysis-association.json','database-identity.json','manifest-policy.json','workflow-policy.json','unit-tests.log','build-inputs.json','build-metadata.json','image.bundle.json','sbom.bundle.json','provenance.bundle.json','admission-policies.json'):(lab/name).write_text('synthetic protected input')
        core.atomic(lab/'prepared-cluster.json',{'metadata':{'uid':'synthetic-cluster'}})
        registry={'Id':'r','Config':{'Labels':{'tfm.lab':'cluster'}},'State':{'Running':True}}
        node={'Id':'k','Config':{'Labels':{'io.x-k8s.kind.cluster':'cluster'}},'State':{'Running':True}}
        def observed():
            with patch.object(ownership,'inspect',side_effect=[registry,node,None]):return ownership.identity(state,lab,True,'defense-all')
        before=observed();(lab/'comparison').mkdir();(lab/'comparison/diff.json').write_text('later live result')
        self.assertEqual(before,observed())
        (lab/'tfm-golden.json').write_text('changed protected input')
        self.assertNotEqual(before,observed())

    def test_cli_does_not_prepare_a_cleaned_static_only_session(self):
        import sys
        self.combined();self.state['cleaned']=True
        core.atomic(core.session_path(self.state['session'])/'session.json',self.state)
        with patch.object(sys,'argv',['coordinator.py','prepare-pending','--session',self.state['session']]),patch.object(co,'prepare') as prepare:
            with self.assertRaisesRegex(co.Stopped,'already attempted'):co.main()
            prepare.assert_not_called()
