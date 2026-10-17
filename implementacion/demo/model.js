/* Presentation semantics only. No policy decisions, commands or evidence mutation. */
'use strict';
(function(root){
 const live={ 'f11-comparison':['comparison-reference','f11-early','comparison-admission','comparison-legitimate'], defense:['f11-early','f13','authorize','accept','f11-admission'], 'defense-short':['f11-early','f13','authorize','accept'] };
 const metadata={
  reference:{title:'R · Referencia válida preparada',short:'Servicio de referencia',arm:'R',description:'Servicio válido observado durante la preparación. No prueba privilegios en R.',log:'tfm-reference-quote.json'},
  'comparison-reference':{title:'R · Entrada F11',short:'Despliegue, HTTP y retirada',arm:'R',description:'Configuración de riesgo ejecutada y retirada según el recibo agregado. No demuestra explotación ni compromiso.',log:'comparison/reference/response.log',attribution:'comparison/reference/cleaned-check.json'},
  'f11-early':{title:'F11 · Control temprano',short:'Manifiesto / Conftest',arm:'G',stage:'manifest',tool:'Conftest',property:'privilegios prohibidos',description:'El manifiesto solicita privileged y allowPrivilegeEscalation. La entrega se detuvo antes de admisión.',log:'F11-early.json',attribution:'F11-early.attribution.json'},
  f13:{title:'F13 · Resultados ausentes',short:'Resultados / admisión',arm:'G',stage:'admission',tool:'Kyverno',property:'resultados ausentes',description:'La solicitud no aporta la atestación de resultados requerida. El rechazo se atribuye a tfm-results / require-results.',log:'F13-admission.log',attribution:'F13-attribution.json'},
  authorize:{title:'Recuperación de F13 · autorización',short:'Autorizar resultados',arm:'G',description:'Emisión de resultados para el mismo digest. La aceptación de la entrega requiere su propia observación.',attribution:'CI-authorized.result.json'},
  accept:{title:'Recuperación de F13 · entrega',short:'Admisión, rollout y HTTP',arm:'G',description:'Entrega válida observada con la misma imagen después de autorizar resultados. No es sustitución L01.',log:'L01-admission.log',attribution:'DEMO_VALID_ACCEPT.json'},
  'f11-admission':{title:'F11 · Admisión independiente',short:'Admisión / Kyverno',arm:'G',stage:'admission',tool:'Kyverno',property:'privilegios prohibidos',description:'Una nueva petición UPDATE fue rechazada por tfm-runtime / restricted-containers; el recibo conserva el estado intacto y HTTP.',log:'F11-admission.log',attribution:'F11-admission.log.attribution.json'},
  'comparison-admission':{title:'F11 · Admisión independiente',short:'Admisión / Kyverno',arm:'G',stage:'admission',tool:'Kyverno',property:'privilegios prohibidos',description:'Petición UPDATE dirigida, sin filtro temprano en esta solicitud. Rechazo exclusivo de tfm-runtime / restricted-containers; estado intacto.',log:'runtime/F11/Deployment-UPDATE/response.log',attribution:'runtime/F11/Deployment-UPDATE/result.json'},
  'comparison-legitimate':{title:'L06 · Actualización legítima',short:'Plantilla, admisión y HTTP',arm:'G',description:'Actualización de una anotación con la misma imagen: generation, rollout, Pods y HTTP. L06 con alcance parcial.',log:'runtime/L06/update-response.log',attribution:'runtime/L06/update-change.json'}
 };
 function meta(op,data){if(op==='authorize'&&data?.session?.profile==='f11-comparison')return {...metadata.authorize,title:'G · Autorizar resultados válidos',description:'Emisión de resultados válidos durante la preparación de la comparación F11.'};return metadata[op]||{title:data?.catalogue?.operations?.[op]?.title||op,short:data?.catalogue?.operations?.[op]?.title||op,arm:'G',description:'Consultar los controles y recibos de esta operación.'};}
 function outcome(e,active=false,observed=null){
  if(active)return observed===true?{tone:'running',label:'En ejecución'}:{tone:'error',label:observed===false?'Proceso interrumpido; falta recibo':'Ejecución sin confirmar'};
  if(!e)return {tone:'idle',label:'Sin ejecutar'};
  if(e.operational==='NOT_REACHED')return {tone:'unreached',label:'No alcanzado'};
  if(e.operational==='ERROR')return {tone:'error',label:'Error de integración'};
  if(e.operational==='ABORTED')return {tone:'error',label:'Interrumpido'};
  if(e.operational!=='COMPLETED'||e.expectation!=='confirmed')return {tone:'unknown',label:'Evidencia insuficiente'};
  if(e.decision==='deny')return metadata[e.operation]?.tool?{tone:'blocked',label:'Bloqueado en '+metadata[e.operation].tool}:{tone:'unknown',label:'Rechazo sin atribución disponible'};
  if(e.decision!=='allow')return {tone:'unknown',label:'Decisión desconocida'};
  if(e.operation==='comparison-legitimate')return {tone:'accepted',label:'Actualización legítima aceptada'};
  return e.operation==='comparison-reference'?{tone:'risk',label:'Riesgo admitido en la referencia'}:{tone:'accepted',label:'Permitido / comprobado'};
 }
 const confirmed=e=>e?.operational==='COMPLETED'&&e.expectation==='confirmed';
 function expectation(e){return confirmed(e)?(e.decision==='deny'?'Bloqueo esperado · expectativa confirmada':'Expectativa confirmada'):'Expectativa no confirmada';}
 function definitionOps(data){return data.liveOperations||live[data.session.profile]||[];}
 function profileOps(data){return new Set(data.profileOperations||[...definitionOps(data),...data.events.map(e=>e.operation)]);}
 function rows(data){
  const result=[];
  if(data.session.profile!=='f11-comparison'&&data.catalogue.operations.reference)result.push({id:'reference-preparation',ops:['reference'],events:data.events.filter(e=>e.operation==='reference'),reference:true});
  for(const op of definitionOps(data)){
   const id=data.catalogue.operations[op]?.attempt||op;
   let row=result.find(r=>r.id===id);if(!row){row={id,ops:[],events:[]};result.push(row);}row.ops.push(op);
  }
  for(const e of data.events.filter(e=>e.phase==='live'&&definitionOps(data).includes(e.operation))){
   let row=result.find(r=>r.id===e.attempt);if(!row){row={id:e.attempt,ops:[e.operation],events:[]};result.push(row);}row.events.push(e);
  }
  return result;
 }
 function latest(row,op){return row.events.filter(e=>!op||e.operation===op).at(-1);}
 function rowOutcome(row,data){
  const active=row.ops.includes(data.session.active?.operation),state=outcome(latest(row),active,data.activeProcessObserved);
  if(!active&&row.ops.includes('accept')&&!confirmed(latest(row,'accept'))&&state.tone==='accepted')return {tone:'pending',label:'Recuperación incompleta'};
  return state;
 }
 function segments(row,data){
  const list=[],seal=data.events.filter(e=>e.operation==='seal'&&e.phase==='preparation').at(-1);
  if(!row.reference)list.push({key:'prepared',label:'Preparación',state:confirmed(seal)?{tone:'reused',label:'↶ Preparada / reutilizada'}:{tone:'idle',label:'Sin preparación confirmada'},operation:'seal',event:seal,preparation:true});
  if(row.ops.includes('comparison-reference'))for(const label of ['Conftest','Kyverno'])list.push({key:'omitted-'+label,label,state:{tone:'omitted',label:'No aplicado en R'},omitted:true});
  for(const op of row.ops){
   const e=latest(row,op),active=data.session.active?.operation===op;
   let state=outcome(e,active,data.activeProcessObserved);
   if(!e&&!active&&data.session.active&&data.activeProcessObserved===true&&definitionOps(data).includes(op))state={tone:'pending',label:'Pendiente de la secuencia'};
   list.push({key:op,label:meta(op,data).short,state,operation:op,event:e,aggregate:true});
   if(e?.notReached?.length)for(const stage of e.notReached)list.push({key:op+'-'+stage,label:({admission:'Admisión',deployment:'Despliegue'})[stage]||stage,state:{tone:'unreached',label:'No alcanzado'},event:e,operation:op});
  }
  return list;
 }
 function ownArtifact(e,path){return e?.artifacts?.find(a=>a.path===`operations/${e.operation}/closed/${path}`&&a.producer===e.operation);}
 function primaryArtifact(e,data,kind='log'){const path=meta(e?.operation,data)[kind];return path?(ownArtifact(e,path)||null):null;}
 function scope(profile,op){
  const common='Vía A · clave local; no GitHub OIDC ni vía B. Observaciones de esta fuente y sesión; sin conclusiones de productividad humana ni compromiso del clúster.';
  if(profile==='f11-comparison')return 'F11: UPDATE de Deployment; cobertura parcial, sin contrato completo CREATE/UPDATE/Pod. L06: actualización legítima con la misma imagen; alcance parcial, sin Pod directo. R ejecuta y retira la configuración de riesgo solo cuando consta en sus recibos. '+common;
  return 'Perfil '+profile+': F11 temprano, F13 por resultados ausentes y recuperación vinculada con la misma imagen. '+(profile==='defense'?'F11 incluye un UPDATE independiente; alcance parcial. ':'El perfil corto no ejecuta la barrera F11 tardía. ')+'R es un servicio válido preparado: no prueba privilegios admitidos. La recuperación no sustituye la imagen y no es L01 completo. No demuestra L06. '+common;
 }
 function family(id){if(['F01','F02'].includes(id))return 'workflow';if(['F03','F04','L02'].includes(id))return 'vulnerability';if(['F05','F06','L03'].includes(id))return 'sbom';if(['F07','F08','L04'].includes(id))return 'signature';if(['F09','F10','L05'].includes(id))return 'provenance';if(['F13','F14'].includes(id))return 'results';return 'runtime';}
 function scenarioOps(id,data){return Object.values(data.catalogue.operations).filter(o=>o.scenario===id).map(o=>o.adapter);}
 root.DemoModel={meta,outcome,confirmed,expectation,definitionOps,profileOps,rows,latest,rowOutcome,segments,ownArtifact,primaryArtifact,scope,family,scenarioOps};
})(globalThis);
