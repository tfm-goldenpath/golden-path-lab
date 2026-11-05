#!/usr/bin/env python3
"""Read-only Conftest invocation and structured workflow decision classification."""
import json
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def command(argv, timeout=30):
    try:
        value = subprocess.run(argv, capture_output=True, text=True, timeout=timeout)
        return {'command': list(map(str, argv)), 'exitStatus': value.returncode,
                'stdout': value.stdout, 'stderr': value.stderr, 'processError': None}
    except subprocess.TimeoutExpired as error:
        def text(value):
            return value.decode(errors='replace') if isinstance(value, bytes) else value or ''
        return {'command': list(map(str, argv)), 'exitStatus': None,
                'stdout': text(error.stdout), 'stderr': text(error.stderr), 'processError': 'TIMEOUT'}
    except OSError as error:
        return {'command': list(map(str, argv)), 'exitStatus': None, 'stdout': '',
                'stderr': str(error), 'processError': 'MISSING_TOOL' if isinstance(error, FileNotFoundError) else 'COMMAND_FAILURE'}


def prerequisite():
    executable = shutil.which('conftest')
    value = command([executable or 'conftest', '--version'])
    expected = json.loads((ROOT / 'tools.lock.json').read_text())['tools']['conftest']['version']
    value['expectedVersion'] = expected
    match = re.search(r'^Conftest: ([^\s]+)$', value['stdout'], re.M)
    value['error'] = value['processError'] or (
        'COMMAND_FAILURE' if value['exitStatus'] != 0 else
        'VERSION_MISMATCH' if not match or match[1] != expected else None)
    value['executable'] = executable
    return value


def classify(code, stdout, stderr, filename):
    def result(kind, diagnostics=None):
        return {'classification': kind, 'diagnostics': diagnostics or []}
    # These are tool errors, never policy detections. Preserve raw diagnostics.
    if code not in (0, 1):
        return result('COMMAND_FAILURE')
    if stderr:
        if re.search(r'rego_\w+_error', stderr):
            return result('POLICY_ERROR')
        if 'parse configurations' in stderr:
            return result('MALFORMED_INPUT')
        return result('COMMAND_FAILURE')
    try:
        data = json.loads(stdout)
        if not isinstance(data, list) or len(data) != 1:
            raise ValueError()
        row = data[0]
        if not isinstance(row, dict) or row.get('filename') != str(filename) or row.get('namespace') != 'workflow':
            raise ValueError()
        successes = row.get('successes')
        if type(successes) is not int or successes < 0:
            raise ValueError()
        if row.get('warnings') or row.get('exceptions') or row.get('errors'):
            raise ValueError()
        failures = row.get('failures', [])
        if not isinstance(failures, list):
            raise ValueError()
        messages = [failure['msg'] for failure in failures]
        if any(not isinstance(m, str) or not m for m in messages) or len(set(messages)) != len(messages):
            raise ValueError()
        if not successes and not failures:
            raise ValueError()
        if messages and code == 0:
            raise ValueError()
        if not messages and code == 1:
            return result('COMMAND_FAILURE')
        return result('DENY' if messages else 'ACCEPT', sorted(messages))
    except (ValueError, KeyError, TypeError):
        return result('INVALID_OUTPUT')


def evaluate(path, policy, executable='conftest', timeout=30):
    path, policy = Path(path).resolve(), Path(policy).resolve()
    response = command([executable, 'test', str(path), '--parser', 'yaml', '--policy', str(policy),
                        '--namespace', 'workflow', '--output', 'json'], timeout)
    decision = ({'classification': response['processError'], 'diagnostics': []}
                if response['processError'] else
                classify(response['exitStatus'], response['stdout'], response['stderr'], path))
    return {**response, **decision}
