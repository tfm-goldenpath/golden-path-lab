"""Optional direct function boundaries; never interprets free-text PASS output."""
from pathlib import Path
import re
import sys
import time
from core import atomic, boot_id, capture_files, evidence_root, read_json, utc


def observe(session, operation, action, boundary, lab):
    if not re.fullmatch('[A-Za-z0-9-]+', boundary): raise ValueError('Invalid observer boundary')
    directory = evidence_root(session) / 'operations' / operation / 'observations' / boundary
    if action == 'begin':
        directory.mkdir(parents=True, exist_ok=False)
        atomic(directory / 'start.json', {'boundary': boundary, 'startUTC': utc(),
                                         'startMonotonic': time.monotonic(), 'bootId': boot_id()})
        capture_files(Path(lab), directory / 'before', boundary + ':before')
    elif action == 'end':
        start = read_json(directory / 'start.json')
        if start['bootId'] != boot_id(): raise ValueError('Boot identity changed inside operation')
        if (directory / 'end.json').exists(): raise ValueError('Closed observer boundary cannot repeat')
        # End time is the command boundary, before evidence-copy overhead.
        end = {'endUTC': utc(), 'durationSeconds': time.monotonic() - start['startMonotonic'],
               'exitCode': 0, 'operational': 'COMPLETED', 'timing': 'nested interval; do not sum with parent'}
        capture_files(Path(lab), directory / 'after', boundary + ':after')
        atomic(directory / 'end.json', {**start, **end})
    else: raise ValueError('Invalid observer operation')


if __name__ == '__main__': observe(*sys.argv[1:])
