"""Validate local resource identity before resume/removal. No broad cleanup."""
import json
from pathlib import Path
import subprocess
import sys
from core import ROOT, atomic, digest, file_record, read_json, session_path, utc


def command(*args):
    return subprocess.check_output(args, text=True)


def inspect(name):
    # Successful listing distinguishes absence from daemon errors.
    ids = command('docker', 'ps', '-aq', '--no-trunc', '--filter', 'name=^/' + name + '$').split()
    if not ids: return None
    value = json.loads(command('docker', 'inspect', name))[0]
    if value['Name'] != '/' + name: raise ValueError('Unexpected resource name')
    return value


def identity(state, lab, strict, profile=None):
    cluster, registry, builder = (state[k] for k in ('cluster', 'registry', 'builder'))
    registry_value = inspect(registry)
    node = inspect(cluster + '-control-plane')
    build = inspect('buildx_buildkit_' + builder + '0')
    if strict and (registry_value is None or node is None): raise ValueError('Prepared infrastructure is missing')
    for value, label, expected in ((registry_value, 'tfm.lab', cluster), (node, 'io.x-k8s.kind.cluster', cluster),
                                    (build, 'com.docker.buildx.builder', builder)):
        labels = (value.get('Config', {}).get('Labels') or {}) if value else {}
        if value and (label != 'com.docker.buildx.builder' or label in labels) and labels.get(label) != expected:
            raise ValueError('Resource ownership mismatch')
        if strict and value and not value['State']['Running']: raise ValueError('Prepared resource stopped')
    if build and build['Config'].get('Image') != read_json(ROOT / 'tools.lock.json')['images']['buildkit']['reference']:
        raise ValueError('Builder image differs from the pinned laboratory resource')
    # Readiness requires the prepared address; retirement uses immutable IDs
    # and labels in cleanup_plan. A stopped registry can have no assigned IP.
    if strict and registry_value and 'imageRepository' in state:
        ip = registry_value['NetworkSettings']['Networks']['kind']['IPAddress']
        if not state['imageRepository'].startswith(ip + ':5000/quotes-node-run-'):
            raise ValueError('Registry identity or address changed')
    result = {'clusterContainer': node['Id'] if node else None, 'registryContainer': registry_value['Id'] if registry_value else None,
              'builderContainer': build['Id'] if build else None, 'digest': state.get('digest')}
    if strict:
        private = Path(state['private'])
        result['trustHashes'] = {name: digest((folder / name).read_bytes()) for folder, name in (
            (private, 'cosign.key'), (private, 'cosign.pub'), (private, 'kubeconfig'), (lab, 'development-public-key.pem'),
            (lab, 'local-signing-config.json'), (lab, 'local-trusted-root.json'))}
        result['stateHash'] = digest((lab / 'state.json').read_bytes())
        protected = ('tfm-golden.json', 'tfm-reference.json', 'sbom.cdx.json', 'vulnerabilities.json',
                     'analysis.json', 'analysis-association.json', 'database-identity.json', 'manifest-policy.json',
                     'workflow-policy.json', 'unit-tests.log', 'build-inputs.json', 'build-metadata.json',
                     'image.bundle.json', 'sbom.bundle.json', 'provenance.bundle.json', 'admission-policies.json')
        # In defense-all these inputs are captured after recovery, not at sealing.
        if (lab / 'comparison').is_dir() and profile != 'defense-all':
            protected += ('results.bundle.json', 'results-predicate.json', 'F11-privileged.json', 'comparison/reference.json', 'comparison/diff.json')
        result['preparedEvidenceHashes'] = {name: digest((lab / name).read_bytes()) for name in protected}
        result['clusterUID'] = read_json(lab / 'prepared-cluster.json')['metadata']['uid']
    return result


def cleanup_plan(name, session, lab, state, actual):
    sealed = session / 'ownership.json'
    journal = session / 'resource-ownership.json'
    if not sealed.exists() and not journal.exists():
        if any(actual[k] for k in ('clusterContainer','registryContainer','builderContainer')):
            raise ValueError('No recorded resource ownership; refusing name-only removal')
    saved = read_json(sealed if sealed.exists() else journal) if sealed.exists() or journal.exists() else {}
    plan = []
    for key, resource in (('clusterContainer', state['cluster']+'-control-plane'),
                          ('registryContainer', state['registry']),
                          ('builderContainer', 'buildx_buildkit_'+state['builder']+'0')):
        identifier = actual[key]
        if identifier and identifier != saved.get(key): raise ValueError('Resource differs from recorded immutable ID')
        if identifier:
            for other in [*session.parent.glob('*/ownership.json'), *session.parent.glob('*/resource-ownership.json')]:
                if other.parent != session and identifier in read_json(other).values():
                    raise ValueError('Resource referenced by another retained session')
        plan.append({'owner':name, 'resource':identifier, 'name':resource,
                     'estimatedBytes':None, 'sizeStatus':'unknown; no inferred reclaimed space',
                     'reason':'Retire this preparation; immutable ID and run labels checked',
                     'action':'remove container' if identifier else 'already absent'})
    return {'UTC':utc(), 'plan':plan, 'before':actual, 'status':'PLANNED',
            'preserved':['evidence/**','operations','exports','reviews','plans','snapshots','private state','Docker volumes and image caches'],
            'directoryDeletion':False}


def retire(name, session, lab, state):
    from server import process_identity
    active = read_json(session / 'session.json').get('active') or {}
    worker = active.get('worker')
    if active.get('operation') != 'cleanup' and worker and process_identity(worker['pid']) == worker:
        raise ValueError('An owned operation is active; stop it before retiring infrastructure')
    before = identity(state, lab, False)
    value = cleanup_plan(name, session, lab, state, before)
    folder = session / 'cleanup-receipts'
    folder.mkdir(exist_ok=True)
    number = len(list(folder.glob('*.json'))) + 1
    receipt = folder / f'{number:04}.json'
    atomic(receipt, value)
    value['status'] = 'INCOMPLETE'
    try:
        for item in value['plan']:
            if item['resource']: command('docker','rm','-f',item['resource'])
        after = identity(state, lab, False)
        value['after'] = after
        if any(after[k] for k in ('clusterContainer','registryContainer','builderContainer')):
            raise ValueError('Owned containers remain')
        value['status'] = 'REMOVED'
    finally:
        atomic(receipt, value)
        # Shareable receipt also accompanies the laboratory originals.
        atomic(lab / f'defense-cleanup-{number:04}.json', value)


def main(name, action):
    session = session_path(name)
    lab = Path((session / 'lab-path.txt').read_text().strip())
    if lab.parent != ROOT / 'evidence/raw' or lab.resolve() != lab or not lab.name.startswith('run-'):
        raise ValueError('Invalid lab owner path')
    state = read_json(lab / 'state.json')
    if state['mode'] != 'local': raise ValueError('This demo supports lane A only')
    seal = session / 'ownership.json'
    if action == 'seal':
        if seal.exists(): raise ValueError('Preparation cannot be resealed')
        atomic(seal, identity(state, lab, True, read_json(session / 'session.json').get('profile')))
    elif action == 'check':
        if identity(state, lab, True, read_json(session / 'session.json').get('profile')) != read_json(seal): raise ValueError('Prepared identity changed')
    elif action == 'cleanup-check':
        actual = identity(state, lab, False)
        if seal.exists():
            saved = read_json(seal)
            for key in ('clusterContainer', 'registryContainer', 'builderContainer'):
                if actual[key] is not None and actual[key] != saved[key]: raise ValueError('Replacement resource is not owned')
    elif action == 'claim':
        target = session / 'resource-absence.json'
        if target.exists(): raise ValueError('Infrastructure creation was already attempted')
        actual = identity(state, lab, False)
        if any(actual[k] for k in ('clusterContainer','registryContainer','builderContainer')): raise ValueError('A requested resource already exists')
        atomic(target, actual)
    elif action == 'checkpoint':
        if not (session / 'resource-absence.json').is_file(): raise ValueError('No pre-creation absence record')
        actual = identity(state, lab, False)
        journal = session / 'resource-ownership.json'
        saved = read_json(journal) if journal.exists() else {}
        for key in ('clusterContainer','registryContainer','builderContainer'):
            if saved.get(key) and saved[key] != actual[key]: raise ValueError('Resource identity changed during preparation')
        atomic(journal, actual)
    elif action == 'plan':
        print(json.dumps(cleanup_plan(name, session, lab, state, identity(state, lab, False))))
    elif action in ('recovery-cleanup', 'retire'):
        retire(name, session, lab, state)
    elif action == 'package-check':
        saved = read_json(session / 'session.json')
        if not saved['exports'] or not saved['exports'][-1]['verified']: raise ValueError('No verified export before removal')
        record = saved['exports'][-1]['package']
        if file_record(ROOT / 'evidence/packages', ROOT / 'evidence/packages' / record['path'], 'check', '')['sha256'] != record['sha256']: raise ValueError('Export changed')
    elif action == 'absent':
        actual = identity(state, lab, False)
        if any(actual[k] for k in ('clusterContainer', 'registryContainer', 'builderContainer')):
            raise ValueError('Owned containers remain')
        # Buildx stores this builder in the private DOCKER_CONFIG. Running even
        # `buildx ls` after removal recreates that directory; absence of both its
        # container and private metadata establishes removal without recreating it.
        if not (session / 'cleanup-receipts').exists() and Path(state['private']).exists(): raise ValueError('Private run directory remains')
        atomic(lab / 'cleanup-absence.json', {'status': 'CONFIRMED', 'containersAbsent': True, 'builderAbsent': True, 'privateDirectoryAbsent': not Path(state['private']).exists()})
    else: raise ValueError('Unknown ownership action')


if __name__ == '__main__': main(*sys.argv[1:])
