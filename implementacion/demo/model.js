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
  if(data.session.profile!=='f11-comparison'&&data.catalogue.operations.reference)result.push({id:'reference-preparation',ops:['reference'],events:sessionEvents(data).filter(e=>e.operation==='reference'&&!e.fixtureSession),reference:true});
  for(const op of definitionOps(data)){
   const id=data.catalogue.operations[op]?.attempt||op;
   let row=result.find(r=>r.id===id);if(!row){row={id,ops:[],events:[]};result.push(row);}row.ops.push(op);
  }
  for(const e of sessionEvents(data).filter(e=>e.phase==='live'&&definitionOps(data).includes(e.operation))){
   let row=result.find(r=>r.id===e.attempt);if(!row){row={id:e.attempt,ops:[e.operation],events:[]};result.push(row);}if(!row.ops.includes(e.operation))row.ops.push(e.operation);row.events.push(e);
  }
  const active=data.session.active;if(active?.attempt&&definitionOps(data).includes(active.operation)&&!result.some(r=>r.id===active.attempt))result.push({id:active.attempt,ops:[active.operation],events:[]});
  const groups=new Map();
  for(const row of result){const key=row.ops.includes('authorize')||row.ops.includes('accept')?'accept':row.ops.at(-1);const group=groups.get(key)||[];group.push(row);groups.set(key,group);}
  for(const group of groups.values())if(group.length>1)group.forEach((row,index)=>{row.executionNumber=index+1;});
  return result;
 }
 function rowTitle(row,data,operation=null){
  const m=meta(operation||row.ops.at(-1),data);
  const title=!operation&&(row.ops.includes('accept')||row.ops.includes('authorize'))?'G · Recuperación de F13':(m.arm==='G'?'G · ':'')+m.title;
  return title+(row.executionNumber?' · Ejecución '+row.executionNumber:'');
 }
 function latest(row,op){return row.events.filter(e=>!op||e.operation===op).at(-1);}
 function rowOutcome(row,data){
  const active=row.ops.includes(data.session.active?.operation)&&(!data.session.active?.attempt||data.session.active.attempt===row.id),state=outcome(latest(row),active,data.activeProcessObserved);
  if(!active&&!latest(row)&&incompletePreparation(data)?.gUnreached&&!row.reference)return {tone:'unreached',label:'No alcanzado'};
  if(!active&&row.ops.includes('accept')&&!confirmed(latest(row,'accept'))&&state.tone==='accepted')return {tone:'pending',label:'Recuperación incompleta'};
  return state;
 }
 function preparationFor(row,data){
  const origin=row.events.find(e=>e.preparationSession||e.fixtureSession)?.preparationSession||row.events.find(e=>e.fixtureSession)?.fixtureSession||((data.session.active?.attempt===row.id&&data.activeCaseSession)||data.session.session);
  return sessionEvents(data).filter(e=>e.phase==='preparation'&&(e.fixtureSession||e.session||data.session.session)===origin);
 }
 function segments(row,data){
  const list=[],seal=preparationFor(row,data).filter(e=>e.operation==='seal').at(-1);
  if(!row.reference)list.push({key:'prepared',label:'Preparación',state:confirmed(seal)?{tone:'reused',label:'↶ Preparada / reutilizada'}:{tone:'idle',label:'Sin preparación confirmada'},operation:'seal',event:seal,preparation:true});
  if(row.ops.includes('comparison-reference'))for(const label of ['Conftest','Kyverno'])list.push({key:'omitted-'+label,label,state:{tone:'omitted',label:'No aplicado en R'},omitted:true});
  for(const op of row.ops){
   const e=latest(row,op),active=data.session.active?.operation===op&&(!data.session.active?.attempt||data.session.active.attempt===row.id);
   let state=outcome(e,active,data.activeProcessObserved);
   if(!e&&!active&&data.session.active&&data.activeProcessObserved===true&&definitionOps(data).includes(op))state={tone:'pending',label:'Pendiente de la secuencia'};
   list.push({key:op,label:meta(op,data).short,state,operation:op,event:e,aggregate:true});
   if(e?.notReached?.length)for(const stage of e.notReached)list.push({key:op+'-'+stage,label:({admission:'Admisión',deployment:'Despliegue'})[stage]||stage,state:{tone:'unreached',label:'No alcanzado'},event:e,operation:op});
  }
  return list;
 }
 function ownArtifact(e,path){return e?.artifacts?.find(a=>a.path===`operations/${e.operationInstance||e.operation}/closed/${path}`&&a.producer===e.operation);}
 function primaryArtifact(e,data,kind='log'){const path=meta(e?.operation,data)[kind];return path?(ownArtifact(e,path)||null):(kind==='log'?operationOutput(e):null);}
 function scope(profile,op){
  const common='Vía A · clave local; no GitHub OIDC ni vía B. Observaciones de esta fuente y sesión; sin conclusiones de productividad humana ni compromiso del clúster.';
  if(profile==='f11-comparison')return 'F11: UPDATE de Deployment; cobertura parcial, sin contrato completo CREATE/UPDATE/Pod. L06: actualización legítima con la misma imagen; alcance parcial, sin Pod directo. R ejecuta y retira la configuración de riesgo solo cuando consta en sus recibos. '+common;
  return 'Perfil '+profile+': F11 temprano, F13 por resultados ausentes y recuperación vinculada con la misma imagen. '+(profile==='defense'?'F11 incluye un UPDATE independiente; alcance parcial. ':'El perfil corto no ejecuta la barrera F11 tardía. ')+'R es un servicio válido preparado: no prueba privilegios admitidos. La recuperación no sustituye la imagen y no es L01 completo. No demuestra L06. '+common;
 }
 function family(id){if(['F01','F02'].includes(id))return 'workflow';if(['F03','F04','L02'].includes(id))return 'vulnerability';if(['F05','F06','L03'].includes(id))return 'sbom';if(['F07','F08','L04'].includes(id))return 'signature';if(['F09','F10','L05'].includes(id))return 'provenance';if(['F13','F14'].includes(id))return 'results';return 'runtime';}
 function scenarioOps(id,data){return Object.values(data.catalogue.operations).filter(o=>o.scenario===id).map(o=>o.adapter);}

 // The captured catalogue owns phase membership. Display tools describe families,
 // never independently verified sub-controls of an aggregate operation receipt.
 const phaseTools={source:'Git · doctor',ci:'make test',infrastructure:'kind · Docker · RBAC',build:'Buildx · registro',manifest:'Conftest',sbom:'Trivy · esquema',vulnerabilities:'Trivy · Conftest',signature:'Cosign','sbom-attestation':'Cosign · contrato',provenance:'Cosign · contrato','delivery-gate':'Verificador de entrega',results:'Atestación de resultados',admission:'API · Kyverno',deployment:'Kubernetes · HTTP',preservation:'SHA-256 · empaquetado · limpieza'};
 const phaseLabel=phase=>({preparation:'Preparación',live:'Demostración',preservation:'Conservación',readiness:'Disponibilidad'})[phase]||'Contexto no registrado';
 function sessionEvents(data){return (data.events||[]).filter(e=>(!e.session||e.session===data.session.session)&&profileOps(data).has(e.operation));}
 function incompletePreparation(data){
  const es=sessionEvents(data),failure=es.find(e=>e.phase==='preparation'&&['ERROR','ABORTED'].includes(e.operational));
  const sealed=es.some(e=>e.operation==='seal'&&confirmed(e));
  const liveObserved=es.some(e=>definitionOps(data).includes(e.operation)&&e.phase!=='preparation'&&e.operational!=='NOT_REACHED');
  const stopped=!!failure||(!data.session.prepared&&!sealed&&!liveObserved&&['ERROR','ABORTED','INCOMPLETE'].includes(data.session.operational));
  return stopped&&!sealed?{failure,gUnreached:!liveObserved}:null;
 }
 function operationOutput(e){return e?.artifacts?.find(a=>a.producer===e.operation&&(e.operationInstance?a.path===`operations/${e.operationInstance}/output.log`:new RegExp('^operations/'+e.operation+'(?:-[0-9]+)?/output\\.log$').test(a.path)))||null;}
 function eventIdentity(e,data){const m=meta(e.operation,data);return [(m.arm==='R'?'R':e.arm||'Sesión'),e.scenario||m.title,e.attempt||'sin intento registrado'].join(' · ');}
 function artifactOrigin(a,e,data){
  if(!a)return {label:'Archivo ausente'};
  if(operationOutput(e)?.id===a.id&&a.id)return {label:'Salida de la operación '+e.operation};
  const previous=sessionEvents(data).filter(x=>Number.isFinite(x.sequence)&&x.sequence<e.sequence).find(x=>x.artifacts?.some(b=>a.source&&a.source!=='generated operation receipt'&&b.source===a.source&&b.sha256===a.sha256));
  if(previous)return {label:'Copia heredada; mismos bytes capturados antes en '+previous.operation+' · '+phaseLabel(previous.phase),event:previous};
  if(a.path===`operations/${e.operationInstance||e.operation}/output.log`)return {label:'Salida de la operación '+e.operation};
  return {label:'Copia capturada por '+(a.producer||'productor desconocido')+'; origen declarado: '+(a.source||'desconocido')+'. La captura no prueba qué operación produjo el contenido.'};
 }
 function journeyFilters(data){return [['all','Toda la sesión'],['preparation','Preparación'],...rows(data).map(r=>[r.id,(meta(r.ops.at(-1),data).arm==='R'?'':(meta(r.ops.at(-1),data).arm||'Sesión')+' · ')+(r.ops.includes('accept')?'Recuperación F13':meta(r.ops.at(-1),data).title)+' · '+r.id]),...(sessionEvents(data).some(e=>e.phase==='preservation')?[['preservation','Conservación / cierre']]:[])];}
 function filteredEvents(data,filter){return sessionEvents(data).filter(e=>filter==='all'||filter==='preparation'&&e.phase==='preparation'||filter==='preservation'&&e.phase==='preservation'||filter==='reference-preparation'&&e.operation==='reference'||!['preparation','preservation'].includes(filter)&&e.attempt===filter);}
 function journey(data,filter='all'){
  const es=filteredEvents(data,filter),eligible=profileOps(data),row=rows(data).find(r=>r.id===filter),incomplete=incompletePreparation(data);
  const specs=Object.values(data.catalogue.operations).filter(o=>eligible.has(o.adapter)&&(filter==='all'||filter==='preparation'&&(o.attempt==='preparation'||es.some(e=>e.operation===o.adapter))||filter==='preservation'&&o.adapter==='cleanup'||row?.ops.includes(o.adapter)));
  return data.catalogue.stages.map((stage,index)=>{
   const entries=[];
   for(const spec of specs){const matches=es.filter(e=>e.operation===spec.adapter);if(!(spec.stages||[]).includes(stage.id))continue;
    for(const e of matches.length?matches:[null]){
     let state=outcome(e,data.session.active?.operation===spec.adapter&&(!data.session.active?.attempt||data.session.active.attempt===e?.attempt)&&!e,data.activeProcessObserved);
     if(!e&&!data.session.active)state=incomplete&&definitionOps(data).includes(spec.adapter)?{tone:'unreached',label:'No alcanzado: preparación incompleta'}:{tone:'unknown',label:'Sin recibo de ejecución'};
     const blocker=state.tone==='blocked'&&meta(spec.adapter,data).stage===stage.id;
     if(state.tone==='blocked'&&!blocker)state={tone:'unknown',label:'Observación asociada; rechazo en '+meta(spec.adapter,data).tool};
     entries.push({spec,event:e,state,blocker});
    }
   }
   for(const e of es)if(e.notReached?.includes(stage.id))entries.push({event:e,spec:data.catalogue.operations[e.operation],state:{tone:'unreached',label:'No alcanzado en esta petición'},downstream:true});
   if(row?.ops.includes('comparison-reference')&&['manifest','admission'].includes(stage.id))entries.push({state:{tone:'omitted',label:'No aplicado en R'},omitted:true});
   // Preparation remains an origin link, never another live operation.
   if(row&&!row.reference)for(const e of preparationFor(row,data).filter(e=>confirmed(e)&&(data.catalogue.operations[e.operation]?.stages||e.stages||[]).includes(stage.id)))entries.push({event:e,spec:data.catalogue.operations[e.operation],state:{tone:'reused',label:'Preparado previamente · origen '+e.operation},reused:true});
   return {...stage,title:({admission:'Admisión / Kyverno',preservation:'Conservación de evidencias'})[stage.id]||stage.title,number:String(index+1).padStart(2,'0'),tool:phaseTools[stage.id]||'Consultar definición',entries};
  });
 }
 function workflowRuns(observations,workflow){
  return observations.filter(o=>o.workflow===workflow&&o.run).sort((a,b)=>
   (b.run.created_at||'').localeCompare(a.run.created_at||'')||Number(b.run.id)-Number(a.run.id)||
   (b.run.run_attempt||0)-(a.run.run_attempt||0)||(b.capturedUTC||'').localeCompare(a.capturedUTC||''));
 }
 root.DemoModel={workflowRuns,meta,outcome,confirmed,expectation,definitionOps,profileOps,rows,rowTitle,latest,rowOutcome,segments,ownArtifact,primaryArtifact,scope,family,scenarioOps,phaseLabel,sessionEvents,incompletePreparation,operationOutput,eventIdentity,artifactOrigin,journeyFilters,filteredEvents,journey};
})(globalThis);
