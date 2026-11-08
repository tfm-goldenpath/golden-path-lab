// Deterministic transport fixtures. Real Bash, JSON parsing, hashing and installation;
// synthetic payloads do not establish publisher authenticity or live availability.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const installer=resolve(import.meta.dirname,'../../scripts/install-security-tools.sh');
const url='https://github.com/example/tool/releases/download/v1.2.3/tool-linux';
const payload='#!/bin/sh\nprintf "fixture 1.2.3\\n"\n';
const sha=createHash('sha256').update(payload).digest('hex');
const metadata={tag_name:'v1.2.3',html_url:'https://github.com/example/tool/releases/tag/v1.2.3',assets:[{id:123,name:'tool-linux',state:'uploaded',size:payload.length,url:'https://api.github.com/repos/example/tool/releases/assets/123',browser_download_url:url}]};
const unavailable={code:22,http:'504',body:'gateway error'};
function fixture(t,plan={},lockedURL=url) {
 const root=fs.mkdtempSync(join(tmpdir(),'tool installer '));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const bin=join(root,'transport');fs.mkdirSync(bin);
 fs.writeFileSync(join(root,'plan.json'),JSON.stringify({primary:[{body:payload}],metadata:[{body:JSON.stringify(metadata)}],asset:[{body:payload}],...plan}));
 fs.writeFileSync(join(root,'lock.json'),JSON.stringify({schemaVersion:1,platform:'linux/amd64',tools:{fixture:{version:'1.2.3',url:lockedURL,sha256:sha,archive:'binary',member:'fixture'}}}));
 fs.writeFileSync(join(bin,'curl'),`#!/usr/bin/env python3
import json,os,sys,pathlib,time
root=pathlib.Path(os.environ['TRANSPORT_FIXTURE']);args=sys.argv[1:]
url=next(a for a in args if a.startswith('https://'))
route='metadata' if '/releases/tags/' in url else 'asset' if '/releases/assets/' in url else 'primary'
log=root/'calls.jsonl';calls=[json.loads(x) for x in log.read_text().splitlines()] if log.exists() else []
plan=json.loads((root/'plan.json').read_text())[route];index=sum(c['route']==route for c in calls)
response=plan[min(index,len(plan)-1)]
with log.open('a') as stream: stream.write(json.dumps({'route':route,'args':args})+'\\n')
target=args[args.index('--output')+1] if '--output' in args else args[args.index('-o')+1]
pathlib.Path(target).write_text(response.get('body',''))
if '--write-out' in args: print(response.get('http','200')+' '+str(response.get('elapsed','0.01')),end='')
print('sensitive transport diagnostic https://signed.invalid/?token=DO_NOT_LOG',file=sys.stderr)
if response.get('delay'): time.sleep(response['delay'])
sys.exit(response.get('code',0))
`,{mode:0o755});
 const env={...process.env,PATH:bin+':'+process.env.PATH,TOOLS_LOCK_FILE:join(root,'lock.json'),PREFIX:join(root,'installed'),TRANSPORT_FIXTURE:root,GH_TOKEN:'DO_NOT_LOG'};
 const run=script=>spawnSync('bash',script?['-c',script]:[installer],{env,encoding:'utf8',timeout:15000});
 const calls=()=>fs.existsSync(join(root,'calls.jsonl'))?fs.readFileSync(join(root,'calls.jsonl'),'utf8').trim().split('\n').map(JSON.parse):[];
 return {root,run,calls,installed:join(root,'installed/bin/fixture')};
}
function absent(f,r) {assert.notEqual(r.status,0,r.stdout+r.stderr);assert.equal(fs.existsSync(f.installed),false);assert.doesNotMatch(r.stdout+r.stderr,/DO_NOT_LOG|signed\.invalid/);}

test('installer primary success verifies exact bytes and reports safe diagnostics',t=>{
 const f=fixture(t),r=f.run();assert.equal(r.status,0,r.stderr);assert.equal(fs.readFileSync(f.installed,'utf8'),payload);
 assert.match(r.stderr,/tool=fixture version=1.2.3 route=primary.*http=200.*exit=0.*elapsed=/);
 assert.equal(f.calls().length,1);assert.doesNotMatch(r.stdout+r.stderr,/DO_NOT_LOG|signed\.invalid/);
});
test('installer transient primary failure uses exact official API asset and pinned checksum',t=>{
 const f=fixture(t,{primary:[unavailable]}),r=f.run();assert.equal(r.status,0,r.stdout+r.stderr);
 assert.equal(fs.readFileSync(f.installed,'utf8'),payload);assert.deepEqual(f.calls().map(c=>c.route),['primary','primary','metadata','asset']);
 const call=f.calls().at(-1);assert.ok(call.args.includes('Accept: application/octet-stream'));assert.ok(call.args.includes(metadata.assets[0].url));
});
test('installer unavailable primary and API stop with distinct bounded diagnostics',t=>{
 const f=fixture(t,{primary:[unavailable],metadata:[{code:28,http:'000',body:'interrupted'}]}),r=f.run();absent(f,r);
 assert.match(r.stderr,/route=primary.*http=504.*exit=22/);assert.match(r.stderr,/route=api-metadata.*http=000.*exit=28/);assert.equal(f.calls().length,4);
});
for(const route of ['primary','asset']) test(`installer ${route} checksum mismatch never installs or switches sources`,t=>{
 const f=fixture(t,route==='primary'?{primary:[{body:'HTTP 200 error body'}]}:{primary:[unavailable],asset:[{body:'HTTP 200 error body'}]}),r=f.run();absent(f,r);
 assert.match(r.stderr,/checksum mismatch/);assert.equal(f.calls().length,route==='primary'?1:4);
});
for(const [name,change] of [
 ['missing',m=>{m.assets=[];}],['malformed',()=>'{bad json'],['ambiguous',m=>{m.assets.push({...m.assets[0],id:124});}],
 ['wrong tag',m=>{m.tag_name='latest';}],['wrong repository',m=>{m.assets[0].url='https://api.github.com/repos/other/tool/releases/assets/123';}],
 ['wrong name',m=>{m.assets[0].name='another';}],['not uploaded',m=>{m.assets[0].state='new';}],
 ['wrong release URL',m=>{m.assets[0].browser_download_url=url+'?changed';}],['invalid id',m=>{m.assets[0].id='../123';}],
 ['missing assets',m=>{delete m.assets;}],['empty asset',m=>{m.assets[0].size=0;}]
]) test(`installer rejects ${name} asset metadata`,t=>{
 const m=structuredClone(metadata),body=change(m)??JSON.stringify(m);
 const f=fixture(t,{primary:[unavailable],metadata:[{body}]}),r=f.run();absent(f,r);assert.match(r.stderr,/invalid asset metadata/);assert.equal(f.calls().some(c=>c.route==='asset'),false);
});
for(const code of [18,28,56]) test(`installer interrupted transfer ${code} cannot install partial bytes`,t=>{
 const f=fixture(t,{primary:[{code,http:'200',body:payload}],asset:[{code,http:'200',body:payload}]}),r=f.run();absent(f,r);assert.equal(f.calls().length,5);
});
for(const failure of [{code:22,http:'404'},{code:60,http:'000'},{code:23,http:'200'}]) test(`installer nontransient ${failure.code}/${failure.http} does not fall back`,t=>{
 const f=fixture(t,{primary:[failure]}),r=f.run();absent(f,r);assert.equal(f.calls().length,1);
});
test('installer retains non-GitHub downloads without inventing an API route',t=>{
 const f=fixture(t,{},'https://get.example.invalid/pinned-tool'),r=f.run();assert.equal(r.status,0,r.stderr);assert.equal(f.calls().length,1);
 const bad=fixture(t,{primary:[unavailable]},'https://get.example.invalid/pinned-tool'),failed=bad.run();absent(bad,failed);assert.equal(bad.calls().length,2);
});
test('installer uses fresh outputs, HTTPS only, no ambient credentials and bounded request budgets',t=>{
 const f=fixture(t,{primary:[unavailable]}),r=f.run();assert.equal(r.status,0,r.stderr);
 const outputs=[];
 for(const {args} of f.calls()) {
  assert.equal(args[0],'-q');assert.equal(args[args.indexOf('--proto')+1],'=https');assert.equal(args[args.indexOf('--proto-redir')+1],'=https');
  assert.ok(Number(args[args.indexOf('--max-time')+1])<=45);assert.ok(Number(args[args.indexOf('--connect-timeout')+1])<=10);
  assert.equal(args.includes('--location-trusted'),false);assert.equal(args.includes('--insecure'),false);assert.equal(args.includes('--retry'),false);
  assert.equal(args.some(a=>a.includes('Authorization')||a.includes('DO_NOT_LOG')),false);outputs.push(args[args.indexOf('--output')+1]);
 }
 assert.equal(new Set(outputs).size,outputs.length);
});
test('installer helpers propagate checksum and exhausted time errors inside conditionals',t=>{
 const f=fixture(t,{primary:[{body:'bad'}]});
 const script=`source '${installer}'
install_download_deadline=$((SECONDS+300))
if download fixture 1.2.3 '${url}' '${sha}' "$TRANSPORT_FIXTURE/result"; then echo forbidden; else exit "$?"; fi`;
 const r=f.run(script);absent(f,r);assert.match(r.stderr,/checksum mismatch/);assert.doesNotMatch(r.stdout,/forbidden/);
 const expired=fixture(t);const deadline=expired.run(`source '${installer}'; install_download_deadline=$SECONDS; if download fixture 1.2.3 '${url}' '${sha}' "$TRANSPORT_FIXTURE/result"; then echo forbidden; else exit "$?"; fi`);
 absent(expired,deadline);assert.equal(expired.calls().length,0);assert.match(deadline.stderr,/budget exhausted/);
});

test('installer retries a transient primary once and avoids API when it recovers',t=>{
 const f=fixture(t,{primary:[unavailable,{body:payload}]}),r=f.run();assert.equal(r.status,0,r.stderr);assert.deepEqual(f.calls().map(c=>c.route),['primary','primary']);
});
test('installer clamps each request to remaining overall budget and stops after expiry',t=>{
 const f=fixture(t,{primary:[{code:28,http:'000',delay:1.1}]});
 const r=f.run(`source '${installer}'; install_download_deadline=$((SECONDS+1)); if download fixture 1.2.3 '${url}' '${sha}' "$TRANSPORT_FIXTURE/result"; then echo forbidden; else exit "$?"; fi`);
 absent(f,r);assert.equal(f.calls().length,1);const args=f.calls()[0].args;assert.equal(args[args.indexOf('--max-time')+1],'1');assert.match(r.stderr,/budget exhausted/);
 const source=fs.readFileSync(installer,'utf8');assert.match(source,/deadline=\$\(\(SECONDS\+120\)\)/);assert.match(source,/install_download_deadline=\$\(\(SECONDS\+300\)\)/);
});
test('installer main cannot suppress download or extraction failure in an if context',t=>{
 for(const kind of ['checksum','archive','metadata','lock']) {
  const f=fixture(t,kind==='checksum'?{primary:[{body:'bad'}]}:kind==='metadata'?{primary:[unavailable],metadata:[{body:'{}'}]}:{});
  const lock=JSON.parse(fs.readFileSync(join(f.root,'lock.json')));
  if(kind==='archive') lock.tools.fixture.archive='tar.gz';
  if(kind==='lock') lock.schemaVersion=2;
  fs.writeFileSync(join(f.root,'lock.json'),JSON.stringify(lock));
  const r=f.run(`source '${installer}'; if install_security_tools; then echo forbidden; else exit "$?"; fi`);
  absent(f,r);assert.doesNotMatch(r.stdout,/forbidden/);
 }
});
