#!/usr/bin/env python3
"""Read-only tracked-path ownership validation; never import inventoried code."""
import argparse
from collections import Counter
import json
from pathlib import Path, PurePosixPath
import subprocess

ROOT = Path(__file__).resolve().parents[3]
DEFAULT = Path(__file__).with_name('repository-inventory.json')
CLASSES = {'product', 'laboratory', 'shared', 'developer', 'generated', 'historical'}
ACTIONS = {'retain', 'extract', 'move', 'consolidate', 'deprecate', 'investigate'}
DETAILS = {'owner', 'audience', 'interface', 'inputs', 'outputs', 'side_effects', 'cwd', 'validation'}


def safe_path(value):
    if not isinstance(value, str) or not value or '\\' in value:
        return False
    path = PurePosixPath(value)
    return not path.is_absolute() and '..' not in path.parts and path.as_posix() == value and value != '.'


def validate(data, tracked, root):
    """Return all defects; tracked is injected for focused temporary-fixture tests."""
    errors, seen = [], set()
    if data.get('format') != 'repository-ownership-inventory/v1':
        errors.append('Unsupported inventory format')
    profiles = data.get('profiles', {})
    entries = data.get('entries', [])
    if not isinstance(profiles, dict) or not isinstance(entries, list):
        return ['Profiles must be an object and entries a list']
    for key, profile in profiles.items():
        if not isinstance(profile, dict):
            errors.append(f'Invalid profile: {key}')
            continue
        if profile.get('classification') not in CLASSES:
            errors.append(f'Invalid classification in profile: {key}')
        for field in DETAILS:
            if not isinstance(profile.get(field), str) or not profile[field].strip():
                errors.append(f'Empty {field} in profile: {key}')
    for entry in entries:
        if not isinstance(entry, dict):
            errors.append('Entry must be an object')
            continue
        path = entry.get('path')
        if not safe_path(path):
            errors.append(f'Unsafe current path: {path}')
            continue
        if path in seen:
            errors.append(f'Duplicate path: {path}')
        seen.add(path)
        if path not in tracked:
            errors.append(f'Untracked/stale path: {path}')
        if not (root / path).is_file() or (root / path).is_symlink():
            errors.append(f'Missing/nonregular current file: {path}')
        profile = profiles.get(entry.get('profile'))
        if not isinstance(profile, dict):
            errors.append(f'Unknown profile: {path}')
            profile = {}
        effective = {**profile, **entry}
        if effective.get('classification') not in CLASSES:
            errors.append(f'Invalid classification: {path}')
        if entry.get('action') not in ACTIONS:
            errors.append(f'Invalid action: {path}')
        if not safe_path(entry.get('destination')):
            errors.append(f'Unsafe proposed destination: {path}')
        for field in DETAILS | {'responsibility', 'reason'}:
            if not isinstance(effective.get(field), str) or not effective[field].strip():
                errors.append(f'Empty {field}: {path}')
        for field in ('references', 'callers', 'tests', 'caller_notes', 'unknowns'):
            values = entry.get(field)
            if not isinstance(values, list) or any(not isinstance(v, str) or not v for v in values):
                errors.append(f'Invalid {field}: {path}')
                continue
            if len(values) != len(set(values)):
                errors.append(f'Duplicate {field}: {path}')
            if field in ('references', 'callers', 'tests'):
                for ref in values:
                    if ref not in tracked:
                        errors.append(f'Invalid {field} reference from {path}: {ref}')
    errors.extend(f'Missing inventory entry: {path}' for path in sorted(tracked - seen))
    return errors


def summary(data):
    entries = data['entries']
    counts = Counter({key: 0 for key in sorted(CLASSES)})
    for entry in entries:
        counts[{**data['profiles'][entry['profile']], **entry}['classification']] += 1
    scripts = sum(Path(e['path']).suffix in {'.sh', '.py', '.js', '.mjs', '.cjs'} for e in entries)
    lines = [f"{len(entries)} tracked paths; {scripts} individually enumerated scripts/helpers/tests.", '',
             '| Current classification | Paths |', '| --- | ---: |']
    lines += [f'| {key} | {value} |' for key, value in sorted(counts.items())]
    lines += ['', f"{sum(bool(e['unknowns']) for e in entries)} entries carry explicit investigation notes; "
              'these are unresolved migration/coverage questions, not missing inventory rows.']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--summary', action='store_true', help='Print derived Markdown summary after validation')
    args = parser.parse_args()
    tracked = set(subprocess.check_output(['git', '-C', str(ROOT), 'ls-files', '-z']).decode().split('\0')) - {''}
    data = json.loads(DEFAULT.read_text())
    errors = validate(data, tracked, ROOT)
    if errors:
        for error in errors:
            print(error)
        return 1
    print(summary(data) if args.summary else f"PASS: {len(tracked)} tracked paths, exact coverage and valid ownership records")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
