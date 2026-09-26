import importlib.util
import subprocess
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("tool_versions", Path(__file__).resolve().parents[2] / "scripts" / "check-tool-versions.py")
versions = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(versions)


class ToolVersionsTests(unittest.TestCase):
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
