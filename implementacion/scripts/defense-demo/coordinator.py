#!/usr/bin/env python3
"""One local entry point: immutable attempts over existing laboratory controls."""
import argparse
from contextlib import nullcontext
import json
import math
import errno
import os
import platform
from pathlib import Path
import select
import signal
import subprocess
import sys
import time

# Case helpers must share this exact exception/lifecycle module when invoked as CLI.
if __name__ == "__main__": sys.modules["coordinator"] = sys.modules[__name__]

from core import (ADAPTERS, LIVE, PREPARE, F11_PREPARE, preparation_operations, profile_catalogue, ROOT, SCHEMA, SESSIONS, atomic, artifact_index,
                  boot_id, capture_files, catalogue, digest, events, evidence_root, file_record,
                  locked, outcome, public_session, publish_event, read_json, sanitize,
                  session_path, source_identity, utc, valid_name, workflow_metadata)


class Stopped(RuntimeError):
    def __init__(self, message, code=1):
        super().__init__(message)
        self.code = code


def resources(reserve_gib, preparation=False, profile=None, growth_gib=None, policy=None, docker_root=None):
    """Provisional operating margins, measured on actual filesystems."""
    policy = policy or {}
    reserve = int(reserve_gib * 1024**3)
    growth = (5 if preparation and profile == 'f11-comparison' else
              2 if preparation else policy.get('liveGrowthMiB', 256)/1024 if profile == 'f11-comparison' else 0) if growth_gib is None else growth_gib
    needed = reserve + int(growth * 1024**3)
    if preparation and profile == 'f11-comparison': needed = max(needed, int(policy.get('prepareFreeGiB', 8) * 1024**3))
    mounts = []
    seen = set()
    for path in (str(ROOT), *(['/tmp'] if profile in ('f11-comparison','early-security','defense-all') else []), *([docker_root] if docker_root else [])):
        fs, dev = os.statvfs(path), os.stat(path).st_dev
        if dev in seen:
            next(m for m in mounts if m['device'] == dev)['aliases'].append(path)
            continue
        seen.add(dev)
        mounts.append({'path': path, 'aliases': [path], 'device': dev, 'freeBytes': fs.f_bavail * fs.f_frsize,
                       'freeInodes': fs.f_favail})
    fs = os.statvfs(ROOT)
    free = fs.f_bavail * fs.f_frsize
    mem = dict(line.split(':', 1) for line in Path('/proc/meminfo').read_text().splitlines())
    return {'freeBytes': free, 'freeInodes': fs.f_favail, 'reserveBytes': reserve,
            'requiredBytes': needed, 'estimatedGrowthBytes': int(growth * 1024**3),
            'estimate': 'Conservative provisional margin; not validated capacity',
            'filesystems': mounts, 'warning': free < policy.get('warningFreeGiB', 5) * 1024**3,
            'platform': platform.system() + '/' + platform.machine(),
            'cpuCount': len(os.sched_getaffinity(0)),
            'physicalMemoryBytes': os.sysconf('SC_PHYS_PAGES') * os.sysconf('SC_PAGE_SIZE'),
            'availableMemoryKiB': int(mem['MemAvailable'].split()[0]),
            'observedUTC': utc(), 'sampleIntervalSeconds': 10, 'dockerStorageKnown': docker_root is not None,
            'cgroups': {name: Path('/sys/fs/cgroup/'+name).read_text().strip() if Path('/sys/fs/cgroup/'+name).exists() else None for name in ('cpu.max','memory.max')},
            'sufficient': all(m['freeBytes'] >= needed and m['freeInodes'] >= 10000 for m in mounts)}


def create(name, profile, reserve):
    path = session_path(name)
    if path.exists() or evidence_root(name).exists(): raise Stopped('Session already exists; choose a new name')
    if profile == 'f11-comparison':
        for existing in SESSIONS.glob('*/session.json'):
            other = read_json(existing)
            if other.get('prepared') and not other.get('cleaned'):
                raise Stopped('Retire the existing prepared session before creating another comparison: ' + other['session'])
    path.mkdir(parents=True, mode=0o700)
    raw = evidence_root(name)
    raw.mkdir(parents=True)
    (raw / 'operations').mkdir()
    identity = source_identity()
    atomic(raw / 'source.json', identity)
    atomic(raw / 'catalogue.json', profile_catalogue(profile))
    atomic(raw / 'workflows.json', workflow_metadata())
    state = {'schema': SCHEMA, 'session': name, 'profile': profile, 'lane': 'A', 'arm': 'G',
             'referenceArm': 'R (live privilege UPDATE and withdrawal)' if profile in ('f11-comparison','defense-all') else 'Not applied: early gates only' if profile == 'early-security' else 'R (prepared HTTP oracle)', 'createdUTC': utc(), 'bootId': boot_id(),
             'source': {k: v for k, v in identity.items() if k != 'files'},
             'reserveGiB': reserve, 'prepared': False, 'operational': 'PENDING', 'lastExitCode': None,
             'active': None, 'completed': [], 'digest': None, 'image': None, 'liveDurationSeconds': None,
             'preparationDurationSeconds': None, 'f13Recovery': 'not-applicable' if profile in ('f11-comparison','early-security','defense-all') else 'pending', 'exports': [],
             'humanReview': 'Pendiente; no realizada' if profile in ('f11-comparison','early-security','defense-all') else 'No solicitada para esta demostración', 'campaign': 'Not a campaign sample',
             'evidenceRoot': raw.relative_to(ROOT).as_posix(), 'lastEvidenceUTC': None}
    atomic(path / 'session.json', state)
    # Owned emergency metadata margin; never evidence. Released only on ENOSPC.
    with (path / '.receipt-reserve.bin').open('xb') as reserve_file:
        reserve_file.write(b'\0' * 1024**2)
    return state


def release_receipt_reserve(name):
    path = session_path(name) / '.receipt-reserve.bin'
    if path.exists() and path.resolve() == path and path.is_file(): path.unlink()


def recover_abandoned(state):
    """Under the session lock, retain an interrupted owner's partial evidence."""
    if state.get('operational') != 'RUNNING': return
    from server import process_identity
    active = state.get('active') or {}
    for owner in (state.get('controller'), active.get('worker')):
        if owner and process_identity(owner['pid']) == owner:
            raise Stopped('Recorded operation is still running; stop its owner before recovery')
    name = state['session']
    reason = 'Owner disappeared without a terminal receipt; outcome and duration unknown'
    atomic(session_path(name) / 'abandoned-operation.json', {
        'observedUTC': utc(), 'active': active, 'controller': state.get('controller'),
        'reason': reason, 'originalsPreserved': True})
    operation = active.get('operation')
    if operation in ADAPTERS and not any(e['operation'] == operation for e in events(name)):
        spec = read_json(evidence_root(name) / 'catalogue.json')['operations'][operation]
        opdir = evidence_root(name) / 'operations' / valid_name(active.get('instance', operation))
        original = opdir / 'output-original.log'
        if original.is_file():
            (opdir / 'output.log').write_text(sanitize(original.read_text(errors='replace')))
        publish_event(name, {**spec, 'operation': operation, 'phase': active.get('phase'),
            'startUTC': active.get('startUTC'), 'endUTC': None, 'durationSeconds': None,
            'operational': 'ABORTED', 'decision': 'indeterminate', 'expectation': 'unconfirmed',
            'exitCode': None, 'reason': reason, 'lane': 'A', 'arm': 'G',
            'artifacts': register_operation_files(name, opdir, operation)})
    state.update(operational='ABORTED', prepared=False, active=None, failure=reason,
                 lastExitCode=130, workExitCode=130)
    not_reached(state, LIVE[state['profile']], 'live', reason)
    atomic(session_path(name) / 'session.json', state)


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


def run_process(command, stream, deadline=None, on_start=None, resource_check=None, sample_interval=10):
    proc = subprocess.Popen(command, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT,
                            stdin=subprocess.DEVNULL, start_new_session=True)
    aborted = False
    reason = None
    try:
        if on_start: on_start(proc.pid)
        next_sample = time.monotonic() + sample_interval
        while proc.poll() is None:
            if resource_check and time.monotonic() >= next_sample:
                next_sample = time.monotonic() + sample_interval
                if not resource_check():
                    aborted, reason = True, "RESOURCE_EXHAUSTED"
                    terminate(proc)
                    break
            if deadline is not None and time.monotonic() >= deadline:
                aborted, reason = True, 'BUDGET_EXCEEDED'
                terminate(proc)
                break
            time.sleep(0.15)
    except KeyboardInterrupt:
        aborted, reason = True, 'INTERRUPTED'
        terminate(proc)
    except BaseException:
        terminate(proc)
        raise
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


def run_operation(state, operation, phase, deadline=None, instance=None, case_context=None):
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
    state.update(active={'operation': operation, 'instance': instance, 'startUTC': started, 'phase': phase, 'attempt': (case_context or {}).get('attempt',spec['attempt']), 'commandId':os.environ.get('GP_DEMO_COMMAND_ID')}, operational='RUNNING')
    atomic(session_path(name) / 'session.json', state)
    print(f'[{phase}] {operation}: {spec["title"]}', flush=True)
    code, aborted, reason = 1, False, None
    monitor = None
    guarded_profile = 'f11-comparison' if state.get('fixtureParent') or state['profile']=='defense-all' and not operation.startswith('early-') else state['profile']
    reserve = max(3, state['reserveGiB']) if case_context or state.get('fixtureParent') else state['reserveGiB']
    command = ([sys.executable,str(ROOT / 'scripts/defense-demo/early-adapter.py'),operation,name,instance] if operation.startswith('early-') else ['bash', str(ROOT / 'scripts/defense-demo/adapters.sh'), operation, name] + ([case_context['attempt'],instance] if case_context else []))
    try:
        with (opdir / 'output-original.log').open('x') as stream:
            if case_context or operation in ('environment', 'build', 'analysis', 'admission-install') or (guarded_profile == 'f11-comparison' and operation != 'cleanup'):
                if operation == 'environment' and guarded_profile == 'f11-comparison' or operation=='early-f03-prepare':
                    docker_root = subprocess.check_output(['docker','info','--format','{{.DockerRootDir}}'], text=True).strip()
                    local = not os.environ.get('DOCKER_HOST') or os.environ['DOCKER_HOST'].startswith('unix://')
                    state['dockerStorageRoot'] = docker_root if local and Path(docker_root).is_dir() else None
                observation = resources(reserve, (phase == 'preparation' if guarded_profile == 'f11-comparison' else operation == 'environment'), guarded_profile, policy=state.get('resourcePolicy'), docker_root=state.get('dockerStorageRoot'))
                if operation == 'analysis':
                    storage = os.statvfs('/tmp')
                    observation['databaseStorage'] = {'root': '/tmp/golden-path-defense-' + name,
                        'freeBytes': storage.f_bavail * storage.f_frsize, 'freeInodes': storage.f_favail,
                        'requiredBytes': 4 * 1024**3,
                        'reason': 'Two observed 1.6 GB copies (cache and retained snapshot), plus working margin'}
                    observation['sufficient'] = observation['sufficient'] and storage.f_bavail * storage.f_frsize >= 4 * 1024**3 and storage.f_favail >= 10000
                atomic(opdir / 'resources.json', observation)
                # Keep actual df and Docker reports, including their command statuses.
                for cmd in ((['df', '-h', str(ROOT), '/tmp'], ['df', '-i', str(ROOT), '/tmp']) if phase == 'preparation' and operation.startswith('early-') and operation!='early-f03-prepare' else (['df', '-h', str(ROOT), '/tmp'], ['df', '-i', str(ROOT), '/tmp'], ['docker', 'system', 'df']) if phase == 'preparation' else ()):
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
            samples = []
            def sample():
                value = resources(reserve, profile=guarded_profile, growth_gib=0, policy=state.get('resourcePolicy'), docker_root=state.get('dockerStorageRoot'))
                state['lastResources'] = value
                samples.append(value)
                atomic(opdir / 'resource-samples.json', {'samples': samples, 'intervalSeconds': 10,
                    'minimumSampledFreeBytes': min(x['freeBytes'] for x in samples), 'exactPeak': False})
                return value['sufficient']
            monitor = sample if (case_context or guarded_profile == 'f11-comparison') and operation != 'cleanup' else None
            if monitor and not monitor(): raise Stopped('RESOURCE_EXHAUSTED before command')
            code, aborted, reason = run_process(command, stream, deadline, worker, **({'resource_check': monitor} if monitor else {}))
            if monitor and not monitor(): code, aborted, reason = 1, True, 'RESOURCE_EXHAUSTED'
    except (OSError, ValueError, Stopped) as error:
        if isinstance(error, OSError) and error.errno == errno.ENOSPC:
            release_receipt_reserve(name)
            reason = 'RESOURCE_EXHAUSTED: ENOSPC; partial originals retained'
        else: reason = str(error)
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
        lab = case_context['lab'] if case_context else lab_path(name)
        if lab is not None:
            if state['profile'] == 'f11-comparison' and not case_context:
                inventory = state.setdefault('captureInventory', {})
                copied = capture_files(lab, opdir / 'closed', operation, inventory)
                inventory.update({key: value['originalSha256'] for key, value in copied.items()})
            else: capture_files(lab, opdir / 'closed', operation)
            saved = read_json(lab / 'state.json')
            state['digest'] = saved.get('digest')
            state['image'] = saved.get('imageRepository', '') + '@' + saved['digest'] if saved.get('digest') else None
            if not case_context: state['labEvidenceRoot'] = lab.relative_to(ROOT).as_posix()
        if monitor and not monitor(): code, aborted, reason = 1, True, 'RESOURCE_EXHAUSTED during evidence closure'
        artifacts = register_operation_files(name, opdir, operation)
    except (OSError, ValueError) as error:
        if isinstance(error, OSError) and error.errno == errno.ENOSPC: release_receipt_reserve(name)
        artifacts = []
        code = code or 1
        reason = 'Evidence preservation failed: ' + str(error)
    except KeyboardInterrupt:
        artifacts = []
        code, aborted, reason = 130, True, 'INTERRUPTED_DURING_EVIDENCE_CLOSURE'
    ended, elapsed = utc(), time.monotonic() - mono
    if deadline is not None and time.monotonic() >= deadline:
        code, aborted, reason = 124, True, 'BUDGET_EXCEEDED during evidence closure'
    operational, decision, expected = outcome(code, aborted, spec['expected'])
    receipt = {'operation': operation, 'attempt': spec['attempt'], 'scenario': spec['scenario'], 'phase': phase,
               'stages': spec['stages'], 'controls': spec['controls'], 'observedBoundary': spec['boundary'],
               'startUTC': started, 'endUTC': ended, 'durationSeconds': elapsed, 'bootId': boot_id(),
               'exitCode': code, 'operational': operational, 'decision': decision, 'expectation': expected,
               'reason': reason, 'sourceCommit': state['source']['commit'], 'sourceHash': state['source']['contentHash'],
               'lane': 'A', 'arm': 'R' if operation == 'comparison-reference' else 'G', 'digest': None if operation.startswith('early-') else state['digest'], 'policyVersion': 'golden-path-v1',
               'command': ['bash', 'scripts/defense-demo/adapters.sh', operation, name],
               'artifacts': artifacts, 'timing': 'Actual aggregate wall interval; children not summed',
               'linkedAttempt': 'attempt-2' if state['profile'] != 'f11-comparison' and operation in ('authorize', 'accept') else None,
               'notReached': (['admission', 'deployment'] if operation == 'f11-early' and code == 0 else
                              ['deployment'] if operation == 'f13' and code == 0 else [])}
    if operation.startswith('early-f03-') and operation!='early-f03-prepare' and code==0:
        summary=read_json(opdir/'target-attribution.json')
        analysis=read_json(opdir/'analysis.json')
        receipt['earlySummary']={'image':summary['image'],'components':summary['component'],'findings':summary['target'],'additionalFindings':summary['additionalFindings'],'database':analysis['database'],'policyDecision':analysis['status']}
        receipt['digest']=summary['image'].split('@')[1]
    receipt['operationInstance']=instance
    if case_context:
        receipt.update({k:case_context[k] for k in ('attempt','precedingAttempt','preparationSession')})
        receipt.update(repeat=True,command=command)
        receipt.update({k:case_context[k] for k in ('comparisonId','comparisonCase','linkedAttempt') if k in case_context})
    publish_event(name, receipt)
    state.update(active=None, operational=operational, lastExitCode=code, lastEvidenceUTC=utc())
    if phase != 'preservation': state['workExitCode'] = code
    if code == 0 and not aborted:
        if not case_context and operation not in state['completed']: state['completed'].append(operation)
        if operation == 'accept' and state['profile'] != 'f11-comparison': state['f13Recovery'] = 'confirmed'
    atomic(session_path(name) / 'session.json', state)
    print(f'{operation}: {operational}; decision={decision}; exit={code}; {elapsed:.3f}s', flush=True)
    if code or aborted: raise Stopped(reason or f'{operation} failed. See {opdir}/output.log', 124 if reason == 'BUDGET_EXCEEDED' else code or 130)
    return receipt


def not_reached(state, operations, phase, cause):
    for operation in operations:
        if (evidence_root(state['session']) / 'operations' / operation).exists(): continue
        if any(e['operation'] == operation for e in events(state['session'])): continue
        spec = read_json(evidence_root(state['session']) / 'catalogue.json')['operations'][operation]
        publish_event(state['session'], {'operation': operation, 'attempt': spec['attempt'], 'scenario': spec['scenario'],
            'phase': phase, 'stages': spec['stages'], 'controls': spec['controls'], 'observedBoundary': None,
            'startUTC': None, 'endUTC': None, 'durationSeconds': None, 'bootId': boot_id(), 'exitCode': None,
            'operational': 'NOT_REACHED', 'decision': 'indeterminate', 'expectation': 'pending', 'reason': cause,
            'sourceCommit': state['source']['commit'], 'sourceHash': state['source']['contentHash'],
            'lane': 'A', 'arm': 'R' if operation == 'comparison-reference' else 'G', 'digest': state['digest'], 'policyVersion': 'golden-path-v1', 'artifacts': []})


def prepare(state):
    start = time.monotonic()
    try:
        for operation in preparation_operations(state['profile']): run_operation(state, operation, 'preparation')
        state['prepared'] = True
        state['operational'] = 'PREPARED'
    except (Stopped, KeyboardInterrupt) as error:
        if isinstance(error, KeyboardInterrupt): error = Stopped('Interrupted between preparation operations', 130)
        state.update(operational='ABORTED' if error.code in (124, 130, 143) else 'ERROR',
                     prepared=False, lastExitCode=error.code, workExitCode=error.code, failure=str(error))
        not_reached(state, preparation_operations(state['profile']), 'preparation', str(error))
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
    start = time.monotonic()
    deadline = start + budget
    try:
        assert_source(state)
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
            if 'f13' in LIVE[state['profile']] and state['f13Recovery'] != 'confirmed': raise Stopped('F13 recovery is incomplete')
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
    parser.add_argument('command', choices=['up', 'prepare', 'present', 'step', 'status', 'list', 'export', 'cleanup', 'serve', 'stop-server', 'check', 'prepare-pending', 'cleanup-plan', 'verify', 'case'])
    parser.add_argument('--session')
    from cases import ACTIONS
    parser.add_argument('--case-action', choices=ACTIONS)
    parser.add_argument('--profile', choices=LIVE, default='defense')
    parser.add_argument('--auto', action='store_true', help='No notes or human declarations; run sequentially')
    parser.add_argument('--interactive', action='store_true', help='Pause only between live operations')
    parser.add_argument('--new', action='store_true', help='Create an unprepared session for serve; never overwrite')
    parser.add_argument('--enable-actions', action='store_true', help='Enable authenticated same-origin web controls; default read-only')
    parser.add_argument('--serve', action='store_true')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--budget-seconds', type=float, default=180)
    parser.add_argument('--prepare-free-gib', type=float, default=8)
    parser.add_argument('--warning-free-gib', type=float, default=5)
    parser.add_argument('--live-growth-mib', type=float, default=256)
    parser.add_argument('--reserve-gib', type=float, default=None, help='Custody reserve; preparation also requires 2 GiB headroom')
    parser.add_argument('--stop-server', action='store_true', help='With cleanup stop the verified viewer; with serve restart only that viewer')
    args = parser.parse_args()
    if args.reserve_gib is None: args.reserve_gib = 3 if args.profile in ('f11-comparison','early-security','defense-all') else 1
    if not all(math.isfinite(x) for x in (args.budget_seconds, args.reserve_gib, args.prepare_free_gib, args.warning_free_gib, args.live_growth_mib)) or args.budget_seconds <= 0 or args.reserve_gib < 0.25 or not 1024 <= args.port <= 65535: parser.error('Invalid budget, reserve or port')
    if min(args.prepare_free_gib, args.warning_free_gib, args.live_growth_mib) <= 0: parser.error('Resource margins must be positive')
    if args.auto and args.interactive: parser.error('--auto and --interactive are exclusive')
    if args.command == 'list':
        print(json.dumps([public_session(p.name) for p in sorted(SESSIONS.glob('*')) if (p / 'session.json').is_file()], ensure_ascii=False, indent=2))
        return 0
    if not args.session: parser.error('--session is required')
    if args.enable_actions: os.environ['GP_DEMO_ACTIONS'] = '1'
    name = valid_name(args.session)
    from server import start_server, stop_server, check_viewer_port
    from exporting import export_session, ExportSpaceError, verify_export
    if args.command == 'status':
        print(json.dumps(public_session(name), ensure_ascii=False, indent=2)); return 0
    with locked(SESSIONS / ('.' + name + '.lock')):
        if args.command == 'stop-server':
            read_json(session_path(name) / 'session.json')
            stop_server(name)
            print('Verified session viewer stopped; laboratory and evidence retained.')
            return 0
        with locked(SESSIONS / '.preparation.lock') if args.command in ('up', 'prepare', 'prepare-pending') or args.command=='case' and args.case_action in ('prepare-f13-case','prepare-early-f03') else nullcontext():
            if args.command == 'up' or (args.command == 'prepare' and args.serve) or (args.command == 'serve' and args.new):
                check_viewer_port(name, args.port)
            state = create(name, args.profile, args.reserve_gib) if args.command in ('up', 'prepare') or (args.command == 'serve' and args.new) else read_json(session_path(name) / 'session.json')
            if args.command in ('prepare','up') or (args.command == 'serve' and args.new):
                state['resourcePolicy'] = {'prepareFreeGiB': args.prepare_free_gib, 'warningFreeGiB': args.warning_free_gib, 'liveGrowthMiB': args.live_growth_mib}
                atomic(session_path(name) / 'session.json', state)
            if args.command not in ('serve', 'status', 'list'):
                recover_abandoned(state)
                from server import process_identity
                state['controller'] = process_identity(os.getpid())
                atomic(session_path(name) / 'session.json', state)
            try:
                if args.command == 'serve' and args.stop_server: stop_server(name)
                if args.command == 'serve' or args.serve or args.command == 'up': start_server(name, args.port)
                if args.command == 'prepare-pending' and (
                    state.get('cleaned') or state.get('preparationDurationSeconds') is not None
                    or lab_path(name) or any(e['phase']=='preparation' and not e['operation'].startswith('early-') for e in events(name))
                    or state['profile']!='defense-all' and (events(name) or state['operational'] != 'PENDING')
                ):
                    raise Stopped('Preparation was already attempted; use a new session')
                if state['profile']=='early-security' and args.command in ('up','prepare','prepare-pending','present','step','check'):
                    raise Stopped('Use the per-case preparation and comparison actions for early-security')
                if args.command in ('up', 'prepare', 'prepare-pending'): prepare(state)
                if args.command in ('up', 'present', 'step'):
                    present(state, args.budget_seconds, args.interactive, args.command == 'step')
                if args.command == 'case':
                    from cases import execute
                    execute(state,args.case_action,args.budget_seconds)
                if args.command == 'check':
                    if not state['prepared']: raise Stopped('Prepared session required for environment readiness')
                    assert_source(state)
                    count = sum(e['operation'] == 'resume' for e in events(name))
                    run_operation(state, 'resume', 'readiness', time.monotonic()+args.budget_seconds, instance=f'resume-check-{count+1}')
                if args.command == 'cleanup-plan':
                    if lab_path(name): subprocess.run(['python3', str(ROOT / 'scripts/defense-demo/ownership.py'), name, 'plan'], check=True)
                    else: print(json.dumps({'plan': [], 'preserved': ['all evidence and session state'], 'reason': 'No laboratory was initialized'}))
                if args.command == 'verify':
                    if not state['exports']: raise Stopped('No export to verify')
                    record = state['exports'][-1]['package']
                    path = ROOT / 'evidence/packages' / record['path']
                    if file_record(ROOT / 'evidence/packages', path, 'verify', '')['sha256'] != record['sha256']: raise Stopped('Export hash differs')
                    print(json.dumps(verify_export(path)))
                if args.command == 'export': print(export_session(state))
                if args.command == 'cleanup':
                    from cases import fixture
                    child=fixture(state)
                    if child and not child.get('cleaned'): raise Stopped('Retire the linked F13 fixture first using cleanup-f13-case')
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
                        try:
                            if not (state['profile'] == 'f11-comparison' and state['exports'] and state['exports'][-1].get('eventCount') == len(events(name))):
                                export_session(state)
                        except (ExportSpaceError, OSError) as error:
                            if isinstance(error, OSError) and error.errno != errno.ENOSPC: raise
                            if isinstance(error, OSError): release_receipt_reserve(name)
                            atomic(session_path(name) / 'export-pending.json', {'UTC': utc(), 'error': str(error), 'originalsPreserved': True})
                            if lab_path(name):
                                subprocess.run(['python3', str(ROOT / 'scripts/defense-demo/ownership.py'), name, 'recovery-cleanup'], check=True)
                            state.update(prepared=False, recoveryCleanup=True, exportPending=True)
                            atomic(session_path(name) / 'session.json', state)
                            if args.stop_server: stop_server(name)
                            raise Stopped('Export pending; sealed containers retired; evidence, snapshots and private state retained')
                        if lab_path(name):
                            attempts = sum(e['operation'] == 'cleanup' for e in events(name))
                            run_operation(state, 'cleanup', 'preservation', instance='cleanup' if attempts == 0 else f'cleanup-{attempts+1}')
                        state.update(cleaned=True, prepared=False, cleanupUTC=utc(), cleanupExitCode=0,
                                     operational=work_status, lastExitCode=work_exit)
                        atomic(session_path(name) / 'session.json', state)
                        if state['profile'] == 'f11-comparison':
                            state['cleanupExportPending'] = True
                            atomic(session_path(name) / 'session.json', state)
                        else: print(export_session(state))
                    if args.stop_server: stop_server(name)
                state['lastCommand'] = {'command': args.command, 'commandId':os.environ.get('GP_DEMO_COMMAND_ID'), 'exitCode': 0, 'endUTC': utc()}
                atomic(session_path(name) / 'session.json', state)
                return 0
            except KeyboardInterrupt:
                state['lastCommand'] = {'command': args.command, 'commandId':os.environ.get('GP_DEMO_COMMAND_ID'), 'exitCode': 130, 'endUTC': utc(), 'error': 'INTERRUPTED; partial artifacts retained'}
                atomic(session_path(name) / 'session.json', state)
                raise Stopped('Interrupted; partial artifacts retained', 130)
            except Stopped as error:
                state['lastCommand'] = {'command': args.command, 'commandId':os.environ.get('GP_DEMO_COMMAND_ID'), 'exitCode': error.code, 'endUTC': utc(), 'error': str(error)}
                atomic(session_path(name) / 'session.json', state)
                raise
            finally:
                # Still under the session lock: release only this process's ownership.
                from server import process_identity
                owned = process_identity(os.getpid())
                latest = read_json(session_path(name) / 'session.json')
                if owned and latest.get('controller') == owned:
                    latest.pop('controller', None)
                    atomic(session_path(name) / 'session.json', latest)


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    try: sys.exit(main())
    except (Stopped, ValueError, RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print('ERROR: ' + str(error), file=sys.stderr)
        sys.exit(getattr(error, 'code', 1))
