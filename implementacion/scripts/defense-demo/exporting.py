"""Offline view and verified, allowlisted archives; no result reinterpretation."""
import io
import json
from pathlib import Path
import subprocess
import tarfile

from core import (ROOT, WEB, artifact_index, atomic, digest, evidence_root, file_record,
                  packager, read_artifact, read_json, session_path, utc)


def verify_tar(path):
    with tarfile.open(path) as archive:
        members = archive.getmembers()
        if any(not m.isfile() or m.name.startswith('/') or '..' in Path(m.name).parts for m in members):
            raise ValueError('Unsafe package member')
        sums = next(m for m in members if m.name.endswith('/SHA256SUMS.txt'))
        prefix = sums.name.rsplit('/', 1)[0]
        for line in archive.extractfile(sums).read().decode().splitlines():
            checksum, name = line.split('  ', 1)
            if digest(archive.extractfile(prefix + '/' + name).read()) != checksum:
                raise ValueError('Laboratory archive integrity failure')


def export_session(state):
    from coordinator import lab_path, resources
    from server import snapshot
    name = state['session']
    raw = evidence_root(name)
    observation = resources(state['reserveGiB'])
    checks = raw / 'export-checks'
    checks.mkdir(exist_ok=True)
    number = len(list(checks.glob('*.json'))) + 1
    atomic(checks / f'{number:04}.json', observation)
    with (checks / f'{number:04}.log').open('x') as stream:
        for command in (['df', '-h', str(ROOT)], ['df', '-i', str(ROOT)], ['docker', 'system', 'df']):
            subprocess.run(command, stdout=stream, stderr=subprocess.STDOUT, check=True)
    if not observation['sufficient']: raise RuntimeError('Insufficient evidence reserve; export stopped, no resources removed')
    directory = ROOT / 'evidence/packages' / ('defense-' + name) / f'export-{number:04}'
    directory.mkdir(parents=True, exist_ok=False)
    lab = lab_path(name)
    lab_package = None
    if lab is not None:
        atomic(lab / 'defense-demo.json', {'scope': 'Directed presentation; not complete L01 or a campaign',
                                          'session': name, 'status': state['operational'], 'humanReview': 'not-requested'})
        packager.package(lab, directory, state['operational'])
        lab_package = directory / (lab.name + '.tar.gz')
        verify_tar(lab_package)
    value = snapshot(name)
    value['recorded'] = True
    value['savedUTC'] = utc()
    value['renderer'] = {file: digest((WEB / file).read_bytes()) for file in ('index.html', 'style.css', 'app.js')}
    value['provisionalLog'] = None
    artifacts = artifact_index(name)
    content = {key: read_artifact(raw, record) for key, record in artifacts.items()}
    excerpts = {key: {'text': data[:12000].decode('utf-8', errors='replace'), 'truncated': len(data) > 12000}
                for key, data in content.items()}
    value['offlineArtifacts'] = excerpts
    value['packageName'] = 'evidence.tar.gz'
    # JSON cannot terminate a script tag even if a captured diagnostic contains HTML.
    data = json.dumps(value, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    html = (WEB / 'index.html').read_text().replace('<link rel="stylesheet" href="/style.css">', '<style>' + (WEB / 'style.css').read_text() + '</style>')
    html = html.replace('<script src="/app.js" defer></script>', '<script>window.SAVED_SESSION=' + data + ';</script><script>' + (WEB / 'app.js').read_text() + '</script>')
    output = directory / 'recorded.html'
    output.write_text(html)
    manifest = {'schema': 'defense-export/v1', 'session': name, 'savedUTC': utc(),
                'source': state['source'], 'result': state.get('demoResult'), 'humanReview': 'not-requested',
                'artifacts': list(artifacts.values()), 'renderer': value['renderer'], 'files': []}
    files = {'session.json': json.dumps(state, ensure_ascii=False, indent=2).encode(),
             'events.json': json.dumps(value['events'], ensure_ascii=False, indent=2).encode(),
             'catalogue.json': (raw / 'catalogue.json').read_bytes(), 'source.json': (raw / 'source.json').read_bytes(),
             'workflows.json': (raw / 'workflows.json').read_bytes(), 'recorded.html': output.read_bytes()}
    files.update({'artifacts/' + key + '/' + Path(artifacts[key]['path']).name: data for key, data in content.items()})
    if lab_package: files['laboratory/' + lab_package.name] = lab_package.read_bytes()
    for path, data_bytes in files.items():
        manifest['files'].append({'path': path, 'size': len(data_bytes), 'sha256': digest(data_bytes)})
    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode()
    package = directory / 'evidence.tar.gz'
    with tarfile.open(package, 'w:gz') as archive:
        for path, data_bytes in {**files, 'manifest.json': manifest_bytes}.items():
            info = tarfile.TarInfo(path); info.size = len(data_bytes); info.mode = 0o644
            archive.addfile(info, io.BytesIO(data_bytes))
    with tarfile.open(package) as archive:
        for record in manifest['files']:
            data_bytes = archive.extractfile(record['path']).read()
            if len(data_bytes) != record['size'] or digest(data_bytes) != record['sha256']: raise ValueError('Export verification failed')
    (directory / 'manifest.json').write_bytes(manifest_bytes)
    (directory / 'SHA256SUMS.txt').write_text(f'{digest(package.read_bytes())}  evidence.tar.gz\n{digest(output.read_bytes())}  recorded.html\n')
    record = {'number': number, 'timeUTC': utc(), 'verified': True,
              'html': file_record(ROOT / 'evidence/packages', output, 'export', 'self-contained recorded view'),
              'package': file_record(ROOT / 'evidence/packages', package, 'export', 'verified evidence archive')}
    state['exports'].append(record)
    atomic(session_path(name) / 'session.json', state)
    return str(output)
