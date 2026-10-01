"""Synthetic observations only: never pilot or real admission evidence."""
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
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts'))
from paired_measurements import *
spec=importlib.util.spec_from_file_location('runner',ROOT/'scripts/paired-rg.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)

def pair():
 return {'schema':'paired-rg-pair/v1','protocol':PROTOCOL,'planIdentity':'plan','dataset':'pilot','pair':1,'order':'RG','attempt':1,'source':'a'*40,'warmupSource':'b'*40,'runId':'1','status':'PASS','arms':{}}
def favorable(seconds,arm='R',parent=None):
 r=new_record(parent or pair(),arm)
 phases=['service-tests','build','manifest','admission','rollout','http']
 if arm=='G':phases+=['workflow-policy','manifest-policy','analysis','native-provenance','verify-delivery','authorize-results']
 r.update(admission={'outcome':'ACCEPTED'},functional='PASS',cacheValidated=True,primarySeconds=seconds,primaryStart=at(0),primaryEnd=at(seconds),phases={name:{'exitCode':0,'end':at(seconds)} for name in phases})
 return r
def at(n,boot='one'):
 return {'utc':'2026-10-01T00:00:00Z','monotonicNs':n*1_000_000_000,'bootId':boot}

class Timing(unittest.TestCase):
 def test_monotonic_not_wall_clock(self):
  a=at(1);b=at(4);b['utc']='1999-01-01T00:00:00Z';self.assertEqual(elapsed(a,b),3)
 def test_clock_break(self):
  for end in [at(0),at(2,'other')]:
   with self.assertRaises(ValueError):elapsed(at(1),end)
 def test_phase_records_partial_failure(self):
  r={};event(r,'tests','start',now=at(1));self.assertNotIn('end',r['phases']['tests'])
  event(r,'tests','end',7,at(3));self.assertEqual(r['phases']['tests']['exitCode'],7)
 def test_duplicate_or_overlapping_phase(self):
  r={};event(r,'build','start',now=at(1))
  with self.assertRaises(ValueError):event(r,'native','start',now=at(2))
 def test_missing_admission_is_null(self):
  r=new_record(pair(),'R');self.assertIsNone(r['primarySeconds']);self.assertEqual(classify(r),'indeterminate')
 def test_unfavorable_not_faster_success(self):
  r=favorable(1);r['admission']['outcome']='REJECTED';self.assertEqual(classify(r),'valid-unfavorable')
 def test_failed_function_is_not_success(self):
  r=favorable(1);r['functional']='NOT_EXECUTED';self.assertEqual(classify(r),'indeterminate')
 def test_cache_violation_invalid(self):
  r=favorable(1);r['invalidReason']={'cause':'cache-condition'};self.assertEqual(classify(r),'invalid')
 def test_service_or_control_failure_not_suppressed(self):
  r=favorable(1);r['phases']['test']={'exitCode':2};self.assertEqual(classify(r),'indeterminate')

class Calculations(unittest.TestCase):
 def test_pairs_absolute_relative_median_dispersion(self):
  ps=[]
  for i,(r,g) in enumerate([(10,15),(20,22),(10,9)]):
   p=pair();p['pair']=i+1;p['arms']={'R':favorable(r,'R',p),'G':favorable(g,'G',p)};ps.append(p)
  a=summarize(ps);self.assertEqual(a['completeFavorablePairs'],3);self.assertEqual(a['medianDifferenceSeconds'],2)
  self.assertEqual(a['medianRelativePercent'],10);self.assertEqual(a['medianAbsoluteDeviationSeconds'],3)
 def test_incomplete_retained(self):
  p=pair();p['arms']={'R':favorable(2)};a=summarize([p]);self.assertEqual(a['attempts'],1);self.assertEqual(a['completeFavorablePairs'],0);self.assertIsNone(a['rows'][0]['absoluteSeconds'])
 def test_cleanup_failure_excluded(self):
  p=pair();p['arms']={'R':favorable(2),'G':favorable(3,'G')};p['status']='INCOMPLETE_OR_UNFAVORABLE';self.assertEqual(summarize([p])['completeFavorablePairs'],0)
 def test_unfavorable_preserved(self):
  p=pair();p['arms']={'R':favorable(2),'G':favorable(1,'G')};p['arms']['G']['admission']['outcome']='REJECTED';self.assertEqual(summarize([p])['excludedAttempts'],1)
 def test_no_dataset_pooling(self):
  p=pair();q=pair();q['dataset']='development'
  with self.assertRaises(ValueError):summarize([p,q])
 def test_no_source_pooling_or_duplicates(self):
  p=pair();q=pair();q['source']='c'*40
  with self.assertRaises(ValueError):summarize([p,q])
  with self.assertRaises(ValueError):summarize([p,p])
 def test_no_invented_consumption(self):
  a=summarize([pair()]);self.assertIsNone(a['observedActionsJobMinutes']);self.assertIsNone(a['billedMinutes']);self.assertIsNone(a['monetaryExpenditure'])

class Retry(unittest.TestCase):
 def prior(self):
  p=pair();p['status']='INCOMPLETE_OR_UNFAVORABLE';p['arms']={'R':{'classification':'indeterminate'}};return p
 def test_external_once_same_order(self):
  p=self.prior();p['order']='GR';t=retry_ticket(p,'registry-outage','retained HTTP 503','operator');self.assertEqual(t['order'],'GR');self.assertEqual(t['attempt'],2)
 def test_second_retry_rejected(self):
  p=self.prior();p['attempt']=2
  with self.assertRaises(ValueError):retry_ticket(p,'registry-outage','HTTP 503','operator')
 def test_no_retry_control_failure_or_duration(self):
  for cause in ['control-denied','slow']:
   with self.assertRaises(ValueError):retry_ticket(self.prior(),cause,'log','operator')
  p=self.prior();p['arms']['G']={'classification':'valid-unfavorable'};p['arms']['R']={'classification':'valid-favorable'}
  with self.assertRaises(ValueError):retry_ticket(p,'registry-outage','log','operator')
 def test_evidence_and_human_review_required(self):
  for evidence,who in [('', 'operator'),('log','')]:
   with self.assertRaises(ValueError):retry_ticket(self.prior(),'network-outage',evidence,who)

class SourceCache(unittest.TestCase):
 def env(self):return {'GITHUB_ACTIONS':'true','GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_WORKFLOW_REF':WORKFLOW,'GITHUB_REF':'refs/heads/main','GITHUB_SHA':'a'*40,'GITHUB_RUN_ATTEMPT':'1'}
 def test_exact_workflow_source(self):validate_source(self.env(),'a'*40,'','old','new')
 def test_identity_source_replay_refusal(self):
  for field,value in [('GITHUB_WORKFLOW_REF',WORKFLOW.replace('paired-rg','golden-path')),('GITHUB_SHA','b'*40),('GITHUB_RUN_ATTEMPT','2')]:
   e=self.env();e[field]=value
   with self.assertRaises(ValueError):validate_source(e,'a'*40,'','old','new')
 def test_real_application_change_and_clean_tree(self):
  for dirty,old,new in [(' M src/a','','x'),('','same','same')]:
   with self.assertRaises(ValueError):validate_source(self.env(),'a'*40,dirty,old,new)
 def test_rebuilt_layer_and_reuse(self):
  text='#4 [2/5] RUN rm -rf /usr/local/lib/node_modules\n#4 CACHED\n#9 [5/5] COPY --chown=10001:10001 src/ ./src/\n#9 DONE 0.1s\n'
  self.assertTrue(cache_evidence(text)['changedApplicationLayerRebuilt'])
  for bad in [text.replace('DONE 0.1s','CACHED'),text.replace('#4 CACHED','#4 DONE 0.1s'),'']:
   with self.assertRaises(ValueError):cache_evidence(bad)
 def test_balanced_reproducible_plan(self):
  p=read(ROOT/'measurements/pilot-plan-v1.json');slots=['RG','RG','GR','GR'];s=sorted(enumerate(slots),key=lambda x:hashlib.sha256(f"{p['seed']}:{x[0]}".encode()).hexdigest())
  self.assertEqual([x['order'] for x in p['pairs']],[x[1] for x in s])
  self.assertEqual(p['execution'],'NOT_EXECUTED')

class Orchestration(unittest.TestCase):
 def test_native_steps_are_explicit_and_conditional(self):
  # Parse using the same pinned YAML parser as the workflow regression suite.
  result=subprocess.run(['conftest','parse',str(ROOT.parent/'.github/workflows/paired-rg.yml')],text=True,capture_output=True,check=True)
  doc=json.loads(result.stdout);doc=next(iter(doc.values()))[0] if 'jobs' not in doc else doc
  steps=doc['jobs']['pair']['steps'];native=[s for s in steps if s.get('uses','').startswith('actions/attest@')]
  self.assertEqual(len(native),2)
  for step in native:self.assertIn("== 'G'",step['if']);self.assertTrue(step['with']['push-to-registry'])
 def test_phase_endpoint_order_and_no_demo(self):
  text=(ROOT/'scripts/paired-delivery.sh').read_text()
  self.assertLess(text.index('paired-rg.py begin'),text.index('step service-tests'))
  self.assertLess(text.index('paired-rg.py admission'),text.index('step rollout'))
  self.assertLess(text.index('step rollout'),text.index('step http'))
  self.assertNotIn('scenario_l01',text);self.assertNotIn('workload_reference',text)
 def test_separate_cache_restore_and_no_candidate_warmup(self):
  text=(ROOT/'scripts/paired-delivery.sh').read_text()
  self.assertIn('cache="$private/cache-$arm"',text);self.assertIn('docker buildx rm "$builder"',text)
  self.assertLess(text.index('lab_install_admission prepared'),text.index('delivery_build'))
 def test_failed_native_phase_is_not_ignored(self):
  text=(ROOT/'scripts/paired-delivery.sh').read_text();self.assertIn('[[ "$NATIVE_EXIT_CODE" == 0 ]] || exit "$NATIVE_EXIT_CODE"',text)
 def test_real_mark_command_partial_failure(self):
  with tempfile.TemporaryDirectory() as temp:
   p=Path(temp)/'measurement.json';write(p,new_record(pair(),'G'))
   for args in [('begin',str(p)),('mark',str(p),'analysis','start'),('interrupted',str(p),'42')]:
    r=subprocess.run([sys.executable,str(ROOT/'scripts/paired-rg.py'),*args],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stderr)
   v=read(p);self.assertEqual(v['phases']['analysis']['exitCode'],42);self.assertIsNone(v['primarySeconds'])

class StrictRecords(unittest.TestCase):
 def test_missing_phase_never_favorable(self):
  for field in ['service-tests','build','admission','native-provenance']:
   r=favorable(5,'G');del r['phases'][field]
   self.assertEqual(classify(r),'indeterminate')
 def test_endpoint_and_post_failure(self):
  r=favorable(5);r['primaryEnd']=at(6);self.assertEqual(classify(r),'indeterminate')
  r=favorable(5);r['failureExitCode']=9;self.assertEqual(classify(r),'indeterminate')
 def test_mismatched_arm_source(self):
  p=pair();p['arms']={'R':favorable(1),'G':favorable(2,'G')};p['arms']['G']['source']='c'*40
  with self.assertRaisesRegex(ValueError,'source'):summarize([p])
 def test_cache_bytes_and_symlinks(self):
  with tempfile.TemporaryDirectory() as temp:
   p=Path(temp);(p/'index.json').write_text('{}');(p/'blob').write_text('original')
   before=cache_manifest(p);(p/'blob').write_text('changed');self.assertNotEqual(before,cache_manifest(p))
   (p/'link').symlink_to(p/'blob')
   with self.assertRaises(ValueError):cache_manifest(p)
 def test_plan_regeneration(self):
  p=read(ROOT/'measurements/pilot-plan-v1.json');self.assertEqual(p,pilot_plan(p['seed']))
 def test_actual_admission_endpoint_retained_on_bad_response(self):
  from types import SimpleNamespace
  with tempfile.TemporaryDirectory() as temp:
   p=Path(temp);r=new_record(pair(),'R');r['primaryStart']=at(0);event(r,'admission','start',now=at(1));write(p/'measurement.json',r)
   write(p/'state.json',{'imageRepository':'ghcr.io/example/service','digest':'sha256:'+'a'*64})
   write(p/'response.json',{'kind':'Pod'});(p/'diagnostic.log').write_text('')
   args=SimpleNamespace(command='admission',path=p/'measurement.json',code=0,response=p/'response.json',diagnostic=p/'diagnostic.log')
   with patch.object(runner,'stamp',return_value=at(2)):
    with self.assertRaises(ValueError):runner.marking(args)
   saved=read(p/'measurement.json');self.assertEqual(saved['primarySeconds'],2);self.assertEqual(saved['admission']['outcome'],'ERROR')
 def test_actual_order_and_failed_prepare_cleanup(self):
  from types import SimpleNamespace
  for order in ['RG','GR']:
   with self.subTest(order=order),tempfile.TemporaryDirectory() as temp:
    p=Path(temp);v=pair();v['order']=order;v['sharedPreparation']={};write(p/'pair.json',v)
    paths={}
    for arm in 'RG':
     state=p/arm;state.mkdir();paths[arm]=str(state);write(state/'measurement.json',new_record(v,arm))
    write(p/'paths.json',paths);write(p/f'{order[0]}-prepare-result.json',{'exitCode':42})
    args=SimpleNamespace(phase='finish',slot=1,native='success')
    with patch.object(runner,'pair_path',return_value=p),patch.object(runner,'git',side_effect=lambda *a:v['source'] if a[0]=='rev-parse' else ''),patch.object(runner,'run_logged') as run,patch.object(runner,'timed_process',return_value=0) as cleanup:
     self.assertEqual(runner.shell_phase(args),42);run.assert_not_called()
     self.assertIn(order[0]+'-workload-cleanup',cleanup.call_args.args)
    ended=read(p/'slot-1-ended.json');self.assertEqual(ended['configuration'],order[0]);self.assertEqual(ended['exitCode'],42)
    (p/'slot-1-ended.json').unlink();args.slot=2
    with patch.object(runner,'pair_path',return_value=p):
     with self.assertRaisesRegex(ValueError,'starting conditions'):runner.shell_phase(args)

class RetentionAndAdmission(unittest.TestCase):
 def test_desired_fields_and_defaults(self):
  wanted={'metadata':{'namespace':'tfm-golden'},'spec':{'template':{'spec':{'containers':[{'image':'repo@sha256:a','securityContext':{'privileged':False}}]}}}}
  observed=copy.deepcopy(wanted);observed['metadata']['uid']='owned'
  self.assertTrue(required_fields_match(wanted,observed))
  observed['spec']['template']['spec']['containers'][0]['securityContext']['privileged']=True
  self.assertFalse(required_fields_match(wanted,observed))
 def test_strict_admission_reason_with_unrelated_errors(self):
  with tempfile.TemporaryDirectory() as temp:
   p=Path(temp)/'response.log'
   text='resource Deployment/tfm-golden/quotes-node was blocked due to the following policies\ntfm-runtime:\n  autogen-authorized-image-repository: validation failure: IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest\n'
   p.write_text(text);self.assertIsNotNone(runner.admission_denial(p))
   for bad in [text+'other-policy:\n  other-rule: unrelated denial\n',text.replace('quotes-node','another'),text+' connection timed out\n','failed calling webhook']:
    p.write_text(bad);self.assertIsNone(runner.admission_denial(p))
 def test_artifact_hashes_reject_missing_and_changed_files(self):
  with tempfile.TemporaryDirectory() as temp:
   p=Path(temp);write(p/'pair.json',pair());runner.hash_export(p);runner.verify_export(p)
   (p/'extra.log').write_text('unexpected')
   with self.assertRaises(ValueError):runner.verify_export(p)
   (p/'extra.log').unlink();(p/'pair.json').write_text('{}')
   with self.assertRaises(ValueError):runner.verify_export(p)
 def test_database_replay_and_mismatch(self):
  # Tiny labelled synthetic DB bytes exercise retention, never scanning.
  import io,tarfile
  with tempfile.TemporaryDirectory() as temp:
   p=Path(temp);(p/'databases').mkdir();db=b'synthetic-unit-database';metadata=b'{}'
   hashes={'trivy.db':hashlib.sha256(db).hexdigest(),'metadata.json':hashlib.sha256(metadata).hexdigest()}
   identity_bytes=json.dumps({'status':'PASS','expectedIdentity':{'sha256':hashes,'metadata':{}}}).encode()
   files={'db/trivy.db':db,'db/metadata.json':metadata,'identity.json':identity_bytes}
   files['SHA256SUMS.txt']=''.join(hashlib.sha256(v).hexdigest()+'  '+k+'\n' for k,v in files.items()).encode()
   target=p/'databases/db.tar.gz'
   with tarfile.open(target,'w:gz') as tar:
    for name,data in files.items():
     member=tarfile.TarInfo(name);member.size=len(data);tar.addfile(member,io.BytesIO(data))
   Path(str(target)+'.sha256').write_text(hashlib.sha256(target.read_bytes()).hexdigest()+'  db.tar.gz\n')
   self.assertEqual(runner.restore_database(p,p/'restored'),hashes)
   target.write_bytes(target.read_bytes()+b'changed')
   with self.assertRaisesRegex(ValueError,'checksum'):runner.restore_database(p,p/'bad')
 def test_different_databases_not_pooled(self):
  p=pair();q=pair();q['pair']=2;p['frozenDatabase']={'trivy.db':'a'};q['frozenDatabase']={'trivy.db':'b'}
  with self.assertRaisesRegex(ValueError,'databases'):summarize([p,q])

class FinalFailureRecords(unittest.TestCase):
 def test_actual_exit_trap_preserves_original_logging_failure(self):
  text=(ROOT/'scripts/paired-delivery.sh').read_text();function=text[text.index('on_exit() {'):text.index('\ntrap on_exit EXIT')]
  with tempfile.TemporaryDirectory() as temp:
   (Path(temp)/'measurement.json').write_text('{}')
   for initial,expected in [(42,42),(0,17)]:
    command=function+'\nstate_dir=$1; port_pid=; python3() { return 17; }; (exit "$2"); on_exit'
    result=subprocess.run(['bash','-c',command,'trap-test',temp,str(initial)],capture_output=True,text=True)
    self.assertEqual(result.returncode,expected,result.stderr)

 def test_orphan_and_excess_retries_rejected(self):
  for attempt in [2,3]:
   p=pair();p['attempt']=attempt
   with self.assertRaises(ValueError):summarize([p])
 def test_init_failure_preserved_before_arm_exists(self):
  directory=ROOT/'evidence/measurements';directory.mkdir(parents=True,exist_ok=True)
  with tempfile.TemporaryDirectory(dir=directory) as temp:
   dest=Path(temp)/'attempt';env=dict(os.environ,PAIR_DIR=str(dest),GITHUB_ACTIONS='false')
   result=subprocess.run([sys.executable,str(ROOT/'scripts/paired-rg.py'),'init','--dataset','development','--pair','1','--order','RG','--expected-source','a'*40],env=env,capture_output=True,text=True)
   self.assertEqual(result.returncode,1);failures=list(dest.glob('failure-*.json'));self.assertEqual(len(failures),1)
   record=read(failures[0]);self.assertEqual(record['classification'],'indeterminate');self.assertNotIn('environment',record)

if __name__=='__main__':unittest.main()
