// Read-only regression using actual retained output, never a new scenario run.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {chromium, wait, snap} from './browser-support.mjs';
const [url, output = '/tmp/closed-console'] = process.argv.slice(2);
if (!url) throw Error('Usage: closed-console-check.mjs LOOPBACK_URL OUTPUT_PREFIX');
const browser = await chromium.launch({headless:true});
try {
 const page = await browser.newPage({viewport:{width:1366,height:768}});
 let posts = 0;
 page.on('request', r => { if (r.method() === 'POST') posts++; });
 await page.goto(url + '/#demo/attempt/attempt-1/console?op=f11-early');
 await page.waitForFunction(() => document.querySelector('.console-text')?.textContent.includes('PRIVILEGED'));
 await wait(1700);
 assert.equal(await page.locator('#command-card').isVisible(), true);
 assert.equal(await page.locator('#command-console').isVisible(), true);
 const dimensions = await page.locator('.console-text').evaluate(n => {
  const r = n.getBoundingClientRect();
  return {visibleHeight:Math.max(0, Math.min(innerHeight,r.bottom)-Math.max(0,r.top)),fontSize:getComputedStyle(n).fontSize};
 });
 await snap(page, output, 'detail');
 assert.ok(dimensions.visibleHeight >= 400, JSON.stringify(dimensions));
 assert.equal(dimensions.fontSize, '15px');
 const original = await page.locator('.console-text').textContent();
 await page.locator('.console-text').focus();
 await wait(1700);
 assert.equal(await page.locator('.console-text').evaluate(n => n === document.activeElement), true);
 assert.equal(await page.locator('.console-text').textContent(), original);
 // Compact status still exposes the separate action result in one click.
 await page.locator('#command-console').click();
 await page.waitForSelector('#live-console:not([hidden])');
 assert.ok((await page.locator('#live-state').textContent()).length > 0);
 for (const viewport of [{width:1920,height:1080},{width:390,height:844},{width:683,height:384}]) {
  await page.setViewportSize(viewport);
  await page.goto(url + '/#demo/attempt/attempt-1/console?op=f11-early');
  await page.waitForSelector('.console-text');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await snap(page, output, 'width-'+viewport.width);
 }
 assert.equal(posts, 0);
 writeFileSync(output+'.json', JSON.stringify({status:'PASS',boundary:'Retained real evidence; read-only rendering',dimensions,posts}, null, 2));
} finally { await browser.close(); }
