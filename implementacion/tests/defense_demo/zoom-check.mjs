// Native Chromium tab zoom, using the installed browser and a local test-only extension.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {chromium,snap,pass} from './browser-support.mjs';
const [url,output]=process.argv.slice(2);if(!output||!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url))throw Error('Usage: zoom-check.mjs LOOPBACK_URL OUTPUT_PREFIX');
const directory=mkdtempSync(tmpdir()+'/gp-layout-zoom-'),extension=directory+'/extension';mkdirSync(extension);
writeFileSync(extension+'/manifest.json',JSON.stringify({manifest_version:3,name:'Local layout zoom check',version:'1.0',permissions:['tabs'],background:{service_worker:'worker.js'}}));
writeFileSync(extension+'/worker.js','chrome.runtime.onInstalled.addListener(() => {});');
const context=await chromium.launchPersistentContext(directory+'/profile',{channel:'chromium',headless:true,viewport:{width:1366,height:768},args:['--disable-extensions-except='+extension,'--load-extension='+extension]});
try{
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const page=await context.newPage();await page.goto(url+'/#demo/attempt/attempt-1/console?op=f11-early');await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('ESCALATION'));
 const factor=await worker.evaluate(async origin=>{const tabs=await chrome.tabs.query({url:origin+'/*'});await chrome.tabs.setZoom(tabs[0].id,2);return chrome.tabs.getZoom(tabs[0].id);},url.replace(/\/$/,''));assert.equal(factor,2);
 await page.waitForFunction(()=>innerWidth<700);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('#mobile-attempt').isVisible(),true);
 await snap(page,output,'header');await page.locator('.console-text').focus();await page.locator('.console-text').evaluate(n=>n.scrollIntoView({block:'start'}));await page.waitForTimeout(300);const consoleRect=await page.locator('.console-text').evaluate(n=>({rect:n.getBoundingClientRect().toJSON(),scroll:scrollY,documentHeight:document.documentElement.scrollHeight,visibleText:n.textContent.includes('ESCALATION')}));assert.ok(consoleRect.rect.bottom>0&&consoleRect.rect.top<384,JSON.stringify(consoleRect));const cdp=await context.newCDPSession(page);const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(output+'-console.png',Buffer.from(shot.data,'base64'));await cdp.detach();
 assert.equal(await page.locator('.console-text').evaluate(n=>n===document.activeElement),true);
 const metrics=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,documentWidth:document.documentElement.scrollWidth}));pass(output,{nativeTabZoom:factor,metrics,consoleRect,temporaryProfile:directory});
}finally{await context.close();}
