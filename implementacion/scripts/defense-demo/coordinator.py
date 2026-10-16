#!/usr/bin/env python3
"""One local entry point: immutable attempts over existing laboratory controls."""
import argparse
from contextlib import nullcontext
import json
import os
import platform
from pathlib import Path
import select
import signal
import subprocess
import sys
import time

from core import (ADAPTERS, LIVE, PREPARE, ROOT, SCHEMA, SESSIONS, atomic, artifact_index,
                  boot_id, capture_files, catalogue, digest, events, evidence_root, file_record,
                  locked, outcome, public_session, publish_event, read_json, sanitize,
                  session_path, source_identity, utc, valid_name, workflow_metadata)


class Stopped(RuntimeError):
    def __init__(self, message, code=1):
        super().__init__(message)
        self.code = code


def resources(reserve_gib, preparation=False):
    """One GiB custody reserve + two GiB preparation headroom on this 32 GiB lab."""
    fs = os.statvfs(ROOT)
    free = fs.f_bavail * fs.f_frsize
    needed = int((reserve_gib + (2 if preparation else 0)) * 1024**3)
    record = {'freeBytes': free, 'freeInodes': fs.f_favail, 'reserveBytes': int(reserve_gib * 1024**3),
              'platform': platform.system() + '/' + platform.machine(), 'cpuCount': os.cpu_count(),
              'physicalMemoryBytes': os.sysconf('SC_PHYS_PAGES') * os.sysconf('SC_PAGE_SIZE'),
              'requiredBytes': needed, 'preparationHeadroomBytes': 2 * 1024**3 if preparation else 0,
              'observedUTC': utc(), 'sufficient': free >= needed and fs.f_favail >= 10000}
    return record


def create(name, profile, reserve):
    path = session_path(name)
    if path.exists() or evidence_root(name).exists(): raise Stopped('Session already exists; choose a new name')
    path.mkdir(parents=True, mode=0o700)
    raw = evidence_root(name)
    raw.mkdir(parents=True)
    (raw / 'operations').mkdir()
    identity = source_identity()
    atomic(raw / 'source.json', identity)
    atomic(raw / 'catalogue.json', catalogue())
    atomic(raw / 'workflows.json', workflow_metadata())
    state = {'schema': SCHEMA, 'session': name, 'profile': profile, 'lane': 'A', 'arm': 'G',
             'referenceArm': 'R (prepared HTTP oracle)', 'createdUTC': utc(), 'bootId': boot_id(),
             'source': {k: v for k, v in identity.items() if k != 'files'},
             'reserveGiB': reserve, 'prepared': False, 'operational': 'PENDING', 'lastExitCode': None,
             'active': None, 'completed': [], 'digest': None, 'image': None, 'liveDurationSeconds': None,
             'preparationDurationSeconds': None, 'f13Recovery': 'pending', 'exports': [],
             'humanReview': 'No solicitada para esta demostración', 'campaign': 'Not a campaign sample',
             'evidenceRoot': raw.relative_to(ROOT).as_posix(), 'lastEvidenceUTC': None}
    atomic(path / 'session.json', state)
    return state


def assert_source(state):
    current = source_identity()
    if any(current[k] != state['source'][k] for k in ('commit', 'contentHash')):
        raise Stopped('Source/configuration changed. Prepare a new session; no hidden rebuild or signing.')
    if state['bootId'] != boot_id(): raise Stopped('System boot changed. Prepared session cannot resume; use a new session.')


def lab_path(name):
    pointer = session_path(name) / 'lab-path.txt'
    if not pointer.exists(): return None
    path = Path(pointer.read_text().strip())
    if path.resolve() != path or path.parent != ROOT / 'evidence/raw' or not path.name.startswith('run-'):
        raise Stopped('Invalid laboratory owner')
    return path


def terminate(proc):
    if proc.poll() is None:
        os.killpg(proc.pid, signal.SIGTERM)
        try: proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait(timeout=5)


def run_process(command, stream, deadline=None, on_start=None):
    proc = subprocess.Popen(command, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT,
                            stdin=subprocess.DEVNULL, start_new_session=True)
    if on_start: on_start(proc.pid)
    aborted = False
    reason = None
    try:
        while proc.poll() is None:
            if deadline is not None and time.monotonic() >= deadline:
                aborted, reason = True, 'BUDGET_EXCEEDED'
                terminate(proc)
                break
            time.sleep(0.15)
    except KeyboardInterrupt:
        aborted, reason = True, 'INTERRUPTED'
        terminate(proc)
    return proc.returncode, aborted, reason


def register_operation_files(name, opdir, operation):
    raw = evidence_root(name)
    records = []
    for p in sorted(opdir.rglob('*')):
        if not p.is_file() or p.name in ('output-original.log',) or 'private' in p.name: continue
        if p.resolve() != p: raise ValueError('Symlinked operation evidence')
        record = file_record(raw, p, operation, 'generated operation receipt')
        for parent in p.parents:
            if parent == opdir.parent: break
            manifest = parent / 'copy-provenance.json'
            if manifest.is_file():
                source = read_json(manifest).get(p.relative_to(parent).as_posix())
                if source:
                    record.update(source=source['original'], originalSha256=source['originalSha256'], sanitized=source['sanitized'])
                break
        records.append(record)
    return records


def run_operation(state, operation, phase, deadline=None, instance=None):
    if operation not in ADAPTERS: raise Stopped('Unknown adapter')
    name = state['session']
    if operation != 'cleanup': assert_source(state)
    root = evidence_root(name)
    # A command that may have published can never be silently replayed.
    instance = instance or operation
    valid_name(instance)
    opdir = root / 'operations' / instance
    if opdir.exists(): raise Stopped('Operation was already attempted; inspect evidence or prepare a new session: ' + operation)
    if deadline is not None and time.monotonic() >= deadline: raise Stopped('Budget exhausted before next operation', 124)
    opdir.mkdir()
    spec = read_json(root / 'catalogue.json')['operations'][operation]
    started, mono = utc(), time.monotonic()
    state.update(active={'operation': operation, 'instance': instance, 'startUTC': started, 'phase': phase}, operational='RUNNING')
    atomic(session_path(name) / 'session.json', state)
    print(f'[{phase}] {operation}: {spec["title"]}', flush=True)
    code, aborted, reason = 1, False, None
    try:
        with (opdir / 'output-original.log').open('x') as stream:
            if operation in ('environment', 'build', 'analysis', 'admission-install'):
                observation = resources(state['reserveGiB'], operation == 'environment')
                if operation == 'analysis':
                    storage = os.statvfs('/tmp')
                    observation['databaseStorage'] = {'root': '/tmp/golden-path-defense-' + name,
                        'freeBytes': storage.f_bavail * storage.f_frsize, 'freeInodes': storage.f_favail,
                        'requiredBytes': 4 * 1024**3,
                        'reason': 'Two observed 1.6 GB copies (cache and retained snapshot), plus working margin'}
                    observation['sufficient'] = observation['sufficient'] and storage.f_bavail * storage.f_frsize >= 4 * 1024**3 and storage.f_favail >= 10000
                atomic(opdir / 'resources.json', observation)
                # Keep actual df and Docker reports, including their command statuses.
                for cmd in (['df', '-h', str(ROOT)], ['df', '-i', str(ROOT)], ['docker', 'system', 'df']):
                    rc = subprocess.run(cmd, stdout=stream, stderr=subprocess.STDOUT).returncode
                    if rc: raise Stopped('Resource observation failed', rc)
                if operation == 'analysis':
                    rc = subprocess.run(['df', '-h', '/tmp'], stdout=stream, stderr=subprocess.STDOUT).returncode
                    if rc: raise Stopped('Database storage observation failed', rc)
                if not observation['sufficient']: raise Stopped('Insufficient disk/inodes for preparation and evidence reserve')
            def worker(pid):
                from server import process_identity
                state['active']['worker'] = process_identity(pid)
                atomic(session_path(name) / 'session.json', state)
            code, aborted, reason = run_process(['bash', str(ROOT / 'scripts/defense-demo/adapters.sh'), operation, name], stream, deadline, worker)
    except (OSError, ValueError, Stopped) as error:
        reason = str(error)
        code = getattr(error, 'code', 1)
    except KeyboardInterrupt:
        code, aborted, reason = 130, True, 'INTERRUPTED'
    ended, elapsed = utc(), time.monotonic() - mono
    if code < 0: code = 128 - code
    try:
        original = (opdir / 'output-original.log').read_text(errors='replace')
        (opdir / 'output.log').write_text(sanitize(original))
        if operation == 'initialize':
            for file in ('source.json', 'catalogue.json', 'workflows.json'):
                (opdir / file).write_bytes((root / file).read_bytes())
        lab = lab_path(name)
        if lab is not None:
            capture_files(lab, opdir / 'closed', operation)
            saved = read_json(lab / 'state.json')
            state['digest'] = saved.get('digest')
            state['image'] = saved.get('imageRepository', '') + '@' + saved['digest'] if saved.get('digest') else None
            state['labEvidenceRoot'] = lab.relative_to(ROOT).as_posix()
        artifacts = register_operation_files(name, opdir, operation)
    except (OSError, ValueError) as error:
        artifacts = []
        code = code or 1
        reason = 'Evidence preservation failed: ' + str(error)
    except KeyboardInterrupt:
        artifacts = []
        code, aborted, reason = 130, True, 'INTERRUPTED_DURING_EVIDENCE_CLOSURE'
    operational, decision, expected = outcome(code, aborted, spec['expected'])
    receipt = {'operation': operation, 'attempt': spec['attempt'], 'scenario': spec['scenario'], 'phase': phase,
               'stages': spec['stages'], 'controls': spec['controls'], 'observedBoundary': spec['boundary'],
               'startUTC': started, 'endUTC': ended, 'durationSeconds': elapsed, 'bootId': boot_id(),
               'exitCode': code, 'operational': operational, 'decision': decision, 'expectation': expected,
               'reason': reason, 'sourceCommit': state['source']['commit'], 'sourceHash': state['source']['contentHash'],
               'lane': 'A', 'arm': 'G', 'digest': state['digest'], 'policyVersion': 'golden-path-v1',
               'artifacts': artifacts, 'timing': 'Actual aggregate wall interval; children not summed',
               'linkedAttempt': 'attempt-2' if operation in ('authorize', 'accept') else None,
               'notReached': (['admission', 'deployment'] if operation == 'f11-early' and code == 0 else
                              ['deployment'] if operation == 'f13' and code == 0 else [])}
    publish_event(name, receipt)
    state.update(active=None, operational=operational, lastExitCode=code, lastEvidenceUTC=utc())
    if phase != 'preservation': state['workExitCode'] = code
    if code == 0 and not aborted:
        if operation not in state['completed']: state['completed'].append(operation)
        if operation == 'accept': state['f13Recovery'] = 'confirmed'
    atomic(session_path(name) / 'session.json', state)
    print(f'{operation}: {operational}; decision={decision}; exit={code}; {elapsed:.3f}s', flush=True)
    if code or aborted: raise Stopped(reason or f'{operation} failed. See {opdir}/output.log', 124 if reason == 'BUDGET_EXCEEDED' else code or 130)
    return receipt


def not_reached(state, operations, phase, cause):
    for operation in operations:
        if (evidence_root(state['session']) / 'operations' / operation).exists(): continue
        if any(e['operation'] == operation for e in events(state['session'])): continue
        spec = catalogue()['operations'][operation]
        publish_event(state['session'], {'operation': operation, 'attempt': spec['attempt'], 'scenario': spec['scenario'],
            'phase': phase, 'stages': spec['stages'], 'controls': spec['controls'], 'observedBoundary': None,
            'startUTC': None, 'endUTC': None, 'durationSeconds': None, 'bootId': boot_id(), 'exitCode': None,
            'operational': 'NOT_REACHED', 'decision': 'indeterminate', 'expectation': 'pending', 'reason': cause,
            'sourceCommit': state['source']['commit'], 'sourceHash': state['source']['contentHash'],
            'lane': 'A', 'arm': 'G', 'digest': state['digest'], 'policyVersion': 'golden-path-v1', 'artifacts': []})


def prepare(state):
    start = time.monotonic()
    try:
        for operation in PREPARE: run_operation(state, operation, 'preparation')
        state['prepared'] = True
        state['operational'] = 'PREPARED'
    except (Stopped, KeyboardInterrupt) as error:
        if isinstance(error, KeyboardInterrupt): error = Stopped('Interrupted between preparation operations', 130)
        state.update(operational='ABORTED' if error.code in (124, 130, 143) else 'ERROR',
                     prepared=False, lastExitCode=error.code, workExitCode=error.code, failure=str(error))
        not_reached(state, PREPARE, 'preparation', str(error))
        not_reached(state, LIVE[state['profile']], 'live', str(error))
        raise error
    finally:
        state['preparationDurationSeconds'] = time.monotonic() - start
        atomic(session_path(state['session']) / 'session.json', state)


def present(state, budget, interactive=False, one=False):
    if not state['prepared'] or state['operational'] not in ('PREPARED', 'COMPLETED'):
        raise Stopped('A complete, unfailed prepared session is required; preparation is never implicit')
    remaining = [op for op in LIVE[state['profile']] if op not in state['completed']]
    if not remaining: raise Stopped('Presentation already completed; issuance and F13 cannot repeat')
    assert_source(state)
    start = time.monotonic()
    deadline = start + budget
    try:
        # A new readiness read per CLI invocation. It emits no signed evidence.
        # For step mode use unique operation copies, without repeating live operations.
        if 'resume' not in state['completed']:
            run_operation(state, 'resume', 'live', deadline)
        else:
            # Separate invocation must revalidate availability without overwriting receipts.
            count = sum(e['operation'] == 'resume' for e in events(state['session']))
            run_operation(state, 'resume', 'live', deadline, instance=f'resume-{count+1}')
        for op in remaining[:1] if one else remaining:
            if interactive:
                print(f'Enter: {op}; Ctrl+C: stop. Budget includes pauses.', flush=True)
                while True:
                    if time.monotonic() >= deadline: raise Stopped('Budget exhausted during pause', 124)
                    if select.select([sys.stdin], [], [], min(0.25, max(0, deadline-time.monotonic())))[0]:
                        if not sys.stdin.readline(): raise Stopped('Interactive input closed', 130)
                        break
            run_operation(state, op, 'live', deadline)
        if all(op in state['completed'] for op in LIVE[state['profile']]):
            if time.monotonic() >= deadline: raise Stopped('BUDGET_EXCEEDED while closing live evidence', 124)
            if state['f13Recovery'] != 'confirmed': raise Stopped('F13 recovery is incomplete')
            state['operational'] = 'COMPLETED'
            state['demoResult'] = 'CONFIRMED'
            state['liveTimingScope'] = 'single continuous presentation' if not one and len(remaining) == len(LIVE[state['profile']]) else 'separate step invocations; not a continuous presentation'
    except (Stopped, KeyboardInterrupt) as error:
        if isinstance(error, KeyboardInterrupt): error = Stopped('Interrupted', 130)
        state.update(operational='ABORTED' if error.code in (124, 130, 143) else 'ERROR', lastExitCode=error.code,
                     prepared=False, workExitCode=error.code, failure=str(error))
        not_reached(state, remaining, 'live', str(error))
        raise error
    finally:
        elapsed = time.monotonic() - start
        state.setdefault('liveSegments', []).append({'durationSeconds': elapsed, 'bootId': boot_id(), 'endUTC': utc()})
        state['liveDurationSeconds'] = elapsed if len(state['liveSegments']) == 1 else None
        state['lastEvidenceUTC'] = utc()
        atomic(session_path(state['session']) / 'session.json', state)


def main():
    parser = argparse.ArgumentParser(description=__doc__, epilog='Lane A only. No shell commands from the catalogue or web. Every new rehearsal requires a new session.')
    parser.add_argument('command', choices=['up', 'prepare', 'present', 'step', 'status', 'list', 'export', 'cleanup', 'serve'])
    parser.add_argument('--session')
    parser.add_argument('--profile', choices=LIVE, default='defense')
    parser.add_argument('--auto', action='store_true', help='No notes or human declarations; run sequentially')
    parser.add_argument('--interactive', action='store_true', help='Pause only between live operations')
    parser.add_argument('--serve', action='store_true')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--budget-seconds', type=float, default=180)
    parser.add_argument('--reserve-gib', type=float, default=1, help='Custody reserve; preparation also requires 2 GiB headroom')
    parser.add_argument('--stop-server', action='store_true', help='With cleanup, stop only this session\'s verified server process')
    args = parser.parse_args()
    if args.budget_seconds <= 0 or args.reserve_gib < 0.25 or not 1024 <= args.port <= 65535: parser.error('Invalid budget, reserve or port')
    if args.auto and args.interactive: parser.error('--auto and --interactive are exclusive')
    if args.command == 'list':
        print(json.dumps([public_session(p.name) for p in sorted(SESSIONS.glob('*')) if (p / 'session.json').is_file()], ensure_ascii=False, indent=2))
        return 0
    if not args.session: parser.error('--session is required')
    name = valid_name(args.session)
    from server import start_server, stop_server
    from exporting import export_session
    if args.command == 'status':
        print(json.dumps(public_session(name), ensure_ascii=False, indent=2)); return 0
    with locked(SESSIONS / ('.' + name + '.lock')):
        with locked(SESSIONS / '.preparation.lock') if args.command in ('up', 'prepare') else nullcontext():
            state = create(name, args.profile, args.reserve_gib) if args.command in ('up', 'prepare') else read_json(session_path(name) / 'session.json')
            try:
                if args.command == 'serve' or args.serve or args.command == 'up': start_server(name, args.port)
                if args.command in ('up', 'prepare'): prepare(state)
                if args.command in ('up', 'present', 'step'):
                    present(state, args.budget_seconds, args.interactive, args.command == 'step')
                if args.command == 'export': print(export_session(state))
                if args.command == 'cleanup':
                    from server import process_identity
                    active_worker = (state.get('active') or {}).get('worker')
                    if active_worker and process_identity(active_worker['pid']) == active_worker:
                        raise Stopped('An owned operation is still running. Interrupt its terminal before cleanup; no blind concurrent removal.')
                    work_status = state['operational']
                    work_exit = state.get('workExitCode', state.get('lastExitCode'))
                    if state.get('cleaned'):
                        # Verify again; no repeated resource deletion or replaced receipt.
                        if lab_path(name):
                            subprocess.run(['python3', str(ROOT / 'scripts/defense-demo/ownership.py'), name, 'absent'], check=True)
                    else:
                        export_session(state)
                        if lab_path(name):
                            attempts = sum(e['operation'] == 'cleanup' for e in events(name))
                            run_operation(state, 'cleanup', 'preservation', instance='cleanup' if attempts == 0 else f'cleanup-{attempts+1}')
                        state.update(cleaned=True, prepared=False, cleanupUTC=utc(), cleanupExitCode=0,
                                     operational=work_status, lastExitCode=work_exit)
                        atomic(session_path(name) / 'session.json', state)
                        print(export_session(state))
                    if args.stop_server: stop_server(name)
                state['lastCommand'] = {'command': args.command, 'exitCode': 0, 'endUTC': utc()}
                atomic(session_path(name) / 'session.json', state)
                return 0
            except Stopped as error:
                state['lastCommand'] = {'command': args.command, 'exitCode': error.code, 'endUTC': utc(), 'error': str(error)}
                atomic(session_path(name) / 'session.json', state)
                raise


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    try: sys.exit(main())
    except (Stopped, ValueError, RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print('ERROR: ' + str(error), file=sys.stderr)
        sys.exit(getattr(error, 'code', 1))
