"""Synthetic harness regressions; no claim of cryptography or admission."""
import base64
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import Mock
import tempfile

SPEC = importlib.util.spec_from_file_location("selection", Path(__file__).parents[1] / "integration" / "admission-selection-feasibility.py")
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


class SelectionEvidenceTests(unittest.TestCase):
    def test_cleanup_requires_absence_not_an_arbitrary_error(self):
        for text in (b'error: no such object: owned', b'Error: No such object: owned'):
            self.assertTrue(probe.absence_confirmed(subprocess.CompletedProcess([], 1, b'[]', text)))
        for code, text in ((0, b''), (1, b'permission denied'), (1, b'Cannot connect to Docker')):
            self.assertFalse(probe.absence_confirmed(subprocess.CompletedProcess([], code, b'', text)))

    def fixtures(self):
        raw = b'{ "predicate": {"synthetic": true} }\n'
        bundles = {k: {"dsseEnvelope": {"payload": base64.b64encode(raw).decode(),
                    "signatures": [{"sig": "synthetic"}]}} for k in probe.base.TYPES}
        envelopes = {k: json.dumps(v["dsseEnvelope"]).encode() for k, v in bundles.items()}
        return raw, bundles, envelopes

    def test_binding_uses_original_statement_bytes(self):
        raw, bundles, envelopes = self.fixtures()
        expected = probe.binding(bundles, envelopes)
        for k in probe.base.TYPES:
            self.assertEqual(expected[k]["statementSha256"], probe.base.sha(raw))
            self.assertNotEqual(expected[k]["statementSha256"], probe.base.sha(probe.base.encoded(json.loads(raw))))

    def test_outer_repacking_preserves_statement_but_changes_artifact(self):
        _, bundles, envelopes = self.fixtures()
        first = probe.binding(bundles, envelopes)
        envelopes["results"] = json.dumps(bundles["results"]["dsseEnvelope"], indent=2).encode()
        second = probe.binding(bundles, envelopes)
        self.assertEqual(first["results"]["statementSha256"], second["results"]["statementSha256"])
        self.assertNotEqual(first["results"]["envelopeSha256"], second["results"]["envelopeSha256"])

    def test_order_changes_do_not_change_content_binding(self):
        _, bundles, envelopes = self.fixtures()
        self.assertEqual(probe.binding(bundles, envelopes), probe.binding(
            dict(reversed(list(bundles.items()))), dict(reversed(list(envelopes.items())))))

    def test_no_omitted_type_or_mismatched_envelope(self):
        _, bundles, envelopes = self.fixtures()
        for kind in probe.base.TYPES:
            missing = copy.deepcopy(bundles)
            del missing[kind]
            with self.assertRaises(ValueError):
                probe.binding(missing, envelopes)
        envelopes["results"] = b'{}'
        with self.assertRaises(ValueError):
            probe.binding(bundles, envelopes)

    def log(self):
        data = {"authorityMatches": {"trusted": {"attestations": {
            k: [{"digest": "sha256:synthetic"}] for k in probe.base.TYPES}}}}
        return 'Checking Authority: trusted\nValidating CIP level policy\nCIP level policy: ' + json.dumps(data) + '\n'

    def test_exact_evaluation_and_each_independent_type_are_required(self):
        good = self.log() + 'Verification was successful!\n'
        self.assertEqual(probe.classify(0, '', good)[0], 'ACCEPT')
        for bad in ('', good + good, good.replace('Checking Authority:', 'Skipped:'),
                    good.replace('"results": [{"digest": "sha256:synthetic"}]', '"results": []')):
            with self.subTest(log=bad), self.assertRaises(ValueError):
                probe.classify(0, '', bad)

    def test_retrieval_or_crypto_failure_is_not_selection_rejection(self):
        for error in ('registry unavailable', 'no matching attestations', 'signature verification failed'):
            with self.subTest(error=error), self.assertRaises(ValueError):
                probe.classify(1, json.dumps({"errors": [error]}), self.log())

    def test_unfavorable_result_is_preserved_as_rejection(self):
        original = json.dumps({"errors": ["failed evaluating rego policy for type ClusterImagePolicy: policy is not compliant"]})
        decision, snapshot = probe.classify(1, original, self.log())
        self.assertEqual(decision, 'CONTENT_SELECTION_REJECT')
        self.assertEqual(set(snapshot['authorityMatches']['trusted']['attestations']), set(probe.base.TYPES))
        with self.assertRaises(ValueError):
            probe.classify(1, original.replace('"errors":', '"warnings":'), self.log())

    def test_internal_rejection_does_not_require_outer_policy(self):
        error = json.dumps({'errors': ['failed evaluating rego policy for type results: policy is not compliant']})
        log = 'Checking Authority: trusted\n'
        self.assertEqual(probe.classify_envelope(1, error, log)[:2], ('CONTENT_REJECT', 'INTERNAL'))
        self.assertEqual(probe.classify_envelope(1, error, log + log)[0], 'INTEGRATION_ERROR')
        self.assertEqual(probe.classify_envelope(0, error, log)[0], 'INTEGRATION_ERROR')
        for technical in ('rego parse error', 'connection refused', '403 Forbidden', 'signature verification failed'):
            self.assertEqual(probe.classify_envelope(1, json.dumps({'errors': [technical]}), log)[0], 'INTEGRATION_ERROR')

    def test_missing_verified_type_is_not_proof_of_registry_absence(self):
        error = json.dumps({'errors': ['no matching attestations with type expected']})
        self.assertEqual(probe.classify_envelope(1, error, 'Checking Authority: trusted\n')[0], 'MISSING_VERIFIED_TYPE')
        self.assertEqual(probe.classify_envelope(1, error, '')[0], 'INTEGRATION_ERROR')

    def test_outer_omission_or_duplicate_evaluation_cannot_be_accepted(self):
        good = self.log() + 'Verification was successful!\n'
        self.assertEqual(probe.classify_envelope(0, '', good)[0], 'ACCEPT')
        self.assertEqual(probe.classify_envelope(0, '', good + good)[0], 'INTEGRATION_ERROR')
        self.assertEqual(probe.classify_envelope(0, '', good.replace('"results"', '"unexpected"'))[0], 'INTEGRATION_ERROR')

    def test_registry_cleanup_needs_id_name_and_owner_label(self):
        receipt = {'id': 'immutable-id', 'name': 'owned-name'}
        container = {'Id': 'immutable-id', 'Name': '/owned-name', 'Config': {'Labels': {'gp.cel-probe': 'owned-name'}}}
        self.assertTrue(probe.owned_registry(container, receipt))
        for change in ({'Id': 'foreign-id'}, {'Name': '/foreign'}, {'Config': {'Labels': {}}}):
            self.assertFalse(probe.owned_registry({**container, **change}, receipt))

    def test_order_comparison_detects_changed_binding_image_and_missing_candidates(self):
        observations = [{'name': prefix + suffix, 'image': 'registry/image@sha256:fixed',
            'policySha256': prefix, 'envelopeOrder': order} for prefix in ('selected-pass', 'selected-fail')
            for suffix, order in (('-forward', ['a', 'b', 'a']), ('-reverse', ['a', 'b', 'a']))]
        probe.compare_orders(observations)
        for field, value in (('image', 'other'), ('policySha256', 'other'), ('envelopeOrder', ['a', 'b'])):
            altered = copy.deepcopy(observations)
            altered[1][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                probe.compare_orders(altered)

    def test_unfavorable_and_unstable_observations_survive_failure(self):
        for code, stdout, log, after in (
                (1, '{"errors":["connection refused"]}', '', b'{}'),
                (0, '', self.log() + 'Verification was successful!\n', b'{"changed":true}')):
            with self.subTest(code=code), tempfile.TemporaryDirectory() as directory:
                instance = probe.EnvelopeProbe.__new__(probe.EnvelopeProbe)
                instance.output, instance.host, instance.tester = Path(directory), 'registry', 'tester'
                instance.observations = []
                instance.publish_envelopes = Mock()
                instance.request = Mock(side_effect=[(b'{}', {}), (after, {})])
                instance.command = Mock(return_value=subprocess.CompletedProcess([], code, stdout.encode(), log.encode()))
                policy = instance.output / 'policy.json'
                policy.write_text('{}')
                with self.assertRaises(RuntimeError):
                    instance.evaluate_envelope('case', {'digest': 'sha256:image'}, [b'envelope'], policy, 'ACCEPT')
                saved = json.loads((instance.output / 'observations.json').read_text())
                self.assertEqual(len(saved), 1)
                self.assertFalse(saved[0]['matchesExpectation'])
                self.assertEqual(instance.command.call_count, 1)
                self.assertEqual((instance.output / 'case-inventory-after.json').read_bytes(), after)


if __name__ == '__main__':
    unittest.main()
