#!/usr/bin/env python3
"""Prepare/verify a selected custody release. Never publish, execute recovered code or run a lab."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import tarfile
import tempfile
import zipfile

REPO = Path(__file__).resolve().parents[2]
REPOSITORY = 'tfm-goldenpath/golden-path-lab'
SPEC = REPO / 'implementacion/releases/lab-freeze.inputs.json'
RESERVE = 3 * 1024**3
MAX_MEMBER = 2 * 1024**3
MAX_EXPANDED = 8 * 1024**3
MAX_MEMBERS = 100000
MAX_METADATA = 16 * 1024**2
SECRET = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b')


def now():
    return datetime.now(timezone.utc).isoformat()


def checksum(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_json(path, value):
    with path.open('x') as stream:
        json.dump(value, stream, indent=2, sort_keys=True)
        stream.write('\n')


def safe_name(name):
    p = PurePosixPath(name)
    if not name or len(name) > 4096 or name == '.' or p.is_absolute() or '..' in p.parts or p.as_posix() != name or '\\' in name or ':' in name or any(ord(c) < 32 for c in name):
        raise ValueError('Unsafe path: ' + repr(name))
    return name


def reserve(parent, growth, files):
    fs = os.statvfs(parent)
    if fs.f_bavail * fs.f_frsize < RESERVE + growth or fs.f_favail < 10000 + files:
        raise ValueError(f'RESOURCE_EXHAUSTED: need {growth} bytes/{files} inodes plus 3 GiB/10000 inode reserve at {parent}')


def new_directory(output, growth, files):
    output = output.absolute()
    if output.parent.resolve() != output.parent:
        raise ValueError('New canonical output parent required')
    if output.exists() or output.is_symlink():
        raise ValueError('New output destination required: ' + str(output))
    reserve(output.parent, growth, files)
    output.mkdir()


def read_spec(path=SPEC):
    value = json.loads(path.read_text())
    if value['schema'] != 'lab-release-inputs/v1' or value['repository'] != REPOSITORY:
        raise ValueError('Unexpected release specification')
    seen = set()
    for a in value['assets']:
        safe_name(a['name'])
        if '/' in a['name'] or a['name'] in seen or not re.fullmatch('[0-9a-f]{64}', a['sha256']) or type(a['size']) is not int or a['size'] <= 0:
            raise ValueError('Invalid/duplicate selected asset')
        seen.add(a['name'])
        if a['format'] not in ('file','pages','tar.gz','zip') or type(a['required']) is not bool:
            raise ValueError('Invalid selected asset format/requirement')
    for snapshot in value.get('sourceSnapshots', []):
        if snapshot['name'] in seen or not re.fullmatch(r'lab-source-[a-z-]+\.tar\.gz', snapshot['name']) or not re.fullmatch('[0-9a-f]{40}', snapshot['commit']):
            raise ValueError('Invalid/duplicate historical source selection')
        seen.add(snapshot['name'])
    return value


def archive_inventory(path, kind, captures=()):
    """Hash bounded members without extraction; reject ambiguous trees and ZIP CRC errors.

    Nested archives are retained opaque members, authenticated by the containing
    inventory. No database expansion, re-analysis or signature verification here.
    """
    files, directories, captured = {}, set(), {}
    total = 0
    archive = zipfile.ZipFile(path) if kind == 'zip' else tarfile.open(path, 'r|gz')
    try:
        members = archive.infolist() if kind == 'zip' else archive
        for entry in members:
            name = entry.filename if kind == 'zip' else entry.name
            directory = entry.is_dir() if kind == 'zip' else entry.isdir()
            name = safe_name(name[:-1] if directory and name.endswith('/') else name)
            mode = (entry.external_attr >> 16) if kind == 'zip' else entry.mode
            regular = stat.S_IFMT(mode) in (0, stat.S_IFREG, stat.S_IFDIR) if kind == 'zip' else (entry.isfile() or entry.isdir()) and not entry.issparse()
            if not regular or name in files or name in directories:
                raise ValueError('Unsafe/duplicate archive member: ' + name)
            ancestors = PurePosixPath(name).parents
            if any(str(p) in files for p in ancestors) or (not directory and any(p.startswith(name+'/') for p in (*files, *directories))):
                raise ValueError('Colliding archive member: ' + name)
            size = entry.file_size if kind == 'zip' else entry.size
            total += size
            if size < 0 or size > MAX_MEMBER or total > MAX_EXPANDED or len(files)+len(directories) >= MAX_MEMBERS:
                raise ValueError('Archive limit exceeded')
            if directory:
                if size: raise ValueError('Nonempty directory member')
                directories.add(name)
                continue
            stream = archive.open(entry) if kind == 'zip' else archive.extractfile(entry)
            h, count, tail = hashlib.sha256(), 0, b''
            data = bytearray() if name in captures else None
            # Archives and videos are opaque; their outer hashes are still checked.
            scan = not name.endswith(('.zip', '.tar.gz', '.tgz', '.mp4', '.webm', '.db'))
            with stream:
                while block := stream.read(1024*1024):
                    count += len(block)
                    if count > size: raise ValueError('Oversized member')
                    h.update(block)
                    if scan and SECRET.search(tail+block):
                        raise ValueError('Possible credential in member: ' + name)
                    tail = block[-256:]
                    if data is not None:
                        if count > MAX_METADATA: raise ValueError('Metadata limit exceeded')
                        data.extend(block)
            if count != size: raise ValueError('Truncated archive member')
            files[name] = {'size': size, 'sha256': h.hexdigest()}
            if data is not None: captured[name] = bytes(data)
    finally:
        archive.close()
    return files, captured


def check_inventory(files, data, name):
    if name not in data: raise ValueError('Missing internal inventory: '+name)
    parent = str(PurePosixPath(name).parent)
    prefix = '' if parent == '.' else parent+'/'
    expected = {}
    for line in data[name].decode().splitlines():
        h, relative = line.split('  ', 1)
        full = prefix + safe_name(relative)
        if not re.fullmatch('[0-9a-f]{64}', h) or full in expected or full == name:
            raise ValueError('Invalid checksum inventory: ' + name)
        expected[full] = h
    actual = {n: v['sha256'] for n,v in files.items() if n != name}
    if actual != expected:
        raise ValueError('Exact internal inventory mismatch: '+name)


def pages_module():
    spec = importlib.util.spec_from_file_location('release_pages', REPO / 'implementacion/scripts/defense-demo/pages.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verify_asset(path, asset):
    if path.absolute().resolve() != path.absolute() or not path.is_file():
        raise ValueError('Missing required or unsafe asset: '+asset['name'])
    if path.stat().st_size != asset['size'] or checksum(path) != asset['sha256']:
        raise ValueError('Outer integrity mismatch: '+asset['name'])
    result = {'status': 'VERIFIED', 'name': asset['name'], 'size': asset['size'], 'sha256': asset['sha256']}
    kind = asset.get('format')
    if kind in ('tar.gz', 'zip'):
        captures = set(asset.get('assertions', {})) | {asset['checksums']}
        files, data = archive_inventory(path, kind, captures)
        check_inventory(files, data, asset['checksums'])
        for name, fields in asset.get('assertions', {}).items():
            value = json.loads(data[name])
            for key, expected in fields.items():
                if value.get(key) != expected:
                    raise ValueError('Historical association mismatch: '+name+' / '+key)
        result.update(members=len(files), expandedBytes=sum(v['size'] for v in files.values()),
                      internalInventory=asset['checksums'], nestedBoundary='Nested original archives authenticated as opaque members; no new signature/DB validation')
    elif kind == 'pages':
        pages = pages_module()
        # Use the existing safe extractor only in a fresh, capacity-checked task directory.
        reserve(path.parent, pages.MAX_BYTES, pages.MAX_FILES)
        with tempfile.TemporaryDirectory(prefix='lab-release-site-', dir=path.parent) as temp:
            result['site'] = pages.unpack(path, Path(temp)/'site', pages.read_lock(pages.LOCK))
    else:
        if path.stat().st_size > MAX_METADATA: raise ValueError('Metadata limit exceeded')
        if SECRET.search(path.read_bytes()): raise ValueError('Possible credential: '+path.name)
    return result


def inventory(lock, inputs):
    if inputs.absolute().resolve() != inputs.absolute() or not inputs.is_dir():
        raise ValueError('Canonical inputs directory required')
    wanted = {a['name'] for a in lock['assets']}
    extras = {p.name for p in inputs.iterdir()} - wanted
    if extras: raise ValueError('Unexpected input files: '+', '.join(sorted(extras)))
    results = []
    for a in lock['assets']:
        if not (inputs/a['name']).exists() and not a['required']:
            results.append({'name': a['name'], 'status': 'OPTIONAL_ABSENT'})
        else:
            results.append(verify_asset(inputs/a['name'], a))
    return results


def git(*args):
    return subprocess.check_output(['git', *args], cwd=REPO)


def source_identity(source):
    if not re.fullmatch('[0-9a-f]{40}', source) or git('rev-parse', source+'^{commit}').decode().strip() != source:
        raise ValueError('Explicit full source commit required')
    head = git('rev-parse', 'HEAD').decode().strip()
    if git('status', '--porcelain', '--untracked-files=no').strip():
        raise ValueError('Tracked source changes: commit before preparing/verifying')
    # Bind the running glue and reused verifiers to the recorded tool revision.
    for relative in ['implementacion/scripts/lab-release.py', 'implementacion/scripts/defense-demo/pages.py', 'implementacion/scripts/defense-demo/verify-static.py', 'implementacion/demo/pages-source.lock.json', str(SPEC.relative_to(REPO))]:
        if git('show', head+':'+relative) != (REPO/relative).read_bytes():
            raise ValueError('Verification-tool source mismatch: '+relative)
    if git('show', source+':'+str(SPEC.relative_to(REPO))) != SPEC.read_bytes():
        raise ValueError('Selected source specification differs')
    return {'commit': source, 'verificationToolCommit': head, 'specificationSha256': checksum(SPEC),
            'trackedTree': 'CLEAN', 'untrackedFiles': 'Excluded from source archive; historical dirty statuses remain separate'}


def frozen_custody(root, lock):
    pages = pages_module()
    value = pages.verify_frozen(root)
    # freeze.json is an independently anchored record of recording/validation bytes.
    for name, key in [('recording.json', 'recording'), ('validation.json', 'validation')]:
        if json.loads((root/name).read_text()) != value[key]:
            raise ValueError('Frozen metadata association mismatch: '+name)
    if checksum(root/'SHA256SUMS') != lock['privateFrozen']['inventorySha256']:
        raise ValueError('Frozen exact inventory differs from reviewed custody anchor')
    records = pages.inventory(root)
    size = sum(a['size'] for a in records.values())
    if len(records) != lock['privateFrozen']['files'] or size != lock['privateFrozen']['bytes']:
        raise ValueError('Frozen count/size differs from reviewed custody inventory')
    return {'status': 'VERIFIED_LOCAL_PRIVATE', 'logicalLocation': lock['privateFrozen']['location'],
            'files':len(records), 'bytes':size,
            'inventorySha256': checksum(root/'SHA256SUMS'), 'anchors': pages.ANCHORS,
            'session': value['session'], 'evidenceSource': value['evidenceSource'],
            'rendererSource': {k:v for k,v in value['rendererSource'].items() if k != 'files'},
            'durableExternalCopy': 'UNRESOLVED; local Codespace verification is not external preservation'}


def source_archive(source, output=None):
    command = ['git', 'archive', '--format=tar.gz', source]
    if output:
        with output.open('xb') as stream:
            subprocess.run(command, cwd=REPO, stdout=stream, check=True)
        return {'size': output.stat().st_size, 'sha256': checksum(output)}
    process = subprocess.Popen(command, cwd=REPO, stdout=subprocess.PIPE)
    h, count = hashlib.sha256(), 0
    with process.stdout as stream:
        while block := stream.read(1024*1024): h.update(block); count += len(block)
    if process.wait(): raise ValueError('Source archive generation failed')
    return {'size': count, 'sha256': h.hexdigest()}


def prepare(lock, inputs, output, frozen, source):
    identity = source_identity(source)
    if identity.get('verificationToolCommit') != source:
        raise ValueError('Prepare from the exact selected checkout')
    results = inventory(lock, inputs)
    custody = frozen_custody(frozen, lock)
    selected = [a for a in lock['assets'] if (inputs/a['name']).exists()]
    new_directory(output, sum(a['size'] for a in selected)+256*1024**2, len(selected)+1000)
    # On error/interruption leave diagnostics and partial copies; no final manifest.
    write_json(output/'preparation.json', {'status': 'INCOMPLETE', 'startedUTC': now(), 'source': identity})
    records = []
    for a in selected:
        dest = output/a['name']
        with (inputs/a['name']).open('rb') as src, dest.open('xb') as dst:
            shutil.copyfileobj(src, dst, 1024*1024)
        if dest.stat().st_size != a['size'] or checksum(dest) != a['sha256'] or checksum(inputs/a['name']) != a['sha256']:
            raise ValueError('Copy/source integrity mismatch: '+a['name'])
        records.append(a)
    source_record = source_archive(source, output/'lab-source.tar.gz')
    records.append({'name': 'lab-source.tar.gz', **source_record, 'role': 'New source transport from explicit commit; no historical execution claim', 'source': source})
    for snapshot in lock.get('sourceSnapshots', []):
        record = source_archive(snapshot['commit'], output/snapshot['name'])
        records.append({'name':snapshot['name'], **record, 'role':snapshot['role'], 'source':snapshot['commit']})
    shutil.copyfile(SPEC, output/'lab-freeze.inputs.json')
    records.append({'name': 'lab-freeze.inputs.json', 'size': SPEC.stat().st_size, 'sha256': checksum(SPEC), 'role': 'Committed input specification'})
    write_json(output/'private-custody.json', custody)
    records.append({'name':'private-custody.json','size':(output/'private-custody.json').stat().st_size,'sha256':checksum(output/'private-custody.json'),'role':'Local verification receipt; private original excluded'})
    manifest = {'schema':'lab-release/v1', 'repository':REPOSITORY, 'createdUTC':now(), 'source':identity,
                'status':'CANDIDATE_VERIFIED_PUBLICATION_PENDING', 'assets':records, 'verification':results,
                'historicalIdentities':lock['historicalIdentities'], 'limitations':lock['limitations'],
                'unresolved':lock['unresolved'], 'scopeExclusions':lock.get('scopeExclusions', []), 'humanReview':'PENDING', 'publication':'NOT_EXECUTED',
                'boundary':'Outer bytes and selected internal inventories; not new cryptography, experiments or human acceptance'}
    # Write manifest last, only after every required check and copy succeeds.
    write_json(output/'release-manifest.json', manifest)
    (output/'RELEASE-SHA256SUMS.txt').write_text(''.join(r['sha256']+'  '+r['name']+'\n' for r in records)+checksum(output/'release-manifest.json')+'  release-manifest.json\n')
    return {'status':manifest['status'], 'manifestSha256':checksum(output/'release-manifest.json'), 'source':identity,
            'uploadNames':[r['name'] for r in records]+['release-manifest.json','RELEASE-SHA256SUMS.txt']}


def verify(lock, directory, source, manifest_hash):
    identity = source_identity(source)
    manifest_path = directory/'release-manifest.json'
    if checksum(manifest_path) != manifest_hash: raise ValueError('Manifest differs from independent reviewed anchor')
    m = json.loads(manifest_path.read_text())
    if m['schema'] != 'lab-release/v1' or m['repository'] != REPOSITORY or m['source']['commit'] != source or m['source']['specificationSha256'] != checksum(SPEC) or m['status'] != 'CANDIDATE_VERIFIED_PUBLICATION_PENDING':
        raise ValueError('Release/source/specification association mismatch')
    names = [a['name'] for a in m['assets']]
    selected = {a['name']:a for a in lock['assets'] if a['required'] or (directory/a['name']).exists()}
    expected = set(selected) | {'lab-source.tar.gz','lab-freeze.inputs.json','private-custody.json'}
    snapshots = {a['name']:a['commit'] for a in lock.get('sourceSnapshots', [])}
    expected.update(snapshots)
    if len(names) != len(set(names)) or set(names) != expected:
        raise ValueError('Unexpected/missing release asset inventory')
    allowed = expected | {'release-manifest.json','RELEASE-SHA256SUMS.txt','preparation.json'}
    if {p.name for p in directory.iterdir()} - allowed:
        raise ValueError('Unexpected release files')
    for a in m['assets']:
        safe_name(a['name'])
        p = directory/a['name']
        if p.resolve() != p.absolute() or not p.is_file() or p.stat().st_size != a['size'] or checksum(p) != a['sha256']:
            raise ValueError('Release asset integrity mismatch: '+a['name'])
        if a['name'] in selected:
            if a != selected[a['name']]: raise ValueError('Asset provenance differs from specification')
            verify_asset(p, selected[a['name']])
    expected_sums = ''.join(a['sha256']+'  '+a['name']+'\n' for a in m['assets'])+manifest_hash+'  release-manifest.json\n'
    if (directory/'RELEASE-SHA256SUMS.txt').read_text() != expected_sums:
        raise ValueError('Release checksum relationships differ')
    if (directory/'lab-freeze.inputs.json').read_bytes() != SPEC.read_bytes(): raise ValueError('Specification bytes differ')
    for name, commit in {'lab-source.tar.gz':source, **snapshots}.items():
        source_record = source_archive(commit)
        attached = next(a for a in m['assets'] if a['name']==name)
        if attached['source'] != commit or any(source_record[k] != attached[k] for k in source_record):
            raise ValueError('Attached source archive does not match selected Git commit: '+name)
    return {'status':'CANDIDATE_BYTES_VERIFIED', 'verifiedUTC':now(), 'source':identity,
            'manifestSha256':manifest_hash, 'assets':len(m['assets'])+2,
            'publication':'NOT_ESTABLISHED_BY_LOCAL_VERIFICATION', 'cryptographicReleaseVerification':'NOT_PERFORMED'}


def api(endpoint):
    return json.loads(subprocess.check_output(['gh', 'api', 'repos/'+REPOSITORY+'/'+endpoint], text=True, timeout=60))


def recover(lock, output):
    selected = [a for a in lock['assets'] if a['required']]
    for a in selected:
        remote = api('releases/assets/'+str(a['assetId']))
        if any(remote[k] != v for k,v in {'name':a['name'], 'size':a['size'], 'state':'uploaded', 'digest':'sha256:'+a['sha256']}.items()):
            raise ValueError('Original release metadata differs: '+a['name'])
        origin = api('releases/tags/'+a['tag'])
        if origin['id'] != a['releaseId'] or not any(x['id']==a['assetId'] for x in origin['assets']):
            raise ValueError('Original release/asset association differs: '+a['name'])
    new_directory(output, sum(a['size'] for a in selected)+512*1024**2, 12000+len(selected))
    results = []
    for a in selected:
        subprocess.run(['gh','release','download',a['tag'],'--repo',REPOSITORY,'--pattern',a['name'],'--dir',str(output)],check=True,timeout=900)
        results.append({**verify_asset(output/a['name'],a), 'retrievedUTC':now(), 'releaseId':a['releaseId'], 'assetId':a['assetId']})
    return {'status':'SELECTED_ORIGINALS_RECOVERED', 'assets':results}


def remote_identity(tag, source, draft):
    if not re.fullmatch(r'lab-v\d{4}\.\d{2}\.\d{2}', tag):
        raise ValueError('Expected lab-vYYYY.MM.DD tag')
    release = api('releases/tags/'+tag)
    if release['tag_name'] != tag or release['draft'] != draft:
        raise ValueError('Unexpected release/tag/draft identity')
    if draft:
        if release['target_commitish'] != source:
            raise ValueError('Draft is not bound to explicit selected source')
    else:
        obj = api('git/ref/tags/'+tag)['object']
        for _ in range(5):
            if obj['type'] != 'tag': break
            obj = api('git/tags/'+obj['sha'])['object']
        if obj['type'] != 'commit' or obj['sha'] != source:
            raise ValueError('Published tag target differs from selected source')
    return release


def download_verify(lock, output, source, tag, manifest_hash, draft=False):
    """Read-only fresh remote download, exact inventory, tag and attestation checks."""
    source_identity(source)
    release = remote_identity(tag, source, draft)
    assets = {a['name']:a for a in release['assets']}
    if len(assets) != len(release['assets']) or 'release-manifest.json' not in assets:
        raise ValueError('Missing/duplicate remote assets')
    if any(a['state'] != 'uploaded' or a['size'] <= 0 or a['size'] > MAX_MEMBER for a in assets.values()) or len(assets) > 100:
        raise ValueError('Remote asset size/state limit')
    new_directory(output, sum(a['size'] for a in assets.values())+512*1024**2, 12000+len(assets))

    def download(name, expected_hash, size=None):
        safe_name(name)
        if '/' in name or name not in assets: raise ValueError('Unexpected remote asset name')
        a = assets[name]
        if size is not None and a['size'] != size: raise ValueError('Remote asset size differs: '+name)
        if a.get('digest') and a['digest'] != 'sha256:'+expected_hash:
            raise ValueError('Remote API digest differs: '+name)
        subprocess.run(['gh', 'release', 'download', tag, '--repo', REPOSITORY, '--pattern', name, '--dir', str(output)], check=True, timeout=900)
        p = output/name
        if p.stat().st_size != a['size'] or checksum(p) != expected_hash:
            raise ValueError('Downloaded integrity mismatch: '+name)

    if assets['release-manifest.json']['size'] > MAX_METADATA: raise ValueError('Oversized remote manifest')
    download('release-manifest.json', manifest_hash)
    manifest = json.loads((output/'release-manifest.json').read_text())
    records = manifest['assets']
    names = [a['name'] for a in records]+['release-manifest.json','RELEASE-SHA256SUMS.txt']
    if len(set(names)) != len(names) or set(assets) != set(names):
        raise ValueError('Unexpected/missing remote release inventory')
    sums = ''.join(a['sha256']+'  '+a['name']+'\n' for a in records)+manifest_hash+'  release-manifest.json\n'
    for a in records: download(a['name'], a['sha256'], a['size'])
    download('RELEASE-SHA256SUMS.txt', hashlib.sha256(sums.encode()).hexdigest(), len(sums.encode()))
    result = verify(lock, output, source, manifest_hash)
    cryptography = 'UNAVAILABLE: release immutable=false; no immutable-release attestation claimed'
    if release.get('immutable') and not draft:
        subprocess.run(['gh','release','verify',tag,'--repo',REPOSITORY],check=True,timeout=120)
        for name in names:
            subprocess.run(['gh','release','verify-asset',tag,str(output/name),'--repo',REPOSITORY],check=True,timeout=120)
        cryptography = 'PASS: gh release verify and every explicit attached asset verify-asset'
    # A concurrent mutation or changed tag also invalidates the receipt.
    after = remote_identity(tag, source, draft)
    def stable_assets(value):
        return sorted(({k:a.get(k) for k in ('id','name','size','digest','state','updated_at')} for a in value['assets']), key=lambda a:a['name'])
    if after['id'] != release['id'] or stable_assets(after) != stable_assets(release) or after.get('immutable') != release.get('immutable'):
        raise ValueError('Remote release changed during verification')
    return {**result, 'status':'DRAFT_BYTES_VERIFIED' if draft else 'PUBLISHED_BYTES_VERIFIED',
            'tag':tag, 'releaseId':release['id'], 'assetIds':{n:a['id'] for n,a in assets.items()},
            'immutable':release.get('immutable'), 'cryptographicReleaseVerification':cryptography,
            'publication':'DRAFT' if draft else 'PUBLISHED', 'refactorReadiness':'BLOCKED_PENDING_CUSTODY_AND_HUMAN_REVIEW',
            'unresolved':lock['unresolved']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('inventory'); p.add_argument('inputs', type=Path)
    p = sub.add_parser('recover'); p.add_argument('directory', type=Path); p.add_argument('--receipt', required=True, type=Path)
    p = sub.add_parser('prepare')
    p.add_argument('inputs', type=Path); p.add_argument('output', type=Path); p.add_argument('--frozen', required=True, type=Path); p.add_argument('--source', required=True)
    p = sub.add_parser('verify')
    p.add_argument('directory', type=Path); p.add_argument('--source', required=True); p.add_argument('--manifest-sha256', required=True); p.add_argument('--receipt', required=True, type=Path)
    p = sub.add_parser('download-verify')
    p.add_argument('directory', type=Path); p.add_argument('--source', required=True); p.add_argument('--tag', required=True); p.add_argument('--manifest-sha256', required=True); p.add_argument('--receipt', required=True, type=Path); p.add_argument('--draft', action='store_true')
    args = parser.parse_args(); lock = read_spec()
    if hasattr(args, 'receipt'):
        if args.receipt.exists() or args.receipt.is_symlink() or args.receipt.parent.resolve() != args.receipt.parent.absolute() or args.receipt.absolute().is_relative_to(args.directory.absolute()):
            raise ValueError('New separate canonical receipt required')
    if args.command == 'inventory': result = {'status':'INPUTS_VERIFIED','assets':inventory(lock,args.inputs)}
    elif args.command == 'recover':
        result = recover(lock,args.directory)
        write_json(args.receipt,result)
    elif args.command == 'prepare': result = prepare(lock,args.inputs,args.output,args.frozen,args.source)
    else:
        if not re.fullmatch('[0-9a-f]{64}', args.manifest_sha256): raise ValueError('Independent SHA-256 anchor required')
        result = download_verify(lock,args.directory,args.source,args.tag,args.manifest_sha256,args.draft) if args.command == 'download-verify' else verify(lock,args.directory,args.source,args.manifest_sha256)
        write_json(args.receipt,result)
    print(json.dumps(result,indent=2))


if __name__ == '__main__':
    try: main()
    except (ValueError, OSError, KeyError, tarfile.TarError, zipfile.BadZipFile, subprocess.SubprocessError) as error:
        raise SystemExit('ERROR: '+str(error))
