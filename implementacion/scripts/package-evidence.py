#!/usr/bin/env python3
"""Package only allow-listed evidence, never credentials, kubeconfig or run state."""
import hashlib
import json
import os
import re
import sys
import tarfile
import tempfile
from pathlib import Path

def write_metadata(destination, text):
    if destination.is_symlink():
        raise ValueError('Refusing symlinked evidence metadata: ' + destination.name)
    descriptor, temporary = tempfile.mkstemp(dir=destination.parent)
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8', newline='\n') as stream:
            stream.write(text)
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

def package(source, output, status):
    source, output = Path(source).resolve(), Path(output).resolve()
    allowed = {'.json', '.log', '.txt', '.yaml'}
    excluded = {'state.json', 'config.json', 'kubeconfig', 'cosign.key', 'SHA256SUMS.txt'}
    files = []
    candidates = list(source.iterdir())
    replacement = source / 'L01-update'
    if replacement.is_symlink() or replacement.resolve() != replacement:
        raise ValueError('Refusing symlinked replacement evidence directory')
    if replacement.is_dir():
        candidates.extend(replacement.iterdir())
    for file in sorted(candidates):
        if file.is_file() and not file.is_symlink() and file.suffix in allowed and file.name not in excluded:
            if re.search(rb'-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----', file.read_bytes()):
                continue
            files.append(file)
    output.mkdir(parents=True, exist_ok=True)
    target = output / (source.name + '.tar.gz')
    checksum = output / (target.name + '.sha256')
    for destination in (target, checksum):
        if destination.is_symlink() or (destination.exists() and not destination.is_file()):
            raise ValueError('Refusing unsafe evidence output: ' + destination.name)
    summary = source / 'execution-summary.json'
    sums = source / 'SHA256SUMS.txt'
    for metadata in (summary, sums):
        if metadata.is_symlink():
            raise ValueError('Refusing symlinked evidence metadata: ' + metadata.name)
    write_metadata(summary, json.dumps({'run': source.name, 'status': status,
        'scope': 'L01 image replacement + F13 + F11 integration demonstration; not the experimental campaign',
        'secretsIncluded': False}, indent=2) + '\n')
    files = [p for p in files if p != summary] + [summary]
    write_metadata(sums, ''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.relative_to(source).as_posix() + '\n' for p in files))
    descriptor, temporary = tempfile.mkstemp(dir=output)
    try:
        with os.fdopen(descriptor, 'w+b') as stream:
            with tarfile.open(fileobj=stream, mode='w:gz') as archive:
                for file in files + [sums]:
                    archive.add(file, arcname=source.name + '/' + file.relative_to(source).as_posix(), recursive=False)
            stream.seek(0)
            digest = hashlib.sha256()
            for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                digest.update(chunk)
        os.replace(temporary, target)
        write_metadata(checksum, digest.hexdigest() + '  ' + target.name + '\n')
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print(target)

if __name__ == '__main__':
    package(*sys.argv[1:])
