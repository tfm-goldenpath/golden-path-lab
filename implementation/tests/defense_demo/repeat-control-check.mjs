// Rendering/action-wiring fixtures only. No laboratory actions are submitted.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,root,offlineHTML,wait} from './browser-support.mjs';
const catalogue=JSON.parse(readFileSync(root+'/demo/catalogue.json'));
const fixture={session:{session:'synthetic-repeat-controls',profile:'defense',prepared:true,demoResult:'CONFIRMED',operational:'COMPLETED',completed:[],source:{}},catalogue,events:['f11-early','f11-admission'].map((operation,i)=>({...catalogue.operations[operation],operation,sequence:i+1,phase:'live',operational:'COMPLETED',decision:'deny',expectation:'confirmed',artifacts:[]})),actionsEnabled:true,commands:[],artifacts:[]};
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});let submissions=[],busy=false,reason='',enabled=true;
 await page.route('http://demo.test/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/session')return route.fulfill({json:fixture});
  if(path==='/api/control')return route.fulfill({json:{session:fixture.session.session,csrf:'synthetic',busy,capabilities:Object.fromEntries(['case-f11-early','case-f11-admission'].map(k=>[k,{enabled:enabled&&!busy,reason}]))}});
  if(path==='/api/action'){submissions.push(route.request().postDataJSON());return route.fulfill({status:202,json:{accepted:true,commandId:'a'.repeat(32)}});}
  if(['/','/app.js','/model.js','/style.css'].includes(path))return route.fulfill({body:readFileSync(root+'/demo/'+(path==='/'?'index.html':path.slice(1))),contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});
  return route.fulfill({status:404,body:'Unavailable in synthetic fixture'});
 });
 await page.goto('http://demo.test/');await page.waitForFunction(()=>!document.getElementById('repeat-case-run').disabled);
 await page.locator('#repeat-case').selectOption('case-f11-admission');assert.equal(submissions.length,0);
 busy=true;await page.waitForFunction(()=>document.getElementById('repeat-case-run').disabled);assert.match(await page.locator('#repeat-case-status').innerText(),/operación sigue activa/);
 busy=false;enabled=false;reason='Source changed; prepare a new session';await page.waitForFunction(()=>document.getElementById('repeat-case-status').textContent.includes('Source changed'));
 enabled=true;await page.waitForFunction(()=>!document.getElementById('repeat-case-run').disabled);
 await page.locator('#repeat-case-run').evaluate(n=>{n.click();n.click();});await page.waitForSelector('#live-console:not([hidden])');
 assert.deepEqual(submissions,[{action:'case-f11-admission'}]);assert.ok(page.url().includes('command='+'a'.repeat(32)));
 const offline=await browser.newPage();let requests=0;offline.on('request',()=>requests++);await offline.setContent(offlineHTML(fixture));assert.equal(await offline.locator('#repeat-case-run').isDisabled(),true);assert.match(await offline.locator('#repeat-case-status').innerText(),/registrados/);assert.equal(requests,0);
 fixture.actionsEnabled=false;await page.goto('http://demo.test/');await page.waitForFunction(()=>document.getElementById('repeat-case-status').textContent.includes('Solo lectura'));assert.equal(await page.locator('#repeat-case-run').isDisabled(),true);
 for(const width of [1366,390]){await page.setViewportSize({width,height:768});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 console.log('PASS: repeat selector, backend gating, source mismatch, double click, command console, read-only, offline, narrow layout (synthetic UI only).');
}finally{await browser.close();}
