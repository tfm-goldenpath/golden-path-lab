// Capture explicit build inputs; scenario authorizations remain in the lab adapter.
import {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export function captureBuildFiles(root, includeTests=false) {
const files=[];
function walk(directory) {
  for(const name of readdirSync(directory).sort()) {
    if(!includeTests && ['node_modules','test'].includes(name)) continue;
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
return files;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [context,base,commit,authorizationFile,execution,profile='delivery-v1']=process.argv.slice(2);
  if(profile!=='delivery-v1' || context!=='services/quotes-node' || authorizationFile || execution)
    throw new Error('Delivery requires the quotes-node build context');
  const root=resolve(context);
  if(realpathSync(root)!==root) throw new Error('Ambiguous build context');
  console.log(JSON.stringify({context,base,commit,files:captureBuildFiles(root)},null,2));
}
