"""Synthetic events/processes only: no Codex quota, Graphify or network in CI."""
import importlib.util
import json
import os
import signal
import subprocess
import time
from unittest.mock import patch
from pathlib import Path
import sys
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('retrieval', Path(__file__).parents[1] / 'integration/context-retrieval.py')
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


def events(usage=None, answer=True):
    data = [{'type': 'thread.started', 'thread_id': 'synthetic'}]
    if answer:
        data.append({'type': 'item.completed', 'item': {'id': 'answer', 'type': 'agent_message', 'text': 'Synthetic answer'}})
    data.append({'type': 'turn.completed', 'usage': usage if usage is not None else {'input_tokens': 100, 'cached_input_tokens': 70, 'output_tokens': 10}})
    return '\n'.join(json.dumps(e) for e in data)


def synthetic_run(out, command, common='Synthetic instructions'):
    """Exercise the real coordinator/capture, replacing all external tools."""
    corpus = out / 'corpus'; corpus.mkdir()
    m.save(out / 'source.json', {'sha': 'synthetic', 'files': {}})
    m.save(out / 'protocol.json', {'cli_version': 'synthetic', 'model': 'none', 'reasoning': 'none',
        'order': ['Q1-1-A', 'Q1-2-A'], 'questions': {'Q1': {'prompt': 'Synthetic question'}},
        'common': common, 'timeout_seconds': 5})
    smoke = out / 'runs/SMOKE'; smoke.mkdir(parents=True)
    m.save(smoke / 'result.json', {'status': 'COMPLETE', 'usage': {'input_tokens': 1}, 'audit': {'status': 'VALID'}})
    with patch.object(m.subprocess, 'check_output', return_value='synthetic'), \
         patch.object(m, 'index_check', return_value={'graph': str(out / 'unused-graph')}), \
         patch.object(m, 'command_for', return_value=command), \
         patch.object(m, 'graph_preflight'), patch.object(m, 'capacity', return_value={}):
        m.run(out, out / 'unused-tool')


def process_identity(pid):
    # Linux /proc starttime plus PID/session prevents cleanup of a reused PID.
    fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
    return {'pid': pid, 'starttime': fields[19], 'session': int(fields[3])}


def interrupt_wrapper(out, large_prompt):
    """Isolated test supervisor: adopted grandchildren are reaped here, not CI."""
    import ctypes
    if ctypes.CDLL(None).prctl(36, 1, 0, 0, 0) != 0:  # PR_SET_CHILD_SUBREAPER, test only
        raise RuntimeError('Cannot enable test subreaper')
    original_popen = subprocess.Popen
    def spawn(*args, **kwargs):
        proc = original_popen(*args, **kwargs)
        m.save(out / 'spawn.json', process_identity(proc.pid))
        return proc
    try:
        with patch.object(m.subprocess, 'Popen', side_effect=spawn):
            synthetic_run(out, [sys.executable, str(out / 'worker.py'), str(out)],
                          'x' * (1024 * 1024) if large_prompt else 'short')
    except KeyboardInterrupt:
        m.save(out / 'propagated.json', {'exception': 'KeyboardInterrupt'})
        return 130
    finally:
        # capture has already killed its group. Reap only our recorded adoptee.
        if (out / 'owned.json').exists():
            owned = json.loads((out / 'owned.json').read_text())
            deadline = time.monotonic() + 2
            while time.monotonic() < deadline:
                try:
                    if os.waitpid(owned['grandchild']['pid'], os.WNOHANG)[0]:
                        break
                except ChildProcessError:
                    break
                time.sleep(.02)
    return 0


def stdin_timeout_wrapper(out):
    """A guarded process so a broken stdin deadline cannot hang unittest."""
    original_popen = subprocess.Popen
    def spawn(*args, **kwargs):
        proc = original_popen(*args, **kwargs)
        m.save(out / 'spawn.json', process_identity(proc.pid))
        return proc
    with patch.object(m.subprocess, 'Popen', side_effect=spawn):
        result = m.capture([sys.executable, '-c', 'import time; print("ready",flush=True); time.sleep(5)'],
                           out, out / 'timeout', .2, stdin='x' * (2 * 1024 * 1024))
    m.save(out / 'returned.json', result)


class RetrievalTests(unittest.TestCase):
    def test_cached_is_subset_not_additional(self):
        r = m.parse_events(events())
        self.assertEqual(r['status'], 'COMPLETE')
        self.assertEqual(r['usage'], dict(input_tokens=100, cached_input_tokens=70, output_tokens=10, reasoning_output_tokens=None))

    def test_missing_metrics_are_unknown(self):
        self.assertTrue(all(v is None for v in m.parse_events(events({}))['usage'].values()))

    def test_duplicate_terminal_not_counted_twice(self):
        s = events()
        r = m.parse_events(s + '\n' + s.splitlines()[-1])
        self.assertEqual(r['completed_events'], 1)
        self.assertEqual(r['usage']['input_tokens'], 100)

    def test_different_cumulative_snapshots_are_ambiguous(self):
        s = events() + '\n' + json.dumps({'type': 'turn.completed', 'usage': {'input_tokens': 150}})
        r = m.parse_events(s)
        self.assertEqual(r['status'], 'INVALID_STREAM')
        self.assertIsNone(r['usage']['input_tokens'])

    def test_truncated_malformed_empty_and_error_preserved(self):
        for raw in ('', '{"type":', events() + '\nnot json'):
            self.assertNotEqual(m.parse_events(raw)['status'], 'COMPLETE')
        r = m.parse_events(events() + '\n' + json.dumps({'type': 'turn.failed', 'error': {'message': 'synthetic'}}))
        self.assertEqual(r['status'], 'ERROR')
        self.assertEqual(len(r['errors']), 1)
        self.assertEqual(m.parse_events(events(), exit_code=2)['status'], 'ERROR')

    def test_missing_answer_and_timeout(self):
        self.assertEqual(m.parse_events(events(answer=False))['status'], 'NO_ANSWER')
        r = m.parse_events(events(), timeout=True)
        self.assertEqual(r['status'], 'TIMEOUT')
        self.assertFalse(r['usage_complete'])
        self.assertEqual(r['usage']['input_tokens'], 100)

    def test_invalid_cached_counter(self):
        self.assertEqual(m.parse_events(events({'input_tokens': 10, 'cached_input_tokens': 11}))['status'], 'INVALID_USAGE')

    def test_commands_and_external_items_visible_for_audit(self):
        extra = [{'type': 'item.completed', 'item': {'id': 'c', 'type': 'command_execution', 'command': 'cat ../answers'}},
                 {'type': 'item.completed', 'item': {'id': 'w', 'type': 'web_search'}}]
        r = m.parse_events(events() + '\n' + '\n'.join(map(json.dumps, extra)))
        self.assertEqual(r['commands'][0]['command'], 'cat ../answers')
        self.assertEqual(r['other_items'][0]['type'], 'web_search')

    def test_non_object_usage_is_unknown_and_not_a_crash(self):
        r = m.parse_events(events([]))
        self.assertTrue(all(v is None for v in r['usage'].values()))
        self.assertEqual(r['status'], 'INVALID_USAGE')

    def test_nested_malformed_events_preserve_lines_and_later_diagnostics(self):
        bad = []
        for value in (None, [], 4, 'item'):
            bad.append({'type': 'item.completed', 'item': value})
        for key in ('id', 'type'):
            for value in (None, [], {}, True, 3, ''):
                bad.append({'type': 'item.completed', 'item': {'id': 'a', 'type': 'agent_message', 'text': 'answer', key: value}})
        for value in (None, [], {}, True, 3):
            bad.append({'type': 'item.completed', 'item': {'id': 'a', 'type': 'agent_message', 'text': value}})
        for value in (None, [], {}, True, 3, ''):
            bad.append({'type': 'thread.started', 'thread_id': value})
        # Invalid duplicates must retain BOTH original line numbers.
        bad.append(bad[0])
        raw = events() + '\n' + '\n'.join(map(json.dumps, bad)) + '\n' + json.dumps({
            'type': 'item.completed', 'item': {'id': 'last', 'type': 'agent_message', 'text': 'Later valid answer'}})
        r = m.parse_events(raw)
        self.assertEqual(r['status'], 'INVALID_STREAM')
        self.assertEqual(r['malformed_lines'], list(range(4, 4 + len(bad))))
        self.assertEqual(r['final_answer'], 'Later valid answer')
        self.assertEqual(r['usage']['input_tokens'], 100)
        self.assertFalse(r['usage_complete'])
        self.assertEqual(r['thread_ids'], ['synthetic'])

    def test_malformed_events_do_not_override_process_failures(self):
        raw = events([]) + '\n' + json.dumps({'type': 'item.completed', 'item': None})
        for options, status in [({'timeout': True}, 'TIMEOUT'), ({'exit_code': 2}, 'ERROR'),
                                ({'interrupted': True}, 'INTERRUPTED')]:
            r = m.parse_events(raw, **options)
            self.assertEqual(r['status'], status)
            self.assertEqual(r['malformed_lines'], [4])
            self.assertTrue(r['invalid_usage'])
        r = m.parse_events(raw + '\n' + json.dumps({'type':'error', 'message':'synthetic quota failure'}), timeout=True)
        self.assertEqual(r['errors'][0]['message'], 'synthetic quota failure')

    def test_source_and_index_drift(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); source = p / 'source'; source.mkdir(); (source / 'a').write_text('a')
            files = m.tree_hashes(source); m.source_check(source, files)
            graph = p / 'graph.json'; graph.write_text('{}')
            m.save(p / 'index-receipt.json', {'graph': str(graph), 'source_files': files, 'graph_sha256': m.digest(graph.read_bytes())})
            m.index_check(p, {'files': files})
            (source / 'a').write_text('changed')
            with self.assertRaisesRegex(ValueError, 'Source drift'): m.source_check(source, files)
            with self.assertRaisesRegex(ValueError, 'Stale'): m.index_check(p, {'files': m.tree_hashes(source)})
            graph.write_text('changed')
            with self.assertRaisesRegex(ValueError, 'Stale'): m.index_check(p, {'files': files})

    def test_symlink_cannot_bypass_source_fingerprint(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); (p / 'link').symlink_to('/etc/hosts')
            with self.assertRaisesRegex(ValueError, 'Symlink'): m.tree_hashes(p)

    def test_process_timeout_retains_partial_output_and_own_group_cleanup(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            r = m.capture([sys.executable, '-c', 'import time; print("partial",flush=True); time.sleep(20)'], p, p / 'run', .3)
            self.assertTrue(r['timeout']); self.assertNotEqual(r['exit_code'], 0)
            self.assertIn('partial', (p / 'run.stdout').read_text())
            import os
            with self.assertRaises(ProcessLookupError): os.killpg(r['process_group'], 0)

    def test_interruption_finalizes_short_and_large_unread_stdin_and_stops_batch(self):
        for large_prompt in (False, True):
            with self.subTest(large_prompt=large_prompt), tempfile.TemporaryDirectory() as d:
                p = Path(d)
                worker = """import json, os, subprocess, sys, time
from pathlib import Path
out = Path(sys.argv[1])
def identity(pid):
    fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
    return {'pid':pid, 'starttime':fields[19], 'session':int(fields[3])}
grand = subprocess.Popen([sys.executable, '-c',
    'import sys,time; from pathlib import Path; Path(sys.argv[1]).touch(); time.sleep(30)', str(out/'grand-ready')])
(out/'owned.json').write_text(json.dumps({'child':identity(os.getpid()), 'grandchild':identity(grand.pid)}))
while not (out/'grand-ready').exists(): time.sleep(.01)
print('{"type":"thread.started","thread_id":"synthetic"}',flush=True)
print('partial stderr',file=sys.stderr,flush=True)
(out/'ready').touch()
time.sleep(30)
"""
                (p / 'worker.py').write_text(worker)
                wrapper = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '--interrupt-wrapper', str(p), str(int(large_prompt))],
                                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
                try:
                    deadline = time.monotonic() + 5
                    while not (p / 'ready').exists() and time.monotonic() < deadline and wrapper.poll() is None:
                        time.sleep(.02)
                    self.assertTrue((p / 'ready').exists(), 'Owned child/grandchild did not reach handshake')
                    os.kill(wrapper.pid, signal.SIGINT)  # Only the wrapper, never its child's session.
                    stdout, stderr = wrapper.communicate(timeout=7)
                    self.assertEqual(wrapper.returncode, 130, stderr.decode())
                    self.assertEqual(json.loads((p / 'propagated.json').read_text())['exception'], 'KeyboardInterrupt')
                    folder = p / 'runs/Q1-1-A'
                    process = json.loads((folder / 'events.process.json').read_text())
                    result = json.loads((folder / 'result.json').read_text())
                    self.assertTrue(process['interrupted']); self.assertFalse(process['timeout'])
                    self.assertEqual(process['exit_code'], -signal.SIGKILL)
                    self.assertTrue(process['cleanup']['direct_child_reaped'])
                    # The adopted grandchild may be a zombie until wrapper reaps it.
                    expected = 'COMPLETE' if process['cleanup']['group_absent'] else 'INCOMPLETE'
                    self.assertEqual(process['cleanup']['status'], expected)
                    self.assertEqual(result['status'], 'INTERRUPTED')
                    self.assertEqual(result['cleanup'], process['cleanup'])
                    self.assertFalse(result['usage_complete'])
                    self.assertTrue(all(v is None for v in result['usage'].values()))
                    self.assertIn('thread.started', (folder / 'events.stdout').read_text())
                    self.assertIn('partial stderr', (folder / 'events.stderr').read_text())
                    self.assertFalse((p / 'runs/Q1-2-A').exists(), 'Interruption must stop the coordinator')
                    owned = json.loads((p / 'owned.json').read_text())
                    for identity in owned.values():
                        self.assertFalse(Path(f"/proc/{identity['pid']}").exists(), 'Owned worker was not reaped')
                    with self.assertRaises(ProcessLookupError): os.killpg(process['process_group'], 0)
                finally:
                    # A failing regression may kill only its immutable recorded group.
                    if (p / 'spawn.json').exists():
                        identity = json.loads((p / 'spawn.json').read_text())
                        try:
                            if process_identity(identity['pid']) == identity and identity['session'] == identity['pid']:
                                os.killpg(identity['pid'], signal.SIGKILL)
                        except (ProcessLookupError, FileNotFoundError):
                            pass
                    # Also handle a descendant whose leader has already disappeared.
                    if (p / 'owned.json').exists():
                        for identity in json.loads((p / 'owned.json').read_text()).values():
                            try:
                                if process_identity(identity['pid']) == identity:
                                    os.kill(identity['pid'], signal.SIGKILL)
                            except (ProcessLookupError, FileNotFoundError):
                                pass
                    try:
                        wrapper.communicate(timeout=3)
                    except subprocess.TimeoutExpired:
                        os.killpg(wrapper.pid, signal.SIGKILL)
                        wrapper.communicate(timeout=2)

    def test_unread_large_stdin_times_out_without_operator_interrupt(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            wrapper = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '--stdin-timeout-wrapper', str(p)],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
            try:
                # Execution .2s + cleanup 2s + polling .1s, with startup/scheduling allowance.
                _, stderr = wrapper.communicate(timeout=3.5)
                self.assertEqual(wrapper.returncode, 0, stderr.decode())
                r = json.loads((p / 'returned.json').read_text())
                self.assertTrue(r['timeout']); self.assertFalse(r['interrupted'])
                self.assertLess(r['elapsed_seconds'], 2.8)
                self.assertEqual(r['exit_code'], -signal.SIGKILL)
                self.assertEqual(r['cleanup']['status'], 'COMPLETE')
                self.assertEqual(r, json.loads((p / 'timeout.process.json').read_text()))
                self.assertIn('ready', (p / 'timeout.stdout').read_text())
                with self.assertRaises(ProcessLookupError): os.killpg(r['process_group'], 0)
            finally:
                # No operator intervention on the passing path; guard only a broken regression.
                if (p / 'spawn.json').exists():
                    identity = json.loads((p / 'spawn.json').read_text())
                    try:
                        if process_identity(identity['pid']) == identity and identity['session'] == identity['pid']:
                            os.killpg(identity['pid'], signal.SIGKILL)
                    except (ProcessLookupError, FileNotFoundError):
                        pass
                try:
                    wrapper.communicate(timeout=2)
                except subprocess.TimeoutExpired:
                    os.killpg(wrapper.pid, signal.SIGKILL)
                    wrapper.communicate(timeout=2)

    def test_large_unicode_stdin_delivers_exact_bytes_and_eof(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); prompt = ('á中🙂\r\n\x00' * 131072) + 'end without newline'
            command = [sys.executable, '-c', 'import sys; sys.stdout.buffer.write(sys.stdin.buffer.read())']
            files = []; temporary_file = m.tempfile.TemporaryFile
            def track_file(*args, **kwargs):
                stream = temporary_file(*args, **kwargs); files.append(stream)
                return stream
            with patch.object(m.tempfile, 'TemporaryFile', side_effect=track_file):
                r = m.capture(command, p, p / 'unicode', 2, stdin=prompt)
            self.assertEqual(len(files), 1); self.assertTrue(files[0].closed)
            self.assertEqual(r['exit_code'], 0); self.assertFalse(r['timeout'])
            self.assertEqual((p / 'unicode.stdout').read_bytes(), prompt.encode('utf-8'))
            self.assertEqual(r['cleanup']['status'], 'COMPLETE')
            # No input still uses DEVNULL and yields immediate EOF.
            with patch.object(m.tempfile, 'TemporaryFile', side_effect=AssertionError('DEVNULL must not need a temporary file')):
                r = m.capture(command, p, p / 'empty', 2)
            self.assertEqual(r['exit_code'], 0); self.assertEqual((p / 'empty.stdout').read_bytes(), b'')

    def incomplete_cleanup(self):
        finish = m.finish_process
        def finish_then_simulate(proc):
            receipt, usage = finish(proc)
            self.assertEqual(receipt['status'], 'COMPLETE')  # Actually retire every real worker first.
            receipt.update(status='INCOMPLETE', group_absent=False,
                           errors=[{'step': 'probe', 'type': 'SyntheticFailure', 'message': 'Synthetic unconfirmed group absence'}])
            return receipt, usage
        return patch.object(m, 'finish_process', side_effect=finish_then_simulate)

    def test_successful_child_with_incomplete_cleanup_is_fatal_and_retained(self):
        with tempfile.TemporaryDirectory() as d, self.incomplete_cleanup():
            p = Path(d)
            with self.assertRaises(RuntimeError) as caught:
                m.capture([sys.executable, '-c', 'print("success")'], p, p / 'cleanup', 2)
            self.assertEqual(type(caught.exception).__name__, 'CleanupIncomplete')
            r = caught.exception.capture_result
            self.assertEqual(r, json.loads((p / 'cleanup.process.json').read_text()))
            self.assertEqual(r['exit_code'], 0); self.assertEqual(r['cleanup']['status'], 'INCOMPLETE')
            self.assertEqual(r['execution_error']['type'], 'CleanupIncomplete')
            self.assertEqual((p / 'cleanup.stdout').read_text(), 'success\n')
            with self.assertRaises(ProcessLookupError): os.killpg(r['process_group'], 0)

    def test_incomplete_cleanup_records_attempt_and_stops_coordinator(self):
        with tempfile.TemporaryDirectory() as d, self.incomplete_cleanup():
            p = Path(d)
            with self.assertRaises(RuntimeError) as caught:
                synthetic_run(p, [sys.executable, '-c', f'print({events()!r})'])
            self.assertEqual(type(caught.exception).__name__, 'CleanupIncomplete')
            r = json.loads((p / 'runs/Q1-1-A/result.json').read_text())
            self.assertEqual(r['status'], 'ERROR'); self.assertEqual(r['exit_code'], 0)
            self.assertEqual(r['cleanup'], caught.exception.capture_result['cleanup'])
            self.assertEqual(r['usage']['input_tokens'], 100); self.assertFalse(r['usage_complete'])
            self.assertFalse((p / 'runs/Q1-2-A').exists())
            analysis = self.quality_trial(dict(accuracy=2, coverage=2, traceability=2, invalidating_confusions=[]), status=r['status'])
            self.assertFalse(analysis['rows'][1]['valid'])
            self.assertEqual(analysis['groups']['Q1-A']['n_valid'], 1)

    def test_incomplete_cleanup_stops_index_and_preflight_callers(self):
        for caller in ('index', 'preflight'):
            with self.subTest(caller=caller), tempfile.TemporaryDirectory() as d, self.incomplete_cleanup():
                p = Path(d); corpus = p / 'corpus'; corpus.mkdir()
                m.save(p / 'source.json', {'files': {}})
                capture = m.capture; calls = []
                def local_capture(command, directory, prefix, timeout, env=None, stdin=None):
                    calls.append(command)
                    self.assertEqual(len(calls), 1, 'No subsequent operation after unconfirmed cleanup')
                    if caller == 'index':
                        # Synthetic bytes only, so the old faulty caller could reach its next operation.
                        fake_graph = p / 'index/graphify-out/graph.json'
                        fake_graph.parent.mkdir(parents=True); fake_graph.write_text('{}')
                    return capture([sys.executable, '-c', 'print("Node: environment_cleanup()")'],
                                   directory, prefix, timeout, env, stdin)
                with patch.object(m, 'capture', side_effect=local_capture), \
                     patch.object(m.subprocess, 'check_output', return_value='0.9.100'), \
                     patch.object(m, 'capacity', return_value={}):
                    with self.assertRaises(RuntimeError) as caught:
                        if caller == 'index':
                            m.build_index(p, p / 'unused/bin/graphify')
                        else:
                            m.graph_preflight(['codex', 'exec'], corpus, p / 'unused/graphify', p / 'unused-graph', p / 'preflight')
                self.assertEqual(type(caught.exception).__name__, 'CleanupIncomplete')
                self.assertEqual(len(calls), 1)
                self.assertFalse((p / 'index-receipt.json').exists())
                prefix = p / 'graph-costs/build' if caller == 'index' else p / 'preflight'
                self.assertEqual(json.loads(prefix.with_suffix('.process.json').read_text()), caught.exception.capture_result)

    def test_interrupt_during_finalization_is_deferred_not_suppressed(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); finish = m.finish_process
            def interrupt_then_finish(proc):
                os.kill(os.getpid(), signal.SIGINT)
                return finish(proc)
            with patch.object(m, 'finish_process', side_effect=interrupt_then_finish):
                with self.assertRaises(KeyboardInterrupt) as caught:
                    m.capture([sys.executable, '-c', 'pass'], p, p / 'late', 2)
            r = json.loads((p / 'late.process.json').read_text())
            self.assertTrue(r['interrupted']); self.assertEqual(r, caught.exception.capture_result)
            self.assertEqual(r['cleanup']['status'], 'COMPLETE')
            self.assertEqual(r['exit_code'], 0)

    def test_child_exit_race_still_reaps_and_reports(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); killpg = os.killpg
            def absent_at_signal(pid, sig):
                if sig == signal.SIGKILL:
                    raise ProcessLookupError('Synthetic already-absent group')
                return killpg(pid, sig)
            with patch.object(m.os, 'killpg', side_effect=absent_at_signal):
                r = m.capture([sys.executable, '-c', 'print("done")'], p, p / 'race', 2)
            self.assertEqual(r['exit_code'], 0)
            self.assertTrue(r['cleanup']['direct_child_reaped']); self.assertTrue(r['cleanup']['group_absent'])
            self.assertEqual(r['cleanup']['status'], 'COMPLETE')
            self.assertIsNotNone(r['max_rss_kib'])
            self.assertEqual(json.loads((p / 'race.process.json').read_text()), r)

    def test_cleanup_failures_do_not_mask_original_exception_or_invent_metrics(self):
        from unittest.mock import Mock
        for original in (KeyboardInterrupt('operator'), RuntimeError('poll failed')):
            with self.subTest(exception=type(original).__name__), tempfile.TemporaryDirectory() as d:
                p = Path(d); proc = Mock(pid=123, returncode=None, stdin=None)
                with patch.object(m.subprocess, 'Popen', return_value=proc) as spawn, \
                     patch.object(m.os, 'waitid', side_effect=original), \
                     patch.object(m.os, 'killpg', side_effect=PermissionError('synthetic denied')), \
                     patch.object(m.os, 'wait4', side_effect=ChildProcessError('synthetic unavailable')):
                    with self.assertRaises(type(original)) as caught:
                        m.capture(['synthetic'], p, p / 'failure', 1, stdin='Synthetic prompt')
                self.assertTrue(spawn.call_args.kwargs['stdin'].closed)
                self.assertIs(caught.exception, original)
                r = json.loads((p / 'failure.process.json').read_text())
                self.assertEqual(r, original.capture_result)
                self.assertIsNone(r['exit_code']); self.assertIsNone(r['max_rss_kib'])
                self.assertEqual(r['cleanup']['status'], 'INCOMPLETE')
                self.assertEqual([e['step'] for e in r['cleanup']['errors']], ['signal', 'reap'])
                self.assertEqual(r['execution_error']['type'], type(original).__name__)

    def test_unreaped_child_has_unknown_usage_and_incomplete_cleanup(self):
        from unittest.mock import Mock
        proc = Mock(pid=123, returncode=None)
        with patch.object(m.os, 'killpg', side_effect=PermissionError('synthetic denied')), \
             patch.object(m.os, 'wait4', return_value=(0, 0, Mock(ru_maxrss=0))), \
             patch.object(m.time, 'monotonic', return_value=0):
            receipt, usage = m.finish_process(proc)
        self.assertIsNone(usage); self.assertIsNone(proc.returncode)
        self.assertFalse(receipt['direct_child_reaped']); self.assertFalse(receipt['group_absent'])
        self.assertEqual(receipt['status'], 'INCOMPLETE')
        self.assertEqual([e['step'] for e in receipt['errors']], ['signal', 'probe'])

    def test_malformed_run_has_receipt_and_batch_continues(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            raw = events() + '\n' + json.dumps({'type': 'item.completed', 'item': None})
            synthetic_run(p, [sys.executable, '-c', f'print({raw!r})'])
            for run_id in ('Q1-1-A', 'Q1-2-A'):
                folder = p / 'runs' / run_id
                r = json.loads((folder / 'result.json').read_text())
                self.assertEqual(r['status'], 'INVALID_STREAM'); self.assertEqual(r['malformed_lines'], [4])
                self.assertEqual(r['usage']['input_tokens'], 100); self.assertFalse(r['usage_complete'])
                self.assertEqual((folder / 'events.stdout').read_text(), raw + '\n')

    def test_execution_exception_retains_attempt_and_original_error(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); original = RuntimeError('synthetic polling failure')
            with patch.object(m.os, 'waitid', side_effect=original):
                with self.assertRaises(RuntimeError) as caught:
                    synthetic_run(p, [sys.executable, '-c', 'pass'])
            self.assertIs(caught.exception, original)
            r = json.loads((p / 'runs/Q1-1-A/result.json').read_text())
            self.assertEqual(r['status'], 'ERROR')
            self.assertEqual(r['execution_error'], {'type': 'RuntimeError', 'message': 'synthetic polling failure'})
            self.assertFalse((p / 'runs/Q1-2-A').exists())

    def test_malformed_quota_error_still_stops_batch(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            raw = events() + '\n' + json.dumps({'type': 'thread.started', 'thread_id': []}) + '\n' + json.dumps({'type': 'error', 'message': 'synthetic quota exhausted'})
            synthetic_run(p, [sys.executable, '-c', f'print({raw!r})'])
            r = json.loads((p / 'runs/Q1-1-A/result.json').read_text())
            self.assertEqual(r['status'], 'ERROR'); self.assertEqual(r['malformed_lines'], [4])
            self.assertFalse((p / 'runs/Q1-2-A').exists())

    def test_graph_preflight_fails_before_model_for_invisible_interpreter(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            with patch.object(m, 'capture', return_value={'exit_code':127}) as capture:
                with self.assertRaisesRegex(RuntimeError, 'no model calls'):
                    m.graph_preflight(['codex', 'exec', '-c', 'permissions.pilot.network.enabled=false'], p, p / 'venv/bin/graphify', p / 'graph.json', p / 'probe')
            command = capture.call_args.args[0]
            self.assertEqual(command[:2], ['codex', 'sandbox'])
            self.assertNotIn('exec', command)
            self.assertIn('GRAPHIFY_BACKEND=none', command)
            self.assertIn('permissions.pilot.network.enabled=false', command)

    def test_index_probe_has_local_flags_and_independent_update_source(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); corpus = p / 'corpus'; target = corpus / 'implementacion/services/quotes-node/src/quote.js'
            target.parent.mkdir(parents=True); target.write_text('export function quote() {}')
            files = m.tree_hashes(corpus); m.save(p / 'source.json', {'files': files})
            calls = []
            def fake_capture(cmd, cwd, prefix, timeout, env):
                calls.append((cmd, env))
                if cmd[1] == 'extract':
                    dest = Path(cmd[cmd.index('--out') + 1]) / 'graphify-out'; dest.mkdir(parents=True, exist_ok=True)
                    (dest / 'graph.json').write_text((Path(cmd[2]) / target.relative_to(corpus)).read_text())
                return {'exit_code': 0}
            with patch.object(m.subprocess, 'check_output', return_value='0.9.100'), patch.object(m, 'capture', side_effect=fake_capture), patch.object(m, 'capacity', return_value={}):
                m.build_index(p, p / 'venv/bin/graphify')
            m.source_check(corpus, files)
            self.assertEqual(len(calls), 4)
            for cmd, env in calls:
                self.assertEqual(env['GRAPHIFY_BACKEND'], 'none')
                self.assertEqual(env['GRAPHIFY_QUERY_LOG_DISABLE'], '1')
                if cmd[1] == 'extract':
                    self.assertIn('--code-only', cmd); self.assertIn('--no-cluster', cmd)
                    self.assertEqual(cmd[cmd.index('--max-workers') + 1], '2')
            self.assertEqual(calls[2][0][2], calls[3][0][2])
            self.assertNotEqual(calls[0][0][2], calls[2][0][2])
            with self.assertRaisesRegex(ValueError, 'already exists'): m.build_index(p, p / 'venv/bin/graphify')

    def quality_trial(self, quality, *, status='COMPLETE', configuration='VALID', isolation='VALID'):
        """A good reference and a reviewed candidate; both must remain observable."""
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            protocol = {'order': ['Q1-1-A', 'Q1-2-A'], 'questions': {'Q1': {
                'invalidating_confusions': ['Unsigned fields establish authentication']}}, 'source_sha': 'base'}
            m.save(p / 'protocol.json', protocol)
            good = {'accuracy': 2, 'coverage': 2, 'traceability': 2, 'invalidating_confusions': []}
            for number, review in [(1, good), (2, quality)]:
                f = p / 'runs' / f'Q1-{number}-A'; f.mkdir(parents=True)
                m.save(f / 'config.json', {'source_sha': 'base', 'protocol_sha256': m.digest((p / 'protocol.json').read_bytes()),
                    'model': 'm', 'reasoning': 'high', 'cli_version': 'v', 'variant': 'A', 'question': 'Q1'})
                m.save(f / 'result.json', {'status': status if number == 2 else 'COMPLETE',
                    'configuration_status': configuration if number == 2 else 'VALID',
                    'audit': {'status': isolation if number == 2 else 'VALID'}, 'quality': review,
                    'usage': {**dict.fromkeys(m.TOKEN_FIELDS), 'input_tokens': 100 if number == 1 else 300},
                    'elapsed_seconds': 10 if number == 1 else 30})
            original = (p / 'runs/Q1-2-A/result.json').read_bytes()
            analysis = m.analyze(p)
            self.assertEqual((p / 'runs/Q1-2-A/result.json').read_bytes(), original)
            return analysis

    def test_empty_partial_or_missing_quality_cannot_complete_comparison(self):
        for quality in (None, {}, {'accuracy': 2}, {'accuracy': 2, 'coverage': 2}):
            with self.subTest(quality=quality):
                a = self.quality_trial(quality)
                self.assertFalse(a['rows'][1]['valid'])
                self.assertFalse(a['rows'][1]['quality_review_complete'])
                self.assertTrue(a['rows'][1]['exclusion_reasons'])
                self.assertEqual(a['comparability'], 'INCOMPLETE')
                self.assertEqual(a['groups']['Q1-A']['n_valid'], 1)
                self.assertEqual(len(a['rows']), 2)

    def test_invalid_score_types_and_ranges_in_every_dimension(self):
        for dimension in ('accuracy', 'coverage', 'traceability'):
            for value in (True, False, -1, 3, 2.0, '2', None, [], {}):
                with self.subTest(dimension=dimension, value=value):
                    q = dict(accuracy=2, coverage=2, traceability=2, invalidating_confusions=[])
                    q[dimension] = value
                    a = self.quality_trial(q)
                    self.assertFalse(a['rows'][1]['valid'])
                    self.assertFalse(a['rows'][1]['answer_acceptable'])
                    self.assertEqual(a['comparability'], 'INCOMPLETE')
        for q in ([], 'reviewed', True, 2):
            self.assertFalse(self.quality_trial(q)['rows'][1]['quality_review_complete'])

    def test_complete_favorable_review_has_separate_success_states(self):
        a = self.quality_trial(dict(accuracy=2, coverage=2, traceability=2, invalidating_confusions=[]))
        row = a['rows'][1]
        for key in ('technical_complete', 'configuration_valid', 'isolation_valid', 'quality_review_complete', 'quality_satisfied', 'answer_acceptable', 'valid'):
            self.assertTrue(row[key], key)
        self.assertEqual(row['exclusion_reasons'], [])
        self.assertEqual(a['comparability'], 'COMPLETE')
        self.assertEqual(a['groups']['Q1-A']['n_acceptable'], 2)

    def test_complete_unfavorable_reviews_remain_in_statistics(self):
        for score in (0, 1):
            a = self.quality_trial(dict(accuracy=score, coverage=2, traceability=2, invalidating_confusions=[]))
            row = a['rows'][1]
            self.assertTrue(row['valid']); self.assertTrue(row['quality_review_complete'])
            self.assertFalse(row['quality_satisfied']); self.assertFalse(row['answer_acceptable'])
            self.assertTrue(row['quality_rejection_reasons'])
            self.assertEqual(row['quality']['accuracy'], score)
            self.assertEqual(a['comparability'], 'COMPLETE')
            group = a['groups']['Q1-A']
            self.assertEqual((group['n_valid'], group['n_acceptable'], group['n_unfavorable']), (2, 1, 1))
            self.assertEqual(group['metrics']['input_tokens'], {'n': 2, 'median': 200, 'min': 100, 'max': 300})

    def test_invalidating_confusion_vetoes_full_scores_without_dropping_run(self):
        q = dict(accuracy=2, coverage=2, traceability=2, invalidating_confusions=['Unsigned fields establish authentication'])
        a = self.quality_trial(q); row = a['rows'][1]
        self.assertTrue(row['quality_review_complete']); self.assertTrue(row['invalidating_error_declared'])
        self.assertFalse(row['answer_acceptable']); self.assertTrue(row['valid'])
        self.assertEqual(a['groups']['Q1-A']['n_unfavorable'], 1)
        self.assertEqual(a['groups']['Q1-A']['metrics']['input_tokens']['n'], 2)

    def test_absent_or_invalid_confusion_declarations_are_not_invented(self):
        for declaration in ('absent', None, False, 'none', {}, [False], [''], ['unknown error']):
            q = dict(accuracy=2, coverage=2, traceability=2)
            if declaration != 'absent': q['invalidating_confusions'] = declaration
            a = self.quality_trial(q); row = a['rows'][1]
            self.assertFalse(row['quality_review_complete']); self.assertFalse(row['answer_acceptable'])
            self.assertEqual(row['quality'], q)
            self.assertEqual(a['comparability'], 'INCOMPLETE')
            self.assertTrue(row['exclusion_reasons'])

    def test_quality_cannot_override_timeout_configuration_or_isolation(self):
        q = dict(accuracy=2, coverage=2, traceability=2, invalidating_confusions=[])
        for kwargs, flag in [({'status': 'TIMEOUT'}, 'technical_complete'),
                             ({'configuration': 'INVALID_GRAPH_LAUNCHER'}, 'configuration_valid'),
                             ({'isolation': 'CONTAMINATED'}, 'isolation_valid')]:
            a = self.quality_trial(q, **kwargs); row = a['rows'][1]
            self.assertFalse(row[flag]); self.assertTrue(row['quality_review_complete'])
            self.assertTrue(row['quality_satisfied']); self.assertFalse(row['answer_acceptable'])
            self.assertFalse(row['valid']); self.assertTrue(row['exclusion_reasons'])
            self.assertEqual(len(a['rows']), 2)
            self.assertEqual(a['groups']['Q1-A']['all_attempts_seconds']['n'], 2)

    def test_analysis_preserves_failures_missing_and_exclusions(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            m.save(p / 'protocol.json', {'order': ['Q1-1-A', 'Q1-1-B', 'Q1-1-C'], 'questions': {'Q1': {}}, 'source_sha': 'base'})
            for mode, status, audit in [('A', 'TIMEOUT', 'VALID'), ('B', 'COMPLETE', 'CONTAMINATED')]:
                f = p / 'runs' / ('Q1-1-' + mode); f.mkdir(parents=True)
                m.save(f / 'config.json', {'source_sha': 'base', 'protocol_sha256': m.digest((p / 'protocol.json').read_bytes()), 'model': 'm', 'reasoning': 'high', 'cli_version': 'v', 'variant': mode, 'question': 'Q1'})
                m.save(f / 'result.json', {'status': status, 'audit': {'status': audit}, 'quality': None, 'usage': dict.fromkeys(m.TOKEN_FIELDS), 'elapsed_seconds': 180})
            a = m.analyze(p)
            self.assertEqual(a['missing'], ['Q1-1-C']); self.assertEqual(len(a['rows']), 2)
            original_analysis = (p / 'analysis.json').read_bytes()
            self.assertEqual(m.analyze(p, p / 'derived.json'), a)
            self.assertEqual((p / 'analysis.json').read_bytes(), original_analysis)
            with self.assertRaises(FileExistsError): m.analyze(p, p / 'derived.json')
            self.assertEqual(json.loads((p / 'derived.json').read_text()), a)
            self.assertEqual(a['comparability'], 'INCOMPLETE'); self.assertEqual(a['groups']['Q1-A']['n_valid'], 0)
            f = p / 'runs/Q1-1-B/result.json'; r = json.loads(f.read_text()); r.update(audit={'status':'VALID'}, quality={'accuracy':2}, configuration_status='INVALID_GRAPH_LAUNCHER'); m.save(f,r)
            self.assertEqual(m.analyze(p)['groups']['Q1-B']['n_valid'],0)
            config = p / 'runs/Q1-1-B/config.json'; c = json.loads(config.read_text()); c['model'] = 'other'; m.save(config, c)
            with self.assertRaisesRegex(ValueError, 'Incomparable'): m.analyze(p)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--stdin-timeout-wrapper':
        sys.exit(stdin_timeout_wrapper(Path(sys.argv[2])))
    if len(sys.argv) > 1 and sys.argv[1] == '--interrupt-wrapper':
        sys.exit(interrupt_wrapper(Path(sys.argv[2]), bool(int(sys.argv[3]))))
    unittest.main()
