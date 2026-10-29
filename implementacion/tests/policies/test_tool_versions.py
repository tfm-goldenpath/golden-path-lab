import importlib.util
import contextlib
import io
import json
import os
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("tool_versions", Path(__file__).resolve().parents[2] / "scripts" / "check-tool-versions.py")
versions = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(versions)


class ToolVersionsTests(unittest.TestCase):
    def test_kyverno_values_keep_lane_trust_and_pin_the_test_hook(self):
        root = Path(__file__).resolve().parents[2]
        lock = json.loads((root / "tools.lock.json").read_text())
        self.assertEqual(lock["tools"]["kyverno"]["version"], lock["charts"]["kyverno"]["appVersion"])
        for lane in ("local", "github"):
            result = subprocess.run(
                ["bash", "-eu", "-c", 'source scripts/lib/lab.sh; lock=tools.lock.json; mode="$1"; lab_kyverno_values', "values", lane],
                cwd=root, capture_output=True, text=True, check=True)
            values = json.loads(result.stdout)
            self.assertEqual(values["features"]["registryClient"]["allowInsecure"], lane == "local")
            controller = values["admissionController"]
            self.assertNotIn("allowInsecureRegistry", controller["container"]["extraArgs"])
            self.assertEqual(controller["container"]["extraArgs"]["imageVerifyCacheEnabled"], "false")
            for name, image in (("admission", controller["container"]["image"]),
                                ("init", controller["initContainer"]["image"]),
                                ("readiness", values["test"]["image"])):
                expected = lock["images"]["kyverno"][name]
                self.assertEqual(image["tag"], expected["version"] + "@" + expected["digest"])
                self.assertEqual(expected["version"], "v" + lock["charts"]["kyverno"]["appVersion"])
            for name in ("backgroundController", "cleanupController", "reportsController", "reportsServer", "webhooksCleanup"):
                self.assertFalse(values[name]["enabled"])
            self.assertFalse(values["crds"]["migration"]["enabled"])

    def test_shadowed_binary_is_rejected_and_effective_path_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            binary = Path(directory) / "trivy"
            binary.write_text("#!/bin/sh\necho 'Version: 1.2.2'\n")
            binary.chmod(0o755)
            with patch.dict(os.environ, {"PATH": directory + os.pathsep + os.environ["PATH"]}):
                with self.assertRaisesRegex(ValueError, str(binary)):
                    versions.verify({"trivy": {"version": "1.2.3"}})
                binary.write_text("#!/bin/sh\necho 'Version: 1.2.3'\n")
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    versions.verify({"trivy": {"version": "1.2.3"}})
                self.assertIn(str(binary), output.getvalue())

    def test_each_locked_tool_version_is_checked(self):
        for name in versions.COMMANDS:
            def run(command, **options):
                self.assertEqual(command, [name, *versions.COMMANDS[name]])
                return subprocess.CompletedProcess(command, 0, "Version: v1.2.3\nGo: 1.99.0", "")
            versions.verify({name: {"version": "1.2.3"}}, run)

    def test_mismatch_missing_version_and_prerelease_fail(self):
        for output in ["Version: 1.2.4", "unknown", "v1.2.3-rc.1"]:
            def run(command, **options):
                return subprocess.CompletedProcess(command, 0, output, "")
            with self.assertRaises(ValueError):
                versions.verify({"trivy": {"version": "1.2.3"}}, run)
