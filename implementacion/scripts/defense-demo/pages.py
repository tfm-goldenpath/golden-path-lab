#!/usr/bin/env python3
"""Verify historical demo bytes, stage a public subset, and consume a pinned transport.

No laboratory operations, downloaded code execution, publication or signing.
"""
import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import urllib.request

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
LOCK = REPO / 'implementacion/demo/pages-source.lock.json'
ANCHORS = {
    'evidence.tar.gz': 'd9b6738e275db0f45f78bd28148477701100983ef8a4dd464fa7d2af75fa4178',
    'freeze.json': '81b9ba8d56c007d498c375371dae4db20046f3b1e6908b243dd3c0503e46802d',
    'recorded.html': '0b9722d6700c4efb898e39302cb8d65e1a8d2c054095635d18f586f1140c2f1d',
    'video.mp4': '664047c847ece87276903ae6ad00d45397cb05c8bed1929e4662166405c6b825',
    'original.webm': 'b7840e65fbf8cbfac1dac4384bcd050e7b96a74d5651e53665875197a77f8d72',
}
SESSION = 'freeze-20261018t205939z'
SOURCE = '38e7228f7bd8d4bf7c3415fe856653a62dfa8e91'
RENDERER_CONTENT = 'fd5af28bc8f91d3f23be5c644fa2717fbe29c9c531858508d5e878d849c34aaf'
SELECTION = {'session': SESSION, 'attempts': 'all recorded session attempts', 'observations': ['37353632299-fa7f7e2ecb58']}
MAX_FILES = 12000
MAX_BYTES = 512 * 1024**2
MAX_FILE = 64 * 1024**2
BACKUPS = ('recorded.html', 'video.mp4', 'original.webm')
SECRET = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b|[?&](?:X-Amz-Signature|X-Goog-Signature|sig)=[A-Za-z0-9%+/]{20,}', re.I)


def sha(stream):
    h = hashlib.sha256()
    for block in iter(lambda: stream.read(1024 * 1024), b''):
        h.update(block)
    return h.hexdigest()


def checksum(path):
    with path.open('rb') as stream:
        return sha(stream)


def read_json(path):
    if path.stat().st_size > MAX_FILE:
        raise ValueError('Oversized JSON')
    return json.loads(path.read_text())


def write_json(path, value):
    with path.open('x') as stream:
        json.dump(value, stream, indent=2, sort_keys=True)
        stream.write('\n')


def safe_name(name):
    p = PurePosixPath(name)
    if not name or p.is_absolute() or '..' in p.parts or p.as_posix() != name or '\\' in name or ':' in name or any(ord(c) < 32 for c in name):
        raise ValueError('Unsafe path: ' + repr(name))
    return name


def inventory(root):
    root = root.absolute()
    if root.resolve() != root or not root.is_dir():
        raise ValueError('Unsafe root')
    result = {}
    total = 0
    for path in sorted(root.rglob('*')):
        if path.is_symlink() or (not path.is_file() and not path.is_dir()):
            raise ValueError('Link/special entry: ' + str(path))
        if path.is_dir():
            continue
        name = safe_name(path.relative_to(root).as_posix())
        size = path.stat().st_size
        total += size
        if size > MAX_FILE or total > MAX_BYTES or len(result) >= MAX_FILES:
            raise ValueError('Inventory limits exceeded')
        result[name] = {'size': size, 'sha256': checksum(path)}
    return result


def reserve(parent, growth=MAX_BYTES):
    fs = os.statvfs(parent)
    if fs.f_bavail * fs.f_frsize < 3 * 1024**3 + growth or fs.f_favail < 10000 + MAX_FILES:
        raise ValueError('RESOURCE_EXHAUSTED: preserve 3 GiB and inode reserve plus estimated growth')


def archive_records(path, destination=None):
    """Stream regular members only; reject ambiguity before using any member."""
    records = {}
    total = 0
    captured = None
    with tarfile.open(path, mode='r|gz') as archive:
        for member in archive:
            name = safe_name(member.name)
            if not member.isfile() or member.issparse() or name in records:
                raise ValueError('Unsafe/duplicate archive member: ' + name)
            total += member.size
            if member.size < 0 or member.size > MAX_FILE or total > MAX_BYTES or len(records) >= MAX_FILES:
                raise ValueError('Archive limits exceeded')
            stream = archive.extractfile(member)
            h = hashlib.sha256()
            data = bytearray() if name == 'manifest.json' else None
            output = None
            if destination:
                target = destination / name
                target.parent.mkdir(parents=True, exist_ok=True)
                output = target.open('xb')
            try:
                count = 0
                while block := stream.read(1024 * 1024):
                    count += len(block)
                    h.update(block)
                    if data is not None:
                        data.extend(block)
                    if output:
                        output.write(block)
                if count != member.size:
                    raise ValueError('Truncated member')
            finally:
                if output:
                    output.close()
            records[name] = {'size': member.size, 'sha256': h.hexdigest()}
            if data is not None:
                captured = bytes(data)
    return records, captured


def static_verify(root):
    spec = importlib.util.spec_from_file_location('trusted_static', HERE / 'verify-static.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.verify(root)


def verify_archive_portable(archive, portable):
    records, raw = archive_records(archive)
    if raw is None:
        raise ValueError('Missing archive manifest')
    manifest = json.loads(raw)
    expected = {}
    for record in manifest['files']:
        name = safe_name(record['path'])
        if name in expected:
            raise ValueError('Duplicate manifest record')
        expected[name] = {'size': record['size'], 'sha256': record['sha256']}
    if records != {**expected, 'manifest.json': {'size': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}}:
        raise ValueError('Archive does not match exact manifest inventory')
    wanted = {name.removeprefix('portable/'): r for name, r in expected.items() if name.startswith('portable/')}
    if not wanted or wanted != inventory(portable):
        raise ValueError('Portable differs from authenticated archive (including SHA256SUMS)')
    return manifest, raw


def verify_frozen(root):
    root = root.absolute()
    inventory(root)  # Reject links, specials and oversized inputs before reads.
    for name, expected in ANCHORS.items():
        if checksum(root / name) != expected:
            raise ValueError('Historical anchor mismatch: ' + name)
    static_verify(root)
    static_verify(root / 'portable')
    manifest, raw = verify_archive_portable(root / 'evidence.tar.gz', root / 'portable')
    if raw != (root / 'manifest.json').read_bytes():
        raise ValueError('External manifest differs from authenticated archive')
    frozen = read_json(root / 'freeze.json')
    portable = read_json(root / 'portable/inventory.json')
    for key, mk in [('evidenceSource', 'source'), ('renderer', 'renderer'), ('rendererSource', 'rendererSource'), ('selection', 'selection')]:
        if frozen[key] != manifest[mk]:
            raise ValueError('Freeze/export identity mismatch: ' + key)
    if frozen['session'] != SESSION or frozen['evidenceSource']['commit'] != SOURCE or frozen['selection'] != SELECTION or frozen['rendererSource']['contentHash'] != RENDERER_CONTENT:
        raise ValueError('Unexpected historical session/source/selection/renderer')
    if portable['selection'] != SELECTION or portable['source'] != frozen['evidenceSource'] or portable['renderer'] != frozen['renderer']:
        raise ValueError('Portable association mismatch')
    validate_portable(root / 'portable')
    return frozen


def validate_portable(root):
    static_verify(root)
    inv = read_json(root / 'inventory.json')
    if inv['selection'] != SELECTION or inv['source']['commit'] != SOURCE or inv['missingEssential']:
        raise ValueError('Missing essential evidence or wrong session/source')
    page = (root / 'index.html').read_text()
    value = json.loads(page.split('window.SAVED_SESSION=', 1)[1].split(';</script>', 1)[0])
    if not value.get('portable') or not value.get('recorded') or value.get('actionsEnabled') or value.get('activeProcessObserved') or value.get('provisionalLog') or value['session'].get('active'):
        raise ValueError('Executable/live snapshot is not publishable')
    if value['exportSelection'] != SELECTION or value['session']['source'] != inv['source'] or value['renderer'] != inv['renderer']:
        raise ValueError('Snapshot context differs')
    if value['exportCompleteness']['status'] != 'COMPLETE_REFERENCES':
        raise ValueError('Incomplete references')
    if re.search(r'<(?:script|link)[^>]+(?:src|href)=["\'](?:https?:|/)', page, re.I):
        raise ValueError('External/absolute renderer dependency')
    for key, record in inv['artifacts'].items():
        relative = safe_name(record['portablePath'])
        path = root / relative
        if not path.is_file() or path.stat().st_size != record['size'] or checksum(path) != record['sha256']:
            raise ValueError('Missing/altered original: ' + key)
        embedded = value['offlineArtifacts'][key]
        if any(embedded.get(k) != v for k, v in record.items()):
            raise ValueError('Embedded original identity mismatch')
        if record.get('essential') and record['size'] <= 65536:
            if record['status'] != 'FULL' or (record['size'] > 0 and not embedded['text']) or hashlib.sha256(embedded['text'].encode()).hexdigest() != record['sha256']:
                raise ValueError('Essential original is not fully embedded')
    return value


def scan_public(root):
    records = inventory(root)
    for name in records:
        if name.endswith(('.mp4', '.webm')):
            continue
        content = (root / name).read_bytes()
        if SECRET.search(content):
            raise ValueError('Possible credential/private key/signed URL in ' + name)
    return records


def stage(root, output, lock_path):
    frozen = verify_frozen(root)
    if output.exists() or lock_path.exists() or output.parent.resolve() != output.parent.absolute():
        raise ValueError('New canonical output and lock required')
    reserve(output.parent, 256 * 1024**2)
    output.mkdir()
    shutil.copytree(root / 'portable', output / 'demo')
    for name in BACKUPS:
        shutil.copyfile(root / name, output / name)
        if checksum(output / name) != ANCHORS[name]:
            raise ValueError('Backup copy changed')
    (output / 'index.html').write_text('''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Golden Path · Defensa registrada</title>
<style>body{font:18px system-ui;max-width:65ch;margin:4rem auto;padding:1rem;line-height:1.6}a{color:#075985}li{margin:1rem 0}</style>
<h1>Golden Path · Evidencias registradas</h1><p>Sesión freeze-20261018t205939z. Ejecución histórica 38e7228; renderizador e54eb91 (capturado antes del commit). Publicar no ejecuta el laboratorio.</p>
<ul><li><a href="demo/#demo?focus=defense">Abrir demostración</a></li><li><a download href="recorded.html">Descargar HTML autocontenido</a> · logs pequeños completos; originales grandes en la demo portable. El paquete privado evidence.tar.gz no se publica: su enlace dentro del HTML descargado requiere la copia local del paquete.</li><li><a href="video.mp4">Vídeo H.264 · 159,92 s</a> · <a href="original.webm">WebM original</a></li><li><a href="publication-manifest.json">Identidad e inventario de publicación</a></li></ul>
<p>Vídeo continuo sin voz de navegación grabada. Ensayo humano narrado pendiente. Recuperación F13 con el mismo digest: DEMO_VALID_ACCEPT, no L01 completo. L01 histórico tiene su contexto y digest propios. Vía A no es OIDC B; integridad no es reverificación de firmas.</p></html>\n''')
    files = scan_public(output)
    tools_commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip()
    tool_hashes = {p.name: checksum(p) for p in (HERE / 'pages.py', HERE / 'verify-static.py')}
    manifest = {'schema': 'demo-publication/v1', 'session': SESSION, 'anchors': ANCHORS, 'selection': SELECTION,
                'evidenceSource': frozen['evidenceSource'], 'renderer': frozen['renderer'], 'rendererSource': frozen['rendererSource'],
                'publicationToolsCommit': tools_commit, 'publicationToolHashes': tool_hashes,
                'createdUTC': datetime.now(timezone.utc).isoformat(), 'files': files,
                'excluded': ['evidence.tar.gz', 'freeze.json', 'validation.json', 'recording.json', 'private material, databases, other sessions'],
                'validation': 'Historical anchors, exact authenticated archive/portable comparison, selected originals and credential scan PASS; see versioned browser validation',
                'scope': 'Recorded evidence only; historical verification is not new cryptography; human narration pending'}
    write_json(output / 'publication-manifest.json', manifest)
    transport = output.parent / (output.name + '.tar.gz')
    with transport.open('xb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as compressed, tarfile.open(fileobj=compressed, mode='w') as archive:
        for path in sorted(output.rglob('*')):
            if path.is_file():
                info = archive.gettarinfo(path, arcname=path.relative_to(output).as_posix())
                info.uid = info.gid = 0
                info.uname = info.gname = ''
                info.mtime = 0
                info.mode = 0o644
                with path.open('rb') as stream:
                    archive.addfile(info, stream)
    lock = {'schema': 'demo-pages-lock/v1', 'repository': 'tfm-goldenpath/golden-path-lab',
            'tag': 'demo-site-freeze-20261018-v1', 'asset': transport.name, 'sha256': checksum(transport),
            'size': transport.stat().st_size, 'session': SESSION, 'anchors': ANCHORS, 'selection': SELECTION,
            'manifestSha256': checksum(output / 'publication-manifest.json'), 'siteFiles': len(files) + 1,
            'siteBytes': sum(r['size'] for r in files.values()) + (output / 'publication-manifest.json').stat().st_size}
    write_json(lock_path, lock)
    verify_site(output, lock)
    return {'status': 'VERIFIED', 'transport': str(transport), 'lock': lock, 'origin': str(root.absolute())}


def read_lock(path):
    lock = read_json(path)
    if lock['schema'] != 'demo-pages-lock/v1' or lock['repository'] != 'tfm-goldenpath/golden-path-lab' or lock['session'] != SESSION or lock['anchors'] != ANCHORS or lock['selection'] != SELECTION:
        raise ValueError('Unapproved publication context')
    if not re.fullmatch(r'demo-site-[a-z0-9-]+', lock['tag']) or not re.fullmatch(r'[a-z0-9.-]+\.tar\.gz', lock['asset']):
        raise ValueError('Unsafe transport identity')
    return lock


def verify_site(root, lock):
    if checksum(root / 'publication-manifest.json') != lock['manifestSha256']:
        raise ValueError('Publication manifest differs from reviewed lock')
    manifest = read_json(root / 'publication-manifest.json')
    actual = scan_public(root)
    meta = actual.pop('publication-manifest.json')
    if actual != manifest['files'] or len(actual) + 1 != lock['siteFiles'] or sum(r['size'] for r in actual.values()) + meta['size'] != lock['siteBytes']:
        raise ValueError('Exact site inventory mismatch')
    if manifest['session'] != SESSION or manifest['anchors'] != ANCHORS or manifest['selection'] != SELECTION:
        raise ValueError('Site context mismatch')
    for name in BACKUPS:
        if actual[name]['sha256'] != ANCHORS[name]:
            raise ValueError('Historical backup changed')
    validate_portable(root / 'demo')
    return {'status': 'VERIFIED', 'files': len(actual) + 1, 'bytes': lock['siteBytes'], 'session': SESSION}


def unpack(transport, output, lock):
    if transport.stat().st_size != lock['size'] or checksum(transport) != lock['sha256']:
        raise ValueError('Transport integrity failure before extraction')
    if output.exists() or output.parent.absolute().resolve() != output.parent.absolute():
        raise ValueError('New canonical extraction directory required')
    reserve(output.parent)
    # Complete validation pass before writing any member; never execute archive code.
    archive_records(transport)
    output.mkdir()
    archive_records(transport, output)
    return verify_site(output, lock)


def fetch(output, lock):
    if output.exists():
        raise ValueError('New download directory required')
    reserve(output.parent)
    release = json.loads(subprocess.check_output(['gh', 'api', 'repos/' + lock['repository'] + '/releases/tags/' + lock['tag']], text=True, timeout=60))
    matches = [a for a in release['assets'] if a['name'] == lock['asset']]
    if len(matches) != 1 or matches[0]['size'] != lock['size'] or matches[0]['state'] != 'uploaded':
        raise ValueError('Missing, ambiguous or unexpected-size release asset')
    output.mkdir()
    subprocess.run(['gh', 'release', 'download', lock['tag'], '--repo', lock['repository'], '--pattern', lock['asset'], '--dir', str(output)], check=True, timeout=120)
    path = output / lock['asset']
    if path.stat().st_size != lock['size'] or checksum(path) != lock['sha256']:
        raise ValueError('Downloaded transport hash differs')
    return {'status': 'VERIFIED', 'transport': str(path), 'releaseId': release['id'], 'assetId': matches[0]['id']}


def verify_public(output, lock):
    """Post-deployment acceptance of the fixed repository site; no credentials."""
    if output.exists():
        raise ValueError('New public acceptance directory required')
    reserve(output.parent)
    output.mkdir()
    base = 'https://tfm-goldenpath.github.io/golden-path-lab/'

    def download(name, expected_hash, expected_size=None):
        name = safe_name(name)
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        size = 0
        with urllib.request.urlopen(base + name, timeout=30) as response, target.open('xb') as stream:
            if not response.url.startswith(base):
                raise ValueError('Unexpected public redirect')
            while block := response.read(256 * 1024):
                size += len(block)
                if size > (expected_size if expected_size is not None else MAX_FILE):
                    raise ValueError('Oversized public file')
                stream.write(block)
        if (expected_size is not None and size != expected_size) or checksum(target) != expected_hash:
            raise ValueError('Public file integrity failure: ' + name)

    download('publication-manifest.json', lock['manifestSha256'])
    manifest = read_json(output / 'publication-manifest.json')
    for name, record in manifest['files'].items():
        download(name, record['sha256'], record['size'])
    return {**verify_site(output, lock), 'url': base + 'demo/', 'boundary': 'Public selected file bytes; browser interaction still requires acceptance'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lock', type=Path, default=LOCK)
    subs = parser.add_subparsers(dest='command', required=True)
    p = subs.add_parser('verify-frozen'); p.add_argument('directory', type=Path)
    p = subs.add_parser('stage'); p.add_argument('directory', type=Path); p.add_argument('output', type=Path)
    p = subs.add_parser('fetch'); p.add_argument('output', type=Path)
    p = subs.add_parser('verify-public'); p.add_argument('output', type=Path)
    p = subs.add_parser('unpack'); p.add_argument('transport', type=Path); p.add_argument('output', type=Path)
    p = subs.add_parser('verify-site'); p.add_argument('directory', type=Path)
    args = parser.parse_args()
    if args.command == 'stage':
        result = stage(args.directory, args.output, args.lock)
    elif args.command == 'verify-frozen':
        frozen = verify_frozen(args.directory)
        result = {'status': 'VERIFIED', 'session': frozen['session'], 'anchors': ANCHORS, 'source': frozen['evidenceSource'], 'origin': str(args.directory.absolute())}
    else:
        lock = read_lock(args.lock)
        if args.command == 'verify-public': result = verify_public(args.output, lock)
        elif args.command == 'fetch': result = fetch(args.output, lock)
        elif args.command == 'unpack': result = unpack(args.transport, args.output, lock)
        else: result = verify_site(args.directory, lock)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, tarfile.TarError, subprocess.CalledProcessError) as error:
        raise SystemExit('ERROR: ' + str(error))
