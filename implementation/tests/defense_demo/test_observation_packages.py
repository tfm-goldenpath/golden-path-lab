"""Synthetic package fixtures; no remote or cryptographic execution."""
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
import zipfile
import test_core
from observation_packages import bounded_package, paired_documents, recorded_authorization

class PackageTests(unittest.TestCase):
    def test_aggregate_receipt_does_not_hide_failure_or_missing_phase(self):
        measurement={'image':'ghcr.io/synthetic@sha256:'+'a'*64,'phases':{'verify-delivery':{'exitCode':0},'authorize-results':{'exitCode':0}}}
        gate={'image':measurement['image'],'digest':'sha256:'+'a'*64,'status':'VERIFIED','authenticatedPredicates':['synthetic']}
        self.assertTrue(recorded_authorization(gate,measurement,'synthetic',b'Verified OK\n'))
        self.assertFalse(recorded_authorization(gate,measurement,'synthetic',b'Verification failed'))
        self.assertFalse(recorded_authorization(gate,measurement,'other',b'Verified OK'))
        measurement['phases']['verify-delivery']['exitCode']=1
        self.assertFalse(recorded_authorization(gate,measurement,'synthetic',b'Verified OK'))
    def test_tar_rejects_links_duplicates_paths_and_expansion(self):
        for kind in ('link','duplicate','traversal','size'):
            raw=io.BytesIO()
            with tarfile.open(fileobj=raw,mode='w:gz') as archive:
                item=tarfile.TarInfo('../evil' if kind=='traversal' else 'run-fixture/file')
                item.size=2*1024**2+1 if kind=='size' else 1
                if kind=='link': item.type=tarfile.SYMTYPE;item.linkname='/outside';item.size=0
                archive.addfile(item,io.BytesIO(b'x'*item.size))
                if kind=='duplicate': archive.addfile(item,io.BytesIO(b'x'))
            with self.assertRaises(ValueError):bounded_package(raw.getvalue())
    def test_unknown_artifact_or_corrupt_bytes_cannot_establish_association(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'test.zip';path.write_bytes(b'broken')
            with self.assertRaisesRegex(ValueError,'identity'):paired_documents(path,{},[],12)
            meta={'id':12,'size_in_bytes':6,'digest':'sha256:'+'a'*64}
            with self.assertRaisesRegex(ValueError,'checksum'):paired_documents(path,{},[meta],12)
    def test_outer_archive_rejects_unsafe_paths_even_when_not_selected(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'test.zip'
            with zipfile.ZipFile(path,'w') as archive:
                archive.writestr('../databases/ignored','x')
            meta={'id':12,'size_in_bytes':path.stat().st_size,'digest':'sha256:'+hashlib.sha256(path.read_bytes()).hexdigest()}
            with self.assertRaisesRegex(ValueError,'Unsafe'):paired_documents(path,{},[meta],12)
    def test_wrong_run_rejected_before_package_selection(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'test.zip'
            with zipfile.ZipFile(path,'w') as archive:
                archive.writestr('pair.json',json.dumps({'runId':'456','source':'a'*40}))
            meta={'id':12,'size_in_bytes':path.stat().st_size,'digest':'sha256:'+hashlib.sha256(path.read_bytes()).hexdigest()}
            with self.assertRaisesRegex(ValueError,'association'):paired_documents(path,{'id':123,'head_sha':'a'*40},[meta],12)

if __name__=='__main__':unittest.main()
