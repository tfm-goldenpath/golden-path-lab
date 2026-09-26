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
        with os.fdopen(descriptor, 'w', encoding='utf-8') as stream:
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
    for file in sorted(source.iterdir()):
        if file.is_file() and not file.is_symlink() and file.suffix in allowed and file.name not in excluded:
            if re.search(rb'-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----', file.read_bytes()):
                continue
            files.append(file)
    output.mkdir(parents=True, exist_ok=True)
    summary = source / 'execution-summary.json'
    sums = source / 'SHA256SUMS.txt'
    for metadata in (summary, sums):
        if metadata.is_symlink():
            raise ValueError('Refusing symlinked evidence metadata: ' + metadata.name)
    write_metadata(summary, json.dumps({'run': source.name, 'status': status,
        'scope': 'L01 + F13 integration demonstration; not the experimental campaign',
        'secretsIncluded': False}, indent=2) + '\n')
    files = [p for p in files if p != summary] + [summary]
    write_metadata(sums, ''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name + '\n' for p in files))
    target = output / (source.name + '.tar.gz')
    with tarfile.open(target, 'w:gz') as archive:
        for file in files + [sums]:
            archive.add(file, arcname=source.name + '/' + file.name, recursive=False)
    (output / (target.name + '.sha256')).write_text(hashlib.sha256(target.read_bytes()).hexdigest() + '  ' + target.name + '\n', encoding='utf-8')
    print(target)

if __name__ == '__main__':
    package(*sys.argv[1:])
