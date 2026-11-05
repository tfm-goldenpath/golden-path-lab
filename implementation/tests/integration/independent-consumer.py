#!/usr/bin/env python3
"""Real separate-repository acceptance; retains every attempt, never dispatches hosted work."""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess

REPO = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('product_boundary', Path(__file__).with_name('product-boundary.py'))
boundary = importlib.util.module_from_spec(spec)
spec.loader.exec_module(boundary)

def run(args, cwd, log=None):
    return subprocess.run(args, cwd=cwd, check=True, text=True, stdout=log, stderr=subprocess.STDOUT if log else None)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--run', action='store_true')
    args = parser.parse_args()
    output = args.output
    if not output.is_absolute() or output.resolve() != output or output.exists():
        parser.error('Use a fresh canonical absolute output directory')
    output.mkdir(parents=True)
    engine, consumer = output/'engine', output/'consumer'
    receipt = boundary.export(engine)
    run(['git', 'remote', 'add', 'origin', 'https://github.com/tfm-goldenpath/golden-path-lab'], engine)
    run(['bash', str(engine/'bin/deliver'), 'init', str(consumer), '--repository',
         'https://example.invalid/golden-path-consumer-validation', '--engine-commit', receipt['commit']], Path('/tmp'))
    run(['git', 'init', '-q'], consumer)
    run(['git', 'add', '.'], consumer)
    run(['git', '-c', 'user.name=Local validation fixture', '-c', 'user.email=fixture@example.invalid',
         'commit', '-qm', 'Initialize independent consumer validation source'], consumer)
    consumer_commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=consumer, text=True).strip()
    assert consumer_commit != receipt['commit']
    receipt.update(consumerCommit=consumer_commit, consumerRoot=str(consumer), engineRoot=str(engine),
                   consumerRepository='https://example.invalid/golden-path-consumer-validation',
                   remoteOriginVerified=False, identityScope='Declared local test identity; no remote source host or OIDC verification')
    record = output/'acceptance.json'
    record.write_text(json.dumps(receipt, indent=2)+'\n')
    if not args.run:
        return
    # Operator must inspect workspace, actual Docker root and /tmp before invoking.
    # The real coordinator independently enforces its unchanged capacity reserves.
    with (output/'installation.log').open('w') as log:
        run(['npm', 'ci', '--prefix', 'implementation/tooling', '--ignore-scripts', '--no-audit', '--no-fund'], engine, log)
    with (output/'check.log').open('w') as log:
        run(['bash', str(engine/'bin/deliver'), 'check', '--consumer', str(consumer)], consumer, log)
    with (output/'delivery.log').open('w') as log:
        status = subprocess.run(['bash', str(engine/'bin/deliver'), 'local', '--consumer', str(consumer)], cwd='/tmp', stdout=log, stderr=subprocess.STDOUT).returncode
    receipt.update(delivery='PASS' if status == 0 else 'FAILED', exitStatus=status)
    record.write_text(json.dumps(receipt, indent=2)+'\n')
    if status:
        raise SystemExit(status)
    states = list((engine/'implementation/evidence/raw').glob('delivery-*'))
    assert len(states) == 1
    state = states[0]
    assert json.loads((state/'finalization.json').read_text())['status'] == 'PASS'
    captured = json.loads((state/'consumer-inputs.json').read_text())
    assert captured['commit'] == consumer_commit and captured['binding']['engineCommit'] == receipt['commit']
    for filename, get_binding in [('verified-provenance.json', lambda p: p['buildDefinition']['externalParameters']['goldenPath']),
                                  ('verified-results.json', lambda p: p['goldenPath'])]:
        assert get_binding(json.loads((state/filename).read_text())['predicate']) == captured['binding']
    archive = engine/'implementation/evidence/packages'/(state.name+'.tar.gz')
    verified = json.loads(subprocess.check_output(['python3', str(engine/'src/verify_package.py'), str(archive)], text=True))
    assert (state/'.resources-retired').exists()
    receipt.update(stateDirectory=str(state), archive=str(archive), archiveVerification=verified, resourcesRetired=True)
    record.write_text(json.dumps(receipt, indent=2)+'\n')
    print(json.dumps(receipt, indent=2))

if __name__ == '__main__':
    main()
