// Continuous, unaccelerated navigation of REAL recorded evidence. No voice or live claim.
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {chromium,wait} from './browser-support.mjs';
const [htmlArg,outArg]=process.argv.slice(2);const html=resolve(htmlArg),out=resolve(outArg);mkdirSync(out,{recursive:false});
const data=JSON.parse(readFileSync(html,'utf8').split('window.SAVED_SESSION=')[1].split(';</script>')[0]);assert.equal(data.recorded,true);
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1920,height:1080},offline:true,recordVideo:{dir:out,size:{width:1920,height:1080}}});
await context.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{const banner=document.createElement('div');banner.textContent='REPRODUCCIÓN GRABADA · Navegación de evidencias registradas · sin voz';Object.assign(banner.style,{position:'fixed',bottom:'0',left:'0',right:'0',zIndex:'9999',background:'#123041',color:'white',padding:'6px 24px',font:'16px system-ui'});document.body.append(banner);}));
const page=await context.newPage(),video=page.video(),events=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>assert.ok(!/^https?:/.test(r.url())));
const base=pathToFileURL(html).href,start=Date.now();
async function at(seconds,hash,label){await wait(Math.max(0,start+seconds*1000-Date.now()));await page.goto(base+hash);events.push({seconds:(Date.now()-start)/1000,label,route:hash,UTC:new Date().toISOString()});}
const event=op=>data.events.find(e=>e.operation===op&&e.phase==='live'&&e.operational==='COMPLETED');
for(const op of ['f11-early','f13','accept','f11-admission'])assert.ok(event(op),op);
try{
 await at(0,'#demo?focus=defense','Orientación; preparación previa y resultados registrados');
 await at(20,`#demo/operation/${event('f11-early').sequence}/console`,'F11 · Conftest · privilegios prohibidos');await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('PRIVILEGED'));
 await at(45,`#demo/operation/${event('f13').sequence}/console`,'F13 · Kyverno · resultados ausentes');await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('tfm-results'));
 await at(70,`#demo/operation/${event('accept').sequence}/result`,'Recuperación legítima con mismo digest; no L01 completo');
 await at(90,`#demo/operation/${event('accept').sequence}/console`,'Original de admisión de la recuperación');
 await at(105,`#demo/operation/${event('f11-admission').sequence}/console`,'Petición F11 independiente · Kyverno');await page.waitForFunction(()=>document.querySelector('.console-text')?.textContent.includes('tfm-runtime'));
 await at(130,'#journey/map','Mapa pedagógico; secuencia registrada separada');
 await at(145,'#demo?focus=defense','Cierre y procedencia');await page.locator('#provenance > summary').click();
 await wait(Math.max(0,start+160000-Date.now()));assert.deepEqual(errors,[]);
}finally{await context.close();await browser.close();}
const original=await video.path();renameSync(original,out+'/original.webm');
const command=['-y','-i',out+'/original.webm','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',out+'/defense.mp4'];execFileSync('ffmpeg',command,{stdio:['ignore','ignore','pipe']});execFileSync('ffmpeg',['-v','error','-i',out+'/defense.mp4','-f','null','-'],{stdio:['ignore','ignore','pipe']});
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',out+'/defense.mp4'],{encoding:'utf8'}));const duration=Number(probe.format.duration);assert.ok(duration>=159&&duration<=180);assert.equal(probe.streams[0].codec_name,'h264');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');writeFileSync(out+'/recording.json',JSON.stringify({schema:'defense-recording/v1',kind:'continuous-recorded-evidence-navigation',session:data.session.session,evidenceSource:data.session.source,renderer:data.renderer,createdUTC:new Date().toISOString(),durationSeconds:duration,viewport:{width:1920,height:1080},events,voice:'none',speed:'original wall-clock; no acceleration',humanNarration:'PENDING',originalSha256:sha(out+'/original.webm'),videoSha256:sha(out+'/defense.mp4'),tools:{browser:browser.version(),ffmpeg:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0]},conversionCommand:['ffmpeg',...command],decode:'PASS'},null,2));console.log('PASS continuous recorded-evidence tour, H.264 full decode; seconds='+duration);
