// Read-only layout regression over a retained real command, never a new execution.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {chromium,wait,snap} from './browser-support.mjs';
const [url,id,out='/tmp/command-console']=process.argv.slice(2);
if(!url||!id)throw Error('Usage: command-console-check.mjs URL COMMAND_ID OUTPUT_PREFIX');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto(url+'/#demo/live?command='+id);
 await page.waitForSelector('#live-console:not([hidden])');await wait(1800);
 const dimensions=await page.locator('#live-output').evaluate(n=>{const r=n.getBoundingClientRect();return {visibleHeight:Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top)),fontSize:getComputedStyle(n).fontSize};});
 await snap(page,out,'closed');assert.ok(dimensions.visibleHeight>=400,JSON.stringify(dimensions));
 const text=await page.locator('#live-output').innerText();assert.ok(text.length>0);
 await page.locator('#command-details > summary').click();
 assert.ok(await page.locator('#command-operations button').count()>3);
 await page.locator('#command-details > summary').focus();await wait(1700);
 assert.equal(await page.locator('#command-details').getAttribute('open'),'');
 assert.equal(await page.locator('#command-details > summary').evaluate(n=>n===document.activeElement),true);
 assert.equal(await page.locator('#live-output').innerText(),text);
 await page.locator('#command-details > summary').click();
 for(const viewport of [{width:1920,height:1080},{width:390,height:844},{width:683,height:384}]){
  await page.setViewportSize(viewport);await wait(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await snap(page,out,'width-'+viewport.width);
 }
 assert.equal(posts,0);writeFileSync(out+'.json',JSON.stringify({status:'PASS',boundary:'Rendering retained command; no execution',commandId:id,dimensions,posts},null,2));
}finally{await browser.close();}
