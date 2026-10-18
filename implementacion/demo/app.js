/* One application with internal views. Evidence is inert; catalogue selections never invoke actions. */
'use strict';
(() => {
 const M=globalThis.DemoModel,$=id=>document.getElementById(id);
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const text=(n,value)=>{if(n.textContent!==String(value))n.textContent=String(value);};
 const button=(label,fn,cls)=>{const b=el('button',label,cls);b.type='button';b.onclick=fn;return b;};
 const seconds=n=>Number.isFinite(n)?n.toFixed(2)+' s':'sin medición';
 const badge=state=>el('span',({blocked:'× ',accepted:'✓ ',error:'! ',risk:'⚠ ',unknown:'? ',running:'↻ ',unreached:'↳ ',idle:'○ ',omitted:'— ',pending:'◷ ',reused:''}[state.tone]||'')+state.label,'badge '+state.tone);
 const details=(title,key)=>{const d=el('details');d.dataset.key=key;const summary=el('summary',title);summary.dataset.focusKey='summary-'+key;d.append(summary);return d;};
 let data=null,control=null,stale=true,inFlight=false,actionPending=null,stopRequested=false,acceptedPending=false;
 let selection={row:null,op:null},tab='result',artifact=null,artifactEpoch=0,artifactAbort=null,inspectorKey='',opener=null;
 let preparationView=false,exploration=null,inventory=null,inventoryLoading=false,technicalFilter='all';
 let acceptedBaseline=null,explorationRevision='';
 let catalogueFilters={query:'',kind:'all',family:'all',availability:'all'},scenarioId='F11',workflowId=null;
 let liveFollow=true,liveKey=null,liveOperation=null,liveBaseline=0,liveFinal=null;
 const rowNodes=new Map();
 let detailOrigin='#demo',journeyTab='map',journeyFilter='all';
 let currentRoute='',routeReady=false,sidebarHidden=false,missingArtifact=false,lastAttemptSelection=null;
 const routeMemory=new Map();
 function allRows(){return M.rows(data);}
 function selectedRow(){return allRows().find(r=>r.id===selection.row);}
 function selectedEvent(){if(selection.event!=null)return M.sessionEvents(data).find(e=>e.sequence===selection.event);const row=selectedRow();if(row)return M.latest(row,selection.op);return data.events.filter(e=>e.operation===selection.op).at(-1);}
 function selectedMeta(){return M.meta(selection.op,data);}
 function cancelArtifact(){artifactEpoch++;artifactAbort?.abort();artifactAbort=null;}
 function pin(){ $('follow').checked=false; }
 function choose(row,op,open=false){pin();preparationView=false;selection={row,op};artifact=null;cancelArtifact();inspectorKey='';renderSelection();renderRows();if(open)openInspector('result');}
 function initialSelection(){if(routeReady||selection.row)return;const rows=allRows();const row=rows.find(r=>r.events.some(e=>M.outcome(e).tone==='blocked'))||rows.find(r=>!r.reference)||rows[0];if(row)selection={row:row.id,op:row.events.at(-1)?.operation||row.ops[0]};}
 function renderIdentity(){const s=data.session;
  text($('identity'),s.profile+' · '+(s.session.length>28?s.session.slice(0,25)+'…':s.session));$('identity').title=s.session;
  text($('active-operation'),s.active?'Operación: '+M.meta(s.active.operation,data).title:'');
  text($('profile-title'),s.profile==='f11-comparison'?'F11 · Comparación de controles':'F11 / F13 · Controles y recuperación');
  text($('profile-description'),s.profile==='f11-comparison'?'La misma imagen: referencia R, bloqueo temprano, admisión independiente y actualización legítima L06 (parcial).':'Privilegios prohibidos, resultados ausentes y entrega tras autorización; referencia R válida preparada previamente.');
  text($('connection'),data.recorded?'Ejecución registrada · '+(data.savedUTC||'fecha desconocida'):stale?'Sin conexión · datos desactualizados':s.active&&data.activeProcessObserved===true?'En directo · operación observada':'Visor conectado · resultados registrados');
  const r=s.lastResources;text($('resources'),r?`Disco registrado ${(r.freeBytes/1024**3).toFixed(1)} GiB libres · reserva ${(r.reserveBytes/1024**3).toFixed(1)} GiB`:'Disco: sin lectura registrada');
  text($('source'),s.session+' / '+s.profile+' · Fuente de evidencia: '+(s.source?.commit||'desconocida').slice(0,12)+' · vía '+(s.lane||'?'));
  text($('renderer'),'Renderizador: '+(data.renderer?.['app.js']?.slice(0,12)||'identidad no capturada'));
  renderPreparationWarning($('preparation-warning'));
  text($('timing'),'Tiempo registrado de ejecución: '+seconds(s.liveDurationSeconds)+' · preparación: '+seconds(s.preparationDurationSeconds));
  text($('environment'),s.active?(data.activeProcessObserved===false?'Interrupción sin recibo final':data.activeProcessObserved===true?'Operación en curso':'Proceso sin confirmar'):s.cleaned?'Recursos retirados':s.demoResult==='CONFIRMED'?'Presentación terminada':s.prepared?'Preparación registrada':s.operational==='PENDING'?'Entorno pendiente':'Preparación incompleta');
  $('html-export').hidden=data.recorded||!s.exports?.length;$('package-export').hidden=!data.recorded&&!s.exports?.length;
  if(data.recorded){$('package-export').hidden=!data.packageName;$('package-export').href=data.packageName||'#';$('mode').disabled=true;$('follow').disabled=true;}
 }
 function renderOperatorStatus(writable){
  const s=data.session;let status=stale?'Sin conexión o estado desactualizado':s.cleaned?'Recursos retirados':s.active?(data.activeProcessObserved===true?(s.prepared?'Ejecutando':'Preparando'):'Proceso sin confirmar'):s.demoResult==='CONFIRMED'?'Presentación terminada':s.prepared?(control?.capabilities?.present?.enabled?'Preparado y disponible':'Preparación registrada; consultar comprobación'):s.operational==='PENDING'?'Pendiente de preparación':'Preparación incompleta';
  text($('control-state'),s.session+' / '+s.profile+' · '+status);text($('next-operation'),control?.nextOperation?'Siguiente: '+M.meta(control.nextOperation,data).title:'Sin siguiente paso confirmado');$('readonly-help').hidden=writable;$('open-live').hidden=data.recorded; $('open-live').textContent=s.active?'Consola en directo':'Consola de operación';
 }
 function renderLive(){
  if(!data||$('live-console').hidden)return;const active=data.recorded?null:data.session.active;
  if(active){const key=JSON.stringify([active.operation,active.instance,active.startUTC]);if(key!==liveKey){liveKey=key;liveOperation=active.operation;liveBaseline=Math.max(0,...data.events.map(e=>e.sequence||0));liveFinal=null;text($('live-output'),'Sin salida para esta operación');}if(data.provisionalLog!=null)text($('live-output'),data.provisionalLog);}
  else if(liveOperation)liveFinal=data.events.find(e=>e.operation===liveOperation&&e.sequence>liveBaseline)||liveFinal;
  text($('live-title'),data.session.session+' · '+(liveOperation?M.meta(liveOperation,data).title:'Sin operación seleccionada'));
  text($('live-state'),stale?'Sin conexión · salida conservada, estado desactualizado':active?(data.activeProcessObserved===true?'Proceso observado · salida provisional, no es un resultado final':data.activeProcessObserved===false?'Proceso desaparecido · falta resultado definitivo':'Proceso sin confirmar · no se presume actividad'):liveFinal?'Operación finalizada · '+M.outcome(liveFinal).label:'Sin proceso activo observado ni recibo final asociado');
  text($('live-progress'),'Operaciones completadas: '+data.session.completed.length+' · sesión vinculada '+data.session.session);if(active)text($('live-timestamp'),'Última salida: '+(data.provisionalLogModifiedUTC||'sin marca temporal')+' · extracto saneado, hasta 8 KiB; puede estar truncado');
  $('live-final').hidden=!liveFinal;text($('live-follow'),liveFollow?'Pausar seguimiento':'Seguir salida');if(liveFollow&&!stale)requestAnimationFrame(()=>{$('live-output').scrollTop=$('live-output').scrollHeight;});
 }
 function primaryAction(){const s=data?.session;if(!s)return null;if(s.demoResult==='CONFIRMED'||['ERROR','ABORTED'].includes(s.operational)||s.cleaned)return 'result';if(!s.prepared)return 'prepare';return $('mode').value==='step'?'step':'present';}
 function renderControls(){
  if(!data)return;const writable=!data.recorded&&data.actionsEnabled;renderOperatorStatus(writable);document.querySelector('.operator').hidden=!writable;$('follow-label').hidden=!writable;$('stop').hidden=!writable||(!data.session.active&&!control?.busy&&!stopRequested);text($('viewer-mode'),writable?'Controles de la sesión vinculada':'Solo lectura · navegación y evidencias');$('action-status').hidden=!writable&&!stale;const primary=primaryAction(),labels={prepare:'Preparar entorno',present:'Iniciar comparación',step:'Ejecutar siguiente paso',result:'Ver resultado'};
  text($('primary'),labels[primary]);$('primary').dataset.action=primary;
  const disabledReason=stale?'Estado desactualizado; esperando al servidor':data.recorded?'Ejecución registrada · sin acciones':!control?'Visor de solo lectura':actionPending||acceptedPending?'Solicitud en curso; esperando estado del servidor':null;
  for(const b of [$('primary'),$('stop'),...document.querySelectorAll('[data-action]')]){
   const action=b.id==='stop'?'stop':b.dataset.action;if(action==='result'){b.disabled=false;b.title='Abrir resultado registrado';continue;}
   const gate=control?.capabilities?.[action];const reason=disabledReason||(!gate?'Capacidad no confirmada':gate.enabled?'':gate.reason);
   b.disabled=!!reason;b.title=reason||'';
   // A submitted start must not suppress an authoritative active-operation stop.
   if(action==='stop'&&!stale&&control?.capabilities?.stop?.enabled&&!actionPending&&!stopRequested)b.disabled=false;
  }
  if(stopRequested){$('stop').disabled=true;text($('stop'),'Detención solicitada');}else text($('stop'),'Detener');
  if(!actionPending&&!acceptedPending&&!stopRequested)text($('action-status'),disabledReason||control?.capabilities?.[primary]?.reason||'Acciones vinculadas exclusivamente a '+data.session.session+'. La selección no ejecuta operaciones.');
 }
 async function requestAction(name){
  if(name==='result'){openInspector('result');return;}
  if(actionPending||acceptedPending&&name!=='stop'||stale||!control?.capabilities?.[name]?.enabled)return;
  const commandBaseline=JSON.stringify(data.session.lastCommand);actionPending=name;renderControls();
  try{
   if(name==='cleanup'){
    const r=await fetch('/api/cleanup-plan',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('No se pudo leer el alcance de limpieza');const p=await r.json();
    if(!window.confirm('Retirar recursos de '+data.session.session+':\n'+p.plan.map(x=>[x.name,x.resource,x.action].filter(Boolean).join(' · ')).join('\n')+'\nConservar: '+p.preserved.join(', ')))return;
   }
   const r=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':control.csrf},body:JSON.stringify({action:name}),signal:AbortSignal.timeout(15000)});
   const value=await r.json();if(!r.ok)throw Error(value.error||'Acción rechazada');
   if(name==='stop'){stopRequested=true;text($('action-status'),'Detención solicitada; esperando el resultado del backend.');}
   else{acceptedBaseline=commandBaseline;acceptedPending=true;text($('action-status'),'Solicitud aceptada; todavía no acredita finalización.');}
  }catch(error){text($('action-status'),error.message+' · Estado pendiente de actualización.');stale=true;control=null;}
  finally{actionPending=null;renderControls();}
 }
 function renderSelection(){
  if(!data)return;if(selection.row)lastAttemptSelection={...selection};const showingPreparation=preparationView&&tab==='result'&&!artifact;document.querySelector('.result-actions').hidden=showingPreparation;if(showingPreparation){const seal=data.events.filter(e=>e.operation==='seal').at(-1);text($('result-title'),'Preparación previa');text($('result-outcome'),M.confirmed(seal)?'Preparación registrada':'Preparación sin confirmar');$('result-outcome').className=M.confirmed(seal)?'reused':'unknown';text($('result-expectation'),'Tiempo registrado: '+seconds(data.session.preparationDurationSeconds)+' · fuera del intervalo de presentación');return;}const e=selectedEvent(),m=selectedMeta(),active=data.session.active?.operation===selection.op;
  const state=M.outcome(e,active,data.activeProcessObserved);
  text($('result-identity'),m.arm+' · '+(selection.row||e?.attempt||'Preparación')+' · '+(data.recorded?'registro conservado':'sesión vinculada'));
  text($('result-title'),(m.arm==='G'?'G · ':'')+m.title);text($('result-outcome'),state.label);$('result-outcome').className=state.tone;$('selected-result').dataset.tone=state.tone;
  const description=M.confirmed(e)?m.description:active?'La operación aún no tiene un resultado final confirmado.':state.tone==='unreached'?'Este control no se observó: la secuencia se detuvo antes.':e?'No hay evidencia suficiente para atribuir el resultado al control esperado. Consulta el diagnóstico original.':'Operación declarada para este perfil; todavía no se ha ejecutado.';
  text($('result-description'),description);text($('result-expectation'),M.expectation(e)+(e?' · '+seconds(e.durationSeconds):''));
  const log=M.primaryArtifact(e,data),attribution=M.primaryArtifact(e,data,'attribution');
  $('blocking-log').disabled=!log;text($('blocking-log'),state.tone==='blocked'?'Ver log del bloqueo':'Ver salida original');$('blocking-log').title=log?'Abrir los bytes de este intento':'Salida original no registrada para esta selección';
  $('attribution').disabled=!attribution;$('attribution').title=attribution?'Abrir el recibo de atribución':'Atribución no disponible';
  const related=relatedRow(e);$('related').hidden=!related;text($('related'),e?.linkedAttempt?'Ver rechazo relacionado':'Ver recuperación relacionada');
 }
 function relatedRow(e){if(!e)return null;return e.linkedAttempt||data.events.find(x=>x.linkedAttempt===e.attempt)?.attempt||null;}
 function renderRows(){
  const rows=allRows(),wanted=new Set();
  for(const row of rows){wanted.add(row.id);let node=rowNodes.get(row.id);
   if(!node){node=el('article',undefined,'attempt-row');node.dataset.attempt=row.id;node.select=button('',()=>choose(row.id,M.latest(allRows().find(r=>r.id===row.id))?.operation||row.ops[0],true),'attempt-select');node.track=el('div',undefined,'track');node.outcome=el('div',undefined,'row-outcome');node.assessment=el('small');node.links=el('div',undefined,'row-links');node.parts=new Map();node.append(node.select,node.track,node.outcome,node.assessment,node.links);rowNodes.set(row.id,node);$('attempts').append(node);}
   node.classList.toggle('selected',selection.row===row.id);node.select.dataset.focusKey='attempt-'+row.id;node.select.setAttribute('aria-pressed',String(selection.row===row.id));
   const last=M.latest(row),op=row.ops.at(-1),m=M.meta(op,data);text(node.select,row.ops.includes('accept')?'G · Recuperación de F13':(m.arm==='G'?'G · ':'')+m.title);
   const state=M.rowOutcome(row,data);text(node.outcome,state.label);node.outcome.className='row-outcome '+state.tone;
   text(node.assessment,M.expectation(last));
   const linkKey=JSON.stringify([last?.sequence,last?.artifacts?.length]);if(node.links.dataset.key!==linkKey){node.links.dataset.key=linkKey;node.links.replaceChildren();const log=M.primaryArtifact(last,data),attribution=M.primaryArtifact(last,data,'attribution');if(log)node.links.append(fileButton(log,last,state.tone==='blocked'?'Ver log del bloqueo':'Ver evidencia'));if(attribution)node.links.append(fileButton(attribution,last,'Ver atribución'));node.links.append(button('Evidencia técnica',()=>{choose(row.id,last?.operation||row.ops[0]);openInspector('technical');}));}
   const parts=new Set();for(const segment of M.segments(row,data)){parts.add(segment.key);let b=node.parts.get(segment.key);
    if(!b){b=button('',()=>{},'segment');b.heading=el('span');b.status=el('small');b.append(b.heading,b.status);node.parts.set(segment.key,b);node.track.append(b);}
    text(b.heading,segment.label);text(b.status,segment.state.label);b.className='segment '+segment.state.tone;b.dataset.focusKey='segment-'+row.id+'-'+segment.key;b.title=(segment.aggregate?'Recibo agregado; no desglosa éxito por control. ':'')+row.id;
    b.onclick=()=>{if(segment.omitted){choose(row.id,row.ops[0]);openInspector('scope');}else if(segment.preparation){choose(row.id,row.ops[0]);openPreparation();}else {choose(row.id,segment.operation);openInspector(segment.state.tone==='blocked'?'console':'result');}};
   }
   for(const [key,n] of node.parts)if(!parts.has(key)){n.remove();node.parts.delete(key);}
  }
  for(const [key,n] of rowNodes)if(!wanted.has(key)){n.remove();rowNodes.delete(key);}
 }
 function preserveRegion(container,build){
  const pageScroll=scrollY,scroll=container.scrollTop,opens=new Set([...container.querySelectorAll('details[open][data-key]')].map(n=>n.dataset.key));
  const focusNode=container.contains(document.activeElement)?document.activeElement:null;
  const focused=focusNode?.dataset.focusKey,caret=focusNode?.selectionStart;
  build();restoreDetails(container,opens);
  if(focused)for(const n of container.querySelectorAll('[data-focus-key]'))if(n.dataset.focusKey===focused){n.focus({preventScroll:true});if(caret!=null&&n.setSelectionRange)n.setSelectionRange(caret,caret);}container.scrollTop=scroll;scrollTo(0,pageScroll);
 }
 function restoreDetails(container,opens){for(const d of container.querySelectorAll('details[data-key]')){d.open=opens.has(d.dataset.key);if(d.open){d.populate?.();restoreDetails(d,opens);}}}
 function rememberRoute(){
  if(!currentRoute)return;
  const scope=document.querySelector('#inspector:not([hidden]), #exploration:not([hidden]), #presentation:not([hidden]), #live-console:not([hidden])');
  routeMemory.set(currentRoute,{scroll:scrollY,consoleScroll:document.querySelector('.console-text')?.scrollTop||0,nowrap:document.querySelector('.console-text')?.classList.contains('nowrap')||false,
   opens:[...scope.querySelectorAll('details[open][data-key]')].map(n=>n.dataset.key),
   focus:document.activeElement?.dataset.focusKey,focusId:document.activeElement?.id});
 }
 function fitConsole(){const pre=document.querySelector('.console-text');if(pre&&innerWidth>800&&innerHeight>600)pre.style.setProperty('--console-height',Math.max(400,innerHeight-pre.getBoundingClientRect().top-20)+'px');}
 function restoreRoute(){
  const saved=routeMemory.get(currentRoute);if(!saved){scrollTo(0,0);return;}
  restoreDetails(document,new Set(saved.opens));
  scrollTo(0,saved.scroll);const pre=document.querySelector('.console-text');if(pre){pre.scrollTop=saved.consoleScroll;pre.classList.toggle('nowrap',saved.nowrap);const wrap=document.querySelector('[data-focus-key=console-wrap]');if(wrap)text(wrap,saved.nowrap?'Activar ajuste de línea':'Desactivar ajuste de línea');}const focus=[...document.querySelectorAll('[data-focus-key]')].find(n=>n.dataset.focusKey===saved.focus&&n.checkVisibility());if(focus)focus.focus({preventScroll:true});else if(saved.focusId&&$(saved.focusId)?.checkVisibility())$(saved.focusId).focus({preventScroll:true});
 }
 function navigate(hash){rememberRoute();if(location.hash!==hash)history.pushState({returnTo:detailOrigin},'',hash);applyRoute();}
 function detailRoute(next){if(selection.event!=null){const params=new URLSearchParams();if(artifact)params.set('artifact',artifact.record.id);return '#demo/operation/'+selection.event+'/'+next+(params.size?'?'+params:'');}const row=preparationView?'preparation':selection.row;const params=new URLSearchParams({op:selection.op||''});if(artifact)params.set('artifact',artifact.record.id);return '#demo/attempt/'+encodeURIComponent(row)+'/'+next+'?'+params;}
 function applyRoute(){
  if(!data)return;cancelArtifact();const hash=location.hash||'#demo';currentRoute=hash;routeReady=true;
  const [path,query='']=hash.slice(1).split('?'),parts=path.split('/'),params=new URLSearchParams(query);
  const globalDetail=parts[1]==='operation'&&/^[1-9][0-9]*$/.test(parts[2]||'');
  const detail=parts.length===4&&parts[0]==='demo'&&(parts[1]==='attempt'||globalDetail)&&['result','console','files','technical','scope'].includes(parts[3]);
  let validDetail=false;if(path==='demo'){if(!selection.row&&lastAttemptSelection)selection={...lastAttemptSelection};preparationView=false;}
  if(detail&&!globalDetail){const row=allRows().find(r=>r.id===parts[2]);const op=params.get('op');preparationView=parts[2]==='preparation';
   if(row||preparationView){selection={row:row?.id||null,op:row?.ops.includes(op)?op:preparationView&&data.events.some(e=>e.operation===op)?op:row?.ops[0]};tab=parts[3];artifact=null;
    const e=selectedEvent(),id=params.get('artifact');const a=/^[a-f0-9]{24}$/.test(id||'')?e?.artifacts?.find(x=>x.id===id):null;missingArtifact=id!==null&&!a;if(a)artifact={record:a,event:e};validDetail=true;}
  }
  if(detail&&globalDetail){const e=M.sessionEvents(data).find(e=>String(e.sequence)===parts[2]);if(e){selection={row:null,op:e.operation,event:e.sequence};preparationView=false;tab=parts[3];artifact=null;const id=params.get('artifact'),a=/^[a-f0-9]{24}$/.test(id||'')?e.artifacts?.find(a=>a.id===id):null;missingArtifact=id!==null&&!a;if(a)artifact={record:a,event:e};validDetail=true;}}
  if(validDetail){detailOrigin=history.state?.returnTo||detailOrigin; text($('close-inspector'),detailOrigin.startsWith('#journey')?'← Volver al recorrido técnico':'← Volver a demostración');}
  exploration=parts[0]==='journey'||path==='technical'?'journey':['scenarios','workflows','sessions'].includes(path)?path:null;
  if(exploration==='journey'){journeyTab=parts[1]==='sequence'?'sequence':'map';const filter=params.get('filter')||'all';journeyFilter=M.journeyFilters(data).some(([id])=>id===filter)?filter:'all';}

  const live=path==='demo/live';$('live-console').hidden=!live;if(live)renderLive();
  $('presentation').hidden=validDetail||!!exploration||live;$('inspector').hidden=!validDetail;$('exploration').hidden=!exploration;
  document.body.dataset.view=live?'live':validDetail?'detail':exploration||'demo';document.body.dataset.tab=validDetail?tab:'';
  for(const a of document.querySelectorAll('[data-destination]')){if(a.dataset.destination===(exploration==='technical'?'demo':exploration||'demo'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  $('provenance').open=false;renderSelection();renderRows();renderSidebar();
  if(validDetail){inspectorKey='';renderInspector();}else if(exploration){text($('exploration-title'),({scenarios:'Escenarios',workflows:'Workflows GitHub',sessions:'Sesiones locales',journey:'Recorrido técnico'})[exploration]);text($('exploration-context'),exploration==='journey'?'Mapa: estructura y evidencia disponible. Secuencia: orden registrado de operaciones.':'Configuración y referencias; explorar no ejecuta operaciones ni cambia la sesión vinculada.');renderExplore();}
  restoreRoute();requestAnimationFrame(fitConsole);
 }
 function renderSidebar(){
  const sidebar=$('attempt-sidebar'),select=$('mobile-attempt');const key=JSON.stringify(allRows().map(r=>[r.id,r.ops]));
  if(sidebar.dataset.key!==key){sidebar.dataset.key=key;sidebar.replaceChildren();select.replaceChildren();for(const row of allRows()){const title=row.ops.includes('accept')?'Recuperación de F13':M.meta(row.ops.at(-1),data).title;const b=button(title,()=>{choose(row.id,row.ops.at(-1));openInspector(tab);});b.dataset.row=row.id;sidebar.append(b);const o=el('option',title);o.value=row.id;select.append(o);}}
  for(const b of sidebar.children)b.setAttribute('aria-pressed',String(b.dataset.row===selection.row));select.value=selection.row||'';
  $('inspector').classList.toggle('sidebar-hidden',sidebarHidden);
 }
 function openInspector(next='result'){
  if($('inspector').hidden){opener=document.activeElement;detailOrigin=currentRoute.startsWith('#journey')?currentRoute:'#demo';}
  navigate(detailRoute(next));document.querySelector(`[data-tab="${tab}"]`)?.focus({preventScroll:true});
 }
 function closeInspector(){navigate(detailOrigin);if(opener?.isConnected&&opener.checkVisibility())opener.focus({preventScroll:true});}
 function fileButton(a,e,label){const b=button(label||a.path.split('/').at(-1),()=>openArtifact(a,e));b.dataset.focusKey=a.id;return b;}
 function openArtifact(a,e){pin();const row=allRows().find(r=>r.events.some(x=>x.sequence===e?.sequence));selection={row:row?.id||null,op:e?.operation,...(row&&!currentRoute.startsWith('#journey')&&selection.event==null?{}:{event:e?.sequence})};preparationView=false;artifact={record:a,event:e};cancelArtifact();inspectorKey='';openInspector('console');}
 function references(value,e){const p=el('p',undefined,'file-references');let start=0;
  for(const match of String(value||'').matchAll(/[A-Za-z0-9_./-]+\.(?:json|log|txt|ya?ml|csv)\b/g)){p.append(el('span',String(value).slice(start,match.index)));const a=M.ownArtifact(e,match[0]);p.append(a?fileButton(a,e,match[0]):el('span',match[0]));start=match.index+match[0].length;}p.append(el('span',String(value||'').slice(start)));return p;
 }
 function contextHeader(){if(preparationView&&tab==='result'){text($('inspector-identity'),data.session.session+' / '+data.session.profile+' · preparación previa');text($('inspector-artifact'),'Preparación registrada; fuera del intervalo en directo');return;}const e=artifact?.event||selectedEvent(),m=M.meta(e?.operation||selection.op,data);text($('inspector-identity'),data.session.session+' / '+data.session.profile+' · '+m.title+' · '+(e?.attempt||selection.row||'preparación')+' · '+(e?.operation||selection.op));text($('inspector-artifact'),artifact?.record.path||'Evidencia de la selección · no es una ejecución nueva');}
 function renderInspector(){
  if($('inspector').hidden)return;if(tab==='console'&&!artifact&&!missingArtifact){const e=selectedEvent(),a=M.primaryArtifact(e,data);if(a)artifact={record:a,event:e};}contextHeader();document.querySelectorAll('[data-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.tab===tab));b.tabIndex=b.dataset.tab===tab?0:-1;});
  const e=artifact?.event||selectedEvent(),inspectedOp=e?.operation||selection.op,inspectedRow=artifact?(e?.operation==='reference'?'reference-preparation':e?.attempt):selection.row;const key=JSON.stringify([preparationView,selection,tab,artifact?.record.id,e?.sequence,e?.operational,e?.artifacts?.length,tab==='technical'?data.events.length:null,tab==='result'||!artifact?[data.session.active?.operation,data.activeProcessObserved]:null]);if(key===inspectorKey){if(tab==='console'&&!artifact)renderProvisional();return;}inspectorKey=key;
  preserveRegion($('inspector-content'),()=>{
   const c=$('inspector-content');c.replaceChildren();c.classList.toggle('console-pane',tab==='console');
   if(preparationView&&tab==='result'&&!artifact){renderPreparation(c);return;}
   if(tab==='scope'){c.append(el('h3','Qué demuestra y qué no'),el('p',M.scope(data.session.profile,selection.op)),el('p','Las firmas se verifican solo donde conste el recibo correspondiente; un archivo o un hash visible no acredita autenticación.'));const identity=details('Identidad completa, recursos y revisión registrada','scope-identity');identity.append(el('pre',JSON.stringify({source:data.session.source,image:data.session.image,lane:data.session.lane,renderer:data.renderer,resources:data.session.lastResources,humanReview:data.session.humanReview,recordedUTC:data.savedUTC,lastEvidenceUTC:data.session.lastEvidenceUTC},null,2)));c.append(identity);return;}
   if(tab==='technical'){c.append(el('p','Detalle técnico de esta operación o intento; no es el recorrido global.'));renderTechnical(c,inspectedRow||'all',inspectedOp);return;}
   if(tab==='files'){renderFiles(c,e);return;}
   if(tab==='console'){renderConsole(c);return;}
   c.append(badge(M.outcome(e,data.session.active?.operation===inspectedOp,data.activeProcessObserved)),el('p',M.expectation(e)),el('p',M.confirmed(e)?M.meta(inspectedOp,data).description:'Sin atribución confirmada para esta selección.'),el('p','Granularidad: recibo agregado de operación. Los tiempos de sus observadores no se suman ni se distribuyen entre controles.'));
   if(e)appendReceipt(c,e);if(e?.reason)c.append(el('pre',e.reason));if(e?.notReached?.length)c.append(el('p','No alcanzado: '+e.notReached.join(', ')));
   const spec=data.catalogue.operations[inspectedOp];c.append(el('p','Esperado según definición: '+({allow:'aceptación',deny:'rechazo'}[spec?.expected]||'desconocido')));
   const links=el('div',undefined,'inline-actions');for(const [kind,label] of [['log','Ver salida original'],['attribution','Ver atribución']]){const a=M.primaryArtifact(e,data,kind);if(a)links.append(fileButton(a,e,label));}c.append(links);
   if(relatedRow(e))c.append(button('Ver intento relacionado',()=>{const id=relatedRow(e),row=allRows().find(r=>r.id===id);if(row)choose(row.id,row.events.at(-1)?.operation||row.ops[0],true);}));
  });
 }
 function renderFiles(container,e){
  if(!e?.artifacts?.length){container.append(el('p','No hay archivos registrados para esta selección.','empty'));return;}
  const preferred=[M.primaryArtifact(e,data),M.primaryArtifact(e,data,'attribution')].filter(Boolean);const used=new Set(preferred.map(a=>a.id));
  const add=(target,a)=>{const row=el('div',undefined,'file-item');row.append(fileButton(a,e),el('p',a.path+' · '+a.size+' bytes · SHA-256 '+a.sha256+' · '+M.artifactOrigin(a,e,data).label,'metadata'));target.append(row);};
  container.append(el('h3','Evidencia relevante del intento'));preferred.forEach(a=>add(container,a));
  const groups=new Map();for(const a of e.artifacts){if(used.has(a.id))continue;const path=a.path;const key=/sbom/i.test(path)?'SBOM':/provenance/i.test(path)?'Procedencia':/result|authoriz/i.test(path)?'Resultados':/signature|bundle/i.test(path)?'Firmas y bundles':/log|command/i.test(path)?'Salidas y comandos':'Otros archivos';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
  container.append(el('p','Inventario registrado; presencia no equivale a verificación criptográfica. Copias heredadas conservan su contexto, no sustituyen originales ausentes.'));
  for(const [key,values] of groups){const d=details(key+' · '+values.length,'files-'+key);let loaded=false;d.addEventListener('toggle',()=>{if(d.open&&!loaded){loaded=true;for(const a of values)add(d,a);}});container.append(d);}
 }
 function renderConsole(c){
  if(missingArtifact){c.append(el('p','El artefacto solicitado no pertenece a este intento o ya no está disponible. No se sustituye por otra salida.','empty'));return;}
  if(!artifact){const e=selectedEvent(),a=M.primaryArtifact(e,data);if(a)artifact={record:a,event:e};}
  contextHeader();
  if(!artifact){c.append(el('p','No hay salida original registrada para esta selección.','empty'),el('pre','Sin salida seleccionada','console-text'));renderProvisional();return;}
  const {record:a,event:e}=artifact;const description=el('p','Verificando bytes…','console-status');c.append(description);
  const controls=el('div',undefined,'inline-actions'),wrap=button('Desactivar ajuste de línea',()=>{pre.classList.toggle('nowrap');text(wrap,pre.classList.contains('nowrap')?'Activar ajuste de línea':'Desactivar ajuste de línea');});wrap.dataset.focusKey='console-wrap';controls.append(wrap,button('Copiar contenido mostrado',async()=>{try{await navigator.clipboard.writeText(pre.textContent);text(copyStatus,pre.dataset.excerpt==='true'?'Extracto mostrado copiado':'Contenido mostrado copiado');}catch{ text(copyStatus,'Copia no disponible; selecciona el texto para copiarlo.');}}));const copyStatus=el('span',undefined,'copy-status');copyStatus.setAttribute('role','status');controls.append(copyStatus);
  if(!data.recorded){const link=el('a','Archivo completo ↓');link.href='/download/artifact/'+a.id;controls.append(link);}else controls.append(el('span','Archivo completo: paquete conservado'));
  c.append(controls);const origin=M.artifactOrigin(a,e,data);const info=details('Comando, salidas, identidad y hash','console-metadata');info.append(el('p',`UTC ${e?.endUTC||'desconocida'} · operación/oráculo exit=${e?.exitCode??'desconocido'} · la salida del control se consulta en su recibo; no se deduce del oráculo.`,'metadata'),el('p','Comando registrado de operación: '+(e?.command?.join(' ')||'no registrado'),'metadata'),el('p',a.path+' · SHA-256 '+a.sha256+' · '+origin.label+' · '+a.size+' bytes','metadata'));if(origin.event)info.append(button('Ver operación de origen',()=>openEvent(origin.event,'result')));const toolReceipt=M.ownArtifact(e,'F11-early-command.json');if(e?.operation==='f11-early'&&toolReceipt)info.append(fileButton(toolReceipt,e,'Ver comando y salida de Conftest'));info.classList.add('console-metadata');controls.append(info);
  const pre=el('pre','Cargando salida…','console-text');pre.tabIndex=0;pre.dataset.focusKey='console-output';pre.setAttribute('aria-label','Salida original del control');c.append(pre);loadArtifact(a,pre,description);
 }
 async function loadArtifact(a,pre,description){
  cancelArtifact();const generation=artifactEpoch;artifactAbort=new AbortController();
  try{let body,truncated;
   if(data.recorded){const item=data.offlineArtifacts?.[a.id];if(!item)throw Error('Archivo no incluido en esta vista exportada');body=item.text;truncated=item.truncated;}
   else{const r=await fetch('/artifact/'+a.id,{cache:'no-store',signal:artifactAbort.signal});if(!r.ok)throw Error('Archivo ausente, alterado o no verificable (HTTP '+r.status+')');body=await r.text();truncated=r.headers.get('X-Evidence-View')==='excerpt';}
   if(generation!==artifactEpoch||!pre.isConnected)return;
   text(description,(truncated?'EXTRACTO ACOTADO':'CONTENIDO COMPLETO')+' · '+(a.sanitized?'Copia redactada con hash propio':'Copia íntegra / recibo original')+' · '+(data.recorded?'Ejecución registrada':'Archivo cerrado del intento'));
   const origin=M.artifactOrigin(a,artifact.event,data);if(origin.event)text(description,description.textContent+' · Copia heredada de '+origin.event.operation+'; no es salida del control seleccionado');
   text(pre,body||'(Archivo vacío)');pre.scrollTop=routeMemory.get(currentRoute)?.consoleScroll||0;description.title=a.path;description.dataset.contentType=/\.json$/.test(a.path)?'application/json':'text/plain';text(description,a.path.split('/').at(-1)+' · '+description.dataset.contentType+' · '+description.textContent);pre.dataset.excerpt=String(!!truncated);fitConsole();
  }catch(error){if(error.name==='AbortError'||generation!==artifactEpoch)return;text(description,'Evidencia no disponible');text(pre,error.message);}
 }
 function renderProvisional(){if(artifact||!$('follow').checked||data.recorded||data.session.active?.operation!==selection.op)return;const pre=$('inspector-content').querySelector('pre');if(pre)text(pre,data.activeProcessObserved===true?'SALIDA PROVISIONAL · no es un recibo final\n'+(data.provisionalLog||'Todavía sin salida'):'Proceso no observado; no se afirma que siga ejecutándose.');}
 function eventTechnical(e,container){
  container.append(el('p',`${e.attempt} · ${e.phase} · ${e.operation} · ${M.expectation(e)} · ${seconds(e.durationSeconds)}`,'metadata'));
  if(e.reason)container.append(el('pre',e.reason));
  for(const a of [M.primaryArtifact(e,data),M.primaryArtifact(e,data,'attribution')].filter(Boolean))container.append(fileButton(a,e));
 }
 function renderTechnical(container,filter='all',operation=null){
  const events=M.sessionEvents(data).filter(e=>(filter==='all'||e.attempt===filter||filter==='reference-preparation'&&e.operation==='reference')&&(selection.event==null||e.sequence===selection.event));
  container.append(el('p','Detalle de '+(filter==='all'?'la sesión completa':filter)+'. Recibos agregados: no establecen éxito independiente de cada control.'));
  const eligible=M.profileOps(data);
  for(const stage of data.catalogue.stages){
   const specs=Object.values(data.catalogue.operations).filter(o=>eligible.has(o.adapter)&&o.stages.includes(stage.id)&&(filter==='all'||o.attempt===filter||filter==='reference-preparation'&&o.adapter==='reference')&&(selection.event==null||o.adapter===selection.op));
   if(!specs.length)continue;if(selection.event!=null&&!events.some(e=>specs.some(s=>s.adapter===e.operation)))continue;const d=details(stage.title,'stage-'+stage.id);d.className='technical-stage';d.dataset.stage=stage.id;const findings=el('span',undefined,'stage-findings');
   for(const e of events){const m=M.meta(e.operation,data),state=M.outcome(e);if(m.stage!==stage.id||!['blocked','error','unknown','unreached'].includes(state.tone))continue;const b=badge({...state,label:(e.scenario||'Control')+' · '+(state.tone==='blocked'?m.property+' · bloqueo en '+m.tool:state.label)+' · '+e.attempt});findings.append(b);}d.firstChild.append(findings);d.append(el('p',stage.description));
   for(const spec of specs){const matches=events.filter(e=>e.operation===spec.adapter);for(const e of matches.length?matches:[null]){
    const row=el('article',undefined,'scenario-row');row.dataset.tone=M.outcome(e).tone;const heading=el('div',undefined,'scenario-heading');heading.append(el('h3',M.meta(spec.adapter,data).title),badge(M.outcome(e)));row.append(heading);if(e)eventTechnical(e,row);
    const detail=details('Controles, condiciones y archivos','controls-'+spec.adapter+'-'+(e?.sequence||'none'));detail.append(el('p','Identificador: '+spec.adapter+' · depende de '+spec.dependsOn.join(', '),'metadata'));
    for(const c of e?.controls||spec.controls){detail.append(el('h3',c.tool),el('p',c.property),references('Entrada: '+c.input,e),references('Salida: '+c.output,e),el('p','Condición: '+c.condition));}row.append(detail);d.append(row);
   }}container.append(d);
  }
  if(!events.length)container.append(el('p','No hay recibos para este filtro. Las definiciones no son observaciones.','empty'));
  const receipts=details('Recibos originales · '+events.length,'receipts');for(const e of events){const d=details(e.sequence+'. '+e.operation+' · '+M.outcome(e).label,'receipt-'+e.sequence);d.className='receipt';d.append(el('pre',JSON.stringify({...e,artifacts:undefined},null,2)));receipts.append(d);}container.append(receipts);
 }
 function renderPreparation(c){text($('inspector-identity'),data.session.session+' / '+data.session.profile+' · preparación previa');c.append(el('h3','Preparación registrada'),el('p',seconds(data.session.preparationDurationSeconds)+' · excluida del intervalo en directo. No se reconstruye ni firma al seleccionar un intento.'));for(const e of data.events.filter(e=>e.phase==='preparation')){const d=details(e.operation+' · '+M.outcome(e).label+' · '+seconds(e.durationSeconds),'prep-'+e.sequence);eventTechnical(e,d);c.append(d);}}
 function openPreparation(){artifact=null;preparationView=true;selection={row:null,op:'seal'};inspectorKey='';openInspector('result');}

 function openExplore(name){navigate(name==='technical'?'#journey/map':'#'+name);}
 function renderExplore(){const c=$('exploration-content');c.replaceChildren();if(exploration==='scenarios')renderCatalogue(c);if(exploration==='workflows')renderWorkflows(c);if(exploration==='sessions')renderSessions(c);if(exploration==='journey')renderJourney(c);}

 function openEvent(e,next='result'){
  pin();selection={row:null,op:e.operation,event:e.sequence};preparationView=false;artifact=null;missingArtifact=false;cancelArtifact();inspectorKey='';openInspector(next);
 }
 function appendReceipt(c,e){const d=details('Recibo registrado · operación '+e.sequence,'original-receipt-'+e.sequence);d.append(el('p','Registro original incluido en el snapshot. Inventario de archivos disponible en Evidencias.'),el('pre',JSON.stringify({...e,artifacts:undefined},null,2)));c.append(d);}
 function renderPreparationWarning(c){
  const problem=M.incompletePreparation(data),key=JSON.stringify([problem?.failure?.sequence,problem?.gUnreached]);if(c.dataset.key===key)return;c.dataset.key=key;c.replaceChildren();c.hidden=!problem;if(!problem)return;
  c.append(el('strong',problem.gUnreached?'Preparación incompleta. Los intentos G no llegaron a ejecutarse.':'Preparación incompleta; consulta los recibos de cada intento.'));
  if(problem.failure){const e=problem.failure;c.append(el('p','La operación '+M.meta(e.operation,data).title+' no terminó correctamente. La causa concreta debe consultarse en su salida original; no se deduce del código de salida.'));const output=M.operationOutput(e);if(output)c.append(fileButton(output,e,'Ver diagnóstico original'));c.append(button('Ver recibo de preparación',()=>openEvent(e)));
   if(e.operation==='analysis')for(const [path,label] of [['database-download.log','Ver registro de descarga'],['sbom-generation.log','Ver registro de SBOM'],['vulnerability-scan.log','Ver registro del análisis']]){const a=M.ownArtifact(e,path);if(a)c.append(fileButton(a,e,label));}}
  else c.append(el('p','No hay evidencia suficiente para conocer la causa.'));
 }
 function journeyRoute(next=journeyTab,filter=journeyFilter){return '#journey/'+next+'?'+new URLSearchParams({filter});}
 function journeyEntry(entry,c){
  const e=entry.event,spec=entry.spec;const row=el('article',undefined,'journey-entry');row.dataset.tone=entry.state.tone;
  if(entry.omitted){row.append(badge(entry.state),el('p','Esta referencia omite estos controles específicos; conserva los controles Kubernetes/RBAC que realmente tenga.'));c.append(row);return;}
  const title=spec?M.meta(spec.adapter,data).title:'Operación no descrita';
  row.append(e?button(title,()=>openEvent(e)):el('h3',title),badge(entry.state));
  if(e)row.append(el('p',M.eventIdentity(e,data)+' · '+M.phaseLabel(e.phase)));
  if(entry.reused){row.append(el('p','↶ Evidencia de la preparación, no repetida en este intento.'),button('Ver operación de origen',()=>openEvent(e)));c.append(row);return;}
  if(entry.downstream){row.append(el('p','El recibo marca esta fase como no alcanzada por esa petición; la solicitud independiente de admisión mantiene su identidad.'));c.append(row);return;}
  row.append(el('p',e?M.expectation(e)+' · '+seconds(e.durationSeconds):'Definición capturada; falta un recibo que establezca su ejecución.'));
  row.append(el('p','Granularidad: operación agregada. No acredita que cada control interno pasara por separado.','evidence-limit'));
  if(e){const actions=el('div',undefined,'inline-actions'),log=M.primaryArtifact(e,data),attribution=M.primaryArtifact(e,data,'attribution');if(log)actions.append(fileButton(log,e,'Ver salida original'));if(attribution)actions.append(fileButton(attribution,e,'Ver atribución'));actions.append(button('Ver recibo',()=>openEvent(e)),button('Ver archivos capturados',()=>openEvent(e,'files')));row.append(actions);}
  const controls=details('Qué comprueba · entradas, salidas y versiones','journey-controls-'+(e?.sequence||spec?.adapter));
  for(const control of e?.controls||spec?.controls||[]){controls.append(el('h3',control.tool),el('p',control.property),references('Entrada: '+control.input,e),references('Salida: '+control.output,e),el('p','Condición declarada: '+control.condition));}
  const versions=e?.artifacts?.filter(a=>/\/(tool-versions|trivy-version|versions)\.(txt|json)$/.test(a.path))||[];
  controls.append(el('p',versions.length?'Versiones: archivos capturados; consulta su origen y contenido.':'Versión no desglosada en este recibo. No se usa la versión del checkout actual como evidencia histórica.'));
  for(const a of versions)controls.append(fileButton(a,e,'Ver '+a.path.split('/').at(-1)));
  row.append(controls);c.append(row);
 }
 function renderJourney(c){
  const warning=el('div',undefined,'preparation-warning');renderPreparationWarning(warning);c.append(warning);
  const nav=el('div',undefined,'journey-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Recorrido técnico');
  for(const [id,title] of [['map','Mapa de controles'],['sequence','Secuencia ejecutada']]){const b=button(title,()=>navigate(journeyRoute(id)));b.setAttribute('role','tab');b.setAttribute('aria-selected',String(journeyTab===id));b.dataset.focusKey='journey-tab-'+id;nav.append(b);}
  const label=el('label','Contexto '),filter=el('select');filter.id='journey-filter';filter.dataset.focusKey='journey-filter';
  for(const [id,title] of M.journeyFilters(data)){const o=el('option',title);o.value=id;filter.append(o);}filter.value=journeyFilter;filter.onchange=()=>navigate(journeyRoute(journeyTab,filter.value));label.append(filter);
  const toolbar=el('div',undefined,'journey-toolbar');toolbar.append(nav,label);c.append(toolbar);
  c.append(el('p','Tiempo registrado de preparación: '+seconds(data.session.preparationDurationSeconds)+' · ejecución: '+seconds(data.session.liveDurationSeconds)+'. Los intervalos de observadores no se suman.','journey-timing'));
  if(journeyTab==='sequence'){
   c.append(el('p','Orden de los recibos registrados, incluidos los avisos de No alcanzado. Un aviso no es una operación ejecutada. Sin marcas temporales fiables se conserva este orden, sin fabricar tiempos.'));
   const list=el('ol',undefined,'journey-sequence'),es=M.filteredEvents(data,journeyFilter);c.append(list);if(!es.length)c.append(el('p','No hay recibos registrados para este contexto.','empty'));
   for(const e of es){const li=el('li');li.dataset.sequence=e.sequence;const d=details(String(e.sequence??'?').padStart(2,'0')+' · '+M.meta(e.operation,data).title,'sequence-'+e.sequence);d.firstChild.append(badge(M.outcome(e)),el('span',M.phaseLabel(e.phase)+' · '+seconds(e.durationSeconds),'sequence-context'));d.append(el('p',M.eventIdentity(e,data)),el('p','Herramientas declaradas: '+[...new Set((e.controls||data.catalogue.operations[e.operation]?.controls||[]).map(c=>c.tool))].join(' · ')),el('p','Fases: '+(e.stages||data.catalogue.operations[e.operation]?.stages||[]).map(id=>data.catalogue.stages.find(s=>s.id===id)?.title||id).join(' · ')),el('p','Inicio: '+(e.startUTC||'no registrado')+' · fin: '+(e.endUTC||'no registrado')));let loaded=false;d.populate=()=>{if(!loaded){loaded=true;journeyEntry({event:e,spec:data.catalogue.operations[e.operation],state:M.outcome(e)},d);appendReceipt(d,e);}};d.addEventListener('toggle',()=>{if(d.open)d.populate();});li.append(d);list.append(li);}
   return;
  }
  c.append(el('p','Orden pedagógico 01–15: izquierda → derecha, arriba → abajo; no es una cronología. Los resultados mixtos se desglosan.'));
  const grid=el('div',undefined,'journey-map');c.append(grid);
  for(const stage of M.journey(data,journeyFilter)){
   const d=details(stage.number+'. '+stage.title,'journey-stage-'+stage.id);d.className='technical-stage journey-stage';d.dataset.stage=stage.id;const summary=d.firstChild;summary.append(el('span',stage.tool,'phase-tool'));const states=el('span',undefined,'stage-findings'),counts=new Map();
   for(const entry of stage.entries){if(entry.blocker){const e=entry.event,m=M.meta(e.operation,data);states.append(badge({...entry.state,label:(e.scenario||'Control')+' · '+m.property+' · bloqueo en '+m.tool+' · '+e.attempt}));}else{const key=entry.state.tone;const group=counts.get(key)||{...entry.state,count:0};group.count++;counts.set(key,group);}}
   for(const group of counts.values())states.append(badge({...group,label:group.tone==='accepted'?group.count+(group.count===1?' comprobación agregada':' comprobaciones agregadas'):group.count+' · '+group.label}));
   if(!stage.entries.length)states.append(badge({tone:'unknown',label:'Sin evidencia en este contexto'}));summary.append(states);
   const contexts=[...new Set(stage.entries.map(x=>x.reused?'Preparación reutilizada':x.event?M.phaseLabel(x.event.phase):null).filter(Boolean))];summary.append(el('span',contexts.join(' · '),'phase-context'));
   let loaded=false;d.populate=()=>{if(!loaded){loaded=true;d.append(el('p',stage.description));if(!stage.entries.length)d.append(el('p','No hay recibos asociados a esta fase en el contexto seleccionado. La ausencia de archivos no demuestra que un control se ejecutara o dejara de ejecutarse.'));for(const entry of stage.entries)journeyEntry(entry,d);}};d.addEventListener('toggle',()=>{if(d.open)d.populate();});grid.append(d);
  }
 }
 function renderCatalogue(c){
  const filters=el('div',undefined,'filters'),search=el('input');search.type='search';search.dataset.focusKey='catalogue-search';search.placeholder='Buscar escenario o garantía';search.setAttribute('aria-label','Buscar escenario');search.value=catalogueFilters.query;filters.append(search);
  const select=(key,label,options)=>{const s=el('select');s.setAttribute('aria-label',label);s.dataset.focusKey='catalogue-'+key;for(const [v,t] of options){const o=el('option',t);o.value=v;s.append(o);}s.value=catalogueFilters[key];s.onchange=()=>{catalogueFilters[key]=s.value;update();};filters.append(s);};
  select('kind','Tipo',[['all','Todos los tipos'],['F','Fallo'],['L','Legítimo']]);select('family','Familia',[['all','Todas las familias'],['workflow','Workflow'],['vulnerability','Vulnerabilidades'],['sbom','SBOM'],['signature','Firma'],['provenance','Procedencia'],['results','Resultados'],['runtime','Manifiesto / runtime']]);select('availability','Disponibilidad',[['all','Todo el catálogo'],['profile','Disponible en este perfil'],['observed','Observado en esta sesión']]);
  const count=el('p'),layout=el('div',undefined,'catalogue-layout'),list=el('div',undefined,'catalogue-list'),detail=el('div',undefined,'catalogue-detail');layout.append(list,detail);c.append(filters,count,layout);
  function update(){const allowed=M.profileOps(data),query=catalogueFilters.query.toLowerCase();const matches=data.catalogue.scenarios.filter(s=>(s.id+' '+s.name+' '+s.guarantee).toLowerCase().includes(query)&&(catalogueFilters.kind==='all'||s.id.startsWith(catalogueFilters.kind))&&(catalogueFilters.family==='all'||M.family(s.id)===catalogueFilters.family)&&(catalogueFilters.availability==='all'||catalogueFilters.availability==='profile'&&M.scenarioOps(s.id,data).some(op=>allowed.has(op))||catalogueFilters.availability==='observed'&&data.events.some(e=>e.scenario===s.id)));
   text(count,`${data.catalogue.scenarios.length} casos en el catálogo · ${matches.length} en el filtro · ${new Set(data.events.map(e=>e.scenario).filter(Boolean)).size} con observaciones de escenario en esta sesión`);list.replaceChildren();detail.replaceChildren();
   if(!matches.length){detail.append(el('p','Sin coincidencias. Ningún resultado anterior se reutiliza para este filtro.','empty'));return;}
   for(const s of matches){const b=button(s.id+' · '+s.name,()=>{scenarioId=s.id;update();list.querySelector('[aria-pressed=true]')?.focus({preventScroll:true});});b.dataset.focusKey='scenario-'+s.id;b.setAttribute('aria-pressed',String(s.id===scenarioId));list.append(b);}
   const s=matches.find(x=>x.id===scenarioId);if(!s){detail.append(el('p','Selecciona un caso del filtro.','empty'));return;}
   detail.append(el('h3',s.id+' · '+s.name),el('p',s.guarantee),el('p','Control '+(s.implemented?'implementado':'documentado')+' · '+(M.scenarioOps(s.id,data).some(op=>allowed.has(op))?'disponible en este perfil':'fuera de este perfil')));
   const ops=M.scenarioOps(s.id,data),phases=el('div',undefined,'mini-phases');for(const id of [...new Set(ops.flatMap(op=>data.catalogue.operations[op].stages))])phases.append(el('span',data.catalogue.stages.find(x=>x.id===id)?.title||id));if(!phases.children.length)phases.append(el('span',s.boundary||'Consultar contrato del catálogo'));detail.append(phases,el('p','Diagrama de definición; no indica fases ejecutadas.'));
   const observations=data.events.filter(e=>e.scenario===s.id);detail.append(el('h3','Observaciones de esta sesión'));if(!observations.length)detail.append(el('p','Sin observación de escenario. No significa que el control no esté implementado.'));for(const e of observations){const d=details(e.attempt+' · '+M.meta(e.operation,data).title+' · '+M.outcome(e).label,'catalogue-'+e.sequence);eventTechnical(e,d);detail.append(d);}
   if(s.id==='L06')detail.append(el('p',ops.includes('comparison-legitimate')?'Actualización legítima disponible en f11-comparison; alcance parcial. Disponibilidad derivada de la definición capturada, sin reescribir su registro histórico.':s.coverage));
   detail.append(el('h3','Alcance'),el('p',s.limits));const history=details('Referencia histórica separada · no reautenticada aquí','history-'+s.id);history.append(el('pre',JSON.stringify(s.history,null,2)));detail.append(history);const tech=details('Implementación y relación con operaciones','catalogue-tech-'+s.id);tech.append(el('p',s.implementation),el('p','Operaciones declaradas (adaptadores): '+(ops.join(', ')||'ninguna en esta demo')));detail.append(tech);
  }search.oninput=()=>{catalogueFilters.query=search.value;update();};update();
 }
 function renderWorkflows(c){
  c.append(el('p','Configuración capturada; ejecución remota no observada. Vía A alojada en GitHub no equivale a confianza OIDC B. CI estático no ejecuta un workflow malicioso; campañas y demo son datasets separados.'));
  const list=el('div',undefined,'catalogue-list'),body=el('div',undefined,'catalogue-detail'),layout=el('div',undefined,'catalogue-layout');layout.append(list,body);c.append(layout);const workflows=data.workflows||[];if(!workflows.some(w=>w.file===workflowId))workflowId=workflows[0]?.file;
  for(const w of workflows){const choice=button(w.file,()=>{workflowId=w.file;preserveRegion(c,()=>{c.replaceChildren();renderWorkflows(c);});});choice.dataset.focusKey='workflow-'+w.file;choice.setAttribute('aria-pressed',String(w.file===workflowId));list.append(choice);if(w.file!==workflowId)continue;const d=el('section');d.append(el('h2',w.file));d.append(el('p',w.purpose),el('p','Triggers: '+(w.triggers?.join(', ')||'consultar YAML capturado')),el('p','Runners: '+(w.runners?.join(', ')||'no desglosados; consultar YAML')),el('p','Timeouts declarados: '+(w.timeoutsMinutes?.join(', ')||'no capturados')+' min'),el('p','Permisos: '+(w.permissions||[]).map(x=>x.join(': ')).join(', ')),el('p','Acciones fijadas / referencias declaradas: '+(w.actions||[]).join(' · '),'metadata'));
   if(w.jobs?.length)for(const job of w.jobs){const j=details('Job '+job.id,'job-'+w.file+'-'+job.id);j.append(el('p','Depende de: '+(job.needs||'sin dependencia declarada')+' · runner: '+(job.runner||'consultar YAML')+' · timeout: '+(job.timeoutMinutes||'no declarado')),el('p','Fases/pasos declarados: '+(job.steps||[]).join(' → ')),el('p','Permisos del job: '+(job.permissions||[]).map(x=>x.join(': ')).join(', ')));d.append(j);}else d.append(el('p','Snapshot antiguo sin desglose de jobs: consultar el YAML capturado abajo.'));
   d.append(el('p','Fuente: '+(data.session.source?.commit||'desconocida')+' · SHA-256 YAML: '+w.sha256,'metadata'));const link=el('a','Definición en GitHub (fuente capturada)');const revision=data.session.source?.commit;if(/^[a-f0-9]{40}$/.test(revision||'')&&/^(ci|lane-a-validation|golden-path|paired-rg)\.yml$/.test(w.file)){link.href='https://github.com/tfm-goldenpath/golden-path-lab/blob/'+revision+'/.github/workflows/'+w.file;link.target='_blank';link.rel='noopener noreferrer';d.append(link);}const yaml=details('YAML capturado · solo configuración','yaml-'+w.file);yaml.append(el('pre',w.yaml));d.append(yaml);body.append(d);
  }
 }
 async function renderSessions(c){
  if(data.recorded){inventory=data.localSessions||{entries:[],error:'Este export antiguo no capturó inventario local'};}
  if(!inventory&&!inventoryLoading&&!data.recorded){inventoryLoading=true;c.append(el('p','Leyendo metadatos locales acotados…'));try{const r=await fetch('/api/sessions',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Inventario no disponible');inventory=await r.json();}catch(e){inventory={entries:[],error:e.message};}finally{inventoryLoading=false;if(exploration==='sessions')renderExplore();}return;}
  c.append(el('p',(data.recorded?'Inventario capturado al exportar; no es un inventario actual. ':'Solo metadatos locales; no se abren paquetes ni se cambia la sesión del servidor. ')+(inventory?.truncated?'Listado acotado; existen entradas sin inspeccionar.':'')));
  if(inventory?.error)c.append(el('p',inventory.error));for(const s of inventory?.entries||[]){const d=details(s.session+(s.bound?' · sesión vinculada':''),'session-'+s.session);d.append(el('p',s.error||[s.profile,s.createdUTC,s.operational].join(' · ')),el('p','Fuente: '+(s.source?.commit||'desconocida'),'metadata'));if(!s.bound&&!s.error&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(s.session))d.append(el('p','Abre otro visor en un puerto libre. Este panel no redirige acciones ni archivos.'),el('pre','bash implementacion/scripts/defense-demo.sh serve --session '+s.session+' --port 8770'));c.append(d);}
 }
 async function poll(){
  if(inFlight||data?.recorded)return;inFlight=true;
  try{
   const r=await fetch('/api/session',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Estado no disponible');const next=await r.json();
   let nextControl=null;if(next.actionsEnabled){const response=await fetch('/api/control',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Autenticación de acciones no disponible');nextControl=await response.json();if(nextControl.session!==next.session.session)throw Error('Identidad de control inconsistente');}
   data=next;control=nextControl;stale=false;initialSelection();
   if(acceptedPending&&(control?.busy||data.session.active||JSON.stringify(data.session.lastCommand)!==acceptedBaseline))acceptedPending=false;
   if(stopRequested&&!control?.busy&&!data.session.active)stopRequested=false;
   if($('follow').checked&&data.session.active){const row=allRows().find(x=>x.ops.includes(data.session.active.operation));if(row&&selection.op!==data.session.active.operation){selection={row:row.id,op:data.session.active.operation};artifact=null;cancelArtifact();inspectorKey='';if(!$('inspector').hidden){history.replaceState(null,'',detailRoute(tab));currentRoute=location.hash;}}}
   renderIdentity();renderControls();renderRows();renderSelection();renderLive();if(!routeReady)applyRoute();else {renderSidebar();renderInspector();}
   const revision=JSON.stringify([data.events.map(e=>[e.sequence,e.operation,e.operational,e.artifacts?.length,e.expectation]),data.session.active,data.activeProcessObserved,data.session.operational]);if(exploration&&revision!==explorationRevision&&exploration!=='sessions')preserveRegion($('exploration-content'),renderExplore);explorationRevision=revision;
  }catch(error){stale=true;control=null;if(data){renderIdentity();renderControls();}renderLive();text($('connection'),'Sin conexión · datos desactualizados');text($('action-status'),error.message+'; ejecución deshabilitada hasta actualizar.');}
  finally{inFlight=false;setTimeout(poll,1500);}
 }
 function start(){
  $('open-live').onclick=()=>navigate('#demo/live');$('close-live').onclick=()=>navigate('#demo');$('live-follow').onclick=()=>{liveFollow=!liveFollow;renderLive();};$('live-bottom').onclick=()=>{liveFollow=true;renderLive();};$('live-output').onscroll=()=>{const p=$('live-output');if(p.scrollHeight-p.clientHeight-p.scrollTop>30){liveFollow=false;text($('live-follow'),'Seguir salida');}};$('live-final').onclick=()=>{if(liveFinal)openEvent(liveFinal);};
  $('primary').onclick=()=>requestAction(primaryAction());$('stop').onclick=()=>requestAction('stop');$('mode').onchange=renderControls;document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>requestAction(b.dataset.action));
  $('blocking-log').onclick=()=>{const e=selectedEvent(),a=M.primaryArtifact(e,data);if(a)openArtifact(a,e);};$('attribution').onclick=()=>{const e=selectedEvent(),a=M.primaryArtifact(e,data,'attribution');if(a)openArtifact(a,e);};$('technical-evidence').onclick=()=>openInspector('technical');$('scope').onclick=()=>openInspector('scope');$('preparation').onclick=()=>{$('provenance').open=false;openPreparation();};
  $('related').onclick=()=>{const row=allRows().find(r=>r.id===relatedRow(selectedEvent()));if(row)choose(row.id,row.events.at(-1)?.operation||row.ops[0],true);};
  document.querySelectorAll('[data-tab]').forEach(b=>{b.onclick=()=>openInspector(b.dataset.tab);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;const tabs=[...document.querySelectorAll('[data-tab]')],index=tabs.indexOf(b),next=tabs[(index+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];next.focus();next.click();e.preventDefault();};});
  $('close-inspector').onclick=closeInspector;
  $('toggle-sidebar').onclick=()=>{sidebarHidden=!sidebarHidden;renderSidebar();$('toggle-sidebar').setAttribute('aria-expanded',String(!sidebarHidden));text($('toggle-sidebar'),sidebarHidden?'Mostrar lista de intentos':'Ocultar lista de intentos');};
  $('mobile-attempt').onchange=()=>{const row=allRows().find(r=>r.id===$('mobile-attempt').value);if(row){choose(row.id,row.ops.at(-1));openInspector(tab);}};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('inspector').hidden)closeInspector();});
  document.querySelectorAll('[data-explore]').forEach(b=>b.onclick=()=>openExplore(b.dataset.explore));$('close-exploration').onclick=()=>navigate('#demo');
  document.querySelectorAll('[data-journey-link]').forEach(a=>a.onclick=e=>{e.preventDefault();navigate('#journey/map');});
  document.querySelectorAll('[data-destination]').forEach(a=>a.onclick=e=>{if(e.ctrlKey||e.metaKey||e.shiftKey)return;e.preventDefault();navigate(a.getAttribute('href'));});
  window.addEventListener('popstate',()=>{rememberRoute();applyRoute();});
  window.addEventListener('hashchange',()=>{if(currentRoute!==location.hash){rememberRoute();applyRoute();}});
  history.scrollRestoration='manual';window.addEventListener('resize',fitConsole);
  $('follow').onchange=()=>{if($('follow').checked){artifact=null;cancelArtifact();inspectorKey='';}};
  if(window.SAVED_SESSION){data=window.SAVED_SESSION;data.recorded=true;stale=false;initialSelection();renderIdentity();renderControls();renderRows();renderSelection();applyRoute();}else poll();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
