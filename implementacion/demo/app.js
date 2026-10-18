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
 let acceptedId=null,selectedCommand=null,commandArtifact=null,commandContentKey=null,commandContent=null,commandLoading=null,explorationRevision='';
 let catalogueFilters={query:'',kind:'all',family:'all',availability:'all'},scenarioId='F11',workflowId=null,workflowRun=null,workflowTab='result',attestationGroup=null;
 let liveFollow=true,liveAutoScroll=false,liveKey=null,liveOperation=null,liveBaseline=0,liveFinal=null,liveRequestTitle=null;
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
  text($('timing'),(s.caseInvocations?.length?'Tiempo de la presentación original (intentos nuevos separados): ':'Tiempo registrado de ejecución: ')+seconds(s.liveDurationSeconds)+' · preparación: '+seconds(s.preparationDurationSeconds));
  text($('environment'),s.active?(data.activeProcessObserved===false?'Interrupción sin recibo final':data.activeProcessObserved===true?'Operación en curso':'Proceso sin confirmar'):s.cleaned?'Recursos retirados':s.caseInvocations?.length&&['ERROR','ABORTED'].includes(s.operational)?'Último intento no concluido; comprobar preparación':s.demoResult==='CONFIRMED'?'Presentación terminada':s.prepared?'Preparación registrada':s.operational==='PENDING'?'Entorno pendiente':'Preparación incompleta');
  $('html-export').hidden=data.recorded||!s.exports?.length;$('package-export').hidden=!data.recorded&&!s.exports?.length;
  if(data.recorded){$('package-export').hidden=!data.packageName;$('package-export').href=data.packageName||'#';$('mode').disabled=true;$('follow').disabled=true;}
 }
 function renderOperatorStatus(writable){
  const s=data.session;let status=stale?'Sin conexión o estado desactualizado':s.cleaned?'Recursos retirados':s.active?(data.activeProcessObserved===true?(s.prepared?'Ejecutando':'Preparando'):'Proceso sin confirmar'):s.caseInvocations?.length&&['ERROR','ABORTED'].includes(s.operational)?'Último intento no concluido; comprobar preparación':s.demoResult==='CONFIRMED'?'Presentación terminada':s.prepared?(control?.capabilities?.present?.enabled?'Preparado y disponible':'Preparación registrada; consultar comprobación'):s.operational==='PENDING'?'Pendiente de preparación':'Preparación incompleta';
  text($('control-state'),s.session+' / '+s.profile+' · '+status+' · entorno: '+(s.cleaned?'retirado':s.prepared?'preparación registrada':'sin preparación válida'));text($('next-operation'),control?.nextOperation?'Siguiente: '+M.meta(control.nextOperation,data).title:'Sin siguiente paso confirmado');$('readonly-help').hidden=writable;$('viewer-mode').title=writable?'Acciones habilitadas al iniciar este servidor':'Solo lectura: reinicia el visor con --enable-actions para habilitar controles; no se elevan permisos desde el navegador';$('open-live').hidden=data.recorded; $('open-live').textContent=s.active?'Consola en directo':'Consola de operación';
 }
 function renderLegacyLive(){
  if(!data||$('live-console').hidden)return;const active=data.recorded?null:data.session.active;
  if(active){const key=JSON.stringify([active.operation,active.instance,active.startUTC]);if(key!==liveKey){liveKey=key;liveRequestTitle=null;liveOperation=active.operation;liveBaseline=Math.max(0,...data.events.map(e=>e.sequence||0));liveFinal=null;text($('live-output'),'Sin salida para esta operación');}if(data.provisionalLog!=null)text($('live-output'),data.provisionalLog);}
  else if(liveOperation)liveFinal=data.events.find(e=>e.operation===liveOperation&&e.sequence>liveBaseline)||liveFinal;
  text($('live-title'),data.session.session+' · '+(data.session.active?.attempt||data.session.activeCaseSession||'operación vinculada')+' · '+(liveRequestTitle||(liveOperation?M.meta(liveOperation,data).title:'Sin operación seleccionada')));
  text($('live-state'),data.recorded?'Ejecución registrada · directo no disponible':stale?'Sin conexión · salida conservada, estado desactualizado':active?(data.activeProcessObserved===true?'Proceso observado · salida provisional, no es un resultado final':data.activeProcessObserved===false?'Proceso desaparecido · falta resultado definitivo':'Proceso sin confirmar · no se presume actividad'):liveFinal?'Operación finalizada · '+M.outcome(liveFinal).label:data.session.lastCommand?.error?'Solicitud no completada: '+data.session.lastCommand.error:'Sin proceso activo observado ni recibo final asociado');
  text($('live-progress'),'Operaciones completadas: '+data.session.completed.length+' · sesión vinculada '+data.session.session);if(active)text($('live-timestamp'),'Última salida: '+(data.provisionalLogModifiedUTC||'sin marca temporal')+' · extracto saneado, hasta 8 KiB; puede estar truncado');
  $('live-final').hidden=!liveFinal;text($('live-follow'),liveFollow?'Pausar seguimiento':'Seguir salida');if(liveFollow&&!stale)requestAnimationFrame(()=>{liveAutoScroll=true;$('live-output').scrollTop=$('live-output').scrollHeight;requestAnimationFrame(()=>requestAnimationFrame(()=>{liveAutoScroll=false;}));});
 }
 const commandLabels={check:'Comprobación del entorno',prepare:'Preparación del entorno',present:'Secuencia pendiente',step:'Siguiente paso',export:'Exportación de evidencias',cleanup:'Retirada de recursos propios','case-f11-early':'F11 · control temprano','case-f11-admission':'F11 · admisión independiente','prepare-f13-case':'Preparación de fixture F13','case-f13':'F13 · caso independiente','recover-f13-case':'Recuperación de F13','cleanup-f13-case':'Retirada de fixture F13'};
 const commandStates={ACCEPTED:'Esperando inicio',RUNNING:'En ejecución',STOPPING:'Detención en curso',CLOSING:'Cerrando evidencia',COMPLETED:'Completada',FAILED:'Fallida',CANCELLED:'Detenida',TIMED_OUT:'Plazo agotado',UNKNOWN:'Resultado no confirmado'};
 const terminalCommand=c=>c&&['COMPLETED','FAILED','CANCELLED','TIMED_OUT','UNKNOWN'].includes(c.status);
 function commandList(){return data?.commands||[];}
 function commandRoute(id,a=null){return '#demo/live'+(id?'?'+new URLSearchParams({command:id,...(a?{artifact:a}:{})}):'');}
 function commandDuration(c){return terminalCommand(c)?seconds(c.durationSeconds):data.recorded?'sin medición final':c.startedUTC?seconds(Math.max(0,(Date.now()-Date.parse(c.startedUTC))/1000))+' transcurridos':'inicio pendiente';}
 function renderCommandCard(){
  const c=control?.command||commandList().at(-1),card=$('command-card');card.hidden=!c;if(!c)return;
  text($('command-title'),(data.recorded?'Acción registrada · ':terminalCommand(c)?'Última acción · ':'Acción actual · ')+(commandLabels[c.action]||c.action)+' · '+c.commandId.slice(0,8));
  text($('command-state'),(stale&&!data.recorded?'Estado desactualizado · ':'')+(data.recorded&&!terminalCommand(c)?'Estado capturado: ':'')+(commandStates[c.status]||'Estado desconocido')+' · '+commandDuration(c));
  card.dataset.state=c.status;$('command-console').onclick=()=>navigate(commandRoute(c.commandId));
  text($('command-result'),terminalCommand(c)?'Resultado de esta acción · exit '+(c.exitCode??'desconocido')+(c.diagnostic?' · '+c.diagnostic:''):'Sesión operativa: '+c.session+' · la presentación original conserva su resultado.');
 }
 async function loadCommandArtifact(c,a){
  const key=c.commandId+':'+a.id+':'+a.sha256;if(commandContentKey===key||commandLoading===key)return;
  commandLoading=key;commandContent=null;
  try{let body,truncated;if(data.recorded){const item=data.offlineArtifacts?.[a.id];if(!item)throw Error('Archivo no incluido en el HTML; consultar el paquete conservado');body=item.text;truncated=item.truncated;}
   else{const r=await fetch('/artifact/'+a.id,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Salida ausente o no verificable (HTTP '+r.status+')');body=await r.text();truncated=r.headers.get('X-Evidence-View')==='excerpt';}
   if(selectedCommand!==c.commandId||commandLoading!==key)return;commandContent={body,truncated};commandContentKey=key;
  }catch(error){if(selectedCommand!==c.commandId||commandLoading!==key)return;commandContent={body:error.message,truncated:false};commandContentKey=key;}
  finally{if(commandLoading===key){commandLoading=null;renderLive();}}
 }
 function renderLive(){
  if(!data||$('live-console').hidden)return;
  if(!selectedCommand)selectedCommand=control?.command?.commandId||commandList().at(-1)?.commandId||null;
  const c=commandList().find(x=>x.commandId===selectedCommand);
  const choices=$('command-choice'),signature=commandList().map(x=>x.commandId+':'+x.status).join('|');
  if(choices.dataset.signature!==signature){choices.replaceChildren(...commandList().map(x=>{const o=el('option',(commandLabels[x.action]||x.action)+' · '+x.commandId.slice(0,8)+' · '+(commandStates[x.status]||x.status));o.value=x.commandId;return o;}));choices.dataset.signature=signature;}choices.value=selectedCommand||'';$('command-selector').hidden=!commandList().length;
  if(!c){if(!selectedCommand){renderLegacyLive();return;}text($('live-title'),'Acción '+selectedCommand.slice(0,8));text($('live-state'),selectedCommand===acceptedId?'Esperando el registro de esta acción; no se muestra otra solicitud.':'Acción no incluida en el inventario de las últimas 100 solicitudes; consulta sus archivos conservados.');text($('live-output'),'Sin salida asociada disponible');$('live-final').hidden=true;return;}
  const terminal=terminalCommand(c);const linked=(c.operations||[]).map(o=>data.events.find(e=>e.commandId===c.commandId&&e.sequence===o.sequence)).filter(Boolean);const stops=(data.stopRequests||[]).filter(r=>r.commandId===c.commandId),commandArtifacts=[...(c.artifacts||[]),...stops.flatMap(r=>r.artifacts||[])];const a=commandArtifact?commandArtifacts.find(a=>a.id===commandArtifact):M.primaryArtifact(linked.at(-1),data)||c.artifacts?.find(a=>a.path.endsWith('/output.log'));
  text($('live-title'),commandLabels[c.action]||c.action);
  text($('live-state'),(data.recorded?'Ejecución registrada · ':stale?'Sin conexión; estado desactualizado · ':'')+(data.recorded&&!terminalCommand(c)?'Estado capturado: ':'')+(commandStates[c.status]||'Estado desconocido')+' · '+commandDuration(c)+(terminal?' · exit '+(c.exitCode??'desconocido'):data.recorded?' · Proceso no reobservado; captura provisional':c.processObserved?' · Proceso observado · salida provisional':' · Proceso no observado; no se presume actividad'));
  text($('live-progress'),c.session+' · acción '+c.commandId.slice(0,8)+(c.activeOperation?' · '+c.activeOperation.operation+' / '+c.activeOperation.session:'')+(linked.some(e=>e.fixtureSession)?' · fixture '+linked.find(e=>e.fixtureSession).fixtureSession:'')+(c.action==='check'&&c.status==='COMPLETED'?' · Comprobación completada; consulta el informe de disponibilidad.':''));
  const previous=$('live-output').scrollTop;
  if(terminal&&a){loadCommandArtifact(c,a);text($('live-output'),commandContentKey===c.commandId+':'+a.id+':'+a.sha256?commandContent?.body||'(Archivo vacío)':c.output||'Leyendo salida final registrada…');}
  else text($('live-output'),c.output|| (terminal?'Sin stdout registrado. Consulta el recibo.':'Sin salida todavía para esta acción.'));
  if(!liveFollow)$('live-output').scrollTop=previous;
  text($('live-timestamp'),(terminal?(a?.sanitized?'Salida cerrada · copia saneada':'Archivo cerrado · contenido registrado'):'Salida provisional saneada')+' · última salida '+(c.outputModifiedUTC||'sin marca temporal')+(a?' · '+a.path.split('/').at(-1):'')+((commandContent?.truncated||!terminal&&c.outputExcerpt)?' · EXTRACTO ACOTADO':'') );
  const links=$('command-links'),linkKey=JSON.stringify([c.commandId,c.status,commandArtifacts.map(a=>a.id),linked.map(e=>e.sequence)]);
  if(links.dataset.signature!==linkKey){links.replaceChildren();for(const item of commandArtifacts)links.append(button(item.producer==='web-stop'?'Acuse de detención':item.path.endsWith('/result.json')?'Recibo de la acción':'Salida final de la acción',()=>navigate(commandRoute(c.commandId,item.id))));const operations=$('command-operations');operations.replaceChildren();for(const e of linked)operations.append(button('Operación: '+(e.operationInstance||e.operation),()=>{detailOrigin=commandRoute(c.commandId);openEvent(e);}));links.dataset.signature=linkKey;}
  const full=$('command-download');full.hidden=!a||data.recorded;if(a){full.href='/download/artifact/'+a.id;text($('command-metadata'),a.path+' · SHA-256 '+a.sha256+' · '+a.size+' bytes · inicio '+(c.startedUTC||'no registrado')+' · cierre '+(c.endUTC||'pendiente')+' · comando '+(c.command?.join(' ')||'no registrado'));}else text($('command-metadata'),'Aceptada '+c.acceptedUTC+' · sesión '+c.session+' · commandId '+c.commandId);
  $('live-final').hidden=true;text($('live-follow'),liveFollow?'Pausar seguimiento':'Seguir salida');$('live-follow').disabled=terminal||data.recorded;$('live-bottom').disabled=false;
  if(liveFollow&&!stale&&!terminal&&!data.recorded)requestAnimationFrame(()=>{liveAutoScroll=true;$('live-output').scrollTop=$('live-output').scrollHeight;requestAnimationFrame(()=>{liveAutoScroll=false;});});fitConsole();
 }
 function primaryAction(){const s=data?.session;if(!s)return null;if(s.demoResult==='CONFIRMED'||['ERROR','ABORTED'].includes(s.operational)||s.cleaned)return 'result';if(!s.prepared)return 'prepare';return $('mode').value==='step'?'step':'present';}
 function renderRepeatControl(){
  const action=$('repeat-case').value,gate=control?.capabilities?.[action];
  const operation=action==='case-f11-early'?'f11-early':data.session.profile==='f11-comparison'?'comparison-admission':'f11-admission';
  const observed=data.events.some(e=>e.operation===operation&&e.phase==='live'&&e.operational!=='NOT_REACHED');
  const reason=data.recorded?'Resultados registrados: no se pueden ejecutar acciones.':!data.actionsEnabled?'Solo lectura: inicia el visor con --enable-actions antes de la demo.':stale?'Estado desactualizado; esperando conexión con el servidor.':actionPending||acceptedPending?'Solicitud en curso; esperando al servidor.':control?.busy?'Otra operación sigue activa; consulta su consola.':!gate?'Capacidad no confirmada por el servidor.':!gate.enabled?gate.reason||'Caso no disponible.':!observed?'Ejecuta primero este caso en la secuencia inicial.':null;
  $('repeat-case-run').disabled=!!reason;$('repeat-case-run').title=reason||'Crear un intento independiente y abrir su consola';
  text($('repeat-case-status'),reason||'Crea un intento nuevo con su propia evidencia. F13 requiere preparar un caso independiente.');
 }
 function renderControls(){
  if(!data)return;const writable=!data.recorded&&data.actionsEnabled;renderOperatorStatus(writable);renderCommandCard();document.querySelector('.operator').hidden=false;$('mode').disabled=!writable;$('follow-label').hidden=!writable;$('stop').hidden=!writable||(!control?.busy&&!stopRequested);text($('viewer-mode'),writable?'Controles de la sesión vinculada':'Solo lectura · navegación y evidencias');$('action-status').hidden=false;const primary=primaryAction(),labels={prepare:'Preparar entorno',present:'Iniciar comparación',step:'Ejecutar siguiente paso',result:'Ver resultado'};
  text($('primary'),labels[primary]);$('primary').dataset.action=primary;
  const disabledReason=stale?'Estado desactualizado; esperando al servidor':data.recorded?'Ejecución registrada · sin acciones':!control?'Solo lectura: inicia el visor con --enable-actions antes de la demo':actionPending||acceptedPending?'Solicitud en curso; esperando estado del servidor':null;
  for(const b of [$('primary'),$('stop'),...document.querySelectorAll('[data-action]')]){
   const action=b.id==='stop'?'stop':b.dataset.action;if(action==='result'){b.disabled=false;b.title='Abrir resultado registrado';continue;}
   const gate=control?.capabilities?.[action];const reason=disabledReason||(!gate?'Capacidad no confirmada':gate.enabled?'':gate.reason);
   b.disabled=!!reason;b.title=reason||'';
   // A submitted start must not suppress an authoritative active-operation stop.
   if(action==='stop'&&!stale&&control?.capabilities?.stop?.enabled&&!actionPending&&!stopRequested)b.disabled=false;
  }
  if(stopRequested){$('stop').disabled=true;text($('stop'),'Detención solicitada');}else text($('stop'),'Detener');
  if(!actionPending&&!acceptedPending&&!stopRequested)text($('action-status'),disabledReason||(control?.busy&&control.command?'Esperando a '+(commandLabels[control.command.action]||control.command.action)+' · '+commandDuration(control.command):null)||control?.capabilities?.[primary]?.reason||'Acciones vinculadas exclusivamente a '+data.session.session+'. La selección no ejecuta operaciones.');
  renderRepeatControl();
 }
 async function requestAction(name){
  if(name==='result'){openInspector('result');return;}
  if(actionPending||acceptedPending&&name!=='stop'||stale||!control?.capabilities?.[name]?.enabled)return;
  actionPending=name;renderControls();text($('action-status'),'Solicitando '+(commandLabels[name]||'detención')+'…');
  try{
   if(name==='cleanup'||name==='cleanup-f13-case'){
    const r=await fetch(name==='cleanup-f13-case'?'/api/fixture-cleanup-plan':'/api/cleanup-plan',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('No se pudo leer el alcance de limpieza');const p=await r.json();
    if(!window.confirm('Retirar recursos de '+data.session.session+':\n'+p.plan.map(x=>[x.name,x.resource,x.action].filter(Boolean).join(' · ')).join('\n')+'\nConservar: '+p.preserved.join(', ')))return;
   }
   const r=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':control.csrf},body:JSON.stringify({action:name}),signal:AbortSignal.timeout(15000)});
   const value=await r.json();if(!r.ok)throw Error(value.error||'Acción rechazada');
   if(name==='stop'){stopRequested=['REQUESTED','STOPPING','CLOSING'].includes(value.stopState);text($('action-status'),({REQUESTED:'Detención solicitada; falta confirmar el resultado.',STOPPING:'Detención en curso.',CLOSING:'Cerrando evidencia; esperando resultado.',ALREADY_FINISHED:'La acción ya había finalizado.',UNKNOWN:'Resultado de detención no confirmado.'})[value.stopState]||'Estado de detención desconocido');}
   else{acceptedId=value.commandId;acceptedPending=true;selectedCommand=value.commandId;commandArtifact=null;commandContent=null;commandContentKey=null;liveFollow=true;navigate(commandRoute(value.commandId));text($('action-status'),'Solicitud aceptada · '+value.commandId.slice(0,8)+'; todavía no acredita finalización.');}
  }catch(error){text($('action-status'),error.message+' · Estado pendiente de actualización.');stale=true;control=null;}
  finally{actionPending=null;renderControls();}
 }
 function renderSelection(){
  if(!data)return;if(selection.row)lastAttemptSelection={...selection};const showingPreparation=preparationView&&tab==='result'&&!artifact;document.querySelector('.result-actions').hidden=showingPreparation;if(showingPreparation){const seal=data.events.filter(e=>e.operation==='seal'&&!e.fixtureSession).at(-1);text($('result-title'),'Preparación previa');text($('result-outcome'),M.confirmed(seal)?'Preparación registrada':'Preparación sin confirmar');$('result-outcome').className=M.confirmed(seal)?'reused':'unknown';text($('result-expectation'),'Tiempo registrado: '+seconds(data.session.preparationDurationSeconds)+' · fuera del intervalo de presentación');return;}const e=selectedEvent(),m=selectedMeta(),active=data.session.active?.operation===selection.op&&(!data.session.active?.attempt||data.session.active.attempt===selection.row);
  const state=M.outcome(e,active,data.activeProcessObserved);
  text($('result-identity'),m.arm+' · '+(selection.row||e?.attempt||'Preparación')+' · '+(data.recorded?'registro conservado':'sesión vinculada'));
  text($('result-title'),selectedRow()?M.rowTitle(selectedRow(),data,selection.op):(m.arm==='G'?'G · ':'')+m.title);text($('result-outcome'),state.label);$('result-outcome').className=state.tone;$('selected-result').dataset.tone=state.tone;
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
  let cases=$('case-controls');if(!cases){cases=details('Preparación y recursos del nuevo caso F13','case-controls');cases.id='case-controls';const body=el('div');cases.append(el('p','F13 requiere preparación adicional de una fixture independiente y puede crear otro laboratorio. Prepárala antes de la presentación; no repite instantáneamente el digest autorizado.'),body);document.querySelector('.operator').after(cases);for(const [action,label] of [['prepare-f13-case','Preparar nuevo caso F13'],['case-f13','Ejecutar fixture F13'],['recover-f13-case','Recuperar fixture F13'],['cleanup-f13-case','Retirar fixture F13']]){const wrap=el('div'),b=button(label,()=>requestAction(action));b.dataset.action=action;wrap.append(b,el('small'));body.append(wrap);}}
  cases.hidden=data.session.profile==='f11-comparison';
  for(const wrap of cases.lastChild.children){const b=wrap.firstChild,a=b.dataset.action,gate=control?.capabilities?.[a];b.disabled=stale||!data.actionsEnabled||data.recorded||actionPending||acceptedPending||!gate?.enabled;b.title=b.disabled?(gate?.reason||'Solo lectura: inicia el visor con --enable-actions'):'Caso vinculado; no cambia el historial';text(wrap.lastChild,(b.disabled?b.title:'Sesión operativa: '+data.session.session)+(data.session.f13Fixture?' · Fixture vinculada: '+data.session.f13Fixture.attempt+' / '+data.session.f13Fixture.session:''));}

  for(const row of rows){wanted.add(row.id);let node=rowNodes.get(row.id);
   if(!node){node=el('article',undefined,'attempt-row');node.dataset.attempt=row.id;node.select=button('',()=>choose(row.id,M.latest(allRows().find(r=>r.id===row.id))?.operation||row.ops[0],true),'attempt-select');node.track=el('div',undefined,'track');node.outcome=el('div',undefined,'row-outcome');node.assessment=el('small');node.links=el('div',undefined,'row-links');node.parts=new Map();node.append(node.select,node.track,node.outcome,node.assessment,node.links);rowNodes.set(row.id,node);$('attempts').append(node);}
   node.classList.toggle('selected',selection.row===row.id);node.select.dataset.focusKey='attempt-'+row.id;node.select.setAttribute('aria-pressed',String(selection.row===row.id));
   const last=M.latest(row),op=row.ops.at(-1),m=M.meta(op,data);text(node.select,M.rowTitle(row,data));
   const state=M.rowOutcome(row,data);text(node.outcome,state.label);node.outcome.className='row-outcome '+state.tone;
   text(node.assessment,M.expectation(last));
   const linkKey=JSON.stringify([last?.sequence,last?.artifacts?.length]);if(node.links.dataset.key!==linkKey){node.links.dataset.key=linkKey;node.links.replaceChildren();const log=M.primaryArtifact(last,data),attribution=M.primaryArtifact(last,data,'attribution');if(log)node.links.append(fileButton(log,last,state.tone==='blocked'?'Ver log del bloqueo':'Ver evidencia'));if(attribution)node.links.append(fileButton(attribution,last,'Ver atribución'));node.links.append(button('Evidencia técnica',()=>{choose(row.id,last?.operation||row.ops[0]);openInspector('technical');}));}
   const caseAction=op==='f11-early'?'case-f11-early':['f11-admission','comparison-admission'].includes(op)?'case-f11-admission':op==='f13'?'case-f13':op==='accept'?'recover-f13-case':null;
   if(caseAction){let run=node.links.querySelector('[data-case-action]');if(!run){run=button('',()=>requestAction(caseAction));run.dataset.caseAction=caseAction;node.links.append(run);}text(run,caseAction==='recover-f13-case'?'Recuperar '+(data.session.f13Fixture?.attempt||'fixture F13'):caseAction==='case-f13'?'Ejecutar '+(data.session.f13Fixture?.attempt||'fixture F13'):last?'Nuevo intento':'Ejecutar caso');const gate=control?.capabilities?.[caseAction];run.disabled=stale||!data.actionsEnabled||data.recorded||actionPending||acceptedPending||!gate?.enabled;run.title=gate?.reason||(!data.actionsEnabled?'Solo lectura: iniciar con --enable-actions':'Nuevo intento sobre la sesión operativa '+data.session.session);}
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
  routeMemory.set(currentRoute,{scroll:scrollY,liveScroll:$('live-output').scrollTop,liveFollow,consoleScroll:document.querySelector('.console-text')?.scrollTop||0,nowrap:document.querySelector('.console-text')?.classList.contains('nowrap')||false,
   opens:[...scope.querySelectorAll('details[open][data-key]')].map(n=>n.dataset.key),
   focus:document.activeElement?.dataset.focusKey,focusId:document.activeElement?.id});
 }
 function fitConsole(){const live=$('live-output');if(live&&!$('live-console').hidden&&innerWidth>800&&innerHeight>600)live.style.height=Math.max(400,innerHeight-live.getBoundingClientRect().top-16)+'px';const pre=document.querySelector('.console-text');if(pre&&innerWidth>800&&innerHeight>600)pre.style.setProperty('--console-height',Math.max(400,innerHeight-pre.getBoundingClientRect().top-20)+'px');}
 function restoreRoute(){
  const saved=routeMemory.get(currentRoute);if(!saved){scrollTo(0,0);return;}
  restoreDetails(document,new Set(saved.opens));if(currentRoute.startsWith('#demo/live')){liveFollow=saved.liveFollow??false;$('live-output').scrollTop=saved.liveScroll||0;}
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
  if(validDetail){detailOrigin=history.state?.returnTo||detailOrigin; text($('close-inspector'),detailOrigin.startsWith('#journey')?'← Volver al recorrido técnico':detailOrigin==='#attestations'?'← Volver a atestaciones':detailOrigin.startsWith('#demo/live')?'← Volver a la acción':'← Volver a demostración');}
  exploration=parts[0]==='journey'||path==='technical'?'journey':['scenarios','workflows','sessions','attestations'].includes(path)?path:null;
  if(exploration==='journey'){journeyTab=parts[1]==='sequence'?'sequence':'map';const filter=params.get('filter')||'all';journeyFilter=M.journeyFilters(data).some(([id])=>id===filter)?filter:'all';}

  const live=path==='demo/live';$('live-console').hidden=!live;if(live){const id=params.get('command'),file=params.get('artifact');if(/^[a-f0-9]{32}$/.test(id||''))selectedCommand=id;commandArtifact=/^[a-f0-9]{24}$/.test(file||'')?file:null;renderLive();}
  $('presentation').hidden=validDetail||!!exploration||live;$('inspector').hidden=!validDetail;$('exploration').hidden=!exploration;
  document.body.dataset.view=live?'live':validDetail?'detail':exploration||'demo';document.body.dataset.tab=validDetail?tab:'';
  for(const a of document.querySelectorAll('[data-destination]')){if(a.dataset.destination===(exploration==='technical'?'demo':exploration||'demo'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  $('provenance').open=false;renderSelection();renderRows();renderSidebar();
  if(validDetail){inspectorKey='';renderInspector();}else if(exploration){text($('exploration-title'),({scenarios:'Escenarios',workflows:'Workflows GitHub',sessions:'Sesiones locales',journey:'Recorrido técnico',attestations:'Atestaciones locales'})[exploration]);text($('exploration-context'),exploration==='journey'?'Mapa: estructura y evidencia disponible. Secuencia: orden registrado de operaciones.':'Configuración y referencias; explorar no ejecuta operaciones ni cambia la sesión vinculada.');renderExplore();}
  restoreRoute();requestAnimationFrame(fitConsole);
 }
 function renderSidebar(){
  const sidebar=$('attempt-sidebar'),select=$('mobile-attempt');const key=JSON.stringify(allRows().map(r=>[r.id,r.ops,r.executionNumber]));
  if(sidebar.dataset.key!==key){sidebar.dataset.key=key;sidebar.replaceChildren();select.replaceChildren();for(const row of allRows()){const title=M.rowTitle(row,data);const b=button(title,()=>{choose(row.id,row.ops.at(-1));openInspector(tab);});b.dataset.row=row.id;sidebar.append(b);const o=el('option',title);o.value=row.id;select.append(o);}}
  for(const b of sidebar.children)b.setAttribute('aria-pressed',String(b.dataset.row===selection.row));select.value=selection.row||'';
  $('inspector').classList.toggle('sidebar-hidden',sidebarHidden);
 }
 function openInspector(next='result'){
  if($('inspector').hidden){opener=document.activeElement;detailOrigin=currentRoute.startsWith('#journey')||currentRoute.startsWith('#demo/live')||currentRoute==='#attestations'?currentRoute:'#demo';}
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
 function renderExplore(){const c=$('exploration-content');c.replaceChildren();if(exploration==='scenarios')renderCatalogue(c);if(exploration==='workflows')renderWorkflows(c);if(exploration==='sessions')renderSessions(c);if(exploration==='journey')renderJourney(c);if(exploration==='attestations')renderAttestations(c);}

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
 function externalLink(label,url){const a=el('a',label);if(/^https:\/\/github\.com\/tfm-goldenpath\/golden-path-lab\//.test(url||'')){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}return a;}
 function elapsed(start,end){const a=Date.parse(start),b=Date.parse(end);return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?(b-a)/1000:null;}
 function githubOutcome(value){const c=value.conclusion;if(value.status!=='completed')return {tone:value.status==='in_progress'?'running':'pending',label:value.status==='in_progress'?'En curso según captura':'Pendiente según GitHub'};return ({success:{tone:'accepted',label:'Éxito GitHub; no acredita controles internos'},failure:{tone:'error',label:'Fallo GitHub; atribución no capturada'},cancelled:{tone:'unknown',label:'Cancelado'},skipped:{tone:'idle',label:'Omitido por GitHub; causa no inferida'},timed_out:{tone:'error',label:'Tiempo agotado'}})[c]||{tone:'unknown',label:'Conclusión '+(c||'desconocida')};}
 function observationFile(c,observation,file){
  const d=details(file.name,'import-file-'+observation.id+'-'+file.sha256);d.append(el('p',file.source+' · '+(file.redacted?'Copia redactada':'Copia capturada')+' · '+(file.truncated?'Extracto acotado':'Contenido completo')+' · SHA-256 '+file.sha256,'metadata'));const pre=el('pre',file.text,'import-output');d.append(pre);
  if(!data.recorded)d.append(button('Leer archivo completo y comprobar integridad',async()=>{text(pre,'Comprobando archivo capturado…');try{const r=await fetch('/observation/'+observation.id+'/'+file.sha256,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Archivo ausente o integridad fallida: HTTP '+r.status);const body=await r.text();if(pre.isConnected)text(pre,body);}catch(e){if(pre.isConnected)text(pre,e.message);}}));else if(file.truncated)d.append(el('p','Original completo en el paquete exportado; este HTML incluye un extracto.'));
  c.append(d);
 }
 function configuration(c,w,observation){
  const captured=observation?.definition,yaml=observation?captured?.text:w?.yaml;
  c.append(el('h3','Configuración del workflow'),el('p',observation?'Definición capturada en '+observation.run.head_sha+'; no es main actual.':'Configuración capturada; ejecución remota no observada.'));
  if(!yaml){c.append(el('p','Definición no disponible para esta ejecución. No se sustituye por main.'));return;}
  c.append(el('p','Fuente: '+(observation?.run.head_sha||data.session.source?.commit)+' · SHA-256 '+(captured?.sha256||w.sha256),'metadata'));
  const permissions=yaml.match(/^permissions:\s*\n((?:[ \t]+[^\n]*\n)*)/m)?.[1]||'Consultar declaración YAML; no se infieren permisos efectivos';c.append(el('h4','Permisos del workflow'),el('pre',permissions));
  for(const job of captured?.jobs||w.jobs||[]){const d=details('Job declarado: '+job.id,'wf-config-'+job.id);d.append(el('p','Dependencias: '+(job.needs||'no declaradas')+' · runner: '+(job.runner||'no capturado')+' · timeout: '+(job.timeoutMinutes||'no capturado')),el('p','Pasos: '+job.steps.join(' → ')),el('p','Permisos de este job: '+(job.permissions.map(p=>p.join(': ')).join(', ')||'sin override capturado; consultar YAML')));c.append(d);}
  c.append(el('p','Acciones declaradas: '+[...yaml.matchAll(/uses:\s*(\S+)/g)].map(m=>m[1]).join(' · '),'metadata'));
  if(captured?.truncated)c.append(el('p','YAML mostrado como extracto acotado; el original completo está disponible en Evidencias.'));
  const d=details('YAML capturado · solo configuración','yaml-'+w.file);d.append(el('pre',yaml));c.append(d);if(captured)observationFile(c,observation,captured);
 }
 function pairClassification(c){return ({'valid-favorable':'Válida favorable','valid-unfavorable':'Válida desfavorable',indeterminate:'Indeterminada'})[c]||'Desconocida';}
 function renderPair(c,o){
  const rows=o.pairAnalysis?.rows||o.publishedAnalysis?.rows||[],r=rows.find(r=>String(r.runId)===String(o.run.id));
  if(!r){c.append(el('p',o.pair?'Pareja registrada; validación incompleta, consultar incidencias.':'Sin pareja ejecutada acreditada por los materiales capturados. Un run de publicación de plan no es una pareja.'));return;}
  const pub=o.publication,pair=o.pair;c.append(el('h3','Comparación legítima R/G'),el('p','Dataset: '+(pair?.dataset||pub?.dataset||'desconocido')+' · fuente: '+o.run.head_sha+' · plan: '+(pair?.planIdentity||pub?.planIdentity||'desconocido'),'metadata'));
  const table=el('table'),head=el('tr');for(const s of ['Pareja','Orden','Resultado R','Tiempo R','Resultado G','Tiempo G','G−R','Clasificación'])head.append(el('th',s));table.append(head);const line=el('tr');for(const value of [r.pair,r.order,pairClassification(r.classifications?.R),seconds(r.RSeconds),pairClassification(r.classifications?.G),seconds(r.GSeconds),seconds(r.absoluteSeconds),(r.included?'Incluida':'Excluida')+' · '+(r.exclusionReasons||[]).join(', ')])line.append(el('td',String(value)));table.append(line);const scroll=el('div',undefined,'table-scroll');scroll.append(table);c.append(scroll);
  c.append(el('p','Intervalo primario: desde antes de las pruebas del servicio hasta el retorno de CREATE del Deployment. Preparación, rollout, HTTP, empaquetado y limpieza quedan fuera. No equivale a duración del job, consumo ni facturación.'),el('p','Cambio relativo: '+(Number.isFinite(r.relativePercent)?r.relativePercent.toFixed(2)+' %':'desconocido')+' · '+(pub?.boundary||'Consultar validación de contratos y originales')));
  const context=details('Base, preparación compartida y observaciones por brazo','pair-context');context.append(el('pre',JSON.stringify({database:pair?.frozenDatabase||pub?.database||null,sharedPreparation:pair?.preparation||null,arms:pair?.arms||null},null,2)));c.append(context);c.append(el('p','Solo esta pareja. No se mezclan estadísticas de fuentes, planes, bases ni datasets. No es una batería de fallos F01–F14.'));
 }
 function renderWorkflows(c){
  const workflows=data.workflows||[],observations=data.githubObservations||[];if(!workflows.some(w=>w.file===workflowId))workflowId=workflows[0]?.file;const w=workflows.find(w=>w.file===workflowId);if(!w)return;
  const choices=el('label','Workflow '),select=el('select');select.id='workflow-choice';select.dataset.focusKey='workflow-choice';for(const item of workflows){const opt=el('option',item.file);opt.value=item.file;select.append(opt);}select.value=workflowId;select.onchange=()=>{workflowId=select.value;workflowRun=null;workflowTab='result';attestationGroup=null;preserveRegion(c,()=>{c.replaceChildren();renderWorkflows(c);});};choices.append(select);c.append(choices,el('h2',w.file),el('p',w.purpose));
  for(const invalid of observations.filter(o=>!o.run||o.status==='INVALID'))c.append(el('p','Captura '+(invalid.id||'desconocida')+' no disponible: '+(invalid.issues||[]).join('; '),'warning'));
  const runs=M.workflowRuns(observations,workflowId);if(!runs.some(r=>r.id===workflowRun))workflowRun=runs[0]?.id||null;const o=runs.find(r=>r.id===workflowRun);
  const runSelect=el('select');runSelect.id='workflow-run';runSelect.dataset.focusKey='workflow-run';runSelect.setAttribute('aria-label','Ejecución observada');for(const r of runs){const option=el('option',r.run.id+' · intento '+r.run.run_attempt+' · '+r.run.head_sha.slice(0,12)+' · captura '+r.capturedUTC);option.value=r.id;runSelect.append(option);}runSelect.value=workflowRun;runSelect.onchange=()=>{workflowRun=runSelect.value;attestationGroup=null;preserveRegion(c,()=>{c.replaceChildren();renderWorkflows(c);});};if(runs.length)c.append(runSelect,el('p','Orden: ejecución más reciente primero. Datos capturados al '+runs[0].capturedUTC+'. Actualiza las capturas desde CLI y recarga esta vista.','metadata'));else c.append(el('p','Ejecuciones observadas: ninguna importada. Configuración capturada; ejecución remota no observada.'));
  const tabs=el('div',undefined,'workflow-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Detalle del workflow');for(const [id,label] of [['result','Resultado'],['jobs','Jobs y pasos'],['evidence','Evidencias'],['attestations','Atestaciones · '+(o?.files?.filter(f=>f.name.endsWith('.bundle.json')).length||0)],['configuration','Configuración']]){const b=button(label,()=>{workflowTab=id;preserveRegion(c,()=>{c.replaceChildren();renderWorkflows(c);});});b.id='workflow-tab-'+id;b.setAttribute('aria-controls','workflow-panel');b.setAttribute('role','tab');b.setAttribute('aria-selected',String(workflowTab===id));b.tabIndex=workflowTab===id?0:-1;b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const items=[...tabs.children],i=items.indexOf(b),next=e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowRight'?1:-1)+items.length)%items.length;items[next].click();c.querySelector('[role=tab][aria-selected=true]')?.focus();}};b.dataset.workflowTab=id;b.dataset.focusKey='workflow-tab-'+id;b.setAttribute('aria-pressed',String(workflowTab===id));tabs.append(b);}c.append(tabs);
  const panel=el('section');panel.id='workflow-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','workflow-tab-'+workflowTab);c.append(panel);
  if(workflowTab==='configuration'){configuration(panel,w,o);return;}
  if(workflowTab==='attestations'){workflowAttestations(panel,o,c);return;}
  if(!o){panel.append(el('p','Importa una ejecución desde la CLI para consultar sus resultados. La selección no ejecuta workflows.'));return;}
  if(workflowTab==='result'){panel.append(el('p','Una ejecución alojada en GitHub no demuestra por sí sola confianza OIDC B.'),badge(githubOutcome(o.run)),el('p','Captura '+o.status+' · '+o.capturedUTC+' · '+o.origin),el('p','Rama: '+o.run.head_branch+' · commit '+o.run.head_sha+' · intento '+o.run.run_attempt,'metadata'),externalLink('Abrir ejecución en GitHub',o.run.html_url));panel.append(el('p','Duración observada de metadatos: '+seconds(o.run.status==='completed'?elapsed(o.run.run_started_at,o.run.updated_at):null)+' (run_started_at → updated_at; no es intervalo primario ni facturación).'));if(w.file==='paired-rg.yml')renderPair(panel,o);for(const issue of o.issues)panel.append(el('p',issue,'warning'));panel.append(el('p','Éxito GitHub no acredita por sí solo una pareja válida, controles negativos ni verificación criptográfica.'));}
  if(workflowTab==='jobs'){for(const job of o.jobs||[]){const d=details(job.name+' · '+githubOutcome(job).label+' · '+seconds(elapsed(job.started_at,job.completed_at)),'observed-job-'+job.id);d.append(badge(githubOutcome(job)),externalLink('Abrir job y log en GitHub',job.html_url));for(const step of job.steps||[])d.append(el('p',step.number+'. '+step.name+' · '+githubOutcome(step).label+' · '+seconds(elapsed(step.started_at,step.completed_at))));panel.append(d);}panel.append(el('p','No se atribuyen bloqueos esperados a nombres de pasos. Logs originales no descargados; enlace GitHub sujeto a disponibilidad.'));}
  if(workflowTab==='evidence'){panel.append(el('p',o.verification));for(const a of o.artifacts||[])panel.append(el('p',a.name+' · '+a.size_in_bytes+' bytes · '+((o.packageInspection?.artifactId===a.id||o.laneAInspections?.some(i=>i.artifactId===a.id))?'ZIP comprobado; documentos seleccionados importados':a.expired?'Expirado':'Disponible según captura; no descargado')));for(const f of o.files)observationFile(panel,o,f);}
 }
 function workflowAttestations(c,o,workspace=c){
  c.append(el('p','Documentos del run seleccionado. La integridad comprobada no equivale a verificar firmas ahora. Los recibos históricos describen la comprobación realizada entonces.'));
  if(o?.packageInspection)c.append(el('p','Paquete G asociado al run '+o.run.id+' · fuente '+o.run.head_sha+' · hashes internos comprobados al importar. R: estos controles del Golden Path no aplicados.','metadata'));
  let bundles=(o?.files||[]).filter(f=>f.name.endsWith('.bundle.json'));
  if(o?.laneAInspections){
   c.append(el('p','Vía A · confianza local de clave pública, aunque el runner esté alojado en GitHub. No acredita identidad OIDC B. Captura final del paquete; los snapshots negativos y las bases no se importan.'));
   const groupKey=f=>[f.historicalEvidence?.suite,f.historicalEvidence?.context,f.historicalEvidence?.subjectDigest].join(' · '),groups=[...new Set(bundles.map(groupKey))].sort((a,b)=>Number(!a.includes(' · principal · '))-Number(!b.includes(' · principal · '))||a.localeCompare(b));
   if(!groups.includes(attestationGroup))attestationGroup=groups[0];
   const label=el('label','Imagen / contexto '),select=el('select');select.id='attestation-group';select.setAttribute('aria-label','Imagen y contexto de atestación');
   for(const g of groups){const option=el('option',g);option.value=g;select.append(option);}select.value=attestationGroup;select.onchange=()=>{attestationGroup=select.value;preserveRegion(workspace,()=>{workspace.replaceChildren();renderWorkflows(workspace);});};label.append(select);c.append(label);bundles=bundles.filter(f=>groupKey(f)===attestationGroup);
  }
  if(!bundles.length)c.append(el('p','Sin bundles capturados para esta ejecución. Esto no demuestra que no existan: consultar el inventario de artefactos y su disponibilidad.'));
  for(const f of bundles){
   const proof=f.historicalEvidence,kind=proof?.kind||f.name.split('.')[0],section=el('section',undefined,'attestation-card');
   section.append(el('h3',({image:'Firma de imagen',sbom:'Atestación SBOM',provenance:'Procedencia',results:'Resultados'})[kind]||f.name));
   section.append(el('p',({image:'Acredita la firma independiente de la imagen identificada por digest.',sbom:'Vincula el inventario SBOM al subject declarado.',provenance:'Vincula la construcción con su fuente y workflow.',results:'Registra la autorización de entrega tras los controles requeridos.'})[kind]||'Documento capturado; contrato no identificado.'));
   const levels=el('ul');for(const text of ['Archivo: presente',proof?'Integridad: ZIP y paquete G comprobados al importar; archivo comprobable al abrir':'Integridad: comprobable al abrir el archivo',(proof?.cryptoRecorded??proof?.recordedGateVerified)?'Criptografía: verificación histórica registrada; no reverificada ahora':'Criptografía: no hay comprobación registrada suficiente',(proof?.authorizationRecorded??proof?.recordedGateVerified)?'Semántica/autorización: recibo agregado histórico VERIFIED; consultar originales':'Semántica/autorización: sin evidencia suficiente'])levels.append(el('li',text));section.append(levels);
   if(proof)section.append(el('p','Brazo '+proof.arm+' · vía '+proof.lane+' · fin registrado de autorización: '+(proof.verificationUTC||'desconocido'),'metadata'));
   section.append(el('p','Predicate: '+(f.statement?.predicateType||'no disponible'),'metadata'));
   const identity=details('Subject, identidad y procedencia','github-attestation-'+o.id+'-'+kind);identity.append(el('pre',JSON.stringify({subject:f.statement?.subject,source:o.run.head_sha,run:o.run.id,identityInProvenanceReceipt:proof?.provenanceIdentity||null,issuerInVerifier:proof?.issuer||null,association:f.association},null,2)));section.append(identity);
   observationFile(section,o,f);
   if(proof){for(const name of [proof.verifier,proof.statement,...(proof.lane==='A'?[proof.gate,proof.trustRoot]:[])]){const doc=o.files.find(x=>x.name===name);if(doc)observationFile(section,o,doc);}}
   c.append(section);
  }
  if(o?.packageInspection){const gate=o.files.find(f=>f.name==='CI-authorized.result.json');if(gate){c.append(el('h3','Recibo de autorización compartido'));observationFile(c,o,gate);}c.append(el('p','Inspección selectiva: no se auditan aquí los paquetes R, infraestructura ni la base de vulnerabilidades. No se vuelve a ejecutar el laboratorio.'));}
  c.append(button('Consultar atestaciones de la sesión local vinculada',()=>navigate('#attestations')));
 }
 function renderAttestations(c){
  c.append(el('p','Evidencia de la sesión local vinculada '+data.session.session+' · vía '+data.session.lane+'. No pertenece a la ejecución GitHub seleccionada. R: firma, atestaciones y verificaciones del Golden Path no aplicadas.'));
  const contracts=[['image','Firma de imagen','signature','image-signature','https://sigstore.dev/cosign/sign/v1'],['sbom','Atestación SBOM','sbom','sbom-attestation','https://cyclonedx.org/bom'],['provenance','Procedencia','provenance','provenance','https://slsa.dev/provenance/v1'],['results','Resultados','results','results-issuance','https://tfm-goldenpath.dev/attestations/verification-results/v1']];
  for(const [kind,label,verified,boundary,type] of contracts){const event=M.sessionEvents(data).find(e=>(e.operation===(kind==='results'?'authorize':'delivery-evidence'))&&e.artifacts?.some(a=>a.path.endsWith('/closed/'+kind+'.bundle.json')));const find=name=>event?.artifacts.find(a=>a.path==='operations/'+event.operation+'/closed/'+name);const bundle=find(kind+'.bundle.json'),statement=find('verified-'+verified+'.json'),report=find('verified-'+kind+'-bundle.txt'),receipt=event?.artifacts.find(a=>a.path.endsWith('/observations/'+boundary+'/end.json'));const section=el('section',undefined,'attestation-card');section.append(el('h2',label),el('p','Contrato esperado: '+type),el('p','Subject/digest de la operación: '+(event?.digest||'desconocido'),'metadata'),el('p','Fuente '+(event?.sourceCommit||'desconocida')+' · captura '+(event?.endUTC||'sin fecha'),'metadata'));
  section.append(el('p','1. Archivo: '+(bundle?'presente':'no capturado')),el('p','2. Integridad: hash registrado; comprobación de bytes al abrir el original'),el('p','3. Criptografía: '+(report&&receipt?'salida de verificador y recibo histórico disponibles; consultar resultado':'no establecida por los archivos disponibles')),el('p','4. Semántica/autorización: '+(M.confirmed(event)?'operación agregada confirmada; consultar declaración y condiciones, sin inferir controles individuales':'no confirmada')));
  section.append(el('p',data.session.lane==='A'?'Confianza local A: clave de desarrollo, sin emisor OIDC. No demuestra vía B.':'Identidad/emisor: consultar verificación registrada; no se infiere del JSON.'));
  const proof=details('Comprobar y explicar recibos históricos','attestation-proof-'+kind),summary=el('p','Aún no consultados; presencia no equivale a verificación.');proof.append(summary);let checked=false;proof.addEventListener('toggle',async()=>{if(!proof.open||checked)return;checked=true;try{const read=async a=>{if(!a)throw Error('Falta un original asociado a esta operación');if(data.recorded){const item=data.offlineArtifacts?.[a.id];if(!item||item.truncated)throw Error('Original completo no incluido en HTML');return JSON.parse(item.text);}const r=await fetch('/artifact/'+a.id,{signal:AbortSignal.timeout(10000)});if(!r.ok||r.headers.get('X-Evidence-View')==='excerpt')throw Error('Original ausente, alterado o truncado');return r.json();};const [end,statementValue,gate]=await Promise.all([read(receipt),read(statement),read(find((kind==='results'?'CI-authorized':'CI-delivery')+'.result.json'))]);if(!proof.isConnected)return;const subject=statementValue.subject?.some(x=>'sha256:'+x.digest?.sha256===event.digest),crypto=end.boundary===boundary&&end.exitCode===0&&end.operational==='COMPLETED'&&subject&&statementValue.predicateType===type,semantic=gate.status==='VERIFIED'&&gate.digest===event.digest&&gate.authenticatedPredicates?.includes(type);text(summary,'Integridad: originales consultados. Criptografía histórica: '+(crypto?'registrada como satisfactoria':'no establecida')+' · semántica/autorización histórica: '+(semantic?'gate registrado como VERIFIED':'no establecida')+' · fecha '+(end.endUTC||'desconocida')+'. No es una reverificación criptográfica actual.');proof.append(el('pre',JSON.stringify({predicateType:statementValue.predicateType,subject:statementValue.subject,source:statementValue.predicate?.source||event.sourceCommit,lane:data.session.lane,issuer:data.session.lane==='A'?'No OIDC; clave local':'Consultar bundle y recibo original'},null,2)));}catch(e){if(summary.isConnected)text(summary,'Sin evidencia suficiente: '+e.message);}});section.append(proof);
  const links=el('div',undefined,'inline-actions');if(bundle)links.append(fileButton(bundle,event,'JSON / bundle original'));if(statement)links.append(fileButton(statement,event,'Subject y predicate autenticados según registro'));if(report)links.append(fileButton(report,event,'Salida original del verificador'));if(receipt)links.append(fileButton(receipt,event,'Recibo y fecha de verificación'));section.append(links,el('p','La presencia del documento no demuestra autenticidad. La verificación histórica no se ha repetido. SBOM y resultados no sustituyen la firma de imagen.'));c.append(section);}
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
   if(acceptedPending&&(control?.command?.commandId===acceptedId||commandList().some(c=>c.commandId===acceptedId)))acceptedPending=false;
   if(stopRequested&&!control?.busy)stopRequested=false;
   if($('follow').checked&&data.session.active){const row=allRows().find(x=>x.ops.includes(data.session.active.operation));if(row&&selection.op!==data.session.active.operation){selection={row:row.id,op:data.session.active.operation};artifact=null;cancelArtifact();inspectorKey='';if(!$('inspector').hidden){history.replaceState(null,'',detailRoute(tab));currentRoute=location.hash;}}}
   renderIdentity();renderControls();renderRows();renderSelection();renderLive();if(!routeReady)applyRoute();else {renderSidebar();renderInspector();}
   const revision=JSON.stringify([data.events.map(e=>[e.sequence,e.operation,e.operational,e.artifacts?.length,e.expectation]),data.session.active,data.activeProcessObserved,data.session.operational,data.githubObservations?.map(o=>o.id)]);if(exploration&&revision!==explorationRevision&&!['sessions','workflows','attestations'].includes(exploration))preserveRegion($('exploration-content'),renderExplore);explorationRevision=revision;
  }catch(error){stale=true;control=null;if(data){renderIdentity();renderControls();}renderLive();text($('connection'),'Sin conexión · datos desactualizados');text($('action-status'),error.message+'; ejecución deshabilitada hasta actualizar.');}
  finally{inFlight=false;setTimeout(poll,1500);}
 }
 function start(){
  $('live-wrap').onclick=()=>{$('live-output').classList.toggle('nowrap');text($('live-wrap'),$('live-output').classList.contains('nowrap')?'Activar ajuste de línea':'Desactivar ajuste de línea');};$('live-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('live-output').textContent);text($('live-copy-status'),'Extracto mostrado copiado');}catch{text($('live-copy-status'),'Copia no disponible; selecciona el texto');}};
  $('command-choice').onchange=()=>navigate(commandRoute($('command-choice').value));$('open-live').onclick=()=>navigate(commandRoute(control?.command?.commandId||selectedCommand));$('close-live').onclick=()=>navigate('#demo');$('live-follow').onclick=()=>{liveFollow=!liveFollow;renderLive();};$('live-bottom').onclick=()=>{liveFollow=true;liveAutoScroll=true;$('live-output').scrollTop=$('live-output').scrollHeight;requestAnimationFrame(()=>{liveAutoScroll=false;});renderLive();};$('live-output').onwheel=e=>{if(e.deltaY<0){liveFollow=false;text($('live-follow'),'Seguir salida');}};$('live-output').onpointerdown=()=>{liveFollow=false;text($('live-follow'),'Seguir salida');};$('live-output').onscroll=()=>{const p=$('live-output');if(!liveAutoScroll&&p.scrollHeight-p.clientHeight-p.scrollTop>30){liveFollow=false;text($('live-follow'),'Seguir salida');}};$('live-final').onclick=()=>{if(liveFinal)openEvent(liveFinal);};
  $('primary').onclick=()=>requestAction(primaryAction());$('stop').onclick=()=>requestAction('stop');$('mode').onchange=renderControls;document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>requestAction(b.dataset.action));
  $('repeat-case').onchange=renderRepeatControl;$('repeat-case-run').onclick=()=>{if(!$('repeat-case-run').disabled)requestAction($('repeat-case').value);};
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
