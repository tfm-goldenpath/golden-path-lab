"""Synthetic network recovery tests; no host firewall or human task changes."""
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('network', Path(__file__).resolve().parents[2] / 'scripts/codespaces-network.py')
network = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(network)

IDENTITY = {'networkId': 'a' * 64, 'bridge': 'br-' + 'a' * 12, 'subnet': '172.18.0.0/16',
            'namespace': 'net:[1]', 'bootId': 'synthetic-boot', 'containers': {}}

class FakeRecovery(network.Recovery):
    def __init__(self, output, probes=(2, 0, 0, 0)):
        super().__init__(output)
        self.probes = iter(probes); self.installed = set(); self.mutations = []
        self.rules = {'legacy': network.LEGACY_BASE, 'nft': network.NFT_BASE,
                      'user': network.LEGACY_USER, 'isolation1': network.LEGACY_ISOLATION1,
                      'isolation2': network.LEGACY_ISOLATION2}
        self.counter = 5

    def inspect(self): return dict(IDENTITY)
    def snapshot(self):
        self.counter += 1
        return dict(self.rules, dropped=self.counter)
    def probe(self, mode, bridge='kind'): return next(self.probes)
    def check_workloads(self):
        if self.identity['containers']: raise ValueError('Other workloads on kind')
    def rule(self, action, args):
        key = tuple(args)
        if action == '-C': return 0 if key in self.installed else 1
        self.mutations.append((action, key))
        if action == '-I': self.installed.add(key)
        elif action == '-D': self.installed.remove(key)
        else: raise AssertionError('Unexpected mutation')
        return 0

class RecoveryTests(unittest.TestCase):
    def run_case(self, recovery, command='ensure'):
        with patch.dict(os.environ, {'CODESPACES':'true'}):
            return recovery.execute(command)

    def test_outside_codespaces_does_not_inspect_or_mutate(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=FakeRecovery(Path(tmp)/'result.json')
            with patch.dict(os.environ, {'CODESPACES':'false'}), patch.object(r,'inspect',side_effect=AssertionError):
                self.assertEqual(r.execute('ensure'),0)
            self.assertEqual(r.data['status'],'SKIPPED_NOT_CODESPACES')

    def test_healthy_environment_is_unchanged(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=FakeRecovery(Path(tmp)/'result.json',probes=(0,0))
            self.assertEqual(self.run_case(r),0)
            self.assertEqual(r.mutations,[])
            self.assertEqual(r.data['status'],'HEALTHY')

    def test_healthy_environment_without_legacy_chains_is_unchanged(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=FakeRecovery(Path(tmp)/'result.json',probes=(0,0))
            def unavailable(_args,required=True,**_kwargs):
                if required: raise ValueError('Synthetic missing legacy chain')
                return 1,''
            r.command=unavailable
            r.snapshot=lambda:network.Recovery.snapshot(r)
            self.assertEqual(self.run_case(r),0)
            self.assertEqual(r.mutations,[])

    def test_remote_daemon_and_namespace_mismatch_are_rejected(self):
        for responses in [[(0,'ssh://remote')],[(0,'unix:///var/run/docker.sock'),(0,'42'),(0,'net:[other]')]]:
            with self.subTest(responses=responses), tempfile.TemporaryDirectory() as tmp:
                r=network.Recovery(Path(tmp)/'result.json')
                with patch.object(r,'command',side_effect=responses), patch.dict(os.environ,{'DOCKER_HOST':'unix:///var/run/docker.sock'}):
                    with self.assertRaises(ValueError): r.inspect()

    def test_changed_bridge_identity_prevents_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=FakeRecovery(Path(tmp)/'result.json')
            with patch.object(r,'inspect',side_effect=[dict(IDENTITY),dict(IDENTITY,bootId='changed')]):
                self.assertEqual(self.run_case(r),1)
            self.assertEqual(r.mutations,[])

    def test_recovery_is_scoped_and_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=FakeRecovery(Path(tmp)/'result.json')
            self.assertEqual(self.run_case(r),0)
            self.assertEqual([x[0] for x in r.mutations],['-I','-I'])
            for _, rule in r.mutations:
                self.assertIn(IDENTITY['bridge'],rule);self.assertIn(IDENTITY['subnet'],rule)
            r.probes=iter((0,0))
            self.assertEqual(self.run_case(r),0)
            self.assertEqual(len(r.mutations),2)

    def test_iptables_serialized_owned_rules_are_recognized(self):
        # iptables -S writes addresses before interfaces, regardless of input order.
        snapshot={'legacy':network.LEGACY_BASE,
                  'nft':network.NFT_BASE,'user':network.LEGACY_USER,
                  'isolation1':network.LEGACY_ISOLATION1,'isolation2':network.LEGACY_ISOLATION2}
        tag='tfm-codespaces-kind-' + IDENTITY['networkId']
        for rule in [f'-A FORWARD -s 172.18.0.0/16 -i {IDENTITY["bridge"]} -m comment --comment {tag} -j ACCEPT',
                     f'-A FORWARD -d 172.18.0.0/16 -o {IDENTITY["bridge"]} -m conntrack --ctstate RELATED,ESTABLISHED -m comment --comment {tag} -j ACCEPT']:
            snapshot['legacy']+='\n'+rule
        self.assertTrue(network.known_conflict(snapshot,IDENTITY))

    def test_unrelated_failure_or_policy_never_allows_forwarding(self):
        for case in ['default-dns','unexpected-policy','no-drops','other-workload','probe-error']:
            with self.subTest(case=case), tempfile.TemporaryDirectory() as tmp:
                r=FakeRecovery(Path(tmp)/'result.json')
                if case=='default-dns': r.probes=iter((2,2))
                if case=='unexpected-policy': r.rules['legacy']+='\n-A FORWARD -j DROP'
                if case=='no-drops': r.snapshot=lambda:dict(r.rules,dropped=5)
                if case=='other-workload': r.inspect=lambda:dict(IDENTITY,containers={'other':{}})
                if case=='probe-error': r.probes=iter((127,))
                self.assertEqual(self.run_case(r),1)
                self.assertEqual(r.mutations,[])

    def test_failed_postcheck_rolls_back_only_new_rules(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=FakeRecovery(Path(tmp)/'result.json',probes=(2,0,0,1))
            existing=tuple(network.scoped_rules(IDENTITY)[0]);r.installed.add(existing)
            self.assertEqual(self.run_case(r),1)
            self.assertEqual(r.installed,{existing})
            self.assertEqual([x[0] for x in r.mutations],['-I','-D'])

    def test_interruption_rolls_back_insertions(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=FakeRecovery(Path(tmp)/'result.json')
            original=r.rule
            def interrupted(action,args):
                if action=='-I' and r.installed: raise KeyboardInterrupt()
                return original(action,args)
            r.rule=interrupted
            self.assertEqual(self.run_case(r),130)
            self.assertEqual(r.installed,set())

    def test_failed_insertion_and_rollback_retain_primary_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=FakeRecovery(Path(tmp)/'result.json')
            original=r.rule
            def broken(action,args):
                if action=='-I' and r.installed: return 4
                if action=='-D': return 3
                return original(action,args)
            r.rule=broken
            self.assertEqual(self.run_case(r),1)
            self.assertEqual(r.data['primaryExitCode'],1)
            self.assertIn(3,r.data['rollbackExitCodes'])
            self.assertEqual(len(r.installed),1)

    def test_probe_cleanup_failure_is_not_connectivity_success(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=network.Recovery(Path(tmp)/'result.json');r.image='synthetic:cached'
            with patch.object(r,'command',side_effect=[(0,''),(1,'not removed'),(0,'still-present')]):
                with self.assertRaisesRegex(ValueError,'cleanup'): r.probe('dns')

    def test_explicit_removal_needs_idle_network_and_is_repeatable(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=FakeRecovery(Path(tmp)/'result.json')
            r.installed.update(map(tuple,network.scoped_rules(IDENTITY)))
            self.assertEqual(self.run_case(r,'remove'),0)
            self.assertEqual(self.run_case(r,'remove'),0)
            self.assertEqual([x[0] for x in r.mutations],['-D','-D'])

    def test_invalid_bridge_or_broad_subnet_is_rejected(self):
        for change in [{'bridge':'br+'},{'subnet':'0.0.0.0/0'},{'subnet':'10.0.0.0/8'},{'networkId':'oops'}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                network.scoped_rules(dict(IDENTITY,**change))

if __name__=='__main__': unittest.main()
