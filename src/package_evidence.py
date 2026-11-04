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

def shareable(file):
    allowed = {'.json', '.log', '.txt', '.yaml'}
    excluded = {'state.json', 'config.json', 'kubeconfig', 'cosign.key', 'SHA256SUMS.txt'}
    if not file.is_file() or file.is_symlink() or file.name in excluded:
        return False
    if file.suffix not in allowed and file.name != 'development-public-key.pem':
        return False
    content = file.read_bytes()
    if re.search(rb'-----BEGIN [^\r\n]*PRIVATE KEY-----', content): return False
    return file.name != 'development-public-key.pem' or is_public_key_pem(content)

def write_package(source, output, status, profile, names, summary_value):
    files = list(names)
    output.mkdir(parents=True, exist_ok=True)
    target = output / (source.name + '.tar.gz')
    checksum = output / (target.name + '.sha256')
    for destination in (target, checksum):
        if profile == "delivery-v1" and destination.exists():
            raise ValueError("Refusing to replace a delivery package")
        if destination.is_symlink() or (destination.exists() and not destination.is_file()):
            raise ValueError('Refusing unsafe evidence output: ' + destination.name)
    summary = source / 'execution-summary.json'
    sums = source / 'SHA256SUMS.txt'
    for metadata in (summary, sums):
        if metadata.is_symlink():
            raise ValueError('Refusing symlinked evidence metadata: ' + metadata.name)
    write_metadata(summary, json.dumps(summary_value, indent=2) + '\n')
    files = [p for p in files if p != summary] + [summary]
    names[summary] = summary.name
    write_metadata(sums, ''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + names[p] + '\n' for p in files))
    descriptor, temporary = tempfile.mkstemp(dir=output)
    try:
        with os.fdopen(descriptor, 'w+b') as stream:
            with tarfile.open(fileobj=stream, mode='w:gz') as archive:
                for file in files + [sums]:
                    archive.add(file, arcname=source.name + '/' + (sums.name if file == sums else names[file]), recursive=False)
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

def package(source, output, status, profile="delivery-v1"):
    if profile != "delivery-v1": raise ValueError("Unknown evidence package profile")
    source, output = Path(source).resolve(), Path(output).resolve()
    names = {p: p.relative_to(source).as_posix() for p in sorted(source.iterdir()) if shareable(p)}
    result = json.loads((source / 'result.json').read_text())
    if result.get('schema') != 'legitimate-delivery-result/v1' or result.get('status') != status:
        raise ValueError('Invalid legitimate delivery result')
    if any(re.match(r'^(?:F[0-9]{2}|L[0-9]{2}|measurement|manual-task|defense-demo)', p.name) for p in names):
        raise ValueError('Laboratory evidence in delivery profile')
    summary = {'schema': 'legitimate-delivery-package/v1', 'profile': profile,
        'run': source.name, 'status': status, 'result': 'result.json',
        'scope': 'One legitimate local quotes-node delivery; no scenario, replacement, measurement or hosted claim',
        'secretsIncluded': False}
    write_package(source, output, status, profile, names, summary)

if __name__ == '__main__': package(*sys.argv[1:])
