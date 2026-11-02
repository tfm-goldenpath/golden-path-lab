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


def capture(command, directory, prefix, timeout, env=None, stdin=None):
    """One own process group; wait4 supplies actual child max RSS (KiB on Linux)."""
    started = time.monotonic()
    timed_out = False
    with prefix.with_suffix('.stdout').open('wb') as stdout, prefix.with_suffix('.stderr').open('wb') as stderr:
        proc = subprocess.Popen(command, cwd=directory, env=env, stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL,
                                stdout=stdout, stderr=stderr, start_new_session=True)
        if stdin is not None:
            try:
                proc.stdin.write(stdin.encode())
                proc.stdin.close()
            except BrokenPipeError:
                pass
        while True:
            pid, status, usage = os.wait4(proc.pid, os.WNOHANG)
            if pid:
                break
            if time.monotonic() - started >= timeout:
                timed_out = True
                os.killpg(proc.pid, signal.SIGKILL)
                pid, status, usage = os.wait4(proc.pid, 0)
                break
            time.sleep(0.1)
        proc.returncode = os.waitstatus_to_exitcode(status)
        # Kill remaining descendants even if their parent exited first.
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    result = {'command': command, 'exit_code': proc.returncode, 'timeout': timed_out,
              'elapsed_seconds': time.monotonic() - started, 'max_rss_kib': usage.ru_maxrss,
              'process_group': proc.pid, 'cleanup': 'own process group terminated'}
    save(prefix.with_suffix('.process.json'), result)
    return result


def parse_events(raw, exit_code=0, timeout=False):
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
        except (ValueError, TypeError):
            malformed.append(number)
            continue
        canonical = json.dumps(event, sort_keys=True)
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
            item = event.get('item', {})
            items[item.get('id', f'line-{number}')] = item
    usage = {field: None for field in TOKEN_FIELDS}
    if len(completed) == 1 and isinstance(completed[0].get('usage', {}), (dict, type(None))):
        for key in TOKEN_FIELDS:
            v = (completed[0].get('usage') or {}).get(key)
            if type(v) is int and v >= 0:
                usage[key] = v
    messages = [i.get('text', '') for i in items.values() if i.get('type') == 'agent_message']
    commands = [i for i in items.values() if i.get('type') == 'command_execution']
    forbidden = [i for i in items.values() if i.get('type') not in ('agent_message', 'reasoning', 'command_execution')]
    status = ('TIMEOUT' if timeout else 'ERROR' if exit_code or errors else
              'INVALID_STREAM' if malformed or len(completed) != 1 or len(thread_ids) != 1 else
              'NO_ANSWER' if not messages or not messages[-1].strip() else 'COMPLETE')
    if len(completed) == 1 and completed[0].get('usage') is not None and not isinstance(completed[0]['usage'], dict):
        status = 'INVALID_USAGE'
    if usage['cached_input_tokens'] is not None and usage['input_tokens'] is not None and usage['cached_input_tokens'] > usage['input_tokens']:
        status = 'INVALID_USAGE'
    return {'status': status, 'usage': usage, 'usage_complete': status == 'COMPLETE',
            'final_answer': messages[-1] if messages else None, 'commands': commands,
            'other_items': forbidden, 'errors': errors, 'malformed_lines': malformed,
            'completed_events': len(completed), 'thread_ids': sorted(str(x) for x in thread_ids)}


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
        result = capture(command, corpus, folder / 'events', protocol['timeout_seconds'], stdin=full_prompt)
        parsed = parse_events((folder / 'events.stdout').read_text(), result['exit_code'], result['timeout'])
        parsed.update(result)
        parsed['audit'] = {'status': 'PENDING', 'reason': 'Review commands/output for outside corpus access; no automatic validity claim.'}
        parsed['quality'] = None
        save(folder / 'result.json', parsed)
        (folder / 'answer.txt').write_text(parsed['final_answer'] or '')
        save(folder / 'capacity-after.json', capacity(out))
        source_check(corpus, source['files'])
        print(run_id, parsed['status'], parsed['usage'], flush=True)
        # Authentication/quota failures must not cause another 17 futile calls.
        if parsed['errors'] and any(x in json.dumps(parsed['errors']).lower() for x in ('quota', 'usage limit', 'authentication', 'unauthorized')):
            break


def analyze(out):
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
        if result.get('other_items'):
            result['audit'] = {'status': 'CONTAMINATED', 'reason': 'Unexpected tool/item requires explicit investigation'}
        valid = result['status'] == 'COMPLETE' and result['audit']['status'] == 'VALID' and result.get('quality') is not None and result.get('configuration_status', 'VALID') == 'VALID'
        rows.append({'id': run_id, 'variant': config['variant'], 'question': config['question'],
                     'status': result['status'], 'valid': valid, 'configuration_status': result.get('configuration_status', 'VALID'), 'audit': result['audit'], 'quality': result.get('quality'),
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
            groups[q + '-' + mode] = {'n_valid': len(selected), 'metrics': metrics,
                'all_attempts_seconds': {'n': len(attempts), 'median': statistics.median(attempts) if attempts else None,
                                        'min': min(attempts) if attempts else None, 'max': max(attempts) if attempts else None}}
    result = {'rows': rows, 'missing': missing, 'groups': groups,
              'comparability': 'INCOMPLETE' if missing or any(not r['valid'] for r in rows) else 'COMPLETE',
              'decision': 'Requires source-grounded quality review; no automatic adoption or monetary conversion'}
    save(out / 'analysis.json', result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'index', 'smoke', 'run', 'analyze'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--protocol', type=Path, default=PROTOCOL)
    parser.add_argument('--graphify', type=Path)
    parser.add_argument('--allow-model', action='store_true')
    args = parser.parse_args()
    out = args.output.resolve()
    if args.action == 'prepare':
        prepare(ROOT, out, json.loads(args.protocol.read_text()))
    elif args.action == 'index':
        if not args.graphify:
            parser.error('--graphify is required')
        build_index(out, args.graphify.resolve())
    elif args.action == 'analyze':
        analyze(out)
    else:
        if not args.allow_model or not args.graphify:
            parser.error('Explicit --allow-model and --graphify are required; existing ChatGPT authentication only')
        run(out, args.graphify.resolve(), args.action == 'smoke')


if __name__ == '__main__':
    main()
