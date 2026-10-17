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
  function details(title){const d=el('details');d.append(el('summary',title));return d;}
  function artifact(a){const b=el('button',a.path.split('/').slice(-2).join('/'));b.title='SHA-256 '+a.sha256;b.onclick=()=>openArtifact(a);return b;}
  async function openArtifact(a){
    $('artifact-title').textContent=a.path;
    $('artifact-meta').textContent=`${a.size} bytes · SHA-256 ${a.sha256} · productor ${a.producer} · origen ${a.source} · ${a.sanitized?'vista saneada con hash propio':'copia íntegra o recibo original'} · integridad ≠ autenticidad ≠ semántica ≠ revisión humana`;
    $('artifact-full').hidden=!!current.recorded;$('artifact-full').href='/download/artifact/'+a.id;
    $('artifact-text').textContent='Comprobando evidencia…';$('artifact').showModal();
    try{
      if(current.recorded){const r=current.offlineArtifacts[a.id];if(!r)throw Error('No conservado en esta exportación');$('artifact-text').textContent=(r.truncated?'EXTRACTO ACOTADO; bytes completos en el paquete.\n\n':'')+r.text;}
      else{const r=await fetch('/artifact/'+a.id,{cache:'no-store'});if(!r.ok)throw Error(await r.text());$('artifact-text').textContent=(r.headers.get('X-Evidence-View')==='excerpt'?'EXTRACTO ACOTADO; archivo completo en el enlace.\n\n':'')+await r.text();}
    }catch(e){$('artifact-text').textContent='Evidencia no disponible / integridad no confirmada: '+e.message;}
  }
  function receipt(e){
    const d=details(`${e.sequence}. ${e.operation} · ${decision(e)} · ${seconds(e.durationSeconds)} · ${e.phase}`);
    d.className='receipt';
    d.append(el('p',`${e.observedBoundary||'Límite no alcanzado'} · exit=${e.exitCode??'desconocido'} · resultado esperado: ${e.expectation}`));
    d.append(el('p',`UTC ${e.startUTC??'—'} → ${e.endUTC??'—'} · arranque ${e.bootId}`, 'tag'));
    if(e.reason)d.append(el('p',e.reason,'error'));
    if(e.notReached?.length)d.append(el('p','Esta solicitud no alcanza: '+e.notReached.join(', '),'deny'));
    d.append(el('p','Tiempo agregado real. Los intervalos anidados del observador se conservan en sus recibos; no se suman ni se reparten entre controles.'));
    const controls=el('div',undefined,'controls');
    for(const c of e.controls||[]){const row=el('div',undefined,'control');row.append(el('strong',c.id+' · '+c.tool),el('p',c.property),el('p','Entrada: '+c.input),el('p','Salida: '+c.output),el('p','Condición: '+c.condition),el('p',e.operational==='COMPLETED'?'Resultado confirmado por la operación completa: '+e.decision+'; consultar recibos individuales del observador.':'Resultado individual no establecido por el recibo agregado; consultar originales.'));controls.append(row);}d.append(controls);
    const links=details(`Evidencias cerradas (${e.artifacts?.length||0}) · abrir bytes verificados`);
    const list=el('div',undefined,'evidence-links');links.ontoggle=()=>{if(links.open&&!list.children.length)for(const a of e.artifacts||[])list.append(artifact(a));};links.append(list);d.append(links);return d;
  }
  function render(data){
    current=data;const s=data.session, ev=data.events;
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
      const b=el('button',undefined,'stage');b.dataset.state=active?'RUNNING':last?.operational||'NOT_EXECUTED';b.dataset.decision=last?.decision||'indeterminate';
      b.append(el('strong',stage.title),el('small',active?'En curso':last?`${states[last.operational]} · ${last.phase==='preparation'?'preparado':last.phase==='live'?'directo':'conservación'}`:'Sin ejecutar'));
      b.onclick=()=>{selectedStage=stage.id;view('technical');renderTechnical(data);};$('pipeline').append(b);
    }
    const attempts=s.profile==='f11-comparison' ? [['comparison-r','R · riesgo admitido','Exige ejecución observada y retirada de la configuración de riesgo; sin explotación.'],['attempt-1','G temprano · Conftest','PRIVILEGED y ESCALATION; esta petición se detiene antes de Kubernetes.'],['comparison-g','G admisión · Kyverno','Petición independiente UPDATE; estado intacto. F11 parcial.'],['comparison-l06','L06 · actualización legítima; alcance parcial','Misma imagen; nueva plantilla, generation, rollout, Pods y HTTP.']] : [['attempt-1','F11 · Conftest','Dos campos prohibidos. Esta solicitud termina aquí.'],['attempt-2','F13 · resultados ausentes','Manifiesto válido, tres evidencias previas. CREATE bloqueado.'],['attempt-3','DEMO_VALID_ACCEPT','Emitir resultados; misma imagen y políticas. Recuperación de F13.'],['attempt-4','F11 · Kyverno','Nueva solicitud UPDATE. Deployment intacto y HTTP disponible.']];
    $('attempt-filter').replaceChildren(el('option','Todos'));$('attempt-filter').children[0].value='all';for(const [id,title] of attempts){const o=el('option',title);o.value=id;$('attempt-filter').append(o);}$('attempt-filter').value=selectedAttempt;
    $('attempts').replaceChildren();
    for(const [id,title,description] of attempts){const found=ev.filter(e=>e.attempt===id&&e.phase==='live');const last=found.at(-1);const active=s.active&&data.catalogue.operations[s.active.operation]?.attempt===id;const box=el('article',undefined,'attempt');box.append(el('small',id.replace('attempt-','INTENTO '),'tag'),el('h3',title),el('p',description),el('p',active?(data.activeProcessObserved===false?'Proceso interrumpido; recibo sin cerrar':'En ejecución: '+s.active.operation):decision(last),'decision '+(last?.decision==='deny'?'deny':last?.operational==='ERROR'||last?.operational==='ABORTED'?'error':last?.operational!=='COMPLETED'?'empty':id==='comparison-r'?'error':'allow')));
      if(id==='attempt-2')box.append(el('small','Recuperación positiva: '+(s.f13Recovery==='confirmed'?'confirmada':'pendiente')));
      if(last?.notReached?.length)box.append(el('small','NOT_REACHED: '+last.notReached.join(', ')));
      if(id==='attempt-4'&&s.profile==='defense-short')box.append(el('small','Perfil corto: sin ejecutar. Respaldo previo sólo si está conservado.'));
      if(s.profile==='f11-comparison'){
        if(id==='comparison-r')box.append(el('strong','⚠ R conserva RBAC y Kubernetes; admitir riesgo no demuestra compromiso.','error'));
        if(id==='comparison-l06'&&last?.expectation==='confirmed')box.append(el('strong','L06 — actualización legítima demostrada; alcance parcial','allow'));
        box.append(el('small',`Esperado: ${id==='attempt-1'||id==='comparison-g'?'bloqueo':'aceptación'} · real: ${last?.decision||'no ejecutado'} · ensayo: ${last?.expectation||'pendiente'} · ${seconds(last?.durationSeconds)} · vía A · ${id}`));
        const suffix={ 'comparison-r':'reference/response.log','attempt-1':'F11-early.json','comparison-g':'Deployment-UPDATE/response.log','comparison-l06':'L06/update-response.log'}[id];
        const log=last?.artifacts?.find(a=>a.path.endsWith(suffix))||last?.artifacts?.find(a=>a.path.endsWith('/output.log'));if(log)box.append(artifact(log));
      }
      $('attempts').append(box);
    }
    $('pipeline').hidden=s.profile==='f11-comparison';
    $('preparation-receipts').replaceChildren();for(const e of ev.filter(e=>e.phase==='preparation'))$('preparation-receipts').append(receipt(e));
    renderTechnical(data);renderCatalogue(data);renderConsole(data);
  }
  function renderTechnical(data){
    data={...data,events:data.events.filter(e=>selectedAttempt==='all'||e.attempt===selectedAttempt)};
    $('technical-stages').replaceChildren();
    for(const stage of data.catalogue.stages){const d=details(stage.title);d.open=stage.id===selectedStage;d.append(el('p',stage.description));
      const specs=Object.values(data.catalogue.operations).filter(o=>o.stages.includes(stage.id)&&(selectedAttempt==='all'||o.attempt===selectedAttempt));
      for(const spec of specs){const e=data.events.filter(e=>e.operation===spec.adapter).at(-1);d.append(el('p',`${spec.title} · ${decision(e)} · depende de: ${spec.dependsOn.join(', ')||'orden de preparación'}`));
        if(!e)for(const c of spec.controls)d.append(el('p',`${c.tool}: ${c.property} · entrada ${c.input} · salida ${c.output} · condición ${c.condition}`,'empty'));}
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
