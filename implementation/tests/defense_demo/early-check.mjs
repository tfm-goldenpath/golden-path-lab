// Actual browser acceptance on a NEW early-security session. No substituted adapters.
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {chromium,wait} from './browser-support.mjs';
const [url,out]=process.argv.slice(2);if(!url||!out)throw Error('Usage: early-check.mjs http://127.0.0.1:PORT OUTPUT_DIRECTORY');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:768}}),observations=[];let posts=0;
page.on('request',r=>{if(r.method()==='POST')posts++;});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
async function snapshot(){return (await page.request.get(url+'/api/session')).json();}
async function action(caseId,prepare=false){
 await page.goto(url+'/#demo');await page.waitForSelector('#early-controls:not([hidden])');await page.locator('#early-case').selectOption(caseId);
 const button=page.locator(prepare?'#early-prepare':'#early-run');await page.waitForFunction(id=>!document.getElementById(id).disabled,prepare?'early-prepare':'early-run');
 const before=performance.now();const response=page.waitForResponse(r=>r.url().endsWith('/api/action')&&r.request().method()==='POST');await button.click();const accepted=await(await response).json();assert.match(accepted.commandId,/^[a-f0-9]{32}$/);
 console.log(JSON.stringify({caseId,prepare,commandId:accepted.commandId}));let previous='';
 for(;;){const d=await snapshot(),c=d.commands.find(c=>c.commandId===accepted.commandId);if(c?.activeOperation?.operation!==previous){previous=c?.activeOperation?.operation;console.log(JSON.stringify({operation:previous,status:c?.status}));}
 if(c&&['COMPLETED','FAILED','CANCELLED','TIMED_OUT','UNKNOWN'].includes(c.status)){
  const record={caseId,prepare,command:c,session:d.session.session,source:d.session.source,browserSeconds:(performance.now()-before)/1000};observations.push(record);writeFileSync(out+'/actions.json',JSON.stringify(observations,null,2));await wait(1600);await page.screenshot({path:out+'/'+caseId+'-'+(prepare?'prepare':'run')+'-'+observations.length+'.png'});assert.equal(c.status,'COMPLETED',c.diagnostic||c.output);return d;
 }
 assert.ok(performance.now()-before<(prepare?1200000:150000),'Observation deadline exceeded');await wait(1500);}
}
try{
 await page.goto(url);await page.waitForSelector('.attempt-row');const initial=await snapshot();assert.equal(initial.session.profile,'early-security');assert.equal(initial.events.length,0,'Requires new session; do not overwrite historical attempts');
 for(const caseId of ['f02','f12','f03']){
  await action(caseId,true);const d=await action(caseId);
  const pair=d.events.filter(e=>e.comparisonCase===caseId);assert.deepEqual(pair.map(e=>e.decision),['deny','allow']);assert.ok(pair.every(e=>e.expectation==='confirmed'));
  await page.goto(url+'/#demo');await page.locator('#early-case').selectOption(caseId);await page.screenshot({path:out+'/'+caseId+'-comparison.png'});
  const negative=page.locator(`[data-attempt="early-${caseId}-negative-1"]`);await negative.getByRole('button',{name:'Ver log del bloqueo',exact:true}).click();await page.waitForSelector('.console-text');await wait(300);assert.ok((await page.locator('.console-text').innerText()).length>20);await page.screenshot({path:out+'/'+caseId+'-original.png'});
 }
 const before=await snapshot();await action('f02');const after=await snapshot();assert.deepEqual(after.events.slice(0,before.events.length),before.events);assert.equal(after.events.filter(e=>e.operation==='early-f02-negative').length,2);
 // Interrupt a read-only re-scan, never a build, signature or evidence issuance.
 await page.goto(url+'/#demo');await page.locator('#early-case').selectOption('f03');await page.waitForFunction(()=>!document.getElementById('early-run').disabled);
 const launch=page.waitForResponse(r=>r.url().endsWith('/api/action')&&r.request().method()==='POST');await page.locator('#early-run').click();const cancelId=(await(await launch).json()).commandId;
 let active;for(let i=0;i<100;i++){active=await snapshot();if(active.session.active?.commandId===cancelId&&active.activeProcessObserved===true)break;await wait(100);}
 assert.equal(active.session.active?.commandId,cancelId);assert.equal(active.activeProcessObserved,true);
 await page.waitForFunction(()=>!document.getElementById('stop').hidden&&!document.getElementById('stop').disabled);
 await page.screenshot({path:out+'/f03-live-repeat.png'});await page.locator('#stop').click();
 let stopped;for(let i=0;i<60;i++){const d=await snapshot();stopped=d.commands.find(c=>c.commandId===cancelId);if(['CANCELLED','COMPLETED','FAILED'].includes(stopped?.status))break;await wait(500);}
 writeFileSync(out+'/stop.json',JSON.stringify(stopped,null,2));assert.ok(['CANCELLED','COMPLETED'].includes(stopped?.status),'Stop must preserve cancellation or a genuine late completion');
 await action('f03');
 await page.goto(url+'/#demo');await page.locator('#more > summary').click();const response=page.waitForResponse(r=>r.url().endsWith('/api/action')&&r.request().method()==='POST');await page.locator('[data-action=export]').click();const exportId=(await(await response).json()).commandId;
 let saved;for(let i=0;i<120;i++){saved=await snapshot();const c=saved.commands.find(c=>c.commandId===exportId);if(c?.status==='COMPLETED')break;if(c?.status==='FAILED')throw Error(c.diagnostic);await wait(1000);}
 assert.ok(saved.session.exports.length);writeFileSync(out+'/snapshot.json',JSON.stringify(saved));assert.deepEqual(errors,[]);writeFileSync(out+'/summary.json',JSON.stringify({session:saved.session.session,posts,errors,observations:observations.map(o=>({case:o.caseId,prepare:o.prepare,command:o.command.commandId,seconds:o.command.durationSeconds}))},null,2));console.log('PASS: actual early profile browser actions, independent repetition, original logs and export.');
}finally{await browser.close();}
