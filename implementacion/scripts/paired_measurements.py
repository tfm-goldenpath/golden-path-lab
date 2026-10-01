"""Versioned paired observations. Pure validation/statistics; no delivery decisions."""
import hashlib
import json
import math
import re
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path

PROTOCOL = 'paired-rg/v1'
WORKFLOW = 'tfm-goldenpath/golden-path-lab/.github/workflows/paired-rg.yml@refs/heads/main'

def read(path):
    return json.loads(Path(path).read_text())

def write(path, value):
    path = Path(path)
    if path.is_symlink():
        raise ValueError('Symlinked measurement output')
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.next')
    if tmp.exists():
        raise ValueError('Unfinished measurement write')
    tmp.write_text(json.dumps(value, indent=2) + '\n')
    tmp.replace(path)

def identity(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def required_fields_match(expected, observed):
    """Allow API defaults while preserving every explicit desired field."""
    if isinstance(expected,dict):
        return isinstance(observed,dict) and all(k in observed and required_fields_match(v,observed[k]) for k,v in expected.items())
    if isinstance(expected,list):
        return isinstance(observed,list) and len(expected)==len(observed) and all(required_fields_match(a,b) for a,b in zip(expected,observed))
    return type(expected)==type(observed) and expected==observed

def stamp():
    return {'utc': datetime.now(timezone.utc).isoformat(), 'monotonicNs': time.monotonic_ns(),
            'bootId': Path('/proc/sys/kernel/random/boot_id').read_text().strip()}

def elapsed(a, b):
    if a['bootId'] != b['bootId'] or b['monotonicNs'] < a['monotonicNs']:
        raise ValueError('Clock continuity lost')
    return (b['monotonicNs'] - a['monotonicNs']) / 1e9

def event(record, name, action, code=None, now=None):
    now = now or stamp()
    phases = record.setdefault('phases', {})
    if action == 'start':
        if name in phases or any('end' not in p for p in phases.values()):
            raise ValueError('Duplicate or overlapping phase')
        phases[name] = {'start': now}
    elif action == 'end':
        p = phases[name]
        if 'end' in p or not isinstance(code, int):
            raise ValueError('Duplicate or incomplete phase result')
        p.update(end=now, seconds=elapsed(p['start'], now), exitCode=code)
    else:
        raise ValueError('Unknown timing action')
    return record

def classify(record):
    # Missing measurements are null, never fast successes.
    admission = record.get('admission', {})
    if record.get('externalFailure') or record.get('invalidReason'):
        return 'invalid'
    if record.get('policyRejected') or admission.get('outcome') == 'REJECTED':
        return 'valid-unfavorable'
    if record.get('failureExitCode'):return 'indeterminate'
    if admission.get('outcome') == 'ACCEPTED' and record.get('functional') == 'PASS' and record.get('cacheValidated') is True:
        phases=record.get('phases', {})
        required={'service-tests','build','manifest','admission','rollout','http'}
        if record.get('configuration')=='G':
            required.update({'workflow-policy','manifest-policy','analysis','native-provenance','verify-delivery','authorize-results'})
        if not required.issubset(phases):return 'indeterminate'
        if all(p.get('exitCode') == 0 and 'end' in p for p in phases.values()) and record.get('primarySeconds') is not None:
            try:
                duration=elapsed(record['primaryStart'],record['primaryEnd'])
                if duration<=0 or duration!=record['primarySeconds']:return 'indeterminate'
                if record['primaryEnd']!=phases['admission']['end']:return 'indeterminate'
            except (KeyError,ValueError,TypeError):return 'indeterminate'
            return 'valid-favorable'
    return 'indeterminate'

def new_record(pair, arm):
    if arm not in 'RG' or len(arm) != 1:
        raise ValueError('Unknown arm')
    return {'schema': 'paired-rg-observation/v1', 'protocol': PROTOCOL,
            **{k: pair[k] for k in ('planIdentity', 'dataset', 'pair', 'order', 'attempt', 'source', 'warmupSource', 'runId')},
            'configuration': arm, 'primarySeconds': None, 'admission': {'outcome': 'NOT_EXECUTED'},
            'functional': 'NOT_EXECUTED', 'classification': 'indeterminate', 'phases': {}}

def validate_source(env, head, dirty, warm_tree, target_tree):
    if env.get('GITHUB_ACTIONS') != 'true' or env.get('GITHUB_EVENT_NAME') != 'workflow_dispatch':
        raise ValueError('Real manually dispatched lane B required')
    if env.get('GITHUB_WORKFLOW_REF') != WORKFLOW or env.get('GITHUB_REF') != 'refs/heads/main':
        raise ValueError('Unapproved exact measurement workflow identity')
    if not re.fullmatch('[a-f0-9]{40}', head) or head != env.get('GITHUB_SHA') or dirty:
        raise ValueError('Measured source must be the clean native workflow revision')
    if warm_tree == target_tree:
        raise ValueError('Warmup must differ in actual application source')
    if env.get('GITHUB_RUN_ATTEMPT') != '1':
        raise ValueError('Job reruns prohibited; use reviewed full-pair retry')

def cache_evidence(text):
    vertices = {}
    for line in text.splitlines():
        match = re.match(r'(#\d+) (.*)', line)
        if match:
            vertices.setdefault(match[1], []).append(match[2])
    changed = [v for v in vertices.values() if any(re.search(r'COPY .*src/ .*src/', l) for l in v)]
    reused = [v for v in vertices.values() if any('RUN rm -rf /usr/local/lib/node_modules' in l for l in v)]
    if len(changed) != 1 or 'CACHED' in changed[0] or not any(l.startswith('DONE') for l in changed[0]):
        raise ValueError('Changed application COPY must demonstrably rebuild')
    if not reused or not all('CACHED' in v for v in reused):
        raise ValueError('Expected base preparation cache reuse missing')
    return {'changedApplicationLayerRebuilt': True, 'basePreparationReused': True,
            'cachedVertices': sum('CACHED' in v for v in vertices.values()), 'vertices': len(vertices)}

def retry_ticket(previous, cause, evidence, reviewer):
    if previous.get('schema')!='paired-rg-pair/v1' or previous['attempt'] != 1 or previous.get('retryOf') or not reviewer.strip():
        raise ValueError('Only one reviewed full-pair retry is allowed')
    if cause not in ('registry-outage', 'runner-loss', 'network-outage'):
        raise ValueError('Not an external failure category')
    if not evidence.strip() or previous.get('status') == 'PASS':
        raise ValueError('External failure evidence required; never retry successful pairs')
    if any(a.get('classification') in ('valid-unfavorable', 'valid-favorable') for a in previous.get('arms', {}).values()) and not any(a.get('classification') == 'indeterminate' for a in previous.get('arms', {}).values()):
        raise ValueError('Unfavorable controls or durations do not authorize a retry')
    return {'schema': 'paired-rg-retry/v1', 'previousRun': previous['runId'], 'attempt': 2,
            'order': previous['order'], 'source': previous['source'], 'planIdentity': previous['planIdentity'],
            'cause': cause, 'evidenceSha256': hashlib.sha256(evidence.encode()).hexdigest(), 'reviewedBy': reviewer}

def summarize(pairs):
    if len({p['dataset'] for p in pairs}) > 1:
        raise ValueError('Do not pool development, pilot and campaign')
    if len({p['source'] for p in pairs})>1 or len({p['planIdentity'] for p in pairs})>1:
        raise ValueError('Do not pool source revisions or plans')
    if len({identity(p['frozenDatabase']) for p in pairs if p.get('frozenDatabase')})>1:
        raise ValueError('Do not pool frozen databases')
    rows = []
    keys = set()
    for p in pairs:
        if p.get('order') not in ('RG','GR') or p.get('attempt') not in (1,2):
            raise ValueError('Invalid pair order or retry count')
        if p['attempt']==2:
            originals=[q for q in pairs if q['pair']==p['pair'] and q['attempt']==1 and q['runId']==p.get('retryOf')]
            if len(originals)!=1 or originals[0]['order']!=p['order'] or originals[0].get('status')=='PASS':
                raise ValueError('Retry requires its original failed attempt with the same order')
        key = (p['planIdentity'], p['pair'], p['attempt'])
        if key in keys:
            raise ValueError('Duplicate pair attempt')
        keys.add(key)
        arms = p.get('arms', {})
        for c, arm in arms.items():
            if c not in ('R','G') or arm.get('configuration')!=c or arm.get('protocol')!=PROTOCOL:
                raise ValueError('Mismatched arm identity')
            for field in ('planIdentity','dataset','pair','order','attempt','source','warmupSource','runId'):
                if arm.get(field)!=p.get(field):raise ValueError('Mismatched arm '+field)
        good = p.get('status')=='PASS' and all(classify(arms.get(c, {})) == 'valid-favorable' for c in 'RG')
        row = {'pair': p['pair'], 'attempt': p['attempt'], 'order': p['order'], 'included': good,
               'absoluteSeconds': None, 'relativePercent': None}
        if good:
            r, g = [arms[c]['primarySeconds'] for c in 'RG']
            if not all(isinstance(v, (int,float)) and math.isfinite(v) and v > 0 for v in (r,g)):
                raise ValueError('Invalid primary duration')
            row.update(absoluteSeconds=g-r, relativePercent=100*(g-r)/r)
        rows.append(row)
    values = [r['absoluteSeconds'] for r in rows if r['included']]
    relatives = [r['relativePercent'] for r in rows if r['included']]
    median = statistics.median(values) if values else None
    return {'schema':'paired-rg-analysis/v1', 'attempts':len(rows), 'completeFavorablePairs':len(values),
            'excludedAttempts':len(rows)-len(values), 'rows':rows, 'medianDifferenceSeconds':median,
            'medianRelativePercent':statistics.median(relatives) if relatives else None,
            'medianAbsoluteDeviationSeconds':statistics.median(abs(v-median) for v in values) if values else None,
            'rangeSeconds':[min(values),max(values)] if values else None,
            'observedActionsJobMinutes':sum(p.get('actionsJobMinutes') or 0 for p in pairs) if all(p.get('actionsJobMinutes') is not None for p in pairs) else None,
            'billedMinutes':None,'monetaryExpenditure':None,'sharedPreparationAllocation':'none; reported separately'}


def cache_manifest(directory):
    root=Path(directory)
    if root.is_symlink() or not (root/'index.json').is_file():raise ValueError('Missing or symlinked cache')
    files={}
    for file in sorted(root.rglob('*')):
        if file.is_symlink():raise ValueError('Symlinked cache member')
        if file.is_file():
            digest=hashlib.sha256()
            with file.open('rb') as stream:
                for chunk in iter(lambda:stream.read(1024*1024),b''):digest.update(chunk)
            files[str(file.relative_to(root))]=digest.hexdigest()
    return files


def pilot_plan(seed):
    slots=['RG','RG','GR','GR']
    sequence=sorted(enumerate(slots),key=lambda x:hashlib.sha256(f'{seed}:{x[0]}'.encode()).hexdigest())
    return {'schema':'paired-rg-plan/v1','protocol':PROTOCOL,'dataset':'pilot','seed':seed,
            'randomization':'sort four labelled balanced slots by SHA256(seed:slot), ascending',
            'pairs':[{'pair':i+1,'order':x[1]} for i,x in enumerate(sequence)],
            'execution':'NOT_EXECUTED','humanReview':'pending'}
