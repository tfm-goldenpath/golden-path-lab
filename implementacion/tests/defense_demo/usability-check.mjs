// Browser-only checks. Synthetic display fixtures never reach the coordinator.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
const root=resolve(import.meta.dirname,'../..');
const require=createRequire(root+'/.tmp/f11-browser-tools/package.json');
const {chromium}=require('playwright');
const [defenseURL,comparisonURL,output]=process.argv.slice(2);
if(!output)throw Error('Usage: usability-check.mjs DEFENSE_URL COMPARISON_URL OUTPUT_PREFIX');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(defenseURL);await page.waitForFunction(()=>document.querySelectorAll('#attempts article').length===4);
 assert.match(await page.locator('#demo-title').innerText(),/F11 y F13/);
 await page.getByRole('button',{name:'02 · Detalle técnico'}).click();
 const titles=await page.locator('.scenario-heading h3').allTextContents();
 assert.ok(titles.some(t=>t.startsWith('F13')));
 assert.ok(!titles.some(t=>/L06|R · Ejecutar|UPDATE independiente/.test(t)),'Other profile operations must not appear as unexecuted');
 const admission=page.locator('.technical-stage[data-stage="admission"]');
 await admission.locator(':scope > summary').click();await admission.scrollIntoViewIfNeeded();
 await page.screenshot({path:output+'-defense.png',fullPage:false});
 assert.ok(await admission.locator('.outcome-badge.blocked').count()>=2);
 assert.equal(await admission.locator('.outcome-badge.blocked').first().evaluate(e=>getComputedStyle(e).color),'rgb(174, 41, 47)');
 assert.ok(await admission.locator('.scenario-heading h3').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=17);
 await page.goto(comparisonURL);await page.waitForFunction(()=>document.querySelectorAll('#attempts article').length===4);
 const cards=await page.locator('#attempts').boundingBox();assert.ok(cards.y+cards.height<768);
 await page.screenshot({path:output+'-comparison.png',fullPage:false});
 const fixture=await (await fetch(comparisonURL+'/api/session')).json();
 fixture.session={...fixture.session,session:'synthetic-unreached-ui-only',active:null,operational:'ERROR',prepared:false};
 fixture.events=fixture.events.filter(e=>e.phase!=='live');
 for(const [operation,status] of [['f11-early','ERROR'],['comparison-admission','NOT_REACHED']]){
  fixture.events.push({...fixture.catalogue.operations[operation],operation,phase:'live',operational:status,decision:'indeterminate',expectation:'unconfirmed',durationSeconds:null,artifacts:[],reason:'Synthetic earlier failure'});
 }
 await page.route('**/api/session',route=>route.fulfill({json:fixture}));await page.reload();
 await page.waitForFunction(()=>document.querySelector('#session').textContent.includes('synthetic-unreached-ui-only'));
 assert.match(await page.locator('#attempts').innerText(),/No alcanzado/);
 assert.match(await page.locator('#attempts').innerText(),/Sin ejecutar/);
 await page.getByRole('button',{name:'02 · Detalle técnico'}).click();
 const unobserved=page.locator('.scenario-row').filter({has:page.locator('h3').filter({hasText:'F11 · G admisión: UPDATE independiente'})});
 assert.equal(await unobserved.getAttribute('data-tone'),'warning');
 await page.locator('.technical-stage').filter({has:unobserved}).locator(':scope > summary').click();
 assert.match(await unobserved.innerText(),/No se envió esta prueba/);
 assert.ok(!(await page.locator('#technical-stages').innerText()).includes('F13 ·'));
 assert.equal(errors.length,0,errors.join('\n'));
 writeFileSync(output+'.json',JSON.stringify({status:'PASS',boundary:'Browser rendering only; no laboratory operation',viewport:'1366x768',profileIsolation:true,warningDistinctFromUnexecuted:true,colorsAndTitles:true,errors},null,2)+'\n');
}finally{await browser.close();}
