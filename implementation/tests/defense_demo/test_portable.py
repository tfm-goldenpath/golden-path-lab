"""Labelled synthetic fixtures for bounded offline export, never scenario evidence."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/defense-demo'))
import portable
from core import file_record

class PortableTests(unittest.TestCase):
    def test_f12_cannot_starve_behind_thousands_of_artifacts(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);records={};paths={}
            for i in range(2500):
                p=root/f'noise-{i:04}.log';p.write_text('synthetic noise '*100)
                r=file_record(root,p,'test','synthetic');records[r['id']]=r;paths[r['id']]=p
            p=root/'z-f12-control.json';p.write_text('{"failures":["DIGEST"]}');r=file_record(root,p,'test','synthetic');records[r['id']]=r;paths[r['id']]=p
            result=portable.embed(records,paths,{r['id']},budget=4096)
            self.assertEqual(result[r['id']]['status'],'FULL');self.assertIn('DIGEST',result[r['id']]['text'])
            self.assertTrue(any(v['status']=='NOT_EMBEDDED' for v in result.values()))
            self.assertFalse(any(v['status']=='EXCERPT' and not v['text'] for v in result.values()))
            self.assertEqual(result,portable.embed(dict(reversed(list(records.items()))),paths,{r['id']},budget=4096))
    def test_large_report_bounded_and_corruption_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);p=root/'large.json';p.write_text('x'*200000);r=file_record(root,p,'test','synthetic');records={r['id']:r};paths={r['id']:p}
            value=portable.embed(records,paths,{r['id']});self.assertEqual(value[r['id']]['status'],'EXCERPT');self.assertEqual(value[r['id']]['embeddedBytes'],12000)
            p.write_text('changed')
            with self.assertRaisesRegex(ValueError,'changed'):portable.embed(records,paths,{r['id']})
    def test_essential_capacity_fails_instead_of_empty_excerpt(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);p=root/'essential.log';p.write_text('synthetic'*100);r=file_record(root,p,'test','synthetic')
            with self.assertRaisesRegex(ValueError,'narrow the selection'):
                portable.embed({r['id']:r},{r['id']:p},{r['id']},budget=100)
    def test_non_utf8_is_not_a_byte_exact_full_original(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);p=root/'binary.log';p.write_bytes(bytes([255]));r=file_record(root,p,'test','synthetic')
            with self.assertRaisesRegex(ValueError,'Non-text original'):
                portable.embed({r['id']:r},{r['id']:p},{r['id']})
    def test_explicit_selection_does_not_capture_other_sessions_or_runs(self):
        value={'session':{'session':'synthetic'},'events':[{'attempt':'a','phase':'live'},{'attempt':'b','phase':'live'},{'attempt':'preparation','phase':'preparation'}],'commands':[], 'githubObservations':[{'id':'run-a','status':'CAPTURED'},{'id':'run-b','status':'CAPTURED'}]}
        selected=portable.selection(value,['b'],['run-b'])
        self.assertEqual([e['attempt'] for e in selected['events']],['b','preparation']);self.assertEqual([o['id'] for o in selected['githubObservations']],['run-b']);self.assertEqual(selected['localSessions']['entries'],[])
        self.assertEqual(portable.selection(value)['githubObservations'],[])
        with self.assertRaises(ValueError):portable.selection(value,['foreign'])
        with self.assertRaises(ValueError):portable.selection(value,observations=['unknown'])
    def test_missing_essential_is_explicit_not_inherited(self):
        value={'session':{'profile':'defense'},'catalogue':{'operations':{}},'events':[{'operation':'f11-early','attempt':'a','operational':'COMPLETED','artifacts':[{'id':'wrong','producer':'prepare','path':'operations/other/closed/F11-early.json'}]}]}
        refs=portable.references(value);self.assertEqual(refs['essential'],[]);self.assertEqual({r['role'] for r in refs['missing']},{'log','attribution'})
    def test_f13_inventories_are_required_and_bound_to_the_attempt(self):
        paths=['attestation-inventory-before-results.json','registry-inventory-before-results.json','attestation-inventory-after-denial.json','registry-inventory-after-denial.json']
        artifacts=[{'id':str(i),'producer':'f13','path':'operations/f13/closed/'+name} for i,name in enumerate(paths)]
        value={'session':{'profile':'defense'},'catalogue':{'operations':{}},'events':[{'operation':'f13','operational':'COMPLETED','artifacts':artifacts}]}
        refs=portable.references(value);self.assertEqual(set(refs['essential']),{'0','1','2','3'})
        artifacts[0]['producer']='preparation'
        refs=portable.references(value);self.assertNotIn('0',refs['essential']);self.assertTrue(any(x['role']=='support' and x['path']==paths[0] for x in refs['missing']))
    def test_freeze_rejects_external_manifest_tampering_and_missing_hashes(self):
        import io, tarfile
        spec=importlib.util.spec_from_file_location('freeze_demo',Path(portable.__file__).with_name('freeze-demo.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);manifest=b'{"synthetic":true}'
            (root/'manifest.json').write_bytes(manifest);(root/'recorded.html').write_text('synthetic')
            with tarfile.open(root/'evidence.tar.gz','w:gz') as archive:
                entry=tarfile.TarInfo('manifest.json');entry.size=len(manifest);archive.addfile(entry,io.BytesIO(manifest))
            sums=''.join(m.checksum(root/name)+'  '+name+'\n' for name in ('evidence.tar.gz','recorded.html'))
            (root/'SHA256SUMS.txt').write_text(sums)
            self.assertEqual(m.export_identity(root)[0],{'synthetic':True})
            (root/'manifest.json').write_text('{"synthetic":"altered"}')
            with self.assertRaisesRegex(ValueError,'Manifest differs'):m.export_identity(root)
            (root/'SHA256SUMS.txt').write_text(sums.splitlines()[0]+'\n')
            with self.assertRaisesRegex(ValueError,'Incomplete'):m.export_identity(root)
    def test_portable_verify_fails_missing_altered_and_symlink(self):
        spec=importlib.util.spec_from_file_location('static_verify',Path(portable.__file__).with_name('verify-static.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
        with tempfile.TemporaryDirectory() as t:
            p=Path(t);a=p/'log.txt';a.write_text('synthetic');r=file_record(p,a,'test','synthetic');(p/'SHA256SUMS').write_text(r['sha256']+'  log.txt\n');self.assertEqual(m.verify(p)['status'],'VERIFIED')
            a.write_text('bad')
            with self.assertRaises(ValueError):m.verify(p)
            a.unlink()
            with self.assertRaises(ValueError):m.verify(p)
            a.symlink_to('/etc/hostname')
            with self.assertRaises(ValueError):m.verify(p)
