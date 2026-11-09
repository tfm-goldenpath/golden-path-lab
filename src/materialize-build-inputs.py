#!/usr/bin/env python3
"""Materialize the already captured Java Docker inputs, never live/generated files."""
import base64
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys


def materialize(capture, destination):
    destination = Path(destination)
    destination.mkdir()  # fresh, coordinator-owned private directory only
    for entry in capture['files']:
        name = PurePosixPath(entry['path'])
        if (name.is_absolute() or '..' in name.parts or str(name) != entry['path']
                or not (str(name) in ('Dockerfile', '.dockerignore', 'pom.xml')
                        or str(name).startswith(('src/main/', 'src/test/')))):
            raise ValueError('Unsupported captured Java build path')
        if entry.get('encoding') == 'base64':
            data = base64.b64decode(entry['content'], validate=True)
        elif 'encoding' not in entry:
            data = entry['content'].encode('utf-8')
        else:
            raise ValueError('Unsupported captured encoding')
        if hashlib.sha256(data).hexdigest() != entry['sha256']:
            raise ValueError('Captured Java build bytes changed')
        target = destination/name
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('xb') as stream:
            stream.write(data)
        target.chmod(int(entry['mode'], 8) & 0o777)


if __name__ == '__main__':
    materialize(json.loads(Path(sys.argv[1]).read_text()), sys.argv[2])
