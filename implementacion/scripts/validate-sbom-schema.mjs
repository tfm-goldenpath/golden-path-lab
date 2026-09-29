// Offline official CycloneDX schema validation. No document URL is resolved.
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {join} from 'node:path';
const require = createRequire(new URL('../tooling/package.json', import.meta.url));
const Ajv = require('ajv'), formats = require('ajv-formats'), internationalFormats=require('ajv-formats-draft2019');
const directory = fileURLToPath(new URL('../schemas/cyclonedx-1.7/', import.meta.url));
const sha256 = b => createHash('sha256').update(b).digest('hex');
const dialect = 'http://json-schema.org/draft-07/schema#';
let cached;
export function compileSchema(folder = directory) {
  const lock = JSON.parse(readFileSync(join(folder,'lock.json')));
  // Official schemas contain annotation extensions; strict schema linting is
  // disabled, not validation. Formats remain assertions; no coercion/defaults.
  const ajv = new Ajv({strict:false,allErrors:true,validateFormats:true});
  formats(ajv,{mode:'full'});
  internationalFormats(ajv);
  // uri-js normalizes whitespace/percent escapes before the extension checks
  // syntax. Reject those invalid lexical forms before normalization.
  for (const name of ['iri','iri-reference']) {
    const validate=ajv.formats[name];
    ajv.addFormat(name,value=>!/[\u0000-\u0020\u007f]/u.test(value)
      && !/%(?![0-9a-f]{2})/i.test(value) && validate(value));
  }
  // Refuse unrecognized formats even though official annotation keywords are allowed.
  const checkFormats=value=>{
    if (!value || typeof value!=='object') return;
    if (typeof value.format==='string' && !ajv.formats[value.format]) throw new Error('Unconfigured schema format: '+value.format);
    for (const child of Object.values(value)) checkFormats(child);
  };
  for (const [file, hash] of Object.entries(lock.files)) {
    const bytes=readFileSync(join(folder,file));
    if (sha256(bytes)!==hash) throw new Error('Schema integrity mismatch: '+file);
    if (!file.endsWith('.schema.json')) continue;
    const schema=JSON.parse(bytes);
    if (schema.$schema!==dialect) throw new Error('Unsupported schema dialect');
    checkFormats(schema);
    ajv.addSchema(schema);
  }
  const id='http://cyclonedx.org/schema/bom-1.7.schema.json';
  const validate=ajv.getSchema(id);
  if (!validate) throw new Error('Official CycloneDX schema missing');
  return {validate,lock,id};
}
export function validateSchema(document, reportFile, documentBytes=Buffer.from(JSON.stringify(document)), folder=directory, context={}) {
  const report={...context,documentSha256:sha256(documentBytes),specVersion:document?.specVersion,
    schema:'http://cyclonedx.org/schema/bom-1.7.schema.json',dialect,
    validator:{name:'ajv',version:require('ajv/package.json').version,formats:require('ajv-formats/package.json').version,internationalFormats:require('ajv-formats-draft2019/package.json').version,formatMode:'full'},
    status:'ERROR'};
  try {
    if (report.validator.version!=='8.17.1' || report.validator.formats!=='3.0.1' || report.validator.internationalFormats!=='1.6.1') throw new Error('Unpinned schema validator');
    const compiled=folder===directory ? (cached ??= compileSchema()) : compileSchema(folder);
    report.schemaRevision=compiled.lock.revision; report.schemaFiles=compiled.lock.files;
    if (document?.specVersion!=='1.7') throw new Error('Unsupported CycloneDX specVersion; allowed: 1.7');
    if (!compiled.validate(document)) {
      report.status='INVALID'; report.errors=compiled.validate.errors;
      throw new Error('Official CycloneDX schema validation failed');
    }
    report.status='VALID';
    return report;
  } catch(e) { report.reason=e.message; throw e; }
  finally { if (reportFile) writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n'); }
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [, , file,report]=process.argv;
  try {
    const bytes=readFileSync(file);
    let doc;
    try { doc=JSON.parse(bytes); } catch(e) {
      writeFileSync(report,JSON.stringify({status:'MALFORMED',documentSha256:sha256(bytes),schema:'http://cyclonedx.org/schema/bom-1.7.schema.json',dialect,validator:{name:'ajv',version:require('ajv/package.json').version},reason:e.message})+'\n'); throw e;
    }
    validateSchema(doc,report,bytes);
  } catch(e) { console.error('SBOM schema: '+e.message); process.exitCode=1; }
}
