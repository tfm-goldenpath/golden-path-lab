import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../../demo/model.js';
const M=globalThis.DemoModel;
const catalogue=JSON.parse(readFileSync(new URL('../../demo/catalogue.json',import.meta.url)));
const event=(operation,other={})=>({...catalogue.operations[operation],operation,phase:'live',operational:'COMPLETED',decision:catalogue.operations[operation].expected,expectation:'confirmed',artifacts:[],...other});
const data=(profile,events=[])=>({session:{profile},events,catalogue});
test('attribution, errors and unobserved execution are distinct',()=>{
 assert.equal(M.outcome(event('f11-early')).tone,'blocked');
 assert.equal(M.outcome(event('f11-early',{operational:'ERROR'})).tone,'error');
 assert.equal(M.outcome(event('f11-early',{expectation:'unconfirmed'})).tone,'unknown');
 assert.equal(M.outcome(event('f11-early',{operational:'NOT_REACHED'})).tone,'unreached');
 assert.match(M.outcome(null,true,false).label,/interrumpido/);
 assert.equal(M.outcome(null,true,null).tone,'error');
});
test('recovery remains separate, and declared operations do not establish success',()=>{
 const d=data('defense',[event('f13'),event('authorize',{linkedAttempt:'attempt-2'}),event('accept',{linkedAttempt:'attempt-2'})]);
 const rows=M.rows(d);assert.equal(rows.length,5);assert.equal(rows.find(r=>r.id==='attempt-3').events.length,2);
 assert.equal(rows.find(r=>r.id==='attempt-2').events.length,1);
 assert.equal(M.segments(rows.find(r=>r.id==='attempt-4'),d).at(-1).state.tone,'idle');
 assert.ok(!M.rows(data('f11-comparison')).some(r=>r.ops.includes('f13')));
 const partial=data('defense',[event('authorize',{linkedAttempt:'attempt-2'})]);
 assert.equal(M.rowOutcome(M.rows(partial).find(r=>r.id==='attempt-3'),partial).label,'Recuperación incompleta');
});
test('R omissions and preparation reuse do not imply a rerun',()=>{
 const d=data('f11-comparison',[event('seal',{phase:'preparation',decision:'allow'}),event('comparison-reference')]);
 const segments=M.segments(M.rows(d)[0],d);
 assert.equal(segments[0].state.tone,'reused');assert.equal(segments.filter(s=>s.omitted).length,2);
 assert.equal(segments.filter(s=>s.aggregate).length,1);
 assert.equal(M.outcome(d.events[1]).tone,'risk');
});
test('exact own files, profile scope and twenty IDs',()=>{
 const e=event('f11-early',{artifacts:[{path:'operations/accept/closed/F11-early.json',producer:'accept'}]});
 assert.equal(M.primaryArtifact(e,data('defense')),null);
 assert.match(M.scope('defense'),/F13/);assert.match(M.scope('f11-comparison'),/L06/);
 assert.equal(catalogue.scenarios.length,20);assert.deepEqual(M.scenarioOps('L06',data('f11-comparison')),['comparison-legitimate']);
});
