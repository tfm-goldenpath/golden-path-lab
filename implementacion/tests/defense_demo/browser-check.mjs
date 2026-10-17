// Browser verification over a real session; does not launch laboratory operations.
// Playwright is an optional development-only dependency, outside the dashboard.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const require=createRequire(root+'/.tmp/f11-browser-tools/package.json');
const {chromium}=require('playwright');
const [url,output]=process.argv.slice(2);
if(!url||!output)throw Error('Usage: node browser-check.mjs PRIVATE_URL OUTPUT_PREFIX');
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>document.querySelectorAll('#attempts article').length===4);
 await page.screenshot({path:output+'.png',fullPage:false});
 const bounds=await page.locator('#attempts').boundingBox();
 assert.ok(bounds.y+bounds.height<768,'Four comparison cards must fit in the first viewport');
 assert.equal(await page.locator('#prepared-summary').getAttribute('open'),null);
 assert.match(await page.locator('#attempts').innerText(),/L06.*alcance parcial/s);
 assert.match(await page.locator('#attempts').innerText(),/R conserva RBAC/);
 await page.selectOption('#attempt-filter','comparison-g');
 await page.getByRole('button',{name:'02 · Detalle técnico'}).click();
 const receipts=await page.locator('#receipts').innerText();
 assert.ok(!receipts.includes('comparison-reference'));
 assert.equal(errors.length,0,errors.join('\n'));
 // Synthetic display-only coverage. The server is never given these fixtures.
 const fixture=await (await fetch(url+'/api/session')).json();
 fixture.session={...fixture.session,session:'synthetic-ui-test-only',operational:'COMPLETED',prepared:true,demoResult:'CONFIRMED',liveDurationSeconds:42};
 fixture.events=['comparison-reference','f11-early','comparison-admission','comparison-legitimate'].map((operation,index)=>{
  const spec=fixture.catalogue.operations[operation];
  return {...spec,operation,sequence:index+1,operational:'COMPLETED',decision:spec.expected,expectation:'confirmed',durationSeconds:1,phase:'live',exitCode:0,artifacts:[]};
 });
 await page.route('**/api/session',route=>route.fulfill({json:fixture}));
 await page.reload();await page.waitForFunction(()=>document.querySelector('#session').textContent.includes('synthetic-ui-test-only'));
 await page.screenshot({path:output+'-synthetic-completed.png',fullPage:false});
 const completedBounds=await page.locator('#attempts').boundingBox();
 assert.ok(completedBounds.y+completedBounds.height<768,'Completed cards must fit');
 assert.equal(await page.locator('#attempts .deny').count(),2);
 assert.equal(await page.locator('#attempts .decision.deny').first().evaluate(e=>getComputedStyle(e).color),'rgb(174, 41, 47)');
 assert.equal(await page.locator('#attempts .decision.allow').first().evaluate(e=>getComputedStyle(e).color),'rgb(35, 112, 76)');
 assert.match(await page.locator('#attempts').innerText(),/L06 — actualización legítima demostrada; alcance parcial/);
 writeFileSync(output+'.json',JSON.stringify({status:'PASS',boundary:'Real-browser rendering and attempt selection only; no delivery execution',viewport:{width:1366,height:768},cards:bounds,completedCards:completedBounds,syntheticDisplayCoverage:true,errors},null,2)+'\n');
} finally {await browser.close();}
