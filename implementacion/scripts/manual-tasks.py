#!/usr/bin/env python3
"""Human-operated lane A calibration interface; never launches a series."""
import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import uuid

from manual_tasks import (SCENARIOS, TERMINAL, clock, elapsed, make_sequence,
                          new_record, record_event, sha256, summarize, write_json)
from manual_task_reviews import (ASSISTANCE, DECISIONS, PURPOSES, effective_review,
                                 next_action, record_review, sealed_task)

ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / 'evidence/manual-tasks'
TOOLS = ['bash', 'python3', 'node', 'npm', 'git', 'jq', 'curl', 'docker',
         'kind', 'kubectl', 'helm', 'trivy', 'conftest', 'cosign']


def read(path):
    return json.loads(Path(path).read_text())


def managed(path):
    path = Path(path).absolute()
    if path.is_symlink() or path.resolve() != path or not path.is_relative_to(STORE.resolve()):
        raise ValueError('Use a non-symlink path under implementacion/evidence/manual-tasks')
    return path


@contextmanager
def locked(directory):
    path = directory / '.lock'
    if path.is_symlink(): raise ValueError('Unsafe lock')
    with path.open('a') as stream:
        fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def source_identity():
    repo = ROOT.parent
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
    names = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=repo).split(b'\0')
    files = {}
    for raw in sorted(set(names)):
        if not raw: continue
        name = os.fsdecode(raw); path = repo / name
        if not path.is_file() or path.is_symlink(): raise ValueError('Missing or symlinked source: ' + name)
        files[name] = sha256(path)
    return {'commit': commit, 'treeSha256': hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest(),
            'toolsLockSha256': sha256(ROOT / 'tools.lock.json'), 'files': files}


def database_identity(directory):
    directory = Path(directory).resolve()
    return {'directory': str(directory), 'sha256': {name: sha256(directory / 'db' / name)
            for name in ['trivy.db', 'metadata.json']}}


def load_plan(path):
    path = managed(path); plan = read(path)
    if plan.get('schema') != 'manual-task-plan/v1' or plan.get('lane') != 'A':
        raise ValueError('Unknown manual task plan')
    initial = read(path.with_name('initial-plan.json'))
    if {k:v for k,v in plan.items() if k not in ('limitsSeconds', 'limitsReview')} != {k:v for k,v in initial.items() if k not in ('limitsSeconds', 'limitsReview')}:
        raise ValueError('Initial seed, sequence or configuration changed')
    if not plan['limitsReview'] and any(v is not None for v in plan['limitsSeconds'].values()):
        raise ValueError('Limits require the human calibration freeze procedure')
    if plan['limitsReview'] and read(path.with_name('frozen-plan.json')) != plan:
        raise ValueError('The frozen plan or limits changed')
    if plan['ordering'] != make_sequence(plan['ordering']['seed']):
        raise ValueError('Order differs from its retained seed')
    if source_identity() != plan['source']:
        raise ValueError('Source/configuration changed; create a separately identified calibration plan')
    if database_identity(plan['database']['directory']) != plan['database']:
        raise ValueError('Frozen database changed')
    if plan['limitsReview']:
        validate_frozen_reviews(path, plan)
    return path, plan


def plan_command(args):
    path = managed(args.output); path.parent.mkdir(parents=True, exist_ok=True)
    if path.name != 'plan.json': raise ValueError('Use one plan.json per session directory')
    with locked(path.parent):
        if path.exists():
            if not getattr(args, 'reuse', False): raise FileExistsError('Plan already exists')
            _, existing = load_plan(path)
            if (existing['ordering']['seed'] != args.seed or existing['tools']['editor'] != args.editor
                    or existing['database']['directory'] != str(Path(args.database).resolve())):
                raise ValueError('Declared inputs differ from the existing plan; use a new session directory')
            print('PLAN_REUSED ' + str(path))
            return
        value = {'schema': 'manual-task-plan/v1', 'lane': 'A', 'created': clock(),
                 'ordering': make_sequence(args.seed), 'source': source_identity(),
                 'database': database_identity(args.database),
                 'tools': {'conventional': TOOLS, 'editor': args.editor, 'aiDuringTasks': 'prohibited'},
                 'limitsSeconds': {s: None for s in SCENARIOS}, 'limitsReview': None,
                 'environment': {'platform': 'linux/amd64', 'cache': 'fresh owned builder; preparation history retained',
                                 'signing': 'existing local development key profile'}}
        if path.with_name('initial-plan.json').exists(): raise ValueError('Initial plan already exists')
        write_json(path.with_name('initial-plan.json'), value)
        write_json(path, value)
    print('PLAN_CREATED ' + str(path))
    print(' '.join(x['scenario'] + '/' + x['arm'] for x in value['ordering']['sequence']))
    print('LIMITS_UNSET; calibration only until human-reviewed limits are frozen')


def save(task, record):
    write_json(task / 'record.json', record)


def emit(task, record, kind, **fields):
    record_event(record, kind, clock(), **fields); save(task, record)


def remaining(record):
    if not record.get('started') or record['limitSeconds'] is None: return None
    return max(0, record['limitSeconds'] - elapsed(record['started'], clock()))


def evidence_link(path, task):
    if path.is_symlink() or not path.is_file(): raise ValueError('Missing regular evidence file')
    return {'path': os.path.relpath(path, task), 'sha256': sha256(path)}


def task_checksums(task):
    entries = []
    for path in sorted(task.rglob('*')):
        if path.is_symlink(): raise ValueError('Refusing symlinked task evidence')
        if path.is_file() and path.name not in ('.lock', 'SHA256SUMS.txt'):
            entries.append(sha256(path) + '  ' + path.relative_to(task).as_posix() + '\n')
    destination = task / 'SHA256SUMS.txt'
    with destination.open('x') as stream: stream.writelines(entries)


def terminate(process):
    if process.poll() is not None: return
    os.killpg(process.pid, signal.SIGTERM)
    try: process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL); process.wait()


def process_identity(pid):
    try:
        return Path(f'/proc/{pid}/stat').read_text().split(') ', 1)[1].split()[19]
    except FileNotFoundError:
        return None


def operation(task, record, name, tool=None, follow=False):
    """Retain each invocation. The subprocess group is bounded by the total window."""
    if follow and name != 'prepare': raise ValueError('Live log display is limited to preparation')
    folder = task / 'operations' / f'{len(list((task / "operations").iterdir())) + 1:04d}-{name}'
    folder.mkdir()
    env = os.environ.copy()
    for key in ['GP_NODE_IMAGE', 'DELIVERY_CACHE_FROM', 'GP_SOURCE_REPOSITORY', 'GP_STATE_DIR', 'GITHUB_OUTPUT']:
        env.pop(key, None)
    env['GP_VULNERABILITY_DB'] = record['identity']['database']['directory']
    env['GP_SOURCE_REPOSITORY'] = 'https://example.invalid/tfm/local'
    command = ['bash', 'scripts/demo.sh', 'local', 'manual', name, str(task), str(folder)]
    if tool: command.append(tool)
    write_json(folder / 'request.json', {'command': command, 'kind': 'human-requested' if name in ('tool', 'check') else name,
                                       'synthetic': record['synthetic'], 'started': clock()})
    process = None
    reader = None

    def display_log():
        if reader:
            try: print(reader.read(), end='', flush=True)
            except BrokenPipeError: pass  # The original file remains the evidence.

    try:
        with (folder / 'command.log').open('xb') as stream:
            if follow: reader = (folder / 'command.log').open(errors='replace')
            process = subprocess.Popen(command, cwd=ROOT, env=env, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
            record['runningOperation'] = {'pid': process.pid, 'directory': str(folder), 'name': name,
                                          'bootId': clock()['bootId'], 'processStart': process_identity(process.pid)}
            save(task, record)
            if follow:
                # Preparation is outside the task timer. Timed operations keep
                # their original wait/deadline path and evidence endpoints.
                while True:
                    display_log()
                    try:
                        code = process.wait(timeout=0.2)
                        break
                    except subprocess.TimeoutExpired:
                        continue
            else:
                code = process.wait(timeout=remaining(record) if name in ('start', 'tool', 'check') else None)
            finished = clock()
    except subprocess.TimeoutExpired:
        terminate(process)
        finished = clock()
        detection_from(folder, task, record, 'automatic' if name == 'start' else 'manual')
        if record['status'] not in TERMINAL:
            emit(task, record, 'expire', note='Total-duration window exhausted during ' + name)
        code = 124
    except (KeyboardInterrupt, SystemExit):
        if process: terminate(process)
        if record['status'] not in TERMINAL:
            emit(task, record, 'interrupt', note='Interrupted operation: ' + name)
            if record['status'] not in TERMINAL:
                emit(task, record, 'abandon', note='Manual tool interrupted; evidence retained')
        code = 130; finished = clock()
    except OSError as error:
        (folder / 'launch-error.txt').write_text(str(error) + '\n')
        code = 1; finished = clock()
    finally:
        if reader:
            display_log(); reader.close()
        record.pop('runningOperation', None); save(task, record)
    write_json(folder / 'exit.json', {'exitCode': code, 'finished': finished})
    print('EVIDENCE ' + str(folder))
    return code, folder


def guard_task(task, record):
    if record.get('synthetic'): raise ValueError('Synthetic test histories cannot run human tasks')
    _, plan = load_plan(record['plan'])
    if record['identity']['source'] != plan['source'] or record['identity']['database'] != plan['database']:
        raise ValueError('Task configuration differs from its plan')
    if sha256(task / 'operator/prepared.json') != record['preparedSha256']:
        raise ValueError('Preparation record changed')
    for path, digest in read(task / 'operator/prepared.json')['invariants'].items():
        if Path(path).is_symlink() or sha256(path) != digest:
            raise ValueError('Prepared input, trust or policy record changed: ' + path)
    if record['status'] == 'READY':
        for path, digest in read(task / 'operator/prepared.json')['initialInputs'].items():
            if Path(path).is_symlink() or sha256(path) != digest:
                raise ValueError('Participant input changed before the timer; prepare a fresh attempt')
    if record.get('runningOperation'):
        raise ValueError('Interrupted operation needs recover; never silently restart an attempt')
    return plan


def prepare_command(args):
    plan_path, plan = load_plan(args.plan)
    dataset = args.dataset
    with locked(plan_path.parent):
        selection = plan_path.parent / 'current-task.json'
        if selection.is_symlink() or (selection.exists() and not selection.is_file()):
            raise ValueError('Unsafe current-task.json; task selection must be a regular file')
        preceding = [read(p) for p in plan_path.parent.glob('*/task-*/record.json')]
        if any(r.get('cleanup') != 'completed' for r in preceding):
            raise ValueError('Clean up the preceding attempt before preparing another')
        scenario, arm, position = args.scenario, args.arm, None
        if dataset == 'measurement':
            if not plan['limitsReview']: raise ValueError('Real human calibration and frozen limits are required')
            old = sorted((plan_path.parent / dataset).glob('task-*/record.json'))
            records = [read(p) for p in old]
            if any(r['status'] not in TERMINAL or r.get('cleanup') != 'completed' for r in records):
                raise ValueError('Finish and clean up the preceding task first')
            position = len(records) + 1
            if position > 6: raise ValueError('The manual plan contains exactly six measured tasks')
            selected = plan['ordering']['sequence'][position - 1]
            if (scenario, arm) != (selected['scenario'], selected['arm']):
                raise ValueError('Next task must be ' + selected['scenario'] + '/' + selected['arm'])
        directory = plan_path.parent / dataset / ('task-' + uuid.uuid4().hex[:12])
        directory.mkdir(parents=True)
        for name in ['operator', 'participant', 'operations']: (directory / name).mkdir()
        identity = {k: plan[k] for k in ['source', 'database', 'tools', 'environment']}
        record = new_record(scenario, arm, dataset, identity, plan['limitsSeconds'][scenario] if dataset == 'measurement' else None)
        record.update({'plan': str(plan_path), 'taskDirectory': str(directory), 'position': position, 'participant': args.participant,
                       'priorKnowledge': args.prior_knowledge, 'created': clock()})
        save(directory, record)
        # Save the path before any infrastructure operation, including failures.
        write_json(selection, {'schema': 'manual-task-selection/v1', 'taskDirectory': str(directory),
                               'scenario': scenario, 'arm': arm, 'dataset': dataset})
        print('TASK ' + str(directory), flush=True)
        options = {'follow': True} if getattr(args, 'follow', False) else {}
        code, folder = operation(directory, record, 'prepare', **options)
        if code == 0:
            prepared = read(directory / 'operator/prepared.json')
            comparisons = [read(Path(r['taskDirectory']) / 'operator/prepared.json')['comparability']
                           for r in preceding if r.get('preparedSha256')]
            if any(value != prepared['comparability'] for value in comparisons):
                emit(directory, record, 'abandon', note='Initial environment differs from earlier attempts; retain and clean up')
                return 1
            record['preparedSha256'] = sha256(directory / 'operator/prepared.json')
            emit(directory, record, 'prepared', evidence=evidence_link(directory / 'operator/prepared.json', directory))
            print('READY; total timer has not started')
        elif record['status'] not in TERMINAL:
            emit(directory, record, 'abandon', note='Preparation failed; inspect retained diagnostics')
        return 0 if code == 0 else 1


def detection_from(folder, task, record, mechanism):
    receipt = folder / 'detection.json'
    if not receipt.exists() or record['detection'] or record['status'] in TERMINAL: return
    value = read(receipt)
    if value.get('scenario') != record['scenario'] or value.get('status') != 'ATTRIBUTED_DETECTION':
        raise ValueError('Malformed detection receipt')
    mark = value['at']
    record_event(record, 'detected', mark, mechanism=mechanism + ':' + value['control'], evidence=evidence_link(receipt, task))
    save(task, record)


def completion_outcome(folder, record, code):
    """Only an explicit, intact correction decision permits continued review."""
    try:
        receipt = folder / 'check-result.json'
        if receipt.is_symlink(): return 'error'
        value = read(receipt)
        if (value.get('schema') != 'manual-task-check/v1' or value.get('scenario') != record['scenario']
                or not isinstance(value.get('phase'), str) or not value['phase']): return 'error'
        if value.get('status') == 'INTEGRATION_ERROR': return 'error'
        proof = value['evidence']; path = folder / proof['path']
        if path.is_symlink() or not path.is_file() or sha256(path) != proof['sha256']: return 'error'
        if value['status'] == 'CORRECTION_REJECTED' and code in (42, 43): return 'unresolved'
        completion = folder / 'completion.json'
        if code == 0 and value['status'] == 'VALIDATED_COMPLETION' and path.resolve() == completion.resolve():
            result = read(completion)
            if result.get('status') == 'VALIDATED_COMPLETION' and result.get('scenario') == record['scenario']:
                return 'completed'
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        pass
    return 'error'


def run_command(args):
    task = managed(args.task)
    with locked(task):
        record = read(task / 'record.json')
        if args.command == 'status':
            review = effective_review(task, ROOT)
            value = summarize(record, clock())
            value.update(technicalStatus=record['status'], archivedHumanAcceptance=record['humanAcceptance'],
                         humanAcceptance=review['decision'], review=review, nextAction=next_action(record, review))
            print(json.dumps(value, indent=2)); return 0
        if args.command == 'recover':
            op = record.get('runningOperation')
            if record['status'] in TERMINAL: raise ValueError('Attempt is already closed')
            if not op: raise ValueError('No recorded interrupted operation; task unchanged')
            if op['bootId'] == clock()['bootId'] and op.get('processStart') is not None and process_identity(op['pid']) == op['processStart']:
                # The task lock is free: its Python owner has gone away. Stop only
                # the exact recorded process group, never a reused PID.
                if os.getpgid(op['pid']) != op['pid']: raise ValueError('Unexpected operation process group')
                os.killpg(op['pid'], signal.SIGTERM)
                for _ in range(30):
                    if process_identity(op['pid']) != op['processStart']: break
                    time.sleep(0.1)
                if process_identity(op['pid']) == op['processStart']: os.killpg(op['pid'], signal.SIGKILL)
            record.pop('runningOperation', None)
            detection_from(Path(op['directory']), task, record, 'automatic' if op['name'] == 'start' else 'manual')
            # Unknown termination time is not reconstructed as observed active time.
            record['interruption'] = {'observedAt': clock(), 'lastKnownEvent': record['events'][-1] if record['events'] else None,
                                      'timing': 'unknown after last event; incomplete attempt'}
            record['status'] = 'INCOMPLETE'
            if record.get('started'): record['ended'] = record['events'][-1]['at']
            save(task, record); print('INCOMPLETE; evidence retained; cleanup then prepare a new attempt'); return 0
        if args.command == 'cleanup':
            if record.get('runningOperation'): raise ValueError('Recover interrupted operation first')
            if record.get('cleanup') == 'completed':
                if not (task / 'SHA256SUMS.txt').exists(): task_checksums(task)
                print('CLEANUP_ALREADY_RECORDED'); return 0
            if record['status'] not in TERMINAL: emit(task, record, 'abandon', note='Closed by explicit cleanup')
            code, folder = operation(task, record, 'cleanup')
            if record['events'] and record['events'][-1]['at']['bootId'] != clock()['bootId']:
                record['cleanup'] = 'completed' if code == 0 else 'error'
                record['cleanupAfterReboot'] = {'at': clock(), 'evidence': evidence_link(folder / 'exit.json', task)}
                save(task, record)
            else:
                emit(task, record, 'cleanup', outcome='completed' if code == 0 else 'error', evidence=evidence_link(folder / 'exit.json', task))
            write_json(task / 'summary.json', summarize(record, record.get('ended') or clock()))
            if code == 0: task_checksums(task)
            print('CLEANUP_COMPLETE' if code == 0 else 'CLEANUP_FAILED; diagnostics retained')
            return 0 if code == 0 else 1
        if args.command == 'start':
            if record['status'] != 'READY':
                raise ValueError('Start requires READY; current status is ' + record['status'] + '. Clean up failed/interrupted attempts and prepare a new task')
            guard_task(task, record)
        if record.get('started') and remaining(record) == 0 and record['status'] not in TERMINAL:
            emit(task, record, 'expire', note='Window exhausted before requested command')
            print(json.dumps(summarize(record, clock()), indent=2)); return 2
        if args.command == 'event':
            emit(task, record, args.kind, note=args.note)
            print('EVENT_RECORDED ' + args.kind); return 0
        if args.command == 'start':
            emit(task, record, 'start')
            code, folder = operation(task, record, 'start')
            detection_from(folder, task, record, 'automatic')
            if record['status'] not in TERMINAL:
                record_event(record, 'automatic-finished', read(folder / 'exit.json')['finished'],
                             outcome='completed' if code == 0 else 'blocked' if code == 42 and record['detection'] else 'error',
                             evidence=evidence_link(folder / 'exit.json', task))
                save(task, record)
                print('HUMAN_REVIEW_STARTED' if code in (0, 42) else 'INCOMPLETE')
        elif args.command == 'tool':
            emit(task, record, 'tool-started', tool=args.tool)
            try: guard_task(task, record)
            except (ValueError, OSError):
                emit(task, record, 'tool-finished', tool=args.tool, exitCode=1, note='Configuration check failed before tool invocation')
                emit(task, record, 'abandon', note='Source/configuration drift; evidence retained')
                raise
            code, folder = operation(task, record, 'tool', args.tool)
            detection_from(folder, task, record, 'manual')
            if record['status'] not in TERMINAL:
                emit(task, record, 'tool-finished', tool=args.tool, exitCode=code, evidence=evidence_link(folder / 'exit.json', task))
            print('TOOL_RECORDED; inspect its evidence before resuming active work')
        elif args.command == 'check':
            if not record['detection']: raise ValueError('Record verifiable detection with the applicable manual tool before completion checking')
            emit(task, record, 'verification-started')
            try: guard_task(task, record)
            except (ValueError, OSError):
                emit(task, record, 'verification-finished', outcome='error', note='Configuration check failed before verification')
                raise
            code, folder = operation(task, record, 'check')
            if record['status'] not in TERMINAL:
                outcome = completion_outcome(folder, record, code)
                receipt = folder / 'check-result.json'
                evidence = receipt if receipt.is_file() and not receipt.is_symlink() else folder / 'exit.json'
                record_event(record, 'verification-finished', read(folder / 'exit.json')['finished'],
                             outcome=outcome, exitCode=code, evidence=evidence_link(evidence, task))
                save(task, record)
            if record['status'] == 'REVIEW':
                print('CORRECTION_REJECTED; task remains REVIEW; completion has not been validated')
                print('CHECK_RESULT ' + str(folder / 'check-result.json'))
                print('Inspect the linked diagnostics and continue within the same timer/window; '
                      'cleanup now closes this unresolved attempt as INCOMPLETE')
            else:
                print('VALIDATED_COMPLETION' if record['status'] == 'COMPLETED' else record['status'])
        print(json.dumps(summarize(record, clock()), indent=2))
        return 0 if record['status'] not in ('INCOMPLETE', 'EXHAUSTED') else 2


def review_command(args):
    task = managed(args.task)
    # Same lock order as freeze: session first, then task. No timed operation,
    # plan loading or current-checkout identity check is used for historical review.
    with locked(task.parent.parent), locked(task):
        path = record_review(task, ROOT, reviewer=args.reviewer, rationale=args.rationale,
                             decision=args.decision, purpose=args.purpose, assistance=args.assistance,
                             supersedes=args.supersedes)
        review = effective_review(task, ROOT)
    print('REVIEW_RECORDED ' + str(path))
    print('CALIBRATION_ELIGIBLE' if review['eligibleForCalibration'] else 'CALIBRATION_INELIGIBLE ' + ', '.join(review['reasons']))
    print('Original archived humanAcceptance is unchanged; status displays this explicit review')
    return 0


def calibration_selection(task, path, plan):
    record, _ = sealed_task(task, ROOT)
    if record['dataset'] != 'calibration' or record['synthetic'] or record['status'] != 'COMPLETED':
        raise ValueError('Use completed, cleaned-up real human calibration records')
    if record['plan'] != str(path) or record['identity'] != {k: plan[k] for k in ['source', 'database', 'tools', 'environment']}:
        raise ValueError('Calibration configuration mismatch')
    review = effective_review(task, ROOT)
    if not review['eligibleForCalibration']:
        raise ValueError('Calibration needs an eligible human review: ' + ', '.join(review['reasons']))
    return {'scenario': record['scenario'], 'arm': record['arm'],
            **evidence_link(task / 'record.json', path.parent),
            'review': evidence_link(Path(review['path']), path.parent)}


def validate_frozen_reviews(path, plan):
    decision = plan['limitsReview']
    if decision.get('schema') != 'manual-limit-review/v2':
        raise ValueError('Frozen limits lack explicit calibration review metadata; use a new plan')
    selections = decision.get('calibrations', [])
    covered = set()
    for selected in selections:
        record_path = managed(path.parent / selected['path'])
        if record_path.name != 'record.json': raise ValueError('Invalid frozen calibration record reference')
        current = calibration_selection(record_path.parent, path, plan)
        if current != selected:
            raise ValueError('Frozen calibration review or evidence changed; preserve the decision and use a new plan')
        pair = (current['scenario'], current['arm'])
        if pair in covered: raise ValueError('Duplicate frozen calibration selection')
        covered.add(pair)
    if covered != {(s, a) for s in SCENARIOS for a in ('R', 'G')} or len(selections) != 6:
        raise ValueError('Frozen review requires exactly six unambiguous calibration combinations')


def freeze_command(args):
    reviewer, rationale = args.reviewer.strip(), args.rationale.strip()
    if not reviewer or not rationale: raise ValueError('Supply a nonblank reviewer and calibration rationale')
    path, plan = load_plan(args.plan)
    with locked(path.parent):
        if plan['limitsReview'] or list((path.parent / 'measurement').glob('task-*')):
            raise ValueError('Limits are immutable after freezing or measurement preparation')
        covered = set(); sources = []
        for task in args.calibration:
            task = managed(task); record = read(task / 'record.json')
            if record['dataset'] != 'calibration' or record['synthetic'] or record['status'] != 'COMPLETED' or record.get('cleanup') != 'completed':
                raise ValueError('Use completed, cleaned-up real human calibration records')
            pair = (record['scenario'], record['arm'])
            if pair in covered: raise ValueError('Duplicate calibration selection for ' + '/'.join(pair))
            with locked(task):
                sources.append(calibration_selection(task, path, plan))
            covered.add(pair)
        if covered != {(s, a) for s in SCENARIOS for a in ['R', 'G']}:
            raise ValueError('Human calibration is required for all six tasks')
        limits = {}
        for item in args.limit:
            scenario, seconds = item.split('=', 1)
            if scenario not in SCENARIOS or scenario in limits: raise ValueError('One limit per scenario')
            value = float(seconds)
            if not 0 < value < float('inf'): raise ValueError('Limits must be positive finite seconds')
            limits[scenario] = value
        if set(limits) != set(SCENARIOS): raise ValueError('Supply F03, F10 and F11 limits')
        plan['limitsSeconds'] = limits
        plan['limitsReview'] = {'schema': 'manual-limit-review/v2', 'reviewer': reviewer, 'rationale': rationale,
                                'at': clock(), 'calibrations': sources}
        frozen = path.with_name('frozen-plan.json')
        if frozen.exists(): raise ValueError('Frozen plan already exists')
        write_json(frozen, plan)
        write_json(path, plan)
    print('LIMITS_FROZEN; each scenario uses the same total-duration limit in R and G')


def main():
    def interrupted(*_):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, interrupted)
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('plan'); p.add_argument('--seed', required=True); p.add_argument('--output', required=True)
    p.add_argument('--database', required=True); p.add_argument('--editor', required=True)
    p.add_argument('--reuse', action='store_true', help='Reuse an existing plan only if its inputs and identities still match')
    p = sub.add_parser('prepare'); p.add_argument('--plan', required=True)
    p.add_argument('--dataset', choices=['calibration', 'measurement'], default='calibration')
    p.add_argument('--scenario', choices=SCENARIOS, required=True); p.add_argument('--arm', choices=['R', 'G'], required=True)
    p.add_argument('--participant', required=True); p.add_argument('--prior-knowledge', required=True)
    p.add_argument('--follow', action='store_true', help='Display preparation logs while retaining the original command.log')
    for name in ['start', 'status', 'check', 'cleanup', 'recover', 'event', 'tool']:
        p = sub.add_parser(name); p.add_argument('task')
        if name == 'event':
            p.add_argument('kind', choices=['investigate', 'correct', 'wait', 'pause', 'interrupt', 'abandon', 'expire']); p.add_argument('--note', required=True)
        if name == 'tool': p.add_argument('tool', choices=['scan', 'provenance', 'manifest'])
    p = sub.add_parser('review', help='Record a person\'s explicit declarations after closure and cleanup')
    p.add_argument('task'); p.add_argument('--reviewer', required=True); p.add_argument('--rationale', required=True)
    p.add_argument('--decision', choices=DECISIONS, required=True)
    p.add_argument('--purpose', choices=PURPOSES, required=True,
                   help='Declared purpose; measurement requires a measurement task and is never calibration-eligible')
    p.add_argument('--assistance', choices=ASSISTANCE, required=True,
                   help='Declared assistance during the task; none means unaided use of conventional tools')
    p.add_argument('--supersedes', help='Exact current review path when explicitly revising a decision')
    p = sub.add_parser('freeze-limits'); p.add_argument('--plan', required=True); p.add_argument('--limit', action='append', required=True)
    p.add_argument('--calibration', action='append', required=True); p.add_argument('--reviewer', required=True); p.add_argument('--rationale', required=True)
    args = parser.parse_args()
    try:
        if args.command == 'plan': return plan_command(args)
        if args.command == 'prepare': return prepare_command(args)
        if args.command == 'freeze-limits': return freeze_command(args)
        if args.command == 'review': return review_command(args)
        return run_command(args)
    except (ValueError, OSError, KeyError, subprocess.CalledProcessError) as error:
        print('ERROR: ' + str(error), file=sys.stderr); return 1


if __name__ == '__main__':
    sys.exit(main())
