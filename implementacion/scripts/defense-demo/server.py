"""Loopback viewer; optional authenticated allowlisted actions, no arbitrary shell."""
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
import threading
import secrets
from http.cookies import SimpleCookie
import hashlib
from urllib.parse import urlsplit
from urllib.request import urlopen
import uuid
import socket

from core import (ROOT, WEB, artifact_index, atomic, boot_id, events, evidence_root,
                  public_session, read_artifact, read_json, safe_path, sanitize, session_path, utc,
                  PREPARE, F11_PREPARE, EARLY_PREPARE, LIVE, preparation_operations, display_operations, local_session_inventory, workflow_facts)

_children = {}


def snapshot(name):
    from observations import inventory
    raw = evidence_root(name)
    state = public_session(name)
    log_root=raw
    if state.get('activeFixture'):
        from cases import fixture
        child=fixture(state)
        if child and child['session']==state['activeFixture']:
            active=child.get('active')
            if active: active={**active,'attempt':state['f13Fixture']['attempt']+('-recovery' if active['operation'] in ('authorize','accept') else '')}
            state={**state,'active':active,'activeCaseSession':child['session']}
            log_root=evidence_root(child['session'])
    tail = None
    log_modified = None
    active_observed = None
    if state.get('active'):
        worker = state['active'].get('worker')
        if worker: active_observed = process_identity(worker['pid']) == worker
        op = state['active'].get('instance', state['active']['operation'])
        if re.fullmatch(r'[a-z0-9-]+', op):
            p = log_root / 'operations' / op / 'output-original.log'
            if p.is_file() and p.resolve() == p:
                with p.open('rb') as stream:
                    stream.seek(max(0, p.stat().st_size - 8192))
                    tail = sanitize(stream.read(8192).decode('utf-8', errors='replace'))
                log_modified = datetime.fromtimestamp(p.stat().st_mtime, timezone.utc).isoformat()
    from actions import public_records, records
    return {'commands': public_records(name), 'stopRequests': records(name,'stop-requests')[-100:], 'githubObservations': inventory(), 'session': state, 'events': events(name), 'catalogue': read_json(raw / 'catalogue.json'),
            'liveOperations': display_operations(state['profile']),
            'profileOperations': preparation_operations(state['profile']) + (EARLY_PREPARE if state['profile']=='defense-all' else []) + display_operations(state['profile']) + (['cleanup'] if state['profile']=='early-security' else ['resume', 'cleanup']),
            'workflows': [{**w, 'jobs': w.get('jobs', workflow_facts(w.get('yaml', '')))} for w in read_json(raw / 'workflows.json')],
            'renderer': {file: hashlib.sha256((WEB/file).read_bytes()).hexdigest() for file in ('index.html','style.css','model.js','app.js')},
            'actionsEnabled': os.environ.get('GP_DEMO_ACTIONS') == '1',
            'readUTC': utc(), 'provisionalLog': tail,
            'recorded': False, 'provisionalLogModifiedUTC': log_modified, 'activeProcessObserved': active_observed}


from actions import process_identity


def owned_server(record):
    if process_identity(record['pid']) != record['process']: return False
    try: args = Path(f"/proc/{record['pid']}/cmdline").read_bytes().split(b'\0')
    except OSError: return False
    return str(Path(__file__).resolve()).encode() in args and record['token'].encode() in args


def check_viewer_port(name, port):
    """Preflight only; the actual bind still handles concurrent port acquisition."""
    try:
        with socket.socket() as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            probe.bind(('127.0.0.1', port))
    except OSError as error:
        for record in session_path(name).parent.glob('*/server.json'):
            saved = read_json(record)
            if saved.get('port') == port and owned_server(saved):
                owner = record.parent.name
                raise RuntimeError(f'Port {port} belongs to viewer session {owner}. Reopen with serve --session {owner} --port {port}, or stop only its viewer with stop-server --session {owner}. No laboratory resources will be removed.') from error
        raise RuntimeError(f'Port {port} is unavailable. Inspect ss -ltnp or choose --port {port + 1 if port < 65535 else port - 1}; no unrelated process will be stopped.') from error


def start_server(name, port):
    file = session_path(name) / 'server.json'
    if file.exists():
        saved = read_json(file)
        if owned_server(saved):
            if saved['port'] != port: raise RuntimeError('This session already has a server on a different port')
            if saved.get('actionsEnabled', False) != (os.environ.get('GP_DEMO_ACTIONS') == '1'): raise RuntimeError('Viewer action mode differs; reopen with serve --stop-server and the desired --enable-actions option')
            print(f'Viewer: http://127.0.0.1:{port} (already running)', flush=True)
            return saved
    check_viewer_port(name, port)
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
                record = {'pid': process.pid, 'process': identity, 'port': port, 'token': token, 'session': name, 'actionsEnabled': os.environ.get('GP_DEMO_ACTIONS') == '1'}
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


def owned_worker(state):
    """A surviving recorded process group, including a bound fixture, never a name match."""
    if state.get('activeFixture'):
        from cases import fixture
        child = fixture(state)
        if not child or child['session'] != state['activeFixture']: return None
        state = child
    value = (state.get('active') or {}).get('worker')
    if not value or process_identity(value['pid']) != value: return None
    try:
        return value if os.getpgid(value['pid']) == value['pid'] else None
    except ProcessLookupError:
        return None


def action_capabilities(state, has_events, running, source_error=None):
    """Same state gate for UI and POST; the coordinator still checks sealed readiness."""
    if state.get('activeFixture') and not running: source_error='Fixture interrumpida; consulta y retira sus recursos antes de continuar'
    reasons = {key: None for key in ('prepare','check','present','step','stop','export','cleanup')}
    for key in reasons:
        if running and key != 'stop': reasons[key] = 'Otra operación sigue activa'
    if not running: reasons['stop'] = 'No hay una operación activa'
    if source_error: reasons['prepare'] = source_error
    if state.get('profile')=='defense-all':
        attempted=bool(state.get('labEvidenceRoot')) or any(op in state.get('completed',[]) for op in PREPARE) or bool(state.get('preparationDurationSeconds') is not None) or state.get('cleaned')
    else: attempted=has_events or state.get('operational') != 'PENDING'
    if attempted: reasons['prepare'] = 'Preparación ya intentada; usa una sesión nueva'
    # A cancelled readiness check may be checked again. This does not restore
    # preparation or permit presentation: the coordinator still observes it.
    if not state.get('prepared') or state.get('cleaned'): reasons['check']='Se requiere preparación conservada; no se reconstruye al comprobar'
    elif source_error: reasons['check']=source_error
    if not state.get('prepared') or state.get('operational') not in ('PREPARED','COMPLETED'):
        for key in ('present','step'): reasons[key] = 'Se requiere una preparación íntegra'
    elif source_error:
        for key in ('check','present','step'): reasons[key] = source_error
    if state.get('demoResult') == 'CONFIRMED':
        for key in ('present','step'): reasons[key] = 'Presentación consumida; usa una sesión nueva'
    if state.get('active') and not running:
        for key in ('check','present','step','prepare'): reasons[key] = 'Proceso desaparecido; falta cerrar la interrupción'
    if state.get('profile')=='early-security':
        for key in ('prepare','check','present','step'): reasons[key]='Usa la preparación y comparación del caso seleccionado'
    from cases import capabilities as case_capabilities, fixture
    child=fixture(state)
    if child and not child.get('cleaned'): reasons['cleanup']='Retira primero los recursos de la fixture F13 vinculada'
    return {**{key: {'enabled': reason is None, 'reason': reason or ''} for key, reason in reasons.items()}, **case_capabilities(state,running,source_error)}


def make_server(name, port, token):
    # Independent action credentials; the health identity cannot authorize writes.
    credential, csrf = secrets.token_hex(32), secrets.token_hex(32)
    actions = os.environ.get('GP_DEMO_ACTIONS') == '1'
    cookie_name = 'demo_action_' + name.replace('-', '_')
    busy = threading.Lock()
    from actions import Supervisor
    supervisor = Supervisor(name)
    allowed_hosts = {'127.0.0.1', 'localhost'}
    if os.environ.get('CODESPACE_NAME') and os.environ.get('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN'):
        allowed_hosts.add(os.environ['CODESPACE_NAME'] + '-' + str(port) + '.' + os.environ['GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN'])

    def capabilities(running):
        state = public_session(name)
        source_error = None
        if not running:
            from coordinator import assert_source, Stopped
            try: assert_source(state)
            except (Stopped, OSError, ValueError): source_error = 'Fuente o arranque cambiados; prepara una sesión nueva'
        return action_capabilities(state, bool(events(name)), running, source_error)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_): pass

        def authenticated(self):
            cookies = SimpleCookie()
            try: cookies.load(self.headers.get('Cookie', ''))
            except Exception: return False
            return cookie_name in cookies and secrets.compare_digest(cookies[cookie_name].value, credential)

        def valid_host(self):
            return self.headers.get('Host', '').split(':')[0] in allowed_hosts

        def send_file(self, root, record, excerpt=False):
            path = safe_path(root, record['path'])
            with path.open('rb') as stream:
                checksum = hashlib.sha256()
                size = 0
                for block in iter(lambda: stream.read(1024*1024), b''):
                    size += len(block); checksum.update(block)
                if size != record['size'] or checksum.hexdigest() != record['sha256']: raise ValueError('Artifact changed')
                stream.seek(0)
                count = min(size, 65536) if excerpt else size
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain; charset=utf-8' if excerpt else 'application/octet-stream')
                self.send_header('Content-Length', str(count))
                self.send_header('X-Content-Type-Options', 'nosniff')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('X-Evidence-SHA256', record['sha256'])
                self.send_header('X-Evidence-View', 'excerpt' if count < size else 'complete')
                if not excerpt: self.send_header('Content-Disposition', 'attachment; filename="'+re.sub(r'[^a-zA-Z0-9_.-]', '_', path.name)+'"')
                self.end_headers()
                while count:
                    block=stream.read(min(count, 1024*1024)); self.wfile.write(block); count-=len(block)


        def send(self, data, content_type='application/json; charset=utf-8', code=200, attachment=None):
            self.send_response(code)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            if actions and urlsplit(self.path).path == '/':
                self.send_header('Set-Cookie', cookie_name+'='+credential+'; HttpOnly; SameSite=Strict; Path=/'+('' if self.headers.get('Host','').split(':')[0] in ('localhost','127.0.0.1') else '; Secure'))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'")
            if attachment: self.send_header('Content-Disposition', f'attachment; filename="{attachment}"')
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if not self.valid_host(): self.send(b'{"error":"invalid host"}', code=403); return
            route = urlsplit(self.path)
            if route.query or route.fragment or '%' in route.path or '..' in route.path:
                self.send(b'{"error":"invalid route"}', code=400); return
            try:
                if route.path == '/api/control':
                    if not actions or not self.authenticated():
                        self.send(b'{}', code=403); return
                    with busy:
                        running, command = supervisor.reconcile()
                    self.send(json.dumps({'csrf': csrf, 'busy': running, 'command': command, 'capabilities': capabilities(running), 'session': name, 'nextOperation': next((op for op in LIVE[public_session(name)['profile']] if op not in public_session(name).get('completed', [])), None)}).encode())
                elif route.path == '/api/health':
                    self.send(json.dumps({'session': name, 'token': token, 'readUTC': utc()}).encode())
                elif route.path in ('/api/cleanup-plan','/api/fixture-cleanup-plan'):
                    if not actions or not self.authenticated(): self.send(b'{}', code=403); return
                    plan_name=name
                    if route.path=='/api/fixture-cleanup-plan':
                        from cases import fixture
                        child=fixture(public_session(name))
                        if not child: raise ValueError('No owned fixture')
                        plan_name=child['session']
                    if not (session_path(plan_name)/'lab-path.txt').exists():
                        self.send(json.dumps({'plan':[], 'preserved':['all evidence and session state']}).encode()); return
                    result = subprocess.check_output([sys.executable,str(ROOT/'scripts/defense-demo/ownership.py'),plan_name,'plan'], stderr=subprocess.DEVNULL)
                    self.send(result)
                elif route.path == '/api/session':
                    with busy: supervisor.reconcile()
                    self.send(json.dumps(snapshot(name), ensure_ascii=False).encode())
                elif re.fullmatch(r'/observation/[0-9]+-[a-f0-9]{12}/[a-f0-9]{64}', route.path):
                    from observations import artifact
                    _, _, capture_id, checksum = route.path.split('/')
                    self.send(artifact(capture_id, checksum), 'text/plain; charset=utf-8')
                elif route.path == '/api/sessions':
                    self.send(json.dumps(local_session_inventory(name), ensure_ascii=False).encode())
                elif route.path == '/api/events':
                    self.send(json.dumps(events(name), ensure_ascii=False).encode())
                elif route.path == '/api/artifacts':
                    self.send(json.dumps(list(artifact_index(name).values()), ensure_ascii=False).encode())
                elif re.fullmatch(r'/(?:artifact|download/artifact)/[a-f0-9]{24}', route.path):
                    record = artifact_index(name).get(route.path.rsplit('/', 1)[1])
                    if record is None: raise FileNotFoundError('Unregistered artifact')
                    self.send_file(evidence_root(name), record, excerpt=route.path.startswith('/artifact/'))
                elif route.path in ('/download/html', '/download/package'):
                    state = public_session(name)
                    if not state['exports']: raise FileNotFoundError('No export')
                    record = state['exports'][-1]['html' if route.path.endswith('html') else 'package']
                    self.send_file(ROOT / 'evidence/packages', record)
                elif route.path in ('/', '/app.js', '/model.js', '/style.css'):
                    file = {'/': 'index.html', '/app.js': 'app.js', '/model.js': 'model.js', '/style.css': 'style.css'}[route.path]
                    types = {'index.html': 'text/html', 'app.js': 'text/javascript', 'model.js': 'text/javascript', 'style.css': 'text/css'}
                    self.send((WEB / file).read_bytes(), types[file] + '; charset=utf-8')
                else: raise FileNotFoundError('Unknown route')
            except FileNotFoundError as error:
                self.send(json.dumps({'error': str(error)}).encode(), code=404)
            except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
                self.send(json.dumps({'error': 'Evidence unavailable or integrity failure: ' + str(error)}).encode(), code=409)

        def reject(self): self.send(b'{"error":"read only"}', code=405)
        def do_POST(self):
            if urlsplit(self.path).path != '/api/action': self.reject(); return
            host = self.headers.get('Host', '')
            origin = self.headers.get('Origin', '')
            if (not actions or host.split(':')[0] not in allowed_hosts or
                origin not in ('http://'+host, 'https://'+host) or
                not self.authenticated() or
                not secrets.compare_digest(self.headers.get('X-Demo-CSRF', ''), csrf)):
                self.send(b'{"error":"action authentication/origin failed"}', code=403); return
            try:
                if self.headers.get('Content-Type') != 'application/json': raise ValueError('Expected JSON action')
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= 256: raise ValueError('Invalid action size')
                body = json.loads(self.rfile.read(size))
                if set(body) != {'action'}: raise ValueError('Only enumerated action accepted')
                action = body['action']
                from cases import ACTIONS
                if action not in ('prepare','check','present','step','stop','export','cleanup') + ACTIONS: raise ValueError('Unknown action')
                with busy:
                    running, previous = supervisor.reconcile()
                    if action == 'stop':
                        self.send(json.dumps(supervisor.stop()).encode()); return
                    if running: self.send(b'{"error":"operation active"}', code=409); return
                    record = supervisor.accept(action, capabilities(running)[action])
                self.send(json.dumps({'accepted':True,'commandId':record['commandId'],'status':record['status']}).encode(),code=202)
            except (ValueError, OSError, RuntimeError) as error:
                self.send(json.dumps({'error':str(error)}).encode(), code=409)

        do_PUT = do_PATCH = do_DELETE = do_OPTIONS = reject

    return ThreadingHTTPServer(('127.0.0.1', int(port)), Handler)


if __name__ == '__main__': make_server(*sys.argv[1:]).serve_forever()
