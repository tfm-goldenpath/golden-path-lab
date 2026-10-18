// Browser -> real action API -> real harmless subprocess. Synthetic adapter only;
// this is not a Kubernetes or F11 scenario execution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium,loaded,wait,snap,pass,offlineHTML} from './browser-support.mjs';
const [url,out='/tmp/action-browser']=process.argv.slice(2);
if(!url)throw Error('Requires the isolated server from test_action_lifecycle browser fixture');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));let posts=0;
page.on('request',r=>{if(r.method()==='POST')posts++;});
async function check(){await page.locator('[data-destination=demo]').click();if(!await page.locator('#more').evaluate(n=>n.open))await page.locator('#more > summary').click();const response=page.waitForResponse(r=>r.url().endsWith('/api/action')&&r.request().method()==='POST');await page.locator('[data-action=check]').click();const {commandId}=await(await response).json();await page.waitForFunction(id=>location.hash.includes(id)&&document.querySelector('#command-title').textContent.includes(id.slice(0,8)),commandId);}
async function completed(){await page.waitForFunction(()=>document.querySelector('#live-state').textContent.includes('Completada'));await page.waitForFunction(()=>document.querySelector('#live-output').textContent.includes('Observed test line 69'));}
try{
 await loaded(page,url);await check();await page.waitForFunction(()=>document.querySelector('#command-card').dataset.state==='RUNNING');
 await page.waitForFunction(()=>document.querySelector('#live-output').textContent.includes('Observed test line'));
 assert.match(await page.locator('#live-title').innerText(),/Comprobación del entorno/);
 const id=new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('command');assert.match(id,/^[a-f0-9]{32}$/);
 const height=await page.locator('#live-output').evaluate(n=>Math.max(0,Math.min(innerHeight,n.getBoundingClientRect().bottom)-Math.max(0,n.getBoundingClientRect().top)));
 assert.ok(height>=400,`Visible console: ${height}`);await snap(page,out,'check-running');
 await page.locator('#live-output').evaluate(n=>{n.scrollTop=30;n.dispatchEvent(new Event('scroll'));});await wait(1700);assert.equal(await page.locator('#live-output').evaluate(n=>n.scrollTop),30);
 await completed();await snap(page,out,'check-completed');assert.equal(await page.locator('#stop').isVisible(),false);
 assert.match(await page.locator('#live-progress').innerText(),/Comprobación completada/);
 await page.reload();await page.waitForSelector('#live-console:not([hidden])');await completed();assert.ok(page.url().includes(id));
 const secondTab=await context.newPage();await secondTab.goto(url+'/#demo/live?command='+id);await secondTab.waitForFunction(()=>document.querySelector('#live-output').textContent.includes('Observed test line 69'));await secondTab.close();
 await page.locator('[data-destination=demo]').click();await page.locator('#more > summary').click();assert.equal(await page.locator('[data-action=check]').isEnabled(),true);await snap(page,out,'next-check-enabled');await check();await completed();
 const id2=new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('command');assert.notEqual(id,id2);
 await check();await page.waitForFunction(()=>document.querySelector('#command-card').dataset.state==='RUNNING');await page.locator('#stop').click();await page.waitForFunction(()=>document.querySelector('#command-card').dataset.state==='CANCELLED');await snap(page,out,'cancelled');await page.getByRole('button',{name:'Acuse de detención'}).click();await page.waitForFunction(()=>document.querySelector('#live-output').textContent.includes('stopState'));assert.match(await page.locator('#live-output').innerText(),/REQUESTED|STOPPING|CLOSING/);
 await page.locator('[data-destination=demo]').click();await page.locator('#more > summary').click();assert.equal(await page.locator('[data-action=check]').isEnabled(),true);
 await page.goto(url+'/#demo/live?command='+id);await completed();
 for(const size of [{width:1920,height:1080},{width:390,height:844},{width:683,height:384}]){await page.setViewportSize(size);await wait(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await snap(page,out,'viewport-'+size.width);}
 await page.setViewportSize({width:1366,height:768});
 const snapshot=await(await page.request.get(url+'/api/session')).json();snapshot.offlineArtifacts={};
 for(const c of [...snapshot.commands,...snapshot.stopRequests||[]])for(const a of c.artifacts)snapshot.offlineArtifacts[a.id]={text:await(await page.request.get(url+'/artifact/'+a.id)).text(),truncated:false};
 for(const e of snapshot.events)for(const a of e.artifacts||[])if(a.path.endsWith('/output.log'))snapshot.offlineArtifacts[a.id]={text:await(await page.request.get(url+'/artifact/'+a.id)).text(),truncated:false};
 writeFileSync(out+'-snapshot.json',JSON.stringify(snapshot,null,2));writeFileSync(out+'-offline.html',offlineHTML(snapshot));const offline=await browser.newPage({viewport:{width:1366,height:768}});let network=0;offline.on('request',r=>{if(/^https?:/.test(r.url()))network++;});await offline.goto('file://'+out+'-offline.html#demo/live?command='+id);await offline.waitForSelector('#live-console:not([hidden])');await snap(offline,out,'offline');assert.equal(network,0);assert.equal(await offline.locator('#stop').isVisible(),false);await offline.close();
 assert.equal(posts,4);assert.deepEqual(errors,[]);pass(out,{boundary:'Authenticated web lifecycle with actual harmless subprocesses; synthetic readiness adapter; no laboratory validation',posts,visibleConsoleHeight:height,commands:snapshot.commands.map(c=>({id:c.commandId,status:c.status,operations:c.operations}))});
}finally{await browser.close();}
