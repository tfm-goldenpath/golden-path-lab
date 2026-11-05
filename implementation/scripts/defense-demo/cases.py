"""Enumerated repeat attempts. No scenario or policy decisions live here."""
import copy
import hashlib
import os
from pathlib import Path
import re
import time
from core import (ROOT, LIVE, atomic, events, evidence_root, file_record, locked, read_json,
                  session_path, utc, publish_event)

from early import ACTIONS as EARLY_ACTIONS

ACTIONS=EARLY_ACTIONS+('case-f11-early','case-f11-admission','prepare-f13-case','case-f13','recover-f13-case','cleanup-f13-case')
INPUTS=('state.json','build-metadata.json','tfm-golden.json','F11-privileged.json',
        'local-trusted-root.json','local-signing-config.json','development-public-key.pem','prepared-cluster.json',
        'prepared-policy-identity.json','tfm-reference-quote.json')


def fixture(state):
    link=state.get('f13Fixture')
    if not link: return None
    name=link['session']
    if not re.fullmatch(re.escape(state['session'][:40])+r'-f13-[0-9]+',name): raise ValueError('Invalid fixture relation')
    child=read_json(session_path(name)/'session.json')
    if child.get('fixtureParent')!=state['session']: raise ValueError('Fixture owner mismatch')
    return child


def capabilities(state, running=False, source_error=None):
    from coordinator import assert_source
    from early import capabilities as early_capabilities
    if state.get("profile")=="early-security": return {**{a:{"enabled":False,"reason":"Caso ajeno al perfil de controles tempranos"} for a in ACTIONS}, **early_capabilities(state,running,source_error)}
    reasons={a:None for a in ACTIONS}
    base=source_error or ('Otra operación sigue activa' if running else None)
    ready=state.get('prepared') and not state.get('cleaned') and state.get('operational') in ('PREPARED','COMPLETED')
    for a in ('case-f11-early','case-f11-admission'):
        reasons[a]=base or (None if ready else 'Requiere preparación íntegra y recursos disponibles')
    admission='comparison-admission' if state.get('profile','unknown')=='f11-comparison' else 'f11-admission'
    if admission not in LIVE.get(state.get('profile','unknown'),[]): reasons['case-f11-admission']='Este perfil no incluye el caso de admisión F11'
    elif 'accept' not in state.get('completed',[]) and 'comparison-ready' not in state.get('completed',[]): reasons['case-f11-admission']='Requiere imagen autorizada y Deployment válido preparado'
    child=fixture(state)
    child_error=None
    if child:
        try: assert_source(child)
        except Exception: child_error='Fuente o arranque de la fixture cambiados'
    usable=child and child.get('prepared') and not child.get('cleaned') and child.get('operational') in ('PREPARED','COMPLETED') and not child_error
    reasons['prepare-f13-case']=base or ('La fixture actual debe consumirse y retirarse antes de preparar otra' if child and not child.get('cleaned') else None)
    reasons['case-f13']=base or child_error or (None if usable and 'f13' not in child.get('completed',[]) else 'Requiere preparación de un nuevo caso F13')
    reasons['recover-f13-case']=base or child_error or (None if usable and 'f13' in child.get('completed',[]) and 'accept' not in child.get('completed',[]) else 'Requiere el rechazo de esta fixture F13 y recuperación pendiente')
    reasons['cleanup-f13-case']=('Otra operación sigue activa' if running else None) or (None if child and not child.get('cleaned') else 'No hay fixture propia pendiente de retirada')
    if state.get('profile','unknown')=='f11-comparison':
        for a in ('prepare-f13-case','case-f13','recover-f13-case'): reasons[a]='F13 no pertenece al perfil F11 comparativo'
    for a in EARLY_ACTIONS: reasons[a]='Requiere el perfil early-security'
    result={a:{'enabled':v is None,'reason':v or ''} for a,v in reasons.items()}
    if state.get('profile')=='defense-all': result.update(early_capabilities(state,running,source_error))
    return result


def make_inputs(state, attempt):
    from coordinator import lab_path, Stopped
    original=lab_path(state['session'])
    if original is None: raise Stopped('Prepared laboratory inputs missing')
    target=evidence_root(state['session'])/'case-inputs'/attempt
    if target.resolve()!=target: raise Stopped('Symlinked attempt input directory')
    target.mkdir(parents=True,exist_ok=False,mode=0o700)
    inventory=[]
    for name in INPUTS:
        src=original/name
        if not src.exists(): continue
        if src.resolve()!=src or not src.is_file() or src.stat().st_size>2*1024**2: raise Stopped('Unsafe or oversized case input')
        raw=src.read_bytes();(target/name).write_bytes(raw)
        inventory.append({'path':name,'sha256':hashlib.sha256(raw).hexdigest(),'source':str(src.relative_to(ROOT))})
    if not (target/'state.json').exists() or not (target/'tfm-golden.json').exists(): raise Stopped('Required prepared input unavailable')
    atomic(target/'input-references.json',{'preparationSession':state['session'],'files':inventory,'source':state['source']})
    return target


def relay(parent, child, attempt, linked=None):
    """Register immutable public closed files in the bound session, without full copies."""
    from core import safe_path
    root=evidence_root(parent['session']);original=evidence_root(child['session'])
    seen={e.get('fixtureEvent') for e in events(parent['session']) if e.get('fixtureSession')==child['session']}
    for e in events(child['session']):
        if e['sequence'] in seen: continue
        op=e['operation'];instance=attempt+'-'+str(e['sequence'])+'-'+op
        destination=root/'operations'/instance
        if destination.resolve()!=destination: raise ValueError('Symlinked fixture destination')
        destination.mkdir(exist_ok=False)
        artifacts=[]
        for record in e.get('artifacts',[]):
            source=safe_path(original,record['path'])
            if file_record(original,source,op,'')['sha256']!=record['sha256']: raise ValueError('Fixture artifact integrity mismatch')
            relative=Path(record['path']).parts[2:]
            target=destination.joinpath(*relative);target.parent.mkdir(parents=True,exist_ok=True)
            os.link(source,target)  # same filesystem, already closed public file; never a symlink
            artifacts.append(file_record(root,target,op,'Captured from fixture '+child['session']+'/'+record['path']))
        identity=attempt+'-recovery' if op in ('authorize','accept') else attempt
        publish_event(parent['session'],{**e,'attempt':identity if e['phase']=='live' else None,
            'operationInstance':instance,'artifacts':artifacts,'fixtureSession':child['session'],'fixtureEvent':e['sequence'],
            'linkedAttempt':attempt if op in ('authorize','accept') else linked,'preparationSession':child['session'],
            'precedingAttempt':parent.get('f13Fixture',{}).get('precedingAttempt') if op=='f13' else None,
            'repeat':True})


def execute(state, action, budget):
    import coordinator as co
    if action in EARLY_ACTIONS:
        from early import execute as execute_early
        return execute_early(state,action,budget)
    if action not in ACTIONS: raise co.Stopped('Unsupported case action')
    if action!='cleanup-f13-case': co.assert_source(state)
    gate=capabilities(state)[action]
    if not gate['enabled']: raise co.Stopped(gate['reason'])
    observation=co.resources(max(3,state['reserveGiB']),profile='f11-comparison',preparation=action=='prepare-f13-case',policy=state.get('resourcePolicy'))
    state['lastResources']=observation
    atomic(session_path(state['session'])/'session.json',state)
    if action!='cleanup-f13-case' and not observation['sufficient']: raise co.Stopped('RESOURCE_EXHAUSTED: insufficient preparation/growth margin; no new operation started')
    if action.startswith('case-f11'):
        operation='f11-early' if action=='case-f11-early' else 'comparison-admission' if state.get('profile','unknown')=='f11-comparison' else 'f11-admission'
        count=1+sum(bool(e.get('repeat')) and e['operation']==operation for e in events(state['session']))
        attempt='case-'+operation+'-'+str(count)
        previous=next((e['attempt'] for e in reversed(events(state['session'])) if e['operation']==operation),None)
        folder=make_inputs(state,attempt);start=time.monotonic()
        context={'attempt':attempt,'precedingAttempt':previous,'preparationSession':state['session'],'lab':folder}
        try:
            co.run_operation(state,'resume','readiness',time.monotonic()+budget,instance=attempt+'-check',case_context=context)
            co.run_operation(state,operation,'live',start+budget,instance=attempt,case_context=context)
        except (co.Stopped,KeyboardInterrupt):
            state['prepared']=False
            raise
        finally:
            state.setdefault('caseInvocations',[]).append({'attempt':attempt,'operation':operation,'durationSeconds':time.monotonic()-start,'endUTC':utc()})
            atomic(session_path(state['session'])/'session.json',state)
        return
    child=fixture(state)
    if action=='prepare-f13-case':
        number=len(state.get('fixtureHistory',[]))+1
        name=state['session'][:40]+'-f13-'+str(number)
        child=co.create(name,'defense-short',max(3,state['reserveGiB']))
        child['fixtureParent']=state['session'];child['resourcePolicy']=state.get('resourcePolicy',{})
        preceding=next((e.get('attempt') for e in reversed(events(state['session'])) if e['operation']=='f13'),None)
        state['f13Fixture']={'session':name,'attempt':'case-f13-'+str(number),'precedingAttempt':preceding}
        state.setdefault('fixtureHistory',[]).append(copy.deepcopy(state['f13Fixture']))
    attempt=state['f13Fixture']['attempt']
    state['activeFixture']=child['session'];atomic(session_path(state['session'])/'session.json',state)
    atomic(session_path(child['session'])/'session.json',child)
    child['controller']=state.get('controller')
    start=time.monotonic()
    try:
        with locked(session_path(child['session']).parent/('.'+child['session']+'.lock')):
            if action=='prepare-f13-case':
                co.prepare(child)
                # Dedicated run, image reference and trust state, not referrer deletion.
                if child.get('image')==state.get('image') or co.lab_path(child['session'])==co.lab_path(state['session']): raise co.Stopped('F13 fixture isolation failed')
                child['fixtureIsolation']={'parentImage':state.get('image'),'fixtureImage':child['image'],'independentLaboratory':True}
            elif action=='cleanup-f13-case':
                from server import process_identity
                worker=(child.get('active') or {}).get('worker')
                if worker and process_identity(worker['pid'])==worker: raise co.Stopped('Fixture worker still active; stop before cleanup')
                co.run_operation(child,'cleanup','preservation',instance='cleanup-fixture-'+str(1+sum(e['operation']=='cleanup' for e in events(child['session']))));child.update(cleaned=True,prepared=False)
            else:
                co.assert_source(child)
                co.run_operation(child,'resume','readiness',start+budget,instance='resume-'+action)
                for op in (['f13'] if action=='case-f13' else ['authorize','accept']): co.run_operation(child,op,'live',start+budget)
    except (co.Stopped,KeyboardInterrupt):
        child['prepared']=False
        raise
    finally:
        atomic(session_path(child['session'])/'session.json',child)
        relay(state,child,attempt)
        state['f13Fixture'].update(prepared=child.get('prepared',False),cleaned=child.get('cleaned',False),preparationDurationSeconds=child.get('preparationDurationSeconds'),image=child.get('image'),isolation=child.get('fixtureIsolation'))
        state.pop('activeFixture',None)
        state.setdefault('caseInvocations',[]).append({'attempt':attempt,'action':action,'fixtureSession':child['session'],'durationSeconds':time.monotonic()-start,'phase':'preparation' if action=='prepare-f13-case' else 'case','endUTC':utc()})
        atomic(session_path(state['session'])/'session.json',state)
