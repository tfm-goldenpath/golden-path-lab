/* All observed text is inert. Catalogue metadata never supplies an executable. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, text, cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
  const seconds = n => n===null || n===undefined ? '—' : n.toFixed(2)+' s';
  const states={PENDING:'Pendiente',PREPARED:'Preparación íntegra',RUNNING:'En ejecución',COMPLETED:'Terminado',ERROR:'Error',ABORTED:'Abortado',NOT_REACHED:'No alcanzado',NOT_EXECUTED:'Sin ejecutar'};
  let current, signature='', selectedStage=null, csrf=null, selectedAttempt='all', selectedLog='', consoleKey='';
  async function action(name){
    if(name==='cleanup'){const plan=await fetch('/api/cleanup-plan');if(!plan.ok){$('action-status').textContent=await plan.text();return;}const p=await plan.json();if(!window.confirm('Retirar esta preparación:\n'+p.plan.map(x=>x.name+' · '+x.resource+' · '+x.action).join('\n')+'\nConservar: '+p.preserved.join(', ')))return;}
    const r=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify({action:name})});
    $('action-status').textContent=await r.text();
  }
  function view(name){document.querySelectorAll('.view').forEach(n=>n.hidden=n.id!==name);document.querySelectorAll('nav button').forEach(n=>n.classList.toggle('selected',n.dataset.view===name));}
  function decision(e){if(!e)return 'Sin ejecutar';if(e.operational!=='COMPLETED')return states[e.operational]||e.operational;return e.decision==='deny'?'Entrega bloqueada; control correcto':'Comprobación confirmada';}
  const titles={
    'f11-early':'F11 · G temprano: privilegios prohibidos',
    'f11-admission':'F11 · G admisión: segundo intento independiente',
    'f13':'F13 · G admisión: faltan resultados autorizados',
    'accept':'G · Entrega válida después de F13',
    'authorize':'G · Autorizar resultados válidos',
    'comparison-reference':'R · Ejecutar el riesgo y retirar la carga',
    'comparison-admission':'F11 · G admisión: UPDATE independiente',
    'comparison-legitimate':'L06 · G permite la actualización legítima',
    'comparison-ready':'G · Preparar el servicio válido',
    'comparison-inputs':'F11 / L06 · Comprobar la imagen y las variantes'
  };
  function titleFor(operation,data=current){return titles[operation]||data?.catalogue.operations[operation]?.title||operation;}
  // Presentation labels describe known observation boundaries, never infer a
  // policy rejection from an exit code or from every stage touched by an operation.
  const boundaries={
    'f11-early':{stage:'manifest',control:'Conftest',property:'privilegios prohibidos'},
    'f13':{stage:'admission',control:'Kyverno',property:'faltan resultados autorizados'},
    'f11-admission':{stage:'admission',control:'Kyverno',property:'privilegios prohibidos'},
    'comparison-admission':{stage:'admission',control:'Kyverno',property:'privilegios prohibidos'}
  };
  function routeFor(e){return ['reference','comparison-reference'].includes(e?.operation)?'R':e?.arm||'G';}
  function visual(e,active=false){
    if(active)return {tone:'running',label:'↻ En ejecución'};
    if(!e)return {tone:'pending',label:'○ Sin ejecutar'};
    if(e.operational==='NOT_REACHED')return {tone:'warning',label:'⚠ No alcanzado'};
    if(e.operational==='ERROR')return {tone:'warning',label:'⚠ Error de integración'};
    if(e.operational==='ABORTED')return {tone:'warning',label:'■ Interrumpido'};
    if(e.operational!=='COMPLETED')return {tone:'pending',label:states[e.operational]||e.operational};
    if(e.expectation!=='confirmed')return {tone:'warning',label:'⚠ Resultado sin confirmar'};
    if(e.decision==='deny')return {tone:'blocked',label:`× ${routeFor(e)} · Entrega bloqueada${boundaries[e.operation]?' en '+boundaries[e.operation].control:''}`};
    if(e.operation==='comparison-reference')return {tone:'warning',label:'⚠ Riesgo admitido en R'};
    return {tone:'accepted',label:'✓ Permitido / comprobado'};
  }
  function badge(e,active=false){const v=visual(e,active);return el('span',v.label,'outcome-badge '+v.tone);}
  function expected(e){return e?.expectation==='confirmed'?(e.decision==='deny'?'✓ Detección esperada':'✓ Expectativa confirmada'):'Expectativa sin confirmar';}
  function profileOperations(data){
    if(data.profileOperations)return new Set([...data.profileOperations,...data.events.map(e=>e.operation)]);
    // Compatibility with older recorded exports, without changing their receipts.
    const comparison=data.session.profile==='f11-comparison';
    return new Set(Object.keys(data.catalogue.operations).filter(op=>comparison?
      !['missing-results','f13','accept','f11-admission'].includes(op):
      !op.startsWith('comparison-')&&(data.session.profile!=='defense-short'||op!=='f11-admission')));
  }
  function details(title){const d=el('details');d.append(el('summary',title));return d;}
  function artifact(a,e=null,label=null){const b=el('button',label||a.path.split('/').slice(-2).join('/'));b.title='Abrir aquí · SHA-256 '+a.sha256;b.onclick=()=>openArtifact(a,e);return b;}
  function ownArtifact(e,path){
    // Resolve only the selected operation's closed copy. Later snapshots can
    // contain inherited files; they cannot supply a missing earlier observation.
    return e?.artifacts?.find(a=>a.path===`operations/${e.operation}/closed/${path}`&&a.producer===e.operation);
  }
  function fileReferences(text,e){
    const p=el('p',undefined,'file-references');let cursor=0;
    const pattern=/[A-Za-z0-9_./-]+\.(?:json|log|txt|ya?ml|csv)\b/g;
    for(const match of text.matchAll(pattern)){
      p.append(el('span',text.slice(cursor,match.index)));
      const a=ownArtifact(e,match[0]);p.append(a?artifact(a,e,match[0]):el('span',match[0]));
      cursor=match.index+match[0].length;
    }
    p.append(el('span',text.slice(cursor)));return p;
  }
  const keyFiles={
    'f11-early':['F11-early.json','F11-early.attribution.json','F11-security-diff.txt'],
    'f13':['F13-admission.log','F13-attribution.json'],
    'f11-admission':['F11-admission.log','F11-admission.log.attribution.json','F11-unchanged.json'],
    'comparison-admission':['runtime/F11/Deployment-UPDATE/response.log','runtime/F11/Deployment-UPDATE/result.json'],
    'comparison-reference':['comparison/reference/response.log','comparison/reference/cleaned-check.json'],
    'comparison-legitimate':['runtime/L06/update-response.log','runtime/L06/update-change.json']
  };
  function keyEvidence(e){
    const links=el('div',undefined,'evidence-links key-evidence');
    for(const path of keyFiles[e?.operation]||[]){const a=ownArtifact(e,path);if(a)links.append(artifact(a,e,path.split('/').at(-1)));}
    return links;
  }
  async function openArtifact(a,e=null){
    $('artifact-title').textContent=a.path;
    $('artifact-meta').textContent=`${e?e.attempt+' · '+(e.endUTC||'UTC desconocida')+' · operación exit='+(e.exitCode??'desconocido')+' · ':''}${a.size} bytes · SHA-256 ${a.sha256} · productor ${a.producer} · origen ${a.source} · ${a.sanitized?'vista saneada con hash propio':'copia íntegra o recibo original'} · integridad ≠ autenticidad ≠ semántica ≠ revisión humana`;
    $('artifact-full').hidden=!!current.recorded;$('artifact-full').href='/download/artifact/'+a.id;
    $('artifact-text').textContent='Comprobando evidencia…';$('artifact').showModal();
    try{
      if(current.recorded){const r=current.offlineArtifacts[a.id];if(!r)throw Error('No conservado en esta exportación');$('artifact-text').textContent=(r.truncated?'EXTRACTO ACOTADO; bytes completos en el paquete.\n\n':'')+r.text;}
      else{const r=await fetch('/artifact/'+a.id,{cache:'no-store'});if(!r.ok)throw Error(await r.text());$('artifact-text').textContent=(r.headers.get('X-Evidence-View')==='excerpt'?'EXTRACTO ACOTADO; archivo completo en el enlace.\n\n':'')+await r.text();}
    }catch(e){$('artifact-text').textContent='Evidencia no disponible / integridad no confirmada: '+e.message;}
  }
  function receipt(e){
    const d=details(`${e.sequence}. ${e.operation} · ${decision(e)} · ${seconds(e.durationSeconds)} · ${e.phase}`);
    d.className='receipt';d.dataset.tone=visual(e).tone;
    d.children[0].replaceChildren(el('strong',`${e.sequence}. ${titleFor(e.operation)}`),badge(e),el('small',`${seconds(e.durationSeconds)} · ${e.phase==='live'?'En directo':e.phase==='preparation'?'Preparación':'Conservación'}`));
    d.append(el('p',`${e.observedBoundary||'Límite no alcanzado'} · exit=${e.exitCode??'desconocido'} · resultado esperado: ${e.expectation}`));
    d.append(el('p',`UTC ${e.startUTC??'—'} → ${e.endUTC??'—'} · arranque ${e.bootId}`, 'tag'));
    if(e.reason)d.append(el('p',e.reason,'error'));
    if(e.notReached?.length)d.append(el('p','Esta solicitud no alcanza: '+e.notReached.join(', '),'deny'));
    d.append(el('p','Tiempo agregado real. Los intervalos anidados del observador se conservan en sus recibos; no se suman ni se reparten entre controles.'));
    const controls=el('div',undefined,'controls');
    for(const c of e.controls||[]){const row=el('div',undefined,'control');row.append(el('strong',c.id+' · '+c.tool),el('p',c.property),fileReferences('Entrada: '+c.input,e),fileReferences('Salida: '+c.output,e),el('p','Condición: '+c.condition),el('p',e.operational==='COMPLETED'?'Resultado confirmado por la operación completa: '+e.decision+'; consultar recibos individuales del observador.':'Resultado individual no establecido por el recibo agregado; consultar originales.'));controls.append(row);}d.append(controls);
    const links=details(`Evidencias cerradas (${e.artifacts?.length||0}) · abrir bytes verificados`);
    const list=el('div',undefined,'evidence-links');links.ontoggle=()=>{if(links.open&&!list.children.length)for(const a of e.artifacts||[])list.append(artifact(a,e));};links.append(list);d.append(links);return d;
  }
  function render(data){
    current=data;const s=data.session, ev=data.events;
    $('demo-title').textContent=s.profile==='f11-comparison'?'F11 · el mismo riesgo, dos barreras.':'F11 y F13 · bloqueos y recuperación válida.';
    $('human').textContent='Revisión humana: '+s.humanReview;
    $('web-controls').hidden=data.recorded||!csrf;
    $('saved').hidden=!data.recorded;$('session').textContent=s.session+' · '+s.profile;$('overall').textContent=(states[s.operational]||s.operational)+(s.cleaned?' · recursos retirados':'');
    $('source').textContent='SHA '+s.source.commit+' · snapshot '+s.source.contentHash;
    $('image').textContent=s.image||'Imagen todavía no construida';$('live-time').textContent=seconds(s.liveDurationSeconds);$('prep-time').textContent='Preparación: '+seconds(s.preparationDurationSeconds);
    $('evidence-time').textContent='Última evidencia cerrada: '+(s.lastEvidenceUTC||'todavía no hay recibos');
    $('html-export').hidden=!s.exports.length;$('package-export').hidden=!s.exports.length;
    if(data.recorded){$('html-export').hidden=true;$('package-export').hidden=false;$('package-export').href=data.packageName;}
    $('preparation-label').textContent=((s.prepared||ev.some(e=>e.operation==='seal'&&e.operational==='COMPLETED'))?'Preparación completada previamente':'Preparación '+(s.preparationDurationSeconds===null?'pendiente':'incompleta'))+' · '+seconds(s.preparationDurationSeconds)+' · evidencias';
    const r=s.lastResources;$('resources').textContent=r?`${r.cpuCount} CPU · libre ${(r.freeBytes/1024**3).toFixed(2)} GiB / reserva ${(r.reserveBytes/1024**3).toFixed(2)} GiB · RAM disponible ${(r.availableMemoryKiB/1024**2).toFixed(1)} GiB`: 'Recursos: sin lectura';
    $('pipeline').replaceChildren();
    for(const stage of data.catalogue.stages){const found=ev.filter(e=>e.stages.includes(stage.id)&&(selectedAttempt==='all'||e.attempt===selectedAttempt));const last=found.at(-1);const active=s.active&&data.catalogue.operations[s.active.operation]?.stages.includes(stage.id);
      const b=el('button',undefined,'stage');b.dataset.state=active?'RUNNING':last?.operational||'NOT_EXECUTED';b.dataset.decision=last?.decision||'indeterminate';b.dataset.tone=visual(last,active).tone;
      b.append(el('strong',stage.title),el('small',active?'En curso':last?`${states[last.operational]} · ${last.phase==='preparation'?'preparado':last.phase==='live'?'directo':'conservación'}`:'Sin ejecutar'));
      b.onclick=()=>{selectedStage=stage.id;view('technical');renderTechnical(data);};$('pipeline').append(b);
    }
    const attempts=s.profile==='f11-comparison' ? [['comparison-r','R · riesgo admitido','Exige ejecución observada y retirada de la configuración de riesgo; sin explotación.'],['attempt-1','F11 · G temprano · Conftest','PRIVILEGED y ESCALATION; esta petición se detiene antes de Kubernetes.'],['comparison-g','F11 · G admisión · Kyverno','Petición independiente UPDATE; estado intacto. F11 parcial.'],['comparison-l06','L06 · G permite actualizar; alcance parcial','Misma imagen; nueva plantilla, generation, rollout, Pods y HTTP.']] : [['attempt-1','F11 · Conftest','Dos campos prohibidos. Esta solicitud termina aquí.'],['attempt-2','F13 · resultados ausentes','Manifiesto válido, tres evidencias previas. CREATE bloqueado.'],['attempt-3','DEMO_VALID_ACCEPT','Emitir resultados; misma imagen y políticas. Recuperación de F13.'],['attempt-4','F11 · Kyverno','Nueva solicitud UPDATE. Deployment intacto y HTTP disponible.']];
    $('attempt-filter').replaceChildren(el('option','Todos'));$('attempt-filter').children[0].value='all';for(const [id,title] of attempts){const o=el('option',title);o.value=id;$('attempt-filter').append(o);}$('attempt-filter').value=selectedAttempt;
    $('reference-observation').replaceChildren();
    $('reference-observation').hidden=s.profile==='f11-comparison';
    if(s.profile!=='f11-comparison'){
      const reference=ev.filter(e=>e.operation==='reference').at(-1);
      const panel=$('reference-observation');
      panel.append(el('strong','R · Referencia válida'),badge(reference),el('span','Preparación previa · '+seconds(reference?.durationSeconds)+'. No prueba privilegios en R.'));
      const a=ownArtifact(reference,'tfm-reference-quote.json');if(a)panel.append(artifact(a,reference,'Ver respuesta HTTP de R'));
    }
    $('attempts').replaceChildren();
    for(const [id,title,description] of attempts){const found=ev.filter(e=>e.attempt===id&&e.phase==='live');const last=found.at(-1);const active=s.active&&data.catalogue.operations[s.active.operation]?.attempt===id;const box=el('article',undefined,'attempt');box.append(el('small',id.replace('attempt-','INTENTO '),'tag'),el('h3',title),el('p',description),el('p',active?(data.activeProcessObserved===false?'Proceso interrumpido; recibo sin cerrar':'En ejecución: '+s.active.operation):decision(last),'decision '+(last?.decision==='deny'?'deny':last?.operational==='ERROR'||last?.operational==='ABORTED'?'error':last?.operational!=='COMPLETED'?'empty':id==='comparison-r'?'error':'allow')));
      if(id==='attempt-2')box.append(el('small','Recuperación positiva: '+(s.f13Recovery==='confirmed'?'confirmada':'pendiente')));
      if(last?.notReached?.length)box.append(el('small','Etapas no alcanzadas: '+last.notReached.map(x=>({admission:'admisión',deployment:'despliegue'}[x]||x)).join(', ')));
      if(id==='attempt-4'&&s.profile==='defense-short')box.append(el('small','Perfil corto: sin ejecutar. Respaldo previo sólo si está conservado.'));
      if(s.profile==='f11-comparison'){
        if(id==='comparison-r')box.append(el('strong','⚠ R conserva RBAC y Kubernetes; admitir riesgo no demuestra compromiso.','error'));
        if(id==='comparison-l06'&&last?.expectation==='confirmed')box.append(el('strong','L06 — actualización legítima demostrada; alcance parcial','allow'));
        box.append(el('small',`Esperado: ${id==='attempt-1'||id==='comparison-g'?'bloqueo':'aceptación'} · real: ${({allow:'permitido',deny:'bloqueado',indeterminate:'sin confirmar'})[last?.decision]||'no ejecutado'} · expectativa: ${last?.expectation==='confirmed'?'confirmada':last?'sin confirmar':'pendiente'} · ${seconds(last?.durationSeconds)} · vía A · ${id}`));
        const suffix={ 'comparison-r':'reference/response.log','attempt-1':'F11-early.json','comparison-g':'Deployment-UPDATE/response.log','comparison-l06':'L06/update-response.log'}[id];
        const log=last?.artifacts?.find(a=>a.path.endsWith(suffix))||last?.artifacts?.find(a=>a.path.endsWith('/output.log'));if(log)box.append(artifact(log,last));
      }
      box.dataset.tone=visual(last,active).tone;
      if(s.profile!=='f11-comparison')box.append(keyEvidence(last));
      const indicator=box.children[3];indicator.className+=' outcome-badge '+visual(last,active).tone;indicator.textContent=visual(last,active).label;
      if(s.profile!=='f11-comparison'&&last?.expectation==='confirmed')box.append(el('small',expected(last),'expectation-note'));
      if(last?.operational==='NOT_REACHED')box.append(el('small','La secuencia se detuvo antes de este paso; este control no se ha observado.','warning-note'));
      $('attempts').append(box);
    }
    $('pipeline').hidden=s.profile==='f11-comparison';
    $('preparation-receipts').replaceChildren();for(const e of ev.filter(e=>e.phase==='preparation'))$('preparation-receipts').append(receipt(e));
    renderTechnical(data);renderCatalogue(data);renderConsole(data);
  }
  function renderTechnical(data){
    const eligible=profileOperations(data);
    data={...data,events:data.events.filter(e=>selectedAttempt==='all'||e.attempt===selectedAttempt)};
    $('technical-context').textContent=`Perfil ${data.session.profile} · ${selectedAttempt==='all'?'Todos sus intentos':selectedAttempt}. Se muestran únicamente las operaciones de este perfil. Un bloqueo esperado confirma el control; un paso no alcanzado no aporta un resultado.`;
    $('technical-stages').replaceChildren();
    for(const stage of data.catalogue.stages){
      const specs=Object.values(data.catalogue.operations).filter(o=>eligible.has(o.adapter)&&o.stages.includes(stage.id)&&(selectedAttempt==='all'||o.attempt===selectedAttempt));
      if(!specs.length)continue;
      const d=details(stage.title);d.className='technical-stage';d.dataset.stage=stage.id;d.open=stage.id===selectedStage;
      const findings=el('span',undefined,'stage-findings');
      for(const e of data.events){
        const boundary=boundaries[e.operation];
        if(boundary?.stage!==stage.id)continue;
        const v=visual(e);if(!['blocked','warning'].includes(v.tone))continue;
        const text=v.tone==='blocked'?`× ${e.scenario||'Control'} · ${boundary.property} · bloqueo en ${boundary.control}`:`${e.scenario||'Control'} · ${v.label}`;
        const marker=el('span',text,'outcome-badge '+v.tone);marker.title=e.attempt+' · '+expected(e);findings.append(marker);
      }
      d.children[0].append(findings);d.append(el('p',stage.description,'stage-description'));
      for(const spec of specs){
        const e=data.events.filter(e=>e.operation===spec.adapter).at(-1);
        const active=data.session.active?.operation===spec.adapter;
        const row=el('article',undefined,'scenario-row');row.dataset.tone=visual(e,active).tone;
        const heading=el('div',undefined,'scenario-heading');
        heading.append(el('h3',titleFor(spec.adapter,data)),badge(e,active));row.append(heading);
        if(e)row.append(el('p',`${routeFor(e)} · ${e.attempt} · ${e.phase==='live'?'En directo':'Preparación previa'}`,'observation-identity'),keyEvidence(e));
        if(e)row.append(el('p',expected(e)+(e.durationSeconds==null?'':' · '+seconds(e.durationSeconds)),'expectation-note'));
        if(e?.operational==='NOT_REACHED')row.append(el('p','No se envió esta prueba: la secuencia se detuvo en un paso anterior. No equivale a un rechazo del control.','warning-note'));
        if(e?.reason)row.append(el('p',e.reason,'diagnostic'));
        const detail=details('Cómo se comprueba · detalles y archivos');
        detail.append(el('p','Depende de: '+(spec.dependsOn.join(', ')||'preparación previa')));
        for(const c of spec.controls){detail.append(el('p',`${c.tool}: ${c.property}`),fileReferences('Entrada: '+c.input,e),fileReferences('Salida: '+c.output,e),el('p','Condición: '+c.condition));}
        row.append(detail);d.append(row);
      }
      $('technical-stages').append(d);
    }
    $('receipts').replaceChildren();for(const e of data.events)$('receipts').append(receipt(e));
  }
  function renderCatalogue(data){
    $('cases').replaceChildren();
    for(const c of data.catalogue.scenarios){const row=el('tr');const first=el('td');first.append(el('strong',c.id+' · '+c.name),el('p',c.guarantee),el('small','Límite: '+c.limits));
      let observed='Sin ejecutar';const relevant=data.events.filter(e=>e.scenario===c.id);
      if(relevant.length)observed=relevant.map(e=>e.operation+': '+decision(e)).join(' · ');
      if(['F01','F02'].includes(c.id)&&data.events.some(e=>e.operation==='ci'&&e.operational==='COMPLETED'))observed='Ejecutado estáticamente en make test; no workflow malicioso';
      const history=el('td');history.append(el('small',`${c.history.date} · vía ${c.history.lane} · run ${c.history.run}`),el('small','Fuente ejecutada: '+c.history.executedSource));const h=details('Registro documental');h.append(el('p',c.history.status),el('p',c.history.verification),el('p','Fuente: '+c.history.source));history.append(h);
      row.append(first,el('td',c.implemented?'Implementado; consultar límites':'Documentado'),el('td',c.adapters.length?c.adapters.join(', '):'Documentado; sin adaptador de demostración'),el('td',observed),history);$('cases').append(row);
    }
    $('workflows').replaceChildren();for(const w of data.workflows){const d=details(w.file+' · '+w.purpose);d.append(el('p','Triggers: '+w.triggers.join(', ')+' · límites de job: '+w.timeoutsMinutes.join(', ')+' minutos'),el('p','Permisos declarados (globales/jobs): '+w.permissions.map(x=>x.join(': ')).join(', ')),el('p','Acciones fijadas: '+w.actions.join(' | ')),el('p','SHA-256 YAML: '+w.sha256),el('p','Ejecución remota: no observada. YAML es configuración, no prueba de ejecución.'),el('pre',w.yaml));$('workflows').append(d);}
  }
  async function renderConsole(data){
    const available=data.events.filter(e=>selectedAttempt==='all'||e.attempt===selectedAttempt).flatMap(e=>(e.artifacts||[]).filter(a=>/\.(log|txt)$/.test(a.path)||a.path.endsWith('F11-early.json')).map(a=>({e,a})));
    $('log-select').replaceChildren();
    for(const {e,a} of available){const o=el('option',e.operation+' · '+a.path.split('/').slice(-2).join('/'));o.value=a.id;$('log-select').append(o);}
    if(!available.some(x=>x.a.id===selectedLog))selectedLog=available.at(-1)?.a.id||'';
    $('log-select').value=selectedLog;
    const row=available.find(x=>x.a.id===selectedLog);if(!row)return;
    const {e,a}=row;
    $('console-full').hidden=!!data.recorded;$('console-full').href='/download/artifact/'+a.id;
    $('console-meta').textContent=`${e.attempt} · ${e.endUTC} · operación exit=${e.exitCode}; exit del control en su recibo · ${a.path} · SHA-256 ${a.sha256} · ${a.sanitized?'copia redactada':'copia íntegra / recibo'} · comando: ${(e.command||[]).join(' ')}`;
    if(consoleKey===a.id)return;consoleKey=a.id;
    try{if(data.recorded){const excerpt=data.offlineArtifacts[a.id];$('tail').textContent=excerpt?(excerpt.truncated?'EXTRACTO; archivo completo en el paquete.\n':'')+excerpt.text:'Contenido completo en el paquete';}
      else{const response=await fetch('/artifact/'+a.id);if(!response.ok)throw Error(await response.text());const text=await response.text();if(selectedLog===a.id)$('tail').textContent=(response.headers.get('X-Evidence-View')==='excerpt'?'EXTRACTO; enlace al archivo completo.\n':'')+text;}
    }catch(error){$('tail').textContent=error.message;}
  }
  async function poll(){
    try{const response=await fetch('/api/session',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();
      $('connection').textContent=csrf?'● Controles autenticados · privado':'● Visor conectado · sólo lectura';$('reading').textContent='Última lectura: '+data.readUTC;
      const key=JSON.stringify([data.session.lastEvidenceUTC,data.session.active,data.session.exports.length,data.session.operational,data.events.length]);
      if(key!==signature){signature=key;render(data);}current=data;
      if(data.provisionalLog&&selectedAttempt==='all'){consoleKey='';$('tail').textContent='SALIDA PROVISIONAL · '+data.provisionalLogModifiedUTC+'\n'+data.provisionalLog;}if(data.session.active)$('running').open=true;
      if(csrf){const c=await (await fetch('/api/control',{cache:'no-store'})).json();document.querySelectorAll('[data-action]').forEach(b=>{const a=b.dataset.action;b.disabled=(a==='prepare'&&(data.events.length>0||data.session.operational!=='PENDING'))||(c.busy?a!=='stop':a==='stop'||(['present','step','check'].includes(a)&&(!data.session.prepared||data.session.demoResult==='CONFIRMED')));});}
    }catch(error){$('connection').textContent='× Sin conexión · datos de la última lectura';$('reading').textContent='Última lectura: '+(current?.readUTC||'ninguna')+' · '+error.message;}
  }
  function start(){
    $('attempt-filter').onchange=()=>{selectedAttempt=$('attempt-filter').value;selectedLog='';consoleKey='';render(current);};
    $('log-select').onchange=()=>{selectedLog=$('log-select').value;consoleKey='';renderConsole(current);};
    $('scope-button').onclick=()=>{ $('artifact-full').hidden=true;$('artifact-title').textContent='Qué demuestra y qué no';$('artifact-meta').textContent='F11 / L06 · vía A';$('artifact-text').textContent='F11: sólo UPDATE de Deployment y dos campos; no completa CREATE/Pod. L06: actualización legítima de plantilla con la misma imagen, generation, rollout, Pods y HTTP; alcance parcial, sin Pod directo. R: configuración admitida/ejecutada únicamente según observaciones, sin explotación. No demuestra compromiso del clúster, OIDC, vía B ni productividad humana.';$('artifact').showModal();};
    if(!window.SAVED_SESSION)fetch('/api/control').then(r=>r.ok?r.json():{}).then(c=>{csrf=c.csrf||null;$('web-controls').hidden=!csrf;document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));});
    document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>view(b.dataset.view));$('close-artifact').onclick=()=>$('artifact').close();
    if(window.SAVED_SESSION){render(window.SAVED_SESSION);$('connection').textContent='Ejecución guardada; no en directo';$('reading').textContent='Exportada: '+window.SAVED_SESSION.savedUTC;}
    else{poll();setInterval(poll,1500);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
