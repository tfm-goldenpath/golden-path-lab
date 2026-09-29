#!/usr/bin/env python3
"""Package only allow-listed evidence, never credentials, kubeconfig or run state."""
import base64
import binascii
import hashlib
import json
import os
import re
import sys
import tarfile
import tempfile
from pathlib import Path

def is_public_key_pem(content):
    # Archive boundary only: actual key validity/trust belongs to Cosign.
    match = re.fullmatch(
        rb'-----BEGIN PUBLIC KEY-----\r?\n((?:[A-Za-z0-9+/=]+\r?\n)+)'
        rb'-----END PUBLIC KEY-----(?:\r?\n)?', content)
    if not match:
        return False
    encoded = match.group(1).replace(b'\r', b'').replace(b'\n', b'')
    try:
        decoded = base64.b64decode(encoded, validate=True)
    except binascii.Error:
        return False
    return bool(decoded) and base64.b64encode(decoded) == encoded

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
    for name in ('L01-update', 'F07', 'L01-update/F07-CI', 'L01-update/F08-CI', 'L01-update/F08-admission', 'L01-update/F05-CI', 'L01-update/F05-admission', 'L01-update/F06-CI', 'L01-update/F06-admission'):
        directory = source / name
        if directory.is_symlink() or directory.resolve() != directory:
            raise ValueError('Refusing symlinked scenario evidence directory')
        if directory.is_dir():
            candidates.extend(directory.iterdir())
    for file in sorted(candidates):
        if file.is_file() and not file.is_symlink() and (file.suffix in allowed or file.name == 'development-public-key.pem') and file.name not in excluded:
            content = file.read_bytes()
            if re.search(rb'-----BEGIN [^\r\n]*PRIVATE KEY-----', content):
                continue
            if file.name == 'development-public-key.pem' and not is_public_key_pem(content):
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
        'scope': 'L01 image replacement + F13 + F11 integration demonstration; optional F07/F08 directed evidence; not the experimental campaign',
        'F07': 'evidence-retained; inspect F07/recovery.json and attribution.json' if (source / 'F07').is_dir() else 'not-executed',
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
