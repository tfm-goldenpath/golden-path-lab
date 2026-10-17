// Read-only retained evidence and explicitly labelled offline UI fixtures. No lab writes.
import assert from 'node:assert/strict';
import {chromium,loaded,choose,tab,explore,snap,pass,wait,offlineHTML} from './browser-support.mjs';
const [url,output]=process.argv.slice(2);if(!output)throw Error('Usage: layout-check.mjs READ_ONLY_URL OUTPUT_PREFIX');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await loaded(page,url);assert.equal(await page.locator('.operator').isVisible(),false);assert.equal(await page.locator('#mode').isVisible(),false);
 assert.match(await page.locator('#timing').innerText(),/Tiempo registrado de ejecución/);await snap(page,output,'summary');
 await page.locator('.attempt-row[data-attempt="attempt-1"] .segment.blocked').click();
 await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('ESCALATION'));
 assert.equal(await page.locator('#presentation').isVisible(),false);assert.match(page.url(),/#demo\/attempt\/attempt-1\/console/);
 const measure=()=>page.locator('.console-text').evaluate(n=>{const r=n.getBoundingClientRect();return {visibleHeight:Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top)),top:r.top,bottom:r.bottom,fontSize:getComputedStyle(n).fontSize,pageWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};});
 const conftest=await measure();assert.ok(conftest.visibleHeight>=400,JSON.stringify(conftest));assert.equal(conftest.fontSize,'15px');assert.ok(conftest.pageWidth<=conftest.viewportWidth);await snap(page,output,'conftest');
 const original=await page.locator('.console-text').innerText();await page.locator('.console-text').evaluate(n=>{n.scrollTop=100;n.focus();});const scroll=await page.locator('.console-text').evaluate(n=>n.scrollTop);
 assert.ok(scroll>0,'This check requires a genuinely scrolled original');
 const liveFixture=await (await page.request.get(url+'/api/session')).json();liveFixture.session.active={operation:'comparison-admission'};liveFixture.activeProcessObserved=true;liveFixture.provisionalLog='SYNTHETIC NEW WORKER; NOT THE SELECTED CLOSED LOG';
 await page.route('**/api/session',r=>r.fulfill({json:liveFixture}));
 await wait(1900);assert.equal(await page.locator('.console-text').evaluate(n=>n.scrollTop),scroll);assert.equal(await page.locator('.console-text').evaluate(n=>n===document.activeElement),true);
 await page.unroute('**/api/session');await wait(1600);
 await page.locator('#attempt-sidebar button').filter({hasText:'Admisión independiente'}).click();await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('restricted-containers'));
 assert.match(await page.locator('#inspector-artifact').textContent(),/runtime\/F11\/Deployment-UPDATE\/response.log/);assert.ok(!(await page.locator('.console-text').innerText()).includes('"failures":'));
 const kyverno=await measure();assert.ok(kyverno.visibleHeight>=400,JSON.stringify(kyverno));await snap(page,output,'kyverno');
 await page.goBack();await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('ESCALATION'));assert.equal(await page.locator('.console-text').innerText(),original);assert.equal(await page.locator('.console-text').evaluate(n=>n.scrollTop),scroll);
 await page.goForward();await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('restricted-containers'));
 await tab(page,'technical');const stage=page.locator('.technical-stage[data-stage="admission"]');assert.match(await stage.locator(':scope > summary').innerText(),/F11.*bloqueo en Kyverno/);assert.equal(await stage.getAttribute('open'),null);await snap(page,output,'technical');
 await stage.locator(':scope > summary').click();await explore(page,'scenarios');assert.equal(await page.locator('#inspector').isVisible(),false);assert.equal(await page.locator('#presentation').isVisible(),false);assert.equal(await page.locator('.catalogue-list button').count(),20);
 await page.getByRole('searchbox').fill('L06');await page.locator('.catalogue-list button').click();await explore(page,'workflows');assert.equal(await page.locator('.catalogue-list button').count(),4);await page.getByRole('button',{name:'golden-path.yml',exact:true}).click();await page.getByText('YAML capturado · solo configuración',{exact:true}).click();await snap(page,output,'workflows');
 await page.goBack();assert.equal(await page.getByRole('searchbox').inputValue(),'L06');await page.goBack();assert.equal(await stage.getAttribute('open'),'');
 await page.locator('#close-inspector').click();assert.equal(await page.locator('.attempt-row.selected').getAttribute('data-attempt'),'comparison-g');assert.equal(await page.locator('#presentation').isVisible(),true);
 await choose(page,'attempt-1');await tab(page,'console');await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('ESCALATION'));const deep=page.url();await page.reload();await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('ESCALATION'));assert.equal(page.url(),deep);
 await page.locator('#toggle-sidebar').click();assert.equal(await page.locator('#attempt-sidebar').isVisible(),false);await page.locator('#toggle-sidebar').click();
 const viewports=[];for(const [width,height] of [[1920,1080],[390,844]]){await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));viewports.push({width,height,...await measure()});await snap(page,output,'width-'+width);}
 // Browser layout at 200%: half CSS viewport, double pixel density; this is emulation, not a human zoom review.
 const zoomContext=await browser.newContext({viewport:{width:683,height:384},deviceScaleFactor:2});const zoom=await zoomContext.newPage();await zoom.goto(deep);await zoom.waitForSelector('.console-text');assert.ok(await zoom.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await snap(zoom,output,'zoom-200-reflow');await zoomContext.close();
 await page.setViewportSize({width:1366,height:768});await page.goto(url+'/#demo/attempt/attempt-1/console?op=f11-early&artifact='+ 'a'.repeat(24));await page.waitForSelector('#inspector-content .empty');assert.match(await page.locator('#inspector-content').innerText(),/No se sustituye/);
 // Preparation is separate; polling and return must not replace the chosen attempt.
 await choose(page,'comparison-l06');await page.locator('#provenance > summary').click();await page.locator('#preparation').click();await wait(1700);
 assert.equal(await page.locator('#result-title').innerText(),'Preparación previa');
 await page.locator('#close-inspector').click();assert.equal(await page.locator('.attempt-row.selected').getAttribute('data-attempt'),'comparison-l06');
 // Self-contained offline navigation, captured content only; hostile bytes remain inert.
 const snapshot=await (await page.request.get(url+'/api/session')).json(),e=snapshot.events.find(e=>e.operation==='f11-early'),a=e.artifacts.find(a=>a.path==='operations/f11-early/closed/F11-early.json');const log=await (await page.request.get(url+'/artifact/'+a.id)).text();
 snapshot.offlineArtifacts={[a.id]:{text:log,truncated:false}};snapshot.savedUTC='read-only layout fixture using retained original';
 const offline=await browser.newPage({viewport:{width:1366,height:768}});let requests=0;offline.on('request',()=>requests++);await offline.setContent(offlineHTML(snapshot));await offline.locator('.attempt-row[data-attempt="attempt-1"] .segment.blocked').click();assert.match(await offline.locator('.console-text').innerText(),/ESCALATION/);const offlineHeight=await offline.locator('.console-text').evaluate(n=>{const r=n.getBoundingClientRect();return Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top));});assert.ok(offlineHeight>=400,String(offlineHeight));await snap(offline,output,'offline');await explore(offline,'workflows');await offline.goBack();assert.match(await offline.locator('.console-text').innerText(),/ESCALATION/);assert.equal(requests,0);assert.equal(await offline.locator('.operator').isVisible(),false);
 assert.equal(posts,0);assert.deepEqual(errors,[]);pass(output,{conftest,kyverno,viewports,zoom:'200% layout emulation: 683x384 CSS, DPR 2',posts,offlineHeight,offlineRequests:requests,errors});
}finally{await browser.close();}
