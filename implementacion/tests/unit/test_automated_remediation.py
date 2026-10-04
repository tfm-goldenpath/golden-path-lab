"""Explicitly synthetic fixtures: no live delivery or human measurements."""
import argparse
import copy
import importlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from manual_tasks import new_record, record_event, clock, sha256, write_json, SCRIPTED, summarize
from manual_task_reviews import eligibility_reasons, sealed_task, record_review, effective_review
from automated_repairs import preserve_original, repair, verify_repair, input_hashes
from automated_assessment import require_detection, require_order, report
runner = importlib.import_module('automated-remediation')
cli = importlib.import_module('manual-tasks')
ROOT = Path(__file__).resolve().parents[2]


class AutomatedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.task = Path(self.temp.name) / 'task-synthetic'
        for directory in ('participant', 'operator', 'operations'):
            (self.task / directory).mkdir(parents=True)

    def fixture(self, scenario='F11', arm='G'):
        r = new_record(scenario, arm, 'automated-validation', {'source': 'synthetic'}, synthetic=True)
        r['taskDirectory'] = str(self.task)
        r['status'] = 'REVIEW'
        r['detection'] = {'mechanism': 'automatic:manifest'}
        write_json(self.task / 'record.json', r)
        write_json(self.task / 'participant/manifest.json', {
            'spec': {'template': {'spec': {'containers': [{'name': 'quotes-node', 'image': 'synthetic@sha256:abc',
                'securityContext': {'privileged': True, 'allowPrivilegeEscalation': True, 'readOnlyRootFilesystem': True}}]}}}})
        (self.task / 'participant/image.txt').write_text('synthetic@sha256:abc\n')
        if scenario == 'F03':
            shutil.copytree(ROOT / 'tests/fixtures/vulnerabilities/f03-vulnerable', self.task / 'participant/source')
        if scenario == 'F10':
            (self.task / 'participant/authorized-artifact.txt').write_text('synthetic@sha256:def\n')
            write_json(self.task / 'operator/prepared.json', {'authorizedArtifact': 'synthetic@sha256:def'})
        preserve_original(self.task)
        return r

    def test_all_repairs_preserve_original_and_only_permitted_inputs(self):
        for scenario in ('F03', 'F10', 'F11'):
            with self.subTest(scenario=scenario):
                # Each iteration is an independent synthetic task.
                self.setUp()
                r = self.fixture(scenario)
                original = input_hashes(self.task / 'operator/original')
                receipt = repair(self.task, r)
                verify_repair(self.task, r)
                self.assertEqual(original, input_hashes(self.task / 'operator/original'))
                self.assertEqual(receipt['actor'], 'automation')
                self.assertEqual(receipt['executionMode'], 'scripted')
                self.assertNotEqual(receipt['before'], receipt['after'])
                self.assertIn('started', receipt)
                self.assertIn('finished', receipt)
                if scenario == 'F03':
                    package = json.loads((self.task / 'participant/source/package.json').read_text())
                    self.assertEqual(package['dependencies'], {'minimist': '1.2.8'})
                    self.assertEqual(package['name'], 'f03-vulnerable')

    def test_unintended_edits_and_original_drift_rejected(self):
        r = self.fixture()
        repair(self.task, r)
        (self.task / 'participant/image.txt').write_text('foreign\n')
        with self.assertRaises(ValueError): verify_repair(self.task, r)
        with self.assertRaises(ValueError): repair(self.task, r)

    def test_f03_wrapper_and_f10_catalog_are_immutable(self):
        for scenario, name in [('F03', 'source/Dockerfile'), ('F10', 'authorized-artifact.txt')]:
            self.setUp(); r = self.fixture(scenario)
            (self.task / 'participant' / name).write_text('unintended edit')
            with self.assertRaises(ValueError): repair(self.task, r)

    def test_sealed_task_cannot_be_repaired(self):
        r = self.fixture(); (self.task / 'SHA256SUMS.txt').write_text('sealed')
        with self.assertRaises(ValueError): repair(self.task, r)

    def test_no_fabricated_human_events(self):
        r = new_record('F11', 'G', 'automated-validation', {}, synthetic=True)
        for kind, fields in [('prepared', {}), ('start', {}), ('automatic-finished', {'outcome': 'completed'})]:
            record_event(r, kind, clock(), **fields)
        self.assertIsNone(r['humanReviewStart'])
        self.assertFalse(r['eligibleForHumanCalibration'])
        for kind in ('investigate', 'correct', 'wait', 'pause'):
            with self.assertRaises(ValueError): record_event(r, kind, clock(), note='invented human activity')
        self.assertEqual(r['humanAcceptance'], 'pending')

    def test_later_acceptance_cannot_make_automation_human(self):
        r = self.fixture(); r.update(dataset='calibration', status='COMPLETED', cleanup='completed', synthetic=False)
        review = {'decision': 'accepted', 'purpose': 'calibration', 'assistance': 'none'}
        self.assertIn('execution:scripted', eligibility_reasons(r, review))
        with self.assertRaises(ValueError): cli.require_human(r)

    def detection(self, arm='G', code=42, status='PASS', control='manifest'):
        r = self.fixture(arm=arm)
        r['detection'] = None
        op = self.task / 'operations/0001-start'; op.mkdir()
        proof = op / 'detection-evidence.json'
        write_json(proof, {'status': status, 'detected': True, 'diagnostics': [
            'PRIVILEGED: quotes-node must declare privileged=false',
            'ESCALATION: quotes-node must declare allowPrivilegeEscalation=false']})
        write_json(op / 'request.json', {**SCRIPTED, 'started': clock(), 'kind': 'scripted-requested'})
        write_json(op / 'detection.json', {**SCRIPTED, 'scenario': 'F11', 'status': 'ATTRIBUTED_DETECTION',
            'control': control, 'at': clock(), 'evidence': {'path': proof.name, 'sha256': sha256(proof)}})
        write_json(op / 'exit.json', {**SCRIPTED, 'exitCode': code, 'finished': clock()})
        return r, op

    def test_detection_requires_expected_control_reason_hash_and_exit(self):
        r, op = self.detection()
        require_detection(self.task, r, op, 'automatic')
        for key, value in [('status', 'INTEGRATION_ERROR'), ('diagnostics', ['unrelated policy'])]:
            proof = op / 'detection-evidence.json'; data = json.loads(proof.read_text()); data[key] = value
            write_json(proof, data)
            receipt = json.loads((op / 'detection.json').read_text()); receipt['evidence']['sha256'] = sha256(proof)
            write_json(op / 'detection.json', receipt)
            with self.assertRaises(ValueError): require_detection(self.task, r, op, 'automatic')

    def test_zero_exit_never_establishes_detection_or_rejected_correction(self):
        r, op = self.detection(code=0)
        with self.assertRaises(ValueError): require_detection(self.task, r, op, 'automatic')
        write_json(op / 'check-result.json', {'schema': 'manual-task-check/v1', 'scenario': 'F11',
            'phase': 'manifest', 'status': 'CORRECTION_REJECTED',
            'evidence': {'path': 'detection-evidence.json', 'sha256': sha256(op / 'detection-evidence.json')}})
        self.assertEqual(cli.completion_outcome(op, r, 0), 'error')

    def test_r_cannot_claim_automatic_detection(self):
        r, op = self.detection(arm='R')
        with self.assertRaises(ValueError): require_detection(self.task, r, op, 'automatic')

    def test_low_space_stops_without_deletion(self):
        with patch.object(runner.shutil, 'disk_usage', return_value=shutil._ntuple_diskusage(100, 99, 1)):
            with self.assertRaisesRegex(ValueError, 'Insufficient storage'):
                runner.check_space(self.task, 1024, docker_root=self.task)
        self.assertTrue(self.task.is_dir())

    def test_symlinks_and_additional_input_files_rejected(self):
        r = self.fixture()
        (self.task / 'participant/extra').symlink_to(self.task / 'record.json')
        with self.assertRaises(ValueError): repair(self.task, r)

    def test_interrupted_repair_is_never_replayed(self):
        r = self.fixture()
        write_json(self.task / 'operator/repair-started.json', {'synthetic': True})
        with self.assertRaisesRegex(ValueError, 'repeat'): repair(self.task, r)

    def test_unknown_gap_keeps_null_time_and_no_human_durations(self):
        r = self.fixture(); r['started'] = clock(); r['ended'] = clock()
        r.update(status='INCOMPLETE', detection=None, interruption={'timing': 'unknown'})
        summary = summarize(r, clock())
        self.assertIsNone(summary['totalSeconds'])
        self.assertNotIn('activeDiagnosisSeconds', summary)
        self.assertNotIn('activeCorrectionSeconds', summary)

    def test_operational_timeout_applies_to_prepare_and_cleans_process_group(self):
        r = self.fixture(); r.update(status='PREPARING', detection=None, operationalTimeoutSeconds=0.1)
        r['identity']['database'] = {'directory': str(self.task)}
        real_popen = subprocess.Popen
        def slow(*args, **kwargs):
            return real_popen(['bash', '-c', 'echo SYNTHETIC_TIMEOUT; sleep 30'], **kwargs)
        with patch.object(cli.subprocess, 'Popen', side_effect=slow):
            code, op = cli.operation(self.task, r, 'prepare')
        self.assertEqual(code, 124)
        self.assertEqual(r['status'], 'INCOMPLETE')
        self.assertIn('SYNTHETIC_TIMEOUT', (op / 'command.log').read_text())
        self.assertEqual(json.loads((op / 'request.json').read_text())['kind'], 'scripted-requested')
        self.assertEqual(json.loads((op / 'exit.json').read_text())['actor'], 'automation')
        self.assertNotIn('runningOperation', r)

    def test_ctrl_c_retains_interrupted_attempt(self):
        r = self.fixture(); r.update(status='PREPARING', detection=None, operationalTimeoutSeconds=10)
        r['identity']['database'] = {'directory': str(self.task)}
        from unittest.mock import Mock
        process = Mock(pid=999999, wait=Mock(side_effect=KeyboardInterrupt))
        with patch.object(cli.subprocess, 'Popen', return_value=process), patch.object(cli, 'terminate') as terminate:
            code, op = cli.operation(self.task, r, 'prepare')
        self.assertEqual(code, 130); terminate.assert_called_once_with(process)
        self.assertEqual(r['status'], 'INCOMPLETE')
        self.assertIn('interruptedOperation', r)
        self.assertEqual(json.loads((op / 'exit.json').read_text())['exitCode'], 130)

    def test_failed_cleanup_is_not_silently_retried(self):
        r = self.fixture(); r['cleanup'] = 'error'; write_json(self.task / 'record.json', r)
        with patch.object(runner, 'invoke') as invoke:
            with self.assertRaisesRegex(ValueError, 'retry-cleanup'): runner.cleanup_task(self.task)
            invoke.assert_not_called()
        with patch.object(runner, 'invoke', return_value=0) as invoke:
            runner.cleanup_task(self.task, retry=True)
            invoke.assert_called_once_with(self.task, 'cleanup')

    def test_missing_g_detection_never_invokes_extra_diagnostic(self):
        r = self.fixture(); r.update(status='READY', detection=None)
        write_json(self.task / 'record.json', r)
        calls = []
        with patch.object(cli, 'guard_task'), patch.object(runner, 'invoke', side_effect=lambda task, cmd, **kw: calls.append(cmd)):
            with self.assertRaises(ValueError): runner.execute_task(self.task)
        self.assertEqual(calls, ['start'])
        self.assertFalse((self.task / 'operator/repair.json').exists())

    def test_report_preserves_six_unexecuted_positions_without_acceptance(self):
        from manual_tasks import make_sequence
        plan = {'source': {'synthetic': True}, 'database': {'synthetic': True},
                'ordering': make_sequence('synthetic-six'), 'operationalTimeoutSeconds': runner.TIMEOUTS}
        value, markdown = report(self.task, plan, ROOT)
        self.assertEqual(value['validated'], 0)
        self.assertEqual(len(value['combinations']), 6)
        self.assertTrue(all(r['assessment'] == 'NOT_EXECUTED' for r in value['combinations']))
        self.assertNotIn('accepted', markdown)
        self.assertNotIn('reviewer', json.dumps(value))

    def test_storage_failure_on_resumed_task_still_cleans_owned_lab(self):
        r = self.fixture(); r.update(status='READY', detection=None, position=1)
        session = self.task.parent
        destination = session / 'automated-validation' / self.task.name
        destination.parent.mkdir(); self.task.rename(destination); self.task = destination
        r['taskDirectory'] = str(self.task); write_json(self.task / 'record.json', r)
        plan = {**SCRIPTED, 'ordering': {'seed': 'synthetic', 'sequence': [{'position': 1, 'scenario': 'F11', 'arm': 'G'}]},
                'database': {'directory': str(session)}}
        write_json(session / 'plan.json', plan)
        args = argparse.Namespace(database=None, seed=None, retry_cleanup=False)
        with patch.object(cli, 'load_plan', return_value=(session / 'plan.json', plan)), \
             patch.object(runner, 'check_space', side_effect=runner.StorageError('Insufficient storage')), \
             patch.object(runner, 'cleanup_task') as cleanup, \
             patch.object(runner, 'sealed_task'), patch.object(runner, 'write_report', return_value={'validated': 0}):
            self.assertEqual(runner.run(args, session), 2)
        cleanup.assert_called_once_with(self.task, False)
        self.assertEqual(cli.read(self.task / 'record.json')['status'], 'INCOMPLETE')

    def test_shared_database_reuse_preserves_bytes_and_rejects_drift(self):
        database = self.task / 'database'; (database / 'db').mkdir(parents=True)
        (database / 'db/trivy.db').write_text('SYNTHETIC DATABASE BYTES; NOT A SCANNER DB')
        write_json(database / 'db/metadata.json', {'Version': 2, 'UpdatedAt': 'synthetic'})
        state = self.task / 'state'; state.mkdir(); write_json(state / 'state.json', {})
        before = input_hashes(database)
        script = '''set -Eeuo pipefail
source scripts/lib/delivery.sh
root=$1; state_dir=$2; GP_VULNERABILITY_DB=$3
manual_execution_mode=scripted; GP_REUSE_VULNERABILITY_DB=1
get() { jq -er --arg key "$1" '.[$key]' "$state_dir/state.json"; }
put() { jq --arg key "$1" --arg value "$2" '.[$key]=$value' "$state_dir/state.json" > "$state_dir/next"; mv "$state_dir/next" "$state_dir/state.json"; }
fail() { echo "$*" >&2; exit 1; }
delivery_database_prepare
delivery_database_prepare
'''
        result = subprocess.run(['bash', '-c', script, 'synthetic', str(self.task), str(state), str(database)], cwd=ROOT, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(before, input_hashes(database))
        self.assertEqual(cli.read(state / 'state.json')['vulnerabilityDatabase'], str(database))
        self.assertFalse((self.task / '.tmp').exists())
        (database / 'db/trivy.db').write_text('SYNTHETIC DRIFT')
        result = subprocess.run(['bash', '-c', script, 'synthetic', str(self.task), str(state), str(database)], cwd=ROOT, capture_output=True)
        self.assertNotEqual(result.returncode, 0)

    def test_shell_receipts_retain_machine_identity(self):
        folder = self.task / 'operations/0001-tool'; folder.mkdir()
        proof = self.task / 'synthetic.json'; write_json(proof, {'synthetic': True})
        script = '''set -Eeuo pipefail
source tests/scenarios/manual-tasks.sh
manual_operation=$1; manual_scenario=F11; manual_execution_mode=scripted
manual_task_detection manifest "$2"
manual_task_check_result CORRECTION_REJECTED manifest "$2"
'''
        result = subprocess.run(['bash', '-c', script, 'synthetic', str(folder), str(proof)], cwd=ROOT, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        for name in ('detection.json', 'check-result.json'):
            data = cli.read(folder / name)
            self.assertTrue(all(data[k] == v for k, v in SCRIPTED.items()))

    def test_task_cannot_change_frozen_operational_timeout_or_position(self):
        from manual_tasks import make_sequence
        r = self.fixture(); r.update(synthetic=False, testFixture='SYNTHETIC GUARD ONLY', plan='synthetic')
        plan = {**SCRIPTED, 'ordering': make_sequence('synthetic-guard'), 'operationalTimeoutSeconds': runner.TIMEOUTS}
        position = next(p['position'] for p in plan['ordering']['sequence'] if p['scenario'] == 'F11' and p['arm'] == 'G')
        r.update(position=position, operationalTimeoutSeconds=999999)
        with patch.object(cli, 'load_plan', return_value=('synthetic', plan)):
            with self.assertRaisesRegex(ValueError, 'timeout differs'): cli.guard_task(self.task, r)
            r.update(operationalTimeoutSeconds=runner.TIMEOUTS['F11'], position=7)
            with self.assertRaisesRegex(ValueError, 'position'): cli.guard_task(self.task, r)


class SyntheticOrderTests(AutomatedTests):
    # Run only the added orchestration cases in this class (base tests are loaded
    # separately below); all external delivery calls here are explicitly fake.
    def operation(self, task, name, **kwargs):
        r = json.loads((task / 'record.json').read_text())
        op = task / 'operations' / f'{len(list((task / "operations").iterdir())) + 1:04d}-{name}'
        op.mkdir()
        write_json(op / 'request.json', {**SCRIPTED, 'started': clock(), 'kind': 'scripted-requested'})
        code = 0
        if name == 'start': record_event(r, 'start', clock())
        if name == 'tool': record_event(r, 'tool-started', clock(), tool=kwargs['tool'])
        if name == 'tool' or name == 'start' and r['arm'] == 'G':
            control = runner.CONTROLS[r['scenario']]
            data = {'F11': {'status': 'PASS', 'detected': True, 'diagnostics': [
                'PRIVILEGED: quotes-node must declare privileged=false',
                'ESCALATION: quotes-node must declare allowPrivilegeEscalation=false']},
                'F10': {'status': 'PROVENANCE_REPOSITORY_UNAUTHORIZED', 'inventoryComplete': True},
                'F03': {'status': 'PASS', 'case': 'F03-vulnerable', 'target': [{'VulnerabilityID': 'CVE-2021-44906',
                    'PkgName': 'minimist', 'InstalledVersion': '1.2.5', 'Severity': 'CRITICAL', 'FixedVersion': '1.2.6'}]}}[r['scenario']]
            write_json(op / 'detection-evidence.json', data)
            receipt = {'scenario': r['scenario'], 'status': 'ATTRIBUTED_DETECTION', 'control': control, 'at': clock(),
                'evidence': {'path': 'detection-evidence.json', 'sha256': sha256(op / 'detection-evidence.json')}}
            write_json(op / 'detection.json', {**SCRIPTED, **receipt})
            record_event(r, 'detected', receipt['at'], mechanism=('automatic:' if name == 'start' else 'scripted:') + control,
                evidence=cli.evidence_link(op / 'detection.json', task))
            code = 42
        if name == 'start': record_event(r, 'automatic-finished', clock(), outcome='blocked' if code == 42 else 'completed')
        if name == 'tool': record_event(r, 'tool-finished', clock(), tool=kwargs['tool'])
        if name == 'check':
            record_event(r, 'verification-started', clock())
            write_json(op / 'completion.json', {**SCRIPTED, 'scenario': r['scenario'], 'status': 'VALIDATED_COMPLETION'})
            write_json(op / 'check-result.json', {**SCRIPTED, 'schema': 'manual-task-check/v1', 'phase': 'complete',
                'scenario': r['scenario'], 'status': 'VALIDATED_COMPLETION',
                'evidence': {'path': 'completion.json', 'sha256': sha256(op / 'completion.json')}})
            record_event(r, 'verification-finished', clock(), outcome='completed', evidence=cli.evidence_link(op / 'check-result.json', task))
        write_json(op / 'exit.json', {**SCRIPTED, 'exitCode': code, 'finished': clock()})
        write_json(task / 'record.json', r)
        return 0

    def test_six_paths_order_repairs_and_verified_continuation(self):
        for scenario in ('F03', 'F10', 'F11'):
            for arm in ('R', 'G'):
                with self.subTest(scenario=scenario, arm=arm):
                    self.setUp(); r = self.fixture(scenario, arm)
                    r.update(status='READY', detection=None); write_json(self.task / 'record.json', r)
                    with patch.object(cli, 'guard_task'), patch.object(runner, 'invoke', side_effect=self.operation):
                        runner.execute_task(self.task)
                        before = input_hashes(self.task)
                        runner.execute_task(self.task)  # Verified boundary: no replay.
                        self.assertEqual(before, input_hashes(self.task))
                    current = cli.read(self.task / 'record.json')
                    self.assertEqual(current['status'], 'COMPLETED')
                    self.assertIsNone(current['humanReviewStart'])
                    self.assertEqual(current['humanAcceptance'], 'pending')
                    self.assertEqual(len(list((self.task / 'operations').glob('*-tool'))), 1 if arm == 'R' else 0)
                    require_order(self.task, current)

    def test_r_integration_failure_prevents_diagnostic_and_repair(self):
        r = self.fixture(arm='R'); r.update(status='READY', detection=None); write_json(self.task / 'record.json', r)
        def failed(task, command, **kwargs):
            r = cli.read(task / 'record.json'); r['status'] = 'INCOMPLETE'; write_json(task / 'record.json', r)
        with patch.object(cli, 'guard_task'), patch.object(runner, 'invoke', side_effect=failed) as invoke:
            with self.assertRaises(ValueError): runner.execute_task(self.task)
        self.assertEqual(invoke.call_count, 1)
        self.assertFalse((self.task / 'operator/repair.json').exists())

    def test_successful_check_exit_cannot_override_rejected_correction(self):
        r = self.fixture(); r.update(status='READY', detection=None); write_json(self.task / 'record.json', r)
        def reject(task, command, **kwargs):
            if command == 'check': return 0  # REVIEW remains; no completion receipt.
            return self.operation(task, command, **kwargs)
        with patch.object(cli, 'guard_task'), patch.object(runner, 'invoke', side_effect=reject):
            with self.assertRaisesRegex(ValueError, 'correction rejected'): runner.execute_task(self.task)
        self.assertEqual(cli.read(self.task / 'record.json')['status'], 'REVIEW')


class SyntheticArchiveTests(unittest.TestCase):
    def setUp(self):
        import test_manual_task_reviews
        self.fixture = test_manual_task_reviews.ReviewTests()
        self.fixture.setUp(); self.addCleanup(self.fixture.doCleanups)

    def test_scripted_archive_binding_and_later_review_stay_ineligible(self):
        task = self.fixture.task(**SCRIPTED)
        (task / '.lock').touch()
        original = input_hashes(task)
        sealed_task(task, self.fixture.root)
        self.fixture.review(task, purpose='rehearsal')
        result = effective_review(task, self.fixture.root)
        self.assertEqual(result['decision'], 'accepted')  # Synthetic human declaration only.
        self.assertFalse(result['eligibleForCalibration'])
        self.assertIn('execution:scripted', result['reasons'])
        self.assertEqual(original, input_hashes(task))
        with self.assertRaises(ValueError):
            self.fixture.review(task, purpose='calibration')
        with self.assertRaises(ValueError):
            self.fixture.freeze([task])

    def test_archive_cannot_drop_machine_actor_or_substitute_task(self):
        task = self.fixture.task(**SCRIPTED)
        for field in ('actor', 'executionMode', 'eligibleForHumanCalibration', 'identity'):
            record = json.loads((task / 'record.json').read_text()); record.pop(field)
            self.fixture.archive(task, snapshot=record)
            with self.assertRaises(ValueError): sealed_task(task, self.fixture.root)

    def test_scripted_plan_rejects_human_measurement_even_with_limits(self):
        self.fixture.plan.update(SCRIPTED)
        for name in ('plan.json', 'initial-plan.json'):
            write_json(self.fixture.session / name, self.fixture.plan)
        import test_manual_task_reviews
        with self.assertRaisesRegex(ValueError, 'cannot be converted'):
            test_manual_task_reviews.cli.prepare_command(argparse.Namespace(plan=str(self.fixture.plan_path), dataset='measurement'))

    def test_source_and_database_drift_block_continuation(self):
        import test_manual_task_reviews
        for function in ('source_identity', 'database_identity'):
            with patch.object(test_manual_task_reviews.cli, function, return_value={'changed': True}):
                with self.assertRaises(ValueError): test_manual_task_reviews.cli.load_plan(self.fixture.plan_path)

    def test_real_packager_retains_scripted_identity_originals_and_repairs(self):
        import tarfile
        packager = importlib.import_module('package-evidence')
        from lane_a_evidence import verify_package
        task = self.fixture.session / 'automated-validation/task-packaging'
        for name in ('operator', 'operations', 'participant'): (task / name).mkdir(parents=True)
        run = self.fixture.root / 'evidence/raw/run-packaging'; run.mkdir(parents=True)
        (task / 'operator/state-path.txt').write_text(str(run) + '\n')
        write_json(task / 'operator/prepared.json', {**SCRIPTED, 'synthetic': True})
        write_json(task / 'operator/original-inputs.json', {**SCRIPTED, 'contents': {'Dockerfile': '# SYNTHETIC original'}})
        write_json(task / 'operator/repair.json', {**SCRIPTED, 'transformation': 'SYNTHETIC TEST ONLY'})
        (task / 'participant/image.txt').write_text('SYNTHETIC IMAGE REFERENCE')
        record = new_record('F11', 'G', 'automated-validation', {'synthetic': True}, synthetic=True)
        record.update(taskDirectory=str(task), events=[{'evidence': cli.evidence_link(task / 'operator/repair.json', task)}])
        write_json(run / 'manual-task.json', record)
        (run / 'cosign.key').write_text('SYNTHETIC PRIVATE FILE MUST BE EXCLUDED')
        destination = self.fixture.root / 'evidence/packages'
        packager.package(run, destination, 'INCOMPLETE')
        archive = destination / 'run-packaging.tar.gz'
        verify_package(archive)
        with tarfile.open(archive) as bundle:
            summary = json.load(bundle.extractfile('run-packaging/execution-summary.json'))
            self.assertTrue(all(summary[k] == v for k, v in SCRIPTED.items()))
            self.assertNotIn('human-operated', summary['scope'])
            for name in ('operator/original-inputs.json', 'operator/repair.json', 'participant/image.txt'):
                self.assertEqual(bundle.extractfile('run-packaging/' + name).read(), (task / name).read_bytes())
            self.assertNotIn('run-packaging/cosign.key', bundle.getnames())


def load_tests(loader, tests, pattern):
    suite = loader.loadTestsFromTestCase(AutomatedTests)
    suite.addTests(SyntheticOrderTests(name) for name in SyntheticOrderTests.__dict__ if name.startswith('test_'))
    suite.addTests(loader.loadTestsFromTestCase(SyntheticArchiveTests))
    return suite


if __name__ == '__main__': unittest.main()
