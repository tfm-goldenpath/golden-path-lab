#!/usr/bin/env node
// Export only actual immutable Git objects; never change the user's index/HEAD.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const [repository,from,to,destination]=process.argv.slice(2);
try {
  const git=(...args)=>execFileSync('git',['-C',repository,...args],{maxBuffer:32*1024*1024});
  const text=(...args)=>git(...args).toString().trim();
  const main=text('rev-parse','refs/heads/main^{commit}');
  if(!/^[a-f0-9]{40}$/.test(from || '') || !/^[a-f0-9]{40}$/.test(to || '') || from===to) throw new Error('L05 needs two distinct full immutable commit IDs');
  for(const revision of [from,to]) {
    if(text('rev-parse',revision+'^{commit}')!==revision) throw new Error('Not a commit object');
    git('merge-base','--is-ancestor',revision,main);
  }
  git('merge-base','--is-ancestor',from,to);
  const service='implementacion/services/quotes-node';
  const trees=[from,to].map(revision=>text('rev-parse',revision+':'+service));
  const applicationTrees=[from,to].map(revision=>text('rev-parse',revision+':'+service+'/src'));
  if(applicationTrees[0]===applicationTrees[1]) throw new Error('L05 requires actual application source changes, not metadata-only commits');
  if(existsSync(destination)) throw new Error('Export destination already exists');
  const result={scenario:'L05',authorizedMain:main,authorization:'explicit commit pair, ordered ancestors of recorded local main',from:null,to:null};
  for(const [index,name] of ['from','to'].entries()) {
    const revision=[from,to][index],directory=join(destination,name),files=[];
    for(const entry of git('ls-tree','-rz',revision+':'+service).toString().split('\0').filter(Boolean)) {
      const split=entry.indexOf('\t'),[mode,type,oid]=entry.slice(0,split).split(' '),path=entry.slice(split+1);
      if(!['100644','100755'].includes(mode) || type!=='blob' || path.split('/').some(p=>!p || p==='.' || p==='..') || path.startsWith('/') || path.includes('\\')) throw new Error('Unsupported source tree entry');
      const bytes=git('cat-file','blob',oid),file=join(directory,path);
      mkdirSync(dirname(file),{recursive:true});writeFileSync(file,bytes,{flag:'wx',mode:mode==='100755'?0o755:0o644});
      files.push({path,gitBlob:oid,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
    result[name]={commit:revision,tree:trees[index],applicationTree:applicationTrees[index],directory,files,snapshotSha256:createHash('sha256').update(JSON.stringify(files)).digest('hex')};
  }
  console.log(JSON.stringify(result,null,2));
} catch(e) {console.error('L05 source selection: '+e.message);process.exitCode=1;}
