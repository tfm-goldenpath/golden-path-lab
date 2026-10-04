"""Predefined scenario transformations. No delivery operations or human decisions."""
import copy
import json
from pathlib import Path
import shutil

from manual_tasks import SCRIPTED, clock, sha256, write_json

FIXTURES = Path(__file__).resolve().parents[1] / 'tests/fixtures/vulnerabilities'


def input_hashes(directory):
    if directory.resolve() != directory.absolute(): raise ValueError('Symlinked input directory')
    result = {}
    for path in sorted(directory.rglob('*')):
        if path.is_symlink(): raise ValueError('Symlinked task input')
        if path.is_file(): result[path.relative_to(directory).as_posix()] = sha256(path)
    return result


def preserve_original(task):
    """Called once after preparation; all original bytes also fit in safe JSON."""
    hashes = input_hashes(task / 'participant')
    shutil.copytree(task / 'participant', task / 'operator/original')
    write_json(task / 'operator/original-inputs.json', {
        **SCRIPTED, 'created': clock(), 'hashes': hashes,
        'contents': {name: (task / 'participant' / name).read_text() for name in hashes}})


def original(task):
    value = json.loads((task / 'operator/original-inputs.json').read_text())
    if input_hashes(task / 'operator/original') != value['hashes']:
        raise ValueError('Original inputs changed')
    for name, text in value['contents'].items():
        if (task / 'operator/original' / name).read_text() != text:
            raise ValueError('Original byte record changed')
    return value


def transformation(task, scenario):
    before = original(task)['contents']
    after = copy.deepcopy(before)
    def read(name): return json.loads(before[name])
    def put(name, value): after[name] = json.dumps(value, indent=2) + '\n'
    if scenario == 'F03':
        package, lock = read('source/package.json'), read('source/package-lock.json')
        fixed = json.loads((FIXTURES / 'f03-repaired/package-lock.json').read_text())
        dependency = fixed['packages']['node_modules/minimist']
        if package['dependencies'] != {'minimist': '1.2.5'} or dependency['version'] != '1.2.8':
            raise ValueError('Scenario dependency differs from the bounded repair')
        package['dependencies']['minimist'] = dependency['version']
        lock['packages']['']['dependencies']['minimist'] = dependency['version']
        lock['packages']['node_modules/minimist'] = dependency
        put('source/package.json', package); put('source/package-lock.json', lock)
        description = 'Set minimist to 1.2.8; use repaired fixture lock entry; preserve package identity and wrappers'
    elif scenario == 'F10':
        authorized = before['authorized-artifact.txt']
        prepared = json.loads((task / 'operator/prepared.json').read_text())
        if authorized.strip() != prepared['authorizedArtifact']:
            raise ValueError('Authorized catalog differs from preparation')
        after['image.txt'] = authorized
        description = 'Copy this task read-only authorized-artifact.txt reference to image.txt'
    elif scenario == 'F11':
        manifest = read('manifest.json')
        containers = manifest['spec']['template']['spec']['containers']
        targets = [c for c in containers if c['name'] == 'quotes-node']
        if len(targets) != 1: raise ValueError('Expected one quotes-node container')
        security = targets[0]['securityContext']
        for field in ('privileged', 'allowPrivilegeEscalation'):
            if security[field] is not True: raise ValueError('Original privilege fault missing')
            security[field] = False
        put('manifest.json', manifest)
        description = 'Set only quotes-node privileged and allowPrivilegeEscalation to false'
    else: raise ValueError('Unknown bounded repair')
    return before, after, description


def repair(task, record):
    if (any(record.get(k) != v for k, v in SCRIPTED.items()) or record['status'] != 'REVIEW'
            or not record.get('detection') or (task / 'SHA256SUMS.txt').exists()):
        raise ValueError('Repair requires an unsealed detected scripted task')
    receipt = task / 'operator/repair.json'
    if receipt.exists() or (task / 'operator/repair-started.json').exists():
        raise ValueError('Never silently repeat an attempted repair')
    before, after, description = transformation(task, record['scenario'])
    if input_hashes(task / 'participant') != original(task)['hashes']:
        raise ValueError('Participant input changed outside the scripted repair')
    value = {**SCRIPTED, 'scenario': record['scenario'], 'started': clock(),
             'transformation': description, 'before': input_hashes(task / 'participant')}
    write_json(task / 'operator/repair-started.json', value)
    for name in before:
        if before[name] != after[name]:
            (task / 'participant' / name).write_text(after[name])
    value.update(finished=clock(), after=input_hashes(task / 'participant'))
    write_json(receipt, value)
    verify_repair(task, record)
    return value


def verify_repair(task, record):
    value = json.loads((task / 'operator/repair.json').read_text())
    before, expected, description = transformation(task, record['scenario'])
    if (any(value.get(k) != v for k, v in SCRIPTED.items()) or value['scenario'] != record['scenario']
            or value['before'] != original(task)['hashes'] or value['after'] != input_hashes(task / 'participant')
            or value['transformation'] != description or set(expected) != set(value['after'])):
        raise ValueError('Repair identity or hashes changed')
    for name, text in expected.items():
        if (task / 'participant' / name).read_text() != text:
            raise ValueError('Repair changed properties outside the permitted transformation: ' + name)
    return value
