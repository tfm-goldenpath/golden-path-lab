"""Verify existing delivery/laboratory archives without extracting them."""
import hashlib
import tarfile
from pathlib import Path

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


if __name__ == '__main__':
    import json, sys
    print(json.dumps(verify_package(sys.argv[1]), indent=2))
