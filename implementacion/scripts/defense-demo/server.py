"""Loopback-only read-only viewer. No filesystem browser and no command API."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time
from urllib.parse import urlsplit
from urllib.request import urlopen
import uuid

from core import (ROOT, WEB, artifact_index, atomic, boot_id, events, evidence_root,
                  public_session, read_artifact, read_json, safe_path, sanitize, session_path, utc)

_children = {}


def snapshot(name):
    raw = evidence_root(name)
    state = public_session(name)
    tail = None
    log_modified = None
    active_observed = None
    if state.get('active'):
        worker = state['active'].get('worker')
        if worker: active_observed = process_identity(worker['pid']) == worker
        op = state['active'].get('instance', state['active']['operation'])
        if re.fullmatch(r'[a-z0-9-]+', op):
            p = raw / 'operations' / op / 'output-original.log'
            if p.is_file() and p.resolve() == p:
                with p.open('rb') as stream:
                    stream.seek(max(0, p.stat().st_size - 8192))
                    tail = sanitize(stream.read(8192).decode('utf-8', errors='replace'))
                log_modified = datetime.fromtimestamp(p.stat().st_mtime, timezone.utc).isoformat()
    return {'session': state, 'events': events(name), 'catalogue': read_json(raw / 'catalogue.json'),
            'workflows': read_json(raw / 'workflows.json'), 'readUTC': utc(), 'provisionalLog': tail,
            'recorded': False, 'provisionalLogModifiedUTC': log_modified, 'activeProcessObserved': active_observed}


def process_identity(pid):
    try:
        text = Path(f'/proc/{pid}/stat').read_text()
        return {'pid': pid, 'start': text[text.rindex(')')+2:].split()[19], 'bootId': boot_id()}
    except (OSError, ValueError): return None


def owned_server(record):
    if process_identity(record['pid']) != record['process']: return False
    try: args = Path(f"/proc/{record['pid']}/cmdline").read_bytes().split(b'\0')
    except OSError: return False
    return str(Path(__file__).resolve()).encode() in args and record['token'].encode() in args


def start_server(name, port):
    file = session_path(name) / 'server.json'
    if file.exists():
        saved = read_json(file)
        if owned_server(saved):
            if saved['port'] != port: raise RuntimeError('This session already has a server on a different port')
            print(f'Viewer: http://127.0.0.1:{port} (already running)', flush=True)
            return saved
    token = uuid.uuid4().hex
    with (session_path(name) / 'server.log').open('ab') as stream:
        process = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), name, str(port), token],
                                   stdin=subprocess.DEVNULL, stdout=stream, stderr=stream, start_new_session=True)
    identity = process_identity(process.pid)
    for _ in range(80):
        if process.poll() is not None: raise RuntimeError('Viewer could not bind; port may belong to another process. See server.log')
        try:
            with urlopen(f'http://127.0.0.1:{port}/api/health', timeout=0.3) as response:
                data = json.load(response)
            if data.get('token') == token:
                record = {'pid': process.pid, 'process': identity, 'port': port, 'token': token, 'session': name}
                atomic(file, record)
                _children[name] = process
                print(f'Viewer: http://127.0.0.1:{port} — forward the port privately in Codespaces.', flush=True)
                return record
        except (OSError, ValueError): pass
        time.sleep(0.1)
    # Only the process just created is eligible for termination.
    process.terminate()
    process.wait(timeout=5)
    raise RuntimeError('Viewer readiness failed')


def stop_server(name):
    file = session_path(name) / 'server.json'
    if not file.exists(): return
    record = read_json(file)
    if owned_server(record):
        os.kill(record['pid'], signal.SIGTERM)
        for _ in range(50):
            if not owned_server(record): break
            time.sleep(0.1)
        else: raise RuntimeError('Owned viewer did not stop; no unrelated PID was signaled')
    child = _children.pop(name, None)
    if child is not None: child.wait(timeout=5)
    atomic(session_path(name) / 'server-stopped.json', {'timeUTC': utc(), 'process': record['process']})


def make_server(name, port, token):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_): pass

        def send(self, data, content_type='application/json; charset=utf-8', code=200, attachment=None):
            self.send_response(code)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'")
            if attachment: self.send_header('Content-Disposition', f'attachment; filename="{attachment}"')
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            route = urlsplit(self.path)
            if route.query or route.fragment or '%' in route.path or '..' in route.path:
                self.send(b'{"error":"invalid route"}', code=400); return
            try:
                if route.path == '/api/health':
                    self.send(json.dumps({'session': name, 'token': token, 'readUTC': utc()}).encode())
                elif route.path == '/api/session':
                    self.send(json.dumps(snapshot(name), ensure_ascii=False).encode())
                elif route.path == '/api/events':
                    self.send(json.dumps(events(name), ensure_ascii=False).encode())
                elif route.path == '/api/artifacts':
                    self.send(json.dumps(list(artifact_index(name).values()), ensure_ascii=False).encode())
                elif re.fullmatch(r'/artifact/[a-f0-9]{24}', route.path):
                    record = artifact_index(name).get(route.path.rsplit('/', 1)[1])
                    if record is None: raise FileNotFoundError('Unregistered artifact')
                    self.send(read_artifact(evidence_root(name), record), 'text/plain; charset=utf-8')
                elif route.path in ('/download/html', '/download/package'):
                    state = public_session(name)
                    if not state['exports']: raise FileNotFoundError('No export')
                    record = state['exports'][-1]['html' if route.path.endswith('html') else 'package']
                    data = read_artifact(ROOT / 'evidence/packages', record)
                    self.send(data, 'application/octet-stream', attachment=Path(record['path']).name)
                elif route.path in ('/', '/app.js', '/style.css'):
                    file = {'/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css'}[route.path]
                    types = {'index.html': 'text/html', 'app.js': 'text/javascript', 'style.css': 'text/css'}
                    self.send((WEB / file).read_bytes(), types[file] + '; charset=utf-8')
                else: raise FileNotFoundError('Unknown route')
            except FileNotFoundError as error:
                self.send(json.dumps({'error': str(error)}).encode(), code=404)
            except (OSError, ValueError, KeyError) as error:
                self.send(json.dumps({'error': 'Evidence unavailable or integrity failure: ' + str(error)}).encode(), code=409)

        def reject(self): self.send(b'{"error":"read only"}', code=405)
        do_POST = do_PUT = do_PATCH = do_DELETE = do_OPTIONS = reject

    return ThreadingHTTPServer(('127.0.0.1', int(port)), Handler)


if __name__ == '__main__': make_server(*sys.argv[1:]).serve_forever()
