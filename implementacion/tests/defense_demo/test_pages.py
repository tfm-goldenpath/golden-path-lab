"""Synthetic transport fixtures; no laboratory execution or published evidence."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts/defense-demo/pages.py'
spec = importlib.util.spec_from_file_location('pages', SCRIPT)
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)


def record(data):
    return {'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def tar(path, entries):
    with tarfile.open(path, 'w:gz') as archive:
        for name, data, kind in entries:
            info = tarfile.TarInfo(name); info.size = len(data); info.type = kind
            if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE): info.linkname = 'target'
            archive.addfile(info, io.BytesIO(data))


class PagesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.archive = self.root / 'fixture.tar.gz'

    def portable(self):
        folder = self.root / 'portable'; folder.mkdir()
        (folder / 'essential.log').write_bytes(b'SYNTHETIC attributed rejection\n')
        sums = P.checksum(folder / 'essential.log') + '  essential.log\n'
        (folder / 'SHA256SUMS').write_text(sums)
        files = [('portable/' + p.name, p.read_bytes(), tarfile.REGTYPE) for p in sorted(folder.iterdir())]
        manifest = {'files': [{'path': n, **record(d)} for n, d, _ in files]}
        files.append(('manifest.json', json.dumps(manifest).encode(), tarfile.REGTYPE))
        tar(self.archive, files)
        return folder

    def test_authentic_archive_portable_exact_match(self):
        folder = self.portable()
        self.assertEqual(len(P.verify_archive_portable(self.archive, folder)[0]['files']), 2)

    def test_recalculated_portable_sums_do_not_authenticate_alteration(self):
        folder = self.portable()
        (folder / 'essential.log').write_text('altered')
        (folder / 'SHA256SUMS').write_text(P.checksum(folder / 'essential.log') + '  essential.log\n')
        P.static_verify(folder)
        with self.assertRaisesRegex(ValueError, 'authenticated archive'):
            P.verify_archive_portable(self.archive, folder)

    def test_missing_and_extra_portable_files(self):
        folder = self.portable(); (folder / 'extra').write_text('extra')
        with self.assertRaises(ValueError): P.verify_archive_portable(self.archive, folder)
        (folder / 'extra').unlink(); (folder / 'essential.log').unlink()
        with self.assertRaises(ValueError): P.verify_archive_portable(self.archive, folder)

    def test_archive_ambiguity_paths_and_links(self):
        for name, kind in [('/absolute', tarfile.REGTYPE), ('../escape', tarfile.REGTYPE), ('a/../escape', tarfile.REGTYPE), ('a//b', tarfile.REGTYPE), ('./a', tarfile.REGTYPE), ('a\\b', tarfile.REGTYPE), ('a', tarfile.SYMTYPE), ('a', tarfile.LNKTYPE), ('a', tarfile.FIFOTYPE)]:
            tar(self.archive, [(name, b'', kind)])
            with self.subTest(name=name, kind=kind), self.assertRaises(ValueError): P.archive_records(self.archive)
        tar(self.archive, [('same', b'a', tarfile.REGTYPE), ('same', b'b', tarfile.REGTYPE)])
        with self.assertRaises(ValueError): P.archive_records(self.archive)

    def test_bounded_extraction_and_no_partial_unsafe_write(self):
        tar(self.archive, [('a', b'123', tarfile.REGTYPE), ('../escape', b'x', tarfile.REGTYPE)])
        lock = {**record(self.archive.read_bytes())}
        with patch.object(P, 'reserve'), self.assertRaises(ValueError):
            P.unpack(self.archive, self.root / 'output', lock)
        self.assertFalse((self.root / 'output').exists())
        tar(self.archive, [('a', b'123', tarfile.REGTYPE)])
        with patch.object(P, 'MAX_FILE', 2), self.assertRaises(ValueError): P.archive_records(self.archive)
        with patch.object(P, 'MAX_BYTES', 2), self.assertRaises(ValueError): P.archive_records(self.archive)
        with patch.object(P, 'MAX_FILES', 0), self.assertRaises(ValueError): P.archive_records(self.archive)

    def test_transport_tamper_rejected_before_extract(self):
        self.archive.write_bytes(b'bad')
        with self.assertRaisesRegex(ValueError, 'before extraction'):
            P.unpack(self.archive, self.root / 'output', {'size': 3, 'sha256': '0'*64})
        self.assertFalse((self.root / 'output').exists())

    def test_wrong_historical_anchor(self):
        for name in P.ANCHORS: (self.root / name).write_text('synthetic, not authentic')
        with self.assertRaisesRegex(ValueError, 'Historical anchor'):
            P.verify_frozen(self.root)

    def test_wrong_context_lock(self):
        valid = {'schema':'demo-pages-lock/v1', 'repository':'tfm-goldenpath/golden-path-lab', 'session':P.SESSION, 'anchors':P.ANCHORS, 'selection':P.SELECTION, 'tag':'demo-site-synthetic', 'asset':'site.tar.gz'}
        path = self.root / 'lock.json'; path.write_text(json.dumps(valid)); P.read_lock(path)
        for key, value in [('session','other'),('repository','other/repo'),('selection',{}),('tag','v0.3.0'),('asset','../site.tar.gz'),('anchors',{})]:
            path.write_text(json.dumps({**valid,key:value}))
            with self.subTest(key=key), self.assertRaises(ValueError): P.read_lock(path)

    def test_secrets_and_special_files_rejected(self):
        (self.root / 'text').write_text('-----BEGIN PRIVATE KEY-----')
        with self.assertRaises(ValueError): P.scan_public(self.root)
        (self.root / 'text').unlink(); (self.root / 'link').symlink_to('/etc/hostname')
        with self.assertRaises(ValueError): P.inventory(self.root)

    def test_site_manifest_not_self_authenticating(self):
        (self.root / 'publication-manifest.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'reviewed lock'):
            P.verify_site(self.root, {'manifestSha256':'0'*64})

    def test_each_anchor_is_independent(self):
        anchors = {}
        for name in P.ANCHORS:
            (self.root / name).write_text('synthetic-' + name)
            anchors[name] = P.checksum(self.root / name)
        for name in anchors:
            original = (self.root / name).read_bytes()
            (self.root / name).write_text('altered')
            with self.subTest(name=name), patch.object(P, 'ANCHORS', anchors), self.assertRaisesRegex(ValueError, 'Historical anchor mismatch: ' + name):
                P.verify_frozen(self.root)
            (self.root / name).write_bytes(original)

    def test_missing_essential_and_live_snapshot_rejected(self):
        # Explicit synthetic recorded snapshot, not scenario evidence.
        inv = {'selection':P.SELECTION,'source':{'commit':P.SOURCE},'renderer':{},'artifacts':{},'missingEssential':[]}
        value = {'portable':True,'recorded':True,'actionsEnabled':False,'session':{'source':inv['source'],'active':None},'exportSelection':P.SELECTION,'renderer':{},'exportCompleteness':{'status':'COMPLETE_REFERENCES'}}
        def save():
            (self.root / 'inventory.json').write_text(json.dumps(inv))
            (self.root / 'index.html').write_text('<script>window.SAVED_SESSION='+json.dumps(value)+';</script>')
            (self.root / 'SHA256SUMS').write_text(''.join(P.checksum(self.root / n)+'  '+n+'\n' for n in ('inventory.json','index.html')))
        save(); P.validate_portable(self.root)
        value['actionsEnabled'] = True; save()
        with self.assertRaisesRegex(ValueError,'Executable/live'): P.validate_portable(self.root)
        value['actionsEnabled'] = False; inv['missingEssential'] = ['synthetic log']; save()
        with self.assertRaisesRegex(ValueError,'Missing essential'): P.validate_portable(self.root)

    def test_reserve_cannot_be_lowered(self):
        from types import SimpleNamespace
        with patch.object(P.os,'statvfs',return_value=SimpleNamespace(f_bavail=3*1024**3,f_frsize=1,f_favail=100000)):
            with self.assertRaisesRegex(ValueError,'RESOURCE_EXHAUSTED'): P.reserve(self.root,1)

if __name__ == '__main__': unittest.main()
