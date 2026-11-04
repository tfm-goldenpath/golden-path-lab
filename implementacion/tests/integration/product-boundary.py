#!/usr/bin/env python3
"""Export the committed delivery closure as a genuine sparse checkout.

This helper never deletes the export: failed runs, DBs and private recovery state
must remain available. --run performs ONE actual delivery with no substituted stages.
"""
import argparse
import json
from pathlib import Path
import subprocess

REPOSITORY = Path(__file__).resolve().parents[3]

def command(*args, cwd=REPOSITORY):
    return subprocess.check_output(args, cwd=cwd, text=True).strip()

def export(destination):
    destination = Path(destination)
    if not destination.is_absolute() or destination.resolve() != destination or destination.exists():
        raise ValueError('Use a fresh canonical absolute export directory')
    if command('git', 'diff', 'HEAD', '--name-only'):
        raise ValueError('Commit candidate changes before the boundary export')
    commit = command('git', 'rev-parse', 'HEAD')
    # The actual committed capture function is the single input selection.
    selection = json.loads(command('node', '--input-type=module', '-e',
        "import {deliverySources} from './src/delivery-source.mjs'; console.log(JSON.stringify(deliverySources))"))
    paths = [str((REPOSITORY/'implementacion'/p).resolve().relative_to(REPOSITORY)) for p in selection]
    destination.mkdir(parents=True)
    command('git', 'init', '-q', str(destination))
    command('git', 'fetch', '--quiet', '--depth=1', '--no-tags', REPOSITORY.as_uri(), commit, cwd=destination)
    command('git', 'sparse-checkout', 'init', '--no-cone', cwd=destination)
    command('git', 'sparse-checkout', 'set', '--no-cone', '--', *('/'+p for p in paths), cwd=destination)
    command('git', 'checkout', '--quiet', '--detach', 'FETCH_HEAD', cwd=destination)
    assert command('git', 'rev-parse', 'HEAD', cwd=destination) == commit
    assert not command('git', 'diff', 'HEAD', '--name-only', cwd=destination)
    absent = ['lab', 'implementacion/tests', 'implementacion/demo', 'implementacion/evidence',
              'implementacion/scripts/demo.sh', 'implementacion/scripts/lib',
              'implementacion/scripts/paired-delivery.sh', 'implementacion/scripts/defense-demo']
    for name in absent:
        if (destination/name).exists(): raise ValueError('Laboratory input exported: '+name)
    receipt = {'schema':'product-boundary-export/v1','commit':commit,'sourceRepository':str(REPOSITORY),
               'layout':'genuine sparse checkout; selected tracked bytes at original commit',
               'paths':paths,'absent':absent,'delivery':'NOT_EXECUTED'}
    (destination/'.git/product-boundary.json').write_text(json.dumps(receipt,indent=2)+'\n')
    return receipt

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--run',action='store_true')
    args=parser.parse_args()
    receipt=export(args.output)
    print(json.dumps(receipt,indent=2),flush=True)
    if args.run:
        # Install the same locked validation dependencies only inside this export.
        subprocess.run(['npm','ci','--prefix','implementacion/tooling','--ignore-scripts','--no-audit','--no-fund'],cwd=args.output,check=True)
        with (args.output/'.git/delivery-console.log').open('w') as log:
            result=subprocess.run(['bash','bin/deliver','local'],cwd=args.output,stdout=log,stderr=subprocess.STDOUT)
        receipt.update(delivery='PASS' if result.returncode==0 else 'FAILED',exitStatus=result.returncode)
        (args.output/'.git/product-boundary.json').write_text(json.dumps(receipt,indent=2)+'\n')
        print(json.dumps(receipt,indent=2))
        return result.returncode
    return 0
if __name__=='__main__': raise SystemExit(main())
