#!/usr/bin/env python3
"""Verify installed security-tool versions against the committed lock."""
import json
import re
import subprocess
import sys
from pathlib import Path

COMMANDS = {
    "trivy": ["--version"], "conftest": ["--version"], "cosign": ["version"],
    "helm": ["version", "--short"], "act": ["--version"], "kyverno": ["version"],
}


def verify(tools, run=subprocess.run):
    for name, entry in tools.items():
        result = run([name, *COMMANDS[name]], capture_output=True, text=True, check=True)
        output = result.stdout + result.stderr
        match = re.search(r"(?<![\d.])v?(\d+\.\d+\.\d+(?:-[\w.-]+)?)(?![\d.])", output)
        actual = match.group(1) if match else "unknown"
        if actual != entry["version"]:
            raise ValueError(f"{name}: expected {entry['version']}, found {actual}")
        print(f"PASS {name} {actual}")


if __name__ == "__main__":
    lock = Path(__file__).resolve().parents[1] / "tools.lock.json"
    try:
        verify(json.loads(lock.read_text(encoding="utf-8"))["tools"])
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
