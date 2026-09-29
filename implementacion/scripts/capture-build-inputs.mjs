// Retain the small, explicit fixture/service build contexts, excluding generated dependencies.
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const [context,base,commit]=process.argv.slice(2), root=resolve(context);
const allowed=['services/quotes-node','tests/fixtures/l03'];
if (!allowed.includes(context)) throw new Error('Unexpected build context');
const files=[];
function walk(directory) {
  for(const name of readdirSync(directory).sort()) {
    if(['node_modules','test'].includes(name)) continue;
    const path=join(directory,name),stat=lstatSync(path);
    if(stat.isSymbolicLink()) throw new Error('Symlink in build context');
    if(stat.isDirectory()) walk(path);
    else if(stat.isFile()) {
      const bytes=readFileSync(path);
      files.push({path:relative(root,path),sha256:createHash('sha256').update(bytes).digest('hex'),content:bytes.toString('utf8')});
    }
  }
}
walk(root);
if(context==='tests/fixtures/l03') {
  const lock=JSON.parse(readFileSync(join(root,'component-lock.json')));
  if(lock.name!=='is-number' || lock.version!=='7.0.0') throw new Error('Unexpected L03 component pin');
  for(const [name,hash] of Object.entries(lock.files)) {
    if(files.find(f=>f.path==='is-number/'+name)?.sha256!==hash) throw new Error('L03 component integrity mismatch: '+name);
  }
}
console.log(JSON.stringify({context,base,commit,files},null,2));
