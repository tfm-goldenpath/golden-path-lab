"""Synthetic parser regressions; these do not establish registry/admission behavior."""

import importlib.util
import json
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location(
    "cel_capabilities", Path(__file__).parents[1] / "integration" / "kyverno-cel-capabilities.py")
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


class CapabilityEvidenceTests(unittest.TestCase):
    def test_actual_evaluation_is_required(self):
        for counts in ("pass: 1, fail: 0, warn: 0, error: 0, skip: 0",
                       "pass: 0, fail: 1, warn: 0, error: 0, skip: 0"):
            self.assertEqual(sum(probe.evaluation_counts(counts)[:2]), 1)
        for output in ("denied", "", "pass: 0, fail: 0, warn: 0, error: 0, skip: 1",
                       "pass: 1, fail: 0, warn: 0, error: 1, skip: 0",
                       "pass: 1, fail: 0, warn: 1, error: 0, skip: 0",
                       "pass: 1, fail: 0, warn: 0, error: 0, skip: 1",
                       "pass: 2, fail: 0, warn: 0, error: 0, skip: 0"):
            with self.subTest(output=output), self.assertRaises(ValueError):
                probe.evaluation_counts(output)
        with self.assertRaises(ValueError):
            probe.evaluation_counts("\n".join([counts, counts]))

    def test_legacy_duplicate_diagnostic_normalization_is_isolated(self):
        output = ("1 - require-results image attestations verification failed\n"
                  "1 - require-results unverified image\n"
                  "pass: 0, fail: 2, warn: 0, error: 0, skip: 0")
        self.assertEqual(probe.evaluation_counts(output, legacy=True), (0, 2, 0, 0))
        with self.assertRaises(ValueError):
            probe.evaluation_counts(output)
        for changed in (output.replace("require-results", "another-control", 1),
                        output.replace("unverified image", "transport error"),
                        output.replace("error: 0", "error: 1"),
                        output.replace("skip: 0", "skip: 1")):
            with self.subTest(output=changed), self.assertRaises(ValueError):
                probe.evaluation_counts(changed, legacy=True)

    def test_integration_error_is_never_a_successful_control_evaluation(self):
        output = "pass: 0, fail: 0, warn: 0, error: 1, skip: 0"
        with self.assertRaises(ValueError):
            probe.evaluation_counts(output)
        self.assertEqual(probe.evaluation_counts(output, integration_error=True), (0, 0, 0, 1))
        for changed in (output.replace("error: 1", "error: 0"),
                        output.replace("pass: 0", "pass: 1"),
                        output.replace("skip: 0", "skip: 1")):
            with self.subTest(output=changed), self.assertRaises(ValueError):
                probe.evaluation_counts(changed, integration_error=True)

    def test_fallback_requires_actual_engine_retrieval(self):
        event = {"method": "GET", "path": "/v2/classic/manifests/sha256-" + "a" * 64 + ".att",
                 "statusCode": 200, "headers": {"User-Agent": ["Kyverno/v1.19.2"]}}
        self.assertEqual(probe.fallback_requests(json.dumps(event)), [event])
        for change in ({"method": "PUT"}, {"statusCode": 404}, {"statusCode": 500},
                       {"path": "/v2/classic/blobs/sha256:" + "a" * 64},
                       {"path": "/v2/another/manifests/sha256-" + "a" * 64 + ".att"},
                       {"headers": {"User-Agent": ["cosign/3.1.4"]}}):
            with self.subTest(change=change):
                self.assertEqual(probe.fallback_requests(json.dumps({**event, **change})), [])
        self.assertEqual(probe.fallback_requests("denied\nnull\n[]\n{}"), [])


if __name__ == "__main__":
    unittest.main()
