"""Bounded, read-only GitHub capture. Separate from session actions and trust decisions."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tempfile
import tarfile
import time
import uuid
import zipfile

from core import ROOT, atomic, sanitize, utc, workflow_facts

STORE = ROOT / 'evidence/raw/github-observations'
REPOSITORY = 'tfm-goldenpath/golden-path-lab'
WORKFLOWS = {'ci.yml', 'lane-a-validation.yml', 'golden-path.yml', 'paired-rg.yml'}
MAX_FILE = 2 * 1024**2
MAX_CAPTURE = 8 * 1024**2


def sha(data):
    return hashlib.sha256(data).hexdigest()


def regular(path, maximum=MAX_FILE):
    p = Path(path).absolute()
    if p.resolve() != p or not p.is_file() or p.stat().st_size > maximum:
        raise ValueError('Unsafe or oversized input: ' + p.name)
    return p


def margin(growth=MAX_CAPTURE*3):
    STORE.mkdir(parents=True, exist_ok=True)
    if STORE.resolve() != STORE: raise ValueError('Unsafe observation store')
    for path in (STORE,Path(tempfile.gettempdir())):
        s = os.statvfs(path)
        if s.f_bavail*s.f_frsize < 3*1024**3+growth or s.f_favail < 10000:
            raise ValueError('Insufficient disk/inode reserve for capture')


def gh(endpoint, maximum=MAX_FILE, binary=False, destination=None):
    """No shell, pagination or arbitrary host; bounded bytes/time on disk, no token output."""
    margin(maximum)
    with tempfile.TemporaryFile() as output, tempfile.TemporaryFile() as error:
        command = ['gh', 'api', '--method', 'GET', endpoint]
        if binary: command += ['-H', 'Accept: application/octet-stream']
        child = subprocess.Popen(command, stdout=output, stderr=error)
        start = time.monotonic()
        while child.poll() is None:
            if output.tell() > maximum or error.tell() > 65536 or time.monotonic()-start > 60:
                child.kill(); child.wait(); raise ValueError('GitHub capture exceeded byte/time limit')
            time.sleep(.05)
        if output.tell() > maximum: raise ValueError('Oversized GitHub response')
        if child.returncode:
            error.seek(0); diagnostic = error.read(65536).decode(errors='replace')
            status = re.search(r'HTTP (\d{3})', diagnostic)
            raise ValueError('GitHub retrieval unavailable: '+(status.group(1) if status else 'transport/authentication error'))
        output.seek(0)
        if destination is not None:
            import shutil
            with Path(destination).open('xb') as target: shutil.copyfileobj(output,target,1024*1024)
            return None
        return output.read(maximum+1)


def archive_files(path, maximum=32*1024**2):
    """Inspect all entries, copy only allowlisted small public summaries; never extract paths."""
    regular(path, 128*1024**2)
    allowed = {'pair.json', 'analysis.json', 'image.bundle.json', 'sbom.bundle.json', 'provenance.bundle.json', 'results.bundle.json'}
    with zipfile.ZipFile(path) as z:
        entries = z.infolist()
        if len(entries)>2048 or len({e.filename for e in entries})!=len(entries): raise ValueError('Duplicate or excessive archive entries')
        total = 0
        for e in entries:
            parts=PurePosixPath(e.filename).parts; mode=(e.external_attr>>16)&0o170000
            if not parts or e.filename.startswith('/') or '..' in parts or '\\' in e.filename or mode not in (0,0o100000,0o040000): raise ValueError('Unsafe archive path or link')
            total += e.file_size
            if total>maximum: raise ValueError('Expanded archive exceeds limit')
        result={}
        for e in entries:
            if not e.is_dir() and PurePosixPath(e.filename).name in allowed:
                if e.file_size>MAX_FILE: raise ValueError('Oversized summary')
                if PurePosixPath(e.filename).name in result: raise ValueError('Ambiguous duplicate summary basename')
                result[PurePosixPath(e.filename).name]=z.read(e)
        return result


def associate(pair, run):
    if str(pair.get('runId'))!=str(run['id']) or pair.get('source')!=run['head_sha']:
        raise ValueError('Pair/run source association mismatch')
    if pair.get('dataset') not in ('development','pilot','campaign') or pair.get('order') not in ('RG','GR'):
        raise ValueError('Unknown pair dataset/order')
    for arm, receipt in pair.get('arms',{}).items():
        if arm not in ('R','G') or any(receipt.get(k)!=pair.get(k) for k in ('runId','source','planIdentity','dataset','attempt','order','pair')):
            raise ValueError('Arm association mismatch')
    return pair


def latest_run(workflow):
    if workflow not in WORKFLOWS:
        raise ValueError('Unsupported workflow')
    response=json.loads(gh(f'repos/{REPOSITORY}/actions/workflows/{workflow}/runs?per_page=1'))
    runs=response.get('workflow_runs',[])
    if not runs: raise ValueError('No GitHub execution available for '+workflow)
    run=runs[0]
    if (run.get('repository',{}).get('full_name')!=REPOSITORY
            or Path(run.get('path','').split('@')[0]).name!=workflow
            or type(run.get('id')) is not int or run['id']<=0):
        raise ValueError('Latest execution identity mismatch')
    return run['id']


def capture(args):
    margin(); directory=STORE/(str(args.run)+'-'+uuid.uuid4().hex[:12]); directory.mkdir(mode=0o700)
    observation={'schema':'demo-github-observation/v1','id':directory.name,'repository':REPOSITORY,'capturedUTC':utc(),'origin':'GitHub API read-only capture','files':[],'issues':[],'verification':'Metadata capture only; no cryptographic reverification'}
    def save(name, content, origin):
        if len(content)>MAX_FILE: raise ValueError('Oversized document')
        if sum(f['size'] for f in observation['files'])+len(content)>MAX_CAPTURE: raise ValueError('Capture byte budget exceeded')
        clean=sanitize(content.decode('utf-8',errors='replace')).encode()
        if b'PRIVATE KEY' in clean: raise ValueError('Private material refused')
        filename=sha(clean)+'.txt'; path=directory/filename
        if not path.exists(): path.write_bytes(clean)
        record={'name':name,'file':filename,'sha256':sha(clean),'size':len(clean),'source':origin,'redacted':clean!=content,'text':clean[:12000].decode(errors='replace'),'truncated':len(clean)>12000}
        if name.endswith('.bundle.json'):
            try:
                bundle=json.loads(clean);statement=json.loads(base64.b64decode(bundle['dsseEnvelope']['payload'],validate=True))
                record['statement']={k:statement.get(k) for k in ('predicateType','subject')}
                record['association']='Unverified document claims; run association and signer identity not established'
            except (ValueError,KeyError,TypeError): record['association']='Statement unavailable; no trust or run association established'
        observation['files'].append(record); return record
    try:
        if args.from_directory:
            observation['origin']='Operator-supplied local capture; no fresh GitHub query'
            source=Path(args.from_directory)
            run=json.loads(regular(source/'run.json').read_text()); jobs=json.loads(regular(source/'jobs.json').read_text())
        else:
            run=json.loads(gh(f'repos/{REPOSITORY}/actions/runs/{args.run}'))
            attempt=run['run_attempt']
            try: jobs=json.loads(gh(f'repos/{REPOSITORY}/actions/runs/{args.run}/attempts/{attempt}/jobs?per_page=100'))
            except ValueError as e:
                observation['issues'].append('Jobs unavailable: '+str(e)); jobs={'jobs':[], 'total_count':0}
        if str(run['id'])!=str(args.run) or run['repository']['full_name']!=REPOSITORY or not re.fullmatch('[a-f0-9]{40}',run['head_sha']): raise ValueError('Run identity mismatch')
        workflow=Path(run['path'].split('@')[0]).name
        if workflow not in WORKFLOWS: raise ValueError('Unsupported workflow')
        observation['run']={k:run.get(k) for k in ('id','run_attempt','head_sha','head_branch','path','status','conclusion','created_at','run_started_at','updated_at','html_url')}
        observation['workflow']=workflow
        captured_jobs=[{k:j.get(k) for k in ('id','name','status','conclusion','started_at','completed_at','steps','html_url','run_id','run_attempt','head_sha')} for j in jobs['jobs'][:100]]
        if any(str(j.get('run_id'))!=str(args.run) or j.get('head_sha')!=run['head_sha'] or j.get('run_attempt')!=run['run_attempt'] for j in captured_jobs): raise ValueError('Job identity mismatch')
        observation['jobs']=captured_jobs
        if (jobs.get('total_count') or len(jobs['jobs']))>100: observation['issues'].append('Jobs truncated to first 100')
        save('run.json',json.dumps({**observation['run'],'repository':{'full_name':REPOSITORY}}).encode(),'GitHub run metadata')
        save('jobs.json',json.dumps({'jobs':observation['jobs'],'total_count':jobs.get('total_count')}).encode(),'GitHub jobs metadata; original logs not captured')
        try:
            if args.from_directory: yaml=regular(Path(args.from_directory)/workflow).read_bytes()
            else:
                content=json.loads(gh(f'repos/{REPOSITORY}/contents/.github/workflows/{workflow}?ref={run["head_sha"]}'))
                yaml=base64.b64decode(content['content'],validate=False)
            observation['definition']=save(workflow,yaml,'Operator-supplied definition; commit association not independently checked' if args.from_directory else 'Workflow at run head_sha; not current main')
            observation['definition']['jobs']=workflow_facts(yaml.decode())
            if args.from_directory: observation['issues'].append('Local workflow YAML is operator-supplied; its Git blob has not been authenticated against GitHub')
        except (ValueError,OSError,KeyError) as e: observation['issues'].append('Workflow definition unavailable: '+str(e))
        if not args.from_directory:
            try:
                artifacts=json.loads(gh(f'repos/{REPOSITORY}/actions/runs/{args.run}/artifacts?per_page=100'))
                observation['artifacts']=[{k:a.get(k) for k in ('id','name','size_in_bytes','expired','digest')} for a in artifacts['artifacts'][:100]]
            except ValueError as e: observation['issues'].append(str(e))
        if args.publication_summary:
            index=json.loads((ROOT/'registros/paired-rg-campaign-895a3bd.json').read_text())
            match=next((r for r in index['campaignRuns'] if r['runId']==str(args.run)),None)
            if not match or run['head_sha']!=index['source'] or run['run_attempt']!=match['originalRunAttempt']: raise ValueError('Publication identity mismatch')
            release=json.loads(gh(f'repos/{REPOSITORY}/releases/tags/evidence-campaign-895a3bd-20261004'))
            for name in ('analysis.json','report.json'):
                expected=next(a for a in index['assets'] if a['name']==name)
                asset=next(a for a in release['assets'] if a['name']==name)
                if asset['size']>MAX_FILE: raise ValueError('Release summary exceeds size limit')
                raw=gh(f'repos/{REPOSITORY}/releases/assets/{asset["id"]}',maximum=asset['size'],binary=True)
                if sha(raw)!=expected['sha256']: raise ValueError('Publication checksum mismatch')
                save(name,raw,expected['url']); value=json.loads(raw)
                if name=='analysis.json': observation['publishedAnalysis']=value
            observation['publication']={'dataset':index['dataset'],'source':index['source'],'planIdentity':index['plan']['planIdentity'],'database':index['database'],'order':match['order'],'pair':match['position'],'boundary':'Published summary integrity and run association; full pair package not audited'}
        inputs={}
        if args.archive: inputs.update(archive_files(args.archive))
        paired_archive=getattr(args,'paired_archive',None)
        download_id=getattr(args,'paired_artifact',None)
        if download_id:
            if args.from_directory or workflow!='paired-rg.yml': raise ValueError('Artifact retrieval requires GitHub paired run metadata')
            metadata=next((a for a in observation.get('artifacts',[]) if a.get('id')==download_id),None)
            if not metadata or metadata.get('expired'): raise ValueError('Requested artifact absent or expired')
            size=metadata.get('size_in_bytes')
            if type(size) is not int or not 0<size<=128*1024**2: raise ValueError('Artifact download size exceeds limit')
            margin(2*size+MAX_CAPTURE*3)
            from observation_packages import paired_documents
            with tempfile.TemporaryDirectory(prefix='golden-path-observation-download-') as temporary:
                downloaded=Path(temporary)/'artifact.zip'
                gh(f'repos/{REPOSITORY}/actions/artifacts/{download_id}/zip',maximum=size,destination=downloaded)
                inputs,provenance=paired_documents(downloaded,run,observation['artifacts'],download_id)
            observation['packageInspection']=provenance

        if paired_archive:
            if args.from_directory or workflow!='paired-rg.yml': raise ValueError('Paired archive requires GitHub paired run metadata')
            from observation_packages import paired_documents
            inputs, provenance=paired_documents(regular(paired_archive,128*1024**2),run,observation.get('artifacts',[]),getattr(args,'artifact_id',None))
            observation['packageInspection']=provenance

        if args.pair: inputs['pair.json']=regular(args.pair).read_bytes()
        if 'pair.json' in inputs:
            pair=associate(json.loads(inputs['pair.json']),run); observation['pair']=pair
            # Existing classifier/analysis validates complete arm timing and association.
            import sys
            sys.path.insert(0,str(ROOT/'scripts'))
            import paired_measurements
            try: observation['pairAnalysis']=paired_measurements.summarize([pair])
            except (ValueError,KeyError,TypeError) as e: observation['issues'].append('Pair contract validation incomplete: '+str(e))
        for name,raw in inputs.items():
            record=save(name,raw,'GitHub artifact / G package: '+provenance['paths'][name] if (paired_archive or download_id) else 'Operator-supplied local capture; association is not cryptographic verification')
            if (paired_archive or download_id) and name in provenance['attestations']:
                record['historicalEvidence']=provenance['attestations'][name]
                record['association']='Artifact and G package hashes checked; run/source/subject association checked. No current cryptographic reverification.'
        observation['status']='CAPTURED'
    except (ValueError,OSError,KeyError,TypeError,StopIteration,zipfile.BadZipFile,tarfile.TarError,RuntimeError) as e:
        observation['status']='INCOMPLETE';observation['issues'].append(str(e))
    # Keep the inventory itself bounded even for operator-supplied oversized metadata.
    if len(json.dumps(observation).encode()) > 512*1024:
        files=[{k:v for k,v in f.items() if k not in ('statement','jobs')} for f in observation['files']]
        observation={k:observation[k] for k in ('schema','id','repository','capturedUTC','origin','verification')}
        observation.update(status='INCOMPLETE',files=files,issues=['Metadata exceeds inventory limit; original captured documents retained'])
    # No credential fields or raw gh stderr are retained.
    atomic(directory/'observation.json',observation)
    print(json.dumps({'id':directory.name,'status':observation['status'],'issues':observation['issues']}))
    return 0 if observation['status']=='CAPTURED' else 1


def inventory():
    """Bounded metadata only. No archive extraction, downloads or action retargeting."""
    if not STORE.exists(): return []
    if STORE.resolve()!=STORE: return [{'status':'INVALID','issues':['Unsafe import store']}]
    result=[];budget=4*1024**2
    import itertools
    for folder in sorted(itertools.islice(STORE.iterdir(),32),reverse=True):
        if not re.fullmatch(r'[0-9]+-[a-f0-9]{12}',folder.name): continue
        try:
            p=regular(folder/'observation.json',512*1024)
            if p.stat().st_size>budget: break
            budget-=p.stat().st_size
            value=json.loads(p.read_text())
            if value['id']!=folder.name or value['repository']!=REPOSITORY: raise ValueError('Capture identity changed')
            if len(value.get('files',[]))>32: raise ValueError('Excessive captured files')
            for f in value.get('files',[]):
                if not re.fullmatch(r'[a-f0-9]{64}', f['sha256']) or f['file']!=f['sha256']+'.txt': raise ValueError('Unsafe captured artifact reference')
                regular(folder/f['file'])
            result.append(value)
        except (OSError,ValueError,KeyError,TypeError,RecursionError) as e: result.append({'id':folder.name,'status':'INVALID','issues':[str(e)]})
    return result


def artifact(capture_id, checksum):
    if not re.fullmatch(r'[0-9]+-[a-f0-9]{12}',capture_id) or not re.fullmatch('[a-f0-9]{64}',checksum): raise ValueError('Invalid capture identifier')
    record=json.loads(regular(STORE/capture_id/'observation.json',512*1024).read_text())
    if not any(f['sha256']==checksum for f in record['files']): raise ValueError('Unregistered observation artifact')
    content=regular(STORE/capture_id/(checksum+'.txt')).read_bytes()
    if sha(content)!=checksum: raise ValueError('Captured artifact integrity failure')
    return content


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    selection=parser.add_mutually_exclusive_group(required=True)
    selection.add_argument('--run',type=int)
    selection.add_argument('--latest',choices=sorted(WORKFLOWS),help='Capture the latest execution at query time, including failures/in-progress runs')
    parser.add_argument('--from-directory',help='Already downloaded run.json, jobs.json and workflow YAML; explicit local capture')
    parser.add_argument('--publication-summary',action='store_true',help='Only hash-pinned small campaign summaries; never download campaign package')
    parser.add_argument('--pair',help='Local pair.json; must match run and source')
    parser.add_argument('--archive',help='Local bounded zip; safe inspection, no path extraction')
    parser.add_argument('--paired-artifact',type=int,help='Explicit bounded download of one paired artifact, <=128 MiB; metadata-only by default')
    parser.add_argument('--paired-archive',help='Previously downloaded paired ZIP, <=128 MiB; inspect only its bounded G package, never extract databases')
    parser.add_argument('--artifact-id',type=int,help='GitHub artifact ID belonging to this run; requires recorded SHA-256')
    args=parser.parse_args()
    if args.latest:
        if args.from_directory: parser.error('--latest requires a GitHub query')
        args.run=latest_run(args.latest)
    if args.paired_artifact and (args.archive or args.paired_archive or args.pair): parser.error('--paired-artifact cannot be combined with local evidence inputs')
    if args.paired_archive and (args.archive or args.pair): parser.error('--paired-archive cannot be combined with other local evidence inputs')
    if bool(args.paired_archive)!=bool(args.artifact_id): parser.error('--paired-archive and --artifact-id must be provided together')
    raise SystemExit(capture(args))
