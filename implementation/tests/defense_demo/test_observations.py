"""Synthetic import fixtures only; no GitHub request or laboratory execution."""
import base64
import contextlib
import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zipfile
import test_core
import observations as obs

class ObservationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);(self.root/'store').mkdir()
        self.patches=[patch.object(obs,'STORE',self.root/'store'),patch.object(obs,'margin')]
        for p in self.patches:p.start()
    def tearDown(self):
        for p in reversed(self.patches):p.stop()
        self.temp.cleanup()
    def capture(self,run=None,jobs=None):
        run=run or {'id':123,'repository':{'full_name':obs.REPOSITORY},'run_attempt':1,'head_sha':'a'*40,'path':'.github/workflows/paired-rg.yml','status':'completed','conclusion':'success'}
        source=self.root/'input';source.mkdir(exist_ok=True)
        (source/'run.json').write_text(json.dumps(run));(source/'jobs.json').write_text(json.dumps(jobs or {'jobs':[]}));(source/'paired-rg.yml').write_text('name: synthetic\njobs:\n  plan:\n    runs-on: ubuntu-24.04\n')
        args=SimpleNamespace(run=123,from_directory=source,publication_summary=False,archive=None,pair=None)
        with contextlib.redirect_stdout(io.StringIO()):code=obs.capture(args)
        record=json.loads(next(obs.STORE.glob('*/observation.json')).read_text())
        return code,record
    def test_metadata_success_is_not_pair_or_signature_success(self):
        code,o=self.capture();self.assertEqual(code,0);self.assertNotIn('pair',o);self.assertNotIn('pairAnalysis',o)
        self.assertIn('no cryptographic',o['verification']);self.assertIn('operator-supplied',str(o['issues']))
        self.assertEqual(len(obs.inventory()),1)
    def test_wrong_run_or_job_identity_preserves_incomplete(self):
        code,o=self.capture(jobs={'jobs':[{'run_id':999,'run_attempt':1,'head_sha':'a'*40}]})
        self.assertEqual(code,1);self.assertEqual(o['status'],'INCOMPLETE');self.assertIn('Job identity',str(o['issues']));self.assertNotIn('jobs',o)
    def test_capture_artifact_integrity_and_allowlist(self):
        _,o=self.capture();f=o['files'][0];self.assertTrue(obs.artifact(o['id'],f['sha256']))
        (obs.STORE/o['id']/f['file']).write_text('altered')
        with self.assertRaises(ValueError):obs.artifact(o['id'],f['sha256'])
        with self.assertRaises(ValueError):obs.artifact('../outside','a'*64)
        with self.assertRaises(ValueError):obs.artifact(o['id'],'b'*64)
    def test_inventory_rejects_symlink_and_unsafe_file_reference(self):
        _,o=self.capture();folder=obs.STORE/o['id'];f=o['files'][0];f['file']='../../outside'
        (folder/'observation.json').write_text(json.dumps(o));self.assertEqual(obs.inventory()[0]['status'],'INVALID')
        (folder/'observation.json').unlink();(folder/'observation.json').symlink_to(self.root/'input/run.json')
        self.assertEqual(obs.inventory()[0]['status'],'INVALID')
    def test_archive_traversal_duplicates_links_and_size(self):
        for kind in ('traversal','duplicate','link','size'):
            p=self.root/(kind+'.zip')
            with zipfile.ZipFile(p,'w') as z:
                if kind=='traversal':z.writestr('../pair.json','{}')
                elif kind=='duplicate':
                    z.writestr('a/pair.json','{}');z.writestr('b/pair.json','{}')
                elif kind=='link':
                    info=zipfile.ZipInfo('pair.json');info.external_attr=0o120777<<16;z.writestr(info,'target')
                else:z.writestr('large.txt','x'*100)
            with self.assertRaises(ValueError):obs.archive_files(p,maximum=50 if kind=='size' else 1000)
    def test_archive_only_small_allowlisted_documents(self):
        p=self.root/'safe.zip'
        with zipfile.ZipFile(p,'w') as z:
            z.writestr('safe/pair.json','{}');z.writestr('private/key.pem','never copy');z.writestr('state.json','never copy')
        self.assertEqual(obs.archive_files(p),{'pair.json':b'{}'})
    def test_pair_association_and_dataset_not_interchangeable(self):
        p={'runId':'123','source':'a'*40,'dataset':'pilot','order':'RG','arms':{}}
        self.assertEqual(obs.associate(p,{'id':123,'head_sha':'a'*40}),p)
        for change in ({'runId':'124'},{'source':'b'*40},{'dataset':'other'},{'arms':{'G':{'source':'a'*40}}}):
            with self.assertRaises(ValueError):obs.associate({**p,**change},{'id':123,'head_sha':'a'*40})
    def test_metadata_403_does_not_erase_known_run(self):
        run={'id':123,'repository':{'full_name':obs.REPOSITORY},'run_attempt':1,'head_sha':'a'*40,'path':'.github/workflows/ci.yml','status':'completed','conclusion':'success'}
        def response(path,**kwargs):
            if path.endswith('/runs/123'):return json.dumps(run).encode()
            raise ValueError('GitHub retrieval unavailable: 403')
        args=SimpleNamespace(run=123,from_directory=None,publication_summary=False,archive=None,pair=None)
        with patch.object(obs,'gh',side_effect=response),contextlib.redirect_stdout(io.StringIO()):code=obs.capture(args)
        o=obs.inventory()[0];self.assertEqual(code,0);self.assertEqual(o['run']['conclusion'],'success');self.assertIn('403',str(o['issues']));self.assertNotIn('pair',o)
    def test_bad_archive_preserves_incomplete_capture(self):
        self.capture();source=self.root/'input';bad=self.root/'broken.zip';bad.write_text('not a ZIP')
        args=SimpleNamespace(run=123,from_directory=source,publication_summary=False,archive=bad,pair=None)
        with contextlib.redirect_stdout(io.StringIO()):code=obs.capture(args)
        import exporting
        preserved=exporting.observation_paths(obs.inventory())
        incomplete=next(o for o in obs.inventory() if o['status']=='INCOMPLETE')
        self.assertTrue(any('/'+incomplete['id']+'/' in key for key in preserved))
        self.assertEqual(code,1);self.assertTrue(any(o['status']=='INCOMPLETE' and any('zip' in str(x).lower() for x in o['issues']) for o in obs.inventory()))

    def test_visible_bundle_is_not_signature_verification(self):
        self.capture();source=self.root/'input';archive=self.root/'bundle.zip'
        statement={'predicateType':'synthetic-test-type','subject':[{'digest':{'sha256':'b'*64}}]}
        bundle={'dsseEnvelope':{'payload':base64.b64encode(json.dumps(statement).encode()).decode()}}
        with zipfile.ZipFile(archive,'w') as z:z.writestr('image.bundle.json',json.dumps(bundle))
        args=SimpleNamespace(run=123,from_directory=source,publication_summary=False,archive=archive,pair=None)
        with contextlib.redirect_stdout(io.StringIO()):code=obs.capture(args)
        self.assertEqual(code,0)
        o=next(o for o in obs.inventory() if any(f['name']=='image.bundle.json' for f in o['files']))
        f=next(f for f in o['files'] if f['name']=='image.bundle.json')
        self.assertEqual(f['statement'],statement);self.assertIn('not established',f['association']);self.assertIn('no cryptographic',o['verification'])

    def test_large_metadata_is_explicitly_incomplete_and_bounded(self):
        run={'id':123,'repository':{'full_name':obs.REPOSITORY},'run_attempt':1,'head_sha':'a'*40,'head_branch':'x'*600000,'path':'.github/workflows/paired-rg.yml','status':'completed','conclusion':'success'}
        code,o=self.capture(run=run)
        self.assertEqual(code,1);self.assertEqual(o['status'],'INCOMPLETE');self.assertLess(len(json.dumps(o)),512*1024);self.assertTrue(obs.inventory()[0]['files'])

    def test_latest_preserves_failure_and_checks_workflow_identity(self):
        run={'id':999,'repository':{'full_name':obs.REPOSITORY},'path':'.github/workflows/ci.yml','conclusion':'failure'}
        with patch.object(obs,'gh',return_value=json.dumps({'workflow_runs':[run]}).encode()) as query:
            self.assertEqual(obs.latest_run('ci.yml'),999)
            self.assertIn('per_page=1',query.call_args.args[0])
            with self.assertRaisesRegex(ValueError,'identity'):obs.latest_run('golden-path.yml')
            with self.assertRaisesRegex(ValueError,'Unsupported'):obs.latest_run('../../secret')
        with patch.object(obs,'gh',return_value=b'{"workflow_runs":[]}'):
            with self.assertRaisesRegex(ValueError,'No GitHub'):obs.latest_run('ci.yml')

    def test_expired_or_oversized_artifact_preserves_metadata_without_download(self):
        run={'id':123,'repository':{'full_name':obs.REPOSITORY},'run_attempt':1,'head_sha':'a'*40,'path':'.github/workflows/paired-rg.yml','status':'completed','conclusion':'success'}
        for oversized in (False,True):
            def response(path,**kwargs):
                if path.endswith('/runs/123'): return json.dumps(run).encode()
                if '/artifacts?' in path: return json.dumps({'artifacts':[{'id':12,'expired':not oversized,'size_in_bytes':200*1024**2}]}).encode()
                if path.endswith('/zip'): self.fail('Unsafe artifact must not be downloaded')
                raise ValueError('GitHub retrieval unavailable: 403')
            args=SimpleNamespace(run=123,from_directory=None,publication_summary=False,archive=None,pair=None,paired_artifact=12)
            with patch.object(obs,'gh',side_effect=response),contextlib.redirect_stdout(io.StringIO()):code=obs.capture(args)
            self.assertEqual(code,1)
        self.assertTrue(all(o['status']=='INCOMPLETE' and o['run']['id']==123 for o in obs.inventory()))

    def test_low_space_prevents_capture(self):
        # Exercise the real safeguard separately from the filesystem fixture.
        self.patches[-1].stop()
        with patch.object(obs.os,'statvfs',return_value=SimpleNamespace(f_bavail=10,f_frsize=4096,f_favail=20000)):
            with self.assertRaisesRegex(ValueError,'reserve'):obs.margin()
        self.patches[-1].start()

if __name__=='__main__':unittest.main()
