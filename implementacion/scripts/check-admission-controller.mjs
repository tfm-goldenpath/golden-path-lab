// Kubernetes observations establish endpoint convergence, not policy acceptance.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function checkController({deployment,replicasets,pods,endpoints}) {
  if(!deployment?.metadata?.uid || !Number.isInteger(deployment.metadata.generation) ||
     ![replicasets,pods,endpoints].every(x=>Array.isArray(x?.items))) throw new Error('Malformed admission controller snapshot');
  const pending={status:'PENDING',pods:[]}, count=deployment.spec?.replicas;
  const status=deployment.status || {}, revision=deployment.metadata.annotations?.['deployment.kubernetes.io/revision'];
  if(!Number.isInteger(count) || count<1 || !revision || status.observedGeneration!==deployment.metadata.generation ||
     [status.updatedReplicas,status.replicas,status.availableReplicas].some(n=>n!==count)) return pending;
  const owned=(object,uid)=>object.metadata?.ownerReferences?.some(ref=>ref.controller===true && ref.uid===uid);
  const sets=replicasets.items.filter(rs=>!rs.metadata?.deletionTimestamp && owned(rs,deployment.metadata.uid) && rs.metadata.annotations?.['deployment.kubernetes.io/revision']===revision);
  if(sets.length!==1) return pending;
  const current=pods.items.filter(p=>!p.metadata?.deletionTimestamp && owned(p,sets[0].metadata.uid));
  if(current.length!==count || current.some(p=>p.status?.phase!=='Running' || !p.status?.podIP ||
     !p.metadata?.uid || !/^[a-z0-9][a-z0-9.-]*$/.test(p.metadata.name) ||
     !p.status.conditions?.some(c=>c.type==='Ready' && c.status==='True'))) return pending;
  const ready=new Set();
  for(const slice of endpoints.items) {
    if(!Array.isArray(slice.endpoints) || !Array.isArray(slice.ports)) throw new Error('Malformed endpoint snapshot');
    for(const endpoint of slice.endpoints) {
      if(endpoint.conditions?.ready===false) continue;
      const pod=current.find(p=>p.metadata.uid===endpoint.targetRef?.uid && p.metadata.name===endpoint.targetRef?.name);
      if(endpoint.conditions?.ready!==true || endpoint.conditions?.terminating===true || endpoint.conditions?.serving===false ||
         endpoint.targetRef?.kind!=='Pod' || !pod || !endpoint.addresses?.includes(pod.status.podIP) ||
         !slice.ports.some(p=>p.port===9443)) return pending;
      ready.add(pod.metadata.uid);
    }
  }
  return ready.size===count ? {status:'READY',pods:current.map(p=>p.metadata.name).sort()} : pending;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 try {
  const [deployment,replicasets,pods,endpoints]=process.argv.slice(2).map(f=>JSON.parse(readFileSync(f)));
  const report=checkController({deployment,replicasets,pods,endpoints});
  console.log(JSON.stringify(report,null,2));process.exitCode=report.status==='READY'?0:2;
 } catch(e) { console.error(e.message);process.exitCode=1; }
}
