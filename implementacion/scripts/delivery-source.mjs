// Explicit P03 source selection. Historical laboratory snapshots stay unchanged.
import {readFileSync, readdirSync, lstatSync} from 'node:fs';
import {resolve, join, relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const deliverySources = [
  'services/quotes-node', 'policies', 'schemas',
  '../.github/workflows', 'versions.env', 'tools.lock.json',
  'tooling/package.json', 'tooling/package-lock.json',
  ...['deliver.sh', 'delivery-source.mjs', 'capture-build-inputs.mjs',
    'check-environment.sh', 'check-tool-versions.py', 'lab-contracts.mjs', 'validate-sbom-schema.mjs', 'vulnerability-database.py',
    'vulnerability-evidence.mjs', 'verified-bundle-statement.mjs',
    'ci-verification-gate.mjs', 'github-attestation.mjs', 'check-missing-results.mjs',
    'download-bundle-inventory.mjs', 'check-bundle-profile.mjs',
    'check-image-rollout.mjs', 'check-admission-controller.mjs',
    'package-evidence.py', 'codespaces-network.py',
    'lib/context.sh', 'lib/delivery.sh', 'lib/attestations.sh', 'lib/workload.sh',
    'lib/admission.sh', 'lib/lab.sh', 'lib/local-delivery.sh',
  ].map(p=>'scripts/'+p),
];
export function captureDeliverySource(root) {
  root=resolve(root);
  const files=[];
  function walk(name) {
    const file=join(root,name), stat=lstatSync(file);
    if(stat.isSymbolicLink()) throw new Error('Symlink in delivery source: '+name);
    if(stat.isDirectory()) {
      for(const child of readdirSync(file).sort()) {
        if(['node_modules','__pycache__','.tools'].includes(child)) continue;
        walk(name+'/'+child);
      }
    } else if(stat.isFile()) {
      const bytes=readFileSync(file);
      files.push({path:relative(resolve(root,'..'),file), mode:(stat.mode & 0o777).toString(8),
        sha256:createHash('sha256').update(bytes).digest('hex')});
    } else throw new Error('Nonregular delivery input: '+name);
  }
  deliverySources.forEach(walk);
  files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  const sha256=createHash('sha256').update(JSON.stringify(files)).digest('hex');
  return {schema:'legitimate-delivery-source/v1',sha256,files};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [root,expected]=process.argv.slice(2);
  const snapshot=captureDeliverySource(root);
  const tracked=new Set(execFileSync('git',['-C',resolve(root,'..'),'ls-files','--full-name','-z'],{encoding:'utf8'}).split('\0'));
  if(snapshot.files.some(file=>!tracked.has(file.path))) throw new Error('Untracked input in legitimate delivery source');
  if(expected && snapshot.sha256!==expected) throw new Error('Delivery source changed during execution');
  console.log(JSON.stringify(snapshot,null,2));
}
