#!/usr/bin/env python3
"""Bounded Java test container. Fresh copies, no credentials/socket, exact ownership.

Usage: java-tests.py SERVICE FRESH_EVIDENCE_DIRECTORY | cleanup EVIDENCE_DIRECTORY
The coordinator owns delivery cleanup; standalone use also cleans on normal signals.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent
PIN = json.loads((ROOT/'java-toolchain.json').read_text())
spec = importlib.util.spec_from_file_location('reports', ROOT/'java-test-reports.py')
reports = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reports)


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True, timeout=60).strip()


def cleanup(output):
    output = Path(output).resolve()
    cidfile = output/'java-test-container.id'
    if not cidfile.exists():
        return
    if cidfile.is_symlink():
        raise ValueError('Symlinked Java container receipt')
    cid = cidfile.read_text().strip()
    if not re.fullmatch('[a-f0-9]{64}', cid):
        raise ValueError('Invalid Java container identity')
    # Listing failure is not confirmed absence.
    found = docker('ps', '-aq', '--no-trunc', '--filter', 'id='+cid).splitlines()
    if not found:
        return
    if found != [cid]:
        raise ValueError('Ambiguous Java container identity')
    info = json.loads(docker('inspect', cid))[0]
    if (info['Id'] != cid or info['Config']['Labels'].get('goldenpath.java-test') != str(output)
            or info['Config']['Image'] != PIN['builderImage']):
        raise ValueError('Refusing foreign Java test container')
    docker('rm', '-f', cid)


def capacity(output):
    docker_root = docker('info', '--format', '{{.DockerRootDir}}')
    for place, gib in ((docker_root, 10), (output, 3.5), (tempfile.gettempdir(), 5)):
        if shutil.disk_usage(place).free < gib*1024**3:
            raise ValueError('Insufficient Java test capacity at '+str(place)+': need '+str(gib)+' GiB free')


def run(service, output):
    service, output = Path(service).resolve(), Path(output).resolve()
    # The parent delivery may already have other evidence; never overwrite tests.
    output.mkdir(parents=True, exist_ok=True)
    for file in [service, *service.rglob('*')]:
        if file.is_symlink():
            raise ValueError('Symlink in Java test input')
    if (service/'pom.xml').read_bytes() != (ROOT.parent/'templates/java-http/service/pom.xml').read_bytes():
        raise ValueError('Unsupported Java POM')
    if any((output/n).exists() for n in ('java-test-container.id', 'java-tests.json', 'unit-tests.log')):
        raise ValueError('Fresh Java test evidence required')
    capacity(output)  # Before the builder image can be pulled.
    with tempfile.TemporaryDirectory(prefix='gp-java-test-') as temporary:
        work = Path(temporary)
        app = work/'service'
        app.mkdir()
        # Fixed allowlist; target, host caches, settings and credentials never enter.
        shutil.copy2(service/'pom.xml', app/'pom.xml')
        shutil.copytree(service/'src', app/'src', symlinks=False)
        # Use the same filesystem clock as reports; wall-clock nanoseconds can
        # run ahead of filesystem timestamp granularity even on fresh writes.
        (work/'.started').touch()
        started = (work/'.started').stat().st_mtime_ns
        status = 1
        try:
            cid = docker('create', '--cidfile', str(output/'java-test-container.id'),
                         '--label', 'goldenpath.java-test='+str(output), '--platform', 'linux/amd64',
                         '--cpus', '2', '--memory', '1g', '--memory-swap', '1g', '--pids-limit', '128',
                         '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
                         '--user', str(os.getuid())+':'+str(os.getgid()),
                         '--tmpfs', '/tmp:rw,nosuid,nodev,size=128m',
                         '--mount', 'type=bind,src='+str(work)+',dst=/work', '--workdir', '/work/service',
                         '--env', 'MAVEN_OPTS=-Xmx256m -XX:ActiveProcessorCount=2 -Duser.home=/work',
                         '--entrypoint', 'mvn', PIN['builderImage'],
                         '-B', '-ntp', '--strict-checksums', '-Dmaven.repo.local=/work/repository', 'verify')
            info = json.loads(docker('inspect', cid))[0]
            (output/'java-test-container.json').write_text(json.dumps({
                'id': cid, 'image': info['Image'], 'reference': PIN['builderImage'],
                'cpus': 2, 'memoryBytes': 1073741824, 'owner': str(output)}, indent=2)+'\n')
            with (output/'unit-tests.log').open('w') as log:
                process = subprocess.run(['docker', 'start', '-a', cid], stdout=log,
                                         stderr=subprocess.STDOUT, timeout=900)
            state = json.loads(docker('inspect', '--format', '{{json .State}}', cid))
            status = process.returncode or state['ExitCode'] or (1 if state['OOMKilled'] or state['Running'] or state['Error'] else 0)
        finally:
            (output/'java-test-exit.txt').write_text(str(status)+'\n')
            # Preserve original reports even on failure, never fabricate a pass.
            destination = output/'java-test-reports'
            if (app/'target/surefire-reports').exists():
                shutil.copytree(app/'target/surefire-reports', destination)
            artifacts = []
            for root in (work/'repository', app/'target'):
                for file in sorted(root.rglob('*')):
                    if file.is_file() and file.suffix in ('.jar', '.pom'):
                        artifacts.append({'path': str(file.relative_to(work)), 'sha256': reports.digest(file)})
            (output/'java-build-artifacts.json').write_text(json.dumps(artifacts, indent=2)+'\n')
            cleanup(output)
        receipt = reports.validate(destination, started, status)
        receipt.update(logSha256=reports.digest(output/'unit-tests.log'),
                       artifactsSha256=reports.digest(output/'java-build-artifacts.json'),
                       toolchain=PIN)
        (output/'java-tests.json').write_text(json.dumps(receipt, indent=2)+'\n')


if __name__ == '__main__':
    def interrupted(signum, frame):
        raise InterruptedError('Java tests interrupted by signal '+str(signum))
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    if sys.argv[1] == 'cleanup':
        cleanup(sys.argv[2])
    else:
        run(sys.argv[1], sys.argv[2])
