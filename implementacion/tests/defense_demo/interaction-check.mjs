// Synthetic UI state transitions only. All action requests are intercepted.
import assert from 'node:assert/strict';
import {chromium,loaded,choose,wait,pass,snap,explore} from './browser-support.mjs';
const [url,output]=process.argv.slice(2);if(!output)throw Error('Usage: interaction-check.mjs COMPARISON_URL OUTPUT_PREFIX');
const original=await (await fetch(url+'/api/session')).json(),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let fixture=structuredClone(original),busy=false,offline=false,postCount=0,stopCount=0,authFailure=false;
 fixture.session={...fixture.session,session:'synthetic-controls-ui-only',operational:'PREPARED',prepared:true,cleaned:false,demoResult:null,active:null};fixture.actionsEnabled=true;
 fixture.events=fixture.events.filter(e=>e.phase==='preparation');
 const caps=()=>Object.fromEntries(['prepare','check','present','step','stop','export','cleanup'].map(a=>[a,{enabled:a==='stop'?busy:!busy&&a!=='prepare',reason:'Synthetic state gate'}]));
 await page.route('**/api/session',r=>offline?r.abort():r.fulfill({json:fixture}));
 await page.route('**/api/control',r=>authFailure?r.fulfill({status:403,json:{}}):r.fulfill({json:{session:fixture.session.session,csrf:'synthetic-token',busy,capabilities:caps()}}));
 await page.route('**/api/action',async r=>{const body=r.request().postDataJSON();assert.deepEqual(Object.keys(body),['action']);postCount++;if(body.action==='stop'){stopCount++;await r.fulfill({json:{stopRequested:true}});return;}await wait(250);await r.fulfill({status:202,json:{accepted:true}});});
 await loaded(page,url);assert.equal(await page.locator('#primary').innerText(),'Iniciar comparación');await snap(page,output,'ready-synthetic');
 await page.locator('#mode').selectOption('step');assert.equal(postCount,0);assert.equal(await page.locator('#primary').innerText(),'Ejecutar siguiente paso');
 await page.locator('#primary').evaluate(b=>{b.click();b.click();});await wait(400);assert.equal(postCount,1);assert.equal(await page.locator('#primary').isDisabled(),true);assert.match(await page.locator('#action-status').innerText(),/aceptada|esperando/);
 busy=true;fixture.session.active={operation:'f11-early'};fixture.activeProcessObserved=true;fixture.session.operational='RUNNING';fixture.provisionalLog='Synthetic running output';await wait(1800);
 assert.equal(await page.locator('#stop').isDisabled(),false);await snap(page,output,'running-synthetic');
 await page.locator('#stop').click();await wait(100);assert.equal(stopCount,1);assert.match(await page.locator('#stop').innerText(),/Detención solicitada/);await wait(1700);assert.match(await page.locator('#stop').innerText(),/Detención solicitada/);
 fixture.activeProcessObserved=false;await wait(1700);assert.match(await page.locator('.attempt-row[data-attempt="attempt-1"]').innerText(),/Proceso interrumpido/);
 busy=false;fixture.session.active=null;fixture.session.operational='ABORTED';fixture.session.prepared=false;await wait(1700);assert.equal(await page.locator('#stop').innerText(),'Detener');
 offline=true;await wait(1700);assert.match(await page.locator('#connection').innerText(),/desactualizados/);assert.equal(await page.locator('[data-action="export"]').isDisabled(),true);
 offline=false;fixture.session.operational='PREPARED';fixture.session.prepared=true;authFailure=true;await wait(1700);assert.equal(await page.locator('[data-action="export"]').isDisabled(),true);assert.equal(await page.locator('#primary').innerText(),'Ver resultado');
 authFailure=false;await wait(1700);assert.equal(await page.locator('#primary').isDisabled(),false);
 // Exploration cannot retarget the action payload or source identity.
 await page.route('**/api/sessions',r=>r.fulfill({json:{entries:[{session:'other-synthetic',profile:'defense',operational:'COMPLETED',source:{commit:'b'.repeat(40)}}]}}));
 await explore(page,'sessions');await page.locator('#exploration details > summary').click();assert.match(await page.locator('#identity').innerText(),/synthetic-controls-ui-only/);assert.equal(postCount,2);await page.locator('#close-exploration').click();
 // Closed log race: slow old response must not replace the newly selected file.
 fixture=structuredClone(original);fixture.actionsEnabled=false;fixture.session.session='synthetic-evidence-race';await page.reload();await page.waitForSelector('.attempt-row');await choose(page,'attempt-1');
 const event=fixture.events.find(e=>e.operation==='f11-early'),first=event.artifacts.find(a=>a.path==='operations/f11-early/closed/F11-early.json'),second=event.artifacts.find(a=>a.path==='operations/f11-early/closed/F11-early.attribution.json');
 await page.route('**/artifact/'+first.id,async r=>{await wait(1800);await r.fulfill({body:'SYNTHETIC OLD RESPONSE'}).catch(()=>{});});
 await page.route('**/artifact/'+second.id,r=>r.fulfill({body:'SYNTHETIC NEW ATTRIBUTION'}));
 await page.locator('#blocking-log').click();await page.locator('[data-tab=result]').click();await page.locator('#attribution').click();await wait(2100);assert.equal(await page.locator('.console-text').innerText(),'SYNTHETIC NEW ATTRIBUTION');
 await page.route('**/artifact/'+first.id,r=>r.fulfill({status:409,json:{error:'Synthetic integrity failure'}}));await page.locator('[data-tab=result]').click();await page.locator('#blocking-log').click();await wait(200);assert.match(await page.locator('.console-text').innerText(),/alterado|verificable/);assert.ok(!(await page.locator('.console-text').innerText()).includes('NEW ATTRIBUTION'));
 // Explicit following changes the operation; manual selection pins it again.
 fixture.actionsEnabled=true;await wait(1700);await page.locator('#close-inspector').click();await page.locator('#follow').check();fixture.session.active={operation:'comparison-admission'};fixture.activeProcessObserved=true;await wait(1800);assert.match(await page.locator('#result-title').innerText(),/Admisión independiente/);
 await choose(page,'attempt-1');assert.equal(await page.locator('#follow').isChecked(),false);fixture.session.active={operation:'comparison-legitimate'};await wait(1700);assert.match(await page.locator('#result-title').innerText(),/Control temprano/);
 // New receipts update the inspector without closing technical sections or losing focus/scroll.
 await page.locator('#technical-evidence').click();
 const stage=page.locator('#inspector .technical-stage').first();await stage.locator(':scope > summary').click();
 const detail=stage.locator('.scenario-row details').first();await detail.locator(':scope > summary').click();
 await detail.locator(':scope > summary').evaluate(n=>n.focus({preventScroll:true}));
 await page.evaluate(()=>window.scrollTo(0,90));const savedScroll=await page.evaluate(()=>scrollY);
 fixture.events.push({...fixture.events[0],sequence:999,operation:'cleanup',phase:'preservation',attempt:'preservation',artifacts:[]});await wait(1800);
 assert.equal(await stage.getAttribute('open'),'');assert.equal(await detail.getAttribute('open'),'');
 assert.equal(await detail.locator(':scope > summary').evaluate(n=>n===document.activeElement),true);
 assert.equal(await page.evaluate(()=>scrollY),savedScroll);
 assert.equal(errors.length,0,errors.join('\n'));pass(output,{postCount,stopCount,staleActionsDisabled:true,staleArtifactRejected:true,workerDisappearance:true,errors});
}finally{await browser.close();}
