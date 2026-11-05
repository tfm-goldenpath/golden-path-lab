"""Persistent, session-bound web commands and owned-process supervision.

Only fixed actions are executable. Records are independent of presentation results.
"""
import json
import errno
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime
from contextlib import contextmanager
from core import (ROOT,atomic,boot_id,evidence_root,events,file_record,locked,
                  read_json,safe_path,sanitize,session_path,utc)

TERMINAL={'COMPLETED','FAILED','CANCELLED','TIMED_OUT','UNKNOWN'}
COMMAND_BUDGET_SECONDS=120
COMMANDS={'prepare':'prepare-pending','check':'check','present':'present','step':'step',
          'export':'export','cleanup':'cleanup'}


def observe_process(pid):
    try:
        fields=Path(f'/proc/{int(pid)}/stat').read_text().rsplit(') ',1)[1].split()
        return {'identity':{'pid':int(pid),'start':fields[19],'bootId':boot_id()},
                'state':fields[0],'running':fields[0] not in ('Z','X','x')}
    except (OSError,ValueError,IndexError):return None


def process_identity(pid):
    value=observe_process(pid)
    return value['identity'] if value and value['running'] else None


def folder(name,identifier):
    if not re.fullmatch('[a-f0-9]{32}',identifier):raise ValueError('Invalid command identity')
    path=evidence_root(name)/'actions'/identifier
    if path.resolve()!=path:raise ValueError('Unsafe command directory')
    return path


@contextmanager
def command_lock(name):
    # Runner and viewer can publish adjacent transitions simultaneously. Wait
    # briefly for this metadata lock; do not turn a normal race into a failed job.
    deadline=time.monotonic()+5
    while True:
        guard=locked(session_path(name)/'.actions.lock')
        try:
            guard.__enter__()
            break
        except RuntimeError:
            if time.monotonic()>=deadline:raise
            time.sleep(.01)
    try:yield
    finally:guard.__exit__(None,None,None)


def records(name,kind='actions'):
    if kind not in ('actions','stop-requests'):raise ValueError('Invalid command inventory')
    root=evidence_root(name)/kind
    if root.resolve()!=root:raise ValueError('Unsafe action inventory')
    return sorted((read_json(safe_path(root,p.name+'/command.json')) for p in root.glob('*')
                   if re.fullmatch('[a-f0-9]{32}',p.name)),key=lambda c:c['acceptedUTC'])


def current(name):
    p=session_path(name)/'action-current.json'
    return read_json(folder(name,read_json(p)['commandId'])/'command.json') if p.exists() else None


def update(name,identifier,**values):
    with command_lock(name):
        path=folder(name,identifier)/'command.json';record=read_json(path)
        if record['status'] in TERMINAL:return record
        record.update(values);atomic(path,record);return record


def finish(name,identifier,code,reason=None,unknown=False,timed_out=False):
    """Close only this command; never infer success from another lastCommand."""
    try:return close_receipt(name,identifier,code,reason,unknown,timed_out)
    except OSError as error:
        if error.errno!=errno.ENOSPC:raise
        from coordinator import release_receipt_reserve
        release_receipt_reserve(name)
        return close_receipt(name,identifier,code,'RESOURCE_EXHAUSTED during command evidence closure; partial originals retained',True)


def close_receipt(name,identifier,code,reason=None,unknown=False,timed_out=False):
    path=folder(name,identifier)
    record=update(name,identifier,status='CLOSING')
    if record['status'] in TERMINAL:return record
    original=path/'output-original.log'
    raw=b''
    if original.exists():
        original=safe_path(path,'output-original.log')
        with original.open('rb') as stream:raw=stream.read(8*1024**2)
    text=sanitize(raw.decode('utf-8',errors='replace'))
    if reason and reason not in text:text+=('\n' if text else '')+sanitize(reason)+'\n'
    with command_lock(name):
        record=read_json(path/'command.json')
        if record['status'] in TERMINAL:return record
        output=path/'output.log'
        if output.resolve()!=output:raise ValueError('Unsafe command output')
        output.write_text(text)
        linked=[{'session':e['session'],'sequence':e['sequence'],'operation':e['operation'],
                 'operationInstance':e.get('operationInstance'), 'fixtureSession':e.get('fixtureSession')}
                for e in events(name) if e.get('commandId')==identifier]
        status='UNKNOWN' if unknown else 'TIMED_OUT' if timed_out or code==124 else 'COMPLETED' if code==0 else 'CANCELLED' if code in (130,143,-15,-2) else 'FAILED'
        ended=utc()
        duration=max(0,(datetime.fromisoformat(ended)-datetime.fromisoformat(record['startedUTC'])).total_seconds()) if record.get('startedUTC') else None
        record.update(status=status,exitCode=code,endUTC=ended,durationSeconds=duration,diagnostic=sanitize(reason or ''),operations=linked,
                      truncated=original.exists() and original.stat().st_size>len(raw),sanitized=True)
        artifacts=[file_record(evidence_root(name),path/'output.log','web-action','Sanitized output of command '+identifier)]
        artifacts[0]['sanitized']=True
        receipt={**record,'artifacts':artifacts}
        atomic(path/'result.json',receipt)
        artifacts.append(file_record(evidence_root(name),path/'result.json','web-action','Closed command receipt'))
        record['artifacts']=artifacts;atomic(path/'command.json',record)
        return record


def public_records(name):
    result=[]
    for value in records(name)[-100:]:
        record=dict(value);path=folder(name,record['commandId'])
        record['processObserved']=process_identity((record.get('process') or {}).get('pid',0))==record.get('process') if record.get('process') else False
        output=path/('output.log' if record['status'] in TERMINAL else 'output-original.log')
        if record['status'] not in TERMINAL:
            state=read_json(session_path(name)/'session.json')
            if state.get('activeFixture'):
                from cases import fixture
                child=fixture(state)
                if child and child['session']==state['activeFixture']:state=child
            active=state.get('active') or {}
            if active.get('commandId')==record['commandId']:
                instance=active.get('instance',active.get('operation',''))
                if re.fullmatch('[a-z0-9-]+',instance):
                    candidate=evidence_root(state['session'])/'operations'/instance/'output-original.log'
                    if candidate.is_file():output=candidate
                    record['activeOperation']={**active,'session':state['session']}
        if output.exists():
            if output.resolve()!=output:raise ValueError('Unsafe command output')
            with output.open('rb') as stream:
                stream.seek(max(0,output.stat().st_size-8192));record['output']=sanitize(stream.read(8192).decode('utf-8',errors='replace'))
            record['outputModifiedUTC']=__import__('datetime').datetime.fromtimestamp(output.stat().st_mtime,__import__('datetime').timezone.utc).isoformat()
            record['outputExcerpt']=output.stat().st_size>8192
        result.append(record)
    return result


class Supervisor:
    def __init__(self,name):self.name=name;self.child=None;self.child_id=None;self.mutex=threading.RLock()

    def reconcile(self):
        from server import owned_worker,public_session
        # Reap first, unconditionally: a persisted zombie must never short circuit poll.
        code=self.child.poll() if self.child is not None else None
        record=current(self.name)
        if record:
            alive=record.get('process') and process_identity(record['process']['pid'])==record['process']
            # Admission and Popen are serialized locally. A restarted viewer must
            # also allow the original live launcher to finish publishing the PID.
            launcher=record.get('launcher')
            starting=(record['status']=='ACCEPTED' and not record.get('process') and launcher
                      and process_identity(launcher['pid'])==launcher
                      and (datetime.fromisoformat(utc())-datetime.fromisoformat(record['acceptedUTC'])).total_seconds()<10)
            child_running=self.child is not None and self.child_id==record['commandId'] and code is None
            orphan=owned_worker(public_session(self.name))
            if not alive and not starting and not child_running and not orphan and record['status'] not in TERMINAL:
                record=finish(self.name,record['commandId'],code if self.child_id==record['commandId'] else None,
                              'Worker exited without a terminal command receipt; result unconfirmed',unknown=True)
            if code is not None:self.child=None;self.child_id=None
            if alive or starting or child_running or orphan:return True,record
        state=public_session(self.name);controller=state.get('controller')
        running=bool(controller and process_identity(controller['pid'])==controller) or bool(owned_worker(state))
        return running,record

    def accept(self,action,gate):
        with self.mutex,command_lock(self.name):
            # The caller reconciles before entering this cross-viewer admission lock.
            record=current(self.name)
            if record and record['status'] not in TERMINAL:raise ValueError('Another command owns this session')
            identifier=uuid.uuid4().hex;path=folder(self.name,identifier);path.mkdir(parents=True,exist_ok=False)
            state=read_json(session_path(self.name)/'session.json')
            record={'schema':'demo-command/v1','commandId':identifier,'session':self.name,'action':action,
                    'acceptedUTC':utc(),'status':'ACCEPTED','startedUTC':None,'endUTC':None,'exitCode':None,
                    'operations':[],'process':None,'launcher':process_identity(os.getpid()),'artifacts':[],
                    'source':state.get('source'),'profile':state['profile'],
                    'fixtureSession':(state.get('f13Fixture') or {}).get('session') if action in ('case-f13','recover-f13-case','cleanup-f13-case') else None}
            atomic(path/'command.json',record);atomic(session_path(self.name)/'action-current.json',{'commandId':identifier})
        if not gate['enabled']:
            return finish(self.name,identifier,1,gate['reason'])
        try:
            with (path/'output-original.log').open('xb') as stream:
                self.child=subprocess.Popen([sys.executable,str(Path(__file__).resolve()),'--session',self.name,'--command-id',identifier],
                                            cwd=ROOT,stdout=stream,stderr=stream,start_new_session=True)
            self.child_id=identifier
            update(self.name,identifier,process=process_identity(self.child.pid))
        except OSError as error:
            return finish(self.name,identifier,1,'Subprocess startup failed: '+str(error))
        return read_json(path/'command.json')

    def stop(self):
        # A stop acknowledgement is not the terminal result of its target.
        identifier=uuid.uuid4().hex;accepted=utc()
        result=self._stop()
        receipt={'schema':'demo-stop/v1','requestId':identifier,'session':self.name,
                 'action':'stop','acceptedUTC':accepted,'endUTC':utc(),**result}
        path=evidence_root(self.name)/'stop-requests'/identifier/'result.json'
        atomic(path,receipt)
        artifact=file_record(evidence_root(self.name),path,'web-stop','Stop acknowledgement, not proof of cancellation')
        atomic(path.with_name('command.json'),{**receipt,'artifacts':[artifact]})
        return {**result,'requestId':identifier,'receipt':artifact}

    def _stop(self):
        from server import owned_worker,public_session
        running,record=self.reconcile()
        if not running:return {'stopState':'ALREADY_FINISHED','commandId':record.get('commandId') if record else None}
        if record and record['status']=='CLOSING':return {'stopState':'CLOSING','commandId':record['commandId']}
        state=public_session(self.name)
        last=state.get('lastCommand') or {}
        if record and last.get('commandId')==record['commandId'] and last.get('endUTC'):
            return {'stopState':'ALREADY_FINISHED' if record['status'] in TERMINAL else 'CLOSING','commandId':record['commandId']}
        identity=record.get('process') if record and record['status'] not in TERMINAL else state.get('controller')
        if not identity or process_identity(identity['pid'])!=identity:identity=owned_worker(state)
        if not identity:return {'stopState':'UNKNOWN','commandId':record.get('commandId') if record else None}
        if record and record.get('stopTarget')==identity:return {'stopState':'STOPPING','commandId':record['commandId']}
        if record:update(self.name,record['commandId'],stopRequestedUTC=utc(),stopTarget=identity,status='STOPPING')
        try:
            if process_identity(identity['pid'])!=identity:return {'stopState':'ALREADY_FINISHED','commandId':record.get('commandId') if record else None}
            if identity==owned_worker(state):os.killpg(identity['pid'],signal.SIGTERM)
            else:os.kill(identity['pid'],signal.SIGTERM)
        except ProcessLookupError:return {'stopState':'ALREADY_FINISHED','commandId':record.get('commandId') if record else None}
        return {'stopRequested':True,'stopState':'REQUESTED','commandId':record.get('commandId') if record else None}


def execute(name,identifier):
    from cases import ACTIONS
    import coordinator as co
    record=read_json(folder(name,identifier)/'command.json');action=record['action']
    if record['session']!=name or record['status'] in TERMINAL:raise ValueError('Invalid command owner or terminal command')
    if action not in (*COMMANDS,*ACTIONS):raise ValueError('Unsupported action')
    os.environ['GP_DEMO_COMMAND_ID']=identifier;os.environ['GP_DEMO_COMMAND_SESSION']=name
    update(name,identifier,startedUTC=utc(),status='RUNNING',process=process_identity(os.getpid()))
    command='case' if action in ACTIONS else COMMANDS[action]
    sys.argv=[str(Path(co.__file__)),command,'--session',name,'--auto','--budget-seconds',str(COMMAND_BUDGET_SECONDS)]+(['--case-action',action] if action in ACTIONS else [])
    update(name,identifier,command=[sys.executable,*sys.argv],budgetSeconds=COMMAND_BUDGET_SECONDS if action in ('check','present','step','case-f11-early','case-f11-admission','case-f13','recover-f13-case') else None)
    signal.signal(signal.SIGTERM,lambda *_:(_ for _ in ()).throw(KeyboardInterrupt()))
    if action=='check':
        # Also bound pre-operation readiness checks (source/lock acquisition),
        # not only the adapter. One-shot expiry leaves receipt closure possible.
        signal.signal(signal.SIGALRM,lambda *_:(_ for _ in ()).throw(co.Stopped('BUDGET_EXCEEDED during environment check',124)))
        signal.setitimer(signal.ITIMER_REAL,COMMAND_BUDGET_SECONDS)
    code=1;reason=None
    try:code=co.main()
    except KeyboardInterrupt:
        last=read_json(session_path(name)/'session.json').get('lastCommand') or {}
        if last.get('commandId')==identifier and last.get('endUTC'):
            code=last.get('exitCode',130);reason=last.get('error')
        else:code=130;reason='Interrupted; partial evidence retained'
    except (Exception,SystemExit) as error:code=getattr(error,'code',1) or 1;reason=str(error);print('ERROR: '+reason,flush=True)
    finally:
        # Cancellation during closing must not interrupt receipt persistence or
        # turn completed work into a cancelled result. Reconciliation observes it.
        signal.signal(signal.SIGTERM,signal.SIG_IGN)
        signal.setitimer(signal.ITIMER_REAL,0)
        sys.stdout.flush();sys.stderr.flush();finish(name,identifier,code,reason)
    return code


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--session',required=True);parser.add_argument('--command-id',required=True)
    args=parser.parse_args();sys.exit(execute(args.session,args.command_id))
