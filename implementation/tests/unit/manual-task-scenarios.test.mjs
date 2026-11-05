// Synthetic orchestration and contract inputs. No live or human execution claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, lstatSync, symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {manifestInput, manifestDecision, correctedDependency, functional} from '../scenarios/manual-task-evidence.mjs';
import {syntheticAnalysis} from './support/vulnerability-fixture.mjs';
const root = resolve(import.meta.dirname, '../..');
const base = JSON.parse(readFileSync(join(root, 'tests/policies/fixtures/base.json'))).manifests;
function directory(t) {
  const value = mkdtempSync(join(tmpdir(), 'synthetic-manual-'));
  t.after(() => rmSync(value, {recursive:true, force:true})); return value;
}
function shell(t, code, env = {}) {
  const dir = directory(t);
  const result = spawnSync('bash', ['--noprofile', '--norc', '-c', `set -Eeuo pipefail\nsource "$SOURCE/tests/scenarios/manual-tasks.sh"\n${code}`],
    {cwd:root, env:{...process.env, BASH_ENV:'', SOURCE:root, FIXTURE:dir, ...env}, encoding:'utf8', timeout:10000});
  assert.ifError(result.error); return {...result, dir};
}
test('manual scenario import defines functions without infrastructure', t => {
  const result = shell(t, 'declare -F manual_task_prepare manual_task_check');
  assert.equal(result.status, 0, result.stderr);
});
test('F11 keeps every field except the two agreed privilege settings', () => {
  const bad = structuredClone(base);
  bad.spec.template.spec.containers[0].securityContext.privileged = true;
  bad.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation = true;
  assert.equal(manifestInput(base, bad).status, 'PASS');
  const omitted = structuredClone(bad);
  delete omitted.spec.template.spec.containers[0].securityContext.privileged;
  // This is an admissible human edit, not policy acceptance. Conftest still
  // requires explicit false and the attributable decision stays unresolved.
  assert.equal(manifestInput(base, omitted).status, 'PASS');
  const malformed = structuredClone(bad);
  malformed.spec.template.spec.containers[0].securityContext.privileged = 'false';
  assert.throws(() => manifestInput(base, malformed));
  for (const alter of [x => {x.metadata.namespace='tfm-reference';}, x => {x.spec.template.spec.hostPID=true;}, x => {x.spec.template.spec.containers[0].image='other';}]) {
    const changed = structuredClone(bad); alter(changed);
    assert.throws(() => manifestInput(base, changed));
  }
});
test('manifest detection is attributed; transport and additional policy errors are not detection', () => {
  const data = [{filename:'synthetic.json',namespace:'manifests',successes:10,failures:[{msg:'PRIVILEGED: quotes-node must declare privileged=false'}]}];
  assert.equal(manifestDecision(1, data, '', 'synthetic.json').detected, true);
  assert.throws(() => manifestDecision(2, data, '', 'synthetic.json'));
  assert.throws(() => manifestDecision(1, data, 'connection failed', 'synthetic.json'));
  data[0].failures.push({msg:'HOST_ACCESS: hostPID is not allowed'});
  assert.throws(() => manifestDecision(1, data, '', 'synthetic.json'));
});
for (const scenario of ['F03', 'F10', 'F11']) {
  test(`${scenario} G stops at a rejected control before deployment; R can complete its reference path`, t => {
    const code = String.raw`
manual_scenario=$SCENARIO; manual_arm=$ARM; manual_namespace=tfm-reference; state_dir=$FIXTURE
k() { echo 'Error from server (NotFound): deployments.apps "quotes-node" not found' >&2; return 1; }
fail() { echo "$*" >&2; exit 1; }
manual_task_control() { echo "control:$1"; return 42; }
attestations_ci_gate() { echo gate; }
actor() { echo actor >> "$FIXTURE/events"; }
manual_task_probe() { echo probe >> "$FIXTURE/events"; }
manual_task_start
echo later
`;
    const g = shell(t, code, {SCENARIO:scenario, ARM:'G'});
    assert.equal(g.status, 42, g.stderr); assert.doesNotMatch(g.stdout, /later/);
    const r = shell(t, code, {SCENARIO:scenario, ARM:'R'});
    assert.equal(r.status, 0, r.stderr); assert.doesNotMatch(r.stdout, /control:/);
    assert.equal(readFileSync(join(r.dir,'events'),'utf8'), 'actor\nprobe\n');
  });
}
test('nested command failure cannot be masked by orchestration', t => {
  const result = shell(t, String.raw`
manual_arm=G; manual_scenario=F03; manual_namespace=tfm-golden; state_dir=$FIXTURE
k() { echo 'Error from server (NotFound): deployments.apps "quotes-node" not found' >&2; return 1; }
fail() { echo "$*" >&2; exit 1; }
manual_task_control() { echo synthetic-failure; false; echo masked; }
actor() { echo unexpected; }
manual_task_start
`);
  assert.equal(result.status, 1); assert.doesNotMatch(result.stdout, /masked|unexpected/);
});
test('each operation restores a separate state copy and preserves previous diagnostics', t => {
  const r = shell(t, String.raw`
mkdir "$FIXTURE/original"
echo '{"synthetic":true,"digest":"old"}' > "$FIXTURE/original/state.json"
echo 'synthetic immutable output' > "$FIXTURE/original/unit-tests.log"
load_delivery_context() { :; }
manual_task_child "$FIXTURE/first" "$FIXTURE/original"
echo '{"synthetic":true,"digest":"changed"}' > "$state_dir/state.json"
echo failure > "$state_dir/failure.log"
manual_task_child "$FIXTURE/second" "$FIXTURE/original"
cmp "$state_dir/state.json" "$FIXTURE/original/state.json"
cat "$FIXTURE/first/failure.log"
`);
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /failure/);
  assert.notEqual(readFileSync(join(r.dir,'first/state.json'),'utf8'), readFileSync(join(r.dir,'second/state.json'),'utf8'));
});
test('new participant workspaces restore the original dependency without touching earlier attempts', t => {
  const r=shell(t,String.raw`
manual_task_copy_source "$FIXTURE/first"
echo '{"synthetic":"human edit"}' > "$FIXTURE/first/package.json"
manual_task_copy_source "$FIXTURE/second"
cmp "$FIXTURE/second/package.json" tests/fixtures/vulnerabilities/f03-vulnerable/package.json
cat "$FIXTURE/first/package.json"
`);
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/human edit/);
});
test('cleanup preserves previously packaged failed preparation bytes', t => {
  const r = shell(t, String.raw`
root=$FIXTURE; mode=local
task="$root/evidence/manual-tasks/task-one"
mkdir -p "$task/operator" "$root/owner" "$task/operations/0002-cleanup"
jq -n --arg task "$task" '{scenario:"F11",arm:"G",taskDirectory:$task,status:"PREPARING",synthetic:true}' > "$root/owner/manual-task.json"
cp "$root/owner/manual-task.json" "$root/original.json"
jq '.status="INCOMPLETE"' "$root/original.json" > "$task/record.json"
printf '%s\n' "$root/owner" > "$task/operator/state-path.txt"
touch "$root/owner/.evidence-packaged"
load_state() { state_dir=$GP_STATE_DIR; }
fail() { echo "$*" >&2; exit 1; }
manual_task_dispatch cleanup "$task" "$task/operations/0002-cleanup"
cmp "$root/owner/manual-task.json" "$root/original.json"
[[ "$preserve" == 0 && ! -e "$root/owner/result.json" ]]
`);
  assert.equal(r.status, 0, r.stderr);
});
for (const fault of ['none', 'registry', 'cluster', 'builder', 'volume', 'private', 'private-link', 'docker', 'inventory']) {
  test(`cleanup observes owned resources without recreating private state: ${fault}`, t => {
    const r = shell(t, String.raw`
manual_operation=$FIXTURE/operation; private=$FIXTURE/private-synthetic
registry=tfm-zot-run-synthetic; cluster=tfm-demo-run-synthetic; builder=tfm-build-run-synthetic
export DOCKER_CONFIG="$private/docker"
mkdir "$manual_operation"
if [[ "$FAULT" == private ]]; then mkdir "$private"; fi
if [[ "$FAULT" == private-link ]]; then ln -s "$FIXTURE/absent" "$private"; fi
docker() {
  echo "$*" >> "$FIXTURE/docker-commands"
  case "$1" in
    info)
      if [[ "$FAULT" == docker ]]; then echo synthetic-daemon-error >&2; return 19; fi;;
    ps)
      if [[ "$FAULT" == inventory ]]; then echo synthetic-inventory-error >&2; return 20; fi
      case "$FAULT:$*" in
        registry:*name=*tfm-zot-*) echo "$registry";;
        cluster:*label=*) echo "$cluster-control-plane";;
        builder:*name=*buildx_buildkit_*) echo "buildx_buildkit_""$builder"0;;
      esac;;
    volume)
      if [[ "$FAULT" == volume ]]; then echo "buildx_buildkit_""$builder"0_state; fi;;
    buildx)
      # Pinned Buildx really initializes this state during an inventory query.
      mkdir -p "$DOCKER_CONFIG/buildx/activity"
      echo default;;
    *) echo unexpected-synthetic-command >&2; return 90;;
  esac
}
manual_task_cleanup_check
[[ ! -e "$private" && ! -L "$private" ]]
` , {FAULT:fault});
    if (fault === 'none') {
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(readFileSync(join(r.dir,'operation/cleanup-check.txt'),'utf8'), /absent/);
      assert.doesNotMatch(readFileSync(join(r.dir,'docker-commands'),'utf8'), /buildx ls/);
    } else {
      assert.notEqual(r.status, 0, 'a remaining resource or inventory error must fail cleanup');
      assert.throws(() => lstatSync(join(r.dir,'operation/cleanup-check.txt')), {code:'ENOENT'});
    }
  });
}
test('safe packaging retains manual operations and input evidence but excludes private state', t => {
  const dir=directory(t), owner=join(dir,'run-synthetic');
  mkdirSync(join(owner,'manual-operations/0001-check/input-source'),{recursive:true});
  writeFileSync(join(owner,'manual-task.json'),'{"synthetic":true,"schema":"manual-task/v1"}');
  writeFileSync(join(owner,'manual-operations/0001-check/failure.log'),'synthetic failed check');
  writeFileSync(join(owner,'manual-operations/0001-check/state.json'),'{"syntheticPrivate":"excluded"}');
  writeFileSync(join(owner,'manual-operations/0001-check/input-source/package.json'),'{"synthetic":true}');
  const r=spawnSync('python3',[join(root,'scripts/package-evidence.py'),owner,join(dir,'packages'),'FAIL'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  const archive=join(dir,'packages/run-synthetic.tar.gz');
  const audit=spawnSync('python3',['-c',String.raw`
import hashlib,json,pathlib,sys,tarfile
p=pathlib.Path(sys.argv[1]);assert hashlib.sha256(p.read_bytes()).hexdigest()==pathlib.Path(str(p)+'.sha256').read_text().split()[0]
with tarfile.open(p) as a:
 names=a.getnames()
 assert 'run-synthetic/manual-operations/0001-check/failure.log' in names
 assert 'run-synthetic/manual-operations/0001-check/input-source/package.json' in names
 assert not any(n.endswith('/state.json') for n in names)
 assert 'manual task' in json.load(a.extractfile('run-synthetic/execution-summary.json'))['scope']
 for line in a.extractfile('run-synthetic/SHA256SUMS.txt').read().decode().splitlines():
  digest,name=line.split('  ',1)
  assert hashlib.sha256(a.extractfile('run-synthetic/'+name).read()).hexdigest()==digest
`,archive],{encoding:'utf8'});
  assert.equal(audit.status,0,audit.stderr);
});
test('manual archive retains resolvable event and receipt evidence from the owned controller task', t => {
  const r=shell(t,String.raw`
manual_owner=$FIXTURE/evidence/raw/run-synthetic
manual_task=$FIXTURE/evidence/manual-tasks/session/calibration/task-synthetic
manual_scenario=F03
mkdir -p "$manual_owner" "$manual_task/operator"
echo "$manual_owner" > "$manual_task/operator/state-path.txt"
echo '{"synthetic":true}' > "$manual_task/operator/prepared.json"
for item in 0001-prepare 0002-tool 0003-check 0004-check; do
  manual_operation=$manual_task/operations/$item
  mkdir -p "$manual_operation"
  echo '{"synthetic":true}' > "$manual_operation/request.json"
  echo '{"synthetic":true,"exitCode":0}' > "$manual_operation/exit.json"
  echo 'synthetic operation' > "$manual_operation/command.log"
  echo 'excluded state' > "$manual_operation/state.json"
  printf '%s\n' '-----BEGIN PRIVATE KEY-----' 'SYNTHETIC' > "$manual_operation/secret.log"
  if [[ "$item" == 0001-prepare ]]; then continue; fi
  state_dir=$manual_owner/manual-operations/$item
  mkdir -p "$state_dir"
  echo '{"synthetic":true,"status":"BLOCKED"}' > "$state_dir/analysis.json"
  if [[ "$item" == 0002-tool ]]; then
    manual_task_detection scan "$state_dir/analysis.json"
  elif [[ "$item" == 0003-check ]]; then
    manual_task_check_result CORRECTION_REJECTED vulnerability-policy "$state_dir/analysis.json"
  else
    echo '{"synthetic":true,"status":"VALIDATED_COMPLETION","scenario":"F03"}' > "$manual_operation/completion.json"
    manual_task_check_result VALIDATED_COMPLETION complete "$manual_operation/completion.json"
  fi
done
python3 - "$manual_owner" "$manual_task" <<'PY'
import hashlib,json,pathlib,sys
owner,task=map(pathlib.Path,sys.argv[1:])
paths=['operator/prepared.json','operations/0001-prepare/exit.json','operations/0002-tool/detection.json',
       'operations/0002-tool/exit.json','operations/0003-check/check-result.json','operations/0004-check/check-result.json']
value={'schema':'manual-task/v1','synthetic':True,'taskDirectory':str(task),'status':'COMPLETED','humanAcceptance':'pending',
       'events':[{'evidence':{'path':p,'sha256':hashlib.sha256((task/p).read_bytes()).hexdigest()}} for p in paths]}
for p in [owner/'manual-task.json',task/'record.json']: p.write_text(json.dumps(value))
PY
python3 scripts/package-evidence.py "$manual_owner" "$FIXTURE/packages" PASS
`);
  assert.equal(r.status,0,r.stderr);
  const audit=spawnSync('python3',['-c',String.raw`
import hashlib,json,posixpath,sys,tarfile,pathlib
root=pathlib.Path(sys.argv[1]);p=root/'packages/run-synthetic.tar.gz'
assert hashlib.sha256(p.read_bytes()).hexdigest()==pathlib.Path(str(p)+'.sha256').read_text().split()[0]
with tarfile.open(p) as archive:
 names=archive.getnames();prefix='run-synthetic/'
 record=json.load(archive.extractfile(prefix+'manual-task.json'))
 def linked(base,link):
  assert not link['path'].startswith('/'),link
  name=posixpath.normpath(posixpath.join(base,link['path']))
  assert name.startswith(prefix) and name in names,name
  data=archive.extractfile(name).read()
  assert hashlib.sha256(data).hexdigest()==link['sha256'],name
  return name,json.loads(data)
 for event in record['events']:
  name,value=linked(prefix,event['evidence'])
  if 'evidence' in value: linked(posixpath.dirname(name),value['evidence'])
 for n in ['0001-prepare','0002-tool','0003-check','0004-check']:
  for f in ['request.json','exit.json','command.log']: assert prefix+'operations/'+n+'/'+f in names
 assert not any(n.endswith(('/state.json','/secret.log')) for n in names)
 for line in archive.extractfile(prefix+'SHA256SUMS.txt').read().decode().splitlines():
  digest,name=line.split('  ',1)
  assert hashlib.sha256(archive.extractfile(prefix+name).read()).hexdigest()==digest
 assert archive.extractfile(prefix+'manual-task.json').read()==(root/'evidence/raw/run-synthetic/manual-task.json').read_bytes()
`,r.dir],{encoding:'utf8'});
  assert.equal(audit.status,0,audit.stderr);
});
test('manual packaging rejects foreign owners, symlinks and broken event links while retaining prior archives', t => {
  for (const fault of ['owner','directory-link','file-link','missing','changed','escape']) {
    const dir=directory(t), owner=join(dir,'evidence/raw/run-synthetic');
    const task=join(dir,'evidence/manual-tasks/session/calibration/task-synthetic');
    const operation=join(task,'operations/0001-check'), operator=join(task,'operator'), output=join(dir,'packages');
    mkdirSync(owner,{recursive:true});mkdirSync(operation,{recursive:true});mkdirSync(operator);mkdirSync(output);
    const evidence=join(operation,'exit.json');writeFileSync(evidence,'{"synthetic":true}');
    writeFileSync(join(operator,'state-path.txt'),fault==='owner'?dir:owner);
    const link={path:'operations/0001-check/exit.json',sha256:createHash('sha256').update(readFileSync(evidence)).digest('hex')};
    if (fault==='changed') link.sha256='0'.repeat(64);
    if (fault==='escape') link.path='../../outside.json';
    writeFileSync(join(owner,'manual-task.json'),JSON.stringify({schema:'manual-task/v1',synthetic:true,taskDirectory:task,status:'INCOMPLETE',events:[{evidence:link}]}));
    if (fault==='directory-link') { rmSync(operation,{recursive:true}); symlinkSync(owner,operation); }
    if (fault==='file-link') { rmSync(evidence); symlinkSync(join(owner,'manual-task.json'),evidence); }
    if (fault==='missing') rmSync(evidence);
    const archive=join(output,'run-synthetic.tar.gz');writeFileSync(archive,'previous synthetic archive');
    const r=spawnSync('python3',[join(root,'scripts/package-evidence.py'),owner,output,'FAIL'],{encoding:'utf8'});
    assert.notEqual(r.status,0,fault);
    assert.equal(readFileSync(archive,'utf8'),'previous synthetic archive');
    assert.equal(JSON.parse(readFileSync(join(owner,'manual-task.json'))).status,'INCOMPLETE');
  }
});
test('F10 completion obtains the authorized digest and never calls signing or restoration', t => {
  const r = shell(t, String.raw`
mkdir -p "$FIXTURE/operator" "$FIXTURE/operation"
echo '{"candidate":"synthetic-initial","authorizedArtifact":"registry.invalid/authorized@sha256:aa"}' > "$FIXTURE/operator/prepared.json"
manual_task=$FIXTURE; manual_operation=$FIXTURE/operation; manual_owner=$FIXTURE; state_dir=$FIXTURE
manual_scenario=F10; manual_arm=G; manual_namespace=tfm-golden; image=registry.invalid/authorized@sha256:aa
manual_task_control() { echo "$1" >> "$FIXTURE/events"; }
manual_task_delete() { echo delete >> "$FIXTURE/events"; }
actor() { echo create >> "$FIXTURE/events"; }
manual_task_probe() { echo probe >> "$FIXTURE/events"; }
manual_task_profile_check() { echo profile >> "$FIXTURE/events"; }
node() { echo '{"status":"PASS","synthetic":true}'; }
attestations_verify_delivery() { echo UNEXPECTED_SIGN; return 17; }
attestations_authorize_results() { echo UNEXPECTED_SIGN; return 17; }
manual_task_check
`);
  assert.equal(r.status, 0, r.stderr); assert.doesNotMatch(r.stdout, /UNEXPECTED_SIGN/);
  assert.equal(readFileSync(join(r.dir,'events'),'utf8'), 'provenance\ndelete\ncreate\nprobe\nprofile\n');
});
test('F10 wrong selected artifact is unresolved and is never repaired automatically', t => {
  const r = shell(t, String.raw`
mkdir -p "$FIXTURE/operator" "$FIXTURE/operation"
echo '{"candidate":"synthetic-initial","authorizedArtifact":"authorized"}' > "$FIXTURE/operator/prepared.json"
manual_task=$FIXTURE; manual_operation=$FIXTURE/operation; state_dir=$FIXTURE; manual_scenario=F10; image=unauthorized
manual_task_control() { echo unexpected; }
manual_task_check
`);
  assert.equal(r.status, 43, r.stderr); assert.doesNotMatch(r.stdout, /unexpected/);
  assert.equal(JSON.parse(readFileSync(join(r.dir,'operation/check-result.json'))).status, 'CORRECTION_REJECTED');
});
test('F03 distinguishes a retained vulnerability rejection from build, scanner and evaluator failures', t => {
  for (const stage of ['build','scan','evaluation','blocked']) {
    const r = shell(t, String.raw`
mkdir -p "$FIXTURE/operator" "$FIXTURE/operation" "$FIXTURE/participant"
manual_task_copy_source "$FIXTURE/participant/source"
echo '{"candidate":"synthetic-initial","base":"synthetic-base"}' > "$FIXTURE/operator/prepared.json"
manual_task=$FIXTURE; manual_operation=$FIXTURE/operation; manual_owner=$FIXTURE; state_dir=$FIXTURE
manual_scenario=F03; manual_arm=R; commit=synthetic
delivery_build() { if [[ "$FAIL_STAGE" == build ]]; then false; fi; echo '{}' > "$state_dir/build-inputs.json"; }
put() { :; }
load_delivery_context() { :; }
delivery_render_manifests() { :; }
delivery_check_manifest() { :; }
delivery_scan() { if [[ "$FAIL_STAGE" == scan ]]; then false; fi; echo scanned; }
delivery_evaluate_vulnerabilities() {
  if [[ "$FAIL_STAGE" == evaluation ]]; then false; fi
  echo '{"status":"BLOCKED","synthetic":true}' > "$state_dir/analysis.json"
}
manual_task_check
echo unexpected-completion
`, {FAIL_STAGE:stage});
    assert.equal(r.status, stage==='blocked'?43:1, r.stderr);
    assert.doesNotMatch(r.stdout, /unexpected-completion/);
    const result=JSON.parse(readFileSync(join(r.dir,'operation/check-result.json')));
    assert.equal(result.status, stage==='blocked'?'CORRECTION_REJECTED':'INTEGRATION_ERROR');
    if (stage==='blocked') assert.equal(result.evidence.sha256, createHash('sha256').update(readFileSync(join(r.dir,'analysis.json'))).digest('hex'));
  }
});
test('F11 correction rejection requires the attributed privilege decision, not evaluator errors', t => {
  for (const stage of ['privileges','evaluation','unrelated-denial']) {
    const r=shell(t,String.raw`
mkdir -p "$FIXTURE/operator" "$FIXTURE/operation"
echo '{"candidate":"synthetic-initial"}' > "$FIXTURE/operator/prepared.json"
manual_task=$FIXTURE; manual_operation=$FIXTURE/operation; state_dir=$FIXTURE; manual_scenario=F11
conftest() {
  if [[ "$FAIL_STAGE" == evaluation ]]; then echo 'synthetic evaluator failure' >&2; return 2; fi
  local msg='PRIVILEGED: quotes-node must declare privileged=false'
  if [[ "$FAIL_STAGE" == unrelated-denial ]]; then msg='HOST_ACCESS: hostPID is not allowed'; fi
  jq -n --arg file "$state_dir/tfm-golden.json" --arg msg "$msg" '[{filename:$file,namespace:"manifests",successes:10,failures:[{msg:$msg}]}]'
  return 1
}
manual_task_check
echo unexpected-completion
`,{FAIL_STAGE:stage});
    assert.equal(r.status, stage==='privileges'?42:1, r.stderr);
    assert.doesNotMatch(r.stdout,/unexpected-completion/);
    const result=JSON.parse(readFileSync(join(r.dir,'operation/check-result.json')));
    assert.equal(result.status,stage==='privileges'?'CORRECTION_REJECTED':'INTEGRATION_ERROR');
    if (stage==='privileges') assert.equal(result.evidence.sha256,createHash('sha256').update(readFileSync(join(r.dir,'manifest-decision.json'))).digest('hex'));
  }
});
test('F03 requires a new corrected image, same database, target removal and actual dependency behavior evidence', t => {
  const dir = directory(t), before = join(dir,'before'), after = join(dir,'after'); mkdirSync(before); mkdirSync(after);
  syntheticAnalysis(before, 'F03-vulnerable');
  syntheticAnalysis(after, 'F03-repaired', {image:'registry.invalid/lab@sha256:'+'b'.repeat(64)});
  for (const p of [before, after]) writeFileSync(join(p,'dependency-behavior.log'), JSON.stringify({status:'PASS',result:{coverage:'basic',amount:'100000'}})+'\n');
  assert.equal(correctedDependency(before, after).targetRemoved, true);
  writeFileSync(join(after,'dependency-behavior.log'), JSON.stringify({status:'PASS',result:{changed:true}}));
  assert.throws(() => correctedDependency(before, after), /behavior changed/);
  syntheticAnalysis(after, 'F03-vulnerable', {image:'registry.invalid/lab@sha256:'+'b'.repeat(64)});
  assert.throws(() => correctedDependency(before, after));
});
test('all scenarios preserve identical health, source version and quote behavior', t => {
  const dir=directory(t), a=join(dir,'a'), b=join(dir,'b'); mkdirSync(a);mkdirSync(b);
  for (const suffix of ['health','version','quote']) {
    writeFileSync(join(a,`tfm-reference-${suffix}.json`),'{"synthetic":true}');
    writeFileSync(join(b,`tfm-golden-${suffix}.json`),'{"synthetic":true}');
  }
  assert.equal(functional(a,b,'tfm-golden').status,'PASS');
  writeFileSync(join(b,'tfm-golden-quote.json'),'{"synthetic":true,"premiumCents":2}');
  assert.throws(() => functional(a,b,'tfm-golden'), /quote/);
});
test('functional oracle distinguishes observed incompatibility from missing or malformed evidence', t => {
  const dir=directory(t), a=join(dir,'before'), b=join(dir,'after'); mkdirSync(a);mkdirSync(b);
  for (const suffix of ['health','version','quote']) {
    writeFileSync(join(a,`tfm-reference-${suffix}.json`),'{"synthetic":true}');
    writeFileSync(join(b,`tfm-golden-${suffix}.json`),'{"synthetic":true}');
  }
  const run=()=>spawnSync('node',['tests/scenarios/manual-task-evidence.mjs','functional',a,b,'tfm-golden'],{cwd:root,encoding:'utf8'});
  assert.equal(run().status,0);
  const output=join(b,'tfm-golden-quote.json');
  writeFileSync(output,'{"synthetic":true,"changed":true}');
  const rejected=run();assert.equal(rejected.status,43,rejected.stderr);
  assert.equal(JSON.parse(rejected.stdout).status,'CORRECTION_REJECTED');
  for (const corrupt of [()=>writeFileSync(output,'{'),()=>rmSync(output)]) {
    corrupt(); const failed=run();assert.equal(failed.status,1);
    assert.equal(JSON.parse(failed.stdout).status,'INTEGRATION_ERROR');
  }
});
for (const stage of ['registry','admission','rollout-http','profile','functional-error','functional-rejection']) {
  test(`completion classifies ${stage} without suppressing nested failures`, t => {
    const r=shell(t,String.raw`
mkdir -p "$FIXTURE/operator" "$FIXTURE/operation"
echo '{"candidate":"synthetic-initial","authorizedArtifact":"authorized"}' > "$FIXTURE/operator/prepared.json"
manual_task=$FIXTURE; manual_operation=$FIXTURE/operation; manual_owner=$FIXTURE; state_dir=$FIXTURE
manual_scenario=F10; manual_arm=G; manual_namespace=tfm-golden; image=authorized
manual_task_control() { if [[ "$FAIL_STAGE" == registry ]]; then false; fi; echo unexpected-after-error >> "$FIXTURE/events"; }
manual_task_delete() { :; }
actor() { if [[ "$FAIL_STAGE" == admission ]]; then return 1; fi; }
manual_task_probe() { if [[ "$FAIL_STAGE" == rollout-http ]]; then false; fi; }
manual_task_profile_check() { if [[ "$FAIL_STAGE" == profile ]]; then false; fi; }
node() {
  if [[ "$FAIL_STAGE" == functional-error ]]; then echo '{"status":"INTEGRATION_ERROR","synthetic":true}'; return 1; fi
  if [[ "$FAIL_STAGE" == functional-rejection ]]; then echo '{"status":"CORRECTION_REJECTED","reason":"synthetic mismatch","synthetic":true}'; return 43; fi
  echo '{"status":"PASS","synthetic":true}'
}
manual_task_check
echo completed
`,{FAIL_STAGE:stage});
    assert.notEqual(r.status,0);assert.doesNotMatch(r.stdout,/completed/);
    const result=JSON.parse(readFileSync(join(r.dir,'operation/check-result.json')));
    assert.equal(result.status,stage==='functional-rejection'?'CORRECTION_REJECTED':'INTEGRATION_ERROR');
    if (stage==='registry') assert.equal(r.status,1);
  });
}
test('manual F03 corrected context is explicit, immutable and still uses the fixed runtime wrapper', t => {
  mkdirSync(join(root,'evidence/raw'),{recursive:true});
  const owner=mkdtempSync(join(root,'evidence/raw/run-'));
  t.after(()=>rmSync(owner,{recursive:true,force:true}));
  const context=join(owner,'manual-operations/0001-check/input-source');
  mkdirSync(context,{recursive:true});
  const reset=()=>{ for(const file of ['Dockerfile','exercise.cjs','package.json','package-lock.json']) cpSync(join(root,'tests/fixtures/vulnerabilities/f03-repaired',file),join(context,file)); };
  reset();
  const commit='a'.repeat(40), base='172.18.0.2:5000/quotes@sha256:'+'b'.repeat(64);
  writeFileSync(join(owner,'state.json'),JSON.stringify({mode:'local',sourceCommit:commit,imageRepository:base.split('@')[0],digest:base.split('@')[1]}));
  writeFileSync(join(owner,'manual-task.json'),JSON.stringify({synthetic:true,lane:'A',scenario:'F03'}));
  const authorization=join(owner,'manual-operations/0001-check/input-authorization.json');
  function saveAuthorization() {
    const files=['Dockerfile','exercise.cjs','package.json','package-lock.json'].map(path=>({path,
      mode:(0o100000|(lstatSync(join(context,path)).mode&0o7777)).toString(8),
      sha256:createHash('sha256').update(readFileSync(join(context,path))).digest('hex')}));
    writeFileSync(authorization,JSON.stringify({schema:'manual-f03-build/v1',scenario:'F03',directory:context,commit,base,files}));
  }
  saveAuthorization();
  const run=()=>spawnSync('node',['scripts/capture-build-inputs.mjs',context,base,commit,authorization,'manual-correction'],{cwd:root,encoding:'utf8'});
  const accepted=run(); assert.equal(accepted.status,0,accepted.stderr);
  writeFileSync(join(context,'package.json'),'{"dependencies":{"minimist":"1.2.7"}}');
  assert.notEqual(run().status,0);
  reset();
  writeFileSync(join(context,'Dockerfile'),'FROM scratch\n');saveAuthorization();
  assert.notEqual(run().status,0,'cannot authorize a changed wrapper');
});
