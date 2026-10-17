import assert from 'node:assert/strict';
import {chromium,loaded,choose,snap,pass} from './browser-support.mjs';
const [url,output]=process.argv.slice(2);if(!output)throw Error('Usage: browser-check.mjs COMPARISON_URL OUTPUT_PREFIX');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await loaded(page,url);assert.equal(await page.locator('.attempt-row').count(),4);
 assert.ok((await page.locator('#attempts').boundingBox()).y+(await page.locator('#attempts').boundingBox()).height<768);
 for(const [id,name] of [['attempt-1','early'],['comparison-g','admission'],['comparison-r','reference'],['comparison-l06','legitimate']]){await choose(page,id);await snap(page,output,name);}
 assert.match(await page.locator('#inspector-content').innerText(),/alcance parcial/);
 await choose(page,'attempt-1');await page.locator('#blocking-log').click();await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('PRIVILEGED'));
 await snap(page,output,'inspector');assert.match(await page.locator('#inspector-artifact').innerText(),/operations\/f11-early\/closed\/F11-early.json/);
 await page.locator('#close-inspector').click();assert.equal(await page.locator('#presentation').isVisible(),true);assert.equal(await page.locator('.attempt-row.selected').getAttribute('data-attempt'),'attempt-1');
 for(const [width,height] of [[1920,1080],[390,844]]){await page.setViewportSize({width,height});await snap(page,output,'viewport-'+width);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.equal(errors.length,0,errors.join('\n'));pass(output,{viewportChecks:[1366,1920,390],session:url,errors});
}finally{await browser.close();}
