"""Deterministic bounded offline evidence and portable file integrity. No execution."""
import copy
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
from core import WEB, safe_path, file_record, atomic, digest

BUDGET = 2 * 1024 * 1024
SMALL = 64 * 1024
EXCERPT = 12000


def selection(value, attempts=None, observations=None):
    value = copy.deepcopy(value)
    ids = set(attempts or [])
    known = {e.get('attempt') for e in value['events']}
    if ids - known: raise ValueError('Unknown attempt selection: '+', '.join(sorted(ids-known)))
    if ids:
        value['events'] = [e for e in value['events'] if e.get('attempt') in ids or e.get('phase')=='preparation']
        value['selectedAttempts'] = sorted(ids)
    captures = {o['id']:o for o in value.get('githubObservations',[]) if o.get('id')}
    requested = set(observations or [])
    if requested-captures.keys(): raise ValueError('Unknown observation selection')
    value['githubObservations'] = [captures[k] for k in sorted(requested)]
    if any(o.get('status') not in ('CAPTURED','INCOMPLETE') for o in value['githubObservations']): raise ValueError('Invalid observation selection')
    command_ids = {e.get('commandId') for e in value['events']}
    if ids: value['commands'] = [c for c in value.get('commands',[]) if c.get('commandId') in command_ids]
    if ids: value['stopRequests'] = [r for r in value.get('stopRequests',[]) if r.get('commandId') in command_ids]
    value['localSessions'] = {'entries':[], 'captured':True, 'scope':'Only bound session; no other local sessions exported'}
    value.update(recorded=True, actionsEnabled=False, provisionalLog=None, activeProcessObserved=False)
    value['session']['active'] = None
    value['exportSelection'] = {'session':value['session']['session'], 'attempts':sorted(ids) if ids else 'all recorded session attempts', 'observations':sorted(requested)}
    return value


def references(value):
    child=subprocess.Popen(['node',str(Path(__file__).with_name('export-references.mjs'))],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    stdout,stderr=child.communicate(json.dumps(value),timeout=30)
    if child.returncode: raise ValueError('Evidence reference mapping failed: '+stderr[:1000])
    return json.loads(stdout)


def embed(records, paths, essential, budget=BUDGET):
    """Essential small originals first; excess capacity never becomes an empty excerpt."""
    result={}; remaining=budget
    required=sum(r['size'] for k,r in records.items() if k in essential and r['size']<=SMALL)
    if required>budget: raise ValueError('Essential originals exceed bounded HTML capacity; narrow the selection')
    for key,r in sorted(records.items(),key=lambda item:(0 if item[0] in essential and item[1]['size']<=SMALL else 1 if item[0] in essential else 2,item[1]['path'],item[0])):
        p=paths[key]
        if file_record(p.parent,p,'export','')['sha256']!=r['sha256']: raise ValueError('Artifact changed: '+r['path'])
        count=r['size'] if key in essential and r['size']<=SMALL else min(r['size'],EXCERPT)
        if count>remaining or (remaining==0 and r['size']): count=0
        with p.open('rb') as stream: content=stream.read(count)
        remaining-=len(content)
        status='FULL' if len(content)==r['size'] else 'EXCERPT' if content else 'NOT_EMBEDDED'
        try: text=content.decode('utf-8')
        except UnicodeError:
            if status=='FULL': raise ValueError('Non-text original cannot be embedded as FULL: '+r['path'])
            text=content.decode('utf-8',errors='replace')
        result[key]={'status':status,'text':text,'truncated':status!='FULL','size':r['size'],'path':r['path'],'sha256':r['sha256'],'embeddedBytes':len(content),'essential':key in essential,'reason':{'FULL':'Original bytes included','EXCERPT':'Bounded view; full original in portable folder/package','NOT_EMBEDDED':'HTML budget; full original in portable folder/package'}[status],'portablePath':'files/'+r['sha256']+'.txt'}
    return result


def html(value):
    data=json.dumps(value,ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    page=(WEB/'index.html').read_text().replace('<link rel="stylesheet" href="/style.css">','<style>'+(WEB/'style.css').read_text()+'</style>')
    page=page.replace('<script src="/model.js" defer></script>','<script>'+(WEB/'model.js').read_text()+'</script>')
    return page.replace('<script src="/app.js" defer></script>','<script>window.SAVED_SESSION='+data+';</script><script>'+(WEB/'app.js').read_text()+'</script>')


def write_portable(directory,value,records,paths):
    folder=directory/'portable';folder.mkdir();(folder/'files').mkdir()
    for k,r in records.items():
        target=folder/value['offlineArtifacts'][k]['portablePath']
        if not target.exists(): shutil.copyfile(paths[k],target)
        if file_record(folder,target,'export','')['sha256']!=r['sha256']: raise ValueError('Portable original integrity failure')
    portable=copy.deepcopy(value);portable['portable']=True
    (folder/'index.html').write_text(html(portable))
    inventory={'schema':'demo-portable/v1','selection':value['exportSelection'],'source':value['session']['source'],'renderer':value['renderer'],'artifacts':value['offlineArtifacts'],'missingEssential':value['exportCompleteness']['missing']}
    # Text is already in HTML; inventory contains identities/status, not duplicate payloads.
    inventory['artifacts']={k:{n:v for n,v in r.items() if n!='text'} for k,r in inventory['artifacts'].items()}
    atomic(folder/'inventory.json',inventory)
    (folder/'README.txt').write_text('Recorded evidence only. From this directory: python3 -m http.server 8000 --bind 127.0.0.1\nOpen http://127.0.0.1:8000/ . Or serve any parent and open the relative subdirectory.\nVerify: python3 verify.py\nNo action backend, API or network service required. External GitHub links require network.\nSingle-file alternative: ../recorded.html (file://); NOT_EMBEDDED originals require this folder.\n')
    shutil.copyfile(Path(__file__).with_name('verify-static.py'),folder/'verify.py')
    files=sorted(p for p in folder.rglob('*') if p.is_file())
    (folder/'SHA256SUMS').write_text(''.join(file_record(folder,p,'export','')['sha256']+'  '+p.relative_to(folder).as_posix()+'\n' for p in files))
    return folder
