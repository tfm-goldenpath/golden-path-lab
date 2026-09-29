// Real temporary Git histories; no registry, signing or admission claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
const helper=resolve(import.meta.dirname,'../../scripts/l05-source.mjs');
function setup(t) {
  const root=mkdtempSync(join(tmpdir(),'l05-source-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
  git('init','-b','main');git('config','user.email','synthetic@example.invalid');git('config','user.name','Synthetic test');
  mkdirSync(join(root,'implementacion/services/quotes-node/src'),{recursive:true});
  const file=join(root,'implementacion/services/quotes-node/src/index.js');writeFileSync(file,'export const version=1;\n');git('add','.');git('commit','-m','first');const from=git('rev-parse','HEAD');
  writeFileSync(file,'export const version=2;\n');git('commit','-am','second');const to=git('rev-parse','HEAD');
  writeFileSync(file,'uncommitted user content\n');
  return {root,git,file,from,to,run:(a=from,b=to)=>spawnSync('node',[helper,root,a,b,join(root,'export')],{encoding:'utf8'})};
}
test('L05 exports actual distinct immutable source contents without changing checkout',t=>{
  const f=setup(t),r=f.run();assert.equal(r.status,0,r.stderr);
  const report=JSON.parse(r.stdout);
  assert.equal(report.from.commit,f.from);assert.equal(report.to.commit,f.to);assert.notEqual(report.from.tree,report.to.tree);
  assert.equal(readFileSync(join(f.root,'export/from/src/index.js'),'utf8'),'export const version=1;\n');
  assert.equal(readFileSync(join(f.root,'export/to/src/index.js'),'utf8'),'export const version=2;\n');
  assert.equal(readFileSync(f.file,'utf8'),'uncommitted user content\n');assert.equal(f.git('rev-parse','HEAD'),f.to);
});
for(const invalid of ['same','abbreviation','unknown','unreachable','same-tree']) test(`L05 refuses ${invalid} revision selection`,t=>{
  const f=setup(t);let a=f.from,b=f.to;
  if(invalid==='same') a=b;
  if(invalid==='abbreviation') b=b.slice(0,7);
  if(invalid==='unknown') b='f'.repeat(40);
  if(invalid==='same-tree') {f.git('commit','--allow-empty','-m','metadata only');a=f.to;b=f.git('rev-parse','HEAD');}
  if(invalid==='unreachable') {b=f.git('commit-tree',f.git('rev-parse','HEAD^{tree}'),'-m','unreachable');}
  assert.notEqual(f.run(a,b).status,0);
});

test('L05 build input capture detects exported source alteration',t=>{
  const f=setup(t),r=f.run();assert.equal(r.status,0,r.stderr);
  const report=JSON.parse(r.stdout),auth=join(f.root,'authorization.json');writeFileSync(auth,r.stdout);
  const capture=resolve(import.meta.dirname,'../../scripts/capture-build-inputs.mjs');
  const args=[capture,report.to.directory,'node@sha256:'+'a'.repeat(64),f.to,auth,'to'];
  assert.equal(spawnSync('node',args,{encoding:'utf8'}).status,0);
  writeFileSync(join(report.to.directory,'src/index.js'),'tampered');
  const changed=spawnSync('node',args,{encoding:'utf8'});assert.notEqual(changed.status,0);assert.match(changed.stderr,/source changed/);
});
