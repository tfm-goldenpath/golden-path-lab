"""Repository intake contract, not a replacement for GitHub's form schema."""
import copy
import json
from pathlib import Path
import subprocess
import unittest

REPO = Path(__file__).resolve().parents[3]
FORM = REPO / '.github/ISSUE_TEMPLATE/use-case.yml'


class UseCaseFormTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.form = json.loads(subprocess.check_output(
            ['conftest', 'parse', '--parser', 'yaml', str(FORM)],
            text=True, timeout=30))

    def assert_intake_contract(self, form):
        # Deliberately local scope: no assignment/routing defaults or prefills.
        self.assertEqual(set(form), {'name', 'description', 'body'})
        for key in ('name', 'description'):
            self.assertIsInstance(form[key], str)
            self.assertTrue(form[key].strip())
        self.assertIsInstance(form['body'], list)
        fields = {}
        for field in form['body']:
            kind = field['type']
            self.assertIn(kind, {'markdown', 'dropdown', 'textarea'})
            attributes = field['attributes']
            if kind == 'markdown':
                self.assertTrue(attributes['value'].strip())
                continue
            identifier = field['id']
            self.assertRegex(identifier, r'^[a-zA-Z0-9_-]+$')
            self.assertNotIn(identifier, fields, 'duplicate field ID')
            fields[identifier] = field
            self.assertTrue(attributes['label'].strip())
            self.assertNotIn('value', attributes, 'do not prefill declarations')
            self.assertNotIn('default', attributes)
            self.assertIs(type(field['validations']['required']), bool)
            if kind == 'dropdown':
                options = attributes['options']
                self.assertIsInstance(options, list)
                self.assertGreater(len(options), 1)
                self.assertEqual(len(options), len(set(options)))
                self.assertTrue(all(isinstance(x, str) and x.strip() for x in options))
            else:
                self.assertTrue(attributes['placeholder'].strip())
        required = {key for key, field in fields.items()
                    if field['validations']['required']}
        self.assertEqual(required, {'category', 'problem', 'use-case',
                                    'environment', 'acceptance-criteria'})
        self.assertEqual(fields['category']['type'], 'dropdown')
        for key in required - {'category'}:
            self.assertEqual(fields[key]['type'], 'textarea')
        for key in ('implementation-notes', 'references'):
            self.assertIn(key, fields)
            self.assertFalse(fields[key]['validations']['required'])

    def test_real_form(self):
        self.assert_intake_contract(self.form)

    def test_duplicate_ids_rejected(self):
        form = copy.deepcopy(self.form)
        form['body'].append(copy.deepcopy(form['body'][-1]))
        with self.assertRaisesRegex(AssertionError, 'duplicate field ID'):
            self.assert_intake_contract(form)

    def test_missing_or_optional_acceptance_rejected(self):
        for remove in (True, False):
            form = copy.deepcopy(self.form)
            acceptance = next(f for f in form['body']
                              if f.get('id') == 'acceptance-criteria')
            if remove:
                form['body'].remove(acceptance)
            else:
                acceptance['validations']['required'] = False
            with self.subTest(remove=remove), self.assertRaises(AssertionError):
                self.assert_intake_contract(form)

    def test_routing_defaults_rejected(self):
        for key in ('assignees', 'labels', 'projects', 'type'):
            form = copy.deepcopy(self.form)
            form[key] = 'unverified-configuration'
            with self.subTest(key=key), self.assertRaises(AssertionError):
                self.assert_intake_contract(form)

    def test_input_regressions_rejected(self):
        mutations = [
            lambda f: f.update(name=' '),
            lambda f: f.update(description=''),
            lambda f: f['body'][-1].update(type='upload'),
            lambda f: f['body'][-1]['validations'].update(required=True),
            lambda f: f['body'][1]['validations'].update(required='true'),
            lambda f: f['body'][1]['attributes'].update(options=[]),
            lambda f: f['body'][1]['attributes'].update(default=0),
            lambda f: f['body'][-1]['attributes'].update(value='Predeclared success'),
        ]
        for index, mutate in enumerate(mutations):
            form = copy.deepcopy(self.form)
            mutate(form)
            with self.subTest(index=index), self.assertRaises(AssertionError):
                self.assert_intake_contract(form)


if __name__ == '__main__':
    unittest.main()
