#!/usr/bin/env python3
"""Harmless Pages packaging input and offline verification of its downloaded bytes.

No network, credentials, deployment or extraction. Expected identity must come
from the selected Actions run, not from the downloaded artifact itself.
"""
import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import stat
import tarfile
import zipfile

spec = importlib.util.spec_from_file_location(
    'pages', Path(__file__).resolve().parents[2]/'scripts/defense-demo/pages.py')
P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)


def fixture(identity):
    if (not re.fullmatch(r'[0-9a-f]{40}', identity['source']) or
            any(not re.fullmatch(r'[1-9][0-9]*', identity[k]) for k in ('run_id', 'attempt'))):
        raise ValueError('Expected a full source SHA and positive run/attempt IDs')
    return {
        'index.html': b'<!doctype html><title>Artifact smoke</title>Harmless synthetic fixture.\n',
        'assets/probe.txt': 'Synthetic UTF-8: verificación → bytes.\n'.encode(),
        'identity.json': (json.dumps(identity, sort_keys=True) + '\n').encode(),
    }


def records(files):
    return {name: {'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
            for name, data in files.items()}


def prepare(root, identity):
    files = fixture(identity)
    P.reserve(root.parent, growth=1024**2)
    root.mkdir()  # Never overwrite a previous attempt.
    for name, content in {**files, '.hidden-probe': b'exclude me\n',
                          '.git/config': b'harmless synthetic marker\n',
                          '.github/marker': b'exclude me\n',
                          'assets/.hidden.txt': b'exclude me\n'}.items():
        path = root/'site'/name; path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    P.inventory(root/'site')  # Reject links/special entries before the action dereferences them.
    P.scan_public(root/'site')
    receipt = {'identity': identity, 'expected': records(files)}
    P.write_json(root/'expected.json', receipt)
    return receipt


def tar_records(stream):
    """Read the composite's uncompressed GNU tar, including './' and directories.

    Reuse Pages path/size limits; reject links and ambiguous entries without
    extracting anything. This is distinct from the frozen gzip transport format.
    """
    result = {}; seen = set(); total = 0
    with tarfile.open(fileobj=stream, mode='r|') as archive:
        for member in archive:
            name = member.name.removeprefix('./')
            if name != '.': P.safe_name(name)
            if name in seen or len(seen) >= P.MAX_FILES * 2:
                raise ValueError('Duplicate/excessive archive members')
            seen.add(name)
            if member.isdir(): continue
            if name == '.' or not member.isfile() or member.issparse():
                raise ValueError('Non-regular archive member: ' + name)
            total += member.size
            if member.size < 0 or member.size > P.MAX_FILE or total > P.MAX_BYTES:
                raise ValueError('Archive size limit exceeded')
            with archive.extractfile(member) as content:
                result[name] = {'size': member.size, 'sha256': P.sha(content)}
    return result


def verify(path, identity):
    expected = records(fixture(identity))
    # Smoke artifacts are tiny; never inflate an arbitrary downloaded ZIP.
    if path.stat().st_size > 1024**2: raise ValueError('Oversized smoke archive')
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            entries = archive.infolist()
            if (len(entries) != 1 or entries[0].filename != 'artifact.tar' or
                    entries[0].file_size > 1024**2 or
                    stat.S_IFMT(entries[0].external_attr >> 16) not in (0, stat.S_IFREG)):
                raise ValueError('Unexpected ZIP membership/type/size')
            actual = tar_records(io.BytesIO(archive.read(entries[0])))
    else:
        with path.open('rb') as stream: actual = tar_records(stream)
    if actual != expected: raise ValueError('Artifact differs from expected source/run input')
    return {'status': 'PASS', 'identity': identity, 'files': len(actual),
            'archive_sha256': P.checksum(path), 'members': actual}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('prepare', 'verify'))
    parser.add_argument('path', type=Path)
    parser.add_argument('--source', required=True)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--attempt', required=True)
    args = parser.parse_args()
    identity = {'source': args.source, 'run_id': args.run_id, 'attempt': args.attempt}
    result = (prepare if args.command == 'prepare' else verify)(args.path, identity)
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == '__main__': main()
