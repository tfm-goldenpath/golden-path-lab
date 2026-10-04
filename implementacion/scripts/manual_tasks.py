"""Manual task event model. No human durations or acceptance are inferred."""
import copy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import random
import re
import tempfile
import time

SCENARIOS = ('F03', 'F10', 'F11')
TERMINAL = {'COMPLETED', 'EXHAUSTED', 'INCOMPLETE'}
SCRIPTED = {'executionMode': 'scripted', 'dataset': 'automated-validation', 'actor': 'automation',
            'humanAcceptance': 'pending', 'eligibleForHumanCalibration': False}


def scripted(record):
    return isinstance(record, dict) and record.get('executionMode') == 'scripted'


def require_human(record):
    if (record.get('executionMode', 'manual') != 'manual' or record.get('actor') == 'automation'
            or record.get('eligibleForHumanCalibration') is False or record.get('dataset') == 'automated-validation'):
        raise ValueError('Scripted execution is ineligible for human calibration or measurement')


def clock():
    return {'utc': datetime.now(timezone.utc).isoformat(), 'monotonicNs': time.monotonic_ns(),
            'bootId': Path('/proc/sys/kernel/random/boot_id').read_text().strip()}


def sha256(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_json(path, value):
    path = Path(path)
    if path.is_symlink():
        raise ValueError('Refusing symlinked record')
    fd, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, indent=2); stream.write('\n')
            stream.flush(); os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)


def retain_file(source, destination):
    source, destination = Path(source), Path(destination)
    if source.is_symlink() or not source.is_file() or destination.is_symlink():
        raise ValueError('Evidence must be a regular file, without symlinks')
    with destination.open('xb') as stream:
        stream.write(source.read_bytes())
    return {'path': str(destination), 'sha256': sha256(destination)}


def make_sequence(seed):
    if not isinstance(seed, str) or not seed.strip():
        raise ValueError('A retained seed is required')
    rng = random.Random(seed)
    repeated = rng.choice(['RG', 'GR'])
    scenarios = list(SCENARIOS); rng.shuffle(scenarios)
    pairs = [{'scenario': s, 'order': repeated if i < 2 else repeated[::-1]} for i, s in enumerate(scenarios)]
    sequence = [{'position': i * 2 + j + 1, 'scenario': p['scenario'], 'arm': arm}
                for i, p in enumerate(pairs) for j, arm in enumerate(p['order'])]
    return {'seed': seed, 'algorithm': 'python-random-v1-choice-then-shuffle',
            'repeatedOrder': repeated, 'pairs': pairs, 'sequence': sequence}


def new_record(scenario, arm, dataset, identity, limit=None, synthetic=False):
    if scenario not in SCENARIOS or arm not in ('R', 'G') or dataset not in ('calibration', 'measurement', 'automated-validation'):
        raise ValueError('Unknown manual task')
    if limit is not None and (type(limit) not in (int, float) or not 0 < limit < float('inf')):
        raise ValueError('Invalid total-duration limit')
    if dataset == 'measurement' and limit is None:
        raise ValueError('Human-calibrated limits must be frozen before measurement')
    if dataset == 'automated-validation' and limit is not None:
        raise ValueError('Scripted safety timeouts are not human-task limits')
    return {'schema': 'manual-task/v1', 'lane': 'A', 'scenario': scenario, 'arm': arm,
            'dataset': dataset, 'synthetic': synthetic, 'identity': copy.deepcopy(identity),
            'limitSeconds': limit, 'status': 'PREPARING', 'events': [],
            'humanAcceptance': 'pending', 'detection': None, 'humanReviewStart': None,
            **(SCRIPTED if dataset == 'automated-validation' else {})}


def elapsed(a, b):
    if a['bootId'] != b['bootId'] or b['monotonicNs'] < a['monotonicNs']:
        raise ValueError('Clock discontinuity; retain the attempt as incomplete')
    return (b['monotonicNs'] - a['monotonicNs']) / 1e9


def proof(value):
    if not isinstance(value, dict) or not value.get('path') or not re.fullmatch('[a-f0-9]{64}', value.get('sha256', '')):
        raise ValueError('A retained evidence path and SHA256 are required')


def record_event(record, kind, mark, **fields):
    """Validate on a copy: a rejected event cannot partially change the record."""
    if {'at', 'kind', 'sequence', 'activity'} & fields.keys():
        raise ValueError('Event identity and time are assigned by the recorder')
    r = copy.deepcopy(record)
    if r['events']: elapsed(r['events'][-1]['at'], mark)
    status = r['status']
    activity = r['events'][-1].get('activity', 'unobserved') if r['events'] else 'unobserved'
    late = r.get('started') is not None and r['limitSeconds'] is not None and elapsed(r['started'], mark) > r['limitSeconds']
    if kind == 'cleanup':
        if fields.get('outcome') not in ('completed', 'error'): raise ValueError('Cleanup outcome required')
        if status not in TERMINAL:
            r['status'] = 'INCOMPLETE'; r['ended'] = mark
        r['cleanup'] = fields['outcome']; activity = 'unobserved'
    elif status in TERMINAL:
        raise ValueError('Attempt is closed; retain it and prepare a new independent attempt')
    elif kind == 'prepared':
        if status != 'PREPARING': raise ValueError('Preparation already recorded')
        r['status'] = 'READY'
    elif kind == 'start':
        if status != 'READY': raise ValueError('Start requires independently prepared inputs')
        r['started'] = mark; r['status'] = 'AUTOMATIC'; activity = 'automatic'
    elif kind == 'detected':
        if status not in ('AUTOMATIC', 'REVIEW', 'VERIFYING') or r['detection']:
            raise ValueError('Detection is first-only and requires a started task')
        proof(fields.get('evidence'))
        mechanism = fields.get('mechanism', '')
        if not re.fullmatch('(automatic|manual|scripted):(scan|provenance|manifest)', mechanism):
            raise ValueError('Detection requires an attributable control mechanism')
        if scripted(r) and mechanism.startswith('manual:') or not scripted(r) and mechanism.startswith('scripted:'):
            raise ValueError('Detection actor differs from execution mode')
        if mechanism.startswith('automatic:') != (status == 'AUTOMATIC'):
            raise ValueError('Detection mechanism does not match the current path')
        if not late: r['detection'] = {'at': mark, **fields}
    elif kind == 'automatic-finished':
        if status != 'AUTOMATIC' or fields.get('outcome') not in ('completed', 'blocked', 'error'):
            raise ValueError('Invalid automated path transition')
        if fields['outcome'] == 'blocked' and not r['detection'] and not late:
            raise ValueError('A blocked path needs attributable detection')
        r['scriptedContinuationStart' if scripted(r) else 'humanReviewStart'] = mark
        r['status'] = 'REVIEW' if fields['outcome'] != 'error' else 'INCOMPLETE'
        activity = 'unobserved'
        if r['status'] == 'INCOMPLETE': r['ended'] = mark
    elif kind in ('investigate', 'correct', 'wait', 'pause'):
        if scripted(r): raise ValueError('Scripted tasks cannot record human activity')
        if status != 'REVIEW': raise ValueError('Human activity starts after the automated path')
        activity = {'investigate': 'diagnosis', 'correct': 'correction', 'wait': 'waiting', 'pause': 'unobserved'}[kind]
        if kind == 'investigate' and not r.get('investigationStart'): r['investigationStart'] = mark
    elif kind == 'scripted-repair':
        if not scripted(r) or status != 'REVIEW' or not r['detection']:
            raise ValueError('Scripted repair requires detected task at a verified boundary')
        proof(fields.get('evidence'))
        activity = 'automatic'
    elif kind == 'verification-started':
        if status != 'REVIEW': raise ValueError('Verification requires human review')
        r['status'] = 'VERIFYING'; activity = 'waiting'
    elif kind == 'verification-finished':
        if status != 'VERIFYING' or fields.get('outcome') not in ('completed', 'unresolved', 'error'):
            raise ValueError('Invalid verification transition')
        if fields['outcome'] == 'completed':
            proof(fields.get('evidence'))
            if not r['detection']: raise ValueError('Validated completion requires recorded detection')
            r['status'] = 'COMPLETED'; r['ended'] = mark
        elif fields['outcome'] == 'error':
            r['status'] = 'INCOMPLETE'; r['ended'] = mark
        else: r['status'] = 'REVIEW'
        activity = 'unobserved'
    elif kind == 'interrupt':
        if status in ('AUTOMATIC', 'VERIFYING', 'PREPARING'):
            r['status'] = 'INCOMPLETE'; r['ended'] = mark
        elif status != 'REVIEW': raise ValueError('No session to interrupt')
        activity = 'unobserved'
    elif kind == 'abandon':
        r['status'] = 'INCOMPLETE'; r['ended'] = mark; activity = 'unobserved'
    elif kind == 'expire':
        if not r.get('started') or r['limitSeconds'] is None or elapsed(r['started'], mark) < r['limitSeconds']:
            raise ValueError('The fixed total-duration window is not exhausted')
        r['status'] = 'EXHAUSTED'; r['ended'] = mark; activity = 'unobserved'
    elif kind == 'tool-started':
        if status != 'REVIEW': raise ValueError('Manual tools require human review')
        activity = 'waiting'
    elif kind == 'tool-finished':
        if status != 'REVIEW': raise ValueError('Manual tools require human review')
        activity = 'unobserved'
    else:
        raise ValueError('Unknown event')
    if late and kind != 'cleanup':
        r['status'] = 'EXHAUSTED'; r['ended'] = mark
    r['events'].append({'sequence': len(r['events']) + 1, 'kind': kind, 'at': mark,
                        'activity': activity, **fields})
    record.clear(); record.update(r)


def summarize(r, now):
    value = _summarize(r, now)
    if scripted(r):
        # Existing manual timing definitions are unchanged. These tasks never
        # supply measured human diagnosis/correction observations, even zeroes.
        value.pop('activeDiagnosisSeconds', None)
        value.pop('activeCorrectionSeconds', None)
    return value


def _summarize(r, now):
    result = {'schema': 'manual-task-summary/v1', 'synthetic': r['synthetic'],
              'outcome': 'incomplete' if r['status'] == 'INCOMPLETE' else 'not-started',
              'totalSeconds': None, 'detectionLatencySeconds': None, 'resolutionSeconds': None,
              'detectionLowerBoundSeconds': None, 'resolutionLowerBoundSeconds': None,
              'activeDiagnosisSeconds': 0, 'activeCorrectionSeconds': 0,
              'waitingSeconds': 0, 'automaticSeconds': 0, 'unobservedSeconds': 0,
              'verificationSeconds': 0, 'humanAcceptance': r['humanAcceptance']}
    if scripted(r): result.update(SCRIPTED, timingScope='scripted process with predefined repair; no human effort')
    if not r.get('started'): return result
    start = r['started']; end = r.get('ended') or now
    duration = elapsed(start, end)
    exhausted = r['limitSeconds'] is not None and duration >= r['limitSeconds'] and r['status'] != 'COMPLETED'
    if r['limitSeconds'] is not None: duration = min(duration, r['limitSeconds'])
    result['totalSeconds'] = duration
    detection = r.get('detection')
    if detection:
        result['detectionLatencySeconds'] = elapsed(start, detection['at'])
    if r['status'] == 'COMPLETED':
        result['outcome'] = 'completed'
        result['resolutionSeconds'] = elapsed(detection['at'], end)
    elif exhausted:
        result['outcome'] = 'detected-unresolved-within-window' if detection else 'not-detected-within-window'
        if detection: result['resolutionLowerBoundSeconds'] = duration - result['detectionLatencySeconds']
        else: result['detectionLowerBoundSeconds'] = duration
    else: result['outcome'] = 'incomplete' if r['status'] == 'INCOMPLETE' else 'in-progress'
    mapping = {'diagnosis': 'activeDiagnosisSeconds', 'correction': 'activeCorrectionSeconds',
               'waiting': 'waitingSeconds', 'automatic': 'automaticSeconds', 'unobserved': 'unobservedSeconds'}
    events = [e for e in r['events'] if e['at']['monotonicNs'] >= start['monotonicNs']]
    verification = False
    for i, event in enumerate(events):
        if event['kind'] == 'verification-started': verification = True
        if event['kind'] == 'verification-finished': verification = False
        a = min(duration, elapsed(start, event['at']))
        b = min(duration, elapsed(start, events[i + 1]['at']) if i + 1 < len(events) else duration)
        interval = max(0, b - a)
        result[mapping[event['activity']]] += interval
        if verification: result['verificationSeconds'] += interval
    if r.get('interruption'):
        result['outcome'] = 'incomplete'
        result['observedThroughSeconds'] = result['totalSeconds']
        result['totalSeconds'] = None
        result['timingGap'] = 'unknown after last retained event'
    return result
