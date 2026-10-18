// Real browser checks of independent static controls in a NEW defense-all session.
// Does not claim Kubernetes/F03 execution. Cold preparation is attempted only
// to preserve the expected resource refusal on the current constrained machine.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,wait} from './browser-support.mjs';
const [url,out]=process.argv.slice(2);if(!url||!out)throw Error('Usage: combined-check.mjs URL OUTPUT_DIRECTORY');
mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],actions=[];
page.on('pageerror',e=>errors.push(String(e)));
const snapshot=async()=> (await page.request.get(url+'/api/session')).json();
async function clickAction(selector){
 await page.waitForFunction(s=>!document.querySelector(s).disabled,selector);
 const accepted=page.waitForResponse(r=>r.url().endsWith('/api/action')&&r.request().method()==='POST');await page.locator(selector).click();
 const receipt=await(await accepted).json();assert.match(receipt.commandId,/^[a-f0-9]{32}$/);
 for(let i=0;i<120;i++){
  const d=await snapshot(),c=d.commands.find(c=>c.commandId===receipt.commandId);
  if(c&&['COMPLETED','FAILED','CANCELLED','TIMED_OUT','UNKNOWN'].includes(c.status)){actions.push(c);writeFileSync(out+'/actions.json',JSON.stringify(actions,null,2));await page.waitForFunction(()=>!document.getElementById('action-status').textContent.includes('Solicitud en curso'));await wait(1800);return {d,c};}
  await wait(500);
 }
 throw Error('Action did not finish');
}
try{
 await page.goto(url+'/#demo');await page.waitForSelector('.attempt-row');let d=await snapshot();assert.equal(d.session.profile,'defense-all');assert.equal(d.events.length,0);
 for(const id of ['attempt-1','attempt-2','attempt-3','attempt-4','comparison-r','comparison-g','comparison-l06','early-f02-negative-1','early-f12-negative-1','early-f03-negative-1'])assert.equal(await page.locator(`[data-attempt="${id}"]`).count(),1,id);
 await page.screenshot({path:out+'/all-cases-pending.png',fullPage:true});
 for(const caseId of ['f02','f12']){
  await page.goto(url+'/#demo');await page.locator('#combined-case').selectOption(caseId);
  assert.equal((await clickAction('#combined-prepare')).c.status,'COMPLETED');
  await page.goto(url+'/#demo');assert.equal((await clickAction('#combined-run')).c.status,'COMPLETED');
  d=await snapshot();assert.deepEqual(d.events.filter(e=>e.comparisonCase===caseId).map(e=>e.decision),['deny','allow']);assert.equal(d.session.prepared,false);
  await page.goto(url+'/#demo');await page.waitForFunction(()=>!document.getElementById('primary').disabled);
  await page.locator(`[data-attempt="early-${caseId}-negative-1"]`).getByRole('button',{name:'Ver log del bloqueo',exact:true}).click();
  await page.waitForFunction(code=>document.querySelector('.console-text')?.textContent.includes(code),caseId==='f02'?'ACTION_SHA':'DIGEST');
  const geometry=await page.locator('.console-text').evaluate(n=>{const r=n.getBoundingClientRect();return {visible:Math.min(innerHeight,r.bottom)-Math.max(0,r.top),font:getComputedStyle(n).fontSize};});assert.ok(geometry.visible>=400,JSON.stringify(geometry));
  writeFileSync(out+'/'+caseId+'-geometry.json',JSON.stringify(geometry));await page.screenshot({path:out+'/'+caseId+'-console.png'});
 }
 await page.goto(url+'/#demo');await page.locator('#combined-case').selectOption('f03');assert.equal(await page.locator('#combined-prepare').isDisabled(),true);assert.match(await page.locator('#combined-status').innerText(),/laboratorio común/);
 // Guard this acceptance from accidentally launching an expensive lab elsewhere.
 const resources=await page.request.get(url+'/api/control');assert.equal(resources.status(),200);
 const {execFileSync}=await import('node:child_process');const free=Number(execFileSync('python3',['-c','import os; s=os.statvfs("/workspaces"); print(s.f_bavail*s.f_frsize)'],{encoding:'utf8'}));
 assert.ok(free<8*1024**3,'This resource-refusal check requires less than 8 GiB; do not launch preparation implicitly');
 const failed=await clickAction('#primary');assert.equal(failed.c.status,'FAILED');assert.match(failed.c.output||failed.c.diagnostic,/RESOURCE_EXHAUSTED|Insufficient disk\/inodes for preparation and evidence reserve/);assert.equal(failed.d.session.prepared,false);assert.equal(failed.d.events.some(e=>e.operation==='initialize'&&e.operational!=='NOT_REACHED'),false);
 await page.screenshot({path:out+'/resource-refusal.png'});
 await page.goto(url+'/#demo');await page.locator('#combined-case').selectOption('f02');assert.equal((await clickAction('#combined-run')).c.status,'COMPLETED');
 d=await snapshot();assert.equal(d.events.filter(e=>e.operation==='early-f02-negative').length,2);
 assert.equal(d.events.find(e=>e.operation==='f13').operational,'NOT_REACHED');
 await page.goto(url+'/#demo');await page.screenshot({path:out+'/combined-with-real-static-results.png',fullPage:true});
 for(const [width,height] of [[1920,1080],[390,844]]){await page.setViewportSize({width,height});await page.goto(url+'/#demo');await page.waitForSelector('.attempt-row');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/overview-'+width+'.png',fullPage:true});}
 await page.setViewportSize({width:1366,height:768});await page.goto(url+'/#demo');await page.locator('#more > summary').click();assert.equal((await clickAction('[data-action=export]')).c.status,'COMPLETED');
 d=await snapshot();writeFileSync(out+'/snapshot.json',JSON.stringify(d));assert.deepEqual(errors,[]);console.log('PASS: actual F02/F12, repeated F02 after resource refusal, all profile rows, wide logs and export. Kubernetes and F03 unexecuted.');
}finally{await browser.close();}
