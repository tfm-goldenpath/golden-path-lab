// Experimental offline comparator. Never authorizes delivery.
import {openSync,closeSync,fstatSync,readFileSync,lstatSync,writeFileSync,constants} from 'node:fs';
import {resolve,dirname,parse} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateSchema} from '../../../src/validate-sbom-schema.mjs';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const requireThat=(v,m)=>{if(!v) throw Error(m);};
const text=v=>typeof v==='string'&&v.length>0&&v.length<4096;
export function readSafe(file,limit=32*1024**2){
  for(let p=resolve(file);p!==parse(p).root;p=dirname(p)) requireThat(!lstatSync(p).isSymbolicLink(),'Symlink input');
  const fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try{const s=fstatSync(fd);requireThat(s.isFile()&&s.size<=limit,'Unsafe or oversized input');const b=readFileSync(fd);const a=fstatSync(fd);requireThat(a.size===s.size&&a.mtimeMs===s.mtimeMs&&a.ctimeMs===s.ctimeMs,'Changed input');return b;}finally{closeSync(fd);}
}
function property(o,n){const p=(o.properties||[]).filter(p=>p.name==='aquasecurity:trivy:'+n);requireThat(p.length===1&&text(p[0].value),'Missing/ambiguous property '+n);return p[0].value;}
function purl(s){
  requireThat(text(s),'Missing PURL');
  const m=/^pkg:deb\/(debian|ubuntu)\/([^@?#]+)@([^?#]+)\?([^#]+)$/.exec(s);requireThat(m,'Unsupported dpkg PURL');
  const pairs=m[4].split('&').map(x=>{const p=x.split('=');requireThat(p.length===2,'Invalid qualifier');return p.map(decodeURIComponent);});
  requireThat(new Set(pairs.map(x=>x[0])).size===pairs.length,'Duplicate qualifier');
  const q=Object.fromEntries(pairs);requireThat(text(q.arch)&&text(q.distro),'Missing architecture/distro');
  let version=decodeURIComponent(m[3]);
  if(q.epoch!==undefined){requireThat(/^(0|[1-9][0-9]*)$/.test(q.epoch)&&!version.includes(':'),'Ambiguous epoch');version=q.epoch+':'+version;}
  return {distribution:m[1],name:decodeURIComponent(m[2]),version,qualifiers:q};
}
function normalize(t,s){
  const os=t.components.filter(c=>c.type==='operating-system');requireThat(os.length===1,'Ambiguous OS');
  const distro=os[0].name,version=os[0].version;
  requireThat(['debian','ubuntu'].includes(distro)&&text(version)&&s.distro.id===distro&&s.distro.versionID===version,'Distribution association');
  const exclusions=[],rows={trivy:[],syft:[]};
  for(const [side,items] of [['trivy',t.components],['syft',s.artifacts]]){
    requireThat(Array.isArray(items)&&items.length<=100000,'Invalid component list');
    items.forEach((c,i)=>{
      const pointer=`/${side==='trivy'?'components':'artifacts'}/${i}`;
      const isDeb=side==='syft'?c.type==='deb':c.purl?.startsWith('pkg:deb/');
      if(!isDeb){exclusions.push({side,pointer,status:'NOT_EVALUATED',name:c.name,family:c.type});return;}
      const p=purl(c.purl);
      requireThat(p.distribution===distro&&p.name===c.name&&p.version===c.version,'PURL/native identity conflict');
      requireThat(p.qualifiers.distro===`${distro}-${version}`,'Unsupported distro qualifier');
      let source,sourceVersion,evidence;
      if(side==='syft'){
        requireThat(c.foundBy==='dpkg-db-cataloger'&&c.metadataType==='dpkg-db-entry','Unsupported cataloger');
        const m=c.metadata;
        requireThat(m?.package===c.name&&m.version===c.version&&m.architecture===p.qualifiers.arch,'Native dpkg identity conflict');
        requireThat(c.locations?.some(l=>l.path==='/var/lib/dpkg/status'||l.path.startsWith('/var/lib/dpkg/status.d/')),'Missing dpkg evidence');
        source=m.source;sourceVersion=m.sourceVersion;evidence=c.locations;
      }else{
        requireThat(property(c,'PkgType')===distro,'Package family conflict');
        source=property(c,'SrcName');sourceVersion=property(c,'SrcVersion');evidence=c.properties;
      }
      const key=['deb',distro,version,c.name,p.qualifiers.arch];
      rows[side].push({key,version:c.version,purl:c.purl,qualifiers:p.qualifiers,source,sourceVersion,pointer,evidence});
    });
    requireThat(rows[side].length>0,'Unexpected empty dpkg inventory');
    const seen=new Map();for(const r of rows[side]){const k=JSON.stringify(r.key);requireThat(!seen.has(k),'Duplicate/ambiguous identity: '+k);seen.set(k,r);}
    rows[side].sort((a,b)=>JSON.stringify(a.key).localeCompare(JSON.stringify(b.key),'en'));
  }
  return {rows,exclusions};
}
export function compare(t,s,r,bytes){
  try{
    requireThat(r.schema==='sbom-image-acquisition/v1'&&r.status==='COLLECTED','Collection incomplete');
    requireThat(r.platform==='linux/amd64'&&/^[a-f0-9]{64}$/.test(r.archiveSha256),'Invalid image/platform receipt');
    requireThat(r.commands?.length===2&&r.commands.every(c=>c.exit===0&&c.archiveSha256After===r.archiveSha256),'Scanner/association error');
    for(const n of ['trivy','syft']) requireThat(hash(bytes[n])===r[n+'Sha256'],'Report hash changed: '+n);
    validateSchema(t,undefined,bytes.trivy);
    requireThat(s.schema?.version==='16.1.13'&&s.descriptor?.name==='syft'&&s.descriptor.version==='1.57.1','Unsupported Syft format');
    requireThat(JSON.stringify(s.descriptor.configuration?.catalogers?.used)===JSON.stringify(['dpkg-db-cataloger']),'Unapproved cataloger selection');
    requireThat(s.source?.type==='image'&&s.source.metadata.os==='linux'&&s.source.metadata.architecture==='amd64','Image platform mismatch');
    requireThat(property(t.metadata.component,'ImageID')===s.source.metadata.imageID&&/^sha256:[a-f0-9]{64}$/.test(s.source.metadata.imageID),'Image config association');
    requireThat(r.image?.configDigest===s.source.metadata.imageID&&r.image.platform==='linux/amd64','Archive config association');
    const normalized=normalize(t,s),diff=[],matches=[];
    const right=new Map(normalized.rows.syft.map(r=>[JSON.stringify(r.key),r]));
    for(const a of normalized.rows.trivy){const k=JSON.stringify(a.key),b=right.get(k);right.delete(k);
      if(!b)diff.push({kind:'ONLY_TRIVY',trivy:a});
      else if(a.version!==b.version)diff.push({kind:'VERSION',trivy:a,syft:b});
      else matches.push({key:a.key,version:a.version,trivy:a.pointer,syft:b.pointer});
    }
    for(const b of right.values())diff.push({kind:'ONLY_SYFT',syft:b});
    return {schema:'sbom-image-comparison/v1',status:diff.length?'MISMATCH':'MATCH',scope:'installed dpkg binary name/version/architecture on linux/amd64',normalized,matches,differences:diff,notEvaluated:['non-dpkg ecosystems','source-package equivalence','file integrity','completeness','vulnerabilities','authenticity','admission']};
  }catch(e){return {schema:'sbom-image-comparison/v1',status:'ERROR',reason:e.message};}
}
export function files(directory){
  try{const bytes={trivy:readSafe(directory+'/trivy.json'),syft:readSafe(directory+'/syft.json')};return compare(JSON.parse(bytes.trivy),JSON.parse(bytes.syft),JSON.parse(readSafe(directory+'/receipt.json')),bytes);}catch(e){return {schema:'sbom-image-comparison/v1',status:'ERROR',reason:e.message};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=files(process.argv[2]);const out=JSON.stringify(result,null,2)+'\n';if(process.argv[3])writeFileSync(process.argv[3],out,{flag:'wx'});else console.log(out);process.exitCode={MATCH:0,MISMATCH:1,ERROR:2}[result.status];}
