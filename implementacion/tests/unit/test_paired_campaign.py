"""Explicitly synthetic campaign contracts; no human decisions or hosted runs."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import paired_measurements as M
import paired_campaign as C
from test_paired_measurements import favorable, runner
from types import SimpleNamespace

def configuration():
    return {'workflow': M.WORKFLOW, 'protocolSha256': 'a'*64,
            'implementationTree': 'b'*40, 'toolsLockSha256': 'c'*64, 'versionsSha256': 'd'*64,'warmupSource':'b'*40}

def bound(count=4):
    draft = C.draft('SYNTHETIC-unit-test-seed', count)
    return C.bind(draft, 'e'*40, configuration(), {'trivy.db':'f'*64,'metadata.json':'0'*64},
                  [{'runId':str(i+1),'order':order,'pairSha256':str(i+1)*64,'manifestSha256':str(i+3)*64}
                   for i,order in enumerate(('RG','GR'))])

def frozen(count=4):
    return C.freeze(bound(count), 'SYNTHETIC reviewer', 'SYNTHETIC declaration for unit tests only',
                    '2026-10-04T00:00:00+00:00')

def observation(control, position=1, run='100', favorable_pair=True):
    plan=control['plan'];p={'schema':'paired-rg-pair/v1','protocol':M.PROTOCOL,
        'planIdentity':M.identity(plan),'campaignPlan':copy.deepcopy(control),
        'dataset':'campaign','workflow':M.WORKFLOW,'pair':position,'order':plan['pairs'][position-1]['order'],
        'attempt':1,'source':plan['binding']['source'],'warmupSource':'b'*40,
        'runId':run,'status':'PASS' if favorable_pair else 'INCOMPLETE_OR_UNFAVORABLE',
        'frozenDatabase':plan['binding']['database'],'arms':{}}
    if favorable_pair:p['arms']={a:favorable(t,a,p) for a,t in [('R',10),('G',15)]}
    for arm in p['arms'].values():
        arm.update(database={'sha256':plan['binding']['database']},toolsLockSha256=plan['binding']['configuration']['toolsLockSha256'])
    return p

class CampaignPlan(unittest.TestCase):
    def test_draft_repeatable_balanced_and_not_authorized(self):
        for count in (2,4,10,12):
            value=C.draft('SYNTHETIC-seed',count)
            self.assertEqual(value,C.draft('SYNTHETIC-seed',count))
            self.assertEqual([p['pair'] for p in value['pairs']],list(range(1,count+1)))
            self.assertEqual([p['order'] for p in value['pairs']].count('RG'),count//2)
            with self.assertRaises(ValueError):C.validate_frozen({'plan':value})
        self.assertNotEqual(C.draft('SYNTHETIC-a',10)['pairs'],C.draft('SYNTHETIC-b',10)['pairs'])

    def test_invalid_counts_and_blank_seed(self):
        for count in (-2,0,1,3,True,4.0,'10'):
            with self.subTest(count=count),self.assertRaises(ValueError):C.draft('seed',count)
        with self.assertRaises(ValueError):C.draft(' ',10)

    def test_reject_tampered_positions_order_and_seed(self):
        for mutate in (lambda p:p['pairs'].append(p['pairs'][0]),
                       lambda p:p['pairs'][0].update(pair=2),
                       lambda p:p['pairs'][0].update(order='RX'),
                       lambda p:p.update(seed='changed')):
            p=bound();mutate(p)
            with self.assertRaises(ValueError):C.validate_plan(p)

    def test_authorization_is_explicit_bound_and_separate(self):
        p=bound();f=frozen();self.assertNotIn('authorization',p)
        C.validate_frozen(f)
        for key,value in [('reviewer',' '),('rationale',''),('decision','pending'),('planIdentity','0'*64)]:
            bad=copy.deepcopy(f);bad['authorization'][key]=value
            with self.assertRaises(ValueError):C.validate_frozen(bad)
        del f['authorization']
        with self.assertRaises(ValueError):C.validate_frozen(f)

    def test_source_configuration_database_and_order_guards(self):
        f=frozen();p=f['plan'];config=configuration()
        C.validate_execution(f,p['binding']['source'],config,1,p['pairs'][0]['order'])
        for source,conf,pos,order in [('a'*40,config,1,p['pairs'][0]['order']),
                (p['binding']['source'],dict(config,toolsLockSha256='1'*64),1,p['pairs'][0]['order']),
                (p['binding']['source'],config,0,'RG'),(p['binding']['source'],config,5,'RG'),
                (p['binding']['source'],config,1,'GR' if p['pairs'][0]['order']=='RG' else 'RG')]:
            with self.assertRaises(ValueError):C.validate_execution(f,source,conf,pos,order)
        for field in ('database','configuration','source'):
            bad=copy.deepcopy(f);bad['plan']['binding'][field]={}
            with self.assertRaises(ValueError):C.validate_frozen(bad)

class CampaignAnalysis(unittest.TestCase):
    def test_empty_partial_and_complete_denominators(self):
        f=frozen();empty=M.summarize([],campaign=f)
        self.assertEqual(empty['campaign']['missingPositions'],[1,2,3,4])
        p=observation(f);a=M.summarize([p],campaign=f)
        self.assertEqual(a['campaign']['status'],'PARTIAL')
        self.assertEqual(a['campaign']['plannedPairs'],4)
        self.assertEqual(a['rows'][0]['RSeconds'],10)
        self.assertEqual(a['rows'][0]['GSeconds'],15)
        full=M.summarize([observation(f,i,str(100+i)) for i in range(1,5)],campaign=f)
        self.assertEqual(full['campaign']['status'],'OBSERVED_ALL_POSITIONS')
        self.assertEqual(full['completeFavorablePairs'],4)
        self.assertIsNone(full['billedMinutes']);self.assertIsNone(full['monetaryExpenditure'])

    def test_duplicates_remain_visible_but_not_selected_for_statistics(self):
        f=frozen();p=observation(f);q=observation(f,run='101')
        a=M.summarize([p,q],campaign=f)
        self.assertEqual(a['campaign']['duplicatePositions'],[1])
        self.assertEqual(a['completeFavorablePairs'],0)
        self.assertEqual(a['attempts'],2)
        self.assertTrue(all('duplicate-position-attempt' in r['exclusionReasons'] for r in a['rows']))

    def test_failed_unfavorable_and_missing_arms_preserved(self):
        f=frozen();p=observation(f,favorable_pair=False)
        a=M.summarize([p],campaign=f)
        self.assertEqual(a['excludedAttempts'],1)
        self.assertTrue(a['rows'][0]['exclusionReasons'])
        self.assertEqual(a['campaign']['unresolvedPositions'],[1])
        p['arms']['G']=observation(f)['arms']['G'];p['arms']['G']['admission']['outcome']='REJECTED'
        self.assertEqual(M.summarize([p],campaign=f)['rows'][0]['classifications']['G'],'valid-unfavorable')

    def test_mixed_or_missing_identity_is_rejected(self):
        f=frozen();p=observation(f)
        for key,value in [('dataset','pilot'),('source','a'*40),('planIdentity','different'),('frozenDatabase',{}),('order','WRONG'),('attempt',True),('schema','other'),('workflow','foreign')]:
            bad=copy.deepcopy(p);bad[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):M.summarize([p,bad],campaign=f)
        with self.assertRaises(ValueError):M.summarize([p],campaign=frozen(10))
        for field,value in [('database',{'sha256':{}}),('toolsLockSha256','0'*64)]:
            bad=copy.deepcopy(p);bad['arms']['G'][field]=value
            with self.assertRaisesRegex(ValueError,'arm database or tool'):M.summarize([bad],campaign=f)

    def test_retry_requires_original_and_review_ticket(self):
        f=frozen();p=observation(f,favorable_pair=False);q=observation(f,run='101')
        q.update(attempt=2,retryOf=p['runId'])
        for a in q['arms'].values():a['attempt']=2
        with self.assertRaises(ValueError):M.summarize([q],campaign=f)
        with self.assertRaises(ValueError):M.summarize([p,q],campaign=f)
        q['externalFailureReview']=M.retry_ticket(p,'network-outage','SYNTHETIC outage log','SYNTHETIC operator')
        q['externalFailureReview']['evidencePath']='outage.log'
        a=M.summarize([p,q],campaign=f)
        self.assertEqual(a['attempts'],2);self.assertEqual(a['completeFavorablePairs'],1)
        self.assertEqual(a['campaign']['retryPositions'],[1])
        duplicate=M.summarize([p,copy.deepcopy(p),q],campaign=f)
        self.assertEqual(duplicate['attempts'],3);self.assertEqual(duplicate['completeFavorablePairs'],0)
        self.assertEqual(duplicate['campaign']['duplicatePositions'],[1])
        p['status']='PASS'
        with self.assertRaises(ValueError):M.summarize([p,q],campaign=f)



def synthetic_archive(path, files):
    import io,tarfile
    files=dict(files)
    prefix='' if 'identity.json' in files else path.stem.split('.')[0]+'/'
    files={prefix+k:v for k,v in files.items()}
    sums=''.join(hashlib.sha256(v).hexdigest()+'  '+k[len(prefix):]+'\n' for k,v in files.items()).encode()
    files[prefix+'SHA256SUMS.txt']=sums
    with tarfile.open(path,'w:gz') as stream:
        for name,data in files.items():
            member=tarfile.TarInfo(name);member.size=len(data);stream.addfile(member,io.BytesIO(data))
    Path(str(path)+'.sha256').write_text(runner.sha(path)+'  '+path.name+'\n')


def development_export(path,order,run):
    path.mkdir();(path/'packages').mkdir();(path/'databases').mkdir()
    protocol=M.read(ROOT/'measurements/protocol-v1.json')
    p={'schema':'paired-rg-pair/v1','protocol':M.PROTOCOL,'dataset':'development','pair':1,'attempt':1,
       'planIdentity':'SYNTHETIC-development-plan','source':'e'*40,'warmupSource':protocol['warmupSource'],
       'order':order,'runId':run,'workflow':M.WORKFLOW,'status':'PASS','packageVerification':{}}
    p['arms']={a:favorable(t,a,p) for a,t in [('R',10),('G',20)]}
    for index,a in enumerate('RG'):
        p['arms'][a]['image']='ghcr.io/synthetic/fixture@sha256:'+str(index+1)*64
    for label in ('infrastructure','R','G'):
        archive=path/'packages'/(label+'.tar.gz')
        files={'synthetic.json':b'{"synthetic":true,"purpose":"unit test only"}'}
        if label in 'RG':files['measurement.json']=json.dumps(p['arms'][label]).encode()
        synthetic_archive(archive,files)
        p['packageVerification'][label]=runner.verify_package(archive)
    db=b'SYNTHETIC unit database, not usable for scanning';meta=b'{"synthetic":true}'
    hashes={k:hashlib.sha256(v).hexdigest() for k,v in [('trivy.db',db),('metadata.json',meta)]}
    expected={'sha256':hashes,'metadata':json.loads(meta)}
    synthetic_archive(path/'databases/db.tar.gz',{'db/trivy.db':db,'db/metadata.json':meta,
        'identity.json':json.dumps({'status':'PASS','expectedIdentity':expected}).encode()})
    p['frozenDatabase']=hashes
    if order=='GR':p['databaseSourceRun']='1'
    M.write(path/'pair.json',p);M.write(path/'protocol.json',protocol);runner.hash_export(path)
    return p


def campaign_export(path):
    """Representative checksum-valid SYNTHETIC arm and DB export; no delivery."""
    original=development_export(path,'RG','100')
    plan=bound();plan['binding']['database']=original['frozenDatabase']
    f=C.freeze(plan,'SYNTHETIC reviewer','SYNTHETIC test only','2026-10-04T00:00:00+00:00')
    value=observation(f)
    for index,arm in enumerate('RG'):
        value['arms'][arm]['image']='ghcr.io/synthetic/fixture@sha256:'+str(index+1)*64
        archive=path/'packages'/(arm+'.tar.gz')
        synthetic_archive(archive,{'synthetic.json':b'{"synthetic":true}',
                                  'measurement.json':json.dumps(value['arms'][arm]).encode()})
        original['packageVerification'][arm]=runner.verify_package(archive)
    value['packageVerification']=original['packageVerification']
    for name,data in [('pair.json',value),('campaign-control.json',f),('plan.json',plan)]:M.write(path/name,data)
    runner.hash_export(path)
    return f,value


class CampaignIO(unittest.TestCase):
    def test_real_bind_checks_original_development_exports(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp:
            p=Path(tmp);development_export(p/'rg','RG','1');development_export(p/'gr','GR','2')
            M.write(p/'draft.json',C.draft('SYNTHETIC',10))
            args=SimpleNamespace(expected_source='e'*40,development_rg=p/'rg',development_gr=p/'gr',draft=p/'draft.json',output=p/'bound.json')
            with patch.object(runner,'campaign_source',return_value='e'*40),patch.object(runner,'campaign_configuration',return_value=configuration()):
                runner.bind_campaign(args)
            result=M.read(p/'bound.json');self.assertEqual(result['binding']['development'][0]['runId'],'1')
            self.assertEqual(result['state'],'BOUND');self.assertNotIn('authorization',result)
            # A rehashed foreign-source/pilot export must still fail before binding.
            for field,value in [('source','a'*40),('dataset','pilot'),('frozenDatabase',{'trivy.db':'0'*64})]:
                original=M.read(p/'rg/pair.json');bad=copy.deepcopy(original);bad[field]=value
                M.write(p/'rg/pair.json',bad);runner.hash_export(p/'rg')
                with self.assertRaises(ValueError):runner.verify_development(p/'rg','e'*40,'RG')
                M.write(p/'rg/pair.json',original);runner.hash_export(p/'rg')

    def test_source_binding_never_accepts_dirty_or_old_main(self):
        for outputs in [('e'*40,' M source.py','e'*40),('e'*40,'','a'*40)]:
            with patch.object(runner,'git',side_effect=outputs),self.assertRaises(ValueError):runner.campaign_source('e'*40)

    def test_explicit_freeze_and_no_overwrite_of_human_declaration(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp:
            p=Path(tmp);M.write(p/'bound.json',bound())
            args=SimpleNamespace(plan=p/'bound.json',reviewer='SYNTHETIC reviewer',rationale='SYNTHETIC test only',authorize=False,output=p/'control')
            with patch.object(runner,'campaign_source',return_value='e'*40),patch.object(runner,'campaign_configuration',return_value=configuration()):
                with self.assertRaisesRegex(ValueError,'authorize'):runner.freeze_campaign(args)
                args.authorize=True;runner.freeze_campaign(args)
                f=runner.load_campaign(p/'control',M.identity(M.read(p/'control/frozen.json')))
                self.assertEqual(f['authorization']['reviewer'],'SYNTHETIC reviewer')
                with self.assertRaises(FileExistsError):runner.freeze_campaign(args)
            self.assertEqual(M.read(p/'bound.json'),bound())

    def test_analysis_keeps_original_bytes_and_incomplete_attempt(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp:
            p=Path(tmp);f=frozen();M.write(p/'frozen.json',f)
            artifact=p/'original';artifact.mkdir();v=observation(f,favorable_pair=False)
            for name,value in [('pair.json',v),('campaign-control.json',f),('plan.json',f['plan'])]:M.write(artifact/name,value)
            runner.hash_export(artifact);before={x.name:x.read_bytes() for x in artifact.iterdir()}
            args=SimpleNamespace(campaign_plan=p/'frozen.json',pairs=[],artifact=[str(artifact)],jobs=[],evidence_output=p/'analysis',output=p/'analysis/analysis.json')
            runner.analyze(args);runner.verify_export(p/'analysis')
            self.assertEqual(before,{x.name:x.read_bytes() for x in artifact.iterdir()})
            result=M.read(p/'analysis/analysis.json');self.assertEqual(result['excludedAttempts'],1)
            self.assertEqual(result['campaign']['missingPositions'],[2,3,4])
            with self.assertRaises(ValueError):runner.analyze(args)

    def test_workflow_plan_publication_has_no_delivery_permissions_or_steps(self):
        result=subprocess.check_output(['conftest','parse',str(ROOT.parent/'.github/workflows/paired-rg.yml')],text=True)
        doc=json.loads(result);doc=next(iter(doc.values()))[0] if 'jobs' not in doc else doc
        job=doc['jobs']['plan'];self.assertEqual(job['permissions'],{'contents':'read','actions':'read'})
        self.assertIn("publish_plan != ''",job['if']);self.assertIn("publish_plan == ''",doc['jobs']['pair']['if'])
        text=json.dumps(job);self.assertNotIn('paired-delivery',text);self.assertNotIn('phase bootstrap',text)
        self.assertNotIn('actions/attest@',text)

    def test_frozen_artifact_corruption_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp:
            p=Path(tmp);f=frozen()
            for name,value in [('frozen.json',f),('plan.json',f['plan']),('authorization.json',f['authorization'])]:M.write(p/name,value)
            runner.hash_export(p);runner.load_campaign(p,M.identity(f))
            M.write(p/'authorization.json',dict(f['authorization'],decision='pending'))
            with self.assertRaises(ValueError):runner.load_campaign(p,M.identity(f))
            runner.hash_export(p)
            with self.assertRaises(ValueError):runner.load_campaign(p,M.identity(f))

    def test_init_uses_only_matching_authorized_campaign_and_database(self):
        from contextlib import ExitStack
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp,ExitStack() as mocks:
            p=Path(tmp);previous=p/'development';record=development_export(previous,'RG','1')
            _,receipt=runner.verify_development(previous,'e'*40,'RG')
            config=configuration();config['warmupSource']=record['warmupSource']
            plan=C.bind(C.draft('SYNTHETIC',4),'e'*40,config,record['frozenDatabase'],
                [receipt,{'runId':'2','order':'GR','pairSha256':'1'*64,'manifestSha256':'2'*64}])
            f=C.freeze(plan,'SYNTHETIC reviewer','Unit test declaration only','2026-10-04T00:00:00+00:00')
            published=p/'published';published.mkdir()
            for name,value in [('frozen.json',f),('plan.json',plan),('authorization.json',f['authorization']),
                    ('publication.json',{'runId':'9','source':'e'*40,'workflow':M.WORKFLOW,'controlIdentity':M.identity(f)})]:M.write(published/name,value)
            runner.hash_export(published)
            mocks.enter_context(patch.object(runner,'git',return_value='e'*40))
            mocks.enter_context(patch.object(runner,'validate_source'))
            mocks.enter_context(patch.object(runner.subprocess,'run'))
            mocks.enter_context(patch.object(runner,'pair_path',return_value=p/'new'))
            mocks.enter_context(patch.object(runner,'output'))
            mocks.enter_context(patch.object(runner,'hosted_run',return_value={}))
            mocks.enter_context(patch.object(runner,'campaign_configuration',return_value=config))
            mocks.enter_context(patch.dict(os.environ,{'GITHUB_RUN_ID':'100','GITHUB_ACTOR':'SYNTHETIC operator'}))
            args=SimpleNamespace(dataset='campaign',pair=1,order=plan['pairs'][0]['order'],expected_source='e'*40,
                campaign_plan=str(published),plan_identity=M.identity(f),plan_run='9',retry_from=None,
                database_from=str(previous),cause='',evidence='')
            args.plan_identity='0'*64
            with self.assertRaises(ValueError):runner.initial(args)
            self.assertFalse((p/'new').exists())
            args.plan_identity=M.identity(f);runner.initial(args)
            value=M.read(p/'new/pair.json');C.validate_observation(value,f)
            self.assertEqual(value['status'],'INCOMPLETE');self.assertEqual(value['arms'],{})
            self.assertEqual(value['databaseSourceRun'],'1')

    def test_analysis_distinguishes_job_minutes_and_keeps_partial_failures(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp:
            p=Path(tmp);artifact=p/'original';f,v=campaign_export(artifact);M.write(p/'frozen.json',f)
            M.write(p/'jobs.json',{'jobs':[{'id':1,'name':'pair','run_id':100,'started_at':'2026-10-04T00:00:00Z',
                'status':'completed','completed_at':'2026-10-04T00:04:00Z','steps':[]}]})
            args=SimpleNamespace(campaign_plan=p/'frozen.json',pairs=[],artifact=[str(artifact)],jobs=[str(p/'jobs.json')],
                evidence_output=p/'analysis',output=p/'analysis/analysis.json')
            runner.analyze(args);a=M.read(p/'analysis/analysis.json')
            self.assertEqual(a['observedActionsJobMinutes'],4);self.assertIsNone(a['billedMinutes'])
            self.assertEqual(a['rows'][0]['RSeconds'],10)
            self.assertNotIn('actionsJobMinutes',M.read(artifact/'pair.json'))

    def test_publisher_rechecks_hosted_receipts_before_export(self):
        from contextlib import ExitStack
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp,ExitStack() as mocks:
            p=Path(tmp);source='e'*40;config=configuration();records=[];receipts=[]
            for order,run in [('RG','1'),('GR','2')]:
                records.append(development_export(p/run,order,run))
                receipts.append(runner.verify_development(p/run,source,order)[1])
            config['warmupSource']=records[0]['warmupSource']
            plan=C.bind(C.draft('SYNTHETIC publisher',4),source,config,records[0]['frozenDatabase'],receipts)
            f=C.freeze(plan,'SYNTHETIC reviewer','SYNTHETIC unit declaration','2026-10-04T00:00:00+00:00')
            mocks.enter_context(patch.dict(os.environ,{'DATASET':'campaign','CAMPAIGN_PLAN_JSON':json.dumps(f),'GITHUB_RUN_ID':'9'}))
            mocks.enter_context(patch.object(runner,'git',return_value=source))
            mocks.enter_context(patch.object(runner,'validate_source'))
            mocks.enter_context(patch.object(runner,'campaign_configuration',return_value=config))
            metadata=mocks.enter_context(patch.object(runner,'hosted_run',return_value={'synthetic':True}))
            def download(command,**kwargs):
                import shutil
                self.assertEqual(command[:3],['gh','run','download'])
                shutil.copytree(p/command[3],Path(command[-1]))
            mocks.enter_context(patch.object(runner.subprocess,'run',side_effect=download))
            args=SimpleNamespace(expected_source=source,plan_identity=M.identity(f),output=p/'published')
            runner.publish_campaign(args)
            self.assertEqual(metadata.call_count,2)
            runner.load_campaign(p/'published',M.identity(f))
            self.assertEqual(M.read(p/'published/publication.json')['developmentValidation'],[{'synthetic':True}]*2)
            bad=M.read(p/'1/pair.json');bad['extra']='SYNTHETIC changed receipt'
            M.write(p/'1/pair.json',bad);runner.hash_export(p/'1')
            args.output=p/'changed'
            with self.assertRaisesRegex(ValueError,'receipts'):runner.publish_campaign(args)
            self.assertFalse(args.output.exists())

    def test_hosted_metadata_rejects_foreign_failed_and_rerun_sources(self):
        metadata={'id':9,'head_sha':'e'*40,'head_branch':'main','path':'.github/workflows/paired-rg.yml',
                  'event':'workflow_dispatch','status':'completed','conclusion':'success','run_attempt':1}
        with patch.object(runner.subprocess,'check_output',return_value=json.dumps(metadata)):
            self.assertEqual(runner.hosted_run('9','e'*40),metadata)
        for key,value in [('head_sha','a'*40),('head_branch','feature'),('path','other.yml'),
                          ('status','in_progress'),('conclusion','failure'),('run_attempt',2),('id',10)]:
            with patch.object(runner.subprocess,'check_output',return_value=json.dumps(dict(metadata,**{key:value}))),self.assertRaises(ValueError):
                runner.hosted_run('9','e'*40)

    def test_analysis_rejects_foreign_arm_package_and_missing_success_evidence(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp:
            p=Path(tmp);artifact=p/'original';f,value=campaign_export(artifact);M.write(p/'frozen.json',f)
            args=SimpleNamespace(campaign_plan=p/'frozen.json',pairs=[],artifact=[str(artifact)],jobs=[],
                evidence_output=p/'analysis',output=p/'analysis/analysis.json')
            archive=artifact/'packages/R.tar.gz'
            foreign=dict(value['arms']['R'],source='a'*40)
            synthetic_archive(archive,{'synthetic.json':b'{"synthetic":true}','measurement.json':json.dumps(foreign).encode()})
            value['packageVerification']['R']=runner.verify_package(archive)
            M.write(artifact/'pair.json',value);runner.hash_export(artifact)
            with self.assertRaisesRegex(ValueError,'observation differs'):runner.analyze(args)
            value['packageVerification']={};M.write(artifact/'pair.json',value);runner.hash_export(artifact)
            with self.assertRaisesRegex(ValueError,'packages are missing'):runner.analyze(args)

    def test_database_internal_manifest_cannot_omit_or_repeat_files(self):
        import io,tarfile
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp:
            p=Path(tmp);artifact=p/'original';development_export(artifact,'RG','1')
            archive=artifact/'databases/db.tar.gz'
            with tarfile.open(archive) as stream:files={m.name:stream.extractfile(m).read() for m in stream.getmembers()}
            lines=files['SHA256SUMS.txt'].decode().splitlines(keepends=True)
            for index,bad in enumerate([''.join(lines[:-1]),''.join(lines+[lines[0]])]):
                files['SHA256SUMS.txt']=bad.encode()
                with tarfile.open(archive,'w:gz') as stream:
                    for name,data in files.items():
                        member=tarfile.TarInfo(name);member.size=len(data);stream.addfile(member,io.BytesIO(data))
                Path(str(archive)+'.sha256').write_text(runner.sha(archive)+'  '+archive.name+'\n')
                with self.assertRaisesRegex(ValueError,'checksum'):runner.restore_database(artifact,p/f'restored-{index}')

    def test_job_minutes_need_completed_metadata(self):
        pair=observation(frozen())
        job={'id':1,'run_id':100,'status':'in_progress','started_at':'2026-10-04T00:00:00Z','completed_at':'2026-10-04T00:04:00Z'}
        with self.assertRaisesRegex(ValueError,'completed'):runner.job_consumption(pair,{'jobs':[job]},1)

    def test_retry_analysis_requires_exact_retained_original_and_diagnostic(self):
        import shutil
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp:
            p=Path(tmp);f,value=campaign_export(p/'retry');M.write(p/'frozen.json',f)
            original=p/'original';original.mkdir();prior=observation(f,run='90',favorable_pair=False)
            for name,data in [('pair.json',prior),('campaign-control.json',f),('plan.json',f['plan'])]:M.write(original/name,data)
            (original/'outage.log').write_text('SYNTHETIC external outage, test only\n');runner.hash_export(original)
            shutil.copytree(original,p/'retry/prior-attempt')
            value.update(attempt=2,retryOf='90',externalFailureReview=M.retry_ticket(prior,'network-outage',
                (original/'outage.log').read_text(),'SYNTHETIC operator'))
            value['externalFailureReview']['evidencePath']='outage.log'
            for arm in 'RG':
                value['arms'][arm]['attempt']=2
                archive=p/'retry/packages'/(arm+'.tar.gz')
                synthetic_archive(archive,{'synthetic.json':b'{"synthetic":true}',
                                          'measurement.json':json.dumps(value['arms'][arm]).encode()})
                value['packageVerification'][arm]=runner.verify_package(archive)
            M.write(p/'retry/pair.json',value);runner.hash_export(p/'retry')
            args=SimpleNamespace(campaign_plan=p/'frozen.json',pairs=[],artifact=[str(original),str(p/'retry')],jobs=[],
                evidence_output=p/'analysis',output=p/'analysis/analysis.json')
            runner.analyze(args);a=M.read(p/'analysis/analysis.json')
            self.assertEqual(a['attempts'],2);self.assertEqual(a['excludedAttempts'],1)
            args.evidence_output=p/'bad';args.output=p/'bad/analysis.json'
            nested=p/'retry/prior-attempt';M.write(nested/'pair.json',dict(prior,extra='SYNTHETIC changed original'))
            runner.hash_export(nested);runner.hash_export(p/'retry')
            with self.assertRaisesRegex(ValueError,'nested original differs'):runner.analyze(args)
            M.write(nested/'pair.json',prior);(nested/'outage.log').write_text('SYNTHETIC changed diagnostic')
            runner.hash_export(nested);runner.hash_export(p/'retry')
            with self.assertRaisesRegex(ValueError,'diagnostic'):runner.analyze(args)

    def test_unfinalized_failure_retained_without_inventing_timing_or_position(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp:
            p=Path(tmp);f=frozen();M.write(p/'frozen.json',f)
            artifact=p/'unfinalized';M.write(artifact/'failure-1.json',{'synthetic':True,'diagnostic':'SYNTHETIC source guard failure'})
            runner.hash_export(artifact)
            args=SimpleNamespace(campaign_plan=p/'frozen.json',pairs=[],artifact=[str(artifact)],jobs=[],
                evidence_output=p/'analysis',output=p/'analysis/analysis.json')
            runner.analyze(args);result=M.read(p/'analysis/analysis.json')
            self.assertEqual(result['attempts'],0);self.assertEqual(result['campaign']['missingPositions'],[1,2,3,4])
            self.assertEqual(len(result['unfinalizedArtifacts']),1)
            self.assertIsNone(result['observedActionsJobMinutes'])
            self.assertEqual((artifact/'failure-1.json').read_bytes(),(p/'analysis/inputs/0/failure-1.json').read_bytes())

    def test_empty_campaign_cli_analysis_is_visibly_partial(self):
        with tempfile.TemporaryDirectory(prefix='synthetic-campaign-') as tmp:
            p=Path(tmp);M.write(p/'frozen.json',frozen())
            result=subprocess.run([sys.executable,str(ROOT/'scripts/paired-rg.py'),'analyze',
                '--campaign-plan',str(p/'frozen.json'),'--evidence-output',str(p/'analysis'),
                '--output',str(p/'analysis/analysis.json')],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(M.read(p/'analysis/analysis.json')['campaign']['missingPositions'],[1,2,3,4])

if __name__=='__main__':unittest.main()
