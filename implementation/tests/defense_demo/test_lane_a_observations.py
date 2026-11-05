"""Synthetic archives only; no claim of real signatures or hosted execution."""
import base64
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
import zipfile
import test_core
from lane_a_observations import inspect

class LaneArchiveTests(unittest.TestCase):
    def make_archive(self,folder,wrong=False,variant=None):
        sha=lambda b:hashlib.sha256(b).hexdigest()
        enc=lambda v:json.dumps(v).encode()
        run={'id':123,'run_attempt':1,'head_sha':'a'*40,'repository':{'full_name':'tfm-goldenpath/golden-path-lab'}}
        files={}
        for context,digest in (('', 'b'*64),('L01-update/','c'*64)):
            statement={'subject':[{'digest':{'sha256':digest}}],'predicateType':'https://sigstore.dev/cosign/sign/v1'}
            files[context+'image.bundle.json']=enc({'dsseEnvelope':{'payload':base64.b64encode(enc(statement)).decode()}})
            authenticated=statement if not context else {**statement,'subject':[{'digest':{'sha256':'b'*64}}]}
            files[context+'verified-signature.json']=enc(authenticated)
            files[context+'verified-image-bundle.txt']=b'Verified OK\n'
            files[context+'CI-authorized.result.json']=enc({'status':'VERIFIED','digest':'sha256:'+digest,'authenticatedPredicates':[statement['predicateType']]})
        if variant=='bad-statement': files['image.bundle.json']=enc({'dsseEnvelope':{'payload':base64.b64encode(b'[]').decode()}})
        if variant=='missing-verifier': del files['verified-image-bundle.txt']
        manifest=''.join(sha(v)+'  '+n+'\n' for n,v in files.items()).encode();files['SHA256SUMS.txt']=manifest
        if variant=='corrupt-inner': files['verified-image-bundle.txt']=b'Changed after manifest'
        raw=io.BytesIO()
        with tarfile.open(fileobj=raw,mode='w:gz') as t:
            for n,v in files.items():
                member=tarfile.TarInfo('run-Fixture/'+n);member.size=len(v);t.addfile(member,io.BytesIO(v))
            if variant in ('traversal','link','duplicate','depth'):
                member=tarfile.TarInfo({'traversal':'run-Fixture/../outside','link':'run-Fixture/symlink','duplicate':'run-Fixture/image.bundle.json','depth':'run-Fixture/'+'nested/'*9+'value'}[variant])
                if variant=='link': member.type=tarfile.SYMTYPE;member.linkname='/outside'
                t.addfile(member,io.BytesIO(b''))
        package=raw.getvalue();audit={'archive':'run-Fixture.tar.gz','sha256':sha(package),'internalHashes':len(files)-1}
        source={'suite':'demo','sourceCommit':('d'*40 if wrong else run['head_sha']),'runId':'123','runAttempt':'1','sourceRepository':'https://github.com/'+run['repository']['full_name']}
        outer={'source.json':enc(source),'result.json':b'{}','coverage.json':b'{}','package-audit.json':enc(audit),'packages/run-Fixture.tar.gz':package,'packages/run-Fixture.tar.gz.sha256':(sha(package)+'  run-Fixture.tar.gz\n').encode()}
        outer['SHA256SUMS.txt']=''.join(sha(v)+'  '+n+'\n' for n,v in outer.items()).encode()
        path=folder/'test.zip'
        with zipfile.ZipFile(path,'w') as z:
            for n,v in outer.items():z.writestr(n,v)
        metadata={'id':12,'name':'lane-a-demo-123-1','size_in_bytes':path.stat().st_size,'digest':'sha256:'+sha(path.read_bytes())}
        return path,run,metadata
    def test_digests_and_verifier_receipts_cannot_be_interchanged(self):
        with tempfile.TemporaryDirectory() as temp:
            path,run,metadata=self.make_archive(Path(temp));documents,inspection=inspect(path,run,metadata)
            proofs=inspection['attestations'];self.assertEqual(len(proofs),2)
            self.assertTrue(proofs['demo/image.bundle.json']['cryptoRecorded'])
            self.assertFalse(proofs['demo/L01-update/image.bundle.json']['cryptoRecorded'])
            self.assertFalse(proofs['demo/L01-update/image.bundle.json']['authorizationRecorded'])
            self.assertNotEqual(proofs['demo/image.bundle.json']['subjectDigest'],proofs['demo/L01-update/image.bundle.json']['subjectDigest'])
            self.assertTrue(all(p['lane']=='A' for p in proofs.values()))
    def test_source_attempt_hash_and_database_artifacts_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            path,run,metadata=self.make_archive(Path(temp))
            for change in ({'digest':'sha256:'+'0'*64},{'name':'lane-a-databases-demo-123-1'},{'name':'lane-a-demo-123-2'}):
                with self.assertRaises(ValueError):inspect(path,run,{**metadata,**change})
            path,run,metadata=self.make_archive(Path(temp),True)
            with self.assertRaisesRegex(ValueError,'source association'):inspect(path,run,metadata)

    def test_nested_path_links_duplicates_depth_and_inner_corruption_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            for variant in ('traversal','link','duplicate','depth','corrupt-inner','bad-statement'):
                with self.subTest(variant=variant):
                    path,run,metadata=self.make_archive(Path(temp),variant=variant)
                    with self.assertRaises((ValueError,RuntimeError)):inspect(path,run,metadata)

    def test_missing_verifier_keeps_document_without_verification_claim(self):
        with tempfile.TemporaryDirectory() as temp:
            path,run,metadata=self.make_archive(Path(temp),variant='missing-verifier')
            documents,inspection=inspect(path,run,metadata)
            self.assertIn('demo/image.bundle.json',documents)
            self.assertFalse(inspection['attestations']['demo/image.bundle.json']['cryptoRecorded'])
            self.assertFalse(inspection['attestations']['demo/image.bundle.json']['authorizationRecorded'])
