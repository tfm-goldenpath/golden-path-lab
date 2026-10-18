"""Session identities, immutable receipts and safe evidence (standard library)."""
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import stat
import tempfile

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parent
SESSIONS = ROOT / '.tmp/defense-demo'
WEB = ROOT / 'demo'
SCHEMA = 'defense-demo/v1'
MAX_ARTIFACT = 64 * 1024 * 1024
PREPARE = ['environment', 'initialize', 'ci', 'preflight', 'infrastructure',
           'build', 'namespaces', 'manifests', 'reference', 'manifest-policy',
           'analysis', 'delivery-evidence', 'missing-results', 'admission-install', 'seal']
F11_PREPARE = [op for op in PREPARE if op not in ('missing-results', 'seal')] + ['authorize', 'comparison-ready', 'comparison-inputs', 'seal']
LIVE = {'f11-comparison': ['comparison-reference', 'f11-early', 'comparison-admission', 'comparison-legitimate'], 'defense': ['f11-early', 'f13', 'authorize', 'accept', 'f11-admission'],
        'defense-short': ['f11-early', 'f13', 'authorize', 'accept']}
ADAPTERS = set(PREPARE + F11_PREPARE + sum(LIVE.values(), []) + ['resume', 'cleanup'])
_spec = importlib.util.spec_from_file_location('lab_packager', ROOT / 'scripts/package-evidence.py')
packager = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(packager)


def utc():
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds')


def boot_id():
    return Path('/proc/sys/kernel/random/boot_id').read_text().strip()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def valid_name(name):
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', name):
        raise ValueError('Session name must contain 1–64 lowercase letters, digits or hyphens.')
    return name


def atomic(path, value):
    path = Path(path)
    if path.is_symlink() or path.parent.resolve() != path.parent.absolute():
        raise ValueError('Symlinked metadata is forbidden')
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)


def read_json(path):
    path = Path(path)
    if path.resolve() != path.absolute(): raise ValueError('Symlinked JSON metadata is forbidden')
    return json.loads(path.read_text())


@contextmanager
def locked(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        try: fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: raise RuntimeError('Another process owns this session or preparation lock')
        yield
    finally:
        os.close(fd)


def safe_path(root, relative):
    root = Path(root)
    relative = Path(relative)
    if root.resolve() != root or relative.is_absolute() or not relative.parts or any(x in ('..', '.') for x in relative.parts):
        raise ValueError('Unsafe evidence path')
    path = root / relative
    if path.resolve() != path or not path.is_relative_to(root) or not path.is_file():
        raise ValueError('Missing or symlinked evidence')
    return path


def file_record(root, path, producer, source):
    path = safe_path(root, path.relative_to(root))
    size = path.stat().st_size
    checksum = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''): checksum.update(block)
    relative = path.relative_to(root).as_posix()
    return {'id': digest(relative.encode())[:24], 'path': relative, 'size': size,
            'sha256': checksum.hexdigest(), 'format': path.suffix.lstrip('.'), 'producer': producer,
            'source': source, 'integrity': 'sha256', 'authentication': 'see-verifier-receipts',
            'semanticValidation': 'see-control-receipts', 'humanReview': 'not-requested'}


def read_artifact(root, record):
    path = safe_path(root, record['path'])
    if path.stat().st_size != record['size'] or path.stat().st_size > MAX_ARTIFACT:
        raise ValueError('Artifact size changed')
    data = path.read_bytes()
    if digest(data) != record['sha256']: raise ValueError('Artifact hash changed')
    return data


def sanitize(text):
    text = re.sub(r'-----BEGIN [^\r\n]*PRIVATE KEY-----.*?-----END [^\r\n]*PRIVATE KEY-----',
                  '[PRIVATE MATERIAL REMOVED]', text, flags=re.S)
    text = re.sub(r'(?im)(authorization\s*[:=]\s*|(?:token|password|client-key-data|client-certificate-data)\s*[:=]\s*)[^\r\n]+',
                  r'\1[REDACTED]', text)
    text = re.sub(r'\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b', '[REDACTED]', text)
    return text


def catalogue():
    data = read_json(WEB / 'catalogue.json')
    expected = {f'F{i:02}' for i in range(1, 15)} | {f'L{i:02}' for i in range(1, 7)}
    if len(data['scenarios']) != 20 or {c['id'] for c in data['scenarios']} != expected:
        raise ValueError('The academic catalogue must contain exactly twenty IDs')
    if set(data['operations']) != ADAPTERS:
        raise ValueError('Catalogue adapters differ from the executable allowlist')
    for op, spec in data['operations'].items():
        if spec.get('adapter') != op or set(spec) - {'adapter', 'title', 'stages', 'controls', 'expected', 'scenario', 'attempt', 'boundary', 'dependsOn'}:
            raise ValueError('Invalid declarative adapter metadata; commands are forbidden')
    return data


def source_identity():
    roots = ['implementacion/services/quotes-node', 'implementacion/scripts', 'implementacion/policies',
             'implementacion/tests', 'implementacion/schemas', 'implementacion/demo', '.github/workflows',
             '.devcontainer', 'implementacion/.devcontainer']
    paths = []
    for name in roots:
        paths.extend(p for p in (REPO / name).rglob('*') if p.is_file())
    paths.extend(REPO / name for name in ['implementacion/Makefile', 'implementacion/versions.env',
                 'implementacion/tools.lock.json', 'implementacion/tooling/package.json',
                 'implementacion/tooling/package-lock.json'])
    entries = []
    for p in sorted(set(paths)):
        if any(x in p.parts for x in ('__pycache__', 'node_modules', '.tools', '.tmp')): continue
        if p.is_symlink(): raise ValueError('Source contains a symbolic link: ' + str(p))
        entries.append({'path': p.relative_to(REPO).as_posix(), 'sha256': digest(p.read_bytes())})
    content_hash = digest(json.dumps(entries, sort_keys=True, separators=(',', ':')).encode())
    git = lambda *args: subprocess.check_output(['git', '-C', str(REPO), *args], text=True).strip()
    return {'commit': git('rev-parse', 'HEAD'), 'contentHash': content_hash,
            'changes': git('status', '--short'), 'files': entries,
            'scope': 'Lab source plus demo catalogue, adapters, UI, tests and configuration; generated evidence excluded'}


def outcome(code, aborted, decision):
    if aborted: return 'ABORTED', 'indeterminate', 'unconfirmed'
    if code != 0: return 'ERROR', 'indeterminate', 'unconfirmed'
    return 'COMPLETED', decision, 'confirmed'


def session_path(name):
    valid_name(name)
    path = SESSIONS / name
    if path.resolve() != path: raise ValueError('Symlinked session directory')
    return path


def evidence_root(name):
    path = ROOT / 'evidence/raw' / ('defense-' + valid_name(name))
    if path.resolve() != path: raise ValueError('Symlinked evidence directory')
    return path


def events(name):
    folder = evidence_root(name) / 'events'
    return [read_json(p) for p in sorted(folder.glob('*.json'))]


def public_session(name):
    state = read_json(session_path(name) / 'session.json')
    state.pop('sourceFiles', None)
    state.pop('captureInventory', None)
    return state


def artifact_index(name):
    from actions import records
    return {a['id']: a for e in [*events(name), *records(name), *records(name,'stop-requests')] for a in e.get('artifacts', [])}


def capture_files(source, destination, producer, previous=None):
    """Close copies before a later helper overwrites aliases. Never copy state."""
    source, destination = Path(source), Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    provenance = {}
    for p in sorted(source.rglob('*')):
        if p.is_symlink() or p.resolve() != p: raise ValueError('Symlink in laboratory evidence')
        if not p.is_file() or 'private' in p.name or p.name in ('state.json', 'config.json', 'kubeconfig', 'SHA256SUMS.txt'):
            continue
        if p.stat().st_size > MAX_ARTIFACT or not packager.shareable(p): continue
        original = p.read_bytes()
        if previous is not None and previous.get(p.relative_to(source).as_posix()) == digest(original): continue
        try: safe = sanitize(original.decode('utf-8')).encode('utf-8')
        except UnicodeError: continue
        relative = p.relative_to(source)
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(safe)
        provenance[relative.as_posix()] = {'original': source.name + '/' + relative.as_posix(),
                                         'originalSha256': digest(original), 'sanitized': safe != original,
                                         'producer': producer}
    atomic(destination / 'copy-provenance.json', provenance)
    return provenance


def publish_event(name, value):
    root = evidence_root(name)
    folder = root / 'events'
    folder.mkdir(exist_ok=True)
    if os.environ.get('GP_DEMO_COMMAND_ID'): value = {**value, 'commandId':os.environ['GP_DEMO_COMMAND_ID'], 'commandSession':os.environ.get('GP_DEMO_COMMAND_SESSION')}
    value = {**value, 'schema': SCHEMA, 'session': name, 'sequence': len(list(folder.glob('*.json'))) + 1}
    path = folder / f"{value['sequence']:06}.json"
    if path.exists(): raise ValueError('Receipt already exists')
    atomic(path, value)
    return value


def workflow_metadata():
    """Extract source facts, retaining exact YAML; this is not a workflow validator."""
    purposes = {
        'ci.yml': 'PR/push → Makefile → pruebas de servicio, contratos, entorno, políticas y bundles; F01/F02 estáticos. No ejecuta lab_create ni admisión Kubernetes.',
        'lane-a-validation.yml': 'Manual → lane-a-validation.py → demo.sh, suites demo/vulnerabilities en devcontainer → context, lab, delivery, attestations y workload. Confianza A, incluso alojado.',
        'golden-path.yml': 'Manual → demo.sh y los cinco módulos: prepare → atestaciones nativas GitHub → finish → cleanup. Vía B y GHCR; el workflow posee permisos y emisión nativa.',
        'paired-rg.yml': 'Manual → paired-rg.py → paired-delivery.sh y los cinco módulos. Plan o pares R/G; preparación fuera del temporizador. Dataset separado.'}
    values = []
    for p in sorted((REPO / '.github/workflows').glob('*.y*ml')):
        text = p.read_text()
        values.append({'file': p.name, 'sha256': digest(text.encode()), 'purpose': purposes.get(p.name, 'Consultar YAML'),
                       'triggers': re.findall(r'^  (pull_request|push|workflow_dispatch|schedule):', text, re.M),
                       'permissions': re.findall(r'^\s+(contents|packages|id-token|attestations|actions): (read|write|none)\s*$', text, re.M),
                       'timeoutsMinutes': re.findall(r'timeout-minutes: (\d+)', text),
                       'actions': re.findall(r'uses: ([^\n]+)', text),
                       'runners': re.findall(r'runs-on: ([^\n]+)', text), 'yaml': text,
                       'jobs': workflow_facts(text), 'observedRemote': False})
    return values


def local_session_inventory(bound, limit=100, max_bytes=2*1024*1024):
    """Bounded metadata only. Directory/file descriptors prohibit symlink races."""
    result = {'entries': [], 'limit': limit, 'truncated': False, 'capturedUTC': utc(),
              'scope': 'Local metadata only; actions remain bound to '+bound}
    try:
        if SESSIONS.resolve() != SESSIONS.absolute(): raise ValueError('Unsafe session root')
        rootfd = os.open(SESSIONS, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    except (OSError, ValueError):
        result['error'] = 'Session inventory unavailable'; return result
    try:
        with os.scandir(rootfd) as entries:
            for index, entry in enumerate(entries):
                if index >= limit:
                    result['truncated'] = True; break
                if entry.name.startswith('.'): continue
                try: valid_name(entry.name)
                except ValueError: continue
                record = {'session': entry.name, 'bound': entry.name == bound}
                try:
                    directory = os.open(entry.name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=rootfd)
                    try:
                        fd = os.open('session.json', os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
                        with os.fdopen(fd, 'rb') as stream:
                            info = os.fstat(stream.fileno())
                            if not stat.S_ISREG(info.st_mode) or info.st_size > max_bytes: raise ValueError('Invalid metadata size/type')
                            data = stream.read(max_bytes+1)
                            if len(data) > max_bytes: raise ValueError('Metadata too large')
                            state = json.loads(data)
                    finally: os.close(directory)
                    if not isinstance(state, dict) or state.get('session') != entry.name: raise ValueError('Identity mismatch')
                    for key in ('profile','createdUTC','operational'):
                        value = state.get(key)
                        record[key] = value[:200] if isinstance(value, str) else None
                    source = state.get('source', {})
                    record['source'] = {k: source[k][:128] for k in ('commit','contentHash') if isinstance(source, dict) and isinstance(source.get(k), str)}
                    record['prepared'] = state.get('prepared') is True
                    record['cleaned'] = state.get('cleaned') is True
                except (OSError, ValueError, TypeError, RecursionError): record['error'] = 'Invalid, unsafe or unavailable session metadata'
                result['entries'].append(record)
    finally: os.close(rootfd)
    result['entries'].sort(key=lambda x: x['session'])
    return result


def workflow_facts(text):
    """Display facts from captured YAML, not validation or execution evidence."""
    jobs = []
    section = text.split('\njobs:', 1)
    if len(section) < 2: return jobs
    for match in re.finditer(r'^  ([A-Za-z0-9_-]+):\s*\n(.*?)(?=^  [A-Za-z0-9_-]+:|\Z)', section[1], re.M | re.S):
        body = match[2]
        field = lambda key: (re.search(r'^    '+key+r':([^\n]*)', body, re.M).group(1).strip() if re.search(r'^    '+key+r':', body, re.M) else None)
        jobs.append({'id': match[1], 'runner': field('runs-on'), 'needs': field('needs'),
                     'timeoutMinutes': field('timeout-minutes'),
                     'steps': re.findall(r'^\s+- name: (.+)$', body, re.M),
                     'permissions': re.findall(r'^      (contents|packages|id-token|attestations|actions): (read|write|none)', body, re.M)})
    return jobs
