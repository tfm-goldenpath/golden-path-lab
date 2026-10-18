#!/usr/bin/env python3
"""Verify an unpacked portable/frozen demo with only Python's standard library."""
import hashlib
import json
from pathlib import Path
import sys

def verify(root):
    root=root.absolute()
    if root.resolve()!=root: raise ValueError('Symlinked package root')
    sums=root/'SHA256SUMS';seen=set()
    for line in sums.read_text().splitlines():
        checksum,name=line.split('  ',1);rel=Path(name);p=root/rel
        if len(checksum)!=64 or any(c not in '0123456789abcdef' for c in checksum) or rel.is_absolute() or '..' in rel.parts or name in seen or p.resolve()!=p or not p.is_file(): raise ValueError('Unsafe, missing or duplicate entry: '+name)
        seen.add(name);h=hashlib.sha256()
        with p.open('rb') as f:
            for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
        if h.hexdigest()!=checksum: raise ValueError('Integrity failure: '+name)
    extras={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}-seen-{'SHA256SUMS'}
    if extras: raise ValueError('Unlisted files: '+', '.join(sorted(extras)))
    return {'status':'VERIFIED','files':len(seen),'boundary':'File integrity, not cryptographic attestation verification'}
if __name__=='__main__':
    try: print(json.dumps(verify(Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parent)))
    except (OSError,ValueError) as e: print('ERROR: '+str(e),file=sys.stderr);sys.exit(1)
