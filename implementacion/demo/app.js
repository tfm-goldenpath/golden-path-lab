/* All observed text is inert. Catalogue metadata never supplies an executable. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, text, cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
  const seconds = n => n===null || n===undefined ? '—' : n.toFixed(2)+' s';
  const states={PENDING:'Pendiente',PREPARED:'Preparación íntegra',RUNNING:'En ejecución',COMPLETED:'Terminado',ERROR:'Error',ABORTED:'Abortado',NOT_REACHED:'No alcanzado',NOT_EXECUTED:'Sin ejecutar'};
  let current, signature='', selectedStage=null;
  function view(name){document.querySelectorAll('.view').forEach(n=>n.hidden=n.id!==name);document.querySelectorAll('nav button').forEach(n=>n.classList.toggle('selected',n.dataset.view===name));}
  function decision(e){if(!e)return 'Sin ejecutar';if(e.operational!=='COMPLETED')return states[e.operational]||e.operational;return e.decision==='deny'?'Entrega bloqueada; control correcto':'Comprobación confirmada';}
  function details(title){const d=el('details');d.append(el('summary',title));return d;}
  function artifact(a){const b=el('button',a.path.split('/').slice(-2).join('/'));b.title='SHA-256 '+a.sha256;b.onclick=()=>openArtifact(a);return b;}
  async function openArtifact(a){
    $('artifact-title').textContent=a.path;
    $('artifact-meta').textContent=`${a.size} bytes · SHA-256 ${a.sha256} · productor ${a.producer} · origen ${a.source} · ${a.sanitized?'vista saneada con hash propio':'copia íntegra o recibo original'} · integridad ≠ autenticidad ≠ semántica ≠ revisión humana`;
    $('artifact-text').textContent='Comprobando evidencia…';$('artifact').showModal();
    try{
      if(current.recorded){const r=current.offlineArtifacts[a.id];if(!r)throw Error('No conservado en esta exportación');$('artifact-text').textContent=(r.truncated?'EXTRACTO ACOTADO; bytes completos en el paquete.\n\n':'')+r.text;}
      else{const r=await fetch('/artifact/'+a.id,{cache:'no-store'});if(!r.ok)throw Error(await r.text());$('artifact-text').textContent=await r.text();}
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
    $('saved').hidden=!data.recorded;$('session').textContent=s.session+' · '+s.profile;$('overall').textContent=(states[s.operational]||s.operational)+(s.cleaned?' · recursos retirados':'');
    $('source').textContent='SHA '+s.source.commit+' · snapshot '+s.source.contentHash;
    $('image').textContent=s.image||'Imagen todavía no construida';$('live-time').textContent=seconds(s.liveDurationSeconds);$('prep-time').textContent='Preparación: '+seconds(s.preparationDurationSeconds);
    $('evidence-time').textContent='Última evidencia cerrada: '+(s.lastEvidenceUTC||'todavía no hay recibos');
    $('html-export').hidden=!s.exports.length;$('package-export').hidden=!s.exports.length;
    if(data.recorded){$('html-export').hidden=true;$('package-export').hidden=false;$('package-export').href=data.packageName;}
    $('pipeline').replaceChildren();
    for(const stage of data.catalogue.stages){const found=ev.filter(e=>e.stages.includes(stage.id));const last=found.at(-1);const active=s.active&&data.catalogue.operations[s.active.operation]?.stages.includes(stage.id);
      const b=el('button',undefined,'stage');b.dataset.state=active?'RUNNING':last?.operational||'NOT_EXECUTED';b.dataset.decision=last?.decision||'indeterminate';
      b.append(el('strong',stage.title),el('small',active?'En curso':last?`${states[last.operational]} · ${last.phase==='preparation'?'preparado':last.phase==='live'?'directo':'conservación'}`:'Sin ejecutar'));
      b.onclick=()=>{selectedStage=stage.id;view('technical');renderTechnical(data);};$('pipeline').append(b);
    }
    const attempts=[['attempt-1','F11 · Conftest','Dos campos prohibidos. Esta solicitud termina aquí.'],['attempt-2','F13 · resultados ausentes','Manifiesto válido, tres evidencias previas. CREATE bloqueado.'],['attempt-3','DEMO_VALID_ACCEPT','Emitir resultados; misma imagen y políticas. Recuperación de F13.'],['attempt-4','F11 · Kyverno','Nueva solicitud UPDATE. Deployment intacto y HTTP disponible.']];
    $('attempts').replaceChildren();
    for(const [id,title,description] of attempts){const found=ev.filter(e=>e.attempt===id);const last=found.at(-1);const active=s.active&&data.catalogue.operations[s.active.operation]?.attempt===id;const box=el('article',undefined,'attempt');box.append(el('small',id.replace('attempt-','INTENTO '),'tag'),el('h3',title),el('p',description),el('p',active?(data.activeProcessObserved===false?'Proceso interrumpido; recibo sin cerrar':'En ejecución: '+s.active.operation):decision(last),'decision '+(last?.decision==='deny'?'deny':last?.operational==='ERROR'||last?.operational==='ABORTED'?'error':'allow')));
      if(id==='attempt-2')box.append(el('small','Recuperación positiva: '+(s.f13Recovery==='confirmed'?'confirmada':'pendiente')));
      if(last?.notReached?.length)box.append(el('small','NOT_REACHED: '+last.notReached.join(', ')));
      if(id==='attempt-4'&&s.profile==='defense-short')box.append(el('small','Perfil corto: sin ejecutar. Respaldo previo sólo si está conservado.'));
      $('attempts').append(box);
    }
    renderTechnical(data);renderCatalogue(data);
  }
  function renderTechnical(data){
    $('technical-stages').replaceChildren();
    for(const stage of data.catalogue.stages){const d=details(stage.title);d.open=stage.id===selectedStage;d.append(el('p',stage.description));
      const specs=Object.values(data.catalogue.operations).filter(o=>o.stages.includes(stage.id));
      for(const spec of specs){const e=data.events.filter(e=>e.operation===spec.adapter).at(-1);d.append(el('p',`${spec.title} · ${decision(e)} · depende de: ${spec.dependsOn.join(', ')||'orden de preparación'}`));
        if(!e)for(const c of spec.controls)d.append(el('p',`${c.tool}: ${c.property} · entrada ${c.input} · salida ${c.output} · condición ${c.condition}`,'empty'));}
      for(const e of data.events.filter(e=>e.stages.includes(stage.id)))d.append(receipt(e));$('technical-stages').append(d);
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
  async function poll(){
    try{const response=await fetch('/api/session',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();
      $('connection').textContent='● Visor conectado · sólo lectura';$('reading').textContent='Última lectura: '+data.readUTC;
      const key=JSON.stringify([data.session.lastEvidenceUTC,data.session.active,data.session.exports.length,data.session.operational,data.events.length]);
      if(key!==signature){signature=key;render(data);}current=data;
      $('tail').textContent=data.provisionalLog?('Log provisional modificado: '+data.provisionalLogModifiedUTC+'\n'+data.provisionalLog):'Sin operación activa';$('running').open=!!data.session.active;
    }catch(error){$('connection').textContent='× Sin conexión · datos de la última lectura';$('reading').textContent='Última lectura: '+(current?.readUTC||'ninguna')+' · '+error.message;}
  }
  function start(){document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>view(b.dataset.view));$('close-artifact').onclick=()=>$('artifact').close();
    if(window.SAVED_SESSION){render(window.SAVED_SESSION);$('connection').textContent='Ejecución guardada; no en directo';$('reading').textContent='Exportada: '+window.SAVED_SESSION.savedUTC;}
    else{poll();setInterval(poll,1500);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
