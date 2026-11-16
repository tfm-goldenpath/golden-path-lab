"""Synthetic Java quality contracts; these fixtures do not establish integration."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('java_quality_contract', ROOT/'src/java-quality-contract.py')
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)

CONFIG = {'schema':'java-quality-gate/v1','include':['src/main/java/'],'exclude':[],
          'thresholds':{'lines':80,'methods':80,'branches':70},
          'limits':{'timeoutSeconds':300,'maxOutputBytes':16777216}}

class Configuration(unittest.TestCase):
    def test_strict_activation_and_scope(self):
        self.assertEqual(C.validate_config(CONFIG), CONFIG)
        for patch in ({'schema':'node-quality-gate/v1'}, {'command':'true'},
                      {'include':['../escape']}, {'exclude':['src/test/']},
                      {'limits':{'timeoutSeconds':301,'maxOutputBytes':16777216}}):
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                C.validate_config({**CONFIG, **patch})
        files=[{'path':'service/src/main/java/trial/Server.java'}]
        self.assertEqual(C.expected_files(CONFIG,files),['src/main/java/trial/Server.java'])
        with self.assertRaises(ValueError): C.expected_files(CONFIG,[])


# Deterministic synthetic XML, never presented as real JaCoCo evidence.
import copy
import json
import os
import tempfile
from unittest.mock import patch
import xml.etree.ElementTree as ET
R = C.__dict__  # module remains import-only
RUN='11111111-1111-1111-1111-111111111111'

def report(covered=True):
    r=ET.Element('report',name='synthetic')
    ET.SubElement(r,'sessioninfo',id=RUN,start='1000',dump='1001')
    p=ET.SubElement(r,'package',name='trial'); c=ET.SubElement(p,'class',name='trial/A',sourcefilename='A.java')
    m=ET.SubElement(c,'method',name='m',desc='()V',line='1')
    source=ET.SubElement(p,'sourcefile',name='A.java')
    ET.SubElement(source,'line',nr='1',mi='0' if covered else '1',ci='1' if covered else '0',mb='0' if covered else '2',cb='2' if covered else '0')
    for node in (r,p,c,m,source):
        for k in C.COUNTERS:
            if k=='CLASS' and node is m: continue
            total=2 if k=='BRANCH' else 1
            ET.SubElement(node,'counter',type=k,missed='0' if covered else str(total),covered=str(total) if covered else '0')
    return ET.tostring(r)

class Reports(unittest.TestCase):
    def evaluate(self,data=None,**kwargs):
        args=dict(expected=['src/main/java/trial/A.java'],source_lines={'src/main/java/trial/A.java':1},
                  thresholds={'lines':100,'methods':100,'branches':100},
                  production={'trial/A':{'id':'a'*16,'INSTRUCTION':1,'BRANCH':2,'LINE':1,'METHOD':1,'COMPLEXITY':1}},
                  execution={'trial/A':{}},run_id=RUN,started_ns=1000000000,finished_ns=1002000000)
        args.update(kwargs);return C.evaluate_report(report() if data is None else data,**args)
    def test_real_doctype_recognized_without_resolving_it(self):
        self.assertEqual(self.evaluate(C.DOCTYPE.encode()+report())['failures'],[])
        for data in [b'<report>',b'<!DOCTYPE report SYSTEM "file:///sentinel">'+report(),b'<!DOCTYPE report [<!ENTITY x SYSTEM "file:///sentinel">]>'+report(),report().replace(b'<report',b'<wrong',1)]:
            with self.subTest(data=data[:50]),self.assertRaises(Exception): self.evaluate(data)
    def test_unexecuted_class_included_as_zero_not_unknown(self):
        r=self.evaluate(report(False),execution={})
        self.assertEqual(r['metrics']['methods']['percent'],0);self.assertEqual(len(r['failures']),3)
        with self.assertRaisesRegex(ValueError,'Unexecuted'): self.evaluate(execution={})
    def test_missing_stale_foreign_inconsistent_report(self):
        for data in [report().replace(RUN.encode(),b'foreign'),report().replace(b'start="1000"',b'start="1"'),
                     report().replace(b'covered="2"',b'covered="3"',1),report().replace(b'nr="1"',b'nr="2"'),
                     report().replace(b'sourcefilename="A.java"',b'sourcefilename="B.java"')]:
            with self.subTest(data=data[:100]),self.assertRaises(ValueError): self.evaluate(data)
        with self.assertRaises(ValueError): self.evaluate(production={})
        with self.assertRaises(ValueError): self.evaluate(expected=['src/main/java/trial/Never.java'])
    def test_exact_threshold_and_not_applicable(self):
        # Two files, one covered: aggregate 50%, comparison before presentation rounding.
        root=ET.fromstring(report());p=root.find('package');c=copy.deepcopy(p.find('class'));c.set('name','trial/B');c.set('sourcefilename','B.java')
        s=copy.deepcopy(p.find('sourcefile'));s.set('name','B.java')
        for n in (c,s):
            for counter in n.iter('counter'): counter.set('missed',counter.get('covered'));counter.set('covered','0')
        s.find('line').attrib.update(mi='1',ci='0',mb='2',cb='0');p.append(c);p.append(s)
        for n in (root,p):
            for counter in n.findall('counter'): counter.set('missed',counter.get('covered'))
        production={n:{'id':'a'*16,'INSTRUCTION':1,'BRANCH':2,'LINE':1,'METHOD':1,'COMPLEXITY':1} for n in ['trial/A','trial/B']}
        opts=dict(expected=['src/main/java/trial/A.java','src/main/java/trial/B.java'],source_lines={'src/main/java/trial/A.java':1,'src/main/java/trial/B.java':1},production=production)
        self.assertEqual(self.evaluate(ET.tostring(root),thresholds=dict(lines=50,methods=50,branches=50),**opts)['failures'],[])
        self.assertIn('lines threshold unmet',self.evaluate(ET.tostring(root),thresholds=dict(lines=50.00000000000001,methods=50,branches=50),**opts)['failures'])
        zero=ET.fromstring(report())
        for n in zero.iter('counter'):
            if n.get('type')=='BRANCH': n.set('covered','0')
        zero.find('package/sourcefile/line').set('cb','0')
        production={'trial/A':{**production['trial/A'],'BRANCH':0}}
        with self.assertRaisesRegex(ValueError,'NOT_APPLICABLE'): self.evaluate(ET.tostring(zero),production=production)
    def test_class_ids_agent_and_sessions(self):
        classes=C.class_info('  INST   BRAN   LINE   METH   CXTY   ELEMENT\n 1 2 1 1 1 class 0xaaaaaaaaaaaaaaaa trial/A\n')
        data='Session "'+RUN+'": start - end\naaaaaaaaaaaaaaaa 1 of 2 trial/A\n'
        self.assertIn('trial/A',C.execution_info(data,RUN,classes,['trial/A']))
        for changed in ['',data.replace(RUN,'old'),data.replace('aaaaaaaaaaaaaaaa','bbbbbbbbbbbbbbbb'),data.replace('1 of','0 of')]:
            with self.assertRaises(ValueError): C.execution_info(changed,RUN,classes,['trial/A'])
    def test_surefire_assertion_vs_infrastructure(self):
        base=b'<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="x" classname="trial.ATest"/></testsuite>'
        self.assertEqual(C.surefire([base])['passed'],1)
        failure=base.replace(b'failures="0"',b'failures="1"').replace(b'/>',b'><failure type="org.opentest4j.AssertionFailedError"/></testcase>')
        self.assertEqual(C.surefire([failure])['failures'],1)
        for data in [[],[b'<testsuite/>'],[base.replace(b'tests="1"',b'tests="0"')],[failure.replace(b'org.opentest4j.AssertionFailedError',b'java.io.IOException')],[base.replace(b'skipped="0"',b'skipped="1"').replace(b'/>',b'><skipped/></testcase>')]]:
            with self.assertRaises(ValueError): C.surefire(data)
    def test_structured_pom_keeps_limits_original_and_single_fork(self):
        original=(ROOT/'templates/java-http/service/pom.xml').read_bytes();effective=C.derive_pom(original,RUN)
        self.assertEqual(original,(ROOT/'templates/java-http/service/pom.xml').read_bytes())
        self.assertIn(b'-Xmx128m -XX:ActiveProcessorCount=2 -javaagent:',effective)
        self.assertIn(b'<forkCount>1</forkCount>',effective);self.assertIn(RUN.encode(),effective)
        self.assertEqual(effective,C.derive_pom(original,RUN))

spec = importlib.util.spec_from_file_location('java_quality_runner', ROOT/'src/java-quality-runner.py')
Q = importlib.util.module_from_spec(spec);spec.loader.exec_module(Q)

class Lifecycle(unittest.TestCase):
    def test_exit_collection_cleanup_errors_never_pass(self):
        with tempfile.TemporaryDirectory() as d:
            parent=Path(d);work=parent/'work';work.mkdir()
            request={'config':CONFIG}
            for index,(retired,errors) in enumerate([(True,[('execution',TimeoutError('primary timeout'))]),(False,[('cleanup',ValueError('retirement failed'))])]):
                with patch.object(Q.J,'capacity'),patch.object(Q,'recheck'),patch.object(Q.J,'execute',return_value=(1,1,2,retired,errors)),patch.object(Q.J,'collect',side_effect=OSError('ENOSPC')) as collect:
                    with self.assertRaises(Q.PhaseError) as caught: Q.phase(work,parent/str(index),['mvn'],request,parent)
                    self.assertIn('primary timeout' if retired else 'retirement failed',str(caught.exception))
                    self.assertEqual(collect.call_count,1 if retired else 0)
    def test_quality_collector_rejects_links_fifos_and_limits(self):
        for kind in ('link','fifo','bytes','count'):
            with self.subTest(kind=kind),tempfile.TemporaryDirectory() as d:
                root=Path(d);work=root/'work';out=root/'out';work.mkdir();out.mkdir();(work/'service').mkdir()
                target=work/'service/pom.xml';sentinel=root/'sentinel';sentinel.write_text('harmless external sentinel')
                if kind=='link':target.symlink_to(sentinel)
                elif kind=='fifo':os.mkfifo(target)
                else:target.write_text('safe original bytes')
                with patch.object(Q.J,'MAX_ENTRIES',0 if kind=='count' else 10000):
                    with self.assertRaises(ValueError):Q.J.collect(work,out,quality_limit=1 if kind=='bytes' else 4096)
                self.assertFalse(any(b'harmless external sentinel' in p.read_bytes() for p in out.rglob('*') if p.is_file()))
    def test_quality_collector_preserves_original_bytes_and_hashes(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);work=root/'work';out=root/'out';(work/'service/target/classes').mkdir(parents=True);out.mkdir()
            data=b'\xca\xfe\xba\xbe\xff';(work/'service/target/classes/A.class').write_bytes(data)
            rows=Q.J.collect(work,out,quality_limit=4096)
            self.assertEqual(rows[0]['sha256'],Q.digest(data));self.assertEqual((out/'java-quality-files/service/target/classes/A.class').read_bytes(),data)

class Faults(unittest.TestCase):
    def test_all_maven_failures_and_oom_stay_errors_and_retire(self):
        for status,oom in [(1,False),(0,True)]:
            with self.subTest(status=status,oom=oom),tempfile.TemporaryDirectory() as d:
                work=Path(d)/'work';out=Path(d)/'out';work.mkdir();out.mkdir()
                def docker(*args):
                    if args[0]=='create':
                        self.assertIn('2',args);self.assertIn('1g',args);self.assertIn('--read-only',args)
                        return 'a'*64
                    if args[:2]==('inspect','--format'):return json.dumps(dict(ExitCode=status,OOMKilled=oom,Running=False,Error=''))
                    return '[{"Image":"sha256:synthetic"}]'
                with patch.object(Q.J,'docker',side_effect=docker),patch.object(Q.J,'bounded_client',return_value=status),patch.object(Q.J,'cleanup') as cleanup:
                    code,_,_,retired,errors=Q.J.execute(work,out,['mvn'],CONFIG['limits'])
                    self.assertNotEqual(code,0);self.assertTrue(retired);self.assertEqual(errors[0][0],'execution');cleanup.assert_called_once()
    def test_timeout_interruption_and_receipt_failure_retire_independently(self):
        for failure in [TimeoutError('original timeout'),InterruptedError('original SIGTERM'),OSError('original ENOSPC')]:
            with self.subTest(failure=failure),tempfile.TemporaryDirectory() as d:
                work=Path(d)/'work';out=Path(d)/'out';work.mkdir();out.mkdir()
                def docker(*args):return 'a'*64 if args[0]=='create' else '[{"Image":"sha256:synthetic"}]'
                with patch.object(Q.J,'docker',side_effect=docker),patch.object(Q.J,'bounded_client',side_effect=failure),patch.object(Q.J,'cleanup',side_effect=ValueError('cleanup failed')) as cleanup:
                    _,_,_,retired,errors=Q.J.execute(work,out,['mvn'],CONFIG['limits'])
                    self.assertFalse(retired);self.assertIs(errors[0][1],failure);self.assertEqual(errors[1][0],'cleanup');cleanup.assert_called_once()
    def test_stale_and_nonmatching_execution_data(self):
        compiled={'trial/A':{'id':'a'*16}}
        for data in ['Session "'+RUN+'": start - end\n', 'Session "'+RUN+'": start - end\nbbbbbbbbbbbbbbbb 1 of 2 trial/A\n',
                     'Session "'+RUN+'": start - end\naaaaaaaaaaaaaaaa 3 of 2 trial/A\n']:
            with self.assertRaises(ValueError): C.execution_info(data,RUN,compiled,['trial/A'])
    def test_config_unknown_nan_bool_and_unmatched_exclusions(self):
        for c in [{**CONFIG,'thresholds':dict(lines=float('nan'),methods=80,branches=70)},
                  {**CONFIG,'thresholds':dict(lines=True,methods=80,branches=70)},
                  {**CONFIG,'limits':dict(timeoutSeconds=300,maxOutputBytes=4095)},
                  {**CONFIG,'include':['src/main/java/../../sentinel']},
                  {**CONFIG,'include':['src/main/java/*.java']}]:
            with self.assertRaises(ValueError):C.validate_config(c)
        with self.assertRaises(ValueError):C.expected_files({**CONFIG,'exclude':['src/main/java/Absent.java']},[{'path':'service/src/main/java/A.java'}])
    def test_missing_inconsistent_or_malformed_surefire(self):
        for data in [b'<testsuite',b'<!DOCTYPE testsuite SYSTEM "file:///sentinel"><testsuite/>',
                     b'<testsuite tests="1" failures="0" errors="1" skipped="0"><testcase name="x" classname="A"><error/></testcase></testsuite>',
                     b'<testsuite tests="2" failures="0" errors="0" skipped="0"><testcase name="x" classname="A"/></testsuite>']:
            with self.assertRaises(Exception): C.surefire([data])
    def test_phase_evidence_failure_preserves_primary_and_recovery(self):
        with tempfile.TemporaryDirectory() as d:
            work=Path(d)/'work';work.mkdir();primary=TimeoutError('original timeout')
            with patch.object(Q.J,'capacity'),patch.object(Q,'recheck'),patch.object(Q.J,'execute',return_value=(1,1,2,True,[('execution',primary)])),patch.object(Q.J,'collect',side_effect=OSError('artifact hash failure')):
                with self.assertRaises(Q.PhaseError) as caught:Q.phase(work,Path(d)/'out',['mvn'],{'config':CONFIG},Path(d))
                self.assertIs(caught.exception.primary,primary);self.assertFalse(caught.exception.collected)
                self.assertIn('artifact hash failure',' '.join(primary.__notes__));self.assertTrue(work.exists())

class InputBinding(unittest.TestCase):
    def test_recheck_rejects_changed_source_engine_or_configuration(self):
        request={'node':'node','engine':'/engine','consumer':'/consumer','receipt':{'source':'committed','engine':'pinned','config':'original'}}
        with patch.object(Q.subprocess,'check_output',return_value=json.dumps(request['receipt'])): Q.recheck(request)
        for key in request['receipt']:
            with self.subTest(key=key),patch.object(Q.subprocess,'check_output',return_value=json.dumps({**request['receipt'],key:'changed'})):
                with self.assertRaisesRegex(ValueError,'inputs changed'):Q.recheck(request)
    def test_no_follow_input_reads_reject_special_and_linked_files(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);sentinel=root/'sentinel';sentinel.write_bytes(b'harmless sentinel')
            (root/'link').symlink_to(sentinel);os.mkfifo(root/'fifo')
            for name in ('link','fifo'):
                with self.assertRaises((OSError,ValueError)):Q.safe_read(root/name)
            with self.assertRaises(ValueError):Q.safe_read(sentinel,2)

if __name__ == '__main__': unittest.main()
