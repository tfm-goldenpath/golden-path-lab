// UI-only synthetic observations. Never executes the coordinator.
import assert from 'node:assert/strict';
import {chromium,loaded,wait,snap,pass} from './browser-support.mjs';
const [url='http://127.0.0.1:8771',out='/tmp/demo-live']=process.argv.slice(2);
const original=await(await fetch(url+'/api/session')).json(),fixture=structuredClone(original);
fixture.session.session='synthetic-live-ui';fixture.events=fixture.events.map(e=>({...e,session:fixture.session.session}));fixture.session.active={operation:'f11-early',instance:'f11-early-test'};fixture.activeProcessObserved=true;fixture.actionsEnabled=true;fixture.provisionalLog=Array.from({length:90},(_,i)=>`SYNTHETIC line ${i} <script>inert</script>`).join('\n');fixture.provisionalLogModifiedUTC='2026-10-18T10:00:00Z';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:768}});let posts=0,disconnected=false;page.on("pageerror",e=>console.error(e));
await page.route('**/api/session',r=>disconnected?r.abort():r.fulfill({json:fixture}));
await page.route('**/api/control',r=>r.fulfill({json:{session:fixture.session.session,busy:true,nextOperation:'f13',csrf:'synthetic',capabilities:{stop:{enabled:true}}}}));
await page.route('**/api/action',r=>{posts++;return r.fulfill({status:202,json:{accepted:true}});});
try{await loaded(page,url);await page.locator('#open-live').click();await wait(100);assert.equal(await page.locator('#presentation').isVisible(),false);assert.match(await page.locator('#live-state').innerText(),/Proceso observado/);assert.ok(await page.locator('#live-output').evaluate(n=>n.getBoundingClientRect().height)>=400);await snap(page,out,'running-synthetic');
await page.locator('#live-output').evaluate(n=>{n.scrollTop=50;n.dispatchEvent(new Event('scroll'));});fixture.provisionalLog+='\nnew synthetic output';await wait(1800);assert.equal(await page.locator('#live-output').evaluate(n=>n.scrollTop),50);
fixture.activeProcessObserved=false;await wait(1700);assert.match(await page.locator('#live-state').innerText(),/desaparecido/);disconnected=true;await wait(1800);assert.match(await page.locator('#live-state').innerText(),/desactualizado/);assert.equal(await page.locator('#stop').isDisabled(),true);
disconnected=false;fixture.session.active=null;fixture.events.push({...fixture.events.find(e=>e.operation==='f11-early'),sequence:999});await wait(1800);assert.equal(await page.locator('#live-final').isVisible(),true);assert.match(await page.locator('#live-output').innerText(),/new synthetic output/);await page.locator('#live-final').click();await wait(100);await snap(page,out,'final');assert.equal(await page.locator('#inspector').isVisible(),true);assert.equal(posts,0);pass(out,{posts});}finally{await browser.close();}
