#!/usr/bin/env python3
"""Linux bounded Node producer. Retire and reap descendants before collection.

Private stdin request from quality-gate.mjs; not a user command/hook interface.
No container or security isolation is claimed for service-owned tests.
"""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import resource
import selectors
import shutil
import signal
import stat
import subprocess
import sys
import time


def inspect_tree(root, maximum):
    """Descriptor-relative, no-follow collection, including unselected outputs."""
    result, size = [], 0
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK

    def walk(fd, prefix, depth):
        nonlocal size
        if depth > 32:
            raise ValueError('Collection depth limit exceeded')
        for name in sorted(os.listdir(fd)):
            if len(result) >= 2000:
                raise ValueError('Collection entry limit exceeded')
            before = os.stat(name, dir_fd=fd, follow_symlinks=False)
            relative = prefix+name
            if not (stat.S_ISREG(before.st_mode) or stat.S_ISDIR(before.st_mode)) or (stat.S_ISREG(before.st_mode) and before.st_nlink != 1):
                raise ValueError('Unsafe generated entry (link or nonregular): '+relative)
            child = os.open(name, flags | (os.O_DIRECTORY if stat.S_ISDIR(before.st_mode) else 0), dir_fd=fd)
            try:
                after = os.fstat(child)
                if (before.st_dev, before.st_ino, before.st_mode) != (after.st_dev, after.st_ino, after.st_mode):
                    raise ValueError('Collection entry changed during open: '+relative)
                if stat.S_ISDIR(after.st_mode):
                    result.append({'path': relative+'/', 'directory': True})
                    walk(child, relative+'/', depth+1)
                else:
                    h = hashlib.sha256()
                    while chunk := os.read(child, 65536):
                        size += len(chunk)
                        if size > maximum:
                            raise ValueError('Collection size limit exceeded')
                        h.update(chunk)
                    final = os.fstat(child)
                    if (after.st_size, after.st_mtime_ns, after.st_ctime_ns) != (final.st_size, final.st_mtime_ns, final.st_ctime_ns):
                        raise ValueError('Collection file changed while reading: '+relative)
                    result.append({'path': relative, 'sha256': h.hexdigest(), 'mode': oct(final.st_mode & 0o777)[2:]})
            finally:
                os.close(child)
    fd = os.open(root, flags | os.O_DIRECTORY)
    try:
        walk(fd, '', 0)
    finally:
        os.close(fd)
    return result


def children():
    return [int(n) for n in Path(f'/proc/self/task/{os.getpid()}/children').read_text().split()]


def retire(process):
    # A Linux subreaper adopts double-forked/setsid descendants too. Kill direct
    # descendants repeatedly as orphans are adopted; do not match by process name.
    deadline = time.monotonic()+5
    if process is not None:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)
    while True:
        owned = children()
        if not owned:
            return
        for pid in owned:
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        while True:
            try:
                if os.waitpid(-1, os.WNOHANG)[0] == 0:
                    break
            except ChildProcessError:
                break
        if time.monotonic() >= deadline:
            raise ValueError('Owned process retirement could not be confirmed')
        time.sleep(.02)


def monitor(work, output, maximum):
    # Bound aggregate growth as well as each file; never descend through links.
    count, total, pending = 0, 0, [(str(work), 0)]
    while pending:
        directory, depth = pending.pop()
        if depth > 32:
            raise ValueError('Generated directory depth limit exceeded')
        with os.scandir(directory) as entries:
            for entry in entries:
                count += 1
                if count > 2000:
                    raise ValueError('Generated entry count limit exceeded')
                info = entry.stat(follow_symlinks=False)
                if stat.S_ISDIR(info.st_mode):
                    pending.append((entry.path, depth+1))
                elif stat.S_ISREG(info.st_mode):
                    total += info.st_size
                    if total > maximum:
                        raise ValueError('Generated aggregate size limit exceeded')
    for place in (work, output):
        if shutil.disk_usage(place).free < 3*1024**3:
            raise ValueError('Execution reached the 3 GiB storage reserve')


def run(request):
    result = {'python': sys.version.split()[0], 'exitCode': None, 'errors': [], 'retired': False, 'collected': False, 'cleaned': False}
    work = Path(request['work'])
    identity = work.stat()
    process = None
    interrupted = []
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda number, _frame: interrupted.append(number))
    try:
        if ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) != 0:
            raise ValueError('Linux child subreaper is required')
        limit = request['limits']['maxOutputBytes']
        def bounds():
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
            resource.setrlimit(resource.RLIMIT_FSIZE, (limit, limit))
        # Only pipes carry producer reports; test stdout stays inside TAP output.
        process = subprocess.Popen(request['argv'], cwd=work, env=request['env'], stdin=subprocess.DEVNULL,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True, preexec_fn=bounds)
        selector = selectors.DefaultSelector()
        with open(request['output']+'/coverage.ndjson', 'xb') as report, open(request['output']+'/tests.log', 'xb') as log:
            selector.register(process.stdout, selectors.EVENT_READ, report)
            selector.register(process.stderr, selectors.EVENT_READ, log)
            deadline, size = time.monotonic()+request['limits']['timeoutSeconds'], 0
            next_monitor = 0
            while selector.get_map() or process.poll() is None:
                if interrupted:
                    raise ValueError('Execution interrupted by signal '+str(interrupted[0]))
                if time.monotonic() >= deadline:
                    raise ValueError('Test execution timeout')
                if time.monotonic() >= next_monitor:
                    monitor(work, request['output'], 16777216+limit)
                    next_monitor = time.monotonic()+.1
                for key, _ in selector.select(.05):
                    chunk = os.read(key.fileobj.fileno(), 65536)
                    if not chunk:
                        selector.unregister(key.fileobj)
                        continue
                    if size+len(chunk)>limit:
                        key.data.write(chunk[:max(0, limit-size)])
                        raise ValueError('Runner output size limit exceeded')
                    size += len(chunk)
                    key.data.write(chunk)
            result['exitCode'] = process.wait()
            if result['exitCode'] < 0:
                raise ValueError('Runner terminated by signal '+str(-result['exitCode']))
    except Exception as error:
        result['errors'].append(str(error))
    finally:
        try:
            retire(process)
            result['retired'] = True
        except Exception as error:
            result['errors'].append('Retirement: '+str(error))
        if result['retired']:
            try:
                result['inventory'] = inspect_tree(work, 16777216+request['limits']['maxOutputBytes'])
                observed = {f['path']: f for f in result['inventory'] if 'sha256' in f}
                for expected in request['inputs']:
                    actual = observed.get(expected['path'])
                    if not actual or actual['sha256'] != expected['sha256'] or actual['mode'] != expected['mode']:
                        raise ValueError('Execution input changed: '+expected['path'])
                result['collected'] = True
            except Exception as error:
                result['errors'].append('Collection: '+str(error))
            try:
                current = work.lstat()
                if not stat.S_ISDIR(current.st_mode) or (current.st_dev, current.st_ino) != (identity.st_dev, identity.st_ino):
                    raise ValueError('Work directory identity changed; retained for recovery')
                shutil.rmtree(work)  # stdlib fd-based symlink-resistant removal
                result['cleaned'] = True
            except Exception as error:
                result['errors'].append('Cleanup: '+str(error))
    return result


if __name__ == '__main__':
    print(json.dumps(run(json.load(sys.stdin))))
