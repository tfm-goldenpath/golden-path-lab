// Read-only real captures. No workflow dispatch or laboratory operation.
import assert from 'node:assert/strict';
import {chromium,loaded,snap,pass,offlineHTML} from './browser-support.mjs';
const [url='http://127.0.0.1:8771',out='/tmp/workflow-refresh']=process.argv.slice(2);
const snapshot=await(await fetch(url+'/api/session')).json();
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:768}});
let posts=0;const errors=[];page.on('request',r=>{if(r.method()==='POST')posts++;});page.on('pageerror',e=>errors.push(e.message));
try{
 await loaded(page,url);await page.locator('[data-destination=workflows]').click();
 for(const workflow of ['ci.yml','golden-path.yml','lane-a-validation.yml']){
  await page.locator('#workflow-choice').selectOption(workflow);
  const captures=snapshot.githubObservations.filter(o=>o.workflow===workflow&&o.run).sort((a,b)=>b.run.created_at.localeCompare(a.run.created_at));
  assert.ok(captures.length);assert.match(await page.locator('#exploration-content').innerText(),new RegExp(captures[0].run.head_sha));
  assert.doesNotMatch(await page.locator('#exploration-content').innerText(),/ninguna importada/);await snap(page,out,workflow);
 }
 await page.locator('#workflow-choice').selectOption('paired-rg.yml');await page.locator('[data-workflow-tab=attestations]').click();
 assert.equal(await page.locator('.attestation-card').count(),4);
 assert.match(await page.locator('#exploration-content').innerText(),/verificación histórica registrada/);
 assert.match(await page.locator('#exploration-content').innerText(),/vía B/);
 const card=page.locator('.attestation-card').first();await card.locator('details').filter({has:page.locator('summary',{hasText:'CI-authorized-0.verify.log'})}).locator('summary').click();
 assert.match(await card.innerText(),/Verified OK/);await snap(page,out,'paired-attestations');
 for(const viewport of [{width:1920,height:1080},{width:390,height:844},{width:683,height:384}]){
  await page.setViewportSize(viewport);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await snap(page,out,'width-'+viewport.width);
 }
 const offline=await browser.newPage({viewport:{width:1366,height:768}});let network=0;offline.on('request',()=>network++);
 await offline.setContent(offlineHTML(snapshot));await offline.locator('[data-destination=workflows]').click();await offline.locator('#workflow-choice').selectOption('paired-rg.yml');await offline.locator('[data-workflow-tab=attestations]').click();assert.equal(await offline.locator('.attestation-card').count(),4);await snap(offline,out,'offline');assert.equal(network,0);assert.equal(posts,0);assert.deepEqual(errors,[]);
 pass(out,{posts,offlineRequests:network,errors,realRuns:snapshot.githubObservations.filter(o=>o.run).map(o=>o.run.id)});
}finally{await browser.close();}
