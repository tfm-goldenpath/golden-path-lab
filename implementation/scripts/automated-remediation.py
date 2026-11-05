#!/usr/bin/env python3
"""Run six independent scripted lane A tasks using the shared task controller."""
import argparse
from contextlib import contextmanager
import fcntl
import importlib
import json
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys

from manual_tasks import SCRIPTED, TERMINAL, clock, write_json, sha256
from manual_task_reviews import sealed_task
from automated_repairs import repair, verify_repair, input_hashes, original
from automated_assessment import CONTROLS, require_order, report

controller = importlib.import_module('manual-tasks')
TIMEOUTS = {'F03': 1800, 'F10': 1800, 'F11': 1200}  # Per operation, identical in R/G.
MIN_FREE = 6 * 1024**3


class StorageError(ValueError):
    pass


@contextmanager
def session_lock(session):
    # Separate from the controller's short plan/task locks. Serialize runners,
    # including runners for different sessions using the canonical DB.
    path = controller.STORE / '.automated-run.lock'
    if path.is_symlink(): raise ValueError('Unsafe automation lock')
    with path.open('a') as stream:
        fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def check_space(session, required=MIN_FREE, docker_root=None):
    if docker_root is None:
        docker_root = Path(subprocess.check_output(['docker', 'info', '--format', '{{.DockerRootDir}}'], text=True, timeout=30).strip())
    values = [{'path': str(path), 'freeBytes': shutil.disk_usage(path).free, 'requiredBytes': required}
              for path in {session, docker_root}]
    if any(v['freeBytes'] < required for v in values):
        raise StorageError('Insufficient storage; no pruning or evidence deletion performed: ' + json.dumps(values))
    return values


def invoke(task, command, **kwargs):
    return controller.run_command(argparse.Namespace(command=command, task=str(task), **kwargs))


def read_record(task):
    return controller.read(task / 'record.json')


def fail_task(task, message, unknown=False):
    with controller.locked(task):
        record = read_record(task)
        if (task / 'SHA256SUMS.txt').exists(): return  # Never change sealed history.
        record['failure'] = message
        if unknown:
            record['interruption'] = {'observedAt': clock(), 'timing': 'unknown after last retained event'}
            if record.get('started'): record['ended'] = record['events'][-1]['at']
            record['status'] = 'INCOMPLETE'
        elif record['status'] not in TERMINAL:
            try: controller.emit(task, record, 'abandon', note=message)
            except ValueError:
                record['interruption'] = {'observedAt': clock(), 'timing': 'clock discontinuity'}
                record['status'] = 'INCOMPLETE'
                if record.get('started'): record['ended'] = record['events'][-1]['at']
        controller.save(task, record)


def phase(task, name, action):
    """Mark intent before mutation. A missing end is incomplete, never retried."""
    with controller.locked(task):
        record = read_record(task)
        controller.guard_task(task, record)
        record['pendingScriptedPhase'] = name
        controller.save(task, record)
    action()
    with controller.locked(task):
        record = read_record(task)
        if record['status'] == 'INCOMPLETE': raise ValueError('Operation incomplete: ' + name)
        record.pop('pendingScriptedPhase', None)
        record['scriptedBoundary'] = name
        controller.save(task, record)


def verify_boundary(task, record):
    """Resume only already verified phases, without replaying external actions."""
    controller.guard_task(task, record)
    boundary = record.get('scriptedBoundary', 'prepared')
    if boundary in ('prepared', 'delivered', 'detected'):
        if input_hashes(task / 'participant') != original(task)['hashes']:
            raise ValueError('Unrecorded participant edits; unattended execution cannot continue')
    if boundary in ('detected', 'repaired', 'verified'):
        require_order(task, record)
    if boundary in ('repaired', 'verified'): verify_repair(task, record)
    if boundary == 'delivered':
        starts = list((task / 'operations').glob('*-start/exit.json'))
        if record['arm'] != 'R' or len(starts) != 1 or controller.read(starts[0])['exitCode'] != 0:
            raise ValueError('Reference delivery boundary unproven')
    return boundary


def execute_task(task):
    record = read_record(task)
    boundary = verify_boundary(task, record)
    if boundary == 'prepared':
        def start():
            invoke(task, 'start')
            current = read_record(task)
            if current['arm'] == 'G': require_order(task, current)
            elif current['status'] != 'REVIEW' or current['detection']:
                raise ValueError('Reference delivery did not complete without automatic detection')
        phase(task, 'detected' if record['arm'] == 'G' else 'delivered', start)
        boundary = read_record(task)['scriptedBoundary']
    if boundary == 'delivered':
        def diagnose():
            invoke(task, 'tool', tool=CONTROLS[record['scenario']])
            require_order(task, read_record(task))
        phase(task, 'detected', diagnose)
        boundary = 'detected'
    if boundary == 'detected':
        def apply_repair():
            with controller.locked(task):
                current = read_record(task)
                repair(task, current)
                controller.emit(task, current, 'scripted-repair', actor='automation',
                                evidence=controller.evidence_link(task / 'operator/repair.json', task))
        phase(task, 'repaired', apply_repair)
        boundary = 'repaired'
    if boundary == 'repaired':
        def validate():
            verify_repair(task, read_record(task))
            invoke(task, 'check')
            if read_record(task)['status'] != 'COMPLETED':
                raise ValueError('Predefined correction rejected or completion checks failed; no retry')
        phase(task, 'verified', validate)


def cleanup_task(task, retry=False):
    record = read_record(task)
    if record.get('cleanup') == 'completed': return
    if record.get('cleanup') == 'error' and not retry:
        raise ValueError('Cleanup previously failed; inspect retained evidence then explicitly use --retry-cleanup')
    if record.get('runningOperation'):
        invoke(task, 'recover')
    if invoke(task, 'cleanup') != 0: raise ValueError('Owned cleanup failed; next task is blocked')


def write_report(session):
    plan = controller.read(session / 'plan.json')  # Historical reports do not require current checkout identity.
    value, markdown = report(session, plan, controller.ROOT)
    value['sessionStatus'] = controller.read(session / 'session.json') if (session / 'session.json').exists() else None
    write_json(session / 'report.json', value)
    (session / 'report.md').write_text(markdown + '\nSession status:\n```json\n' + json.dumps(value['sessionStatus'], indent=2) + '\n```\n')
    (session / 'REPORT-SHA256SUMS.txt').write_text(''.join(sha256(session / name) + '  ' + name + '\n' for name in ('report.json', 'report.md')))
    return value


def run(args, session):
    if not (session / 'plan.json').exists():
        if not args.database or not args.seed: raise ValueError('A new session requires --database and --seed')
        controller.plan_command(argparse.Namespace(output=str(session / 'plan.json'), database=args.database,
            seed=args.seed, editor='none; predefined transformations', execution_mode='scripted', timeouts=TIMEOUTS))
    try:
        _, plan = controller.load_plan(session / 'plan.json')
    except (ValueError, OSError, KeyError) as error:
        # Drift blocks new work, but must not strand owned resources. Cleanup
        # still validates the saved run/task association in the shared module.
        for path in session.glob('automated-validation/task-*/record.json'):
            task = path.parent
            if controller.read(path).get('cleanup') != 'completed':
                if read_record(task).get('runningOperation'): invoke(task, 'recover')
                fail_task(task, 'Source/database/configuration guard: ' + str(error))
                cleanup_task(task, args.retry_cleanup)
        write_json(session / 'session.json', {**SCRIPTED, 'status': 'STOPPED', 'reason': str(error), 'at': clock()})
        write_report(session)
        raise
    if any(plan.get(k) != v for k, v in SCRIPTED.items()): raise ValueError('Use a new scripted session; historical/manual sessions cannot be converted')
    if args.seed and args.seed != plan['ordering']['seed']: raise ValueError('Session seed changed')
    if args.database and Path(args.database).resolve() != Path(plan['database']['directory']): raise ValueError('Session database changed')
    state = {**SCRIPTED, 'started': clock(), 'status': 'RUNNING', 'storageChecks': []}
    # Invocation history is append-only. A new invocation is not an operation retry.
    invocation = session / ('invocation-' + str(len(list(session.glob('invocation-*.json'))) + 1).zfill(4) + '.json')
    def save_state():
        write_json(invocation, state); write_json(session / 'session.json', state)
    save_state()
    stopped = False
    try:
        for selected in plan['ordering']['sequence']:
            paths = [p.parent for p in session.glob('automated-validation/task-*/record.json')
                     if controller.read(p).get('position') == selected['position']]
            if len(paths) > 1: raise ValueError('Ambiguous position; no automatic retries')
            task = paths[0] if paths else None
            # Clean interrupted work before storage/preparation checks or another task.
            if task:
                record = read_record(task)
                if record.get('cleanup') == 'completed':
                    sealed_task(task, controller.ROOT)
                    continue
                if record.get('runningOperation'): invoke(task, 'recover')
                if record.get('pendingScriptedPhase') or record['status'] in ('PREPARING', 'AUTOMATIC', 'VERIFYING'):
                    fail_task(task, 'Interrupted phase; unknown completion; never replayed', unknown=True)
                if read_record(task)['status'] in TERMINAL:
                    cleanup_task(task, args.retry_cleanup); write_report(session); continue
            try:
                state['storageChecks'].append({'at': clock(), 'filesystems': check_space(session)})
                save_state()
                if task is None:
                    print(f"PREPARING {selected['position']}/6 {selected['scenario']}/{selected['arm']}", flush=True)
                    try:
                        controller.prepare_command(argparse.Namespace(plan=str(session / 'plan.json'),
                            dataset='automated-validation', scenario=selected['scenario'], arm=selected['arm'],
                            participant='automation', prior_knowledge='predefined repair; no human participant',
                            position=selected['position']))
                    finally:
                        selection = session / 'current-task.json'
                        if selection.exists():
                            candidate = Path(controller.read(selection)['taskDirectory'])
                            if read_record(candidate).get('position') == selected['position']: task = candidate
                if task is None: raise ValueError('Preparation did not create a task')
                if read_record(task)['status'] == 'READY' or read_record(task)['status'] == 'REVIEW': execute_task(task)
            except StorageError as error:
                if task: fail_task(task, str(error))
                raise
            except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
                if task: fail_task(task, str(error))
                else: raise
            except KeyboardInterrupt:
                if task: fail_task(task, 'Controller interrupted between verified phases', unknown=True)
                stopped = True
            finally:
                if task:
                    interrupted = read_record(task).get('interruptedOperation')
                    cleanup_task(task, args.retry_cleanup)
                    stopped = stopped or bool(interrupted)
                    write_report(session)
                    sealed_task(task, controller.ROOT)
            if stopped: break
        state['status'] = 'INTERRUPTED' if stopped else 'FINISHED'
    except (ValueError, OSError, KeyError, subprocess.SubprocessError, KeyboardInterrupt) as error:
        state.update(status='STOPPED', reason=str(error) or 'Interrupted')
    finally:
        state['finished'] = clock(); save_state()
        value = write_report(session)
    print(f"REPORT {session / 'report.md'}; validated {value['validated']}/6; human acceptance pending")
    if state.get('reason'): print('STOPPED: ' + state['reason'], file=sys.stderr)
    return 0 if value['validated'] == 6 else 2


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    for command in ('run', 'status', 'report', 'intervention'):
        p = sub.add_parser(command); p.add_argument('--session', required=True)
        if command == 'run':
            p.add_argument('--database'); p.add_argument('--seed')
            p.add_argument('--retry-cleanup', action='store_true', help='Explicitly repeat only failed owned cleanup')
        if command == 'intervention':
            p.add_argument('--position', required=True, type=int)
            p.add_argument('--note', required=True, help='Actual human takeover; closes the attempt, never asserts completion')
    args = parser.parse_args()
    try:
        if not re.fullmatch('[A-Za-z0-9][A-Za-z0-9_-]{0,63}', args.session): raise ValueError('Use a simple session identifier')
        session = controller.managed(controller.STORE / args.session)
        if args.command == 'run': session.mkdir(parents=True, exist_ok=True)
        if not session.is_dir(): raise ValueError('Session does not exist')
        with session_lock(session):
            if args.command == 'run': return run(args, session)
            if args.command == 'intervention':
                paths = [p for p in session.glob('automated-validation/task-*/record.json') if controller.read(p).get('position') == args.position]
                if len(paths) != 1 or not args.note.strip(): raise ValueError('Select one existing task and describe actual intervention')
                task = paths[0].parent
                with controller.locked(task):
                    record = read_record(task)
                    if (task / 'SHA256SUMS.txt').exists(): raise ValueError('Sealed task cannot be modified')
                    if record.get('runningOperation'): raise ValueError('Stop and recover the active operation first')
                    record['humanIntervention'] = {'at': clock(), 'actor': 'human', 'note': args.note}
                    controller.save(task, record)
                fail_task(task, 'Human takeover; excluded from fully unattended execution')
                cleanup_task(task)
            value = write_report(session)
            print(json.dumps(value, indent=2) if args.command == 'status' else str(session / 'report.md'))
            return 0
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
        print('ERROR: ' + str(error), file=sys.stderr); return 1


if __name__ == '__main__':
    def interrupted(*_): raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, interrupted)
    sys.exit(main())
