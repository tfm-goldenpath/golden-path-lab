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

test('journey uses all fifteen captured phases and aggregated operation membership',()=>{
 const d=data('defense',[event('analysis',{phase:'preparation'}),event('f13'),event('accept')]);
 const map=M.journey(d);assert.equal(map.length,15);assert.deepEqual(map.map(s=>s.id),catalogue.stages.map(s=>s.id));
 assert.equal(map[0].number,'01');assert.equal(map[14].number,'15');
 for(const s of map)for(const e of s.entries)if(e.spec&&!e.downstream)assert.ok(e.spec.stages.includes(s.id));
 const admission=map.find(s=>s.id==='admission');assert.ok(admission.entries.some(x=>x.blocker&&x.event.operation==='f13'));assert.ok(admission.entries.some(x=>x.event?.operation==='accept'&&x.state.tone==='accepted'));
 assert.ok(!map.find(s=>s.id==='results').entries.some(x=>x.blocker));
});
test('global original and incomplete preparation keep G unreached and unknown durations',()=>{
 const e=event('analysis',{phase:'preparation',operational:'ERROR',expectation:'unconfirmed',decision:'indeterminate',sequence:1,artifacts:[{path:'operations/analysis/output.log',producer:'analysis',id:'original'}]});
 const d=data('defense',[e]);Object.assign(d.session,{operational:'ERROR',prepared:false,liveDurationSeconds:null});
 assert.equal(M.incompletePreparation(d).failure,e);assert.equal(M.operationOutput(e).id,'original');assert.equal(M.primaryArtifact(e,d).id,'original');
 assert.equal(M.rows(d).filter(r=>!r.reference).length,4);assert.ok(M.rows(d).filter(r=>!r.reference).every(r=>M.rowOutcome(r,d).tone==='unreached'));
 assert.equal(M.journey(d).find(s=>s.id==='admission').entries.find(x=>x.spec.adapter==='f13').state.tone,'unreached');
 const unknown=data('defense');unknown.session.operational='ERROR';assert.equal(M.incompletePreparation(unknown).failure,undefined);
 assert.equal(d.session.liveDurationSeconds,null);
});
test('R omissions, downstream stop and reused preparation remain separate',()=>{
 const d=data('f11-comparison',[event('seal',{phase:'preparation',decision:'allow',sequence:1}),event('f11-early',{notReached:['admission','deployment'],sequence:2}),event('comparison-reference',{sequence:3})]);
 assert.ok(M.journey(d,'comparison-r').find(s=>s.id==='admission').entries.some(x=>x.omitted));
 const early=M.journey(d,'attempt-1');assert.ok(early.find(s=>s.id==='admission').entries.some(x=>x.downstream&&x.state.tone==='unreached'));assert.ok(early.find(s=>s.id==='source').entries.some(x=>x.reused&&x.event.sequence===1));
 assert.ok(!M.filteredEvents(d,'attempt-1').some(e=>e.operation==='seal'));
});
test('artifact provenance distinguishes inherited capture; absent originals are not replaced',()=>{
 const first=event('ci',{phase:'preparation',sequence:1,artifacts:[{source:'run/unit-tests.log',sha256:'abc'}]}),copy={path:'operations/f11-admission/closed/laboratory-unit-tests.log',source:'run/unit-tests.log',sha256:'abc',producer:'f11-admission'};
 const later=event('f11-admission',{sequence:2,artifacts:[copy]}),d=data('defense',[first,later]);assert.equal(M.artifactOrigin(copy,later,d).event,first);assert.match(M.artifactOrigin(copy,later,d).label,/heredada/);assert.equal(M.primaryArtifact(later,d),null);
 assert.match(M.artifactOrigin({...copy,sha256:'different'},later,d).label,/capturada/);
});
test('old metadata, recorded order and session/profile boundaries',()=>{
 const d=data('defense-short',[event('f13',{sequence:4}),event('accept',{sequence:2}),event('comparison-legitimate',{sequence:5}),event('ci',{sequence:6,session:'foreign'})]);d.session.session='bound';d.profileOperations=['f13','accept','ci'];
 assert.deepEqual(M.filteredEvents(d,'all').map(e=>e.sequence),[4,2]);assert.doesNotThrow(()=>M.journey(d));
 assert.ok(!M.journey(d).flatMap(s=>s.entries).some(x=>x.event?.session==='foreign'));
});

test('equal generated operation logs are not inherited from an unrelated producer',()=>{
 const first=event('ci',{sequence:1,artifacts:[{path:'operations/ci/output.log',id:'ci',source:'generated operation receipt',sha256:'same'}]});
 const a={path:'operations/analysis/output.log',id:'analysis',source:'generated operation receipt',producer:'analysis',sha256:'same'},next=event('analysis',{sequence:2,artifacts:[a]});
 assert.equal(M.artifactOrigin(a,next,data('defense',[first,next])).event,undefined);assert.equal(M.artifactOrigin(a,next,data('defense',[first,next])).label,'Salida de la operación analysis');
});

test('missing phase on an old live receipt cannot become an unexecuted preparation claim',()=>{
 const old=event('f13');delete old.phase;const d=data('defense',[old]);Object.assign(d.session,{prepared:false,operational:'ERROR'});assert.equal(M.incompletePreparation(d),null);
});

test('workflow selection sorts execution time, attempt and capture without hiding failures',()=>{
 const capture=(id,date,attempt,utc)=>({id:'capture-'+id+'-'+utc,workflow:'ci.yml',capturedUTC:utc,run:{id,created_at:date,run_attempt:attempt,conclusion:'failure'}});
 const old=capture(100,'2026-10-01',1,'2026-10-18'),latest=capture(200,'2026-10-17',2,'2026-10-18'),earlier=capture(200,'2026-10-17',1,'2026-10-17');
 assert.deepEqual(M.workflowRuns([old,earlier,latest], 'ci.yml'),[latest,earlier,old]);
 assert.deepEqual(M.workflowRuns([old], 'golden-path.yml'),[]);
});
