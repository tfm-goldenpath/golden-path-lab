import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateSbom} from './lab-contracts.mjs';
export function checkEvolution(before,after,initialDigest,replacementDigest) {
  validateSbom(before); validateSbom(after);
  if (!/^sha256:[a-f0-9]{64}$/.test(initialDigest) || !/^sha256:[a-f0-9]{64}$/.test(replacementDigest) || initialDigest===replacementDigest) throw new Error('L03 requires distinct image digests');
  const target=c=>c.name==='is-number' && c.version==='7.0.0' && c.purl==='pkg:npm/is-number@7.0.0';
  if(before.components.some(target) || after.components.filter(target).length!==1) throw new Error('Known real component addition not observed');
  return {scenario:'L03',initialDigest,replacementDigest,component:{name:'is-number',version:'7.0.0',purl:'pkg:npm/is-number@7.0.0'},observation:'absent-before-present-after',inventoryCompleteness:'not-established'};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const read=(d,f)=>JSON.parse(readFileSync(join(d,f)));
  const [before,after]=process.argv.slice(2);
  console.log(JSON.stringify(checkEvolution(read(before,'sbom.cdx.json'),read(after,'sbom.cdx.json'),read(before,'state.json').digest,read(after,'state.json').digest),null,2));
}
