"""Synthetic release fixtures only; no laboratory observations or network access."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import subprocess
import shutil
import unittest
from unittest.mock import patch
import zipfile

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts/lab-release.py'
spec = importlib.util.spec_from_file_location('lab_release', SCRIPT)
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


def digest(data):
    return hashlib.sha256(data).hexdigest()


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.inputs = self.root / 'inputs'
        self.inputs.mkdir()
        self.body = b'synthetic evidence, not an experiment\n'
        self.identity = {'source': 'a' * 40, 'session': 'synthetic', 'renderer': 'b' * 64}
        self.members = {'log.txt': self.body, 'identity.json': json.dumps(self.identity).encode()}
        self.path = self.inputs / 'fixture.tar.gz'
        self.archive()
        self.asset = {'name': self.path.name, 'size': self.path.stat().st_size,
                      'sha256': release.checksum(self.path), 'format': 'tar.gz',
                      'checksums': 'SHA256SUMS.txt', 'role': 'synthetic',
                      'assertions': {'identity.json': self.identity}, 'required': True}
        self.lock = {'schema': 'lab-release-inputs/v1', 'repository': release.REPOSITORY,
                     'assets': [self.asset], 'privateFrozen': {}, 'limitations': [],
                     'historicalIdentities': {}, 'unresolved': []}

    def archive(self, extra=(), sums=None):
        files = dict(self.members)
        files['SHA256SUMS.txt'] = sums or ''.join(digest(v)+'  '+k+'\n' for k,v in files.items()).encode()
        with tarfile.open(self.path, 'w:gz') as archive:
            for name, data in [*files.items(), *extra]:
                info = tarfile.TarInfo(name)
                if isinstance(data, bytes):
                    info.size = len(data)
                    archive.addfile(info, io.BytesIO(data))
                else:
                    info.type = data
                    info.linkname = 'log.txt'
                    archive.addfile(info)

    def validate(self):
        return release.verify_asset(self.path, self.asset)

    def reanchor(self):
        self.asset.update(size=self.path.stat().st_size, sha256=release.checksum(self.path))

    def test_valid_selected_fixture_preserves_original(self):
        before = self.path.read_bytes()
        result = self.validate()
        self.assertEqual(result['status'], 'VERIFIED')
        self.assertEqual(before, self.path.read_bytes())

    def test_missing_required_asset(self):
        self.path.unlink()
        with self.assertRaisesRegex(ValueError, 'Missing required'):
            release.inventory(self.lock, self.inputs)

    def test_wrong_size_and_hash_and_partial_download(self):
        for data in [b'partial', b'x' * self.asset['size']]:
            with self.subTest(data=len(data)):
                self.path.write_bytes(data)
                with self.assertRaisesRegex(ValueError, 'integrity'):
                    self.validate()

    def test_recomputed_checksums_do_not_override_outer_anchor(self):
        self.members['log.txt'] = b'changed; internally consistent'
        self.archive()
        with self.assertRaisesRegex(ValueError, 'integrity'):
            self.validate()

    def test_wrong_source_session_renderer(self):
        for field in self.identity:
            with self.subTest(field=field):
                self.members['identity.json'] = json.dumps({**self.identity, field: 'wrong'}).encode()
                self.archive(); self.reanchor()
                with self.assertRaisesRegex(ValueError, 'association'):
                    self.validate()

    def test_unsafe_duplicate_colliding_tar_members(self):
        for name, data in [('../outside', b'x'), ('/absolute', b'x'), ('log.txt', b'x'),
                           ('log.txt/child', b'x'), ('link', tarfile.SYMTYPE),
                           ('hard', tarfile.LNKTYPE), ('pipe', tarfile.FIFOTYPE)]:
            with self.subTest(name=name):
                self.archive([(name, data)]); self.reanchor()
                with self.assertRaises(ValueError): self.validate()

    def test_unexpected_and_missing_inventory_members(self):
        self.archive([('extra', b'extra')]); self.reanchor()
        with self.assertRaisesRegex(ValueError, 'inventory'): self.validate()
        self.archive(sums=(digest(b'absent')+'  absent\n').encode()); self.reanchor()
        with self.assertRaisesRegex(ValueError, 'inventory'): self.validate()

    def test_zip_duplicate_and_symlink(self):
        for kind in ['duplicate', 'symlink']:
            p = self.inputs / 'bad.zip'
            with zipfile.ZipFile(p, 'w') as z:
                z.writestr('file', b'x')
                if kind == 'duplicate':
                    z.writestr('file', b'y')
                else:
                    i = zipfile.ZipInfo('link'); i.create_system = 3
                    i.external_attr = 0o120777 << 16; z.writestr(i, 'file')
            with self.assertRaises(ValueError): release.archive_inventory(p, 'zip')

    def test_limits(self):
        with patch.object(release, 'MAX_MEMBER', 1):
            with self.assertRaisesRegex(ValueError, 'limit'): self.validate()
        with patch.object(release, 'MAX_MEMBERS', 1):
            with self.assertRaisesRegex(ValueError, 'limit'): self.validate()

    def test_capacity_bytes_and_inodes(self):
        for available, inodes in [(release.RESERVE, 999999), (100*release.RESERVE, 10000)]:
            fs = type('FS', (), {'f_bavail':available, 'f_frsize':1, 'f_favail':inodes})()
            with patch.object(release.os, 'statvfs', return_value=fs):
                with self.assertRaisesRegex(ValueError, 'RESOURCE_EXHAUSTED'):
                    release.reserve(self.root, 1024, 10)

    def test_existing_output_and_symlink_rejected(self):
        with self.assertRaisesRegex(ValueError, 'New'):
            release.new_directory(self.inputs, 0, 0)
        (self.root/'link').symlink_to(self.inputs, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'canonical'):
            release.new_directory(self.root/'link'/'child', 0, 0)

    def test_failed_or_interrupted_preparation_has_no_manifest(self):
        for failure in [ValueError('failed verification'), KeyboardInterrupt()]:
            out = self.root / ('failed-'+type(failure).__name__)
            with patch.object(release, 'source_identity', return_value={'commit': 'a'*40, 'verificationToolCommit': 'a'*40}), \
                 patch.object(release, 'inventory', side_effect=failure):
                with self.assertRaises(type(failure)):
                    release.prepare(self.lock, self.inputs, out, self.root, 'a'*40)
            self.assertFalse((out/'release-manifest.json').exists())

    def test_inventory_rejects_unexpected_input(self):
        (self.inputs/'surprise').write_text('extra')
        with self.assertRaisesRegex(ValueError, 'Unexpected'):
            release.inventory(self.lock, self.inputs)

    def test_credential_scan(self):
        self.members['log.txt'] = b'-----BEGIN PRIVATE KEY-----'
        self.archive(); self.reanchor()
        with self.assertRaisesRegex(ValueError, 'credential'): self.validate()

    def committed_fixture(self):
        """Real tiny Git source, synthetic evidence; only private custody is substituted."""
        repo = self.root/'repo'; repo.mkdir()
        for name in ['scripts/lab-release.py', 'scripts/defense-demo/pages.py',
                     'scripts/defense-demo/verify-static.py', 'demo/pages-source.lock.json']:
            p = repo/'implementacion'/name; p.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(SCRIPT.parents[1]/name, p)
        spec = repo/'implementacion/releases/lab-freeze.inputs.json'
        spec.parent.mkdir(); spec.write_text(json.dumps(self.lock))
        subprocess.run(['git','init','-q',str(repo)],check=True)
        subprocess.run(['git','-C',str(repo),'add','.'],check=True)
        subprocess.run(['git','-C',str(repo),'-c','user.name=Synthetic test','-c',
                        'user.email=synthetic@example.invalid','commit','-qm','Synthetic fixture'],check=True)
        source = subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
        return repo, spec, source

    def test_complete_prepare_verify_and_original_preservation(self):
        repo, spec, source = self.committed_fixture()
        self.lock['sourceSnapshots'] = [{'name':'lab-source-synthetic.tar.gz','commit':source,'role':'Synthetic historical source'}]
        spec.write_text(json.dumps(self.lock))
        subprocess.run(['git','-C',str(repo),'add','.'],check=True)
        subprocess.run(['git','-C',str(repo),'-c','user.name=Synthetic test','-c',
                        'user.email=synthetic@example.invalid','commit','-qm','Select historical snapshot'],check=True)
        source = subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
        original = self.path.read_bytes(); output = self.root/'candidate'
        with patch.object(release,'REPO',repo), patch.object(release,'SPEC',spec), \
             patch.object(release,'frozen_custody',return_value={'status':'SYNTHETIC_PRIVATE_FIXTURE'}):
            result = release.prepare(self.lock,self.inputs,output,self.root,source)
            receipt = release.verify(self.lock,output,source,result['manifestSha256'])
            self.assertEqual(receipt['status'],'CANDIDATE_BYTES_VERIFIED')
            self.assertTrue((output/'lab-source-synthetic.tar.gz').is_file())
            self.assertEqual(original,self.path.read_bytes())
            with self.assertRaisesRegex(ValueError,'anchor'):
                release.verify(self.lock,output,source,'0'*64)
            (output/'fixture.tar.gz').write_bytes(b'corrupt')
            with self.assertRaisesRegex(ValueError,'integrity'):
                release.verify(self.lock,output,source,result['manifestSha256'])

    def test_interruption_during_copy_preserves_partial_without_manifest(self):
        repo, spec, source = self.committed_fixture(); output = self.root/'interrupted'
        with patch.object(release,'REPO',repo), patch.object(release,'SPEC',spec), \
             patch.object(release,'frozen_custody',return_value={}), \
             patch.object(release.shutil,'copyfileobj',side_effect=KeyboardInterrupt):
            with self.assertRaises(KeyboardInterrupt):
                release.prepare(self.lock,self.inputs,output,self.root,source)
        self.assertTrue((output/'preparation.json').exists())
        self.assertFalse((output/'release-manifest.json').exists())
        self.assertEqual(release.checksum(self.path),self.asset['sha256'])

    def test_source_binding_rejects_dirty_tools(self):
        repo, spec, source = self.committed_fixture()
        with patch.object(release,'REPO',repo), patch.object(release,'SPEC',spec):
            spec.write_text('{}')
            with self.assertRaisesRegex(ValueError,'Tracked source changes'):
                release.source_identity(source)

    def test_remote_tag_mismatch_and_draft_identity(self):
        with patch.object(release,'api',side_effect=[{'tag_name':'lab-v2026.10.24','draft':False},
                                                   {'object':{'type':'commit','sha':'b'*40}}]):
            with self.assertRaisesRegex(ValueError,'tag target'):
                release.remote_identity('lab-v2026.10.24','a'*40,False)
        with patch.object(release,'api',return_value={'tag_name':'lab-v2026.10.24','draft':True,'target_commitish':'main'}):
            with self.assertRaisesRegex(ValueError,'explicit'):
                release.remote_identity('lab-v2026.10.24','a'*40,True)

    def test_recovery_partial_download_and_metadata_mismatch(self):
        self.asset.update(assetId=2,releaseId=1,tag='synthetic')
        metadata = {'id':2,'name':self.asset['name'],'size':self.asset['size'],
                    'state':'uploaded','digest':'sha256:'+self.asset['sha256']}
        def api(path):
            return metadata if path.startswith('releases/assets/') else {'id':1,'assets':[metadata]}
        def partial(args, **kwargs):
            destination = Path(args[args.index('--dir')+1])
            (destination/self.asset['name']).write_bytes(b'partial download')
            raise subprocess.CalledProcessError(1,args)
        with patch.object(release,'api',side_effect=api), patch.object(release.subprocess,'run',side_effect=partial):
            with self.assertRaises(subprocess.CalledProcessError):
                release.recover(self.lock,self.root/'partial')
            self.assertEqual((self.root/'partial'/self.asset['name']).read_bytes(),b'partial download')
            self.assertFalse((self.root/'partial'/'release-manifest.json').exists())
            metadata['digest'] = 'sha256:'+'0'*64
            with self.assertRaisesRegex(ValueError,'metadata differs'):
                release.recover(self.lock,self.root/'mismatch')
            self.assertFalse((self.root/'mismatch').exists())

    def test_remote_redownload_and_cryptographic_failure(self):
        repo, spec, source = self.committed_fixture(); candidate = self.root/'candidate'
        with patch.object(release,'REPO',repo), patch.object(release,'SPEC',spec), \
             patch.object(release,'frozen_custody',return_value={}):
            result = release.prepare(self.lock,self.inputs,candidate,self.root,source)
            assets = [{'name':n,'id':i,'state':'uploaded','size':(candidate/n).stat().st_size,
                       'digest':'sha256:'+release.checksum(candidate/n)} for i,n in enumerate(result['uploadNames'])]
            remote = {'tag_name':'lab-v2026.10.24','id':1,'draft':False,'immutable':False,'assets':assets}
            run = subprocess.run
            def command(args, **kwargs):
                if args[:3] == ['gh','release','download']:
                    name = args[args.index('--pattern')+1]; dest = Path(args[args.index('--dir')+1])
                    shutil.copyfile(candidate/name,dest/name)
                    return subprocess.CompletedProcess(args,0)
                if args[:3] == ['gh','release','verify']:
                    raise subprocess.CalledProcessError(1,args,'synthetic invalid attestation')
                return run(args,**kwargs)
            with patch.object(release,'remote_identity',return_value=remote), patch.object(release.subprocess,'run',side_effect=command):
                receipt = release.download_verify(self.lock,self.root/'download',source,'lab-v2026.10.24',result['manifestSha256'])
                self.assertEqual(receipt['status'],'PUBLISHED_BYTES_VERIFIED')
                self.assertIn('UNAVAILABLE',receipt['cryptographicReleaseVerification'])
                remote['immutable'] = True
                with self.assertRaises(subprocess.CalledProcessError):
                    release.download_verify(self.lock,self.root/'bad-crypto',source,'lab-v2026.10.24',result['manifestSha256'])


if __name__ == '__main__':
    unittest.main()
