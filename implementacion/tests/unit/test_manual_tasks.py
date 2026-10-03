"""Synthetic event histories only: no human calibration or live scenario claim."""
import copy
import argparse
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from manual_tasks import new_record, record_event, summarize, make_sequence, write_json, retain_file
from manual_tasks import clock, SCENARIOS
spec = importlib.util.spec_from_file_location('manual_cli', Path(__file__).resolve().parents[2] / 'scripts/manual-tasks.py')
cli = importlib.util.module_from_spec(spec); spec.loader.exec_module(cli)


def stamp(seconds, boot='synthetic-boot'):
    return {'utc': f'2026-10-02T00:00:{seconds:06.3f}+00:00',
            'monotonicNs': int(seconds * 1_000_000_000), 'bootId': boot}


class ManualTimingTests(unittest.TestCase):
    def ready(self, limit=None):
        r = new_record('F03', 'R', 'calibration', {'source': 'synthetic'}, limit, synthetic=True)
        record_event(r, 'prepared', stamp(0))
        return r

    def running(self, limit=None):
        r = self.ready(limit)
        record_event(r, 'start', stamp(1))
        return r

    def review(self, limit=None):
        r = self.running(limit)
        record_event(r, 'automatic-finished', stamp(5), outcome='completed')
        return r

    def detect(self, r, at=8, mechanism='manual:scan'):
        record_event(r, 'detected', stamp(at), mechanism=mechanism,
                     evidence={'path': 'synthetic/receipt.json', 'sha256': 'a' * 64})

    def test_synthetic_label_and_unset_limit(self):
        r = self.ready()
        self.assertTrue(r['synthetic'])
        self.assertIsNone(r['limitSeconds'])
        self.assertIsNone(summarize(r, stamp(10))['totalSeconds'])

    def test_review_begins_after_blocked_or_completed_path(self):
        for outcome in ['blocked', 'completed']:
            r = self.running()
            if outcome == 'blocked': self.detect(r, 4, 'automatic:scan')
            record_event(r, 'automatic-finished', stamp(5), outcome=outcome)
            self.assertEqual(r['humanReviewStart'], stamp(5))
            self.assertEqual(r['status'], 'REVIEW')

    def test_separate_elapsed_active_waiting_and_resolution(self):
        r = self.review()
        record_event(r, 'investigate', stamp(6), note='synthetic review')
        self.detect(r)
        record_event(r, 'wait', stamp(10), note='synthetic command')
        record_event(r, 'correct', stamp(14), note='synthetic edit')
        record_event(r, 'verification-started', stamp(20))
        record_event(r, 'verification-finished', stamp(25), outcome='completed',
                     evidence={'path': 'synthetic/check.json', 'sha256': 'b' * 64})
        s = summarize(r, stamp(100))
        self.assertEqual(s['outcome'], 'completed')
        self.assertEqual(s['totalSeconds'], 24)
        self.assertEqual(s['detectionLatencySeconds'], 7)
        self.assertEqual(s['resolutionSeconds'], 17)
        self.assertEqual(s['activeDiagnosisSeconds'], 4)
        self.assertEqual(s['activeCorrectionSeconds'], 6)
        self.assertEqual(s['waitingSeconds'], 9)
        self.assertEqual(s['automaticSeconds'], 4)
        self.assertEqual(s['unobservedSeconds'], 1)
        self.assertEqual(s['verificationSeconds'], 5)

    def test_no_detection_at_window_is_censored_not_zero(self):
        r = self.review(20)
        record_event(r, 'expire', stamp(30))
        s = summarize(r, stamp(40))
        self.assertEqual(s['outcome'], 'not-detected-within-window')
        self.assertEqual(s['totalSeconds'], 20)
        self.assertIsNone(s['detectionLatencySeconds'])
        self.assertIsNone(s['resolutionSeconds'])
        self.assertEqual(s['detectionLowerBoundSeconds'], 20)

    def test_detected_unresolved_at_window(self):
        r = self.review(20)
        self.detect(r)
        record_event(r, 'expire', stamp(21))
        s = summarize(r, stamp(21))
        self.assertEqual(s['outcome'], 'detected-unresolved-within-window')
        self.assertEqual(s['resolutionLowerBoundSeconds'], 13)
        self.assertIsNone(s['resolutionSeconds'])

    def test_late_validation_cannot_complete(self):
        r = self.review(20)
        self.detect(r)
        record_event(r, 'verification-started', stamp(20))
        record_event(r, 'verification-finished', stamp(22), outcome='completed',
                     evidence={'path': 'synthetic/check.json', 'sha256': 'b' * 64})
        self.assertEqual(summarize(r, stamp(23))['outcome'], 'detected-unresolved-within-window')

    def test_bad_order_does_not_change_record(self):
        for kind in ['investigate', 'correct', 'verification-started', 'automatic-finished']:
            r = self.ready(); before = copy.deepcopy(r)
            with self.assertRaises(ValueError): record_event(r, kind, stamp(1))
            self.assertEqual(r, before)

    def test_duplicate_start_and_detection_rejected(self):
        r = self.running()
        with self.assertRaises(ValueError): record_event(r, 'start', stamp(2))
        self.detect(r, 3, 'automatic:scan')
        with self.assertRaises(ValueError): self.detect(r, 4, 'automatic:scan')

    def test_detection_requires_evidence_and_mechanism(self):
        r = self.review()
        with self.assertRaises(ValueError): record_event(r, 'detected', stamp(8))
        with self.assertRaises(ValueError): self.detect(r, mechanism='guess')

    def test_completion_requires_detection_and_validation_evidence(self):
        r = self.review()
        record_event(r, 'verification-started', stamp(7))
        with self.assertRaises(ValueError): record_event(r, 'verification-finished', stamp(10), outcome='completed')

    def test_clock_reversal_and_reboot(self):
        r = self.review()
        for mark in [stamp(4), stamp(9, 'other-boot')]:
            with self.assertRaises(ValueError): record_event(r, 'investigate', mark)

    def test_manual_interruption_retains_total_but_not_active_gap(self):
        r = self.review()
        record_event(r, 'investigate', stamp(6))
        record_event(r, 'interrupt', stamp(10), note='terminal closed')
        record_event(r, 'investigate', stamp(20))
        s = summarize(r, stamp(22))
        self.assertEqual(s['totalSeconds'], 21)
        self.assertEqual(s['activeDiagnosisSeconds'], 6)
        self.assertEqual(s['unobservedSeconds'], 11)

    def test_interrupted_command_is_incomplete_and_never_resolved(self):
        r = self.running()
        record_event(r, 'interrupt', stamp(4), note='synthetic signal')
        self.assertEqual(summarize(r, stamp(20))['outcome'], 'incomplete')
        with self.assertRaises(ValueError): record_event(r, 'start', stamp(21))

    def test_unexpected_error_does_not_become_detection(self):
        r = self.running()
        record_event(r, 'automatic-finished', stamp(4), outcome='error')
        self.assertEqual(summarize(r, stamp(5))['outcome'], 'incomplete')
        self.assertIsNone(r.get('detection'))

    def test_failed_correction_preserves_prior_attempt(self):
        r = self.review(); self.detect(r)
        record_event(r, 'verification-started', stamp(9))
        record_event(r, 'verification-finished', stamp(11), outcome='unresolved')
        self.assertEqual(r['status'], 'REVIEW')
        record_event(r, 'verification-started', stamp(13))
        self.assertEqual(len([e for e in r['events'] if e['kind'] == 'verification-started']), 2)

    def test_cleanup_is_repeatable_without_changing_timing(self):
        r = self.review(); record_event(r, 'abandon', stamp(10))
        record_event(r, 'cleanup', stamp(20), outcome='completed')
        total = summarize(r, stamp(30))['totalSeconds']
        record_event(r, 'cleanup', stamp(31), outcome='completed')
        self.assertEqual(summarize(r, stamp(32))['totalSeconds'], total)

    def test_order_is_reproducible_six_unique_tasks_with_two_one_balance(self):
        seen = set()
        for seed in ['alpha', 'beta', 'gamma', 'delta', 'epsilon']:
            plan = make_sequence(seed)
            self.assertEqual(plan, make_sequence(seed))
            self.assertEqual(len(plan['sequence']), 6)
            self.assertEqual(len({(x['scenario'], x['arm']) for x in plan['sequence']}), 6)
            orders = [p['order'] for p in plan['pairs']]
            self.assertEqual(sorted([orders.count('RG'), orders.count('GR')]), [1, 2])
            seen.add(json.dumps(plan['sequence']))
        self.assertGreater(len(seen), 1)

    def test_records_and_retained_evidence_are_independent(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); original = p / 'input.log'; original.write_text('synthetic scanner output')
            first = p / 'attempt-1'; second = p / 'attempt-2'; first.mkdir(); second.mkdir()
            a = retain_file(original, first / 'evidence.log')
            original.write_text('synthetic next attempt')
            b = retain_file(original, second / 'evidence.log')
            self.assertNotEqual(a['sha256'], b['sha256'])
            self.assertEqual((first / 'evidence.log').read_text(), 'synthetic scanner output')
            with self.assertRaises(FileExistsError): retain_file(original, first / 'evidence.log')
            write_json(first / 'record.json', self.ready())
            self.assertTrue(json.loads((first / 'record.json').read_text())['synthetic'])

    def test_evidence_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); (p / 'file').write_text('synthetic'); (p / 'link').symlink_to(p / 'file')
            with self.assertRaises(ValueError): retain_file(p / 'link', p / 'copy')

    def test_unknown_interruption_reports_observed_bound_not_invented_duration(self):
        r = self.review()
        r['interruption'] = {'timing': 'unknown'}
        r['status'] = 'INCOMPLETE'; r['ended'] = stamp(5)
        s = summarize(r, stamp(40))
        self.assertIsNone(s['totalSeconds'])
        self.assertEqual(s['observedThroughSeconds'], 4)


class ManualCommandTests(unittest.TestCase):
    def test_plan_reuse_checks_declared_inputs_and_identities_without_rewriting(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-plan-reuse-') as directory:
            root = Path(directory); path = root / 'plan.json'
            database = {'directory': str(root / 'db'), 'sha256': {'synthetic': 'unchanged'}}
            args = argparse.Namespace(output=str(path), seed='synthetic-seed', database=database['directory'],
                                      editor='Synthetic editor 1', reuse=True)
            with patch.object(cli, 'STORE', root), patch.object(cli, 'source_identity', return_value={'synthetic': True}), patch.object(cli, 'database_identity', return_value=database):
                cli.plan_command(args)
                before = {p: p.read_bytes() for p in [path, root / 'initial-plan.json']}
                cli.plan_command(args)
                for key in ['seed', 'editor', 'database']:
                    changed = copy.copy(args); setattr(changed, key, 'different')
                    with self.assertRaisesRegex(ValueError, 'inputs differ'): cli.plan_command(changed)
                with patch.object(cli, 'source_identity', return_value={'changed': True}):
                    with self.assertRaisesRegex(ValueError, 'Source/configuration'): cli.plan_command(args)
                with patch.object(cli, 'database_identity', return_value={**database, 'sha256': {}}):
                    with self.assertRaisesRegex(ValueError, 'database'): cli.plan_command(args)
                for p, value in before.items(): self.assertEqual(p.read_bytes(), value)

    def test_start_rejects_incomplete_preparation_before_reading_missing_receipt(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-not-ready-') as directory:
            root = Path(directory)
            r = new_record('F11', 'G', 'calibration', {}, synthetic=True)
            record_event(r, 'abandon', clock(), note='Synthetic preparation failure')
            write_json(root / 'record.json', r); before = (root / 'record.json').read_bytes()
            with patch.object(cli, 'STORE', root.parent), patch.object(cli, 'guard_task') as guard:
                with self.assertRaisesRegex(ValueError, 'READY'):
                    cli.run_command(argparse.Namespace(command='start', task=str(root)))
                guard.assert_not_called()
            self.assertEqual((root / 'record.json').read_bytes(), before)

    def test_prepare_follow_displays_logs_and_retains_failure_without_starting_timer(self):
        import io
        from contextlib import redirect_stdout
        with tempfile.TemporaryDirectory(prefix='synthetic-follow-') as directory:
            root, _ = self.operation_fixture(directory)
            r = new_record('F11', 'G', 'calibration', {'database': {'directory': str(root)}}, synthetic=True)
            (root / 'scripts/demo.sh').write_text('echo synthetic-progress\nsleep 0.25\necho synthetic-final\nexit 7\n')
            output = io.StringIO()
            with patch.object(cli, 'ROOT', root), redirect_stdout(output):
                code, folder = cli.operation(root, r, 'prepare', follow=True)
            self.assertEqual(code, 7)
            self.assertIn('synthetic-progress\nsynthetic-final\n', output.getvalue())
            self.assertEqual((folder / 'command.log').read_text(), 'synthetic-progress\nsynthetic-final\n')
            self.assertIsNone(r.get('started'))

    def test_failed_preparation_saves_its_path_and_does_not_replace_a_selector_symlink(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-task-selection-') as directory:
            root = Path(directory); path = root / 'plan.json'
            plan = {'source': {}, 'database': {}, 'tools': {}, 'environment': {}, 'limitsSeconds': dict.fromkeys(SCENARIOS)}
            args = argparse.Namespace(plan=str(path), dataset='calibration', scenario='F11', arm='G',
                                      participant='synthetic', prior_knowledge='synthetic only')
            def failed_prepare(task, record, name):
                return 7, task / 'operations'
            with patch.object(cli, 'load_plan', return_value=(path, plan)), patch.object(cli, 'operation', side_effect=failed_prepare) as operation, patch.object(cli, 'new_record', side_effect=lambda *a, **kw: new_record(*a, **kw, synthetic=True)):
                self.assertEqual(cli.prepare_command(args), 1)
                task = Path(read_json(root / 'current-task.json')['taskDirectory'])
                record = read_json(task / 'record.json')
                self.assertEqual(record['status'], 'INCOMPLETE')
                self.assertIsNone(record.get('started'))
                before = (task / 'record.json').read_bytes()
                (root / 'current-task.json').unlink()
                (root / 'current-task.json').symlink_to(task / 'record.json')
                with self.assertRaisesRegex(ValueError, 'Unsafe current-task'):
                    cli.prepare_command(args)
                self.assertEqual((task / 'record.json').read_bytes(), before)
                self.assertEqual(operation.call_count, 1)

    def test_follow_interruption_preserves_the_incomplete_attempt(self):
        import io
        from contextlib import redirect_stdout
        with tempfile.TemporaryDirectory(prefix='synthetic-follow-interruption-') as directory:
            root, _ = self.operation_fixture(directory)
            r = new_record('F11', 'G', 'calibration', {'database': {'directory': str(root)}}, synthetic=True)
            process = Mock(pid=99999999); process.wait.side_effect = KeyboardInterrupt
            with patch.object(cli, 'ROOT', root), patch.object(cli.subprocess, 'Popen', return_value=process), patch.object(cli, 'terminate') as terminate, redirect_stdout(io.StringIO()):
                code, folder = cli.operation(root, r, 'prepare', follow=True)
            terminate.assert_called_once_with(process)
            self.assertEqual(code, 130)
            self.assertEqual(r['status'], 'INCOMPLETE')
            self.assertIsNone(r.get('started'))
            self.assertEqual(read_json(folder / 'exit.json')['exitCode'], 130)

    def operation_fixture(self, directory, limit=None):
        root = Path(directory)
        (root / 'scripts').mkdir(); (root / 'operations').mkdir()
        r = new_record('F03', 'R', 'calibration', {'database': {'directory': str(root)}}, limit, synthetic=True)
        record_event(r, 'prepared', clock()); record_event(r, 'start', clock())
        return root, r

    def test_verification_requires_an_explicit_evidenced_correction_rejection(self):
        import io
        from contextlib import redirect_stdout
        for case, code, status, outcome in [
            ('unclassified-build-error', 1, 'INCOMPLETE', 'error'),
            ('unclassified-reserved-exit', 43, 'INCOMPLETE', 'error'),
            ('unclassified-success', 0, 'INCOMPLETE', 'error'),
            ('integration-error', 1, 'INCOMPLETE', 'error'),
            ('correction-rejected', 43, 'REVIEW', 'unresolved'),
            ('manifest-rejected', 42, 'REVIEW', 'unresolved'),
            ('wrong-exit', 1, 'INCOMPLETE', 'error'),
            ('wrong-scenario', 43, 'INCOMPLETE', 'error'),
            ('changed-evidence', 43, 'INCOMPLETE', 'error'),
            ('missing-evidence', 43, 'INCOMPLETE', 'error'),
            ('malformed-result', 43, 'INCOMPLETE', 'error'),
            ('false-success-exit', 0, 'INCOMPLETE', 'error'),
            ('completion', 0, 'COMPLETED', 'completed'),
            ('completion-wrong-scenario', 0, 'INCOMPLETE', 'error'),
        ]:
            with self.subTest(case=case), tempfile.TemporaryDirectory(prefix='synthetic-manual-correction-') as directory:
                root, r = self.operation_fixture(directory)
                record_event(r, 'automatic-finished', clock(), outcome='completed')
                receipt = root / 'detection.json'; write_json(receipt, {'synthetic': True})
                record_event(r, 'detected', clock(), mechanism='manual:scan', evidence=cli.evidence_link(receipt, root))
                write_json(root / 'record.json', r)
                oracle = root / 'synthetic-oracle.json'; write_json(oracle, {'synthetic': True, 'status': 'CORRECTION_REJECTED'})
                result = {'schema': 'manual-task-check/v1', 'scenario': 'F03',
                          'status': 'INTEGRATION_ERROR' if case == 'integration-error' else 'CORRECTION_REJECTED',
                          'phase': 'synthetic-check', 'evidence': {'path': 'oracle.json', 'sha256': cli.sha256(oracle)}}
                if case == 'wrong-scenario': result['scenario'] = 'F11'
                if case == 'changed-evidence': result['evidence']['sha256'] = '0' * 64
                if case == 'missing-evidence': result['evidence']['path'] = 'missing.json'
                proof_name = 'oracle.json'
                if case.startswith('completion'):
                    proof_name = 'completion.json'
                    write_json(oracle, {'synthetic': True, 'status': 'VALIDATED_COMPLETION',
                                       'scenario': 'F11' if case == 'completion-wrong-scenario' else 'F03'})
                    result.update(status='VALIDATED_COMPLETION', evidence={'path': proof_name, 'sha256': cli.sha256(oracle)})
                write_json(root / 'synthetic-result.json', result)
                if case == 'malformed-result': (root / 'synthetic-result.json').write_text('{')
                script = f'echo synthetic-check-diagnostic\ncp synthetic-oracle.json "$5/{proof_name}"\n'
                if not case.startswith('unclassified'):
                    script += 'cp synthetic-result.json "$5/check-result.json"\n'
                (root / 'scripts/demo.sh').write_text(script + f'exit {code}\n')
                output = io.StringIO()
                with patch.object(cli, 'ROOT', root), patch.object(cli, 'STORE', root.parent), patch.object(cli, 'guard_task'), redirect_stdout(output):
                    self.assertEqual(cli.run_command(argparse.Namespace(command='check', task=str(root))), 0 if status in ('REVIEW', 'COMPLETED') else 2)
                actual = read_json(root / 'record.json')
                self.assertEqual(actual['status'], status)
                self.assertEqual(actual['events'][-1]['exitCode'], code)
                self.assertEqual(actual['events'][-1]['outcome'], outcome)
                self.assertIn('synthetic-check-diagnostic', next((root / 'operations').glob('*/command.log')).read_text())
                self.assertEqual(actual['humanAcceptance'], 'pending')
                self.assertEqual(actual['started'], r['started'])
                if status == 'REVIEW':
                    self.assertIn('CORRECTION_REJECTED; task remains REVIEW', output.getvalue())
                    self.assertIn('CHECK_RESULT ' + str(next((root / 'operations').glob('*/check-result.json'))), output.getvalue())
                    self.assertIn('cleanup now closes this unresolved attempt as INCOMPLETE', output.getvalue())
                    self.assertNotIn('VALIDATED_COMPLETION', output.getvalue())
                    self.assertIsNone(actual.get('ended'))
                else:
                    self.assertNotIn('CORRECTION_REJECTED; task remains REVIEW', output.getvalue())

    def test_interrupted_tool_closes_attempt_but_cleanup_keeps_original_endpoint(self):
        for name in ['tool', 'cleanup']:
            with tempfile.TemporaryDirectory(prefix='synthetic-manual-interrupt-') as directory:
                root, r = self.operation_fixture(directory)
                record_event(r, 'automatic-finished', clock(), outcome='completed')
                if name == 'cleanup': record_event(r, 'abandon', clock())
                endpoint = r.get('ended')
                process = Mock(pid=99999999)
                process.wait.side_effect = KeyboardInterrupt
                with patch.object(cli.subprocess, 'Popen', return_value=process), patch.object(cli, 'terminate'):
                    code, folder = cli.operation(root, r, name)
                self.assertEqual(code, 130)
                self.assertEqual(r['status'], 'INCOMPLETE')
                self.assertEqual(read_json(folder / 'exit.json')['exitCode'], 130)
                if name == 'cleanup': self.assertEqual(r['ended'], endpoint)

    def test_cleanup_can_finish_missing_manifest_without_replacing_original_evidence(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-manual-retention-') as directory:
            root, r = self.operation_fixture(directory)
            record_event(r, 'abandon', clock()); record_event(r, 'cleanup', clock(), outcome='completed')
            write_json(root / 'record.json', r)
            original = (root / 'record.json').read_bytes()
            with patch.object(cli, 'STORE', root.parent), patch.object(cli, 'operation') as operation:
                args = argparse.Namespace(command='cleanup', task=str(root))
                cli.run_command(args)
                manifest = (root / 'SHA256SUMS.txt').read_bytes()
                cli.run_command(args)
                operation.assert_not_called()
            self.assertEqual((root / 'record.json').read_bytes(), original)
            self.assertEqual((root / 'SHA256SUMS.txt').read_bytes(), manifest)

    def test_real_subprocess_timeout_keeps_log_and_closes_group(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-manual-command-') as directory:
            root, r = self.operation_fixture(directory, 0.2)
            (root / 'scripts/demo.sh').write_text('echo synthetic-before-wait\nsleep 10\necho unexpected\n')
            with patch.object(cli, 'ROOT', root): code, folder = cli.operation(root, r, 'start')
            self.assertEqual(code, 124)
            self.assertIn('synthetic-before-wait', (folder / 'command.log').read_text())
            self.assertNotIn('unexpected', (folder / 'command.log').read_text())
            self.assertEqual(r['status'], 'EXHAUSTED')
            self.assertNotIn('runningOperation', r)
            self.assertTrue(json.loads((folder / 'request.json').read_text())['synthetic'])

    def test_cleanup_is_allowed_after_time_window_and_retains_original_log(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-manual-cleanup-') as directory:
            root, r = self.operation_fixture(directory, 0.01)
            (root / 'scripts/demo.sh').write_text('echo synthetic-cleanup\nsleep 0.04\n')
            with patch.object(cli, 'ROOT', root):
                code, folder = cli.operation(root, r, 'cleanup')
                code2, folder2 = cli.operation(root, r, 'cleanup')
            self.assertEqual((code, code2), (0, 0))
            self.assertNotEqual(folder, folder2)
            self.assertEqual((folder / 'command.log').read_text(), 'synthetic-cleanup\n')

    def test_synthetic_calibration_cannot_freeze_real_measurement_limits(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-manual-limits-') as directory:
            root = Path(directory); task = root / 'calibration/task-one'; task.mkdir(parents=True)
            r = new_record('F03', 'R', 'calibration', {}, synthetic=True)
            r.update(status='COMPLETED', cleanup='completed'); write_json(task / 'record.json', r)
            plan = {'limitsReview': None}
            args = argparse.Namespace(plan=str(root / 'plan.json'), calibration=[str(task)],
                                      reviewer='Synthetic test reviewer', rationale='Synthetic test only')
            with patch.object(cli, 'STORE', root), patch.object(cli, 'load_plan', return_value=(root / 'plan.json', plan)):
                with self.assertRaisesRegex(ValueError, 'real human calibration'): cli.freeze_command(args)

    def test_recovery_does_not_invent_time_after_abrupt_termination(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-manual-recovery-') as directory:
            root, r = self.operation_fixture(directory)
            r['runningOperation'] = {'pid': 99999999, 'bootId': 'old-boot', 'name': 'start', 'directory':str(root/'operations/missing')}
            write_json(root / 'record.json', r)
            with patch.object(cli, 'STORE', root.parent):
                cli.run_command(argparse.Namespace(command='recover', task=str(root)))
            value = json.loads((root / 'record.json').read_text())
            self.assertEqual(value['status'], 'INCOMPLETE')
            self.assertIsNone(summarize(value, clock())['totalSeconds'])

    def test_recovery_requires_a_recorded_operation_and_keeps_healthy_records_unchanged(self):
        for state in ['READY', 'REVIEW', 'COMPLETED']:
            with self.subTest(state=state), tempfile.TemporaryDirectory(prefix='synthetic-recover-healthy-') as directory:
                root, r = self.operation_fixture(directory)
                r['status'] = state
                write_json(root / 'record.json', r)
                original = (root / 'record.json').read_bytes()
                with patch.object(cli, 'STORE', root.parent), patch.object(cli.os, 'killpg') as kill:
                    with self.assertRaises(ValueError):
                        cli.run_command(argparse.Namespace(command='recover', task=str(root)))
                    kill.assert_not_called()
                self.assertEqual((root / 'record.json').read_bytes(), original)

    def test_freeze_rejects_blank_review_fields_without_writing_a_decision(self):
        for field in ['reviewer', 'rationale']:
            for blank in ['', ' \t\n']:
                with self.subTest(field=field, blank=blank), tempfile.TemporaryDirectory(prefix='synthetic-review-') as directory:
                    root = Path(directory); path = root / 'plan.json'
                    plan = {'limitsReview': None, 'limitsSeconds': dict.fromkeys(SCENARIOS)}
                    write_json(path, plan); original = path.read_bytes()
                    args = argparse.Namespace(plan=str(path), reviewer='Synthetic reviewer', rationale='Synthetic test only',
                                              calibration=[], limit=['F03=1', 'F10=1', 'F11=1'])
                    setattr(args, field, blank)
                    with patch.object(cli, 'load_plan', return_value=(path, plan)):
                        with self.assertRaisesRegex(ValueError, 'reviewer|rationale'):
                            cli.freeze_command(args)
                    self.assertEqual(path.read_bytes(), original)
                    self.assertFalse((root / 'frozen-plan.json').exists())

    def test_plan_rejects_source_database_and_frozen_limit_changes(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-manual-plan-') as directory:
            root = Path(directory); path = root / 'plan.json'
            plan = {'schema':'manual-task-plan/v1', 'lane':'A', 'ordering':make_sequence('synthetic'),
                    'source':{'synthetic':True},'database':{'directory':'synthetic','sha256':{}},'limitsReview':None,'limitsSeconds':dict.fromkeys(SCENARIOS)}
            write_json(path, plan)
            write_json(root/'initial-plan.json', plan)
            with patch.object(cli,'STORE',root), patch.object(cli,'source_identity',return_value=plan['source']), patch.object(cli,'database_identity',return_value=plan['database']):
                cli.load_plan(path)
                with patch.object(cli,'source_identity',return_value={'changed':True}):
                    with self.assertRaisesRegex(ValueError,'Source/configuration'): cli.load_plan(path)
                with patch.object(cli,'database_identity',return_value={'changed':True}):
                    with self.assertRaisesRegex(ValueError,'database'): cli.load_plan(path)
                plan['limitsReview']={'synthetic':True};write_json(path,plan);write_json(root/'frozen-plan.json',plan)
                plan['limitsSeconds']={'F03':1};write_json(path,plan)
                with self.assertRaisesRegex(ValueError,'frozen plan'): cli.load_plan(path)

    def test_measured_preparation_enforces_order_equal_limits_and_exactly_six_positions(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-manual-six-') as directory:
            root=Path(directory);plan_path=root/'plan.json'
            plan={'source':{'synthetic':True},'database':{'directory':'synthetic'},'tools':{},'environment':{},
                  'ordering':make_sequence('synthetic-order'),'limitsReview':{'syntheticTestOnly':True},
                  'limitsSeconds':{'F03':30,'F10':40,'F11':50}}
            def synthetic_prepare(task, record, name):
                op=task/'operations/0001-prepare';op.mkdir()
                write_json(task/'operator/prepared.json',{'synthetic':True,'comparability':{'cpu':4}})
                return 0,op
            def synthetic_record(*args, **kwargs):
                return new_record(*args, **kwargs, synthetic=True)
            args=argparse.Namespace(plan=str(plan_path),dataset='measurement',participant='synthetic-test-actor',prior_knowledge='synthetic only')
            with patch.object(cli,'load_plan',return_value=(plan_path,plan)),patch.object(cli,'operation',side_effect=synthetic_prepare),patch.object(cli,'new_record',side_effect=synthetic_record):
                for position in plan['ordering']['sequence']:
                    args.scenario=position['scenario'];args.arm=position['arm']
                    wrong=copy.copy(args);wrong.arm='G' if args.arm=='R' else 'R'
                    with self.assertRaisesRegex(ValueError,'Next task'):cli.prepare_command(wrong)
                    self.assertEqual(cli.prepare_command(args),0)
                    latest=[p for p in root.glob('measurement/task-*/record.json') if read_json(p)['status']=='READY']
                    self.assertEqual(len(latest),1)
                    self.assertEqual(read_json(root/'current-task.json')['taskDirectory'], str(latest[0].parent))
                    record=read_json(latest[0]);self.assertTrue(record['synthetic'])
                    self.assertEqual(record['limitSeconds'],plan['limitsSeconds'][args.scenario])
                    self.assertEqual(record['position'],position['position'])
                    with self.assertRaisesRegex(ValueError,'Clean up'):cli.prepare_command(args)
                    record.update(status='INCOMPLETE',cleanup='completed');write_json(latest[0],record)
                with self.assertRaisesRegex(ValueError,'exactly six'):cli.prepare_command(args)


def read_json(path):
    return json.loads(path.read_text())


if __name__ == '__main__': unittest.main()
