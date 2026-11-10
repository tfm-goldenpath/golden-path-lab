// Opt-in Node coverage contract. Pure validation; no test execution on import.
import path from 'node:path';
const metrics={lines:'Line',functions:'Function',branches:'Branch'};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const fail=message=>{throw new Error(message);};
function keys(value,names) {
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).sort().join()!==[...names].sort().join()) fail('Unknown or missing quality configuration fields');
}
export function validateQualityConfig(c) {
 keys(c,['schema','include','exclude','thresholds','limits']);
 if(c.schema!=='node-quality-gate/v1') fail('Unsupported quality configuration schema');
 for(const field of ['include','exclude']) {
  if(!Array.isArray(c[field]) || c[field].length>100 || new Set(c[field]).size!==c[field].length) fail('Invalid '+field);
  for(const name of c[field]) if(typeof name!=='string' || !/^src\/(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(?:js|mjs|cjs))?$/.test(name)) fail('Expected literal production file or directory under src/: '+name);
 }
 if(!c.include.length) fail('Production scope is empty');
 keys(c.thresholds,Object.keys(metrics));
 for(const [key,value] of Object.entries(c.thresholds)) if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100) fail('Invalid threshold: '+key);
 keys(c.limits,['timeoutSeconds','maxOutputBytes','workers']);
 for(const [key,min,max] of [['timeoutSeconds',1,300],['maxOutputBytes',4096,16777216],['workers',1,2]]) if(!integer(c.limits[key])||c.limits[key]<min||c.limits[key]>max) fail('Invalid operational limit: '+key);
 return c;
}
const matches=(name,rule)=>rule.endsWith('/')?name.startsWith(rule):name===rule;
export function expectedFiles(config,inventory) {
 const production=inventory.map(f=>f.path.replace(/^service\//,'')).filter(n=>/^src\/.*\.(js|mjs|cjs)$/.test(n));
 for(const rule of [...config.include,...config.exclude]) if(!production.some(n=>matches(n,rule))) fail('Scope entry matches no committed production file: '+rule);
 const expected=production.filter(n=>config.include.some(r=>matches(n,r))&&!config.exclude.some(r=>matches(n,r))).sort();
 if(!expected.length) fail('Production scope is empty');
 return expected;
}
function counts(object,kind,details=false) {
 const total=object['total'+kind+'Count'], covered=object['covered'+kind+'Count'], percent=object['covered'+kind+'Percent'];
 if(!integer(total)||!integer(covered)||covered>total) fail('Invalid '+kind+' counts');
 // Native Node reports 100 for an empty denominator. Preserve counts but do not accept that as coverage.
 if(typeof percent!=='number'||!Number.isFinite(percent)||percent<0||percent>100 || Math.abs(percent-(total?covered/total*100:100))>1e-10) fail('Invalid or inconsistent '+kind+' percentage');
 if(details) {
  const entries=object[{Line:'lines',Function:'functions',Branch:'branches'}[kind]];
  if(!Array.isArray(entries)||entries.length!==total||entries.filter(e=>e.count>0).length!==covered || entries.some(e=>!integer(e.count)||!integer(e.line)||e.line<1||e.line>object.totalLineCount)) fail('Inconsistent '+kind+' detail counts');
  if(kind==='Line' && new Set(entries.map(e=>e.line)).size!==total) fail('Duplicate coverage lines');
 }
 return {covered,total,percent:total?covered/total*100:null};
}
export function evaluateCoverage(report,expected,workingDirectory,thresholds) {
 if(!report || report.workingDirectory!==workingDirectory || !Array.isArray(report.files)) fail('Missing or mismatched coverage report');
 const names=report.files.map(f=>path.relative(workingDirectory,f.path));
 if(names.some(n=>path.isAbsolute(n)||n.startsWith('../')) || new Set(names).size!==names.length || [...names].sort().join('\0')!==[...expected].sort().join('\0')) fail('Coverage file inventory mismatch; native collector cannot measure an unimported expected file');
 if(!expected.length) fail('Production scope is empty');
 const result={}, failures=[];
 for(const [key,kind] of Object.entries(metrics)) {
  const files=report.files.map(f=>counts(f,kind,true)), aggregate=counts(report.totals,kind);
  if(files.reduce((s,f)=>s+f.total,0)!==aggregate.total || files.reduce((s,f)=>s+f.covered,0)!==aggregate.covered) fail('Inconsistent aggregate '+key);
  result[key]={...aggregate,threshold:thresholds[key],status:aggregate.total?'APPLICABLE':'NOT_APPLICABLE'};
  if(!aggregate.total) fail('Coverage '+key+' is NOT_APPLICABLE (zero denominator); configured threshold cannot be evaluated');
  // Compare unrounded counts, never the presentation string.
  if(aggregate.covered/aggregate.total*100<thresholds[key]) failures.push(key+' threshold unmet');
 }
 return {metrics:result,failures};
}
export function parseReport(bytes,binding,expectedTests) {
 if(!bytes.length || !bytes.endsWith('\n')) fail('Missing or truncated runner report');
 const events=bytes.trimEnd().split('\n').map(line=>JSON.parse(line));
 const start=events.shift(), end=events.pop();
 if(start?.type!=='quality:start'||start.schema!=='node-quality-report/v1'||JSON.stringify(start.binding)!==JSON.stringify(binding)||end?.type!=='quality:end') fail('Report execution/consumer/configuration binding mismatch');
 const interrupted=events.find(e=>e.type==='test:fail' && e.data.details?.error?.signal);
 if(interrupted) fail('Test subprocess interrupted by '+interrupted.data.details.error.signal);
 const summaries=events.filter(e=>e.type==='test:summary'), global=summaries.filter(e=>!e.data.file);
 if(global.length!==1 || events.at(-1)!==global[0]) fail('Missing or duplicate final test summary');
 const files=summaries.filter(e=>e.data.file).map(e=>e.data.file).sort();
 const summary=global[0].data, c=summary.counts;
 if(!c||['tests','passed','failed','cancelled','skipped','todo','suites','topLevel'].some(k=>!integer(c[k]))||c.passed+c.failed+c.cancelled+c.skipped+c.todo!==c.tests||typeof summary.success!=='boolean'||!Number.isFinite(summary.duration_ms)||summary.duration_ms<0) fail('Invalid test counts');
 if(c.cancelled) fail('Tests cancelled or interrupted');
 if(c.skipped||c.todo) fail('Skipped/TODO tests do not establish a complete test run');
 if(!c.tests || !events.some(e=>['test:pass','test:fail'].includes(e.type)&&e.data.details?.type==='test'&&e.data.entryFile)) fail('Zero tests executed');
 if(files.join('\0')!==[...expectedTests].sort().join('\0')) fail('Test file inventory mismatch');
 if(summary.success!==(c.failed===0)) fail('Inconsistent test success');
 const coverage=events.filter(e=>e.type==='test:coverage');
 if(coverage.length!==1) fail('Missing or duplicate coverage report');
 for(const e of events) if(!['test:summary','test:coverage','test:pass','test:fail'].includes(e.type)) fail('Unsupported runner event');
 return {summary,coverage:coverage[0].data.summary};
}
export function present(result) {
 const lines=[`Node quality gate: ${result.status}`, ...result.diagnostics];
 for(const [name,m] of Object.entries(result.metrics||{})) lines.push(`${name}: ${m.percent===null?'unknown':m.percent.toFixed(2)+'%'} (${m.covered}/${m.total}), threshold ${m.threshold}%`);
 lines.push(`Evidence: ${result.output}`, 'Local hashes are not signed attestations or delivery authorization.');
 return lines.join('\n')+'\n';
}
