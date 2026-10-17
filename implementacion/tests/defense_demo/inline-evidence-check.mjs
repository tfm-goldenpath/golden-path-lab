import assert from 'node:assert/strict';
import {chromium,loaded,choose,tab,pass,snap,wait,offlineHTML} from './browser-support.mjs';
const [url,output]=process.argv.slice(2);if(!output)throw Error('Usage: inline-evidence-check.mjs DEFENSE_URL OUTPUT_PREFIX');
const snapshot=await (await fetch(url+'/api/session')).json();
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await loaded(page,url);await choose(page,'attempt-1');await page.locator('#attribution').click();await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('PRIVILEGED'));
 assert.match(await page.locator('#inspector-artifact').innerText(),/operations\/f11-early\/closed\/F11-early.attribution.json$/);
 await tab(page,'technical');await page.locator('#inspector .technical-stage > summary').click();
 const row=page.locator('#inspector .scenario-row').filter({hasText:'F11 · Control temprano'});await row.locator('details > summary').click();await row.getByRole('button',{name:'F11-security-diff.txt',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('privileged'));await snap(page,output,'diff');
 // Pin a closed original while new provisional output arrives; preserve scroll/focus.
 let fixture=structuredClone(snapshot);fixture.session.session='synthetic-poll-fixture';
 await page.route('**/api/session',r=>r.fulfill({json:fixture}));
 await page.locator('.console-text').evaluate(n=>n.scrollTop=80);const scroll=await page.locator('.console-text').evaluate(n=>n.scrollTop);
 const before=await page.locator('.console-text').innerText();const wrap=page.getByRole('button',{name:'Desactivar ajuste de línea'});await wrap.evaluate(n=>n.focus({preventScroll:true}));
 fixture.session.active={operation:'f13'};fixture.activeProcessObserved=true;fixture.provisionalLog='SYNTHETIC PROVISIONAL MUST NOT REPLACE CLOSED';
 await wait(1900);assert.equal(await page.locator('.console-text').innerText(),before);assert.equal(await wrap.evaluate(n=>n===document.activeElement),true);assert.equal(await page.locator('.console-text').evaluate(n=>n.scrollTop),scroll);
 // Missing own artifact never resolves to the inherited copy in a later event.
 fixture=structuredClone(snapshot);fixture.events.find(e=>e.operation==='f11-early').artifacts=[];
 await page.goto(url+'/#demo');await page.reload();await page.waitForSelector('.attempt-row');await choose(page,'attempt-1');assert.equal(await page.locator('#blocking-log').isDisabled(),true);await page.locator('#technical-evidence').click();await tab(page,'files');assert.match(await page.locator('#inspector-content').innerText(),/No hay archivos/);
 // Offline excerpt + hostile-looking text: inert bytes, zero API requests.
 const offline=structuredClone(snapshot);offline.recorded=true;offline.savedUTC='synthetic offline rendering fixture';const event=offline.events.find(e=>e.operation==='f11-early'),file=event.artifacts.find(a=>a.path==='operations/f11-early/closed/F11-early.json');
 offline.offlineArtifacts={[file.id]:{text:'<img src=x onerror="window.injected=true"> SYNTHETIC PRIVILEGED',truncated:true}};
 const context=await browser.newContext({viewport:{width:1366,height:768}}),saved=await context.newPage();let calls=0;saved.on('request',()=>calls++);await saved.setContent(offlineHTML(offline));await choose(saved,'attempt-1');await saved.locator('#blocking-log').click();
 assert.match(await saved.locator('#inspector-content').innerText(),/EXTRACTO ACOTADO/);assert.equal(await saved.locator('.console-text img').count(),0);assert.match(await saved.locator('.console-text').innerText(),/<img/);
 await tab(saved,'scope');assert.equal(calls,0);await snap(saved,output,'offline');
 assert.equal(errors.length,0,errors.join('\n'));pass(output,{actualSession:snapshot.session.session,missingOwnFile:true,offlineRequests:calls,errors});
}finally{await browser.close();}
