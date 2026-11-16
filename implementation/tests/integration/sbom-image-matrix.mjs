// Directed copies are labelled fixtures, never authentic scanner emissions.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {files,hash,readSafe} from './sbom-image-compare.mjs';
const [source,other,destination]=process.argv.slice(2);
mkdirSync(destination);
const results=[];
for(const name of ['A','B','C','D','E']){
 const dir=destination+'/'+name;mkdirSync(dir);
 const t=JSON.parse(readSafe(source+'/trivy.json')),s=JSON.parse(readSafe((name==='D'?other:source)+'/syft.json')),r=JSON.parse(readSafe(source+'/receipt.json'));
 let transformation='Original bytes; no mutation';
 let tb=readSafe(source+'/trivy.json'),sb=readSafe((name==='D'?other:source)+'/syft.json');
 const index=t.components.findIndex(c=>c.purl?.startsWith('pkg:deb/')&&!c.version.includes(':'));
 if(name==='B'){transformation={operation:'remove component',pointer:'/components/'+index,original:t.components[index]};t.components.splice(index,1);tb=Buffer.from(JSON.stringify(t));}
 if(name==='C'){const c=t.components[index];transformation={operation:'replace full binary version and PURL version',pointer:'/components/'+index,original:structuredClone(c)};c.purl=c.purl.replace('@'+encodeURIComponent(c.version)+'?','@'+encodeURIComponent(c.version+'-spike')+'?');c.version+='-spike';tb=Buffer.from(JSON.stringify(t));}
 if(name==='D'){transformation='Pair original Node Trivy report with independently collected Temurin base Syft report';const otherReceipt=JSON.parse(readSafe(other+'/receipt.json'));r.commands[1]=otherReceipt.commands[1];}
 if(name==='E'){transformation='Replace document with invalid JSON';tb=Buffer.from('{');}
 r.trivySha256=hash(tb);r.syftSha256=hash(sb);
 if(name!=='A')r.fixture={label:'DIRECTED_NEGATIVE_NOT_PRODUCER_OUTPUT',transformation,originalTrivySha256:hash(readSafe(source+'/trivy.json'))};
 writeFileSync(dir+'/trivy.json',tb);writeFileSync(dir+'/syft.json',sb);writeFileSync(dir+'/receipt.json',JSON.stringify(r,null,2)+'\n');
 const result=files(dir);writeFileSync(dir+'/comparison.json',JSON.stringify(result,null,2)+'\n');
 results.push({case:name,expected:{A:'OBSERVE',B:'MISMATCH',C:'MISMATCH',D:'ERROR',E:'ERROR'}[name],observed:result.status,reason:result.reason,matches:result.matches?.length,differences:result.differences?.length});
}
writeFileSync(destination+'/matrix.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.expected!=='OBSERVE'&&r.expected!==r.observed))process.exitCode=1;
