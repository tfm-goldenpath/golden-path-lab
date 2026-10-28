#!/usr/bin/env python3
"""Verify installed security-tool versions against the committed lock."""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

COMMANDS = {
    "trivy": ["--version"], "conftest": ["--version"], "cosign": ["version"],
    "helm": ["version", "--short"], "act": ["--version"], "kyverno": ["version"],
}


def verify(tools, run=subprocess.run):
    for name, entry in tools.items():
        executable = shutil.which(name) or name
        result = run([name, *COMMANDS[name]], capture_output=True, text=True, check=True)
        output = result.stdout + result.stderr
        match = re.search(r"(?<![\d.])v?(\d+\.\d+\.\d+(?:-[\w.-]+)?)(?![\d.])", output)
        actual = match.group(1) if match else "unknown"
        if actual != entry["version"]:
            raise ValueError(f"{name}: expected {entry['version']}, found {actual} ({executable})")
        print(f"PASS {name} {actual} ({executable})")


if __name__ == "__main__":
    lock = Path(__file__).resolve().parents[1] / "tools.lock.json"
    try:
        tools = json.loads(lock.read_text(encoding="utf-8"))["tools"]
        if sys.argv[1:] == ["--delivery"]:
            tools = {name: tools[name] for name in ("trivy", "conftest", "cosign", "helm")}
        elif sys.argv[1:]:
            raise ValueError("Usage: check-tool-versions.py [--delivery]")
        verify(tools)
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
