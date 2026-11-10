// Capture explicit build inputs; scenario authorizations remain in the lab adapter.
import {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export function captureBuildFiles(root, includeTests=false, java=false) {
const files=[];
function walk(directory) {
  for(const name of readdirSync(directory).sort()) {
    if(java && directory===root && name==='target') continue;
    if(!includeTests && ['node_modules','test'].includes(name)) continue;
    const path=join(directory,name),stat=lstatSync(path);
    if(stat.isSymbolicLink()) throw new Error('Symlink in build context');
    if(stat.isDirectory()) walk(path);
    else if(stat.isFile()) {
      const bytes=readFileSync(path);
      let content, encoding;
      try {content=java?new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes):bytes.toString('utf8');} catch {
        if(!java) throw new Error('Non-UTF-8 build input');
        content=bytes.toString('base64'); encoding='base64';
      }
      files.push({path:relative(root,path),mode:(0o100000 | (stat.mode & 0o7777)).toString(8),sha256:createHash('sha256').update(bytes).digest('hex'),content,...(encoding?{encoding}:{})});
    }
  }
}
walk(root);
return files;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [context,base,commit,authorizationFile,execution,profile='delivery-v1',consumerRoot]=process.argv.slice(2);
  if(profile==='consumer-v1') {
    if(context!==resolve(consumerRoot,'service') || realpathSync(context)!==context || authorizationFile || execution) throw new Error('Invalid consumer build context');
  } else if(profile!=='delivery-v1' || context!=='services/quotes-node' || authorizationFile || execution)
    throw new Error('Delivery requires the quotes-node build context');
  const root=resolve(context);
  if(realpathSync(root)!==root) throw new Error('Ambiguous build context');
  const java=profile==='consumer-v1' && JSON.parse(readFileSync(resolve(consumerRoot,'golden-path.json'))).schema==='java-http-consumer/v1';
  console.log(JSON.stringify({context,base,commit,files:captureBuildFiles(root,java,java)},null,2));
}
