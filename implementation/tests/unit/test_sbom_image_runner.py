"""Synthetic runner boundary regressions; no scanner/image claim."""
import importlib.util
import os
import io
import json
import tarfile
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('runner',Path(__file__).parents[1]/'integration/sbom-image-run.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
class RunnerTests(unittest.TestCase):
 def test_regular_and_limits(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'f';p.write_bytes(b'abc');self.assertEqual(len(r.digest(p)),64)
   with self.assertRaises(ValueError):r.digest(p,2)
   l=Path(d)/'link';l.symlink_to(p)
   with self.assertRaises(OSError):r.digest(l)
   fifo=Path(d)/'fifo';os.mkfifo(fifo)
   with self.assertRaises(ValueError):r.digest(fifo)
 def test_timeout(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(ValueError,'duration'):r.run(['sleep','10'],Path(d)/'log',seconds=.05)
 def test_output(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(ValueError,'output'):r.run(['python3','-c','print("x"*10000)'],Path(d)/'log',limit=100)
 def test_execution_failure(self):
  with tempfile.TemporaryDirectory() as d:self.assertEqual(r.run(['false'],Path(d)/'log')['exit'],1)
 def test_capacity(self):
  with patch.object(r.os,'statvfs') as p:
   p.return_value.f_bavail=1;p.return_value.f_frsize=4096
   with self.assertRaisesRegex(ValueError,'Capacity'):r.capacity('/')
 def test_fresh_output(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'log';p.write_text('preserve')
   with self.assertRaises(FileExistsError):r.run(['true'],p)
   self.assertEqual(p.read_text(),'preserve')
 def test_archive_metadata_and_unsafe_members(self):
  for unsafe in [None,'../escape','/absolute','link','fifo','duplicate','platform']:
   with self.subTest(unsafe=unsafe), tempfile.TemporaryDirectory() as d:
    p=Path(d)/'image.tar'
    with tarfile.open(p,'w') as t:
     def add(name,value):
      b=json.dumps(value).encode();m=tarfile.TarInfo(name);m.size=len(b);t.addfile(m,io.BytesIO(b))
     add('manifest.json',[{'Config':'config.json'}])
     add('config.json',{'os':'linux','architecture':'arm64' if unsafe=='platform' else 'amd64','rootfs':{'diff_ids':[]}})
     if unsafe and unsafe!='platform':
      m=tarfile.TarInfo('config.json' if unsafe=='duplicate' else unsafe)
      if unsafe=='link':m.type=tarfile.SYMTYPE;m.linkname='config.json'
      if unsafe=='fifo':m.type=tarfile.FIFOTYPE
      t.addfile(m)
    if unsafe:
     with self.assertRaises(ValueError):r.identity(p)
    else:self.assertEqual(r.identity(p)['platform'],'linux/amd64')
if __name__=='__main__':unittest.main()
