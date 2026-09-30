// Retain the small, explicit fixture/service build contexts, excluding generated dependencies.
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const [context,base,commit,authorizationFile,execution]=process.argv.slice(2), root=resolve(context);
const vulnerabilityPins={'f03-vulnerable':['minimist','1.2.5'],'f03-repaired':['minimist','1.2.8'],'f04':['ip','2.0.1'],'l02':['lodash.unset','4.5.2']};
const allowed=['services/quotes-node','tests/fixtures/l03',...Object.keys(vulnerabilityPins).map(k=>'tests/fixtures/vulnerabilities/'+k)];
let authorized;
if (!allowed.includes(context)) {
  if (!authorizationFile || !['from','to'].includes(execution)) throw new Error('Unexpected build context');
  const authorization=JSON.parse(readFileSync(authorizationFile));
  authorized=authorization[execution];
  if(authorization.scenario!=='L05' || !/^[a-f0-9]{40}$/.test(authorization.authorizedMain || '')
      || authorized?.directory!==root || authorized.commit!==commit || !Array.isArray(authorized.files)) throw new Error('Build context differs from L05 source authorization');
}
const files=[];
function walk(directory) {
  for(const name of readdirSync(directory).sort()) {
    if(!authorized && ['node_modules','test'].includes(name)) continue;
    const path=join(directory,name),stat=lstatSync(path);
    if(stat.isSymbolicLink()) throw new Error('Symlink in build context');
    if(stat.isDirectory()) walk(path);
    else if(stat.isFile()) {
      const bytes=readFileSync(path);
      files.push({path:relative(root,path),mode:(0o100000 | (stat.mode & 0o7777)).toString(8),sha256:createHash('sha256').update(bytes).digest('hex'),content:bytes.toString('utf8')});
    }
  }
}
walk(root);
if(authorized) {
  const actual=files.map(({path,mode,sha256})=>({path,mode,sha256})).sort((a,b)=>a.path.localeCompare(b.path));
  const expected=authorized.files.map(({path,mode,sha256})=>({path,mode,sha256})).sort((a,b)=>a.path.localeCompare(b.path));
  if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error('L05 exported source changed after selection');
}
if(context==='tests/fixtures/l03') {
  const lock=JSON.parse(readFileSync(join(root,'component-lock.json')));
  if(lock.name!=='is-number' || lock.version!=='7.0.0') throw new Error('Unexpected L03 component pin');
  for(const [name,hash] of Object.entries(lock.files)) {
    if(files.find(f=>f.path==='is-number/'+name)?.sha256!==hash) throw new Error('L03 component integrity mismatch: '+name);
  }
}
if(context.startsWith('tests/fixtures/vulnerabilities/')) {
  const [name,version]=vulnerabilityPins[context.split('/').at(-1)];
  const pkg=JSON.parse(readFileSync(join(root,'package.json'))), lock=JSON.parse(readFileSync(join(root,'package-lock.json')));
  const installed=lock.packages?.['node_modules/'+name];
  if(JSON.stringify(pkg.dependencies)!==JSON.stringify({[name]:version})
    || lock.lockfileVersion!==3 || Object.keys(lock.packages).length!==2
    || lock.packages[''].dependencies[name]!==version || installed?.version!==version
    || !/^sha512-/.test(installed?.integrity || '')
    || installed?.resolved!==`https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`) {
    throw new Error('Vulnerability fixture dependency/lock differs from explicit pin');
  }
}
console.log(JSON.stringify({context,base,commit,files},null,2));
