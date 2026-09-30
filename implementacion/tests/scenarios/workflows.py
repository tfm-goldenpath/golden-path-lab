#!/usr/bin/env python3
"""Prepare inert F01/F02 inputs and compare real decisions with fixed oracles."""
import argparse
import difflib
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
POLICY = ROOT / 'policies/conftest/workflow.rego'
SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1'
F01 = 'PULL_REQUEST_TARGET: this event is excluded from the laboratory'
F02 = 'ACTION_SHA: actions/checkout@v7.0.1 must be pinned to a full 40-character SHA'
spec = importlib.util.spec_from_file_location('workflow_evaluation', ROOT / 'scripts/workflow-evaluation.py')
E = importlib.util.module_from_spec(spec)
spec.loader.exec_module(E)


def original_text():
    return (Path(__file__).parent / 'fixtures/workflows/original.yaml').read_text()


def variants(original):
    if original.count('  workflow_dispatch:') != 1 or original.count(SHA) != 1:
        raise ValueError('Original fixture no longer matches the reviewed alteration')
    return {
        'F01': original.replace('  workflow_dispatch:', '  pull_request_target:').replace(
            'actions/checkout@' + SHA, 'actions/checkout@' + SHA + '\n        with:\n          ref: ${{ github.event.pull_request.head.sha }}'),
        'F02': original.replace(SHA, 'v7.0.1'),
    }


def matches(decision, expected):
    return (decision['classification'] == ('DENY' if expected else 'ACCEPT')
            and decision['diagnostics'] == sorted(expected))


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def run(output):
    output = Path(output).resolve()
    if any(a == '.github' and b == 'workflows' for a, b in zip(output.parts, output.parts[1:])):
        raise ValueError('Workflow fixtures must remain outside .github/workflows')
    output.mkdir(parents=True, exist_ok=False)
    result = {'kind': 'workflow-static', 'scope': 'F01/F02 static workflow evaluation; L01 workflow acceptance only; not campaign measurements',
              'status': 'FAIL', 'cases': []}
    try:
        revision = subprocess.run(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
        result['sourceRevision'] = revision
        result['implementationHashes'] = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path(__file__).resolve(), ROOT / 'scripts/workflow-evaluation.py', ROOT / 'tools.lock.json']}
        result['workingTree'] = subprocess.run(['git', '-C', str(ROOT), 'status', '--porcelain'], capture_output=True, text=True, check=True).stdout
        original = original_text()
        inputs = {'L01': original, **variants(original)}
        (output / 'workflow.rego.txt').write_bytes(POLICY.read_bytes())
        for case, content in inputs.items():
            (output / (case + '.yaml')).write_text(content)
            (output / (case + '-diff.txt')).write_text(''.join(difflib.unified_diff(
                original.splitlines(keepends=True), content.splitlines(keepends=True), fromfile='L01.yaml', tofile=case + '.yaml')))
        tools = E.prerequisite()
        write_json(output / 'tool.json', tools)
        if tools['error']:
            result['error'] = tools['error']
            return result
        result['toolSha256'] = hashlib.sha256(Path(tools['executable']).read_bytes()).hexdigest()
        # Evaluate the actual production policy, checking it stayed equal to the retained copy.
        for case, expected in [('L01', []), ('F01', [F01]), ('F02', [F02])]:
            decision = E.evaluate(output / (case + '.yaml'), POLICY, tools['executable'])
            decision.update(case=case, expectedDiagnostics=expected, matched=matches(decision, expected))
            (output / (case + '-stdout.log')).write_text(decision['stdout'])
            (output / (case + '-stderr.log')).write_text(decision['stderr'])
            write_json(output / (case + '-evaluation.json'), decision)
            result['cases'].append(decision)
            result[case] = {'status': ('WORKFLOW_ACCEPTED' if case == 'L01' else 'STATIC_REJECTION_CONFIRMED') if decision['matched'] else 'FAIL'}
            if not decision['matched']:
                result['error'] = 'UNEXPECTED_ACCEPTANCE' if decision['classification'] == 'ACCEPT' else 'UNEXPECTED_DENIAL' if decision['classification'] == 'DENY' else decision['classification']
                return result
        if POLICY.read_bytes() != (output / 'workflow.rego.txt').read_bytes():
            result['error'] = 'POLICY_CHANGED'
            return result
        result['status'] = 'PASS'
        return result
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        result['error'] = 'PREPARATION_FAILURE'
        result['detail'] = str(error)
        return result
    finally:
        write_json(output / 'result.json', result)
        files = sorted(p for p in output.iterdir() if p.is_file())
        write_json(output / 'hashes.json', {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in files})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.output:
        output = args.output
    else:
        parent = ROOT / 'evidence/raw'
        parent.mkdir(parents=True, exist_ok=True)
        output = Path(tempfile.mkdtemp(prefix='workflows-', dir=parent)) / 'trial'
    try:
        result = run(output)
    except (OSError, ValueError) as error:
        parser.exit(1, str(error) + '\n')
    print(f"{result['status']}: {output}")
    return 0 if result['status'] == 'PASS' else 1

if __name__ == '__main__':
    raise SystemExit(main())
