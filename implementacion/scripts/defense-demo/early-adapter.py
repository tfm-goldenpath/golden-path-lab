#!/usr/bin/env python3
"""Inputs and evidence for bounded early comparisons; reuse existing scenario oracles."""
import difflib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
from core import ROOT, atomic, digest, evidence_root, read_json, session_path, utc, valid_name
from early import prepared

spec=importlib.util.spec_from_file_location('workflow_scenario',ROOT/'tests/scenarios/workflows.py')
W=importlib.util.module_from_spec(spec);spec.loader.exec_module(W)


def run(command, output, label):
    started=utc();clock=time.monotonic()
    with (output/(label+'.stdout.log')).open('x') as stdout, (output/(label+'.stderr.log')).open('x') as stderr:
        result=subprocess.run(list(map(str,command)),cwd=ROOT,stdout=stdout,stderr=stderr)
    atomic(output/(label+'-command.json'),{'command':list(map(str,command)),'exitCode':result.returncode,'startUTC':started,'endUTC':utc(),'durationSeconds':time.monotonic()-clock})
    for path in (output/(label+'.stdout.log'),output/(label+'.stderr.log')):
        with path.open() as stream:
            for line in stream: print(line,end='',flush=True)
    result.check_returncode()


def tool_identity(output,case):
    tools=W.E.prerequisite();atomic(output/'conftest-version.json',tools)
    if tools['error']: raise ValueError(tools['error'])
    if case=='f03':
        result=W.E.command(['trivy','--version']);atomic(output/'trivy-version.json',result)
        expected=read_json(ROOT/'tools.lock.json')['tools']['trivy']['version']
        if result['exitStatus']!=0 or 'Version: '+expected not in result['stdout']: raise ValueError('Trivy version mismatch')
    atomic(output/'tool-hashes.json',{name:digest(Path(shutil.which(name)).read_bytes()) for name in (('conftest','node','trivy') if case=='f03' else ('conftest','node'))})
    return tools


def policy_record(output,case):
    name={'f02':'workflow.rego','f12':'manifests.rego','f03':'trivy.rego'}[case]
    path=ROOT/'policies/conftest'/name
    (output/'policy.rego.txt').write_bytes(path.read_bytes())
    atomic(output/'policy-identity.json',{'path':str(path.relative_to(ROOT)),'sha256':digest(path.read_bytes())})


def seal(output,state,case):
    files={p.relative_to(output).as_posix():digest(p.read_bytes()) for p in sorted(output.rglob('*')) if p.is_file() and p.name not in ('output-original.log','output.log','resource-samples.json','resources.json','input-seal.json')}
    atomic(output/'input-seal.json',{'case':case,'source':state['source'],'files':files,'createdUTC':utc()})


def main(operation,name,instance):
    valid_name(name);valid_name(instance)
    case=operation.split('-')[1];phase=operation.rsplit('-',1)[1]
    state=read_json(session_path(name)/'session.json');output=evidence_root(name)/'operations'/instance
    if state['profile'] not in ('early-security','defense-all') or case not in ('f02','f12','f03') or phase not in ('prepare','negative','positive') or output.resolve()!=output: raise ValueError('Invalid early operation')
    tools=tool_identity(output,case);policy_record(output,case)
    if phase=='prepare':
        if case=='f02':
            original=W.original_text();negative=W.variants(original)['F02']
            (output/'positive.yaml').write_text(original);(output/'negative.yaml').write_text(negative)
        elif case=='f12':
            run(['node','scripts/lab-contracts.mjs','manifest','example.invalid/static-quotes@sha256:'+'a'*64,'tfm-golden',str(output/'positive.json'),'local'],output,'manifest-generation')
            original=(output/'positive.json').read_text();obj=json.loads(original)
            obj['spec']['template']['spec']['containers'][0]['image']='example.invalid/static-quotes:mutable'
            negative=json.dumps(obj,indent=2)+'\n';(output/'negative.json').write_text(negative)
            # Normalize presentation only; the semantic change is the image field.
            original=json.dumps(json.loads(original),indent=2)+'\n';(output/'positive.json').write_text(original)
        else:
            # Inherit stdout so the supervised operation exposes preparation progress.
            subprocess.run(['bash',str(ROOT/'scripts/defense-demo/early-adapters.sh'),operation,name,str(output)],cwd=ROOT,check=True)
            from coordinator import lab_path
            lab=lab_path(name)
            files=('sbom.cdx.json','sbom-schema-generation.json','database-identity.json','analysis.json','analysis-association.json','vulnerabilities.json','vulnerability-policy.json','vulnerability-policy-stderr.log','vulnerability-policy-exit.txt','target-attribution.json','build-inputs.json','build-metadata.json','scenario-input.json','trivy-version.txt','trivy-db.json')
            for side,fixture in [('negative','F03-vulnerable'),('positive','F03-repaired')]:
                folder=output/side;folder.mkdir()
                original=lab/fixture
                for file in files:
                    source=original/file
                    if source.resolve()!=source or not source.is_file(): raise ValueError('Missing or unsafe prepared original')
                    shutil.copyfile(source,folder/file)
                image=read_json(original/'analysis.json')['image'];db=read_json(original/'state.json')['vulnerabilityDatabase']
                atomic(folder/'image.json',{'image':image,'digest':image.split('@')[1],'origin':str(original.relative_to(ROOT)),'scope':'Real image prepared; no deployment'})
                atomic(folder/'state.json',{'vulnerabilityDatabase':db})
            a=read_json(output/'negative/analysis.json');b=read_json(output/'positive/analysis.json')
            if a['image']==b['image'] or a['database']!=b['database']: raise ValueError('Fixture image or database isolation failed')
            atomic(output/'comparison-inputs.json',{'negative':a['image'],'positive':b['image'],'changedDependency':{'package':'minimist','before':'1.2.5','after':'1.2.8'},'database':a['database'],'qualification':'Preparation checks only; fresh live reports required'})
            seal(output,state,case);return
        (output/'input-diff.txt').write_text(''.join(difflib.unified_diff(original.splitlines(True),negative.splitlines(True),fromfile='positive',tofile='negative')))
        atomic(output/'input-origin.json',{'kind':'inert static fixture','scope':'Static acceptance only; image existence, signatures and deployment not established','case':case})
        seal(output,state,case);return
    preparation=prepared(state,case)
    provenance={}
    def copy_prepared(source,destination):
        shutil.copyfile(source,destination)
        provenance[destination.relative_to(output).as_posix()]={'original':'operations/'+preparation.name+'/'+source.relative_to(preparation).as_posix(),'originalSha256':digest(source.read_bytes()),'sanitized':False}
        atomic(output/'copy-provenance.json',provenance)
    for file in ('input-diff.txt','input-origin.json','comparison-inputs.json'):
        if (preparation/file).is_file(): copy_prepared(preparation/file,output/file)
    atomic(output/'preparation-reference.json',{'session':name,'operation':preparation.name,'sealSha256':digest((preparation/'input-seal.json').read_bytes()),'scope':'Inputs prepared previously; evaluation below is new'})
    if case=='f02':
        path=output/'input.yaml';copy_prepared(preparation/(phase+'.yaml'),path)
        started=utc();clock=time.monotonic();decision=W.E.evaluate(path,W.POLICY,tools['executable']);decision.update(startUTC=started,endUTC=utc(),durationSeconds=time.monotonic()-clock);expected=[W.F02] if phase=='negative' else []
        (output/'control.stdout.log').write_text(decision['stdout']);(output/'control.stderr.log').write_text(decision['stderr'])
        atomic(output/'control-command.json',decision)
        matched=W.matches(decision,expected)
        atomic(output/'attribution.json',{'case':'F02' if phase=='negative' else 'F02 static counterpart','matched':matched,'expected':expected,**decision})
        print(decision['stdout'],flush=True)
        if not matched: raise ValueError('F02 expectation not established: '+decision['classification'])
    elif case=='f12':
        copy_prepared(preparation/(phase+'.json'),output/'input.json')
        subprocess.run(['bash',str(ROOT/'scripts/defense-demo/early-adapters.sh'),operation,name,str(output)],cwd=ROOT,check=True)
    else:
        source=preparation/phase
        for file in ('sbom.cdx.json','database-identity.json','image.json','state.json','scenario-input.json'):
            copy_prepared(source/file,output/file)
        subprocess.run(['bash',str(ROOT/'scripts/defense-demo/early-adapters.sh'),operation,name,str(output)],cwd=ROOT,check=True)
    # Recheck every sealed input and policy after the live evaluation.
    prepared(state,case)
    identity=read_json(output/'policy-identity.json')
    if digest((ROOT/identity['path']).read_bytes())!=identity['sha256']: raise ValueError('Policy changed during evaluation')
    atomic(output/'result.json',{'status':'CONFIRMED','case':case,'variant':phase,'decision':'deny' if phase=='negative' else 'allow','scope':'Early gate only; no admission or deployment','origin':'operations/'+preparation.name})


if __name__=='__main__':
    main(*sys.argv[1:])
