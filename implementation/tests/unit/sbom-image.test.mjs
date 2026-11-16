import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,symlinkSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compare,files,readSafe,hash} from '../integration/sbom-image-compare.mjs';
const prop=(name,value)=>({name:'aquasecurity:trivy:'+name,value});
// Synthetic scanner documents: never evidence of a real image execution.
function fixture(){
 const id='sha256:'+'a'.repeat(64),url='pkg:deb/debian/binary@1%3A2.3-4?arch=amd64&distro=debian-12';
 const c={type:'library',name:'binary',version:'1:2.3-4',purl:url,properties:[prop('PkgType','debian'),prop('SrcName','source'),prop('SrcVersion','1:2.3-4')]};
 const t={bomFormat:'CycloneDX',specVersion:'1.7',version:1,metadata:{component:{type:'container',name:'synthetic',properties:[prop('ImageID',id)]}},components:[{type:'operating-system',name:'debian',version:'12'},c]};
 const s={schema:{version:'16.1.13'},descriptor:{name:'syft',version:'1.57.1',configuration:{search:{scope:'squashed'},catalogers:{used:['dpkg-db-cataloger']}}},source:{type:'image',metadata:{os:'linux',architecture:'amd64',imageID:id}},distro:{id:'debian',versionID:'12'},artifacts:[{type:'deb',name:'binary',version:c.version,purl:url,foundBy:'dpkg-db-cataloger',metadataType:'dpkg-db-entry',metadata:{package:'binary',version:c.version,architecture:'amd64',source:'source',sourceVersion:c.version},locations:[{path:'/var/lib/dpkg/status'}]}]};
 const r={schema:'sbom-image-acquisition/v1',status:'COLLECTED',platform:'linux/amd64',image:{configDigest:id,platform:'linux/amd64'},archiveSha256:'b'.repeat(64),commands:[0,1].map(()=>({exit:0,archiveSha256After:'b'.repeat(64)}))};
 return {t,s,r};
}
function evaluate(f){const bytes={trivy:Buffer.from(JSON.stringify(f.t)),syft:Buffer.from(JSON.stringify(f.s))};f.r.trivySha256??=hash(bytes.trivy);f.r.syftSha256??=hash(bytes.syft);return compare(f.t,f.s,f.r,bytes);}
const cases=[
 ['exact epoch/revision and binary/source distinction','MATCH',()=>{}],
 ['different order','MATCH',f=>f.t.components.reverse()],
 ['epoch qualifier lossless','MATCH',f=>f.t.components[1].purl='pkg:deb/debian/binary@2.3-4?arch=amd64&distro=debian-12&epoch=1'],
 ['version revision','MISMATCH',f=>{const c=f.t.components[1];c.version='1:2.3-5';c.purl=c.purl.replace('2.3-4','2.3-5');}],
 ['architecture all is distinct','MISMATCH',f=>{const c=f.t.components[1];c.purl=c.purl.replace('amd64','all');}],
 ['source name is not binary identity','MISMATCH',f=>{const c=f.t.components[1];c.name='source';c.purl=c.purl.replace('/binary@','/source@');}],
 ['identical duplicate','ERROR',f=>f.s.artifacts.push(structuredClone(f.s.artifacts[0]))],
 ['conflicting duplicate','ERROR',f=>{const c=structuredClone(f.s.artifacts[0]);c.version='2';c.metadata.version='2';c.purl=c.purl.replace('1%3A2.3-4','2');f.s.artifacts.push(c);}],
 ['missing dpkg PURL','ERROR',f=>delete f.t.components[1].purl],
 ['missing architecture','ERROR',f=>f.t.components[1].purl=f.t.components[1].purl.replace('arch=amd64&','')],
 ['duplicate qualifier','ERROR',f=>f.t.components[1].purl+='&arch=all'],
 ['ambiguous epoch','ERROR',f=>f.t.components[1].purl+='&epoch=1'],
 ['empty inventory','ERROR',f=>f.s.artifacts=[]],
 ['excluded ecosystem','MATCH',f=>f.t.components.push({type:'library',name:'npm-only',version:'1',purl:'pkg:npm/npm-only@1'})],
 ['invalid CycloneDX schema','ERROR',f=>f.t.version='bad'],
 ['unsupported CycloneDX','ERROR',f=>f.t.specVersion='1.6'],
 ['unsupported Syft schema','ERROR',f=>f.s.schema.version='99'],
 ['image mismatch','ERROR',f=>f.s.source.metadata.imageID='sha256:'+'c'.repeat(64)],
 ['platform mismatch','ERROR',f=>f.s.source.metadata.architecture='arm64'],
 ['receipt platform mismatch','ERROR',f=>f.r.platform='linux/arm64'],
 ['archive changed','ERROR',f=>f.r.commands[0].archiveSha256After='c'.repeat(64)],
 ['report changed after capture','ERROR',f=>f.r.trivySha256='c'.repeat(64)],
 ['scanner failed','ERROR',f=>f.r.commands[0].exit=1],
 ['collection incomplete','ERROR',f=>f.r.status='ERROR'],
 ['historical layers prohibited','ERROR',f=>f.s.descriptor.configuration.search.scope='all-layers'],
 ['SBOM discovery prohibited','ERROR',f=>f.s.descriptor.configuration.catalogers.used.push('sbom-cataloger')],
 ['missing evidence','ERROR',f=>f.s.artifacts[0].locations=[]],
 ['native identity conflict','ERROR',f=>f.s.artifacts[0].metadata.version='other'],
 ['distribution mismatch','ERROR',f=>f.s.distro.versionID='13']
];
for(const [name,status,mutate] of cases)test('synthetic: '+name,()=>{const f=fixture();mutate(f);assert.equal(evaluate(f).status,status);});
test('same bytes yield deterministic output',()=>{const f=fixture();assert.deepEqual(evaluate(f),evaluate(f));});
test('safe reader rejects symlink, parent symlink, directory, oversized and invalid JSON',()=>{
 const d=mkdtempSync(join(tmpdir(),'sbom-test-'));
 try{writeFileSync(join(d,'data'),'xxx');symlinkSync('data',join(d,'link'));mkdirSync(join(d,'dir'));symlinkSync('dir',join(d,'parent'));writeFileSync(join(d,'dir','data'),'x');
 for(const p of ['link','dir','parent/data'])assert.throws(()=>readSafe(join(d,p)));
 assert.throws(()=>readSafe(join(d,'data'),2));writeFileSync(join(d,'trivy.json'),'{');writeFileSync(join(d,'syft.json'),'{}');assert.equal(files(d).status,'ERROR');
 }finally{rmSync(d,{recursive:true});}
});
