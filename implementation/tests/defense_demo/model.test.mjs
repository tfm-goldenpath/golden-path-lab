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

test('new attempts retain exact original paths and recovery operations without recoloring history',()=>{
 const old=event('f11-early',{attempt:'attempt-1'}),fresh=event('f11-early',{attempt:'case-f11-early-1',operationInstance:'case-f11-early-1',artifacts:[{id:'new',producer:'f11-early',path:'operations/case-f11-early-1/closed/F11-early.json'}]});
 const d=data('defense',[old,fresh,event('authorize',{attempt:'case-f13-1-recovery'}),event('accept',{attempt:'case-f13-1-recovery'})]);
 d.session.active={operation:'f11-early',attempt:'case-f11-early-2'};d.activeProcessObserved=true;
 assert.equal(M.rows(d).find(r=>r.id==='case-f13-1-recovery').ops.length,2);
 assert.equal(M.rowOutcome(M.rows(d).find(r=>r.id==='attempt-1'),d).tone,'blocked');
 assert.equal(M.rowOutcome(M.rows(d).find(r=>r.id==='case-f11-early-2'),d).tone,'running');
 assert.equal(M.ownArtifact(fresh,'F11-early.json').id,'new');
});

test('duplicate case titles have stable per-control execution numbers, including active attempts',()=>{
 const d=data('defense',[event('f11-early'),event('f11-admission'),event('f11-early',{attempt:'case-f11-early-1'}),event('f11-admission',{attempt:'case-f11-admission-1'})]);
 d.session.active={operation:'f11-early',attempt:'case-f11-early-2'};
 const before=JSON.stringify(d),titles=()=>Object.fromEntries(M.rows(d).map(r=>[r.id,M.rowTitle(r,d)]));
 const initial=titles();
 assert.equal(initial['attempt-1'],'G · F11 · Control temprano · Ejecución 1');
 assert.equal(initial['case-f11-early-1'],'G · F11 · Control temprano · Ejecución 2');
 assert.equal(initial['case-f11-early-2'],'G · F11 · Control temprano · Ejecución 3');
 assert.equal(initial['attempt-4'],'G · F11 · Admisión independiente · Ejecución 1');
 assert.equal(initial['case-f11-admission-1'],'G · F11 · Admisión independiente · Ejecución 2');
 assert.equal(JSON.stringify(d),before);
 d.events.push(event('f11-early',{attempt:'case-f11-early-2',operational:'ERROR'}));d.session.active=null;
 assert.deepEqual(titles(),initial);
 assert.doesNotMatch(M.rowTitle(M.rows(data('defense'))[1],data('defense')),/Ejecución/);
});


test('fixture preparation never replaces the original attempt origin',()=>{
 const first=event('seal',{phase:'preparation',decision:'allow',sequence:1});
 const child=event('seal',{phase:'preparation',decision:'allow',fixtureSession:'fixture-1',sequence:3});
 const early=event('f11-early',{attempt:'attempt-1',sequence:2});
 const f13=event('f13',{attempt:'case-f13-1',fixtureSession:'fixture-1',preparationSession:'fixture-1',sequence:4});
 const d=data('defense',[first,early,child,f13]);d.session.active={operation:'f11-early',attempt:'case-f11-early-2'};d.activeProcessObserved=true;
 assert.equal(M.segments(M.rows(d).find(r=>r.id==='attempt-1'),d)[0].event.sequence,1);
 assert.equal(M.segments(M.rows(d).find(r=>r.id==='case-f13-1'),d)[0].event.sequence,3);
 assert.ok(M.journey(d,'attempt-1').flatMap(s=>s.entries).every(x=>x.event?.fixtureSession!=='fixture-1'));
 assert.equal(M.journey(d,'attempt-1').find(s=>s.id==='manifest').entries.find(x=>x.event===early).state.tone,'blocked');
});

test('early profile has independent counterparts, exact gate links and no Kubernetes success',()=>{
 const d=data('early-security',[event('early-f02-prepare',{phase:'preparation'}),event('early-f02-negative',{operationInstance:'early-f02-negative-1',artifacts:[{id:'exact',producer:'early-f02-negative',path:'operations/early-f02-negative-1/control.stdout.log'}]}),event('early-f02-positive')]);
 const rows=M.rows(d);assert.equal(rows.length,6);assert.ok(rows.every(r=>!r.reference));
 assert.match(M.outcome(d.events[1]).label,/workflow \/ Conftest/);
 assert.equal(M.primaryArtifact(d.events[1],d).id,'exact');
 const segments=M.segments(rows[0],d);assert.equal(segments[0].state.tone,'reused');assert.equal(segments[1].state.tone,'blocked');
 assert.equal(M.journey(d).find(s=>s.id==='admission').entries.length,0);
 assert.equal(M.incompletePreparation({...d,events:[event('early-f03-prepare',{phase:'preparation',operational:'ERROR'})]}),null);
 assert.match(M.scope('early-security'),/no es L02/);
});

test('combined profile retains distinct defense, comparison and early observations',()=>{
 const d=data('defense-all',[event('f13'),event('accept',{linkedAttempt:'attempt-2'}),event('comparison-reference'),event('comparison-legitimate'),event('early-f02-negative',{attempt:'early-f02-negative-1'})]);
 const rows=M.rows(d);
 for(const op of ['f11-early','f13','accept','f11-admission','comparison-reference','comparison-admission','comparison-legitimate','early-f02-negative','early-f12-negative','early-f03-negative'])assert.ok(rows.some(r=>r.ops.includes(op)),op);
 assert.notEqual(rows.find(r=>r.ops.includes('f13')).id,rows.find(r=>r.ops.includes('accept')).id);
 assert.notEqual(M.meta('f11-admission',d).title,M.meta('comparison-admission',d).title);
 assert.equal(M.outcome(M.latest(rows.find(r=>r.ops.includes('comparison-reference')))).tone,'risk');
 assert.match(M.scope('defense-all','comparison-legitimate'),/L06.*parcial/);
 assert.match(M.scope('defense-all','early-f03-negative'),/No firma/);
 assert.equal(M.segments(rows.find(r=>r.ops.includes('early-f02-negative')),d)[0].operation,'early-f02-prepare');
 assert.equal(rows.find(r=>r.ops.includes('comparison-inputs')).id,'comparison-setup');
});
test('failed common preparation does not label independently ready early controls as unreached',()=>{
 const d=data('defense-all',[event('analysis',{phase:'preparation',operational:'ERROR',expectation:'unconfirmed'})]);d.session.operational='ERROR';
 const rows=M.rows(d);assert.equal(M.rowOutcome(rows.find(r=>r.ops.includes('f13')),d).tone,'unreached');
 assert.equal(M.rowOutcome(rows.find(r=>r.ops.includes('early-f02-negative')),d).tone,'idle');
});
test('combined preparation reuse stays inside the selected family',()=>{
 const d=data('defense-all',[event('seal',{phase:'preparation'}),event('early-f02-prepare',{phase:'preparation'}),event('early-f03-prepare',{phase:'preparation'})]);
 const early=M.journey(d,'early-f02-negative-1').flatMap(x=>x.entries).filter(x=>x.reused);
 assert.ok(early.every(x=>x.event.operation==='early-f02-prepare'));
 const runtime=M.journey(d,'attempt-2').flatMap(x=>x.entries).filter(x=>x.reused);
 assert.ok(runtime.every(x=>!x.event.operation.startsWith('early-')));
});
test('combined case controls enumerate every family without skipping initial preconditions',()=>{
 const d=data('defense-all');d.session.completed=[];
 assert.deepEqual(M.combinedCases.filter(([id])=>['f02','f03','f12','f13','f11-early','f11-admission','comparison-reference','comparison-legitimate'].includes(id)).length,8);
 assert.equal(M.combinedControl(d,{nextOperation:'f13'},'f13').action,'step');
 assert.equal(M.combinedControl(d,{nextOperation:'f13'},'comparison-legitimate').action,null);
 assert.equal(M.combinedControl(d,{},'f12').action,'case-early-f12');
 d.session.completed=['f13','f11-early','comparison-legitimate'];
 assert.equal(M.combinedControl(d,{},'f11-early').action,'case-f11-early');
 assert.equal(M.combinedControl(d,{},'f13').action,null);
 assert.match(M.combinedControl(d,{},'f13').note,/fixture independiente/);
 assert.equal(M.combinedControl(d,{},'comparison-legitimate').action,null);
});
