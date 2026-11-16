#!/usr/bin/env python3
"""Bounded experimental static scanner runner; no Docker resources are created here."""
import hashlib
import json
import os
from pathlib import Path
import signal
import stat
import subprocess
import sys
import time
import tempfile
import shutil
import tarfile
from pathlib import PurePosixPath

LIMIT = 32 * 1024**2
RESERVE = 3 * 1024**3

def digest(path, limit=2*1024**3):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, 'rb') as f:
        s = os.fstat(f.fileno())
        if not stat.S_ISREG(s.st_mode) or s.st_size > limit:
            raise ValueError('Unsafe or oversized input')
        h = hashlib.sha256()
        for b in iter(lambda: f.read(1024**2), b''): h.update(b)
        after=os.fstat(f.fileno())
        if (after.st_size,after.st_mtime_ns,after.st_ctime_ns)!=(s.st_size,s.st_mtime_ns,s.st_ctime_ns): raise ValueError('Input changed during reading')
        return h.hexdigest()

def identity(archive):
    # Read bounded outer archive metadata only. Never unpack layers or interpret whiteouts.
    with tarfile.open(archive) as t:
        members={}
        for m in t:
            p=PurePosixPath(m.name)
            if len(members)>=10000 or p.is_absolute() or '..' in p.parts or str(p)!=m.name or m.name in members:
                raise ValueError('Unsafe archive path/count')
            if not (m.isfile() or m.isdir()) or m.size>2*1024**3: raise ValueError('Unsafe archive member')
            members[m.name]=m
        def read(name):
            m=members[name]
            if not m.isfile() or m.size>1024**2: raise ValueError('Unsafe image metadata')
            return t.extractfile(m).read()
        manifest=json.loads(read('manifest.json'))
        if len(manifest)!=1: raise ValueError('Ambiguous archive image')
        config=read(manifest[0]['Config'])
        c=json.loads(config)
        if c.get('os')!='linux' or c.get('architecture')!='amd64': raise ValueError('Unexpected archive platform')
        result={'configDigest':'sha256:'+hashlib.sha256(config).hexdigest(),'platform':'linux/amd64','diffIDs':c['rootfs']['diff_ids']}
        if 'index.json' in members:
            index=read('index.json');idx=json.loads(index)
            if len(idx['manifests'])!=1: raise ValueError('Ambiguous index')
            desc=idx['manifests'][0];name='blobs/sha256/'+desc['digest'].removeprefix('sha256:')
            image=read(name)
            if 'sha256:'+hashlib.sha256(image).hexdigest()!=desc['digest']: raise ValueError('Manifest hash')
            if json.loads(image)['config']['digest']!=result['configDigest']: raise ValueError('Config association')
            result.update(indexDigest='sha256:'+hashlib.sha256(index).hexdigest(),platformManifestDigest=desc['digest'])
        return result

def capacity(path, growth=0):
    v = os.statvfs(path)
    free = v.f_bavail*v.f_frsize
    if free < RESERVE + growth: raise ValueError('Capacity reserve unavailable')
    return free

def run(command, output, seconds=900, limit=LIMIT, extra=None):
    output = Path(output)
    capacity(output.parent, limit*2)
    before=time.monotonic()
    with output.open('xb') as log:
        def restrict():
            os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:2])
        p=subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, start_new_session=True, preexec_fn=restrict)
        reason=None
        try:
            while p.poll() is None:
                if time.monotonic()-before > seconds: reason='duration limit'
                if output.stat().st_size > limit or (extra and extra.exists() and extra.stat().st_size>limit): reason='output limit'
                if reason: raise ValueError(reason)
                capacity(output.parent)
                time.sleep(.05)
        except BaseException:
            os.killpg(p.pid, signal.SIGKILL)
            p.wait()
            raise
    if output.stat().st_size > limit: raise ValueError('output limit')
    return {'command':command, 'exit':p.returncode, 'seconds':time.monotonic()-before,
            'freeBytesAfter':capacity(output.parent), 'logSha256':digest(output,limit)}

def scan(archive, destination, syft):
    archive=Path(archive).absolute()
    for p in (archive,*archive.parents):
        if p.is_symlink(): raise ValueError('Symlink archive path')
    archive=archive.resolve(strict=True)
    destination=Path(destination)
    destination.mkdir()
    receipt={'engineCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'runnerSha256':digest(__file__), 'schema':'sbom-image-acquisition/v1','status':'ERROR','platform':'linux/amd64','commands':[]}
    try:
        receipt['archiveSha256']=digest(archive)
        receipt['image']=identity(archive)
        receipt['freeBytesBefore']=capacity(destination, 2*1024**3)
        commands=[['trivy','image','--parallel','2','--timeout','15m','--skip-db-update','--skip-java-db-update','--offline-scan','--format','cyclonedx','--input',str(archive)],
                  [str(Path(syft).resolve()),'scan','docker-archive:'+str(archive),'--platform','linux/amd64','--scope','squashed','--override-default-catalogers','dpkg-db-cataloger','--select-catalogers','-file','--parallelism','2','-o','syft-json']]
        # Keep stdout reports separate from stderr logs; tool wrapper uses /bin/sh only with fixed script and positional arguments.
        for name,cmd in zip(['trivy','syft'],commands):
            report=destination/(name+'.json')
            wrapper=['bash','-c','umask 077; set -o noclobber; exec "$@" > "$SBOM_REPORT"','scanner',*cmd]
            os.environ['SBOM_REPORT']=str(report.resolve())
            os.environ['SYFT_CHECK_FOR_APP_UPDATE']='false'
            os.environ['GOMAXPROCS']='2'
            # 2 GiB per-file hard cap also permits scanner temporary runtime files.
            # Reports/logs have a separate monitored 32 MiB acceptance limit.
            wrapped=['bash','-c','ulimit -f 2097152; exec "$@"','bounded',*wrapper]
            scratch=Path(tempfile.mkdtemp(prefix='scanner-tmp-',dir=destination)).resolve()
            os.environ['TMPDIR']=str(scratch)
            try:
                r=run(wrapped,destination/(name+'.log'),extra=report)
            finally:
                # Only this invocation's exclusively created scratch directory.
                # rmtree on this platform avoids following attacker-controlled links.
                if scratch.is_symlink() or not shutil.rmtree.avoids_symlink_attacks:
                    raise ValueError('Unsafe scanner scratch cleanup')
                shutil.rmtree(scratch)
                os.environ.pop('TMPDIR',None)
            r['cleanupStatus']='PASS'
            r['scannerCommand']=cmd
            r['archiveSha256After']=digest(archive)
            receipt['commands'].append(r)
            if r['exit'] or r['archiveSha256After']!=receipt['archiveSha256']:
                raise ValueError('Scanner failed or image bytes changed')
            receipt[name+'Sha256']=digest(report,LIMIT)
        receipt['status']='COLLECTED'
    except Exception as e:
        receipt['reason']=str(e)
    finally:
        (destination/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    return 0 if receipt['status']=='COLLECTED' else 2

if __name__=='__main__':
    if len(sys.argv)!=4: raise SystemExit('usage: sbom-image-run.py IMAGE.oci.tar NEW_OUTPUT SYFT')
    raise SystemExit(scan(*sys.argv[1:]))
