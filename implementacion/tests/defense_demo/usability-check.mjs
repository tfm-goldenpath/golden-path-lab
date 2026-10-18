import assert from 'node:assert/strict';
import {chromium,loaded,choose,explore,snap,pass,wait} from './browser-support.mjs';
const [defenseURL,comparisonURL,output]=process.argv.slice(2);if(!output)throw Error('Usage: usability-check.mjs DEFENSE_URL COMPARISON_URL OUTPUT_PREFIX');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await loaded(page,defenseURL);assert.equal(await page.locator('.attempt-row').count(),5);
 await choose(page,'attempt-2');assert.match(await page.locator('#result-description').innerText(),/atestación de resultados/);await snap(page,output,'f13');
 await page.locator('#related').click();assert.match(await page.locator('#result-title').innerText(),/Recuperación de F13/);assert.match(await page.locator('#result-outcome').innerText(),/Permitido/);
 await page.locator('#close-inspector').click();await snap(page,output,'recovery');
 await choose(page,'attempt-3');await page.locator('#scope').click();assert.match(await page.locator('#inspector-content').innerText(),/No demuestra L06/);await page.locator('#close-inspector').click();
 await explore(page,'technical');const admission=page.locator('.technical-stage[data-stage="admission"] > summary');assert.match(await admission.innerText(),/F13.*Kyverno/);assert.match(await admission.innerText(),/F11.*Kyverno/);
 assert.equal(await page.locator('.technical-stage[data-stage="deployment"] > summary .blocked').count(),0);
 await page.locator('#exploration select').selectOption('attempt-1');assert.equal(await page.locator('.technical-stage').count(),15);assert.equal(await page.locator('.technical-stage[data-stage="admission"] > summary .blocked').count(),0);assert.match(await page.locator('.technical-stage[data-stage="admission"] > summary').innerText(),/No alcanzado/);await snap(page,output,'technical');
 await page.locator('#close-exploration').click();const previous=await page.locator('#result-title').innerText();
 await explore(page,'scenarios');assert.equal(await page.locator('.catalogue-list button').count(),20);
 await page.getByRole('searchbox').fill('unmatched-synthetic-search');assert.equal(await page.locator('.catalogue-list button').count(),0);assert.match(await page.locator('.catalogue-detail').innerText(),/Sin coincidencias/);
 await page.getByRole('searchbox').fill('L06');await page.locator('.catalogue-list button').click();assert.match(await page.locator('.catalogue-detail').innerText(),/alcance parcial/);
 await wait(1800);assert.equal(await page.getByRole('searchbox').inputValue(),'L06');await snap(page,output,'catalogue');
 await page.locator('#close-exploration').click();assert.equal(await page.locator('#result-title').innerText(),previous);
 await explore(page,'workflows');assert.match(await page.locator('#exploration-content').innerText(),/Configuración capturada; ejecución remota no observada/);
 assert.equal(await page.locator('#workflow-choice option').count(),4);await page.locator('[data-workflow-tab=configuration]').click();await snap(page,output,'workflows');
 await page.locator('#close-exploration').click();await explore(page,'sessions');await page.waitForSelector('#exploration-content details');assert.match(await page.locator('#exploration-content').innerText(),/sesión vinculada/);assert.equal(await page.locator('#result-title').innerText(),previous);
 await loaded(page,comparisonURL);assert.equal(await page.locator('.attempt-row').count(),4);await explore(page,'technical');assert.equal(await page.locator('#exploration-content').getByText(/F13 ·/).count(),0);
 assert.equal(errors.length,0,errors.join('\n'));pass(output,{profiles:['defense','f11-comparison'],catalogue:20,errors});
}finally{await browser.close();}
