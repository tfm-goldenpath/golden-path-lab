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
import stat
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


def cleanup(output, cid=None, creation_attempted=True):
    output = Path(output).resolve()
    cidfile = output/'java-test-container.id'
    if cidfile.is_symlink():
        raise ValueError('Symlinked Java container receipt')
    if cidfile.exists():
        recorded = cidfile.read_text().strip()
        if cid is not None and recorded != cid:
            raise ValueError('Mismatched Java container receipt')
        cid = recorded
    if cid is None:
        # A create client can fail after the daemon has created the container.
        # A label can establish absence, but cannot authorize deletion by itself.
        if creation_attempted and docker('ps', '-aq', '--no-trunc', '--filter',
                                         'label=goldenpath.java-test='+str(output)):
            raise ValueError('Unresolved Java container identity; retain recovery directory')
        return
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
    if docker('ps', '-aq', '--no-trunc', '--filter', 'id='+cid):
        raise ValueError('Java producer retirement not confirmed')


def capacity(output):
    docker_root = docker('info', '--format', '{{.DockerRootDir}}')
    for place, gib in ((docker_root, 10), (output, 3.5), (tempfile.gettempdir(), 5)):
        if shutil.disk_usage(place).free < gib*1024**3:
            raise ValueError('Insufficient Java test capacity at '+str(place)+': need '+str(gib)+' GiB free')



# Bounds for this single-module starter, including Maven's resolved artifacts.
MAX_ENTRIES = 10000
MAX_DEPTH = 32
MAX_FILE_BYTES = 64 * 1024**2
MAX_ARTIFACT_BYTES = 512 * 1024**2
MAX_REPORT_FILE_BYTES = 4 * 1024**2
MAX_REPORT_BYTES = 16 * 1024**2


def collect(work, output):
    """Read only retired producer output, using descriptor-relative no-follow IO.

    Every generated entry is checked, including unselected files. Opened objects
    must match the checked inode/type; nonblocking opens cannot hang on a FIFO
    swapped into a regular file's place. No path resolution followed by open.
    """
    artifacts = []
    totals = {'entries': 0, 'artifacts': 0, 'reports': 0}
    destination = output/'java-test-reports'
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW

    def checked_open(parent, name, before, flags):
        fd = os.open(name, flags | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
        after = os.fstat(fd)
        if (before.st_dev, before.st_ino, before.st_mode) != (after.st_dev, after.st_ino, after.st_mode):
            os.close(fd)
            raise ValueError('Generated entry changed during open: '+name)
        return fd

    def walk(fd, relative, depth):
        if depth > MAX_DEPTH:
            raise ValueError('Java generated directory depth limit exceeded')
        with os.scandir(fd) as entries:
            for entry in entries:
                totals['entries'] += 1
                if totals['entries'] > MAX_ENTRIES:
                    raise ValueError('Java generated entry count limit exceeded')
                name = entry.name
                path = relative/name
                info = os.stat(name, dir_fd=fd, follow_symlinks=False)
                if stat.S_ISDIR(info.st_mode):
                    child = checked_open(fd, name, info, directory_flags)
                    try:
                        walk(child, path, depth+1)
                    finally:
                        os.close(child)
                elif stat.S_ISREG(info.st_mode) and info.st_nlink == 1:
                    report = path.is_relative_to('service/target/surefire-reports')
                    artifact = path.suffix in ('.jar', '.pom')
                    if not (report or artifact):
                        continue
                    limit = MAX_REPORT_FILE_BYTES if report else MAX_FILE_BYTES
                    if info.st_size > limit:
                        raise ValueError('Java generated file size limit exceeded: '+str(path))
                    source = checked_open(fd, name, info, os.O_RDONLY)
                    try:
                        # Validate the opened object, never infer its type from a suffix.
                        opened = os.fstat(source)
                        if not stat.S_ISREG(opened.st_mode) or opened.st_nlink != 1:
                            raise ValueError('Nonregular Java generated file: '+str(path))
                        hasher, chunks, size = hashlib.sha256(), [], 0
                        while chunk := os.read(source, 1024*1024):
                            size += len(chunk)
                            if size > limit:
                                raise ValueError('Java generated file size limit exceeded: '+str(path))
                            for selected, key, maximum in ((report, 'reports', MAX_REPORT_BYTES),
                                                          (artifact, 'artifacts', MAX_ARTIFACT_BYTES)):
                                if selected:
                                    totals[key] += len(chunk)
                                    if totals[key] > maximum:
                                        raise ValueError('Java generated '+key+' byte limit exceeded')
                            hasher.update(chunk)
                            if report:
                                chunks.append(chunk)
                        final = os.fstat(source)
                        if (opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns) != (final.st_size, final.st_mtime_ns, final.st_ctime_ns):
                            raise ValueError('Java generated file changed while reading: '+str(path))
                    finally:
                        os.close(source)
                    if report:
                        target = destination/path.relative_to('service/target/surefire-reports')
                        target.parent.mkdir(parents=True, exist_ok=True)
                        # Evidence is outside the producer mount, initially absent.
                        with target.open('xb') as retained:
                            for chunk in chunks:
                                retained.write(chunk)
                            retained.flush()
                            os.utime(retained.fileno(), ns=(info.st_atime_ns, info.st_mtime_ns))
                    if artifact:
                        artifacts.append({'path': str(path), 'sha256': hasher.hexdigest()})
                else:
                    raise ValueError('Unsafe Java generated entry (link or nonregular): '+str(path))

    root = os.open(work, directory_flags)
    try:
        for parts in (('repository',), ('service', 'target')):
            fd = os.dup(root)
            try:
                for part in parts:
                    try:
                        info = os.stat(part, dir_fd=fd, follow_symlinks=False)
                    except FileNotFoundError:
                        break
                    if not stat.S_ISDIR(info.st_mode):
                        raise ValueError('Unsafe Java generated directory: '+part)
                    child = checked_open(fd, part, info, directory_flags)
                    os.close(fd)
                    fd = child
                else:
                    walk(fd, Path(*parts), 0)
            finally:
                os.close(fd)
    finally:
        os.close(root)
    (output/'java-build-artifacts.json').write_text(json.dumps(sorted(artifacts, key=lambda x: x['path']), indent=2)+'\n')


def run(service, output):
    service, output = Path(service).resolve(), Path(output).resolve()
    # The parent delivery may already have other evidence; never overwrite tests.
    output.mkdir(parents=True, exist_ok=True)
    for file in [service, *service.rglob('*')]:
        if file.is_symlink():
            raise ValueError('Symlink in Java test input')
    if (service/'pom.xml').read_bytes() != (ROOT.parent/'templates/java-http/service/pom.xml').read_bytes():
        raise ValueError('Unsupported Java POM')
    if any((output/n).exists() or (output/n).is_symlink() for n in (
            'java-test-container.id', 'java-tests.json', 'java-tests.json.partial',
            'java-test-reports', 'java-build-artifacts.json', 'java-test-work.json', 'unit-tests.log')):
        raise ValueError('Fresh Java test evidence required')
    capacity(output)  # Before the builder image can be pulled.
    work = Path(tempfile.mkdtemp(prefix='gp-java-test-'))
    # Recovery work is never within the uploadable evidence directory.
    if work.is_relative_to(output) or output.is_relative_to(work):
        work.rmdir()
        raise ValueError('Java working and evidence directories must be separate')
    errors = []
    status, cid, creation_attempted, retired, collected = 1, None, False, False, False
    try:
        (output/'java-test-work.json').write_text(json.dumps({'path': str(work),
            'device': work.stat().st_dev, 'inode': work.stat().st_ino})+'\n')
        app = work/'service'
        app.mkdir()
        shutil.copy2(service/'pom.xml', app/'pom.xml')
        shutil.copytree(service/'src', app/'src', symlinks=False)
        (work/'.started').touch()
        started = (work/'.started').stat().st_mtime_ns
        creation_attempted = True
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
        if status:
            raise ValueError('Java test process failed with exit status '+str(status))
    except BaseException as error:
        errors.append(('execution', error))
    finally:
        # Retirement is independent of every evidence write and precedes reads.
        try:
            cleanup(output, cid=cid, creation_attempted=creation_attempted)
            retired = True
        except BaseException as error:
            errors.append(('cleanup', error))
    if retired:
        try:
            (output/'java-test-exit.txt').write_text(str(status)+'\n')
        except BaseException as error:
            errors.append(('exit receipt', error))
        try:
            collect(work, output)
            collected = True
        except BaseException as error:
            errors.append(('collection', error))
    if retired and collected:
        try:
            shutil.rmtree(work)
        except BaseException as error:
            errors.append(('working directory cleanup', error))
    if not errors:
        try:
            receipt = reports.validate(output/'java-test-reports', started, status)
            receipt.update(logSha256=reports.digest(output/'unit-tests.log'),
                           artifactsSha256=reports.digest(output/'java-build-artifacts.json'),
                           toolchain=PIN)
            partial = output/'java-tests.json.partial'
            partial.write_text(json.dumps(receipt, indent=2)+'\n')
            partial.replace(output/'java-tests.json')
        except BaseException as error:
            errors.append(('validation/receipt', error))
    if errors:
        diagnostics = [{'stage': stage, 'type': type(error).__name__, 'message': str(error)}
                       for stage, error in errors]
        try:
            (output/'java-test-errors.json').write_text(json.dumps(diagnostics, indent=2)+'\n')
        except BaseException:
            pass  # ENOSPC must not replace the original failure.
        for diagnostic in diagnostics:
            try:
                print('Java tests: '+json.dumps(diagnostic), file=sys.stderr)
            except BaseException:
                pass
        primary = errors[0][1]
        for stage, error in errors[1:]:
            primary.add_note(stage+': '+type(error).__name__+': '+str(error))
        raise primary


if __name__ == '__main__':
    def interrupted(signum, frame):
        raise InterruptedError('Java tests interrupted by signal '+str(signum))
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    if sys.argv[1] == 'cleanup':
        cleanup(sys.argv[2])
    else:
        run(sys.argv[1], sys.argv[2])
