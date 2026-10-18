"""Offline view and verified, allowlisted archives; no result reinterpretation."""
import io
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile

from core import (ROOT, WEB, artifact_index, atomic, digest, evidence_root, file_record,
                  packager, local_session_inventory, read_artifact, read_json, safe_path, session_path, utc)


def stream_hash(stream):
    result = hashlib.sha256()
    for block in iter(lambda: stream.read(1024 * 1024), b''): result.update(block)
    return result.hexdigest()


def verify_tar(path):
    with tarfile.open(path) as archive:
        members = archive.getmembers()
        if any(not m.isfile() or m.name.startswith('/') or '..' in Path(m.name).parts for m in members):
            raise ValueError('Unsafe package member')
        sums = next(m for m in members if m.name.endswith('/SHA256SUMS.txt'))
        prefix = sums.name.rsplit('/', 1)[0]
        for line in archive.extractfile(sums).read().decode().splitlines():
            checksum, name = line.split('  ', 1)
            if stream_hash(archive.extractfile(prefix + '/' + name)) != checksum:
                raise ValueError('Laboratory archive integrity failure')


class ExportSpaceError(RuntimeError):
    """Export growth would cross the custody reserve; originals remain intact."""


def snapshot_paths(state, lab):
    if state['profile'] != 'f11-comparison' or lab is None or not (lab/'database-identity.json').exists(): return {}
    identity = read_json(lab/'database-identity.json')
    directory = Path(identity['retrieval']['directory'])
    allowed = Path('/tmp') / ('golden-path-defense-'+state['session']) / 'snapshots'
    if directory.resolve() != directory or not directory.is_relative_to(allowed): raise ValueError('Unowned database snapshot path')
    paths = {}
    for name in ('trivy.db', 'metadata.json'):
        file = safe_path(directory, 'db/'+name)
        if file_record(directory,file,'export','snapshot')['sha256'] != identity['sha256'][name]: raise ValueError('Database snapshot drift')
        paths['database-snapshot/db/'+name] = file
    return paths


def verify_export(package):
    with tarfile.open(package) as archive:
        members = archive.getmembers()
        if len({m.name for m in members}) != len(members) or any(not m.isfile() or m.name.startswith('/') or '..' in Path(m.name).parts for m in members):
            raise ValueError('Unsafe or duplicate export member')
        manifest = json.load(archive.extractfile('manifest.json'))
        for record in manifest['files']:
            if archive.getmember(record['path']).size != record['size'] or stream_hash(archive.extractfile(record['path'])) != record['sha256']:
                raise ValueError('Export integrity failure')
        return {'status':'VERIFIED', 'boundary':'Archive integrity only; see original cryptographic verifier receipts', 'files':len(manifest['files'])}


def observation_paths(captures):
    from observations import STORE, artifact as observation_artifact
    paths = {}
    for capture in captures:
        if capture.get('status') not in ('CAPTURED', 'INCOMPLETE'): continue
        for record in capture.get('files', []):
            observation_artifact(capture['id'], record['sha256'])
            paths['github-observations/'+capture['id']+'/'+record['file']] = STORE/capture['id']/record['file']
    return paths


def export_session(state, attempts=None, observations=None):
    from coordinator import lab_path, resources, source_identity
    from server import snapshot
    name = state['session']
    raw = evidence_root(name)
    from portable import selection, references, embed, html, write_portable
    value = selection(snapshot(name), attempts, observations)
    database_paths = snapshot_paths(state, lab_path(name)) if not attempts else {}
    estimate = sum(p.stat().st_size for folder in (raw, lab_path(name)) if folder for p in folder.rglob('*') if p.is_file() and not p.is_symlink())
    estimate += sum(p.stat().st_size for p in database_paths.values())
    estimate += sum(f['size'] for capture in value['githubObservations'] for f in capture.get('files', []))
    observation = resources(state['reserveGiB'], growth_gib=(estimate * 3 + 64*1024**2)/1024**3)
    checks = raw / 'export-checks'
    checks.mkdir(exist_ok=True)
    number = len(list(checks.glob('*.json'))) + 1
    atomic(checks / f'{number:04}.json', observation)
    with (checks / f'{number:04}.log').open('x') as stream:
        for command in (['df', '-h', str(ROOT)], ['df', '-i', str(ROOT)], *([] if state['profile']=='early-security' else [['docker', 'system', 'df']])):
            subprocess.run(command, stdout=stream, stderr=subprocess.STDOUT, check=True)
    if not observation['sufficient']: raise ExportSpaceError('Insufficient evidence reserve; export stopped, originals retained')
    directory = ROOT / 'evidence/packages' / ('defense-' + name) / f'export-{number:04}'
    directory.mkdir(parents=True, exist_ok=False)
    value['savedUTC'] = utc()
    value['rendererSource'] = source_identity()
    value['renderer'] = {file: digest((WEB / file).read_bytes()) for file in ('index.html', 'style.css', 'model.js', 'app.js')}
    indexed = artifact_index(name)
    selected = {a['id'] for e in value['events'] for a in e.get('artifacts', [])}
    selected.update(a['id'] for c in value.get('commands', []) for a in c.get('artifacts', []))
    artifacts = {k:v for k,v in indexed.items() if k in selected}
    for r in value.get('stopRequests',[]):
        for a in r.get('artifacts',[]):
            if a['id'] in indexed: artifacts[a['id']]=indexed[a['id']]
    value['artifacts'] = list(artifacts.values())
    refs = references(value)
    paths_by_id = {k:safe_path(raw,r['path']) for k,r in artifacts.items()}
    embed_records = dict(artifacts)
    # Captures are opt-in, including the exact historical bundles/verification files.
    from observations import STORE, artifact as observed_artifact
    for capture in value['githubObservations']:
        for f in capture.get('files', []):
            observed_artifact(capture['id'],f['sha256'])
            key='observation:'+capture['id']+':'+f['sha256']
            f['offlineId']=key
            path=STORE/capture['id']/f['file']
            embed_records[key]={'path':'github-observations/'+capture['id']+'/'+f['name'], 'size':path.stat().st_size, 'sha256':f['sha256']}
            paths_by_id[key]=path
            refs['essential'].append(key)
    value['offlineArtifacts'] = embed(embed_records,paths_by_id,set(refs['essential']))
    for capture in value['githubObservations']:
        for f in capture.get('files', []):
            item=value['offlineArtifacts'][f['offlineId']]
            f.update(text=item['text'],truncated=item['truncated'],embedding=item['status'])
    value['exportCompleteness']={'status':'INCOMPLETE' if refs['missing'] else 'COMPLETE_REFERENCES', 'missing':refs['missing'], 'boundary':'Referenced originals, not new cryptographic verification'}
    value['packageName'] = 'evidence.tar.gz'
    output = directory / 'recorded.html'
    output.write_text(html(value))
    folder = write_portable(directory,value,embed_records,paths_by_id)
    manifest = {'schema': 'defense-export/v1', 'session': name, 'savedUTC': utc(),
                'source': state['source'], 'rendererSource':value['rendererSource'], 'result': state.get('demoResult'), 'humanReview': state.get('humanReview', 'pending'),
                'selection': value['exportSelection'], 'completeness':value['exportCompleteness'], 'artifacts': list(artifacts.values()), 'renderer': value['renderer'], 'files': []}
    files = {'session.json': json.dumps(state, ensure_ascii=False, indent=2).encode(),
             'events.json': json.dumps(value['events'], ensure_ascii=False, indent=2).encode(),
             'catalogue.json': (raw / 'catalogue.json').read_bytes(), 'source.json': (raw / 'source.json').read_bytes(),
             'workflows.json': (raw / 'workflows.json').read_bytes(), 'recorded.html': output.read_bytes()}
    paths = {'artifacts/' + key + '/' + Path(record['path']).name: raw / record['path'] for key, record in artifacts.items()}
    paths.update(observation_paths(value.get('githubObservations', [])))
    paths.update(database_paths)
    paths.update({'portable/'+p.relative_to(folder).as_posix():p for p in folder.rglob('*') if p.is_file()})
    for path, data_bytes in files.items():
        manifest['files'].append({'path': path, 'size': len(data_bytes), 'sha256': digest(data_bytes)})
    for name_in_tar, path in paths.items():
        record = file_record(path.parent, path, 'export', '')
        manifest['files'].append({'path': name_in_tar, 'size': record['size'], 'sha256': record['sha256']})
    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode()
    package = directory / 'evidence.tar.gz'
    with tarfile.open(package, 'w:gz') as archive:
        for path, data_bytes in {**files, 'manifest.json': manifest_bytes}.items():
            info = tarfile.TarInfo(path); info.size = len(data_bytes); info.mode = 0o644
            archive.addfile(info, io.BytesIO(data_bytes))
        archive.dereference = True  # immutable fixture hardlinks are stored as independent regular files
        for name_in_tar, path in paths.items(): archive.add(path, arcname=name_in_tar, recursive=False)
    with tarfile.open(package) as archive:
        for record in manifest['files']:
            if archive.getmember(record['path']).size != record['size'] or stream_hash(archive.extractfile(record['path'])) != record['sha256']: raise ValueError('Export verification failed')
    (directory / 'manifest.json').write_bytes(manifest_bytes)
    package_hash = file_record(directory, package, 'export', '')['sha256']
    (directory / 'SHA256SUMS.txt').write_text(f'{package_hash}  evidence.tar.gz\n{digest(output.read_bytes())}  recorded.html\n')
    record = {'number': number, 'timeUTC': utc(), 'verified': True, 'eventCount': len(value['events']),
              'selection':value['exportSelection'], 'completeness':value['exportCompleteness'],
              'portable':str(folder.relative_to(ROOT / 'evidence/packages')),
              'html': file_record(ROOT / 'evidence/packages', output, 'export', 'self-contained recorded view'),
              'package': file_record(ROOT / 'evidence/packages', package, 'export', 'verified evidence archive')}
    state['exports'].append(record)
    atomic(session_path(name) / 'session.json', state)
    return str(output)
