"""Safe lane A exports. Never traverse private state or upload .tmp wholesale."""
import hashlib
import io
import json
import shutil
import tarfile
from pathlib import Path


def read(path):
    return json.loads(Path(path).read_text())


def write(path, value):
    path = Path(path)
    if path.is_symlink():
        raise ValueError('Refusing symlinked output: ' + str(path))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def regular(path):
    path = Path(path)
    if path.is_symlink() or path.resolve() != path.absolute() or not path.is_file():
        raise ValueError('Expected a regular file without symlink parents: ' + str(path))
    return path


def verify_package(path):
    """Check outer and internal hashes without extracting untrusted paths."""
    path = regular(path)
    if sha(path) != regular(str(path) + '.sha256').read_text().split()[0]:
        raise ValueError('Package checksum mismatch')
    with tarfile.open(path) as archive:
        members = archive.getmembers()
        names = [m.name for m in members]
        if len(names) != len(set(names)) or any(not m.isfile() or Path(m.name).is_absolute() or '..' in Path(m.name).parts for m in members):
            raise ValueError('Unsafe package members')
        sums = [n for n in names if n.endswith('/SHA256SUMS.txt')]
        if len(sums) != 1:
            raise ValueError('Missing package manifest')
        prefix = sums[0].rsplit('/', 1)[0] + '/'
        listed = []
        for line in archive.extractfile(sums[0]).read().decode().splitlines():
            expected, name = line.split('  ', 1)
            full = prefix + name
            if full not in names or full in listed:
                raise ValueError('Missing or duplicated hash member')
            listed.append(full)
            digest = hashlib.sha256()
            with archive.extractfile(full) as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(chunk)
            if digest.hexdigest() != expected:
                raise ValueError('Internal checksum mismatch: ' + name)
        if set(listed) != set(names) - set(sums):
            raise ValueError('Package contains files outside hash manifest')
    return {'archive': path.name, 'sha256': sha(path), 'internalHashes': len(listed)}


def preserve_databases(run, output, implementation):
    """Only identified db/trivy.db, db/metadata.json, identity and hashes."""
    run, output, implementation = Path(run), Path(output), Path(implementation)
    output.mkdir(parents=True, exist_ok=True)
    observations, identities = [], {}
    for directory in [run] + [run / n for n in ('L01-update', 'L05-from', 'L05-to', 'F03-vulnerable', 'F03-repaired', 'F04', 'L02')]:
        identity_file = directory / 'database-identity.json'
        if not identity_file.exists():
            continue
        value = read(regular(identity_file))
        snapshot = Path(value['retrieval']['directory'])
        allowed = implementation / '.tmp' / ('vulnerability-db-' + run.name)
        if snapshot != allowed or snapshot.is_symlink() or snapshot.resolve() != snapshot.absolute():
            raise ValueError('Database snapshot outside this owned run')
        if set(value['sha256']) != {'trivy.db', 'metadata.json'}:
            raise ValueError('Unexpected database identity files')
        if snapshot in identities and identities[snapshot] != value:
            raise ValueError('Conflicting per-image database identities')
        identities[snapshot] = value
    for snapshot, value in identities.items():
        files = [(regular(snapshot / 'db' / n), 'db/' + n) for n in ('trivy.db', 'metadata.json')]
        # Keep bytes even if drift occurred; the mismatch remains a failed observation.
        observed = {p.name: sha(p) for p, _ in files}
        consistent = observed == value['sha256'] and read(snapshot / 'db/metadata.json') == value['metadata']
        record = {'expectedIdentity': value, 'observedSha256': observed, 'status': 'PASS' if consistent else 'DATABASE_DRIFT'}
        data = (json.dumps(record, indent=2) + '\n').encode()
        sums = ''.join(observed[p.name] + '  ' + name + '\n' for p, name in files)
        sums += hashlib.sha256(data).hexdigest() + '  identity.json\n'
        target = output / (snapshot.name + '.tar.gz')
        with tarfile.open(target, 'w:gz') as archive:
            for file, name in files:
                archive.add(file, arcname=name, recursive=False)
            for name, content in [('identity.json', data), ('SHA256SUMS.txt', sums.encode())]:
                info = tarfile.TarInfo(name); info.size = len(content)
                archive.addfile(info, io.BytesIO(content))
        # Detect concurrent changes during the streaming archive operation.
        if observed != {p.name: sha(p) for p, _ in files}:
            consistent = False
        Path(str(target) + '.sha256').write_text(sha(target) + '  ' + target.name + '\n')
        observations.append({'archive': target.name, 'status': 'PASS' if consistent else 'DATABASE_DRIFT', 'expected': value['sha256'], 'observed': observed})
    write(output / 'index.json', {'snapshots': observations, 'status': 'PASS' if observations and all(v['status'] == 'PASS' for v in observations) else 'NOT_CREATED' if not observations else 'FAIL'})
    return observations


def copy_smoke(source, destination):
    # Explicit public smoke outputs only; kubeconfig and cluster exports excluded.
    for name in ('result.json', 'run.log', 'versions.env', 'docker-version.json', 'os-packages.txt', 'image.json', 'container.json', 'nodes.json', 'kubernetes.json', 'pods.json', 'existing-clusters.txt'):
        path = Path(source) / name
        if path.exists():
            regular(path)
            target = Path(destination) / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)


def hash_export(directory):
    directory = Path(directory)
    files = sorted(p for p in directory.rglob('*') if p.is_file() and p.name != 'SHA256SUMS.txt')
    for p in files:
        regular(p)
    (directory / 'SHA256SUMS.txt').write_text(''.join(sha(p) + '  ' + p.relative_to(directory).as_posix() + '\n' for p in files))
