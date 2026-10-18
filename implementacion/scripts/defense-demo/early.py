"""Per-case lifecycle for existing early controls; no policy decisions here."""
from pathlib import Path
import time
from core import atomic, digest, events, evidence_root, read_json, session_path, utc

CASES=('f02','f12','f03')
ACTIONS=tuple(f'{verb}-early-{case}' for case in CASES for verb in ('prepare','case'))


def prepared(state, case):
    record=state.get('earlyPreparation',{}).get(case)
    if not record or record.get('status')!='READY': raise ValueError('Preparación del caso pendiente o incompleta')
    folder=evidence_root(state['session'])/'operations'/record['operationInstance']
    seal=read_json(folder/'input-seal.json')
    if seal['source']!=state['source'] or seal['case']!=case: raise ValueError('Prepared input source mismatch')
    for name, expected in seal['files'].items():
        path=folder/name
        if path.resolve()!=path or not path.is_relative_to(folder) or not path.is_file() or digest(path.read_bytes())!=expected:
            raise ValueError('Prepared input changed: '+name)
    return folder


def capabilities(state,running=False,source_error=None):
    result={}
    for case in CASES:
        prefix=source_error or ('Otra operación sigue activa' if running else 'Recursos retirados; crea una sesión nueva' if state.get('cleaned') else None)
        record=state.get('earlyPreparation',{}).get(case)
        prepare_reason=prefix or ('Preparación ya intentada; conserva el diagnóstico y crea otra sesión para este caso' if record else None)
        if case=='f03' and state.get('profile')=='defense-all' and (not state.get('prepared') or state.get('operational') not in ('PREPARED','COMPLETED')):
            prepare_reason=prepare_reason or 'Prepara primero el laboratorio común; F03 reutiliza su registro, builder y base'
        run_reason=prefix
        if not run_reason:
            try: prepared(state,case)
            except (OSError,ValueError,KeyError) as error: run_reason=str(error)
        result['prepare-early-'+case]={'enabled':not prepare_reason,'reason':prepare_reason or ''}
        result['case-early-'+case]={'enabled':not run_reason,'reason':run_reason or ''}
    return result


def execute(state,action,budget):
    # Preserve the independent laboratory outcome, not early operation outcomes:
    # those remain in command records, events and earlyComparisons.
    keys=('operational','workExitCode','lastExitCode')
    saved={key:state[key] for key in keys if key in state}
    try:
        return execute_case(state,action,budget)
    finally:
        if state['profile']=='defense-all':
            for key in keys:
                if key in saved: state[key]=saved[key]
                else: state.pop(key,None)
            atomic(session_path(state['session'])/'session.json',state)


def execute_case(state,action,budget):
    import coordinator as co
    if state['profile'] not in ('early-security','defense-all') or action not in ACTIONS: raise co.Stopped('Action outside early-security profile')
    co.assert_source(state)
    gate=capabilities(state)[action]
    if not gate['enabled']: raise co.Stopped(gate['reason'])
    case=action.rsplit('-',1)[1]; preparation=action.startswith('prepare-')
    observation=co.resources(max(3,state['reserveGiB']),growth_gib=2 if preparation and case=='f03' else .0625,profile='early-security',docker_root=state.get('dockerStorageRoot'))
    if preparation and case=='f03':
        import os
        fs=os.statvfs('/tmp');observation['databaseStorage']={'freeBytes':fs.f_bavail*fs.f_frsize,'freeInodes':fs.f_favail,'requiredBytes':4*1024**3}
        observation['sufficient'] &= fs.f_bavail*fs.f_frsize>=4*1024**3 and fs.f_favail>=10000
    state['lastResources']=observation
    atomic(evidence_root(state['session'])/(action+'-resources-'+str(len(events(state['session'])))+'.json'),observation)
    if not observation['sufficient']: raise co.Stopped('RESOURCE_EXHAUSTED: required growth and custody reserve unavailable')
    start=time.monotonic();deadline=start+(1200 if preparation else budget)
    count=1+sum(x.get('case')==case for x in state.get('earlyComparisons',[]))
    comparison=f'early-{case}-{count}'
    old=next((e['attempt'] for e in reversed(events(state['session'])) if e.get('comparisonCase')==case),None)
    context={'attempt':None,'precedingAttempt':old,'preparationSession':state['session'],'lab':None}
    if preparation:
        op=f'early-{case}-prepare'
        state.setdefault('earlyPreparation',{})[case]={'status':'PREPARING','operationInstance':op}
        atomic(session_path(state['session'])/'session.json',state)
        try:
            co.run_operation(state,op,'preparation',deadline,instance=op,case_context=context)
            state['earlyPreparation'][case].update(status='READY')
            prepared(state,case)
        except BaseException:
            state['earlyPreparation'][case]['status']='INCOMPLETE'
            raise
        finally:
            state['earlyPreparation'][case]['durationSeconds']=time.monotonic()-start
            atomic(session_path(state['session'])/'session.json',state)
    else:
        prepared(state,case)
        errors=[];item={'case':case,'id':comparison,'startUTC':utc(),'operations':[],'status':'INCOMPLETE'}
        state.setdefault('earlyComparisons',[]).append(item)
        try:
            for side in ('negative','positive'):
                operation=f'early-{case}-{side}';instance=f'{operation}-{count}'
                context.update(attempt=instance,comparisonId=comparison,comparisonCase=case,linkedAttempt=f'early-{case}-{"positive" if side=="negative" else "negative"}-{count}')
                try:
                    co.run_operation(state,operation,'live',deadline,instance=instance,case_context=context)
                except co.Stopped as error:
                    errors.append(str(error))
                    if state.get('operational')=='ABORTED' or error.code in (124,130,143): raise
                finally:
                    # A cancellation may close an operation before propagating.
                    # Associate that actual report too; do not invent a report on failure to start.
                    if any(e.get('operationInstance')==instance for e in events(state['session'])):
                        item['operations'].append(instance)
            item['status']='CONFIRMED' if not errors else 'ERROR'
            if errors: raise co.Stopped('; '.join(errors))
        finally:
            item.update(endUTC=utc(),durationSeconds=time.monotonic()-start,errors=errors)
            atomic(session_path(state['session'])/'session.json',state)
