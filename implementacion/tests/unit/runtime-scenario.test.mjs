// Synthetic Kubernetes responses exercise actual scenario functions, not live admission.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const image='registry.example/quotes-node@sha256:'+'a'.repeat(64);
const base=JSON.parse(readFileSync(join(root,'tests/policies/fixtures/base.json'))).manifests;
base.spec.template.spec.containers[0].image=image;
base.spec.replicas=1;
base.metadata={...base.metadata,uid:'deployment-uid',generation:1};
const simulator=String.raw`
const fs=require('node:fs'),p=process.env.RUNTIME_STATE, fault=process.env.RUNTIME_FAULT;
const args=process.argv.slice(2),type=args.shift(),log=p+'/calls.log';
fs.appendFileSync(log,JSON.stringify([type,...args])+'\n');
const save=(name,v)=>fs.writeFileSync(p+'/'+name+'.json',JSON.stringify(v));
const read=name=>JSON.parse(fs.readFileSync(p+'/'+name+'.json'));
const output=v=>console.log(JSON.stringify(v));
const name=args[3],kind=args[2];
function notfound(k,n) {console.error('Error from server (NotFound): '+(k.toLowerCase()==='pod'?'pods':'deployments.apps')+' "'+n+'" not found');process.exit(1);}
if(type==='actor') {
 const request=JSON.parse(fs.readFileSync(args.at(-1))),n=request.metadata.name,pod=request.kind==='Pod',spec=pod?request.spec:request.spec.template.spec;
 const f11=spec.containers[0].securityContext.privileged, f12=!spec.containers[0].image.includes('@');
 if((f11||f12)&&fault!=='accepted'&&!(fault==='converted'&&f12)) {
  if(fault==='api') {console.error('The Pod is invalid: forbidden immutable field');process.exit(1);}
  if(fault==='changed-update'&&args[1]==='replace'){const v=read('deployment');v.spec.replicas=2;save('deployment',v);}
  const rule=(pod?'':'autogen-')+(f11?'restricted-containers':'authorized-image-repository');
  const reason=f11?'validation failure: validation error: RUNTIME: all containers must be unprivileged, without privilege escalation or capabilities. rule '+rule+' failed at path /securityContext/privileged/':'validation failure: IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest';
  console.error('Error from server: admission webhook "validate.kyverno.svc-fail" denied the request:\n\nresource '+request.kind+'/tfm-golden/'+n+' was blocked due to the following policies\n\ntfm-runtime:\n  '+rule+': '+reason);
  if(fault==='extra') console.error('tfm-signature:\n  require-image-signature: signature failure');
  process.exit(1);
 }
 if(fault==='converted'&&f12) spec.containers[0].image=process.env.RUNTIME_IMAGE;
 if(fault==='update-failure'&&args[1]==='replace') process.exit(7);
 if(args[1]==='replace'&&fault!=='noop') request.metadata.generation++;
 if(args[1]==='replace'&&fault==='noop') {console.log('synthetic unchanged');process.exit(0);}
 save(pod?n:'deployment',request);output(request);process.exit(0);
}
if(args[0]==='get'&&args[1]==='clusterpolicy') {output({items:['tfm-runtime','tfm-signature','tfm-sbom','tfm-provenance','tfm-results'].map(name=>({metadata:{name,uid:name},spec:{rules:name==='tfm-runtime'?[]:[{verifyImages:[{mutateDigest:false,verifyDigest:true,required:true,imageReferences:[process.env.RUNTIME_IMAGE.split('@')[0]+'@sha256:*']}]}]}}))});process.exit(0);}
if(args[0]==='get'&&args[1]==='namespace') {output({metadata:{uid:'namespace',labels:{protected:'true'}}});process.exit(0);}
if(args[2]==='delete') {
 if(fault==='cleanup') process.exit(8);
 fs.unlinkSync(p+'/'+args[4]+'.json');console.log('deleted');process.exit(0);
}
if(args[2]!=='get') throw Error('Unexpected k '+args);
const resource=args[3],resourceName=args[4];
if(resource==='pods') {
 const d=read('deployment'),c=d.spec.template.spec.containers[0];
 output({items:[{metadata:{namespace:'tfm-golden',name:'controller-pod',uid:'pod',annotations:d.spec.template.metadata?.annotations,labels:{app:'quotes-node'}},spec:{containers:[c]},status:{phase:'Running',conditions:[{type:'Ready',status:'True'}],containerStatuses:[{name:'quotes-node',ready:fault!=='rollout',state:{running:{}},imageID:c.image}]}}]});process.exit(0);
}
const path=p+'/'+(resource.toLowerCase()==='deployment'?'deployment':resourceName)+'.json';
if(fault==='lookup'&&!fs.existsSync(path)) {console.error('Unable to connect to API');process.exit(1);}
if(!fs.existsSync(path)) notfound(resource,resourceName);
const v=JSON.parse(fs.readFileSync(path));if(resource.toLowerCase()==='deployment') v.status={observedGeneration:v.metadata.generation,replicas:1,updatedReplicas:1,readyReplicas:1,availableReplicas:1};
output(v);
`;
function run(t,fault='',phase='all') {
 const dir=mkdtempSync(join(tmpdir(),'gp-runtime-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 writeFileSync(join(dir,'sim.cjs'),simulator);writeFileSync(join(dir,'base.json'),JSON.stringify(base));
 mkdirSync(join(dir,'runtime'));
 for(const scenario of ['F11','F12','L06']) {
  const folder=join(dir,'runtime',scenario);mkdirSync(folder);
  writeFileSync(join(dir,scenario+'-completed.json'),JSON.stringify({status:'NOT_EXECUTED'}));
  const value=structuredClone(base);delete value.metadata.uid;delete value.metadata.generation;
  if(scenario==='F11') Object.assign(value.spec.template.spec.containers[0].securityContext,{privileged:true,allowPrivilegeEscalation:true});
  if(scenario==='F12') value.spec.template.spec.containers[0].image='registry.example/quotes-node:run-test';
  writeFileSync(join(folder,'Deployment.json'),JSON.stringify(value));
  writeFileSync(join(folder,'Pod.json'),JSON.stringify({apiVersion:'v1',kind:'Pod',metadata:{name:'runtime-'+scenario.toLowerCase(),namespace:'tfm-golden',labels:{'tfm-runtime-trial':scenario}},spec:value.spec.template.spec}));
 }
 const result=spawnSync('bash',['-c',String.raw`
set -Eeuo pipefail
cd "$RUNTIME_ROOT"
source scripts/lib/context.sh
source tests/scenarios/f13.sh
source tests/scenarios/runtime.sh
source tests/scenarios/f11.sh
state_dir="$RUNTIME_STATE";image="$RUNTIME_IMAGE";mode=local
k() { command node "$state_dir/sim.cjs" k "$@"; }
actor() { command node "$state_dir/sim.cjs" actor "$@"; }
get() { printf 'registry.example/quotes-node:run-test'; }
attestations_ci_gate() { printf '%s\n' "$*" > "$state_dir/gate.log"; }
scenario_runtime_early() { :; }
scenario_runtime_tag() { [[ "$RUNTIME_FAULT" != tag-failure ]] || return 9; printf '{}' > "$1.json"; }
probe() { [[ "$RUNTIME_FAULT" != http ]] || return 10; }
if [[ "$RUNTIME_PHASE" == all ]]; then scenario_runtime_create; else scenario_runtime_snapshot "$state_dir/runtime/before"; fi
cp "$state_dir/base.json" "$state_dir/deployment.json"
printf 'created\n' > "$state_dir/L01-admission.log"
for file in health version quote; do printf '{}' > "$state_dir/tfm-golden-$file.json"; done
scenario_l06
`],{env:{...process.env,RUNTIME_ROOT:root,RUNTIME_STATE:dir,RUNTIME_IMAGE:image,RUNTIME_FAULT:fault,RUNTIME_PHASE:phase},encoding:'utf8',timeout:30000});
 assert.ifError(result.error);return {...result,dir};
}
test('actual family functions complete negative operations, same-image L06 change and isolated Pod cleanup',t=>{
 const r=run(t);assert.equal(r.status,0,r.stdout+r.stderr);
 for(const scenario of ['F11','F12']) assert.equal(JSON.parse(readFileSync(join(r.dir,scenario+'-completed.json'))).operations.length,3);
 const result=JSON.parse(readFileSync(join(r.dir,'L06-result.json')));assert.equal(result.update.toGeneration,2);
 const calls=readFileSync(join(r.dir,'calls.log'),'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(calls.filter(c=>c[0]==='actor'&&c[2]==='create').length,5);
 assert.equal(calls.filter(c=>c[0]==='actor'&&c[2]==='replace').length,3);
 assert.ok(!calls.some(c=>c[0]==='k'&&['apply','create','replace'].includes(c[3])));
});
for(const [fault,phase] of [['accepted','all'],['converted','update'],['api','all'],['extra','all'],['lookup','all'],['tag-failure','all'],['changed-update','update'],['update-failure','update'],['noop','update'],['rollout','update'],['http','update'],['cleanup','update']]) {
 test('actual runtime functions stop without completion on '+fault,t=>{
  const r=run(t,fault,phase);assert.notEqual(r.status,0,r.stdout+r.stderr);
  const marker={converted:'F12/Deployment-UPDATE/response.log',noop:'L06/update-response.log',http:'L06/update-probe.log',cleanup:'L06/pod-cleanup.log','update-failure':'L06/update-response.log'}[fault];
  if(marker) assert.ok(existsSync(join(r.dir,'runtime',marker)),r.stdout+r.stderr);
  if(existsSync(join(r.dir,'L06-result.json'))) assert.notEqual(JSON.parse(readFileSync(join(r.dir,'L06-result.json'))).status,'PASS');assert.notEqual(JSON.parse(readFileSync(join(r.dir,'F12-completed.json'))).status,'REJECTION_AND_L06_ACCEPTANCE_COMPLETE');
 });
}

test('F12 admission attribution accepts only the exact singleton policy/rule diagnostic and resource',t=>{
 const dir=mkdtempSync(join(tmpdir(),'gp-runtime-classifier-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const message='validation failure: IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest';
 const valid='resource Pod/tfm-golden/runtime-f12 was blocked due to the following policies\n\ntfm-runtime:\n  authorized-image-repository: '+message+'\n';
 for(const [text,accepted] of [[valid,true],[valid+'tfm-signature:\n  require-image-signature: failed\n',false],[valid.replace(message,'registry lookup failed'),false],[valid.replace('runtime-f12','other'),false],[valid.replace('authorized-image-repository:','restricted-containers:'),false],[valid+'  another-rule: failed\n',false],['Error from server (Forbidden): pods is forbidden',false]]) {
  writeFileSync(join(dir,'response.log'),text);
  const r=spawnSync('bash',['-c',String.raw`set -euo pipefail; source scripts/lib/context.sh; source tests/scenarios/f13.sh; source tests/scenarios/runtime.sh; scenario_f12_attribute "$RUNTIME_LOG" runtime-f12`],{cwd:root,env:{...process.env,RUNTIME_LOG:join(dir,'response.log')},encoding:'utf8'});
  assert.ifError(r.error);assert.equal(r.status===0,accepted,r.stderr);
 }
});

test('actual build persists its exact tag and a fresh context reads it without id',t=>{
 const dir=mkdtempSync(join(tmpdir(),'gp-runtime-tag-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 writeFileSync(join(dir,'state.json'),JSON.stringify({imageRepository:'registry.example/quotes-node',sourceRepository:'https://example.invalid/repo',sourceCommit:'a'.repeat(40)}));
 const r=spawnSync('bash',['-c',String.raw`
set -euo pipefail
source scripts/lib/context.sh
source scripts/lib/delivery.sh
state_dir="$RUNTIME_STATE";root="$PWD";image_repo=registry.example/quotes-node;id=run-exact;builder=synthetic;commit=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
SERVICE_NODE_IMAGE="$RUNTIME_IMAGE"
node() { printf '{}'; }
docker() {
  local previous='' arg
  for arg in "$@"; do
    if [[ "$previous" == --metadata-file ]]; then printf '{"containerimage.digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}' > "$arg"; fi
    if [[ "$previous" == --tag ]]; then printf '%s' "$arg" > "$state_dir/published-tag.txt"; fi
    previous="$arg"
  done
}
delivery_build
`],{cwd:root,env:{...process.env,RUNTIME_STATE:dir,RUNTIME_IMAGE:image},encoding:'utf8'});
 assert.ifError(r.error);assert.equal(r.status,0,r.stderr);
 const resumed=spawnSync('bash',['-c','set -euo pipefail; source scripts/lib/context.sh; state_dir="$RUNTIME_STATE"; load_delivery_context; get buildTag'],{cwd:root,env:{...process.env,RUNTIME_STATE:dir},encoding:'utf8'});
 assert.ifError(resumed.error);assert.equal(resumed.status,0,resumed.stderr);
 assert.equal(resumed.stdout.trim(),readFileSync(join(dir,'published-tag.txt'),'utf8'));
});

test('actual early scenario function rejects additional diagnostics and process errors',t=>{
 const dir=mkdtempSync(join(tmpdir(),'gp-runtime-early-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const input=join(dir,'input.json'),output=join(dir,'tool.json');writeFileSync(input,'{}');
 const f11=['ESCALATION: quotes-node must declare allowPrivilegeEscalation=false','PRIVILEGED: quotes-node must declare privileged=false'];
 for(const [messages,code,stderr,accepted] of [[f11,1,'',true],[[...f11,'DIGEST: unrelated'],1,'',false],[f11.slice(1),1,'',false],[f11,2,'',false],[f11,1,'evaluation error',false],[[],0,'',false]]) {
  writeFileSync(output,JSON.stringify([{filename:input,namespace:'manifests',successes:7,failures:messages.map(msg=>({msg}))}]));
  const result=spawnSync('bash',['-c',String.raw`
set -euo pipefail
source tests/scenarios/runtime.sh
conftest() { cat "$RUNTIME_OUTPUT"; printf '%s' "$RUNTIME_STDERR" >&2; return "$RUNTIME_CODE"; }
scenario_runtime_early "$RUNTIME_INPUT" F11 "$RUNTIME_PREFIX"
`],{cwd:root,env:{...process.env,RUNTIME_INPUT:input,RUNTIME_OUTPUT:output,RUNTIME_PREFIX:join(dir,'early'),RUNTIME_CODE:String(code),RUNTIME_STDERR:stderr},encoding:'utf8'});
  assert.ifError(result.error);assert.equal(result.status===0,accepted,result.stderr);
 }
});
