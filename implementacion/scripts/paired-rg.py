#!/usr/bin/env python3
"""Workflow entrypoint. Each shell phase retains strict error propagation."""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
import paired_campaign as campaign
from paired_measurements import (PROTOCOL, WORKFLOW, read, write, identity, stamp, elapsed,
                                event, classify, new_record, validate_source, cache_evidence,
                                retry_ticket, summarize, cache_manifest, pilot_plan, required_fields_match)
from lane_a_evidence import preserve_databases, hash_export, verify_package, sha, regular
ROOT = Path(__file__).resolve().parents[1]

def git(*args):
    return subprocess.check_output(['git','-C',str(ROOT),*args],text=True).strip()

def output(key,value):
    if '\n' in str(value): raise ValueError('Invalid step output')
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'],'a') as f: f.write(f'{key}={value}\n')

def run_logged(command, destination, env=None):
    with Path(destination).open('w') as log:
        return subprocess.run(command,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT).returncode

def admission_denial(diagnostic):
    """Reuse strict singleton attribution; ambiguous verification errors stay ERROR."""
    expected={
        'authorized-image-repository':'validation failure: IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest',
    }
    for rule, reason in expected.items():
        result=subprocess.run(['bash','-c',
            'source "$1"; scenario_admission_single_reason "$2" tfm-runtime "$3"',
            'classifier',str(ROOT/'tests/scenarios/f13.sh'),str(diagnostic),rule],
            capture_output=True,text=True)
        if result.returncode==0 and result.stdout.strip().split('\t',1)[-1]==reason:
            return {'policy':'tfm-runtime','rule':rule,'reason':reason}
    return None

def pair_path():
    p=Path(os.environ['PAIR_DIR']).resolve()
    if not p.is_relative_to(ROOT/'evidence/measurements') or p.is_symlink():
        raise ValueError('Pair path outside measurements')
    return p

def restore_database(previous, destination):
    import tarfile
    dbs=list((previous/'databases').glob('*.tar.gz'))
    if len(dbs)!=1:raise ValueError('Exactly one preserved database is required')
    archive=dbs[0]
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=Path(str(archive)+'.sha256').read_text().split()[0]:
        raise ValueError('Database archive checksum mismatch')
    destination.mkdir()
    with tarfile.open(archive) as t:
        names=t.getnames()
        if len(names)!=4 or set(names)!={'db/trivy.db','db/metadata.json','identity.json','SHA256SUMS.txt'} or any(not m.isfile() for m in t.getmembers()):raise ValueError('Unsafe replay database')
        t.extractall(destination,filter='data')
    record=read(destination/'identity.json')
    if record['status']!='PASS':raise ValueError('Cannot restore a drifted database')
    expected=record['expectedIdentity']
    for name,h in expected['sha256'].items():
        if name not in ('trivy.db','metadata.json') or hashlib.sha256((destination/'db'/name).read_bytes()).hexdigest()!=h:raise ValueError('Replay database mismatch')
    if set(expected['sha256'])!={'trivy.db','metadata.json'}:raise ValueError('Incomplete database identity')
    listed=set()
    for line in (destination/'SHA256SUMS.txt').read_text().splitlines():
        h,name=line.split('  ',1)
        if name in listed or name not in ('db/trivy.db','db/metadata.json','identity.json') or hashlib.sha256((destination/name).read_bytes()).hexdigest()!=h:raise ValueError('Database internal checksum mismatch')
        listed.add(name)
    if listed!={'db/trivy.db','db/metadata.json','identity.json'}:raise ValueError('Incomplete database checksum manifest')
    if read(destination/'db/metadata.json')!=expected['metadata']:raise ValueError('Database metadata mismatch')
    return expected['sha256']

def verify_export(directory):
    """Verify the retained artifact before using its retry record or diagnostics."""
    directory=Path(directory)
    if directory.resolve()!=directory.absolute() or any(f.is_symlink() for f in directory.rglob('*')):
        raise ValueError('Symlinked artifact path')
    files=set()
    for line in (directory/'SHA256SUMS.txt').read_text().splitlines():
        expected,name=line.split('  ',1);path=directory/name
        if Path(name).is_absolute() or '..' in Path(name).parts or path.is_symlink() or not path.is_file() or name in files:
            raise ValueError('Unsafe or duplicate artifact member')
        digest=hashlib.sha256()
        with path.open('rb') as stream:
            for chunk in iter(lambda:stream.read(1024*1024),b''):digest.update(chunk)
        if digest.hexdigest()!=expected:raise ValueError('Artifact checksum mismatch')
        files.add(name)
    actual={str(f.relative_to(directory)) for f in directory.rglob('*') if f.is_file() and f.name!='SHA256SUMS.txt'}
    if files!=actual:raise ValueError('Artifact manifest is incomplete')

def campaign_configuration():
    return {'workflow':WORKFLOW,'protocolSha256':sha(ROOT/'measurements/protocol-v1.json'),
            'implementationTree':git('rev-parse','HEAD:implementacion'),
            'toolsLockSha256':sha(ROOT/'tools.lock.json'),'versionsSha256':sha(ROOT/'versions.env'),
            'warmupSource':read(ROOT/'measurements/protocol-v1.json')['warmupSource']}

def campaign_source(expected):
    head=git('rev-parse','HEAD')
    if head!=expected or not campaign.digest(head,40) or git('status','--porcelain','--untracked-files=no'):
        raise ValueError('Campaign binding requires the exact clean final source')
    if git('rev-parse','origin/main')!=head:
        raise ValueError('Fetch final merged main before binding a campaign')
    return head

def verify_pair_packages(directory, pair):
    """Retain partial failures; a PASS requires all independently bound packages."""
    records=pair.get('packageVerification',{})
    if pair.get('status')=='PASS':
        if set(records)!={'infrastructure','R','G'}:
            raise ValueError('Successful pair arm/infrastructure packages are missing')
        images=[pair['arms'][a].get('image','') for a in 'RG']
        if len(set(images))!=2 or not all(re.fullmatch(r'.+@sha256:[a-f0-9]{64}',image) for image in images):
            raise ValueError('Pair images must be independent')
    for label,record in records.items():
        name=record['archive']
        if label not in ('infrastructure','R','G') or Path(name).name!=name or verify_package(directory/'packages'/name)!=record:
            raise ValueError('Pair package verification differs')
        if label in ('R','G'):
            import tarfile
            with tarfile.open(directory/'packages'/name) as archive:
                member=name.removesuffix('.tar.gz')+'/measurement.json'
                if member not in archive.getnames():raise ValueError('Pair package lacks its arm observation')
                observation=json.loads(archive.extractfile(member).read())
            fields=('schema','protocol','configuration','source','warmupSource','runId','dataset',
                    'pair','order','attempt','planIdentity','image','primaryStart','primaryEnd','primarySeconds','phases')
            if pair.get('dataset')=='campaign':fields+=('database','toolsLockSha256')
            for key in fields:
                if key not in observation or observation[key]!=pair['arms'][label].get(key):
                    raise ValueError('Archive observation differs from its pair')

def verify_development(directory, source, order):
    directory=Path(directory).resolve();verify_export(directory);pair=read(directory/'pair.json')
    if (pair.get('dataset')!='development' or pair.get('source')!=source or pair.get('order')!=order
            or pair.get('workflow')!=WORKFLOW or pair.get('attempt')!=1 or pair.get('status')!='PASS'
            or pair.get('protocol')!=PROTOCOL or pair.get('retentionErrors')):
        raise ValueError('Fresh successful development '+order+' at the final source is required')
    protocol=read(ROOT/'measurements/protocol-v1.json')
    if read(directory/'protocol.json')!=protocol or pair.get('warmupSource')!=protocol['warmupSource']:
        raise ValueError('Development protocol differs from final source')
    if summarize([pair])['completeFavorablePairs']!=1:
        raise ValueError('Development delivery/control evidence is incomplete')
    verify_pair_packages(directory,pair)
    with tempfile.TemporaryDirectory(prefix='paired-database-check-') as tmp:
        database=restore_database(directory,Path(tmp)/'db')
    if database!=pair.get('frozenDatabase'):
        raise ValueError('Development database bytes differ from its pair record')
    return pair, {'runId':campaign.run_id(pair['runId']),'order':order,
                  'pairSha256':sha(directory/'pair.json'),'manifestSha256':sha(directory/'SHA256SUMS.txt')}

def bind_campaign(args):
    source=campaign_source(args.expected_source)
    rg,rg_receipt=verify_development(args.development_rg,source,'RG')
    gr,gr_receipt=verify_development(args.development_gr,source,'GR')
    if gr.get('databaseSourceRun')!=rg['runId'] or gr['frozenDatabase']!=rg['frozenDatabase']:
        raise ValueError('Development GR must restore the final-source RG database')
    plan=campaign.bind(read(args.draft),source,campaign_configuration(),rg['frozenDatabase'],[rg_receipt,gr_receipt])
    exclusive_write(args.output,plan)
    print('BOUND_PENDING_HUMAN_AUTHORIZATION '+identity(plan))

def exclusive_write(path,value):
    path=Path(path)
    if path.exists() or path.is_symlink():raise ValueError('Refusing to replace an existing plan or analysis export')
    write(path,value)

def freeze_campaign(args):
    from datetime import datetime,timezone
    plan=read(args.plan);campaign.validate_plan(plan)
    campaign_source(plan['binding']['source'])
    if campaign_configuration()!=plan['binding']['configuration']:
        raise ValueError('Campaign configuration drift after binding')
    if args.authorize is not True:raise ValueError('Explicit human --authorize is required')
    value=campaign.freeze(plan,args.reviewer,args.rationale,datetime.now(timezone.utc).isoformat())
    destination=Path(args.output);destination.mkdir(parents=True,exist_ok=False)
    write(destination/'frozen.json',value);write(destination/'plan.json',plan)
    write(destination/'authorization.json',value['authorization']);hash_export(destination)
    print('FROZEN_CONTROL_ID '+identity(value))
    print('HUMAN_DECLARATION_RECORDED; no workflow dispatched')

def load_campaign(directory, expected_identity):
    directory=Path(directory).resolve();verify_export(directory)
    value=read(directory/'frozen.json');campaign.validate_frozen(value,expected_identity)
    if read(directory/'plan.json')!=value['plan'] or read(directory/'authorization.json')!=value['authorization']:
        raise ValueError('Frozen campaign files disagree')
    return value

def hosted_run(run,source):
    run=campaign.run_id(run)
    value=json.loads(subprocess.check_output(['gh','api',f'repos/tfm-goldenpath/golden-path-lab/actions/runs/{run}'],text=True))
    if (str(value.get('id'))!=run or value.get('head_sha')!=source or value.get('head_branch')!='main'
            or value.get('path')!='.github/workflows/paired-rg.yml' or value.get('event')!='workflow_dispatch'
            or value.get('status')!='completed' or value.get('conclusion')!='success' or value.get('run_attempt')!=1):
        raise ValueError('Expected a completed original paired workflow run at the frozen main source')
    return {k:value[k] for k in ('id','head_sha','head_branch','path','event','status','conclusion','run_attempt')}

def publish_campaign(args):
    # Input is data only. This operation runs in a separate read-only workflow job.
    if os.environ.get('DATASET')!='campaign':raise ValueError('Plan-only publication requires campaign dataset')
    value=json.loads(os.environ['CAMPAIGN_PLAN_JSON']);campaign.validate_frozen(value,args.plan_identity)
    head=git('rev-parse','HEAD');protocol=read(ROOT/'measurements/protocol-v1.json')
    validate_source(os.environ,head,git('status','--porcelain','--untracked-files=no'),
        git('rev-parse',protocol['warmupSource']+':implementacion/services/quotes-node/src'),
        git('rev-parse','HEAD:implementacion/services/quotes-node/src'))
    if args.expected_source!=head:raise ValueError('Expected source differs from plan publication source')
    campaign.validate_execution(value,head,campaign_configuration(),1,value['plan']['pairs'][0]['order'])
    validation=[];pairs=[]
    with tempfile.TemporaryDirectory(prefix='paired-campaign-publication-') as temp:
        for receipt in value['plan']['binding']['development']:
            run=receipt['runId'];metadata=hosted_run(run,head);directory=Path(temp)/run
            subprocess.run(['gh','run','download',run,'--repo','tfm-goldenpath/golden-path-lab',
                '--name','paired-rg-'+run,'--dir',str(directory)],check=True)
            pair,actual=verify_development(directory,head,receipt['order'])
            if actual!=receipt or pair['frozenDatabase']!=value['plan']['binding']['database']:
                raise ValueError('Development receipts or database changed after human authorization')
            validation.append(metadata);pairs.append(pair)
    if pairs[1].get('databaseSourceRun')!=pairs[0]['runId']:
        raise ValueError('Development GR did not reuse RG database')
    destination=Path(args.output);destination.mkdir(parents=True,exist_ok=False)
    write(destination/'frozen.json',value);write(destination/'plan.json',value['plan'])
    write(destination/'authorization.json',value['authorization'])
    write(destination/'publication.json',{'schema':'paired-rg-plan-publication/v1','runId':os.environ['GITHUB_RUN_ID'],
        'source':head,'workflow':WORKFLOW,'controlIdentity':identity(value),'developmentValidation':validation})
    hash_export(destination)
    print('PLAN_PUBLISHED_WITHOUT_DELIVERY '+identity(value))

def initial(args):
    protocol=read(ROOT/'measurements/protocol-v1.json');plan=read(ROOT/'measurements/pilot-plan-v1.json')
    head=git('rev-parse','HEAD');warm=protocol['warmupSource']
    validate_source(os.environ,head,git('status','--porcelain','--untracked-files=no'),
                    git('rev-parse',f'{warm}:implementacion/services/quotes-node/src'),
                    git('rev-parse','HEAD:implementacion/services/quotes-node/src'))
    subprocess.run(['git','-C',str(ROOT),'merge-base','--is-ancestor',warm,head],check=True)
    if args.expected_source != head or args.pair < 1: raise ValueError('Expected target source or pair does not match')
    order=args.order
    if args.dataset=='pilot':
        expected=next((p['order'] for p in plan['pairs'] if p['pair']==args.pair),None)
        if order!=expected: raise ValueError('Order differs from frozen pilot plan')
        if not args.database_from and not args.retry_from:raise ValueError('Pilot requires a preserved development database')
    control=None
    if args.dataset=='campaign':
        if not args.campaign_plan or not args.plan_identity or not args.plan_run:
            raise ValueError('Campaign requires its published frozen plan and identity')
        control=load_campaign(args.campaign_plan,args.plan_identity)
        campaign.validate_execution(control,head,campaign_configuration(),args.pair,order)
        publication=read(Path(args.campaign_plan)/'publication.json')
        if (publication.get('runId')!=campaign.run_id(args.plan_run) or publication.get('source')!=head
                or publication.get('workflow')!=WORKFLOW or publication.get('controlIdentity')!=identity(control)):
            raise ValueError('Campaign plan publication does not match the selected run')
        hosted_run(args.plan_run,head)
        if not args.database_from and not args.retry_from:
            raise ValueError('Campaign requires its preserved final-source development database')
        plan=control['plan']
    if args.database_from and args.retry_from:raise ValueError('Retry restores only its original database')
    p=pair_path();p.mkdir(parents=True,exist_ok=False)
    run=os.environ['GITHUB_RUN_ID']
    value={'schema':'paired-rg-pair/v1','protocol':PROTOCOL,'planIdentity':identity({'source':head,'plan':plan if args.dataset=='pilot' else {'protocol':protocol,'dataset':'development'}}),
           'dataset':args.dataset,'pair':args.pair,'order':order,'attempt':1,'source':head,
           'warmupSource':warm,'workflow':WORKFLOW,'runId':run,'created':stamp(),
           'status':'INCOMPLETE','arms':{},'actionsJobMinutes':None,'billedMinutes':None,'monetaryExpenditure':None,
           'sharedPreparation':{},'humanReview':'pending'}
    if control:
        value.update(planIdentity=identity(plan),campaignPlan=control,
                     frozenDatabase=plan['binding']['database'],campaignPlanRun=args.plan_run)
        # Preserve a validly identified attempt even if database restoration fails.
        write(p/'pair.json',value);write(p/'plan.json',plan);write(p/'campaign-control.json',control)
        write(p/'protocol.json',protocol)
    if args.retry_from:
        prev=Path(args.retry_from).resolve();verify_export(prev);prior=read(prev/'pair.json')
        if control:campaign.validate_observation(prior,control)
        evidence=(prev/args.evidence).resolve()
        if not evidence.is_relative_to(prev) or not evidence.is_file():raise ValueError('Prior evidence missing')
        ticket=retry_ticket(prior,args.cause,evidence.read_text(),os.environ['GITHUB_ACTOR'])
        ticket['evidencePath']=evidence.relative_to(prev).as_posix()
        if any(value[k]!=ticket[k] for k in ('order','source','planIdentity')):raise ValueError('Retry changed order/source/plan')
        if value['warmupSource']!=prior['warmupSource'] or value['pair']!=prior['pair']:raise ValueError('Retry changed pair/cache source')
        value.update(attempt=2,retryOf=prior['runId'],externalFailureReview=ticket)
        if control:write(p/'pair.json',value)
        # Original attempt and consumption remain intact; annotation is separate.
        shutil.copytree(prev,p/'prior-attempt')
        db=p/'retry-db';value['frozenDatabase']=restore_database(prev,db)
        value['retryDatabase']=str(db)
        if control and prior.get('campaignPlan')!=control:raise ValueError('Retry changed campaign authorization')
    elif args.database_from:
        previous=Path(args.database_from).resolve();verify_export(previous);prior=read(previous/'pair.json')
        if prior.get('dataset')!='development' or prior['source']!=head or prior['status']!='PASS':raise ValueError('Database source must be a successful development pair at this revision')
        value['frozenDatabase']=restore_database(previous,p/'retry-db')
        value['retryDatabase']=str(p/'retry-db');value['databaseSourceRun']=prior['runId']
        if control:
            receipt=plan['binding']['development'][0]
            if prior['runId']!=receipt['runId'] or sha(previous/'pair.json')!=receipt['pairSha256'] or sha(previous/'SHA256SUMS.txt')!=receipt['manifestSha256']:
                raise ValueError('Campaign database source differs from frozen development receipt')
    if control and value['frozenDatabase']!=plan['binding']['database']:
        raise ValueError('Campaign database differs from frozen plan')
    write(p/'pair.json',value);write(p/'protocol.json',protocol);write(p/'plan.json',plan)
    output('first',order[0]);output('second',order[1]);output('pair_dir',p)

def timed_process(p,name,command,env=None):
    start=stamp();code=run_logged(command,p/(name+'.log'),env)
    v=read(p/'pair.json');v['sharedPreparation'][name]={'start':start,'end':stamp(),'exitCode':code,'evidence':name+'.log'}
    v['sharedPreparation'][name]['seconds']=elapsed(start,v['sharedPreparation'][name]['end'])
    write(p/'pair.json',v);return code

def shell_phase(args):
    p=pair_path();v=read(p/'pair.json');env=dict(os.environ)
    if args.phase=='bootstrap':
        if v.get('retryDatabase'):env['GP_VULNERABILITY_DB']=v['retryDatabase']
        code=timed_process(p,'infrastructure-caches-readiness',['bash','scripts/paired-delivery.sh','bootstrap'],env)
    else:
        arm=v['order'][args.slot-1]
        paths=read(p/'paths.json');state=Path(paths[arm])
        # Steps must use the original order; completing slot 1 includes its cleanup.
        if args.slot==2 and (not (p/'slot-1-ended.json').exists() or read(p/'slot-1-ended.json').get('cleanupExitCode')!=0):raise ValueError('First slot has not restored starting conditions')
        if git('rev-parse','HEAD')!=v['source'] or git('status','--porcelain','--untracked-files=no'):raise ValueError('Source changed between phases')
        env.update(GP_STATE_DIR=str(state),MEASUREMENT_ARM=arm)
        if args.phase=='finish':env['NATIVE_EXIT_CODE']='0' if args.native=='success' else '1'
        record=read(state/'measurement.json')
        if args.phase=='prepare':
            if record.get('primaryStart'):raise ValueError('Arm already started; no implicit retry')
            start=stamp()
            try:
                if cache_manifest(record['cache']['import'])!=read(state/'cache-manifest.json'):raise ValueError('Prepared cache changed before delivery')
                others=[read(Path(path)/'state.json').get('measurementCache') for key,path in paths.items() if key in ('R','G')]
                if len(others)!=2 or len(set(others))!=2:raise ValueError('Arm caches are not isolated')
            except (ValueError,OSError) as error:
                record['invalidReason']={'cause':'cache-condition','diagnostic':str(error)}
                write(state/'measurement.json',record)
                raise
            finally:
                current=read(p/'pair.json');end=stamp()
                current['sharedPreparation'][arm+'-cache-validation']={'start':start,'end':end,'seconds':elapsed(start,end),'exitCode':1 if record.get('invalidReason') else 0}
                write(p/'pair.json',current)
        prepare_result=p/f'{arm}-prepare-result.json'
        if args.phase=='finish' and (not prepare_result.exists() or read(prepare_result)['exitCode']!=0):
            code=read(prepare_result)['exitCode'] if prepare_result.exists() else 1
        else:
            code=run_logged(['bash','scripts/paired-delivery.sh',args.phase],p/f'{arm}-{args.phase}.log',env)
        if args.phase=='prepare':
            write(prepare_result,{'exitCode':code})
            output('configuration',arm)
            if code==0:
                state_data=read(state/'state.json');output('image',state_data['imageRepository']);output('digest',state_data['digest'])
        else:
            # Always remove only this run's namespace workload before slot 2.
            ns='tfm-golden' if arm=='G' else 'tfm-reference'
            cleanup=['bash','scripts/paired-cleanup.sh','arm',str(state),ns]
            cleanup_code=timed_process(p,arm+'-workload-cleanup',cleanup,env)
            if cleanup_code and code==0:code=cleanup_code
            write(p/f'slot-{args.slot}-ended.json',{'configuration':arm,'exitCode':code,'cleanupExitCode':cleanup_code})
        write(p/(arm+'.json'),read(state/'measurement.json'))
    return code

def marking(args):
    path=Path(args.path);v=read(path)
    if args.command=='mark':event(v,args.name,args.action,args.code)
    elif args.command=='bind-image':
        state=read(path.parent/'state.json');digest=state['digest']
        if not re.fullmatch(r'sha256:[0-9a-f]{64}',digest):raise ValueError('Invalid built image digest')
        v['image']=state['imageRepository']+'@'+digest
    elif args.command=='begin':
        if v.get('primaryStart'):raise ValueError('Duplicate delivery start')
        v['primaryStart']=stamp()
    elif args.command=='interrupted':
        for name,phase in v['phases'].items():
            if 'end' not in phase and args.code!=0:event(v,name,'end',args.code)
        if args.code!=0:v['failureExitCode']=args.code
        if args.code!=0 and 'http' in v['phases'] and v.get('functional')!='PASS':v['functional']='ERROR'
        a=path.parent/'analysis.json'
        if a.exists() and read(a).get('status')=='BLOCKED':v['policyRejected']=True
        if args.code==1:
            for name in ('manifest-policy.json','workflow-policy.json'):
                try:
                    rows=read(path.parent/name)
                    if isinstance(rows,list) and rows and all(isinstance(r,dict) and not any(r.get(k) for k in ('errors','exceptions','warnings')) for r in rows) and any(r.get('failures') for r in rows):v['policyRejected']=True
                except (OSError,ValueError):pass
    elif args.command=='admission':
        now=stamp();event(v,'admission','end',args.code,now)
        v['primaryEnd']=now;v['primarySeconds']=elapsed(v['primaryStart'],now)
        # Retain the response endpoint even if response interpretation fails.
        v['admission']={'outcome':'ERROR','exitCode':args.code,'response':Path(args.response).name,'diagnostic':Path(args.diagnostic).name}
        write(path,v)
        outcome='ERROR'
        if args.code==0:
            obj=read(args.response)
            state=read(path.parent/'state.json');image=state['imageRepository']+'@'+state['digest']
            ns='tfm-golden' if v['configuration']=='G' else 'tfm-reference'
            if obj.get('kind')!='Deployment' or obj.get('metadata',{}).get('name')!='quotes-node' or obj['metadata'].get('namespace')!=ns or not obj['metadata'].get('uid') or obj['spec']['template']['spec']['containers'][0]['image']!=image:
                raise ValueError('Not a fresh expected CREATE response')
            if not required_fields_match(read(path.parent/(ns+'.json')),obj):
                raise ValueError('Admission mutated an explicit desired field')
            outcome='ACCEPTED';v['image']=image
        else:
            attribution=admission_denial(args.diagnostic) if v['configuration']=='G' else None
            if attribution:
                outcome='REJECTED';v['admissionAttribution']=attribution
        v['admission']={'outcome':outcome,'exitCode':args.code,'response':Path(args.response).name,'diagnostic':Path(args.diagnostic).name}
    elif args.command=='functional':
        v['functional']='PASS'
        try:
            v['cacheEvidence']=cache_evidence((path.parent/'build.log').read_text());v['cacheValidated']=True
        except ValueError as error:
            v['invalidReason']={'cause':'cache-condition','evidence':'build.log','diagnostic':str(error)}
            v['classification']=classify(v);write(path,v);raise
    v['classification']=classify(v);write(path,v)

def finalize():
    p=pair_path();v=read(p/'pair.json');paths=read(p/'paths.json') if (p/'paths.json').exists() else {}
    # Strict cleanup and retention each have their own outcomes; neither masks failure.
    if paths:
        timed_process(p,'infrastructure-cleanup',['bash','scripts/paired-cleanup.sh','infrastructure',paths['infrastructure']])
    v=read(p/'pair.json');start=stamp();packages=p/'packages';packages.mkdir(exist_ok=True)
    for arm in 'RG':
        if arm in paths and (Path(paths[arm])/'measurement.json').exists():
            rec=read(Path(paths[arm])/'measurement.json');rec['classification']=classify(rec)
            v['arms'][arm]=rec;write(p/(arm+'.json'),rec)
    for label,path in paths.items():
        state=Path(path)
        if state.exists():
            try:
                code=run_logged(['python3','scripts/package-evidence.py',str(state),str(packages),'RECORDED'],p/(label+'-package.log'))
                if code:raise ValueError('Evidence packaging failed: '+label)
                verification=verify_package(packages/(state.name+'.tar.gz'))
                v.setdefault('packageVerification',{})[label]=verification
            except (ValueError,OSError) as error:
                v.setdefault('retentionErrors',[]).append(str(error))
    try:
        state=Path(paths['infrastructure']) if 'infrastructure' in paths else None
        if state and (state/'database-identity.json').exists():
            preserve_databases(state,p/'databases',ROOT)
            if read(p/'databases/index.json')['status']!='PASS':raise ValueError('Database preservation drift')
        else:write(p/'databases/index.json',{'status':'NOT_CREATED'})
    except (ValueError,OSError) as error:
        v.setdefault('retentionErrors',[]).append(str(error))
    end=stamp();write(p/'packaging.json',{'start':start,'end':end,'seconds':elapsed(start,end),'errors':v.get('retentionErrors',[])})
    v['status']='PASS' if len(v['arms'])==2 and all(classify(a)=='valid-favorable' for a in v['arms'].values()) and all(s['exitCode']==0 for s in v['sharedPreparation'].values()) else 'INCOMPLETE_OR_UNFAVORABLE'
    if v.get('retentionErrors'):v['status']='INCOMPLETE_OR_UNFAVORABLE'
    v['classification']='valid-favorable' if v['status']=='PASS' else 'valid-unfavorable' if any(classify(a)=='valid-unfavorable' for a in v['arms'].values()) else 'invalid' if any(classify(a)=='invalid' for a in v['arms'].values()) else 'indeterminate'
    v['finished']=stamp();write(p/'pair.json',v)
    attempts=[]
    if (p/'prior-attempt/pair.json').exists():
        original=read(p/'prior-attempt/pair.json')
        for arm in original.get('arms',{}).values():arm['externalFailure']=v['externalFailureReview']
        attempts.append(original)
    attempts.append(v)
    write(p/'analysis.json',summarize(attempts))
    # Private pointers and replay DB bytes are never exported. DB allowlist archive is separate.
    if (p/'retry-db').exists():shutil.rmtree(p/'retry-db')
    hash_export(p)
    return 0 if v['status']=='PASS' else 1

def job_consumption(pair,jobs,job_id):
    from datetime import datetime
    matches=[j for j in jobs['jobs'] if j['id']==job_id]
    if len(matches)!=1:raise ValueError('Expected exactly one selected job')
    job=matches[0]
    if str(job.get('run_id'))!=str(pair['runId']):raise ValueError('Consumption belongs to another run')
    if pair.get('dataset')=='campaign' and job.get('status')!='completed':
        raise ValueError('Campaign consumption requires completed job metadata')
    if not job.get('completed_at') or not job.get('started_at'):raise ValueError('Job not complete; consumption unknown')
    seconds=(datetime.fromisoformat(job['completed_at'].replace('Z','+00:00'))-datetime.fromisoformat(job['started_at'].replace('Z','+00:00'))).total_seconds()
    if seconds<0:raise ValueError('Invalid completed job timestamps')
    pair['actionsJobMinutes']=seconds/60
    pair['actionsStepTimes']=[{k:step.get(k) for k in ('name','started_at','completed_at','conclusion')} for step in job.get('steps',[])]

def analyze(args):
    if not args.campaign_plan:
        if args.artifact or args.jobs or args.evidence_output:raise ValueError('Campaign artifact analysis requires --campaign-plan')
        pairs=[read(p) for p in args.pairs]
        if any(p.get('dataset')=='campaign' for p in pairs):raise ValueError('Use frozen campaign and original --artifact inputs')
        write(args.output,summarize(pairs));return
    if args.pairs:raise ValueError('Campaign analysis uses immutable --artifact inputs, not edited pair files')
    control=read(args.campaign_plan);campaign.validate_frozen(control)
    if not args.evidence_output:raise ValueError('Campaign analysis requires a separate --evidence-output directory')
    destination=Path(args.evidence_output).resolve()
    if destination.exists():raise ValueError('Preserve previous analyses; choose a new evidence output directory')
    if Path(args.output).resolve()!=destination/'analysis.json':
        raise ValueError('--output must be analysis.json inside the new evidence output')
    pairs=[];inputs=[];unfinalized=[];retained_originals=[]
    for index,name in enumerate(args.artifact):
        directory=Path(name).resolve();verify_export(directory)
        if destination.is_relative_to(directory):raise ValueError('Analysis cannot modify its original artifact')
        if not (directory/'pair.json').exists():
            # Preserve the archive-level failure without inventing a pair identity.
            failures=sorted(directory.glob('failure-*.json'))
            if not failures:raise ValueError('Artifact has neither pair nor failure records')
            unfinalized.append({'artifact':str(directory),'manifestSha256':sha(directory/'SHA256SUMS.txt'),
                                'reason':'No finalized pair identity; not pooled as a timing observation',
                                'failures':[read(f) for f in failures]})
            for file in failures:inputs.append((f'inputs/{index}/{file.name}',file))
        else:
            pair=read(directory/'pair.json');campaign.validate_observation(pair,control)
            if read(directory/'campaign-control.json')!=control or read(directory/'plan.json')!=control['plan']:
                raise ValueError('Artifact plan/control differs from selected campaign')
            for package in (directory/'packages').glob('*.tar.gz'):verify_package(package)
            verify_pair_packages(directory,pair)
            if pair.get('status')=='PASS' or list((directory/'databases').glob('*.tar.gz')):
                with tempfile.TemporaryDirectory(prefix='paired-analysis-db-') as tmp:
                    if restore_database(directory,Path(tmp)/'db')!=pair['frozenDatabase']:
                        raise ValueError('Campaign archived database differs from frozen plan')
            if pair['attempt']==2:
                previous=directory/'prior-attempt';verify_export(previous)
                prior=read(previous/'pair.json');ticket=pair['externalFailureReview']
                campaign.validate_observation(prior,control);retained_originals.append(prior)
                path=regular(previous/ticket['evidencePath'])
                if not path.resolve().is_relative_to(previous) or sha(path)!=ticket['evidenceSha256']:
                    raise ValueError('Retained retry diagnostic does not match its review')
                if ticket['previousRun']!=prior['runId']:raise ValueError('Retry original run mismatch')
                inputs.append((f'inputs/{index}/retry-evidence.txt',path))
                inputs.append((f'inputs/{index}/prior-pair.json',previous/'pair.json'))
            pairs.append(pair);inputs.append((f'inputs/{index}/pair.json',directory/'pair.json'))
        inputs.append((f'inputs/{index}/original-SHA256SUMS.txt',directory/'SHA256SUMS.txt'))
    if any(not any(prior==pair for pair in pairs) for prior in retained_originals):
        raise ValueError('Retry nested original differs from the supplied original attempt')
    assigned=set()
    for index,name in enumerate(args.jobs):
        jobs=read(name);candidates=[j for j in jobs['jobs'] if j.get('name')=='pair']
        if len(candidates)!=1:raise ValueError('Jobs metadata must contain exactly one completed pair job')
        job=candidates[0];run=str(job['run_id'])
        if run in assigned:raise ValueError('Duplicate Actions job consumption input')
        selected=[p for p in pairs if p['runId']==run]
        if not selected:raise ValueError('Job consumption has no matching campaign attempt')
        for pair in selected:job_consumption(pair,jobs,job['id'])
        assigned.add(run);inputs.append((f'jobs/{index}.json',regular(name)))
    result=summarize(pairs,campaign=control)
    result['unfinalizedArtifacts']=unfinalized
    result['analysisInputs']=[{'file':name,'originalPath':str(p),'sha256':sha(p)} for name,p in inputs]
    destination.mkdir(parents=True)
    for name,path in inputs:
        target=destination/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,target)
    # Original records stay byte-for-byte above; derived records retain job enrichment separately.
    write(destination/'observations.json',pairs);write(destination/'frozen.json',control)
    write(destination/'analysis.json',result);hash_export(destination)
    print('CAMPAIGN_ANALYSIS '+result['campaign']['status'])

def main():
    parser=argparse.ArgumentParser();sub=parser.add_subparsers(dest='command',required=True)
    a=sub.add_parser('init');a.add_argument('--dataset',choices=['development','pilot','campaign'],required=True);a.add_argument('--pair',type=int,required=True);a.add_argument('--order',choices=['RG','GR'],required=True);a.add_argument('--expected-source',required=True);a.add_argument('--retry-from');a.add_argument('--database-from');a.add_argument('--cause',default='');a.add_argument('--evidence',default='')
    a.add_argument('--campaign-plan');a.add_argument('--plan-identity');a.add_argument('--plan-run')
    a=sub.add_parser('phase');a.add_argument('phase',choices=['bootstrap','prepare','finish']);a.add_argument('--slot',type=int,choices=[1,2],default=1);a.add_argument('--native',default='success')
    for name in ['begin','bind-image','functional','interrupted','admission','mark']:
        a=sub.add_parser(name);a.add_argument('path')
        if name=='mark':a.add_argument('name');a.add_argument('action',choices=['start','end']);a.add_argument('code',type=int,nargs='?')
        if name in ['interrupted','admission']:a.add_argument('code',type=int)
        if name=='admission':a.add_argument('response');a.add_argument('diagnostic')
    a=sub.add_parser('pointer');a.add_argument('directory');a.add_argument('label',choices=['infrastructure','R','G']);a.add_argument('state')
    a=sub.add_parser('arm-init');a.add_argument('directory');a.add_argument('arm',choices=['R','G']);a.add_argument('state')
    a=sub.add_parser('freeze-db');a.add_argument('identity')
    sub.add_parser('finalize')
    sub.add_parser('preflight')
    sub.add_parser('dependencies')
    sub.add_parser('registry-cleanup')
    a=sub.add_parser('plan');a.add_argument('--seed',required=True);a.add_argument('--output',required=True)
    a=sub.add_parser('analyze');a.add_argument('pairs',nargs='*');a.add_argument('--output',required=True)
    a.add_argument('--campaign-plan');a.add_argument('--artifact',action='append',default=[])
    a.add_argument('--jobs',action='append',default=[]);a.add_argument('--evidence-output')
    a=sub.add_parser('campaign-draft',help='Prepare a balanced draft; does not authorize execution')
    a.add_argument('--seed',required=True);a.add_argument('--pairs',type=int,required=True);a.add_argument('--output',required=True)
    a=sub.add_parser('campaign-bind',help='Bind a draft to final source and verified RG/GR development exports')
    a.add_argument('--draft',required=True);a.add_argument('--expected-source',required=True)
    a.add_argument('--development-rg',required=True);a.add_argument('--development-gr',required=True);a.add_argument('--output',required=True)
    a=sub.add_parser('campaign-freeze',help='Human-only explicit campaign authorization; no dispatch')
    a.add_argument('--plan',required=True);a.add_argument('--reviewer',required=True);a.add_argument('--rationale',required=True)
    a.add_argument('--authorize',action='store_true');a.add_argument('--output',required=True)
    a=sub.add_parser('publish-plan',help='Workflow read-only plan-artifact publication; no deliveries')
    a.add_argument('--expected-source',required=True);a.add_argument('--plan-identity',required=True);a.add_argument('--output',required=True)
    a=sub.add_parser('campaign-inspect',help='Validate a draft, bound plan or explicitly authorized control')
    a.add_argument('path');a.add_argument('--identity-only',action='store_true')
    a=sub.add_parser('verify-export',help='Verify original artifact checksums without editing it');a.add_argument('path')
    a=sub.add_parser('job-minutes');a.add_argument('pair');a.add_argument('jobs');a.add_argument('--job-id',type=int,required=True)
    args=parser.parse_args()
    if args.command=='init':initial(args)
    elif args.command=='phase':return shell_phase(args)
    elif args.command=='finalize':return finalize()
    elif args.command=='plan':write(args.output,pilot_plan(args.seed))
    elif args.command=='campaign-draft':
        exclusive_write(args.output,campaign.draft(args.seed,args.pairs));print('DRAFT; human pair-count/order decision and final-source binding pending')
    elif args.command=='campaign-bind':bind_campaign(args)
    elif args.command=='campaign-freeze':freeze_campaign(args)
    elif args.command=='publish-plan':publish_campaign(args)
    elif args.command=='campaign-inspect':
        value=read(args.path)
        if value.get('schema')=='paired-rg-campaign-control/v1':
            campaign.validate_frozen(value)
            if args.identity_only:print(identity(value))
            else:print('FROZEN_CONTROL_ID '+identity(value));print(json.dumps(value,indent=2))
        else:
            if args.identity_only:raise ValueError('A draft or bound plan has no authorized control identity')
            campaign.validate_plan(value,bound=value.get('state')!='DRAFT');print(json.dumps(value,indent=2));print('NOT_AUTHORIZED')
    elif args.command=='verify-export':verify_export(Path(args.path));print('EXPORT_CHECKSUMS_OK; not human acceptance')
    elif args.command=='freeze-db':
        p=pair_path();v=read(p/'pair.json');actual=read(args.identity)['sha256']
        if v.get('frozenDatabase',actual)!=actual:raise ValueError('Frozen database changed between pairs')
        v['frozenDatabase']=actual;write(p/'pair.json',v)
    elif args.command=='dependencies':return timed_process(pair_path(),'dependencies',['bash','scripts/paired-dependencies.sh'])
    elif args.command=='registry-cleanup':return timed_process(pair_path(),'registry-cleanup',['docker','--config',str(Path.home()/'.docker'),'logout','ghcr.io'])
    elif args.command=='preflight':
        p=pair_path()
        return timed_process(p,'laboratory-regressions',['make','test'])
    elif args.command=='pointer':
        p=Path(args.directory)/'paths.json';v=read(p) if p.exists() else {};v[args.label]=args.state;write(p,v)
    elif args.command=='arm-init':
        state=Path(args.state);v=new_record(read(Path(args.directory)/'pair.json'),args.arm)
        v['cache']={'kind':'prepared-local-export','indexSha256':hashlib.sha256((state/'cache-index.json').read_bytes()).hexdigest(),'builder':read(state/'state.json')['builder'],'import':read(state/'state.json')['measurementCache']}
        write(state/'cache-manifest.json',cache_manifest(v['cache']['import']))
        v['cache']['manifestSha256']=hashlib.sha256((state/'cache-manifest.json').read_bytes()).hexdigest()
        v['evidence']={'admission':'admission-response.json','diagnostics':'admission-response.log','build':'build.log','resources':'resources.json','policies':'admission-policies.json','tools':'tool-versions.txt'}
        v['policySha256']=hashlib.sha256((state/'admission-policies.json').read_bytes()).hexdigest()
        v['database']=read(state/'database-identity.json');v['toolsLockSha256']=hashlib.sha256((ROOT/'tools.lock.json').read_bytes()).hexdigest()
        write(state/'measurement.json',v)
    elif args.command=='analyze':analyze(args)
    elif args.command=='job-minutes':
        v=read(args.pair);job_consumption(v,read(args.jobs),args.job_id)
        v['actionsJobEvidence']={'file':args.jobs,'jobId':args.job_id};write(args.pair,v)
    else:marking(args)
    return 0
if __name__=='__main__':
    try:sys.exit(main())
    except Exception as error:
        print(str(error),file=sys.stderr)
        # Preserve safe diagnostics even when source/preparation fails before
        # an arm exists. No environment values, credentials or argument dump.
        if os.environ.get('PAIR_DIR'):
            try:
                p=pair_path();now=stamp()
                write(p/('failure-'+str(now['monotonicNs'])+'.json'),
                      {'schema':'paired-rg-failure/v1','time':now,'command':sys.argv[1],
                       'diagnostic':str(error),'classification':'indeterminate'})
                if sys.argv[1]=='init':
                    if (p/'retry-db').exists():shutil.rmtree(p/'retry-db')
                    hash_export(p)
            except (OSError,ValueError):pass
        sys.exit(1)
