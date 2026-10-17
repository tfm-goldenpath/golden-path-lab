// Optional existing Playwright installation. No dependency download or lab operation.
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
export const root=resolve(import.meta.dirname,'../..');
const require=createRequire(root+'/.tmp/f11-browser-tools/package.json');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= root+'/.tmp/f11-browser-tools/browsers';
export const {chromium}=require('playwright');
export const wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function loaded(page,url){await page.goto(url);await page.waitForSelector('.attempt-row');}
export async function choose(page,id){if(!await page.locator('#presentation').isVisible())await page.locator('[data-destination=demo]').click();await page.locator(`.attempt-row[data-attempt="${id}"] .attempt-select`).click();}
export async function explore(page,name){if(name==='technical'){await page.locator('#provenance > summary').click();await page.locator('[data-explore=technical]').click();}else await page.locator(`[data-destination="${name}"]`).click();}
export async function tab(page,name){await page.locator(`[data-tab="${name}"]`).click();}
export async function technical(page){await explore(page,'technical');}
export async function snap(page,prefix,name){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:prefix+'-'+name+'.png'});}
export function pass(path,value){writeFileSync(path+'.json',JSON.stringify({status:'PASS',boundary:'Rendering only; synthetic fixtures never sent to coordinator',...value},null,2)+'\n');}
export function offlineHTML(data){let html=readFileSync(root+'/demo/index.html','utf8');html=html.replace('<link rel="stylesheet" href="/style.css">','<style>'+readFileSync(root+'/demo/style.css','utf8')+'</style>');html=html.replace('<script src="/model.js" defer></script>','<script>'+readFileSync(root+'/demo/model.js','utf8')+'</script>');return html.replace('<script src="/app.js" defer></script>','<script>window.SAVED_SESSION='+JSON.stringify({...data,recorded:true}).replaceAll('<','\\u003c')+';</script><script>'+readFileSync(root+'/demo/app.js','utf8')+'</script>');}
