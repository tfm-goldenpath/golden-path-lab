// Narrow independent consumer configuration, committed inputs and initialization.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export const ENGINE_REPOSITORY='https://github.com/tfm-goldenpath/golden-path-lab';
export const CONSUMER_PROFILE='node-http-consumer/v1';
export const CONSUMER_PRODUCER='bin/deliver:node-http-consumer/v1';
export const engineSources=['bin','src','templates/node-http','implementation/policies','implementation/schemas',
  'implementation/versions.env','implementation/tools.lock.json','implementation/tooling/package.json','implementation/tooling/package-lock.json'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function keys(value,expected) {
  if(!value || Array.isArray(value) || typeof value!=='object' || Object.keys(value).sort().join()!==expected.sort().join()) throw new Error('Unknown or missing configuration fields');
}
export function validateConfig(config) {
  keys(config,['schema','repository','engine','service']); keys(config.engine,['repository','commit']);
  if(config.schema!==CONSUMER_PROFILE || config.service!=='service') throw new Error('Unsupported consumer profile or service path');
  if(!/^https:\/\/[A-Za-z0-9.-]+\/[A-Za-z0-9_.\/-]+$/.test(config.repository) || config.repository.includes('/../')) throw new Error('Expected an explicit HTTPS consumer repository');
  if(config.engine.repository!==ENGINE_REPOSITORY || !/^[a-f0-9]{40}$/.test(config.engine.commit)) throw new Error('Engine requires the expected repository and exact full commit SHA');
  return config;
}
export function canonical(root) {
  root=path.resolve(root);
  if(fs.realpathSync(root)!==root || git(root,'rev-parse','--show-toplevel')!==root) throw new Error('Expected a canonical Git repository root, without symlink escapes');
  return root;
}
// Snapshot every selected byte, including ignored/untracked additions, plus modes.
// Only node_modules is excluded; the fixed Docker allowlist cannot copy it.
export function snapshot(root,selection) {
  const files=[];
  function walk(name) {
    const file=path.join(root,name), stat=fs.lstatSync(file);
    if(stat.isSymbolicLink()) throw new Error('Symlink in selected input: '+name);
    if(stat.isDirectory()) {
      for(const child of fs.readdirSync(file).sort()) {
        if((name==='service' && child==='node_modules') || (name.startsWith('implementation/policies') && child==='__pycache__')) continue;
        walk(name+'/'+child);
      }
    } else if(stat.isFile()) {
      const bytes=fs.readFileSync(file), tree=git(root,'ls-tree','HEAD','--',name);
      const match=/^(100644|100755) blob ([a-f0-9]{40})\t/.exec(tree);
      const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
      if(!match || match[2]!==blob || (match[1]==='100755')!==!!(stat.mode&0o111)) throw new Error('Selected input differs from committed source: '+name);
      files.push({path:name,mode:(stat.mode&0o777).toString(8),sha256:hash(bytes)});
    } else throw new Error('Nonregular selected input: '+name);
  }
  selection.forEach(walk);
  const tracked=git(root,'ls-files','-z','--',...selection).split('\0').filter(Boolean).filter(n=>!n.startsWith('service/node_modules/') && !n.includes('/__pycache__/'));
  if(tracked.some(n=>!files.some(f=>f.path===n))) throw new Error('Selected committed input is missing');
  files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  return {sha256:hash(JSON.stringify(files)),files};
}
export function verifyEngine(engine,expected) {
  engine=canonical(engine);
  if(git(engine,'rev-parse','HEAD')!==expected.commit || git(engine,'config','--get','remote.origin.url')!==expected.repository) throw new Error('Engine checkout repository or commit mismatch');
  return snapshot(engine,engineSources);
}
export function captureConsumer(engine,consumer) {
  engine=canonical(engine); consumer=canonical(consumer);
  if(engine===consumer || consumer.startsWith(engine+'/') || engine.startsWith(consumer+'/')) throw new Error('Consumer must be a separate repository outside the engine');
  if(fs.lstatSync(path.join(consumer,'golden-path.json')).isSymbolicLink()) throw new Error('Symlinked configuration');
  const config=validateConfig(read(path.join(consumer,'golden-path.json')));
  const engineSnapshot=verifyEngine(engine,config.engine);
  const source=snapshot(consumer,['service','.github/workflows','golden-path.json']);
  for(const name of ['Dockerfile','.dockerignore']) if(!fs.readFileSync(path.join(consumer,'service',name)).equals(fs.readFileSync(path.join(engine,'templates/node-http/service',name)))) throw new Error('Unsupported build context '+name+'; use the fixed consumer template');
  const pkg=read(path.join(consumer,'service/package.json')), lock=read(path.join(consumer,'service/package-lock.json'));
  if(['dependencies','devDependencies','optionalDependencies','peerDependencies'].some(k=>Object.keys(pkg[k]||{}).length) || lock.lockfileVersion!==3 || Object.keys(lock.packages||{}).length!==1 || !lock.packages[''] || lock.name!==pkg.name || lock.version!==pkg.version || lock.packages[''].name!==pkg.name || lock.packages[''].version!==pkg.version) throw new Error('This profile supports locked dependency-free Node services only');
  if(!fs.readdirSync(path.join(consumer,'.github/workflows')).some(n=>/\.ya?ml$/.test(n))) throw new Error('Consumer workflow input required');
  let origin;
  try {origin=git(consumer,'config','--get','remote.origin.url');} catch {origin=null;}
  if(origin && origin!==config.repository) throw new Error('Consumer origin differs from expected repository');
  const commit=git(consumer,'rev-parse','HEAD');
  return {schema:CONSUMER_PROFILE,repository:config.repository,commit,remoteOriginVerified:!!origin,
    remoteVerification:'Local Git origin string only; no host authentication',source,engine:engineSnapshot,
    binding:{profile:CONSUMER_PROFILE,producer:CONSUMER_PRODUCER,engineRepository:config.engine.repository,
      engineCommit:config.engine.commit,engineSnapshot:engineSnapshot.sha256,
      configurationSha256:hash(fs.readFileSync(path.join(consumer,'golden-path.json'))),consumerSnapshot:source.sha256}};
}
export function initialize(engine,destination,repository,commit) {
  destination=path.resolve(destination);
  if(fs.existsSync(destination) && (!fs.lstatSync(destination).isDirectory() || fs.lstatSync(destination).isSymbolicLink() || fs.readdirSync(destination).length)) throw new Error('Refusing nonempty or symlinked destination');
  const config=validateConfig({schema:CONSUMER_PROFILE,repository,engine:{repository:ENGINE_REPOSITORY,commit},service:'service'});
  verifyEngine(engine,config.engine);
  fs.mkdirSync(destination,{recursive:true});
  if(fs.realpathSync(destination)!==destination) throw new Error('Symlinked destination parent');
  for(const name of fs.readdirSync(path.join(engine,'templates/node-http'))) fs.cpSync(path.join(engine,'templates/node-http',name),path.join(destination,name),{recursive:true,errorOnExist:true,force:false});
  fs.writeFileSync(path.join(destination,'golden-path.json'),JSON.stringify(config,null,2)+'\n',{flag:'wx'});
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const [command,engine,...args]=process.argv.slice(2);
    if(command==='init' && args.length===5 && args[1]==='--repository' && args[3]==='--engine-commit') initialize(engine,args[0],args[2],args[4]);
    else if(command==='capture' && args.length===1) console.log(JSON.stringify(captureConsumer(engine,args[0]),null,2));
    else throw new Error('Usage: init DEST --repository HTTPS_URL --engine-commit FULL_SHA | check/local --consumer PATH');
  } catch(error) {console.error('Consumer configuration: '+error.message);process.exitCode=1;}
}
