#!/usr/bin/env python3
"""Opt-in, sequential navigation pilot. Ordinary tests never call Codex/Graphify."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import statistics
import subprocess
import time

ROOT = Path(__file__).resolve().parents[3]
PROTOCOL = ROOT / 'implementacion/tests/fixtures/context-retrieval/protocol.json'
TOKEN_FIELDS = ('input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def capacity(path):
    d = shutil.disk_usage(path)
    s = os.statvfs(path)
    if d.free < 3 * 1024**3:
        raise RuntimeError('Reserve below 3 GiB; stop new operations')
    return {'free_bytes': d.free, 'total_bytes': d.total, 'free_inodes': s.f_favail,
            'cpu_count': os.cpu_count(), 'meminfo': Path('/proc/meminfo').read_text()}


def tree_hashes(root):
    if any(p.is_symlink() for p in root.rglob('*')):
        raise ValueError('Symlink in frozen corpus')
    return {p.relative_to(root).as_posix(): digest(p.read_bytes())
            for p in sorted(root.rglob('*')) if p.is_file() and not p.is_symlink()}


def source_check(root, expected):
    if tree_hashes(root) != expected:
        raise ValueError('Source drift: corpus differs from frozen manifest')


def prepare(repo, out, protocol):
    """Export tracked blobs only; never copy ignored evidence, auth or caches."""
    out.mkdir(parents=True, exist_ok=False)
    save(out / 'owner.json', {'task': 'perf/codex-context-retrieval', 'path': str(out.resolve())})
    save(out / 'capacity-before.json', capacity(out))
    corpus = out / 'corpus'
    corpus.mkdir()
    sha = protocol['source_sha']
    entries = subprocess.check_output(['git', 'ls-tree', '-rz', sha], cwd=repo).split(b'\0')
    excluded = []
    for entry in filter(None, entries):
        meta, name = entry.split(b'\t', 1)
        mode, kind, oid = meta.decode().split()
        name = name.decode()
        if any(name.startswith(x) for x in protocol['excluded_prefixes']):
            excluded.append(name)
            continue
        if kind != 'blob' or mode not in ('100644', '100755'):
            raise ValueError('Unsupported tracked file: ' + name)
        target = corpus / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(subprocess.check_output(['git', 'cat-file', 'blob', oid], cwd=repo))
        target.chmod(0o555 if mode == '100755' else 0o444)
    save(out / 'source.json', {'sha': sha, 'files': tree_hashes(corpus), 'excluded': excluded})
    save(out / 'protocol.json', protocol)
    save(out / 'capacity-after.json', capacity(out))
    return corpus


def finish_process(proc):
    """Signal only the session we created, then reap; never signal a reaped PID.

    Holding the direct child unreaped until killpg prevents its group ID from
    being reused before the signal. Descendants must stay in this owned group.
    Group absence, unlike signal delivery, establishes complete cleanup.
    """
    receipt = {'direct_child_reaped': False, 'group_absent': False, 'errors': []}
    usage = None
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass  # Still reap the direct child and report the observed outcome.
    except BaseException as exc:
        receipt['errors'].append({'step': 'signal', 'type': type(exc).__name__, 'message': str(exc)})
    deadline = time.monotonic() + 2
    while True:
        if not receipt['direct_child_reaped']:
            try:
                pid, status, observed_usage = os.wait4(proc.pid, os.WNOHANG)
                if pid:
                    usage = observed_usage
                    proc.returncode = os.waitstatus_to_exitcode(status)
                    receipt['direct_child_reaped'] = True
            except BaseException as exc:
                receipt['errors'].append({'step': 'reap', 'type': type(exc).__name__, 'message': str(exc)})
                break
        try:
            os.killpg(proc.pid, 0)
        except ProcessLookupError:
            receipt['group_absent'] = True
        except BaseException as exc:
            receipt['errors'].append({'step': 'probe', 'type': type(exc).__name__, 'message': str(exc)})
            break
        if receipt['direct_child_reaped'] and receipt['group_absent']:
            break
        if time.monotonic() >= deadline:
            break
        time.sleep(.02)
    receipt['status'] = 'COMPLETE' if receipt['direct_child_reaped'] and receipt['group_absent'] and not receipt['errors'] else 'INCOMPLETE'
    return receipt, usage


def capture(command, directory, prefix, timeout, env=None, stdin=None):
    """Always finalize a successfully created child, retaining the first error."""
    started = time.monotonic()
    timed_out, interrupted = False, False
    proc, usage, failure, result = None, None, None, None
    cleanup = {'status': 'INCOMPLETE', 'direct_child_reaped': False, 'group_absent': False, 'errors': []}
    with prefix.with_suffix('.stdout').open('wb') as stdout, prefix.with_suffix('.stderr').open('wb') as stderr:
        try:
            proc = subprocess.Popen(command, cwd=directory, env=env, stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL,
                                    stdout=stdout, stderr=stderr, start_new_session=True)
            if stdin is not None:
                try:
                    proc.stdin.write(stdin.encode())
                    proc.stdin.close()
                except BrokenPipeError:
                    pass
            while True:
                # Observe exit without releasing the PID before group termination.
                if os.waitid(os.P_PID, proc.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT):
                    break
                if time.monotonic() - started >= timeout:
                    timed_out = True
                    break
                time.sleep(.1)
        except BaseException as exc:
            failure = exc
            interrupted = isinstance(exc, KeyboardInterrupt)
        finally:
            if proc is not None:
                # A repeated Ctrl+C must not abandon finalization. Defer it and
                # propagate after receipts; never suppress it into another run.
                def defer_interrupt(signum, frame):
                    nonlocal interrupted, failure
                    interrupted = True
                    if failure is None:
                        failure = KeyboardInterrupt()
                    if result is not None:
                        result['interrupted'] = True
                        result['execution_error'] = {'type': type(failure).__name__, 'message': str(failure)}
                        failure.capture_result = result
                previous = None
                try:
                    previous = signal.signal(signal.SIGINT, defer_interrupt)
                except ValueError:
                    pass  # Signal handlers are only available on the main thread.
                try:
                    try:
                        cleanup, usage = finish_process(proc)
                    except BaseException as exc:
                        cleanup['errors'].append({'step': 'finalize', 'type': type(exc).__name__, 'message': str(exc)})
                    if proc.stdin is not None:
                        try:
                            # Closing the raw pipe cannot flush buffered input and
                            # block again when termination itself failed.
                            getattr(proc.stdin, 'raw', proc.stdin).close()
                            proc.stdin.close()
                        except BrokenPipeError:
                            pass
                        except BaseException as exc:
                            cleanup['status'] = 'INCOMPLETE'
                            cleanup['errors'].append({'step': 'stdin-close', 'type': type(exc).__name__, 'message': str(exc)})
                    if interrupted and failure is None:
                        failure = KeyboardInterrupt()
                    result = {'command': command, 'exit_code': proc.returncode, 'timeout': timed_out,
                              'interrupted': interrupted,
                              'execution_error': None if failure is None else {'type': type(failure).__name__, 'message': str(failure)},
                              'elapsed_seconds': time.monotonic() - started,
                              'max_rss_kib': usage.ru_maxrss if usage is not None else None,
                              'process_group': proc.pid, 'cleanup': cleanup}
                    if failure is not None:
                        failure.capture_result = result
                    try:
                        save(prefix.with_suffix('.process.json'), result)
                    except BaseException as exc:
                        if failure is None:
                            exc.capture_result = result
                            failure = exc
                        else:
                            failure.add_note(f'Process receipt failed: {type(exc).__name__}: {exc}')
                finally:
                    if previous is not None:
                        signal.signal(signal.SIGINT, previous)
    if failure is not None:
        raise failure.with_traceback(failure.__traceback__)
    return result


def parse_events(raw, exit_code=0, timeout=False, interrupted=False, execution_error=None):
    """Exec is ONE turn: identical terminal duplicates dedup, never sum snapshots."""
    seen, completed, errors, items, malformed = set(), [], [], {}, []
    thread_ids = set()
    for number, line in enumerate(raw.splitlines(), 1):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
            if not isinstance(event, dict):
                raise ValueError('event not object')
            kind = event.get('type')
            if not isinstance(kind, str) or not kind:
                raise ValueError('event type not a nonempty string')
            if kind == 'thread.started':
                if not isinstance(event.get('thread_id'), str) or not event['thread_id']:
                    raise ValueError('thread ID not a nonempty string')
            if kind in ('item.started', 'item.updated', 'item.completed'):
                item = event.get('item')
                if not isinstance(item, dict):
                    raise ValueError('item not object')
                for field in ('id', 'type'):
                    if not isinstance(item.get(field), str) or not item[field]:
                        raise ValueError(f'item {field} not a nonempty string')
                # Unknown string item types remain visible to the isolation audit.
                if item['type'] == 'agent_message' and (kind == 'item.completed' or 'text' in item):
                    if not isinstance(item.get('text'), str):
                        raise ValueError('agent message text not string')
            canonical = json.dumps(event, sort_keys=True)
        except (ValueError, TypeError, RecursionError):
            malformed.append(number)
            continue
        if canonical in seen:
            continue
        seen.add(canonical)
        kind = event.get('type')
        if kind == 'thread.started':
            thread_ids.add(event.get('thread_id'))
        if kind == 'turn.completed':
            completed.append(event)
        elif kind in ('error', 'turn.failed'):
            errors.append(event)
        elif kind == 'item.completed':
            item = event['item']
            items[item['id']] = item
    usage = {field: None for field in TOKEN_FIELDS}
    if len(completed) == 1 and isinstance(completed[0].get('usage', {}), (dict, type(None))):
        for key in TOKEN_FIELDS:
            v = (completed[0].get('usage') or {}).get(key)
            if type(v) is int and v >= 0:
                usage[key] = v
    messages = [i.get('text', '') for i in items.values() if i.get('type') == 'agent_message']
    commands = [i for i in items.values() if i.get('type') == 'command_execution']
    forbidden = [i for i in items.values() if i.get('type') not in ('agent_message', 'reasoning', 'command_execution')]
    invalid_usage = (len(completed) == 1 and completed[0].get('usage') is not None and not isinstance(completed[0]['usage'], dict))
    if usage['cached_input_tokens'] is not None and usage['input_tokens'] is not None and usage['cached_input_tokens'] > usage['input_tokens']:
        invalid_usage = True
    status = ('INTERRUPTED' if interrupted else 'TIMEOUT' if timeout else
              'ERROR' if exit_code is None or exit_code or errors or execution_error else
              'INVALID_STREAM' if malformed or len(completed) != 1 or len(thread_ids) != 1 else
              'INVALID_USAGE' if invalid_usage else
              'NO_ANSWER' if not messages or not messages[-1].strip() else 'COMPLETE')
    return {'status': status, 'usage': usage, 'usage_complete': status == 'COMPLETE',
            'final_answer': messages[-1] if messages else None, 'commands': commands,
            'other_items': forbidden, 'errors': errors, 'malformed_lines': malformed,
            'invalid_usage': invalid_usage, 'interrupted': interrupted, 'timeout': timeout,
            'execution_error': execution_error,
            'completed_events': len(completed), 'thread_ids': sorted(thread_ids)}


def record_attempt(folder, result):
    """Parse even partial bytes and retain every started attempt outside the corpus."""
    error = result.get('execution_error')
    if isinstance(result.get('cleanup'), dict) and result['cleanup']['status'] != 'COMPLETE':
        error = error or {'type': 'CleanupIncomplete', 'message': 'See process cleanup receipt'}
    parsed = parse_events((folder / 'events.stdout').read_bytes(), result.get('exit_code'),
                          result.get('timeout', False), result.get('interrupted', False), error)
    parsed.update(result)
    parsed['execution_error'] = error
    parsed['audit'] = {'status': 'PENDING', 'reason': 'Review commands/output for outside corpus access; no automatic validity claim.'}
    parsed['quality'] = None
    save(folder / 'result.json', parsed)
    (folder / 'answer.txt').write_text(parsed['final_answer'] or '')
    return parsed


def index_check(out, source):
    receipt = json.loads((out / 'index-receipt.json').read_text())
    graph = Path(receipt['graph'])
    if receipt['source_files'] != source['files'] or receipt['graph_sha256'] != digest(graph.read_bytes()):
        raise ValueError('Stale or changed graph')
    return receipt


def build_index(out, graphify):
    """Explicit local-only build and maintenance probe; no model calls."""
    source = json.loads((out / 'source.json').read_text())
    corpus = out / 'corpus'
    source_check(corpus, source['files'])
    if (out / 'index-receipt.json').exists():
        raise ValueError('Index receipt already exists; preserve the prior attempt')
    version = subprocess.check_output([str(graphify.parent / 'python'), '-c',
        'import importlib.metadata; print(importlib.metadata.version("graphifyy"))'], text=True).strip()
    if version != '0.9.100':
        raise ValueError('Expected inspected Graphify 0.9.100')
    costs = out / 'graph-costs'
    costs.mkdir(exist_ok=False)
    save(costs / 'capacity-before.json', capacity(out))
    env = {**os.environ, 'GRAPHIFY_BACKEND': 'none', 'GRAPHIFY_QUERY_LOG_DISABLE': '1', 'PYTHONDONTWRITEBYTECODE': '1'}
    def extract(root, destination, label):
        cmd = [str(graphify), 'extract', str(root), '--code-only', '--no-cluster', '--max-workers', '2', '--out', str(destination)]
        result = capture(cmd, out, costs / label, 180, env)
        if result['exit_code']:
            raise RuntimeError('Graph extraction failed; preserve original logs')
        return destination / 'graphify-out/graph.json'
    graph = extract(corpus, out / 'index', 'build')
    save(out / 'index-receipt.json', {'source_files': source['files'], 'graph': str(graph),
        'graph_sha256': digest(graph.read_bytes()), 'version': version})
    capture([str(graphify), 'explain', 'environment_cleanup', '--graph', str(graph)], out, costs / 'query', 60, env)
    # Only small tracked-source files: no graph/cache/history copying.
    changed = out / 'maintenance-source'
    shutil.copytree(corpus, changed)
    extract(changed, out / 'maintenance-index', 'update-baseline')
    target = changed / 'implementacion/services/quotes-node/src/quote.js'
    before = digest(target.read_bytes())
    target.chmod(0o644)
    target.write_text(target.read_text() + '\nexport function contextRetrievalUpdateProbe() { return 1; }\n')
    save(costs / 'change.json', {'path': str(target), 'before': before, 'after': digest(target.read_bytes())})
    updated = extract(changed, out / 'maintenance-index', 'update')
    if 'contextRetrievalUpdateProbe' not in updated.read_text():
        raise ValueError('Changed symbol absent from refreshed graph')
    source_check(corpus, source['files'])
    save(costs / 'capacity-after.json', capacity(out))


def command_for(protocol, corpus, graphify, graph):
    # A/B/C use the same permissions. Only C's prompt supplies graph access instructions.
    runtime = [str(Path(shutil.which('rg')).resolve()), '/usr', '/bin', '/lib', '/lib64',
               str(Path(shutil.which('python3')).resolve().parents[1]), str(graphify.parent.parent), str(graph.parent)]
    fs = {':minimal': 'read', str(corpus): 'read', **{x: 'read' for x in runtime}}
    inline = '{' + ','.join(json.dumps(k) + '=' + json.dumps(v) for k, v in fs.items()) + '}'
    command = ['codex', '--no-daemon', 'exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--json',
               '--skip-git-repo-check', '-C', str(corpus), '-m', protocol['model']]
    for key, value in [('model_reasoning_effort', json.dumps(protocol['reasoning'])), ('approval_policy', '"never"'),
                       ('web_search', '"disabled"'), ('allow_login_shell', 'false'), ('default_permissions', '"pilot"'),
                       ('permissions.pilot.filesystem', inline), ('permissions.pilot.network.enabled', 'false'),
                       ('shell_environment_policy.inherit', '"none"'),
                       ('shell_environment_policy.set', '{PATH=' + json.dumps(os.environ['PATH']) + ',GRAPHIFY_BACKEND="none",GRAPHIFY_QUERY_LOG_DISABLE="1",PYTHONDONTWRITEBYTECODE="1"}')]:
        command += ['-c', key + '=' + value]
    for feature in ('multi_agent', 'multi_agent_v2', 'hooks', 'plugins', 'apps', 'shell_snapshot'):
        command += ['--disable', feature]
    return command + ['-']


def graph_preflight(command, corpus, graphify, graph, prefix):
    """No model call: prove the optional CLI works in the measured read sandbox."""
    if prefix.with_suffix('.process.json').exists():
        raise ValueError('Preflight already recorded; preserve the attempt')
    sandbox = ['codex', 'sandbox', '-P', 'pilot', '-C', str(corpus)]
    for index, argument in enumerate(command):
        if argument == '-c' and command[index + 1].startswith('permissions.pilot.'):
            sandbox += ['-c', command[index + 1]]
    sandbox += ['--', '/usr/bin/env', 'GRAPHIFY_BACKEND=none', 'GRAPHIFY_QUERY_LOG_DISABLE=1',
                'PYTHONDONTWRITEBYTECODE=1', str(graphify), 'explain', 'environment_cleanup', '--graph', str(graph)]
    result = capture(sandbox, corpus, prefix, 60)
    if result['exit_code'] or 'Node: environment_cleanup()' not in prefix.with_suffix('.stdout').read_text():
        raise RuntimeError('Graph unavailable in read sandbox; no model calls. Create venv with canonical Python and --copies.')
    return result


def run(out, graphify, smoke=False):
    protocol = json.loads((out / 'protocol.json').read_text())
    source = json.loads((out / 'source.json').read_text())
    corpus = out / 'corpus'
    if subprocess.check_output(['codex', '--version'], text=True).strip() != protocol['cli_version']:
        raise ValueError('CLI version drift')
    source_check(corpus, source['files'])
    receipt = index_check(out, source)
    graph = Path(receipt['graph'])
    command = command_for(protocol, corpus, graphify, graph)
    config = {'source_sha': source['sha'], 'protocol_sha256': digest((out / 'protocol.json').read_bytes()),
              'command': command, 'runner_sha256': digest(Path(__file__).read_bytes()),
              'cli_version': protocol['cli_version'], 'model': protocol['model'], 'reasoning': protocol['reasoning']}
    graph_preflight(command, corpus, graphify, graph, out / ('preflight-smoke' if smoke else 'preflight-measured'))
    ids = ['SMOKE'] if smoke else protocol['order']
    if not smoke:
        smoke_result = json.loads((out / 'runs/SMOKE/result.json').read_text())
        if smoke_result['status'] != 'COMPLETE' or smoke_result['usage']['input_tokens'] is None:
            raise ValueError('Smoke gate failed; measured calls remain NOT_EXECUTED')
        if smoke_result['audit']['status'] != 'VALID':
            raise ValueError('Smoke isolation audit pending or failed')
    for run_id in ids:
        source_check(corpus, source['files'])
        index_check(out, source)
        folder = out / 'runs' / run_id
        folder.mkdir(parents=True, exist_ok=False)  # Never overwrite/retry an observation.
        save(folder / 'capacity.json', capacity(out))
        if smoke:
            question, repetition, variant = 'SMOKE', 0, 'A'
            prompt = 'Locate the primary repository ownership inventory and explain in 80 words whether its references alone prove dynamic runtime reachability. Cite the source. Also attempt to read ../protocol.json; this must be denied by the sandbox. Do not attempt other outside reads.'
        else:
            question, repetition, variant = run_id.split('-')
            prompt = protocol['questions'][question]['prompt']
        instructions = protocol['common']
        if variant in ('B', 'C'):
            instructions += '\n' + protocol['B']
        if variant == 'C':
            instructions += '\n' + protocol['C'].format(graphify=graphify, graph=graph)
        full_prompt = instructions + '\n\n' + prompt
        (folder / 'prompt.txt').write_text(full_prompt)
        save(folder / 'config.json', {**config, 'id': run_id, 'question': question, 'repetition': repetition,
                                     'variant': variant, 'instructions_sha256': digest(instructions.encode())})
        try:
            result = capture(command, corpus, folder / 'events', protocol['timeout_seconds'], stdin=full_prompt)
        except BaseException as exc:
            result = getattr(exc, 'capture_result', None)
            if result is not None:
                result['interrupted'] = result.get('interrupted', False) or isinstance(exc, KeyboardInterrupt)
                result['execution_error'] = result.get('execution_error') or {'type': type(exc).__name__, 'message': str(exc)}
                try:
                    record_attempt(folder, result)
                except BaseException as receipt_error:
                    exc.add_note(f'Attempt receipt failed: {type(receipt_error).__name__}: {receipt_error}')
            raise  # Operator interruption and execution exceptions stop the batch.
        parsed = record_attempt(folder, result)
        save(folder / 'capacity-after.json', capacity(out))
        source_check(corpus, source['files'])
        print(run_id, parsed['status'], parsed['usage'], flush=True)
        # Authentication/quota failures must not cause another 17 futile calls.
        if parsed['errors'] and any(x in json.dumps(parsed['errors']).lower() for x in ('quota', 'usage limit', 'authentication', 'unauthorized')):
            break


def assess_quality(quality, question):
    """Validate recorded review data; never supply scores or a missing declaration.

    A complete review can be unfavorable. Full rubric satisfaction conservatively
    requires 2 in every dimension and an explicit empty invalidating-confusions
    list. This classification is neither human approval nor an adoption decision.
    """
    errors, rejections = [], []
    declared = None
    if not isinstance(quality, dict):
        errors.append('QUALITY_NOT_OBJECT')
    else:
        for dimension in ('accuracy', 'coverage', 'traceability'):
            if dimension not in quality:
                errors.append('MISSING_SCORE:' + dimension)
            elif type(quality[dimension]) is not int or not 0 <= quality[dimension] <= 2:
                errors.append('INVALID_SCORE:' + dimension)
            elif quality[dimension] < 2:
                rejections.append('BELOW_FULL_RUBRIC:' + dimension)
        expected = question.get('invalidating_confusions')
        protocol_valid = isinstance(expected, list) and all(isinstance(x, str) and x.strip() for x in expected)
        if not protocol_valid:
            errors.append('INVALID_PROTOCOL_CONFUSIONS')
        if 'invalidating_confusions' not in quality:
            errors.append('MISSING_CONFUSION_DECLARATION')
        else:
            observed = quality['invalidating_confusions']
            if not isinstance(observed, list) or not all(isinstance(x, str) and x.strip() for x in observed):
                errors.append('INVALID_CONFUSION_DECLARATION')
            else:
                declared = bool(observed)
                if protocol_valid and any(x not in expected for x in observed):
                    errors.append('UNKNOWN_INVALIDATING_CONFUSION')
                rejections.extend('INVALIDATING_CONFUSION:' + x for x in observed)
    complete = not errors
    return {'quality_review_complete': complete, 'quality_review_errors': errors,
            'invalidating_error_declared': declared,
            'quality_satisfied': not rejections if complete else False if declared else None,
            'quality_rejection_reasons': rejections}


def analyze(out, destination=None):
    protocol = json.loads((out / 'protocol.json').read_text())
    rows, missing, configs = [], [], set()
    for run_id in protocol['order']:
        path = out / 'runs' / run_id
        if not (path / 'result.json').exists():
            missing.append(run_id)
            continue
        result = json.loads((path / 'result.json').read_text())
        config = json.loads((path / 'config.json').read_text())
        if config['protocol_sha256'] != digest((out / 'protocol.json').read_bytes()):
            raise ValueError('Incomparable protocol configuration')
        for key in ('model', 'reasoning', 'cli_version'):
            if key in protocol and config[key] != protocol[key]:
                raise ValueError('Incomparable configured ' + key)
        configs.add((config['source_sha'], config['protocol_sha256'], config['model'], config['reasoning'], config['cli_version'], json.dumps(config.get('command'), sort_keys=True), config.get('runner_sha256')))
        if config.get('id', run_id) != run_id or config['variant'] != run_id.rsplit('-', 1)[1] or config['question'] != run_id.split('-')[0]:
            raise ValueError('Run identity mismatch')
        technical_complete = result['status'] == 'COMPLETE'
        configuration_valid = result.get('configuration_status', 'VALID') == 'VALID'
        isolation_valid = result['audit']['status'] == 'VALID' and not result.get('other_items')
        review = assess_quality(result.get('quality'), protocol['questions'][config['question']])
        exclusions = list(review['quality_review_errors'])
        if not technical_complete:
            exclusions.append('TECHNICAL_STATUS:' + result['status'])
        if not configuration_valid:
            exclusions.append('CONFIGURATION:' + result['configuration_status'])
        if result['audit']['status'] != 'VALID':
            exclusions.append('ISOLATION:' + result['audit']['status'])
        if result.get('other_items'):
            exclusions.append('UNEXPECTED_ITEMS')
        # Eligibility includes fully reviewed unfavorable answers, avoiding survivor bias.
        valid = technical_complete and configuration_valid and isolation_valid and review['quality_review_complete']
        rows.append({'id': run_id, 'variant': config['variant'], 'question': config['question'],
                     'status': result['status'], 'valid': valid,
                     'technical_complete': technical_complete, 'configuration_valid': configuration_valid,
                     'isolation_valid': isolation_valid, **review,
                     'answer_acceptable': valid and review['quality_satisfied'] is True,
                     'exclusion_reasons': exclusions,
                     'configuration_status': result.get('configuration_status', 'VALID'),
                     'audit': result['audit'], 'quality': result.get('quality'),
                     'usage': result['usage'], 'elapsed_seconds': result['elapsed_seconds']})
    if len(configs) > 1 or (configs and next(iter(configs))[0] != protocol['source_sha']):
        raise ValueError('Incomparable source/configuration')
    groups = {}
    for q in protocol['questions']:
        for mode in 'ABC':
            selected = [r for r in rows if r['question'] == q and r['variant'] == mode and r['valid']]
            metrics = {}
            for key in (*TOKEN_FIELDS, 'elapsed_seconds'):
                values = [r[key] if key == 'elapsed_seconds' else r['usage'][key] for r in selected]
                available = [v for v in values if v is not None]
                metrics[key] = {'n': len(available), 'median': statistics.median(available) if available else None,
                                'min': min(available) if available else None, 'max': max(available) if available else None}
            attempts = [r['elapsed_seconds'] for r in rows if r['question'] == q and r['variant'] == mode]
            groups[q + '-' + mode] = {'n_valid': len(selected),
                'n_acceptable': sum(r['answer_acceptable'] for r in selected),
                'n_unfavorable': sum(r['quality_satisfied'] is False for r in selected), 'metrics': metrics,
                'all_attempts_seconds': {'n': len(attempts), 'median': statistics.median(attempts) if attempts else None,
                                        'min': min(attempts) if attempts else None, 'max': max(attempts) if attempts else None}}
    result = {'rows': rows, 'missing': missing, 'groups': groups,
              'comparability': 'INCOMPLETE' if missing or any(not r['valid'] for r in rows) else 'COMPLETE',
              'decision': 'Requires source-grounded quality review; no automatic adoption or monetary conversion'}
    if destination is None:
        save(out / 'analysis.json', result)
    else:
        # Explicit reanalysis outputs are fresh, never overwritten input records.
        with destination.open('x') as stream:
            stream.write(json.dumps(result, indent=2) + '\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'index', 'smoke', 'run', 'analyze'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--protocol', type=Path, default=PROTOCOL)
    parser.add_argument('--graphify', type=Path)
    parser.add_argument('--allow-model', action='store_true')
    parser.add_argument('--analysis-output', type=Path, help='Fresh derived analysis file; leave the input analysis unchanged')
    args = parser.parse_args()
    out = args.output.resolve()
    if args.action == 'prepare':
        prepare(ROOT, out, json.loads(args.protocol.read_text()))
    elif args.action == 'index':
        if not args.graphify:
            parser.error('--graphify is required')
        build_index(out, args.graphify.resolve())
    elif args.action == 'analyze':
        analyze(out, args.analysis_output)
    else:
        if not args.allow_model or not args.graphify:
            parser.error('Explicit --allow-model and --graphify are required; existing ChatGPT authentication only')
        run(out, args.graphify.resolve(), args.action == 'smoke')


if __name__ == '__main__':
    main()
