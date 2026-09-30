// Runtime scenario oracles and read-only tag resolution. No delivery authorization.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
import {pathToFileURL} from 'node:url';
import {bytesOf, location} from '../../scripts/download-bundle-inventory.mjs';
const check=(ok,message)=>{if(!ok) throw new Error(message);};
const pass={status:'PASS'};
export function earlyDecision(code,data,stderr,filename,scenario) {
 const expected={F11:['ESCALATION: quotes-node must declare allowPrivilegeEscalation=false','PRIVILEGED: quotes-node must declare privileged=false'],F12:['DIGEST: quotes-node requires an image pinned to a sha256 digest'],L06:[]}[scenario];
 check(expected && code===(expected.length?1:0) && !stderr,'Conftest execution failure');
 check(Array.isArray(data)&&data.length===1,'Invalid Conftest rows');
 const row=data[0];
 check(row.filename===filename&&row.namespace==='manifests'&&Number.isInteger(row.successes)&&row.successes>0&&['errors','warnings','exceptions'].every(key=>row[key]===undefined||(Array.isArray(row[key])&&row[key].length===0)),'Invalid Conftest result');
 check(Array.isArray(row.failures??[]),'Invalid Conftest failures');
 const messages=(row.failures??[]).map(f=>f.msg).sort();
 check(equal(messages,expected),'Unexpected or additional Conftest diagnostic');
 return {...pass,scenario,diagnostics:messages};
}
export function absent(code,text,kind,name) {
 const resource={Deployment:'deployments.apps',Pod:'pods'}[kind];
 check(resource && code===1 && text.trim()===`Error from server (NotFound): ${resource} "${name}" not found`,'Absence requires an actual named NotFound response');
 return {...pass,kind,name,observation:'NotFound'};
}
function identity(value) {
 const m=value?.metadata;
 check(m?.uid&&Number.isInteger(m.generation)&&value.spec&&m.name==='quotes-node'&&m.namespace==='tfm-golden','Invalid Deployment observation');
 return {uid:m.uid,name:m.name,namespace:m.namespace};
}
export function unchanged(before,after) {
 check(equal(identity(before),identity(after))&&before.metadata.generation===after.metadata.generation&&equal(before.spec,after.spec),'Rejected UPDATE changed desired spec or identity');
 return {...pass,uid:after.metadata.uid,generation:after.metadata.generation};
}
export function updated(before,after,annotation) {
 check(equal(identity(before),identity(after))&&after.metadata.generation>before.metadata.generation,'L06 requires an actual generation change on the same Deployment');
 const expected=structuredClone(before.spec);
 expected.template.metadata??={};expected.template.metadata.annotations??={};
 check(expected.template.metadata.annotations['tfm.goldenpath/l06']!==annotation,'L06 cannot be a no-op');
 expected.template.metadata.annotations['tfm.goldenpath/l06']=annotation;
 check(equal(expected,after.spec),'L06 must change only the selected template annotation');
 return {...pass,uid:after.metadata.uid,fromGeneration:before.metadata.generation,toGeneration:after.metadata.generation,annotation};
}
export function profile(policies,image) {
 const names=['tfm-runtime','tfm-signature','tfm-sbom','tfm-provenance','tfm-results'];
 check(Array.isArray(policies?.items)&&equal(policies.items.map(p=>p.metadata?.name).sort(),names.sort()),'Missing or additional runtime comparison policy');
 const checks=policies.items.flatMap(p=>p.spec?.rules??[]).flatMap(r=>r.verifyImages??[]);
 check(checks.length===4&&checks.every(c=>c.mutateDigest===false&&c.verifyDigest===true&&c.required===true&&equal(c.imageReferences,[image.split('@')[0]+'@sha256:*'])),'Automatic conversion or changed digest verification scope invalidates F12');
 return {...pass,mutateDigest:false,signatureScope:'authorized-repository-digests-only'};
}
export function tagReference(tag,image) {
 check(typeof image==='string'&&/@sha256:[a-f0-9]{64}$/.test(image),'Invalid backing digest');
 const prefix=image.split('@')[0]+':';
 check(typeof tag==='string'&&tag.startsWith(prefix)&&/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(tag.slice(prefix.length)),'Invalid persisted build tag');
 return tag.slice(prefix.length);
}
export async function resolveTag(mode,tag,image,request=fetch) {
 const reference=tagReference(tag,image),{origin,repository,digest}=location(mode,image);
 let authorization;
 const send=(url,headers)=>request(url,{headers,redirect:'manual',signal:AbortSignal.timeout(30000)});
 if(mode==='github') {
  check(process.env.GITHUB_ACTOR&&process.env.GH_TOKEN,'Missing hosted registry credentials');
  const response=await send('https://ghcr.io/token?'+new URLSearchParams({service:'ghcr.io',scope:`repository:${repository}:pull`}),{Authorization:'Basic '+Buffer.from(`${process.env.GITHUB_ACTOR}:${process.env.GH_TOKEN}`).toString('base64')});
  check(response.status===200,'Registry token lookup failed');
  const access=JSON.parse(await bytesOf(response,16384));check(typeof access.token==='string'&&access.token,'Invalid registry token');authorization='Bearer '+access.token;
 }
 const url=`${origin}/v2/${repository}/manifests/${reference}`;
 const response=await send(url,{Accept:'application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json',...(authorization?{Authorization:authorization}:{})});
 check(response.status===200,`Tag lookup failed (HTTP ${response.status})`);
 const bytes=await bytesOf(response,4*1024*1024),resolved='sha256:'+createHash('sha256').update(bytes).digest('hex');
 const evidence={url,tag,expectedDigest:digest,resolvedDigest:resolved,httpStatus:response.status,reportedDigest:response.headers.get('docker-content-digest'),manifestBase64:bytes.toString('base64')};
 // Return unfavorable evidence too; the CLI saves it before asserting equality.
 return evidence;
}
export function sameTag(value) {
 check(/^sha256:[a-f0-9]{64}$/.test(value.expectedDigest)&&value.httpStatus===200&&value.resolvedDigest===value.expectedDigest&&(!value.reportedDigest||value.reportedDigest===value.expectedDigest),'Tag no longer resolves to the authorized digest');
 return {...pass,tag:value.tag,digest:value.resolvedDigest};
}
const json=p=>JSON.parse(readFileSync(p,'utf8'));
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const [command,...a]=process.argv.slice(2);let result;
 if(command==='early') result=earlyDecision(Number(a[0]),json(a[1]),readFileSync(a[2],'utf8'),a[3],a[4]);
 else if(command==='absent') result=absent(Number(a[0]),readFileSync(a[1],'utf8'),a[2],a[3]);
 else if(command==='unchanged') result=unchanged(json(a[0]),json(a[1]));
 else if(command==='updated') result=updated(json(a[0]),json(a[1]),a[2]);
 else if(command==='profile') result=profile(json(a[0]),a[1]);
 else if(command==='resolve') {const evidence=await resolveTag(a[0],a[1],a[2]);writeFileSync(a[3],JSON.stringify(evidence,null,2)+'\n');result=sameTag(evidence);}
 else throw new Error('Unknown runtime evidence operation');
 console.log(JSON.stringify(result,null,2));
}
