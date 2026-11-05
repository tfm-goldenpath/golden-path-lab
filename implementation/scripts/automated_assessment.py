"""Technical assessment of retained scripted evidence; never human acceptance."""
import importlib
import json
from pathlib import Path

from manual_tasks import SCRIPTED, clock, elapsed, sha256, summarize
from manual_task_reviews import check_reference, sealed_task
from automated_repairs import verify_repair

CONTROLS = {'F03': 'scan', 'F10': 'provenance', 'F11': 'manifest'}
DIAGNOSTICS = {'PRIVILEGED: quotes-node must declare privileged=false',
               'ESCALATION: quotes-node must declare allowPrivilegeEscalation=false'}


def read(path):
    if path.is_symlink() or path.resolve() != path.absolute(): raise ValueError('Unsafe evidence path')
    return json.loads(path.read_text())


def require_detection(task, record, folder, mechanism):
    if mechanism != ('automatic' if record['arm'] == 'G' else 'scripted'):
        raise ValueError('G needs automatic detection; R needs a scripted diagnostic after delivery')
    receipt = read(folder / 'detection.json')
    request, finish = read(folder / 'request.json'), read(folder / 'exit.json')
    if any(value.get(k) != v for value in (receipt, request, finish) for k, v in SCRIPTED.items()):
        raise ValueError('Operation lost scripted execution identity')
    elapsed(request['started'], receipt['at']); elapsed(receipt['at'], finish['finished'])
    if (finish['exitCode'] != 42 or receipt.get('scenario') != record['scenario']
            or receipt.get('status') != 'ATTRIBUTED_DETECTION' or receipt.get('control') != CONTROLS[record['scenario']]):
        raise ValueError('Intended detection absent or operation failed for a different reason')
    check_reference(receipt['evidence'], folder)
    proof = read(folder / receipt['evidence']['path'])
    if record['scenario'] == 'F03':
        findings = proof.get('target', [])
        valid = (proof.get('status') == 'PASS' and proof.get('case') == 'F03-vulnerable' and findings
                 and all(v.get('VulnerabilityID') == 'CVE-2021-44906' and v.get('PkgName') == 'minimist'
                         and v.get('InstalledVersion') == '1.2.5' and v.get('Severity') == 'CRITICAL'
                         and '1.2.6' in v.get('FixedVersion', '').replace(' ', '').split(',') for v in findings))
    elif record['scenario'] == 'F10':
        valid = proof.get('status') == 'PROVENANCE_REPOSITORY_UNAUTHORIZED' and proof.get('inventoryComplete') is True
    else:
        valid = (proof.get('status') == 'PASS' and proof.get('detected') is True
                 and len(proof.get('diagnostics', [])) == 2 and set(proof['diagnostics']) == DIAGNOSTICS)
    if not valid: raise ValueError('Wrong-reason rejection or integration failure; intended detection unproven')
    return {'mechanism': mechanism + ':' + receipt['control'], 'evidence': str(folder / 'detection.json'),
            'sha256': sha256(folder / 'detection.json'), 'at': receipt['at']}


def require_order(task, record):
    operations = sorted((task / 'operations').glob('*'))
    starts = [p for p in operations if p.name.endswith('-start')]
    diagnostics = [p for p in operations if p.name.endswith('-tool')]
    if len(starts) != 1: raise ValueError('Exactly one delivery invocation required')
    if record['arm'] == 'G':
        if diagnostics: raise ValueError('Extra G diagnostic cannot replace automatic detection')
        folder = starts[0]
    else:
        if read(starts[0] / 'exit.json')['exitCode'] != 0:
            raise ValueError('Reference delivery must complete before diagnostic invocation')
        if len(diagnostics) != 1 or diagnostics[0].name < starts[0].name:
            raise ValueError('One scripted R diagnostic must follow reference delivery')
        elapsed(read(starts[0] / 'exit.json')['finished'], read(diagnostics[0] / 'request.json')['started'])
        folder = diagnostics[0]
    return require_detection(task, record, folder, 'automatic' if record['arm'] == 'G' else 'scripted')


def assess(task, implementation):
    cli = importlib.import_module('manual-tasks')
    record = read(task / 'record.json')
    result = {**SCRIPTED, 'scenario': record['scenario'], 'arm': record['arm'], 'task': str(task),
              'expectedDetection': ('automatic:' if record['arm'] == 'G' else 'scripted:') + CONTROLS[record['scenario']],
              'observedDetection': None, 'repair': None, 'completion': record['status'],
              'cleanup': record.get('cleanup', 'NOT_EXECUTED'), 'archiveIntegrity': 'NOT_VERIFIED',
              'assessment': 'INCOMPLETE', 'failures': [], 'timings': None, 'operations': [],
              'interruptions': {k: record[k] for k in ('interruption', 'interruptedOperation', 'operationalTimeout') if k in record},
              'fullyUnattended': False}
    try:
        _, binding = sealed_task(task, implementation)
        result.update(archiveIntegrity='PASS', evidence=binding)
    except (ValueError, OSError, KeyError, TypeError) as error: result['failures'].append('Integrity: ' + str(error))
    try: result['observedDetection'] = require_order(task, record)
    except (ValueError, OSError, KeyError, TypeError) as error: result['failures'].append('Detection: ' + str(error))
    try: result['repair'] = verify_repair(task, record)
    except (ValueError, OSError, KeyError, TypeError) as error: result['failures'].append('Repair: ' + str(error))
    try:
        checks = sorted((task / 'operations').glob('*-check'))
        if len(checks) != 1 or cli.completion_outcome(checks[0], record, read(checks[0] / 'exit.json')['exitCode']) != 'completed':
            raise ValueError('Completion receipt is absent or does not establish successful validation')
        if record['status'] != 'COMPLETED': raise ValueError('Task is not completed')
    except (ValueError, OSError, KeyError, TypeError) as error: result['failures'].append('Completion: ' + str(error))
    if record.get('cleanup') != 'completed': result['failures'].append('Owned resource cleanup not established')
    if record.get('humanIntervention'): result['failures'].append('Human intervention: excluded from fully unattended claims')
    if record.get('failure'): result['failures'].append(record['failure'])
    try: result['timings'] = summarize(record, record.get('ended') or clock())
    except ValueError: result['failures'].append('Clock discontinuity; elapsed time unknown')
    for folder in sorted((task / 'operations').iterdir()):
        operation = {'path': str(folder), 'elapsedSeconds': None}
        try:
            request = read(folder / 'request.json'); finish = read(folder / 'exit.json')
            operation.update(exitCode=finish['exitCode'], elapsedSeconds=elapsed(request['started'], finish['finished']))
        except (ValueError, OSError, KeyError): operation['interruption'] = 'Unknown end; never reconstructed'
        result['operations'].append(operation)
    if not result['failures']: result.update(assessment='VALIDATED', fullyUnattended=True)
    return result


def report(session, plan, implementation):
    rows, candidates, unassigned = [], [], []
    for path in session.glob('automated-validation/task-*/record.json'):
        try:
            value = read(path)
            if value.get('position') not in range(1, 7): raise ValueError('Unknown position')
            candidates.append((path.parent, value['position']))
        except (ValueError, OSError, AttributeError) as error:
            unassigned.append({'path': str(path), 'failure': str(error)})
    for position in plan['ordering']['sequence']:
        tasks = [p for p, number in candidates if number == position['position']]
        if len(tasks) > 1: raise ValueError('Duplicate attempts for a position; no silent retries')
        rows.append({**position, **(assess(tasks[0], implementation) if tasks else {
            **SCRIPTED, 'assessment': 'UNRESOLVED' if unassigned else 'NOT_EXECUTED', 'completion': 'NOT_EXECUTED', 'cleanup': 'NOT_EXECUTED',
            'archiveIntegrity': 'NOT_VERIFIED', 'expectedDetection': ('automatic:' if position['arm'] == 'G' else 'scripted:') + CONTROLS[position['scenario']],
            'observedDetection': None, 'repair': None, 'timings': None, 'failures': []})})
    value = {**SCRIPTED, 'schema': 'automated-remediation-report/v1', 'generated': clock(),
             'scope': 'Provisional automated technical evidence with known repairs; no human diagnosis, productivity, effort or autonomous repair discovery',
             'source': plan['source'], 'database': plan['database'], 'ordering': plan['ordering'],
             'operationalTimeoutSeconds': plan['operationalTimeoutSeconds'],
             'validated': sum(r['assessment'] == 'VALIDATED' for r in rows), 'planned': 6, 'combinations': rows,
             'unassignedEvidence': unassigned}
    lines = ['# Automated remediation validation', '', value['scope'] + '.', '',
             'Human acceptance: **pending**. Eligible for human calibration: **false**.', '',
             '| Combination | Expected detection | Observed | Repair | Completion | Cleanup | Integrity | Assessment |',
             '|---|---|---|---|---|---|---|---|']
    for row in rows:
        lines.append(f"| {row['scenario']}/{row['arm']} | {row['expectedDetection']} | {row['observedDetection']['mechanism'] if row['observedDetection'] else 'unproven'} | {'recorded' if row['repair'] else 'NOT_EXECUTED'} | {row['completion']} | {row['cleanup']} | {row['archiveIntegrity']} | {row['assessment']} |")
    for row in rows:
        lines += ['', f"## {row['scenario']}/{row['arm']}", '', 'Evidence: ' + row.get('task', 'NOT_EXECUTED')]
        if row.get('repair'):
            receipt = Path(row['task']) / 'operator/repair.json'
            lines += ['', 'Repair by automation: ' + row['repair']['transformation'] + '.',
                      f"[Repair timestamps and before/after hashes]({receipt}) — SHA256 `{sha256(receipt)}`."]
        if row.get('evidence'):
            lines += ['', 'Final task record SHA256: `' + row['evidence']['recordSha256'] + '`.',
                      'Final task checksum manifest SHA256: `' + row['evidence']['checksumsSha256'] + '`.']
            for archive in row['evidence']['archives']:
                path = (Path(row['task']) / archive['path']).resolve()
                lines += [f"[{path.name}]({path}) — SHA256 `{archive['sha256']}`."]
        if row.get('timings'): lines += ['', 'Automated timings and interruptions:', '```json', json.dumps({'timings': row['timings'], 'operations': row['operations'], 'interruptions': row['interruptions']}, indent=2), '```']
        lines += ['', *['- ' + failure.replace('\n', ' ') for failure in row['failures']]]
    if unassigned: lines += ['', 'Unassigned evidence (coverage unresolved):', '```json', json.dumps(unassigned, indent=2), '```']
    return value, '\n'.join(lines) + '\n'
