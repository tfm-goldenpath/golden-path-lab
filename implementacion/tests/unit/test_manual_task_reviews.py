"""Hermetic SYNTHETIC fixtures only; positive cases model real flags, not real people.

Every fixture carries a test label, lives in a temporary synthetic store, and uses
mocked source/database identities. Nothing here establishes human calibration.
"""
import argparse
import copy
from contextlib import redirect_stdout
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from manual_tasks import clock, make_sequence, new_record, sha256, write_json
spec = importlib.util.spec_from_file_location('review_cli', Path(__file__).resolve().parents[2] / 'scripts/manual-tasks.py')
cli = importlib.util.module_from_spec(spec); spec.loader.exec_module(cli)


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='synthetic-human-review-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.session = self.root / 'evidence/manual-tasks/synthetic-session'
        self.session.mkdir(parents=True)
        self.plan_path = self.session / 'plan.json'
        self.plan = {'schema': 'manual-task-plan/v1', 'lane': 'A', 'ordering': make_sequence('synthetic-only'),
                     'source': {'commit': 'synthetic-only', 'treeSha256': 'a'*64},
                     'database': {'directory': 'synthetic-only', 'sha256': {}},
                     'tools': {'editor': 'Synthetic editor'}, 'environment': {'syntheticFixture': True},
                     'limitsSeconds': dict.fromkeys(cli.SCENARIOS), 'limitsReview': None}
        write_json(self.plan_path, self.plan)
        write_json(self.session / 'initial-plan.json', self.plan)
        for name, value in [('ROOT', self.root), ('STORE', self.session.parent)]:
            context = patch.object(cli, name, value); context.start(); self.addCleanup(context.stop)
        for name, value in [('source_identity', self.plan['source']), ('database_identity', self.plan['database'])]:
            context = patch.object(cli, name, return_value=value); context.start(); self.addCleanup(context.stop)

    def task(self, scenario='F11', arm='G', suffix='', **fields):
        task = self.session / fields.get('dataset', 'calibration') / ('task-synthetic-' + scenario + arm + suffix)
        (task / 'operator').mkdir(parents=True)
        r = new_record(scenario, arm, 'calibration', {k: self.plan[k] for k in ['source', 'database', 'tools', 'environment']})
        # synthetic=False models the real-input branch. This remains an explicitly
        # labelled, hermetic test fixture, never a real observation or acceptance.
        r.update(testFixture='SYNTHETIC UNIT TEST ONLY', status='COMPLETED', cleanup='completed',
                 taskDirectory=str(task), plan=str(self.plan_path), events=[])
        r.update(fields)
        write_json(task / 'record.json', r)
        write_json(task / 'summary.json', {'testFixture': 'SYNTHETIC ONLY', 'humanAcceptance': 'pending'})
        run = self.root / 'evidence/raw' / ('run-' + ''.join(c for c in task.name if c.isalnum()))
        (task / 'operator/state-path.txt').write_text(str(run) + '\n')
        package = self.root / 'evidence/packages' / (run.name + '.tar.gz')
        package.parent.mkdir(exist_ok=True)
        data = b'SYNTHETIC UNIT TEST ARCHIVE; no live result\n'
        sums = hashlib.sha256(data).hexdigest() + '  synthetic.txt\n'
        with tarfile.open(package, 'w:gz') as archive:
            for name, content in [('synthetic.txt', data), ('SHA256SUMS.txt', sums.encode())]:
                item = tarfile.TarInfo(run.name + '/' + name); item.size = len(content)
                archive.addfile(item, io.BytesIO(content))
        Path(str(package) + '.sha256').write_text(sha256(package) + '  ' + package.name + '\n')
        cli.task_checksums(task)
        return task

    def review(self, task, **fields):
        args = argparse.Namespace(task=str(task), reviewer='Synthetic declared reviewer', decision='accepted',
                                  rationale='SYNTHETIC TEST ONLY', assistance='none', purpose='calibration', supersedes=None)
        for name, value in fields.items(): setattr(args, name, value)
        with redirect_stdout(io.StringIO()): cli.review_command(args)
        return sorted((self.session / 'reviews' / task.name).glob('review-*.json'))[-1]

    def status(self, task):
        output = io.StringIO()
        with redirect_stdout(output): cli.run_command(argparse.Namespace(command='status', task=str(task)))
        return json.loads(output.getvalue())

    def freeze(self, tasks):
        args = argparse.Namespace(plan=str(self.plan_path), calibration=list(map(str, tasks)),
                                  reviewer='Synthetic reviewer', rationale='SYNTHETIC TEST ONLY',
                                  limit=['F03=30', 'F10=40', 'F11=50'])
        with redirect_stdout(io.StringIO()): cli.freeze_command(args)

    def six(self, reviewed=True):
        tasks = [self.task(s, a) for s in cli.SCENARIOS for a in ('R', 'G')]
        if reviewed:
            for task in tasks: self.review(task)
        return tasks

    def test_pending_by_default_and_original_pending_is_not_acceptance(self):
        task = self.task()
        value = self.status(task)
        self.assertEqual(value['humanAcceptance'], 'pending')
        self.assertFalse(value['review']['eligibleForCalibration'])
        self.assertEqual(value['nextAction'], 'review')

    def test_explicit_accepted_eligible_calibration_without_mutating_originals(self):
        task = self.task()
        originals = {p: p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        path = self.review(task)
        value = self.status(task)
        self.assertEqual(value['humanAcceptance'], 'accepted')
        self.assertEqual(value['archivedHumanAcceptance'], 'pending')
        self.assertTrue(value['review']['eligibleForCalibration'])
        self.assertEqual(value['review']['path'], str(path))
        review = cli.read(path)
        self.assertTrue(review['reviewedAt'])
        self.assertEqual(review['assistance'], 'none')
        for p, content in originals.items(): self.assertEqual(p.read_bytes(), content, str(p))

    def test_accepted_guided_rehearsal_and_unknown_assistance_are_ineligible(self):
        for assistance in ('ai', 'human', 'ai-and-human', 'unknown'):
            task = self.task(suffix=assistance)
            self.review(task, purpose='rehearsal', assistance=assistance)
            value = self.status(task)
            self.assertEqual(value['humanAcceptance'], 'accepted')
            self.assertFalse(value['review']['eligibleForCalibration'])
            self.assertIn('purpose:rehearsal', value['review']['reasons'])
            self.assertIn('assistance:' + assistance, value['review']['reasons'])

    def test_blank_reviewer_or_rationale_and_unknown_decision_rejected(self):
        task = self.task()
        for fields in [{'reviewer': ' \t'}, {'rationale': ' \n'}, {'decision': 'automatic'}, {'assistance': ''}]:
            with self.subTest(fields=fields), self.assertRaises(ValueError): self.review(task, **fields)
        self.assertFalse((self.session / 'reviews' / task.name).exists())

    def test_review_requires_closed_and_cleaned_up_attempt(self):
        for status, cleanup in [('READY', 'completed'), ('REVIEW', 'completed'), ('COMPLETED', 'error')]:
            task = self.task(suffix=status+cleanup, status=status, cleanup=cleanup)
            with self.assertRaisesRegex(ValueError, 'closed|cleaned'): self.review(task)

    def test_incomplete_synthetic_and_measurement_reviews_retain_exclusion_reasons(self):
        for fields, reason in [({'status': 'INCOMPLETE'}, 'technical:INCOMPLETE'), ({'synthetic': True}, 'synthetic'),
                               ({'dataset': 'measurement'}, 'dataset:measurement')]:
            task = self.task(suffix=reason, **fields)
            self.review(task)
            self.assertIn(reason, self.status(task)['review']['reasons'])

    def test_reviews_are_immutable_and_revisions_require_explicit_predecessor(self):
        task = self.task()
        first = self.review(task); original = first.read_bytes()
        with self.assertRaisesRegex(ValueError, 'supersedes'): self.review(task)
        second = self.review(task, supersedes=str(first), decision='rejected')
        self.assertNotEqual(first, second)
        self.assertEqual(first.read_bytes(), original)
        self.assertEqual(self.status(task)['humanAcceptance'], 'rejected')
        with self.assertRaisesRegex(ValueError, 'supersedes'): self.review(task, supersedes=str(first))

    def test_changed_review_or_task_or_archive_cannot_be_used(self):
        for what in ['review', 'record', 'archive', 'reference']:
            task = self.task(suffix=what); path = self.review(task)
            if what == 'review': path.write_text(path.read_text() + ' ')
            elif what == 'reference':
                value = cli.read(path); value['task']['recordSha256'] = '0'*64
                write_json(path, value)
                changed = path.with_name(path.name[:12] + sha256(path) + '.json')
                path.rename(changed)
            elif what == 'record': (task / 'record.json').write_text((task / 'record.json').read_text() + ' ')
            else:
                (self.root / 'evidence/packages' / (Path((task / 'operator/state-path.txt').read_text().strip()).name + '.tar.gz')).write_bytes(b'changed synthetic archive')
            with self.subTest(what=what), self.assertRaises((ValueError, OSError)): self.status(task)

    def test_missing_manifest_member_and_unsafe_event_reference_rejected(self):
        for case in ('omitted', 'escape'):
            task = self.task(suffix=case)
            if case == 'omitted': (task / 'unlisted.txt').write_text('SYNTHETIC')
            else:
                r = cli.read(task / 'record.json')
                r['events'] = [{'evidence': {'path': '../outside.json', 'sha256': '0'*64}}]
                write_json(task / 'record.json', r)
                (task / 'SHA256SUMS.txt').unlink(); cli.task_checksums(task)
            with self.assertRaises(ValueError): self.review(task)

    def test_historical_review_does_not_load_current_plan_or_change_source_guard(self):
        task = self.task()
        with patch.object(cli, 'source_identity', return_value={'changed': True}):
            self.review(task)
            self.assertEqual(self.status(task)['humanAcceptance'], 'accepted')
            with self.assertRaisesRegex(ValueError, 'Source/configuration'): cli.load_plan(self.plan_path)
            with self.assertRaisesRegex(ValueError, 'Source/configuration'): self.freeze([task])

    def test_six_unreviewed_or_rejected_selections_block_freezing(self):
        tasks = self.six(reviewed=False)
        with self.assertRaisesRegex(ValueError, 'review'): self.freeze(tasks)
        for task in tasks: self.review(task)
        first = sorted((self.session / 'reviews' / tasks[0].name).glob('*.json'))[-1]
        self.review(tasks[0], decision='rejected', supersedes=str(first))
        with self.assertRaisesRegex(ValueError, 'eligible'): self.freeze(tasks)
        self.assertIsNone(cli.read(self.plan_path)['limitsReview'])

    def test_complete_six_coverage_binds_reviews_and_later_changes_block_plan(self):
        tasks = self.six(); self.freeze(tasks)
        _, frozen = cli.load_plan(self.plan_path)
        selections = frozen['limitsReview']['calibrations']
        self.assertEqual(len(selections), 6)
        ref = selections[0]['review']
        review = self.session / ref['path']
        self.assertEqual(sha256(review), ref['sha256'])
        original = review.read_bytes()
        review.write_bytes(original + b' ')
        with self.assertRaisesRegex(ValueError, 'review|Review'): cli.load_plan(self.plan_path)
        review.write_bytes(original)
        self.review(tasks[0], decision='rejected', supersedes=str(review))
        with self.assertRaisesRegex(ValueError, 'review|Review'): cli.load_plan(self.plan_path)

    def test_duplicate_or_missing_combinations_are_ambiguous(self):
        tasks = self.six()
        for selection in [tasks[:-1], tasks + tasks[:1], tasks[:-1]+tasks[:1]]:
            with self.subTest(selection=selection), self.assertRaisesRegex(ValueError, 'six|Duplicate'): self.freeze(selection)
        duplicate = self.task('F03', 'R', suffix='duplicate'); self.review(duplicate)
        with self.assertRaisesRegex(ValueError, 'Duplicate'): self.freeze(tasks[:-1] + [duplicate])

    def test_guided_synthetic_incomplete_and_configuration_drift_block_freeze(self):
        tasks = self.six()
        extra = self.task('F11', 'G', suffix='guided'); self.review(extra, purpose='rehearsal', assistance='ai')
        with self.assertRaisesRegex(ValueError, 'eligible'): self.freeze(tasks[:-1] + [extra])
        for field in ['source', 'database', 'tools', 'environment']:
            identity = copy.deepcopy(cli.read(tasks[-1] / 'record.json')['identity'])
            identity[field] = {'changed': True}
            task = self.task('F11', 'G', suffix=field, identity=identity); self.review(task)
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'configuration'): self.freeze(tasks[:-1]+[task])
        for fields in [{'synthetic': True}, {'status': 'INCOMPLETE'}, {'cleanup': 'error'}]:
            task = self.task('F11', 'G', suffix=str(len(list(tasks[-1].parent.iterdir()))), **fields)
            with self.subTest(fields=fields), self.assertRaises(ValueError): self.freeze(tasks[:-1]+[task])

    def test_next_actions_are_procedural_and_do_not_emit_events(self):
        for state, cleanup, expected in [('READY', None, 'start'), ('REVIEW', None, 'investigate/edit/check'),
                                         ('COMPLETED', None, 'cleanup'), ('INCOMPLETE', 'completed', 'review')]:
            task = self.task(suffix=state, status=state, cleanup=cleanup)
            before = (task / 'record.json').read_bytes()
            self.assertEqual(self.status(task)['nextAction'], expected)
            self.assertEqual((task / 'record.json').read_bytes(), before)

    def test_interrupted_review_write_exposes_no_partial_review(self):
        import manual_task_reviews as reviews
        task = self.task()
        with patch.object(reviews.os, 'link', side_effect=OSError('synthetic publication interrupted')):
            with self.assertRaises(OSError): self.review(task)
        self.assertEqual(self.status(task)['humanAcceptance'], 'pending')
        self.review(task)
        self.assertEqual(self.status(task)['humanAcceptance'], 'accepted')

    def test_legacy_frozen_review_metadata_never_implies_acceptance(self):
        plan = copy.deepcopy(self.plan); plan['limitsReview'] = {'reviewer': 'Synthetic legacy reviewer', 'calibrations': []}
        write_json(self.plan_path, plan); write_json(self.session / 'frozen-plan.json', plan)
        with self.assertRaisesRegex(ValueError, 'review|Review'): cli.load_plan(self.plan_path)

    def test_task_reference_substitution_and_branched_history_are_rejected(self):
        task = self.task(); path = self.review(task)
        original = path.read_bytes()
        value = cli.read(path); value['task']['directory'] = str(self.session / 'other-task')
        write_json(path, value)
        changed = path.with_name(path.name[:12] + sha256(path) + '.json')
        path.rename(changed)
        with self.assertRaisesRegex(ValueError, 'references'): self.status(task)
        changed.unlink(); path.write_bytes(original)
        duplicate = path.with_name('review-0001-' + '0'*64 + '.json')
        duplicate.write_bytes(original)
        with self.assertRaisesRegex(ValueError, 'hash|ambiguous'): self.status(task)

    def test_frozen_selection_keeps_hash_even_if_changed_review_is_renamed(self):
        tasks = self.six(); self.freeze(tasks)
        selected = cli.read(self.plan_path)['limitsReview']['calibrations'][0]['review']
        path = self.session / selected['path']
        value = cli.read(path); value['rationale'] += ' SYNTHETIC MODIFICATION'
        write_json(path, value)
        path.rename(path.with_name(path.name[:12] + sha256(path) + '.json'))
        with self.assertRaisesRegex(ValueError, 'review|Review'): cli.load_plan(self.plan_path)

    def test_source_database_and_initial_plan_checks_still_block_frozen_use(self):
        tasks = self.six(); self.freeze(tasks)
        for name, pattern in [('source_identity', 'Source/configuration'), ('database_identity', 'database')]:
            with patch.object(cli, name, return_value={'changed': True}):
                with self.assertRaisesRegex(ValueError, pattern): cli.load_plan(self.plan_path)
        value = cli.read(self.plan_path); value['tools']['editor'] = 'Different synthetic editor'
        write_json(self.plan_path, value)
        with self.assertRaisesRegex(ValueError, 'configuration'): cli.load_plan(self.plan_path)


if __name__ == '__main__': unittest.main()
