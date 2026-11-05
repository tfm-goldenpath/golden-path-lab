"""Bounded version-update configuration contract; no bot/resolver execution."""
import copy
import json
from pathlib import Path
import re
import subprocess
import unittest

REPO = Path(__file__).resolve().parents[3]
CONFIG = '.github/dependabot.yml'
SCHEMA_PACKAGES = {'ajv', 'ajv-formats', 'ajv-formats-draft2019'}


def updater_paths(paths):
    """Include alternative YAML and repository-local Renovate filenames."""
    return {p for p in paths if re.fullmatch(
        r'dependabot\.ya?ml|renovate\.json5?|\.renovaterc(?:\.json5?)?', Path(p).name)}


class DependabotTests(unittest.TestCase):
    def config(self):
        return json.loads(subprocess.check_output(
            ['conftest', 'parse', '--parser', 'yaml', str(REPO/CONFIG)],
            text=True, timeout=30))

    def assert_bounded(self, config):
        # An explicit allowlist prevents hidden ignores, credentials, extra
        # ecosystems/locations and grouping settings from broadening this scope.
        self.assertEqual(set(config), {'version', 'updates'})
        self.assertEqual(config['version'], 2)
        self.assertEqual(len(config['updates']), 1)
        update = config['updates'][0]
        self.assertEqual(set(update), {'package-ecosystem', 'directory', 'schedule',
                                      'open-pull-requests-limit', 'versioning-strategy', 'groups'})
        self.assertEqual(update['package-ecosystem'], 'npm')
        self.assertEqual(update['directory'], '/implementation/tooling')
        self.assertEqual(update['schedule'], {'interval': 'weekly', 'day': 'monday',
                                            'time': '08:00', 'timezone': 'Europe/Madrid'})
        self.assertEqual(update['open-pull-requests-limit'], 3)
        self.assertEqual(update['versioning-strategy'], 'increase')
        self.assertEqual(set(update['groups']), {'schema-validation'})
        group = update['groups']['schema-validation']
        self.assertEqual(set(group), {'applies-to', 'patterns', 'update-types'})
        self.assertEqual(group['applies-to'], 'version-updates')
        self.assertCountEqual(group['patterns'], SCHEMA_PACKAGES)
        self.assertCountEqual(group['update-types'], ['minor', 'patch'])

    def test_real_configuration(self):
        self.assert_bounded(self.config())

    def test_scope_and_privilege_expansions_are_rejected(self):
        mutations = [
            lambda c, u, g: u.update(directory='/'),
            lambda c, u, g: u.update(directory='/implementation/*'),
            lambda c, u, g: u.update(directories=['/implementation/tooling', '/']),
            lambda c, u, g: u.update({'package-ecosystem': 'github-actions'}),
            lambda c, u, g: c['updates'].append(copy.deepcopy(u)),
            lambda c, u, g: u.pop('open-pull-requests-limit'),
            lambda c, u, g: u.update({'open-pull-requests-limit': 10}),
            lambda c, u, g: u['schedule'].pop('timezone'),
            lambda c, u, g: u['schedule'].update(interval='daily'),
            lambda c, u, g: u.update({'versioning-strategy': 'widen'}),
            lambda c, u, g: g.update(patterns=['*']),
            lambda c, u, g: g['patterns'].append('@devcontainers/cli'),
            lambda c, u, g: g['update-types'].append('major'),
            lambda c, u, g: g.update({'applies-to': 'security-updates'}),
            lambda c, u, g: u.update(ignore=[{'dependency-name': '*'}]),
            lambda c, u, g: c.update(registries={'private': {'type': 'npm-registry'}}),
            lambda c, u, g: u.update(registries=['private']),
            lambda c, u, g: c.update(automerge=True),
        ]
        baseline = self.config()
        for index, mutate in enumerate(mutations):
            value = copy.deepcopy(baseline); update = value['updates'][0]
            mutate(value, update, update['groups']['schema-validation'])
            with self.subTest(index=index), self.assertRaises(AssertionError):
                self.assert_bounded(value)

    def test_no_second_repository_updater(self):
        paths = subprocess.check_output(
            ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
            cwd=REPO, text=True).strip('\0').split('\0')
        self.assertEqual(updater_paths(paths), {CONFIG})
        for path in paths:
            if Path(path).name == 'package.json':
                self.assertNotIn('renovate', json.loads((REPO/path).read_text()), path)

    def test_alternative_updater_names_are_detected(self):
        for path in ('.github/dependabot.yaml', 'renovate.json', '.github/renovate.json5',
                     '.renovaterc', '.renovaterc.json', '.gitlab/renovate.json',
                     '.renovate/renovate.json5'):
            with self.subTest(path=path):
                self.assertNotEqual(updater_paths([CONFIG, path]), {CONFIG})

    def test_tooling_pins_remain_exact_and_match_lock(self):
        manifest = json.loads((REPO/'implementation/tooling/package.json').read_text())
        lock = json.loads((REPO/'implementation/tooling/package-lock.json').read_text())
        pins = manifest['dependencies']
        self.assertEqual(set(pins), SCHEMA_PACKAGES | {'@devcontainers/cli'})
        self.assertEqual(pins, lock['packages']['']['dependencies'])
        for name, version in pins.items():
            self.assertRegex(version, r'^\d+\.\d+\.\d+$', name)
            self.assertEqual(version, lock['packages']['node_modules/' + name]['version'])
        # This checks exact-pin shape/consistency only. Existing validator and
        # launcher guards independently define accepted versions; never relax them.


if __name__ == '__main__': unittest.main()
