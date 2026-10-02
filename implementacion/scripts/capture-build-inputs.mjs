// Retain the small, explicit fixture/service build contexts, excluding generated dependencies.
import {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {join,relative,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const [context,base,commit,authorizationFile,execution]=process.argv.slice(2), root=resolve(context);
const vulnerabilityPins={'f03-vulnerable':['minimist','1.2.5'],'f03-repaired':['minimist','1.2.8'],'f04':['ip','2.0.1'],'l02':['lodash.unset','4.5.2']};
const allowed=['services/quotes-node','tests/fixtures/l03',...Object.keys(vulnerabilityPins).map(k=>'tests/fixtures/vulnerabilities/'+k)];
let authorized, manual = false;
if (!allowed.includes(context)) {
  if (!authorizationFile || !['from','to','manual-correction'].includes(execution)) throw new Error('Unexpected build context');
  const authorization=JSON.parse(readFileSync(authorizationFile));
  if(execution==='manual-correction') {
    manual=true; authorized=authorization;
    const path=relative(resolve('evidence/raw'),root);
    if(!/^run-[A-Za-z0-9]+\/manual-operations\/[0-9]{4,}-check\/input-source$/.test(path)
        || realpathSync(root)!==root || resolve(authorizationFile)!==join(dirname(root),'input-authorization.json')) throw new Error('Manual build is outside its owned operation');
    const owner=resolve(root,'../../..'), state=JSON.parse(readFileSync(join(owner,'state.json'))), task=JSON.parse(readFileSync(join(owner,'manual-task.json')));
    if(authorization.schema!=='manual-f03-build/v1' || authorization.scenario!=='F03' || authorization.directory!==root
        || authorization.commit!==commit || authorization.base!==base || task.scenario!=='F03' || task.lane!=='A'
        || state.mode!=='local' || state.sourceCommit!==commit || base!==state.imageRepository+'@'+state.digest
        || !Array.isArray(authorized.files)) throw new Error('Manual F03 input authorization mismatch');
  } else {
    authorized=authorization[execution];
    if(authorization.scenario!=='L05' || !/^[a-f0-9]{40}$/.test(authorization.authorizedMain || '')
      || authorized?.directory!==root || authorized.commit!==commit || !Array.isArray(authorized.files)) throw new Error('Build context differs from L05 source authorization');
  }
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
  if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error(manual?'Manual input changed after capture':'L05 exported source changed after selection');
}
if(manual) {
  if(JSON.stringify(files.map(f=>f.path).sort())!==JSON.stringify(['Dockerfile','exercise.cjs','package-lock.json','package.json'])) throw new Error('Unexpected manual build files');
  for(const file of ['Dockerfile','exercise.cjs']) {
    if(!readFileSync(join(root,file)).equals(readFileSync('tests/fixtures/vulnerabilities/f03-vulnerable/'+file))) throw new Error('Manual F03 runtime wrapper changed');
  }
}
if(context==='tests/fixtures/l03') {
  const lock=JSON.parse(readFileSync(join(root,'component-lock.json')));
  if(lock.name!=='is-number' || lock.version!=='7.0.0') throw new Error('Unexpected L03 component pin');
  for(const [name,hash] of Object.entries(lock.files)) {
    if(files.find(f=>f.path==='is-number/'+name)?.sha256!==hash) throw new Error('L03 component integrity mismatch: '+name);
  }
}
if(manual || context.startsWith('tests/fixtures/vulnerabilities/')) {
  const pkg=JSON.parse(readFileSync(join(root,'package.json'))), lock=JSON.parse(readFileSync(join(root,'package-lock.json')));
  const [name,version]=manual?['minimist',pkg.dependencies?.minimist]:vulnerabilityPins[context.split('/').at(-1)];
  const installed=lock.packages?.['node_modules/'+name];
  if(!/^\d+\.\d+\.\d+$/.test(version || '') || JSON.stringify(pkg.dependencies)!==JSON.stringify({[name]:version})
    || lock.lockfileVersion!==3 || Object.keys(lock.packages).length!==2
    || lock.packages[''].dependencies[name]!==version || installed?.version!==version
    || !/^sha512-/.test(installed?.integrity || '')
    || installed?.resolved!==`https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`) {
    throw new Error('Vulnerability fixture dependency/lock differs from explicit pin');
  }
}
console.log(JSON.stringify({context,base,commit,files},null,2));
