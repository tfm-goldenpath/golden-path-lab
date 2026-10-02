// Manual-task oracles. These inspect real retained tool outputs, never authorize delivery.
import {readFileSync, lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {isDeepStrictEqual as equal} from 'node:util';
import {pathToFileURL} from 'node:url';
import {earlyDecision} from './runtime-evidence.mjs';
import {target, compatibility} from './vulnerability-evidence.mjs';
import {authorize, read} from '../../scripts/vulnerability-evidence.mjs';
const check = (ok, message) => { if (!ok) throw new Error(message); };
class CorrectionRejected extends Error {}
const correction = (ok, message) => { if (!ok) throw new CorrectionRejected(message); };

export function manifestInput(original, submitted) {
  const expected = structuredClone(original);
  const actual = submitted?.spec?.template?.spec?.containers?.[0]?.securityContext;
  check(actual && typeof actual === 'object', 'Container security context required');
  for (const field of ['privileged', 'allowPrivilegeEscalation']) {
    if (Object.hasOwn(actual, field)) {
      check(typeof actual[field] === 'boolean', 'Privilege settings must be booleans');
      expected.spec.template.spec.containers[0].securityContext[field] = actual[field];
    } else delete expected.spec.template.spec.containers[0].securityContext[field];
  }
  check(equal(expected, submitted), 'Only the two F11 privilege settings may change');
  return {status:'PASS', permittedChanges:['privileged','allowPrivilegeEscalation']};
}

export function manifestDecision(code, data, stderr, filename) {
  if (code === 0) return {...earlyDecision(code, data, stderr, filename, 'L06'), detected:false};
  // A partial human correction may leave exactly one of the two agreed settings.
  check(code === 1 && stderr === '' && Array.isArray(data) && data.length === 1, 'Manifest evaluator error');
  const row = data[0], allowed = ['PRIVILEGED: quotes-node must declare privileged=false', 'ESCALATION: quotes-node must declare allowPrivilegeEscalation=false'];
  check(row.filename === filename && row.namespace === 'manifests' && Number.isInteger(row.successes) && row.successes > 0 &&
    ['errors','warnings','exceptions'].every(k => row[k] === undefined || Array.isArray(row[k]) && row[k].length === 0), 'Malformed manifest decision');
  check(Array.isArray(row.failures) && row.failures.length > 0 && row.failures.length <= 2 &&
    new Set(row.failures.map(f => f.msg)).size === row.failures.length && row.failures.every(f => allowed.includes(f.msg)), 'Unrelated manifest denial');
  return {status:'PASS', detected:true, diagnostics:row.failures.map(f => f.msg)};
}

export function correctedDependency(before, after) {
  target(before, 'F03-vulnerable');
  const a = read(join(before, 'analysis.json')), b = read(join(after, 'analysis.json'));
  authorize(after, b.image);
  check(equal(a.database, b.database), 'Correction database differs from preparation');
  correction(a.image !== b.image, 'Correction requires a new image');
  const components = read(join(after, 'sbom.cdx.json')).components;
  correction(components.some(c => c.name === 'minimist' && c.version !== '1.2.5' && c.purl === `pkg:npm/minimist@${c.version}`), 'Corrected production dependency missing');
  const findings = read(join(after, 'vulnerabilities.json')).Results.flatMap(r => r.Vulnerabilities || []);
  correction(!findings.some(v => v.PkgName === 'minimist' && v.VulnerabilityID === 'CVE-2021-44906'), 'Expected vulnerability remains');
  correction(equal(compatibility(before), compatibility(after)), 'Dependency behavior changed');
  return {status:'PASS', targetRemoved:true, newImage:b.image, originalImage:a.image, globalThreshold:'PASS'};
}

export function functional(before, after, namespace) {
  for (const suffix of ['health','version','quote']) {
    correction(equal(read(join(before, `tfm-reference-${suffix}.json`)), read(join(after, `${namespace}-${suffix}.json`))), 'Functional compatibility failed: ' + suffix);
  }
  return {status:'PASS', functionality:'health/version/quote'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, a, b, c, d] = process.argv.slice(2);
  let result;
  try {
    if (command === 'manifest-input') result = manifestInput(read(a), read(b));
    else if (command === 'manifest-decision') result = manifestDecision(Number(a), read(b), readFileSync(c, 'utf8'), d);
    else if (command === 'authorize-build') {
      result = {schema:'manual-f03-build/v1',scenario:'F03',directory:a,commit:b,base:c,
        files:['Dockerfile','exercise.cjs','package.json','package-lock.json'].map(path => ({path,
          mode:(0o100000 | (lstatSync(join(a,path)).mode & 0o7777)).toString(8),
          sha256:createHash('sha256').update(readFileSync(join(a,path))).digest('hex')}))};
    }
    else if (command === 'corrected-dependency') result = correctedDependency(a, b);
    else if (command === 'functional') result = functional(a, b, c);
    else throw new Error('Unknown manual-task oracle');
  } catch (error) {
    result = {status:error instanceof CorrectionRejected ? 'CORRECTION_REJECTED' : 'INTEGRATION_ERROR', reason:error.message};
    process.exitCode = error instanceof CorrectionRejected ? 43 : 1;
  }
  console.log(JSON.stringify(result, null, 2));
}
