"""Validate local resource identity before resume/removal. No broad cleanup."""
import json
from pathlib import Path
import subprocess
import sys
from core import ROOT, atomic, digest, read_artifact, read_json, session_path


def command(*args):
    return subprocess.check_output(args, text=True)


def inspect(name):
    # Successful listing distinguishes absence from daemon errors.
    ids = command('docker', 'ps', '-aq', '--no-trunc', '--filter', 'name=^/' + name + '$').split()
    if not ids: return None
    value = json.loads(command('docker', 'inspect', name))[0]
    if value['Name'] != '/' + name: raise ValueError('Unexpected resource name')
    return value


def identity(state, lab, strict):
    cluster, registry, builder = (state[k] for k in ('cluster', 'registry', 'builder'))
    registry_value = inspect(registry)
    node = inspect(cluster + '-control-plane')
    build = inspect('buildx_buildkit_' + builder + '0')
    if strict and (registry_value is None or node is None): raise ValueError('Prepared infrastructure is missing')
    for value, label, expected in ((registry_value, 'tfm.lab', cluster), (node, 'io.x-k8s.kind.cluster', cluster),
                                    (build, 'com.docker.buildx.builder', builder)):
        if value and label != 'com.docker.buildx.builder' and value['Config']['Labels'].get(label) != expected:
            raise ValueError('Resource ownership mismatch')
        if strict and value and not value['State']['Running']: raise ValueError('Prepared resource stopped')
    if registry_value and 'imageRepository' in state:
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
        result['preparedEvidenceHashes'] = {name: digest((lab / name).read_bytes()) for name in protected}
        result['clusterUID'] = read_json(lab / 'prepared-cluster.json')['metadata']['uid']
    return result


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
        atomic(seal, identity(state, lab, True))
    elif action == 'check':
        if identity(state, lab, True) != read_json(seal): raise ValueError('Prepared identity changed')
    elif action == 'cleanup-check':
        actual = identity(state, lab, False)
        if seal.exists():
            saved = read_json(seal)
            for key in ('clusterContainer', 'registryContainer', 'builderContainer'):
                if actual[key] is not None and actual[key] != saved[key]: raise ValueError('Replacement resource is not owned')
    elif action == 'package-check':
        saved = read_json(session / 'session.json')
        if not saved['exports'] or not saved['exports'][-1]['verified']: raise ValueError('No verified export before removal')
        read_artifact(ROOT / 'evidence/packages', saved['exports'][-1]['package'])
    elif action == 'absent':
        actual = identity(state, lab, False)
        if any(actual[k] for k in ('clusterContainer', 'registryContainer', 'builderContainer')):
            raise ValueError('Owned containers remain')
        # Buildx stores this builder in the private DOCKER_CONFIG. Running even
        # `buildx ls` after removal recreates that directory; absence of both its
        # container and private metadata establishes removal without recreating it.
        if Path(state['private']).exists(): raise ValueError('Private run directory remains')
        atomic(lab / 'cleanup-absence.json', {'status': 'CONFIRMED', 'containersAbsent': True, 'builderAbsent': True, 'privateDirectoryAbsent': True})
    else: raise ValueError('Unknown ownership action')


if __name__ == '__main__': main(*sys.argv[1:])
