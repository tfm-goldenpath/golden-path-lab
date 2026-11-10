#!/usr/bin/env python3
"""Strict Surefire result validation. Synthetic fixtures belong only in tests."""
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(directory, started_ns, exit_status):
    if exit_status != 0:
        raise ValueError('Java test process failed: ' + str(exit_status))
    root = Path(directory)
    reports = sorted(root.glob('TEST-*.xml'))
    if not reports:
        raise ValueError('Missing Surefire reports')
    total = 0
    hashes = {}
    for file in reports:
        if file.is_symlink() or not file.is_file() or file.stat().st_mtime_ns < started_ns:
            raise ValueError('Stale or nonregular Surefire report')
        data = file.read_bytes()
        if b'<!DOCTYPE' in data or b'<!ENTITY' in data:
            raise ValueError('DTD/entity declarations are unsupported')
        suite = ET.fromstring(data)
        if suite.tag != 'testsuite':
            raise ValueError('Malformed Surefire suite')
        counts = {}
        for name in ('tests', 'failures', 'errors', 'skipped'):
            value = suite.get(name, '')
            if not re.fullmatch(r'0|[1-9][0-9]*', value):
                raise ValueError('Missing or malformed test count')
            counts[name] = int(value)
        cases = suite.findall('testcase')
        if (counts['tests'] < 1 or len(cases) != counts['tests']
                or any(counts[k] for k in ('failures', 'errors', 'skipped'))
                or any(c.find(k) is not None for c in cases for k in ('failure', 'error', 'skipped'))
                or any(not c.get('name') or not c.get('classname') for c in cases)):
            raise ValueError('Java tests must all execute and pass')
        total += counts['tests']
        hashes[file.name] = digest(file)
    return {'schema': 'java-test-results/v1', 'tests': total, 'exitStatus': exit_status,
            'startedNs': started_ns, 'reports': hashes}


if __name__ == '__main__':
    if sys.argv[1] == 'check':
        root = Path(sys.argv[2])
        saved = json.loads((root/'java-tests.json').read_text())
        observed = validate(root/'java-test-reports', saved['startedNs'],
                            int((root/'java-test-exit.txt').read_text()))
        if (any(saved[k] != v for k, v in observed.items())
                or saved['logSha256'] != digest(root/'unit-tests.log')
                or saved['artifactsSha256'] != digest(root/'java-build-artifacts.json')
                or saved['toolchain'] != json.loads((Path(__file__).parent/'java-toolchain.json').read_text())):
            raise ValueError('Java test evidence changed')
    else:
        print(json.dumps(validate(sys.argv[1], int(sys.argv[2]), int(sys.argv[3])), indent=2))
