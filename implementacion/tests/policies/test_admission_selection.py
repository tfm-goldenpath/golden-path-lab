"""Synthetic harness regressions; no claim of cryptography or admission."""
import base64
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest

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


if __name__ == '__main__':
    unittest.main()
