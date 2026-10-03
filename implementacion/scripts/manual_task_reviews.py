"""Separate human declarations bound to sealed task evidence; no timed operations.

Hashes detect changes relative to retained references. They do not authenticate a
reviewer or prove that a declaration of unaided work is true.
"""
from datetime import datetime, timezone
import json
import hashlib
import os
from pathlib import Path
import re
import tempfile
import tarfile

from lane_a_evidence import regular, verify_package
from manual_tasks import SCENARIOS, TERMINAL, sha256

DECISIONS = ('accepted', 'rejected')
PURPOSES = ('rehearsal', 'calibration')
ASSISTANCE = ('none', 'ai', 'human', 'ai-and-human', 'unknown')
REVIEW_NAME = re.compile(r'review-(\d{4})-([a-f0-9]{64})\.json')


def read(path):
    return json.loads(regular(path).read_text())


def reference(path, base):
    return {'path': os.path.relpath(regular(path), base), 'sha256': sha256(path)}


def check_reference(proof, base):
    """Event/receipt references must remain inside their sealed task/operation."""
    path = base / proof['path']
    if (not path.resolve().is_relative_to(base) or regular(path) != path.resolve()
            or sha256(path) != proof['sha256']):
        raise ValueError('Task evidence reference changed or escaped its directory')


def sealed_task(task, implementation):
    record = read(task / 'record.json')
    if (record.get('schema') != 'manual-task/v1' or record.get('lane') != 'A'
            or record.get('taskDirectory') != str(task) or record.get('scenario') not in SCENARIOS
            or record.get('arm') not in ('R', 'G') or type(record.get('synthetic')) is not bool
            or record.get('dataset') not in ('calibration', 'measurement')
            or task.parent.name != record['dataset'] or not task.name.startswith('task-')
            or record.get('plan') != str(task.parent.parent / 'plan.json')):
        raise ValueError('Invalid task identity for human review')
    if record.get('status') not in TERMINAL or record.get('cleanup') != 'completed' or record.get('runningOperation'):
        raise ValueError('Human review requires a closed, cleaned-up attempt')
    manifest = regular(task / 'SHA256SUMS.txt')
    files = {}
    for line in manifest.read_text().splitlines():
        digest, name = line.split('  ', 1)
        path = task / name
        if (not re.fullmatch('[a-f0-9]{64}', digest) or Path(name).is_absolute()
                or '..' in Path(name).parts or name in files or sha256(regular(path)) != digest):
            raise ValueError('Task checksum mismatch or unsafe/duplicate member: ' + name)
        files[name] = digest
    actual = set()
    for path in task.rglob('*'):
        if path.is_symlink(): raise ValueError('Symlinked task evidence')
        if path.is_file() and path.name not in ('.lock', 'SHA256SUMS.txt'):
            actual.add(path.relative_to(task).as_posix())
    if set(files) != actual or not {'record.json', 'summary.json'} <= actual:
        raise ValueError('Task checksum manifest does not cover the final records')
    for event in record['events']:
        if event.get('evidence'): check_reference(event['evidence'], task)
    if record.get('cleanupAfterReboot'):
        check_reference(record['cleanupAfterReboot']['evidence'], task)
    for pattern in ('operations/*/detection.json', 'operations/*/check-result.json'):
        for path in task.glob(pattern):
            value = read(path)
            if value.get('evidence'): check_reference(value['evidence'], path.parent)

    archives = []
    owner = task / 'operator/state-path.txt'
    if owner.exists():
        run = Path(regular(owner).read_text().strip())
        if run.parent != implementation / 'evidence/raw' or not re.fullmatch(r'run-[A-Za-z0-9]+', run.name):
            raise ValueError('Task archive owner is outside the laboratory')
        package = implementation / 'evidence/packages' / (run.name + '.tar.gz')
        try:
            verify_package(package)
        except tarfile.TarError as error:
            raise ValueError('Invalid task archive: ' + str(error)) from error
        archives = [reference(package, task), reference(Path(str(package) + '.sha256'), task)]
    elif record['status'] == 'COMPLETED':
        raise ValueError('Completed task is missing its archive owner')
    binding = {'directory': str(task), 'recordSha256': files['record.json'],
               'summarySha256': files['summary.json'], 'checksumsSha256': sha256(manifest),
               'scenario': record['scenario'], 'arm': record['arm'], 'dataset': record['dataset'],
               'identitySha256': hashlib.sha256(json.dumps(record['identity'], sort_keys=True).encode()).hexdigest(),
               'sourceCommit': record['identity']['source'].get('commit'), 'archives': archives}
    return record, binding


def eligibility_reasons(record, review):
    reasons = []
    if review['decision'] != 'accepted': reasons.append('decision:' + review['decision'])
    if review['purpose'] != 'calibration': reasons.append('purpose:' + review['purpose'])
    if review['assistance'] != 'none': reasons.append('assistance:' + review['assistance'])
    if record['synthetic']: reasons.append('synthetic')
    if record['dataset'] != 'calibration': reasons.append('dataset:' + record['dataset'])
    if record['status'] != 'COMPLETED': reasons.append('technical:' + record['status'])
    if record.get('cleanup') != 'completed': reasons.append('cleanup:not-completed')
    return reasons


def review_directory(task):
    return task.parent.parent / 'reviews' / task.name


def review_fields(value):
    if any(not isinstance(value.get(k), str) or not value[k].strip() for k in ['reviewer', 'rationale']):
        raise ValueError('Supply a nonblank human reviewer and review rationale')
    if value.get('decision') not in DECISIONS or value.get('purpose') not in PURPOSES or value.get('assistance') not in ASSISTANCE:
        raise ValueError('Explicit decision, purpose and assistance declarations are required')


def history(task, implementation):
    directory = review_directory(task)
    if directory.is_symlink() or directory.absolute() != directory.resolve():
        raise ValueError('Unsafe review directory')
    paths = sorted(directory.glob('review-*.json'))
    if not paths: return []
    record, binding = sealed_task(task, implementation)
    previous, items = None, []
    for sequence, path in enumerate(paths, 1):
        match = REVIEW_NAME.fullmatch(path.name)
        if not match or int(match[1]) != sequence or sha256(regular(path)) != match[2]:
            raise ValueError('Review hash changed or review history is ambiguous')
        value = read(path); review_fields(value)
        if (value.get('schema') != 'manual-task-review/v1' or value.get('sequence') != sequence
                or value.get('task') != binding or value.get('supersedes') != previous
                or value.get('synthetic') is not record['synthetic']):
            raise ValueError('Review task/evidence references or predecessor changed')
        reviewed_at = datetime.fromisoformat(value['reviewedAt'])
        if reviewed_at.utcoffset() is None or reviewed_at.utcoffset().total_seconds() != 0:
            raise ValueError('Review requires an automatic UTC timestamp')
        reasons = eligibility_reasons(record, value)
        if value.get('eligibility') != {'eligible': not reasons, 'reasons': reasons}:
            raise ValueError('Review eligibility does not match its declarations and task')
        previous = reference(path, directory)
        items.append((path, value))
    return items


def effective_review(task, implementation):
    items = history(task, implementation)
    if not items:
        return {'decision': 'pending', 'purpose': None, 'assistance': None,
                'eligibleForCalibration': False, 'reasons': ['review:missing'], 'path': None, 'sha256': None}
    path, value = items[-1]
    return {'decision': value['decision'], 'purpose': value['purpose'], 'assistance': value['assistance'],
            'eligibleForCalibration': value['eligibility']['eligible'], 'reasons': value['eligibility']['reasons'],
            'reviewer': value['reviewer'], 'reviewedAt': value['reviewedAt'], 'path': str(path), 'sha256': sha256(path)}


def record_review(task, implementation, *, reviewer, rationale, decision, purpose, assistance, supersedes=None):
    declarations = {'reviewer': reviewer.strip(), 'rationale': rationale.strip(),
                    'decision': decision, 'purpose': purpose, 'assistance': assistance}
    review_fields(declarations)
    record, binding = sealed_task(task, implementation)
    items = history(task, implementation)
    predecessor = items[-1][0] if items else None
    if (predecessor is None and supersedes is not None) or (predecessor is not None and supersedes != str(predecessor)):
        raise ValueError('Use --supersedes with the exact current review path for an explicit revision')
    directory = review_directory(task)
    if directory.resolve() != directory.absolute(): raise ValueError('Unsafe review directory')
    reasons = eligibility_reasons(record, declarations)
    value = {'schema': 'manual-task-review/v1', 'sequence': len(items) + 1,
             'reviewedAt': datetime.now(timezone.utc).isoformat(), **declarations,
             'declarations': 'Human-supplied identity and assistance; not independently authenticated',
             'synthetic': record['synthetic'], 'task': binding,
             'eligibility': {'eligible': not reasons, 'reasons': reasons},
             'supersedes': reference(predecessor, directory) if predecessor else None}
    if value['sequence'] > 9999: raise ValueError('Review sequence exhausted')
    directory.mkdir(parents=True, exist_ok=True)
    # Publish one complete file atomically and exclusively. Interrupted staging
    # files are never treated as reviews; existing history cannot be overwritten.
    fd, staged = tempfile.mkstemp(prefix='.review-', dir=directory)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, indent=2); stream.write('\n')
            stream.flush(); os.fsync(stream.fileno())
        path = directory / f'review-{value["sequence"]:04d}-{sha256(staged)}.json'
        os.link(staged, path)
    finally:
        os.unlink(staged)
    return path


def next_action(record, review):
    if record.get('runningOperation'): return 'recover'
    if record.get('cleanup') == 'completed':
        return 'review' if review['decision'] == 'pending' else 'retain evidence; review eligibility before selecting limits'
    if record['status'] == 'READY': return 'start'
    if record['status'] == 'REVIEW': return 'investigate/edit/check'
    if record['status'] in TERMINAL: return 'cleanup'
    return 'wait for the current operation; inspect retained diagnostics if interrupted'
