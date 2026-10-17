// Recorded DOM mapping in the real browser; no mock DOM API or laboratory actions.
import assert from 'node:assert/strict';
import {chromium,offlineHTML,explore} from './browser-support.mjs';
const url=process.argv[2];if(!url)throw Error('Usage: dom-check.mjs PRIVATE_URL');
const data=await (await fetch(url+'/api/session')).json(),browser=await chromium.launch({headless:true});
try{const page=await browser.newPage();let requests=0;page.on('request',()=>requests++);await page.setContent(offlineHTML({...data,offlineArtifacts:{},savedUTC:'read-only rendering check'}));await page.waitForSelector('.attempt-row');assert.equal(await page.locator('.attempt-row').count(),data.session.profile==='f11-comparison'?4:5);await explore(page,'scenarios');assert.equal(await page.locator('.catalogue-list button').count(),20);assert.equal(await page.locator('[data-action="export"]').isDisabled(),true);assert.equal(requests,0);console.log(JSON.stringify({status:'PASS',boundary:'Recorded DOM mapping; not a delivery',session:data.session.session,offlineRequests:requests}));}finally{await browser.close();}
