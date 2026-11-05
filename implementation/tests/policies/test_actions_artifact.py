"""Synthetic, offline tests of the non-deploying Actions artifact smoke."""
import copy
import importlib.util
import io
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
import zipfile

PATH = Path(__file__).resolve().parents[1]/'integration/actions-artifact-smoke.py'
spec = importlib.util.spec_from_file_location('artifact_smoke', PATH)
S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)
IDENTITY = {'source': 'a'*40, 'run_id': '123', 'attempt': '1'}


class ArtifactSmokeTests(unittest.TestCase):
    def archive(self, path, files, extra=None):
        with tarfile.open(path, 'w') as tar:
            root = tarfile.TarInfo('.'); root.type = tarfile.DIRTYPE; tar.addfile(root)
            for name, content in files.items():
                entry = tarfile.TarInfo('./' + name); entry.size = len(content)
                tar.addfile(entry, io.BytesIO(content))
            if extra is not None:
                tar.addfile(extra, io.BytesIO(b''))

    def test_actual_tar_packaging_and_zip_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); S.prepare(root/'input', IDENTITY)
            tar = root/'artifact.tar'
            # Same Linux command/hidden-file exclusion as the reviewed composite.
            subprocess.run(['tar', '--dereference', '--hard-dereference',
                            '--directory', str(root/'input/site'), '-cf', str(tar),
                            '--exclude=.git', '--exclude=.github', '--exclude=.[^/]*', '.'],
                           check=True, timeout=10)
            receipt = S.verify(tar, IDENTITY)
            self.assertEqual(receipt['files'], 3)
            with zipfile.ZipFile(root/'artifact.zip', 'w') as archive:
                archive.write(tar, 'artifact.tar')
            self.assertEqual(S.verify(root/'artifact.zip', IDENTITY)['members'], receipt['members'])
            with self.assertRaises(FileExistsError): S.prepare(root/'input', IDENTITY)

    def test_content_identity_and_membership_are_bound(self):
        with tempfile.TemporaryDirectory() as tmp:
            tar = Path(tmp)/'artifact.tar'; files = S.fixture(IDENTITY)
            for change in ('corrupt', 'missing', 'hidden', 'source', 'run_id', 'attempt'):
                with self.subTest(change=change):
                    altered = copy.deepcopy(files); expected = dict(IDENTITY)
                    if change == 'corrupt': altered['index.html'] += b'changed'
                    elif change == 'missing': del altered['index.html']
                    elif change == 'hidden': altered['.secret'] = b'not permitted'
                    else: expected[change] = 'b'*40 if change == 'source' else '2'
                    self.archive(tar, altered)
                    with self.assertRaises(ValueError): S.verify(tar, expected)

    def test_unsafe_tar_entries_are_rejected_before_extraction(self):
        with tempfile.TemporaryDirectory() as tmp:
            tar = Path(tmp)/'artifact.tar'
            for name, kind in (('../escape', tarfile.REGTYPE), ('/absolute', tarfile.REGTYPE),
                               ('index.html', tarfile.REGTYPE), ('link', tarfile.SYMTYPE),
                               ('hard', tarfile.LNKTYPE), ('pipe', tarfile.FIFOTYPE)):
                with self.subTest(name=name):
                    entry = tarfile.TarInfo(name); entry.type = kind; entry.linkname = 'index.html'
                    self.archive(tar, S.fixture(IDENTITY), entry)
                    with self.assertRaises(ValueError): S.verify(tar, IDENTITY)

    def test_zip_must_contain_only_regular_artifact_tar(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'artifact.zip'
            for name in ('../artifact.tar', 'extra.txt'):
                with zipfile.ZipFile(path, 'w') as archive: archive.writestr(name, b'')
                with self.assertRaises(ValueError): S.verify(path, IDENTITY)

    def test_prepare_rejects_invalid_identity(self):
        for key, value in (('source', 'main'), ('run_id', '-1'), ('attempt', '0')):
            with self.subTest(key=key), self.assertRaises(ValueError):
                S.fixture(dict(IDENTITY, **{key: value}))


if __name__ == '__main__': unittest.main()
