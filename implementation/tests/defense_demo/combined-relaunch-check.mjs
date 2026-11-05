// Actual browser acceptance. Explicitly prepares one NEW defense-all laboratory.
// Never run against historical/consumed sessions. No simulated scenario results.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,wait} from './browser-support.mjs';
const [url,out]=process.argv.slice(2);if(!url||!out)throw Error('URL OUTPUT_DIRECTORY required');
mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),actions=[],errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const snapshot=async()=> (await page.request.get(url+'/api/session')).json();
async function act(selector,seconds=180){
 await page.waitForFunction(s=>!document.querySelector(s).disabled,selector);
 const accepted=page.waitForResponse(r=>r.url().endsWith('/api/action')&&r.request().method()==='POST');await page.locator(selector).click();const a=await(await accepted).json();assert.match(a.commandId,/^[a-f0-9]{32}$/);
 const start=Date.now();
 while(Date.now()-start<seconds*1000){const d=await snapshot(),c=d.commands.find(c=>c.commandId===a.commandId);if(c&&['COMPLETED','FAILED','TIMED_OUT','CANCELLED','UNKNOWN'].includes(c.status)){actions.push(c);writeFileSync(out+'/actions.json',JSON.stringify(actions,null,2));writeFileSync(out+'/snapshot.json',JSON.stringify(d));console.log(c.action,c.status,c.commandId);assert.equal(c.status,'COMPLETED',c.output||c.diagnostic);await wait(2200);return d;}await wait(1000);}
 throw Error('Timeout observing action '+a.commandId);
}
async function demo(){await page.goto(url+'/#demo');await page.waitForSelector('#combined-controls:not([hidden])');}
try{
 await demo();let d=await snapshot();assert.equal(d.session.profile,'defense-all');assert.equal(d.events.length,0);
 assert.equal(await page.locator('#combined-case option').count(),12);assert.equal(await page.locator('#early-controls').isVisible(),false);assert.equal(await page.locator('#repeat-controls').isVisible(),false);
 await page.screenshot({path:out+'/new-session.png',fullPage:true});
 await act('#combined-prepare',1200);await demo();await page.screenshot({path:out+'/prepared.png'});
 // F03 preparation shares the common image infrastructure and frozen database.
 await page.locator('#combined-case').selectOption('f03');await act('#combined-prepare',600);
 await demo();await act('#primary',240);
 d=await snapshot();assert.equal(d.session.demoResult,'CONFIRMED');assert.equal(d.session.f13Recovery,'confirmed');
 for(const op of ['f11-early','f13','f11-admission','comparison-admission']){const e=d.events.find(e=>e.operation===op);assert.equal(e.decision,'deny',op);assert.equal(e.expectation,'confirmed',op);}
 for(const op of ['accept','comparison-reference','comparison-legitimate'])assert.equal(d.events.find(e=>e.operation===op).decision,'allow',op);
 for(const id of ['f02','f12','f03']){await demo();await page.locator('#combined-case').selectOption(id);if(id!=='f03'){await act('#combined-prepare');await demo();}await act('#combined-run');}
 await demo();await page.locator('#combined-case').selectOption('f11-early');await act('#combined-run');
 await demo();await page.locator('#combined-case').selectOption('f11-admission');await act('#combined-run');
 await demo();await page.screenshot({path:out+'/all-results.png',fullPage:true});
 const log=page.locator('[data-attempt="comparison-g"]').getByRole('button',{name:'Ver log del bloqueo',exact:true});await log.click();await page.waitForSelector('.console-text');await wait(1000);
 const geometry=await page.locator('.console-text').evaluate(n=>{const r=n.getBoundingClientRect();return {visible:Math.min(innerHeight,r.bottom)-Math.max(0,r.top),font:getComputedStyle(n).fontSize};});assert.ok(geometry.visible>=400,JSON.stringify(geometry));writeFileSync(out+'/geometry.json',JSON.stringify(geometry));await page.screenshot({path:out+'/kyverno-console.png'});
 for(const [width,height] of [[1920,1080],[390,844]]){await page.setViewportSize({width,height});await demo();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/overview-'+width+'.png',fullPage:true});}
 await page.setViewportSize({width:1366,height:768});await demo();await page.locator('#more > summary').click();await act('[data-action=export]',300);
 assert.deepEqual(errors,[]);console.log('PASS: combined preparation, main sequence, three early comparisons, two new F11 attempts, original console and export.');
}finally{await browser.close();}
