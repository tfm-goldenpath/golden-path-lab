"""Retain an actual restricted-actor command status, not the adapter's status."""
from pathlib import Path
import sys
import time
from core import atomic, boot_id, utc

lab, operation, namespace, started, code, *arguments = sys.argv[1:]
folder = Path(lab) / 'defense-commands'
folder.mkdir(exist_ok=True)
atomic(folder / f'{time.time_ns()}.json', {'operation': operation, 'actorNamespace': namespace,
       'command': 'kubectl (restricted deployer)', 'arguments': arguments, 'exitCode': int(code),
       'durationSeconds': time.monotonic() - float(started), 'endUTC': utc(), 'bootId': boot_id(),
       'timing': 'external call including process startup; nested in adapter interval'})
