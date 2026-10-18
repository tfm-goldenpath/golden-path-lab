#!/usr/bin/env python3
"""Freeze one verified export and an explicitly classified recording. No lab actions."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
from datetime import datetime,timezone


def checksum(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()


def export_identity(source):
    sums={}
    for line in (source/'SHA256SUMS.txt').read_text().splitlines():
        sha,name=line.split('  ',1)
        if name not in ('evidence.tar.gz','recorded.html') or name in sums or checksum(source/name)!=sha:raise ValueError('Export integrity failure')
        sums[name]=sha
    if set(sums)!={'evidence.tar.gz','recorded.html'}:raise ValueError('Incomplete export checksum inventory')
    with tarfile.open(source/'evidence.tar.gz') as archive:
        entry=archive.getmember('manifest.json')
        if not entry.isfile() or entry.size>16*1024*1024:raise ValueError('Invalid archive manifest')
        captured=archive.extractfile(entry).read()
    if captured!=(source/'manifest.json').read_bytes():raise ValueError('Manifest differs from verified archive')
    sums['manifest.json']=hashlib.sha256(captured).hexdigest()
    return json.loads(captured),sums


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for flag in ('export','video','recording','validation','output'):p.add_argument('--'+flag,required=True,type=Path)
    p.add_argument('--original-video',type=Path)
    args=p.parse_args()
    source=args.export.absolute();target=args.output.absolute()
    if source.resolve()!=source or not source.is_dir() or target.exists() or target.parent.resolve()!=target.parent:raise ValueError('Unsafe or existing export destination')
    spec=importlib.util.spec_from_file_location('verify_static',Path(__file__).with_name('verify-static.py'));verifier=importlib.util.module_from_spec(spec);spec.loader.exec_module(verifier)
    verifier.verify(source/'portable')
    manifest,expected=export_identity(source)
    recording=json.loads(args.recording.read_text());validation=json.loads(args.validation.read_text())
    if recording.get('kind') not in ('continuous-recorded-evidence-navigation','continuous-live-browser','screenshot-montage'):raise ValueError('Explicit recording classification required')
    if recording.get('session')!=manifest['session'] or recording.get('evidenceSource')!=manifest['source']:raise ValueError('Recording/source association differs')
    if validation.get('session')!=manifest['session'] or validation.get('source')!=manifest['source']:raise ValueError('Validation/source association differs')
    video=args.video.absolute()
    if checksum(video)!=recording.get('videoSha256'):raise ValueError('Recording video hash differs')
    if args.original_video and checksum(args.original_video)!=recording.get('originalSha256'):raise ValueError('Original recording hash differs')
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)],text=True))
    if not any(s.get('codec_name')=='h264' and s.get('codec_type')=='video' for s in probe['streams']):raise ValueError('H.264 video required')
    subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True)
    inputs={name:source/name for name in ('recorded.html','evidence.tar.gz','manifest.json')}
    inputs.update({'video.mp4':video,'recording.json':args.recording,'validation.json':args.validation,'verify.py':Path(__file__).with_name('verify-static.py')})
    if args.original_video:inputs['original.webm']=args.original_video
    for item in (source/'portable').rglob('*'):
        if item.is_symlink():raise ValueError('Symlink in portable export')
        if item.is_file():inputs['portable/'+item.relative_to(source/'portable').as_posix()]=item
    for item in inputs.values():
        if item.absolute().resolve()!=item.absolute() or not item.is_file():raise ValueError('Unsafe frozen input')
    size=sum(x.stat().st_size for x in inputs.values());fs=os.statvfs(target.parent)
    if fs.f_bavail*fs.f_frsize < size+3*1024**3 or fs.f_favail < len(inputs)+10000:raise ValueError('RESOURCE_EXHAUSTED: freeze needs originals plus 3 GiB and inode reserve')
    target.mkdir()
    for name,item in inputs.items():
        dest=target/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(item,dest)
        if checksum(dest)!=checksum(item):raise ValueError('Copy integrity failure')
    verifier.verify(target/'portable')
    for name,sha in expected.items():
        if checksum(target/name)!=sha:raise ValueError('Frozen export changed during copy')
    if checksum(target/'video.mp4')!=recording['videoSha256']:raise ValueError('Frozen video changed during copy')
    if args.original_video and checksum(target/'original.webm')!=recording['originalSha256']:raise ValueError('Frozen original video changed during copy')
    if json.loads((target/'recording.json').read_text())!=recording or json.loads((target/'validation.json').read_text())!=validation:raise ValueError('Frozen reports changed during copy')
    page=(target/'recorded.html').read_text()
    captured=json.loads(page.split('window.SAVED_SESSION=',1)[1].split(';</script>',1)[0])
    observations=[{'captureId':o['id'],'runId':o['run']['id'],'attempt':o['run'].get('run_attempt'),'source':o['run'].get('head_sha'),'workflow':o.get('workflow')} for o in captured.get('githubObservations',[])]
    scenarios=sorted({e.get('scenario') for e in captured.get('events',[]) if e.get('scenario')})
    frozen={'schema':'defense-freeze/v1','createdUTC':datetime.now(timezone.utc).isoformat(),'session':manifest['session'],'evidenceSource':manifest['source'],'renderer':manifest['renderer'],'rendererSource':manifest['rendererSource'],'selection':manifest['selection'],'scenarios':scenarios,'observations':observations,'recording':recording,'video':{'sha256':checksum(video),'durationSeconds':float(probe['format']['duration']),'size':video.stat().st_size,'decode':'PASS'},'validation':validation,'humanNarratedRehearsal':'PENDING','scope':'Recorded local evidence and explicitly selected historical observations; not new cryptographic verification'}
    (target/'freeze.json').write_text(json.dumps(frozen,indent=2)+'\n')
    (target/'README.txt').write_text('Frozen recorded defense. Open recorded.html via file://; play video.mp4 locally.\nServe portable/: python3 -m http.server 8000 --bind 127.0.0.1 --directory portable\nVerify entire package: python3 verify.py\nRead freeze.json and validation.json for scope, source and limitations. No human narration is claimed.\n')
    (target/'SHA256SUMS').write_text(''.join(checksum(x)+'  '+x.relative_to(target).as_posix()+'\n' for x in sorted(target.rglob('*')) if x.is_file()))
    print(json.dumps(verifier.verify(target)));print(target)
if __name__=='__main__':
    try:main()
    except (ValueError,OSError,subprocess.CalledProcessError) as e:print('ERROR: '+str(e),file=sys.stderr);sys.exit(1)
