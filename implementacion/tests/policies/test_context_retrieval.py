"""Synthetic events/processes only: no Codex quota, Graphify or network in CI."""
import importlib.util
import json
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
    unittest.main()
