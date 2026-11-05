// Read-only acceptance of the reviewed site's landing page and original backups.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from './browser-support.mjs';
const [url,out]=process.argv.slice(2);
if(!/^http:\/\/127\.0\.0\.1:\d+\/$/.test(url))throw Error('Use an owned loopback static server root');
mkdirSync(out,{recursive:true});
const lock=JSON.parse(readFileSync(new URL('../../demo/pages-source.lock.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage(),errors=[],requests=[];
await context.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
page.on('pageerror',e=>errors.push(String(e)));
page.on('request',r=>{assert.ok(!/\/api\/|\/download\//.test(r.url()));requests.push(r.url());});
try{
 await page.goto(url);await page.getByRole('link',{name:'Abrir demostración',exact:true}).waitFor();await page.screenshot({path:out+'/landing.png'});
 const hashes={};
 for(const name of ['recorded.html','video.mp4','original.webm']){
  const response=await context.request.get(url+name);assert.equal(response.status(),200);
  const hash=createHash('sha256').update(await response.body()).digest('hex');assert.equal(hash,lock.anchors[name]);hashes[name]=hash;
 }
 await page.goto(url+'original.webm');await page.locator('video').waitFor();
 const media=await page.locator('video').evaluate(async v=>{v.muted=true;await v.play();return {webm:v.canPlayType('video/webm; codecs="vp8"'),h264:v.canPlayType('video/mp4; codecs="avc1.42E01E"')};});
 await page.waitForFunction(()=>document.querySelector('video')?.currentTime>1);await page.locator('video').evaluate(v=>v.pause());await page.screenshot({path:out+'/webm-playback.png'});
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({status:'PASS',session:lock.session,hashes,media,mp4Browser:media.h264?'AVAILABLE_NOT_EXERCISED':'NOT_EXECUTED: codec unavailable; original download hash checked',requests,errors},null,2));
 console.log('PASS actual landing, backup byte hashes and original WebM playback; no backend');
}finally{await context.close();await browser.close();}
