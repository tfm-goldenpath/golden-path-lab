#!/usr/bin/env python3
"""Package only allow-listed evidence, never credentials, kubeconfig or run state."""
import hashlib
import json
import sys
import tarfile
from pathlib import Path

def package(source, output, status):
    source, output = Path(source).resolve(), Path(output).resolve()
    allowed = {'.json', '.log', '.txt', '.pem', '.yaml'}
    excluded = {'state.json', 'config.json', 'kubeconfig', 'cosign.key', 'SHA256SUMS.txt'}
    files = []
    for file in sorted(source.iterdir()):
        if file.is_file() and not file.is_symlink() and file.suffix in allowed and file.name not in excluded:
            files.append(file)
    output.mkdir(parents=True, exist_ok=True)
    summary = source / 'execution-summary.json'
    summary.write_text(json.dumps({'run': source.name, 'status': status,
        'scope': 'L01 + F13 integration demonstration; not the experimental campaign',
        'secretsIncluded': False}, indent=2) + '\n', encoding='utf-8')
    files = [p for p in files if p != summary] + [summary]
    sums = source / 'SHA256SUMS.txt'
    sums.write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name + '\n' for p in files), encoding='utf-8')
    target = output / (source.name + '.tar.gz')
    with tarfile.open(target, 'w:gz') as archive:
        for file in files + [sums]:
            archive.add(file, arcname=source.name + '/' + file.name, recursive=False)
    (output / (target.name + '.sha256')).write_text(hashlib.sha256(target.read_bytes()).hexdigest() + '  ' + target.name + '\n', encoding='utf-8')
    print(target)

if __name__ == '__main__':
    package(*sys.argv[1:])
