#!/usr/bin/env python3
"""Package explicit spike evidence with the existing writer/verifier; no image extraction."""
import importlib.util
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[3]
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
writer=load('writer',ROOT/'src/package_evidence.py')
verifier=load('verifier',ROOT/'src/verify_package.py')
def package(source,output):
 source=verifier.regular(source/'matrix/matrix.json').parent.parent
 names={}
 for p in sorted(source.rglob('*')):
  if p.is_symlink(): raise ValueError('Evidence symlink')
  relative=p.relative_to(source)
  if 'consumer' in relative.parts or p.name in ['SHA256SUMS.txt','execution-summary.json']:continue
  if p.is_file() and (p.suffix in ['.json','.log','.txt','.go','.bundle'] or p.name=='Dockerfile'):
   verifier.regular(p)
   if p.stat().st_size>32*1024**2:raise ValueError('Oversized evidence')
   if b'PRIVATE KEY-----' in p.read_bytes():raise ValueError('Private key in evidence')
   names[p]=relative.as_posix()
 writer.write_package(source,output,'RESEARCH','sbom-image-spike/v1',names,{'schema':'sbom-image-spike-package/v1','status':'RESEARCH','scope':'Unsigned local static inventory comparison; image archives and identification DB retained separately; no delivery authorization'})
 return verifier.verify_package(output/(source.name+'.tar.gz'))
if __name__=='__main__':
 mode,*args=sys.argv[1:]
 if mode=='package':result=package(Path(args[0]).absolute(),Path(args[1]).absolute())
 elif mode=='verify':result=verifier.verify_package(args[0])
 else:raise SystemExit('usage: sbom-image-evidence.py package SOURCE OUTPUT | verify PACKAGE')
 print(json.dumps(result,indent=2))
