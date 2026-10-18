// Reuse the presentation's artifact attribution; never select an inherited log as primary.
import '../../demo/model.js';
let input='';for await(const chunk of process.stdin)input+=chunk;
const data=JSON.parse(input),M=globalThis.DemoModel,essential=new Set(),missing=[];
for(const e of data.events){
 if(e.operational==='NOT_REACHED')continue;
 for(const kind of ['log','attribution']){const a=M.primaryArtifact(e,data,kind);if(a)essential.add(a.id);else if(e.operational==='COMPLETED'&&M.meta(e.operation,data)[kind])missing.push({operation:e.operation,attempt:e.attempt,role:kind,path:M.meta(e.operation,data)[kind]});}
 for(const path of M.meta(e.operation,data).support||[]){const a=M.ownArtifact(e,path);if(a)essential.add(a.id);else if(e.operational==='COMPLETED')missing.push({operation:e.operation,attempt:e.attempt,role:'support',path});}
 const output=M.operationOutput(e);if(output)essential.add(output.id);
 // Declared outputs, including compact brace groups in runtime operation contracts.
 for(const c of e.controls||data.catalogue.operations[e.operation]?.controls||[]){
  const expanded=(c.output||'').replace(/([\w./-]+)\{([^}]+)\}/g,(_,prefix,items)=>items.split(',').map(x=>prefix+x).join(', '));
  for(const pattern of expanded.match(/[\w.*\/-]+\.(?:json|log|txt|yaml|yml)/g)||[]){
   const re=new RegExp('^'+pattern.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replaceAll('*','.*')+'$');
   const prefix='operations/'+(e.operationInstance||e.operation)+'/';
   for(const a of e.artifacts||[]){let path=a.path.startsWith(prefix)?a.path.slice(prefix.length):'';if(path.startsWith('closed/'))path=path.slice(7);if(a.producer===e.operation&&re.test(path))essential.add(a.id);}
  }
 }
}
process.stdout.write(JSON.stringify({essential:[...essential].sort(),missing}));
