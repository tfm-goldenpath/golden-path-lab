#!/usr/bin/env python3
"""Fixed Java quality adapter. Private JSON protocol from quality-java.mjs."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time
import zipfile

ROOT = Path(__file__).resolve().parent

def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT/(name+'.py'))
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value)
    return value

J, C = module('java-tests'), module('java-quality-contract')
PIN = json.loads((ROOT/'java-quality-toolchain.json').read_text())

def digest(data):
    return hashlib.sha256(data).hexdigest()

def write(path, value):
    with path.open('x') as f: f.write(json.dumps(value, indent=2)+'\n')

def safe_read(path, maximum=64*1024**2):
    before = path.lstat()
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > maximum or (info.st_dev, info.st_ino) != (before.st_dev, before.st_ino):
            raise ValueError('Unsafe quality input: '+str(path))
        with os.fdopen(os.dup(fd), 'rb') as f: data = f.read(maximum+1)
        after = os.fstat(fd)
        if len(data) != info.st_size or (info.st_size, info.st_mtime_ns, info.st_ctime_ns) != (after.st_size, after.st_mtime_ns, after.st_ctime_ns):
            raise ValueError('Quality input changed while reading')
        return data
    finally: os.close(fd)

def tools(directory):
    """Fresh verified tools; no ambient Maven/agent cache is trusted."""
    directory.mkdir()
    archive = directory/'jacoco.zip'
    subprocess.run(['curl','--fail','--location','--connect-timeout','15','--max-time','120',
                    '--retry','2','--retry-max-time','180','--max-filesize','8388608',
                    '--output',str(archive),PIN['url']], check=True, timeout=200,
                   stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if digest(safe_read(archive,8388608)) != PIN['sha256']:
        raise ValueError('JaCoCo release checksum mismatch')
    with zipfile.ZipFile(archive) as z:
        for name, artifact in PIN['artifacts'].items():
            info = z.getinfo(artifact['member'])
            if info.file_size > 2097152: raise ValueError('JaCoCo artifact size limit')
            data = z.read(info)
            if digest(data) != artifact['sha256']: raise ValueError('JaCoCo artifact checksum mismatch')
            (directory/name).write_bytes(data)
        (directory/'LICENSE.html').write_bytes(z.read('doc/license.html'))
    archive.unlink()

def recheck(request):
    now = json.loads(subprocess.check_output([request['node'],str(ROOT/'consumer.mjs'),'capture',
                      request['engine'],request['consumer']], text=True, timeout=60))
    if now != request['receipt']: raise ValueError('Consumer or engine inputs changed')

def phase(work, out, argv, request, tool_dir):
    J.capacity(out.parent); recheck(request); out.mkdir()
    write(out/'command.json', {'argv':argv,'limits':request['config']['limits']})
    write(out/'java-test-work.json', {'path':str(work),'device':work.stat().st_dev,'inode':work.stat().st_ino})
    identity=work.lstat()
    status, start, end, retired, errors = J.execute(work,out,argv,request['config']['limits'],
                                                  ((tool_dir,'/quality-tools'),), '/work')
    collected = False
    if retired:
        try: write(out/'exit.json', {'exitCode':status,'startedNs':start,'finishedNs':end})
        except BaseException as e: errors.append(('exit receipt',e))
        try:
            now=work.lstat()
            if not stat.S_ISDIR(now.st_mode) or (now.st_dev,now.st_ino)!=(identity.st_dev,identity.st_ino): raise ValueError('Work identity changed before collection')
            J.collect(work,out,quality_limit=request['config']['limits']['maxOutputBytes']); collected=True
        except BaseException as e: errors.append(('collection',e))
    if errors:
        diagnostics=[{'stage':s,'type':type(e).__name__,'message':str(e)} for s,e in errors]
        try: write(out/'errors.json', diagnostics)
        except BaseException: pass
        primary=errors[0][1]
        for s,e in errors[1:]: primary.add_note(s+': '+str(e))
        raise PhaseError(primary, retired, collected)
    return start,end

class PhaseError(Exception):
    def __init__(self, primary, retired, collected):
        super().__init__(str(primary));self.primary=primary;self.retired=retired;self.collected=collected

def inventory(directory):
    return {f['path']:(f['sha256'],f['mode']) for f in json.loads((directory/'java-quality-files.json').read_text())}

def run(request):
    out=Path(request['output']); work=None; tool_dir=None; removable=True
    result={'status':'ERROR','exitCode':2,'diagnostics':[],'metrics':None}
    try:
        config=C.validate_config(request['config']);request['config']=config
        expected=C.expected_files(config,request['receipt']['source']['files'])
        write(out/'scope.json',expected);write(out/'toolchain.json',{'java':J.PIN,'jacoco':PIN})
        J.capacity(out)
        tool_dir=Path(tempfile.mkdtemp(prefix='gp-java-quality-tools-'))/'tools';tools(tool_dir)
        work=Path(tempfile.mkdtemp(prefix='gp-java-quality-'));work_identity=work.stat()
        write(out/'work.json',{'path':str(work),'device':work_identity.st_dev,'inode':work_identity.st_ino})
        selected=[f for f in request['receipt']['source']['files'] if f['path'].startswith('service/')]
        size=0
        for f in selected:
            data=safe_read(Path(request['consumer'])/f['path'],16777216);size+=len(data)
            if size>16777216 or len(selected)>1000: raise ValueError('Committed input size/count limit exceeded')
            if digest(data)!=f['sha256']: raise ValueError('Input changed during materialization')
            target=work/f['path'];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
            target.chmod(int(f['mode'],8))
        original=safe_read(work/'service/pom.xml')
        if original != (ROOT.parent/'templates/java-http/service/pom.xml').read_bytes(): raise ValueError('Unsupported original Java POM')
        effective=C.derive_pom(original,request['runId'])
        (out/'original-pom.xml').write_bytes(original);(out/'effective-pom.xml').write_bytes(effective)
        write(out/'transformation.json',{'schema':'java-quality-pom/v1','originalSha256':digest(original),
              'effectiveSha256':digest(effective),'implementationSha256':digest((ROOT/'java-quality-contract.py').read_bytes()),
              'agent':PIN['artifacts']['jacocoagent.jar'],'runId':request['runId']})
        (work/'service/pom.xml').write_bytes(effective)
        mvn=['mvn','-f','/work/service/pom.xml','-B','-ntp','--strict-checksums','-Dmaven.repo.local=/work/repository']
        phase(work,out/'compile',mvn+['test-compile'],request,tool_dir)
        before=inventory(out/'compile')
        if any(n.startswith('service/target/surefire-reports/') or n=='service/target/jacoco.exec' for n in before):
            raise ValueError('Unexpected pre-test execution evidence')
        start,end=phase(work,out/'tests',mvn+['surefire:test'],request,tool_dir)
        after=inventory(out/'tests')
        stable_after={n:v for n,v in after.items() if n!='service/target/jacoco.exec'}
        if stable_after!=before: raise ValueError('Sources, configuration or compiled classes changed during tests')
        artifacts=lambda d:{f['path']:f['sha256'] for f in json.loads((out/d/'java-build-artifacts.json').read_text())}
        before_artifacts,after_artifacts=artifacts('compile'),artifacts('tests')
        if any(after_artifacts.get(n)!=v for n,v in before_artifacts.items()): raise ValueError('Resolved artifacts changed during tests')
        files=out/'tests/java-quality-files'
        execution=safe_read(files/'service/target/jacoco.exec')
        if not execution: raise ValueError('Empty JaCoCo execution data')
        reports=[]
        for p in sorted((out/'tests/java-test-reports').glob('TEST-*.xml')):
            if not start<=p.stat().st_mtime_ns<=end: raise ValueError('Stale Surefire report')
            reports.append(safe_read(p,4*1024**2))
        tests=C.surefire(reports);result['tests']=tests
        # Retire and collect before reporting. The report producer runs no consumer code.
        report_input=work/'report-input';report_input.mkdir()
        for kind in ('classes','test-classes'):
            shutil.copytree(out/'compile/java-quality-files/service/target'/kind,report_input/kind)
        (report_input/'jacoco.exec').write_bytes(execution)
        (work/'report').mkdir()
        cli='java -Xmx256m -XX:ActiveProcessorCount=2 -jar /quality-tools/jacococli.jar '
        script='set -eu\n'+cli+'classinfo report-input/classes > report/classes.txt\n'+cli+'classinfo report-input/test-classes > report/test-classes.txt\n'+cli+'execinfo report-input/jacoco.exec > report/execution.txt\n'+cli+'report report-input/jacoco.exec --classfiles report-input/classes --xml report/jacoco.xml\n'
        phase(work,out/'report',['sh','-c',script],request,tool_dir)
        report=out/'report/java-quality-files/report'
        production=C.class_info(safe_read(report/'classes.txt').decode());compiled_tests=C.class_info(safe_read(report/'test-classes.txt').decode())
        execution_info=C.execution_info(safe_read(report/'execution.txt').decode(),request['runId'],
                                        {**production,**compiled_tests},tests['classes'])
        sources={n.removeprefix('service/'):len(safe_read(files/n).splitlines()) for n in before if n.startswith('service/src/main/java/') and n.endswith('.java')}
        evaluated=C.evaluate_report(safe_read(report/'jacoco.xml'),expected,sources,config['thresholds'],
                                     production,execution_info,request['runId'],start,end)
        result.update(evaluated);result['diagnostics'].extend(result.pop('failures'))
        if tests['failures']: result['diagnostics'].append('Attributed Java assertion failure')
        recheck(request)
        result['status']='FAIL' if tests['failures'] or result['diagnostics'] else 'PASS'
        result['exitCode']=0 if result['status']=='PASS' else 1
    except BaseException as e:
        if isinstance(e,PhaseError): removable=e.retired and e.collected;e=e.primary
        result['diagnostics'].append(type(e).__name__+': '+str(e))
        result['diagnostics'].extend(getattr(e,'__notes__',[]))
        if isinstance(e,subprocess.CalledProcessError) and e.stderr:
            result['diagnostics'].append(e.stderr.decode(errors='replace')[:8192])
    finally:
        if work:
            if removable:
                try:
                    now=work.lstat()
                    if not stat.S_ISDIR(now.st_mode) or (now.st_dev,now.st_ino)!=(work_identity.st_dev,work_identity.st_ino): raise ValueError('Recovery work identity changed')
                    shutil.rmtree(work)
                except BaseException as e:
                    result.update(status='ERROR',exitCode=2);result['diagnostics'].append('Working directory cleanup: '+str(e));result['recoveryWork']=str(work)
            else: result['recoveryWork']=str(work)
        if tool_dir and removable:
            try: shutil.rmtree(tool_dir.parent)
            except BaseException as e:
                result.update(status='ERROR',exitCode=2);result['diagnostics'].append('Tool cleanup: '+str(e))
        elif tool_dir: result['recoveryTools']=str(tool_dir.parent)
    return result

if __name__=='__main__':
    def interrupted(signum, frame): raise InterruptedError('Java quality interrupted by signal '+str(signum))
    signal.signal(signal.SIGTERM,interrupted);signal.signal(signal.SIGINT,interrupted)
    print(json.dumps(run(json.load(sys.stdin))))
