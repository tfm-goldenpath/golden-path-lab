// Synthetic reports and substituted external commands test actual functions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {association,decision,authorize,receipt,read} from '../../scripts/vulnerability-evidence.mjs';
import {target,remediation} from '../scenarios/vulnerability-evidence.mjs';
import {syntheticAnalysis,image} from './support/vulnerability-fixture.mjs';
const root=resolve(import.meta.dirname,'../..');
function setup(t,name='F03-repaired',options) {const d=mkdtempSync(join(tmpdir(),'vulnerability-unit-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return {d,...syntheticAnalysis(d,name,options)};}
function shell(d,code,env={}) {return spawnSync('bash',['-c',`set -Eeuo pipefail\nsource scripts/lib/context.sh\nsource scripts/lib/delivery.sh\nsource tests/scenarios/vulnerabilities.sh\nstate_dir="$GP_STATE"; image="$GP_IMAGE"; mode=local; root="$PWD"; port_pid=''\n${code}`],{cwd:root,encoding:'utf8',env:{...process.env,BASH_ENV:'',GP_STATE:d,GP_IMAGE:image,...env},timeout:20000});}
for(const name of ['F03-vulnerable','F03-repaired','F04','L02']) test(`actual evaluator and scenario assertion: ${name}`,t=>{
 const f=setup(t,name);const r=shell(f.d,`delivery_evaluate_vulnerabilities\nscenario_vulnerability_assert ${name}`); assert.equal(r.status,0,r.stderr);assert.equal(read(join(f.d,'target-attribution.json')).case,name);
});
for(const fault of ['accept','exit2','stderr','unrelated','missing-target','extra-target']) test(`actual evaluator rejects ${fault}`,t=>{
 const f=setup(t,'F03-vulnerable');const rows=read(join(f.d,'vulnerability-policy.json'));
 if(fault==='unrelated') rows[0].failures.push({msg:'TRIVY_REPORT_INVALID: invalid'});
 if(fault==='missing-target') rows[0].failures=[];
 if(fault==='extra-target') rows[0].failures.push({msg:'VULNERABILITY_BLOCK: CVE-OTHER unrelated HIGH (whether or not a fix is available)'});
 f.put('controlled-output.json',rows);
 const r=shell(f.d,`conftest() { cat "$state_dir/controlled-output.json"; ${fault==='stderr'?'echo error >&2; ':''}return ${fault==='accept'?0:fault==='exit2'?2:1}; }\ndelivery_evaluate_vulnerabilities\necho forbidden`);
 assert.notEqual(r.status,0);assert.doesNotMatch(r.stdout,/forbidden/);
});
test('additional real-shaped blocking findings are accounted for without concealing target',t=>{
 const f=setup(t,'F03-vulnerable');const report=read(join(f.d,'vulnerabilities.json'));report.Results[0].Vulnerabilities.push({VulnerabilityID:'CVE-SYNTHETIC',PkgName:'extra',Severity:'HIGH',FixedVersion:''});f.put('vulnerabilities.json',report);
 const r=shell(f.d,'delivery_evaluate_vulnerabilities\nscenario_vulnerability_assert F03-vulnerable');assert.equal(r.status,0,r.stderr);assert.equal(read(join(f.d,'target-attribution.json')).additionalFindings.length,1);
});
for(const fault of ['reference','repo-digest','image-id','artifact-type','component','version']) test(`reject wrong ${fault} association`,t=>{
 const f=setup(t,'F03-vulnerable');const report=read(join(f.d,'vulnerabilities.json')),sbom=read(join(f.d,'sbom.cdx.json'));
 if(fault==='reference') report.Metadata.Reference=image.replaceAll('a','b');
 if(fault==='repo-digest') report.Metadata.RepoDigests=[];
 if(fault==='image-id') report.Metadata.ImageID='wrong';
 if(fault==='artifact-type') report.ArtifactType='container_image';
 if(fault==='component') sbom.components=[];
 if(fault==='version') sbom.components[0].version='1.2.8';
 f.put('vulnerabilities.json',report);f.put('sbom.cdx.json',sbom);
 assert.throws(()=>{f.put('analysis.json',receipt(f.d,image,1));target(f.d,'F03-vulnerable');});
});
for(const name of ['F03-vulnerable','F04']) test(`actual results issuance prohibits ${name} before signing`,t=>{
 const f=setup(t,name);const r=shell(f.d,'source scripts/lib/attestations.sh\nattestations_ci_gate() { :; }\ncosign() { echo forbidden; }\nattestations_authorize_results\necho forbidden');assert.notEqual(r.status,0);assert.doesNotMatch(r.stdout,/forbidden/);
 const other=shell(f.d,`scenario_vulnerability_accept ${name} initial\necho forbidden`);assert.notEqual(other.status,0);assert.doesNotMatch(other.stdout,/forbidden/);
});
test('repaired target removal also requires global threshold and compatible behavior',t=>{
 const a=setup(t,'F03-vulnerable'),b=setup(t,'F03-repaired',{image:image.replace(/a{64}/,'b'.repeat(64))});
 for(const f of [a,b]) {writeFileSync(join(f.d,'dependency-behavior.log'),'{"status":"PASS","result":{"coverage":"basic"}}\n');for(const key of ['health','quote','version']) writeFileSync(join(f.d,`tfm-reference-${key}.json`),'{}');}
 assert.equal(remediation(a.d,b.d).status,'PASS');
 b.put('database-identity.json',{different:true});const receiptB=read(join(b.d,'analysis.json'));receiptB.database={different:true};b.put('analysis.json',receiptB);assert.throws(()=>remediation(a.d,b.d),/Database mismatch/);
 b.put('database-identity.json',read(join(a.d,'database-identity.json')));receiptB.database=read(join(a.d,'database-identity.json'));b.put('analysis.json',receiptB);
 writeFileSync(join(b.d,'dependency-behavior.log'),'{"status":"PASS","result":{}}');assert.throws(()=>remediation(a.d,b.d),/behavior changed/);
 const bad=setup(t,'F03-repaired',{findings:[{VulnerabilityID:'CVE-OTHER',PkgName:'unrelated',Severity:'HIGH'}]});assert.throws(()=>target(bad.d,'F03-repaired'),/Negative image/);
});
for(const fault of ['sbom','scan','database','evaluator']) test(`actual analysis propagates ${fault} failure`,t=>{
 const f=setup(t);const r=shell(f.d,`
get() { echo "$state_dir"; }; put() { :; }; contract=synthetic
node() { if [[ "$1" == scripts/vulnerability-evidence.mjs ]]; then command node "$@"; else echo 1.6; fi; }
delivery_database_prepare() { ${fault==='database'?'return 37':':'}; }
python3() { :; }
trivy() { case "$*" in *cyclonedx*) ${fault==='sbom'?'return 37':':'} ;; sbom*) ${fault==='scan'?'return 37':':'} ;; esac; }
conftest() { return 37; }
cp() { :; }
delivery_analyze
echo forbidden`);assert.notEqual(r.status,0,r.stderr);assert.doesNotMatch(r.stdout,/forbidden/);
});
test('database metadata and content drift fail closed',t=>{
 const f=setup(t);mkdirSync(join(f.d,'db'));writeFileSync(join(f.d,'db/trivy.db'),'synthetic DB bytes');f.put('db/metadata.json',{Version:2,UpdatedAt:'2026-09-29'});
 const identify=spawnSync('python3',['scripts/vulnerability-database.py','identify',f.d],{cwd:root,encoding:'utf8'});assert.equal(identify.status,0,identify.stderr);writeFileSync(join(f.d,'identity.json'),identify.stdout);
 for(const changed of [false,true]) {if(changed) writeFileSync(join(f.d,'db/trivy.db'),'changed');const r=spawnSync('python3',['scripts/vulnerability-database.py','check',f.d,join(f.d,'identity.json')],{cwd:root,encoding:'utf8'});assert.equal(r.status===0,!changed);}
});
test('stale image-specific evidence cannot authorize another image',t=>{const f=setup(t);assert.throws(()=>authorize(f.d,image.replace(/a{64}/,'b'.repeat(64))),/another image/);f.put('vulnerability-policy.json',[]);assert.throws(()=>authorize(f.d,image),/changed/);});
for(const fault of ['', 'verify', 'authorize', 'admission', 'probe', 'rollout']) test(`actual positive scenario with fresh evidence; failure=${fault}`,t=>{
 const parent=mkdtempSync(join(tmpdir(),'vulnerability-accept-'));t.after(()=>rmSync(parent,{recursive:true,force:true}));
 const d=join(parent,'F03-repaired');mkdirSync(d);syntheticAnalysis(d);
 writeFileSync(join(d,'state.json'),JSON.stringify({imageRepository:image.split('@')[0],digest:image.split('@')[1],sourceRepository:'https://example.invalid/lab',sourceCommit:'b'.repeat(40)}));
 writeFileSync(join(d,'tfm-reference-quote.json'),'{}');
 const r=shell(parent,`
event() { echo "$1" >> "$GP_STATE/events"; [[ "$GP_FAULT" != "$1" ]] || return 37; }
attestations_verify_delivery() { event verify; }
lab_install_admission() { event install; }
attestations_authorize_results() { event authorize; }
actor() { [[ "$1" == tfm-golden ]]; event admission; }
probe() { event probe; echo -n '{}' > "$state_dir/tfm-golden-quote.json"; }
k() { echo '{}'; }
node() { if [[ "$1" == scripts/check-image-rollout.mjs ]]; then event rollout; echo '{}'; else command node "$@"; fi; }
scenario_vulnerability_accept F03-repaired initial
`,{GP_FAULT:fault});
 assert.equal(r.status,fault?37:0,r.stderr);const events=readFileSync(join(parent,'events'),'utf8').trim().split('\n');assert.equal(events.at(-1),fault || 'rollout');assert.equal(existsSync(join(d,'acceptance.json')),!fault);
});
for(const fault of ['', 'build', 'manifest', 'scan', 'evaluate']) test(`actual preparation isolates state and stops on ${fault || 'no fault'}`,t=>{
 const parent=setup(t);parent.put('state.json',{digest:'sha256:'+'b'.repeat(64),imageRepository:image.split('@')[0],sourceRepository:'https://example.invalid/lab',sourceCommit:'b'.repeat(40),sbomVersion:'stale',buildTag:'stale'});
 for(const file of ['unit-tests.log','workflow-policy.json','versions.txt','tools-lock.json']) writeFileSync(join(parent.d,file),'synthetic source tests');
 const original=readFileSync(join(parent.d,'state.json'),'utf8');
 const r=shell(parent.d,`
commit=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
image=registry.invalid/lab@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
image_repo=registry.invalid/lab
event() { echo "$1" >> "$GP_STATE/events"; [[ "$GP_FAULT" != "$1" ]] || return 37; }
delivery_build() { event build; [[ "$(jq 'has("digest") or has("sbomVersion") or has("buildTag")' "$state_dir/state.json")" == false ]]; digest=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa; put digest "$digest"; }
delivery_render_manifests() { event manifest; }
delivery_check_manifest() { :; }
delivery_scan() { event scan; [[ ! -f "$state_dir/analysis.json" && ! -f "$state_dir/verified-results.json" ]]; }
delivery_evaluate_vulnerabilities() { event evaluate; }
scenario_vulnerability_assert() { event assert; }
scenario_vulnerability_prepare F03-vulnerable
`,{GP_FAULT:fault});
 assert.equal(r.status,fault?37:0,r.stderr);assert.equal(readFileSync(join(parent.d,'state.json'),'utf8'),original);assert.equal(readFileSync(join(parent.d,'events'),'utf8').trim().split('\n').at(-1),fault || 'assert');
 assert.ok(!existsSync(join(parent.d,'F03-vulnerable/results.bundle.json')));
});
test('packaging preserves partial family evidence and excludes database bytes/state',t=>{
 const p=setup(t);mkdirSync(join(p.d,'F03-vulnerable'));writeFileSync(join(p.d,'F03-vulnerable/vulnerabilities.json'),'{}');writeFileSync(join(p.d,'F03-vulnerable/state.json'),'secret');mkdirSync(join(p.d,'L02'));writeFileSync(join(p.d,'L02/analysis.json'),'{}');writeFileSync(join(p.d,'L02-result.json'),'{"status":"NOT_EXECUTED"}');
 const out=join(p.d,'packages');const r=spawnSync('python3',['scripts/package-evidence.py',p.d,out,'FAIL'],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 const summary=read(join(p.d,'execution-summary.json'));assert.equal(summary.scenarios.F03.status,'INCOMPLETE');assert.equal(summary.scenarios.L02.status,'NOT_EXECUTED');assert.ok(!readFileSync(join(p.d,'SHA256SUMS.txt'),'utf8').includes('state.json'));
});
test('explicit fixture capture keeps lock integrity and rejects other contexts',t=>{
 for(const name of ['f03-vulnerable','f03-repaired','f04','l02']) {
  const r=spawnSync('node',['scripts/capture-build-inputs.mjs','tests/fixtures/vulnerabilities/'+name,image,'b'.repeat(40)],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);const captured=JSON.parse(r.stdout);assert.ok(captured.files.some(f=>f.path==='package-lock.json'&&f.content.includes('sha512-')));assert.ok(captured.files.some(f=>f.path==='exercise.cjs'));assert.ok(!captured.files.some(f=>f.path.startsWith('node_modules')));
 }
 const r=spawnSync('node',['scripts/capture-build-inputs.mjs','tests/fixtures/vulnerabilities/other',image,'b'.repeat(40)],{cwd:root,encoding:'utf8'});assert.notEqual(r.status,0);
});
test('retained snapshots are checked again after a real-shaped scanner success',t=>{
 const f=setup(t);const r=shell(f.d,`
get() { echo "$state_dir"; }; put() { :; }; contract=synthetic
node() { echo 1.6; }
delivery_database_prepare() { :; }
python3() { echo database-drift >&2; return 37; }
trivy() { :; }
cp() { :; }
delivery_scan
echo forbidden`);assert.equal(r.status,37,r.stderr);assert.match(r.stderr,/database-drift/);assert.doesNotMatch(r.stdout,/forbidden/);
});
for(const field of ['errors','warnings','exceptions']) test(`malformed evaluator ${field} cannot become a denial`,t=>{
 const f=setup(t,'F04'),rows=read(join(f.d,'vulnerability-policy.json'));rows[0][field]={};f.put('vulnerability-policy.json',rows);assert.throws(()=>decision(f.d,1),/diagnostics/);
});
