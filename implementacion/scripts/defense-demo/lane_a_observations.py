"""Read-only lane A package import, retaining exact digest/context associations."""
import base64
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import tarfile
import tempfile
import zipfile
from core import ROOT
from observation_packages import safe_name, CONTRACTS


def inspect(path, run, metadata):
    if not re.fullmatch(r'lane-a-(demo|vulnerabilities)-'+str(run['id'])+'-'+str(run['run_attempt']),metadata.get('name','')):
        raise ValueError('Lane A artifact run/attempt identity mismatch; databases are excluded')
    if path.stat().st_size!=metadata['size_in_bytes'] or path.stat().st_size>16*1024**2: raise ValueError('Lane A ZIP size mismatch')
    with path.open('rb') as stream: digest=hashlib.file_digest(stream,'sha256').hexdigest()
    if metadata.get('digest')!='sha256:'+digest: raise ValueError('Lane A ZIP hash mismatch')
    suite=metadata['name'].split('-')[2]
    output={};proofs={};paths={};groups=[]
    with zipfile.ZipFile(path) as z:
        names=set();total=0
        for e in z.infolist():
            safe_name(e.filename);total+=e.file_size
            if e.filename in names or (e.external_attr>>16)&0o170000 not in (0,0o100000,0o040000): raise ValueError('Unsafe/duplicate ZIP entry')
            names.add(e.filename)
            if len(names)>2048 or total>32*1024**2: raise ValueError('Lane A ZIP expansion limit')
        def read(name,limit=2*1024**2):
            e=z.getinfo(name)
            if e.is_dir() or e.file_size>limit: raise ValueError('Oversized lane A document')
            return z.read(e)
        source=json.loads(read('source.json'))
        if not isinstance(source,dict): raise ValueError('Invalid lane A source document')
        if any(str(source.get(k))!=str(v) for k,v in {'sourceCommit':run['head_sha'],'runId':run['id'],'runAttempt':run['run_attempt'],'sourceRepository':'https://github.com/'+run['repository']['full_name'],'suite':suite}.items()): raise ValueError('Lane A source association mismatch')
        sums={}
        for line in read('SHA256SUMS.txt').decode().splitlines():
            checksum,name=line.split('  ',1);safe_name(name)
            if name in sums or not re.fullmatch('[a-f0-9]{64}',checksum): raise ValueError('Ambiguous outer manifest')
            sums[name]=checksum
        def checked(name,limit=2*1024**2):
            raw=read(name,limit)
            if hashlib.sha256(raw).hexdigest()!=sums.get(name): raise ValueError('Outer manifest hash mismatch: '+name)
            return raw
        for name in ('source.json','result.json','coverage.json','package-audit.json','SHA256SUMS.txt'):
            output[suite+'/'+name]=read(name) if name=='SHA256SUMS.txt' else checked(name);paths[suite+'/'+name]=name
        audit=json.loads(output[suite+'/package-audit.json']);name=audit['archive']
        if not re.fullmatch(r'run-[A-Za-z0-9]+\.tar\.gz',name): raise ValueError('Unsafe package identity')
        raw=checked('packages/'+name,8*1024**2)
        seen=set();expanded=0
        with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as t:
            for m in t:
                safe_name(m.name);expanded+=m.size
                if not m.isfile() or m.name in seen or len(Path(m.name).parts)>8: raise ValueError('Unsafe/duplicate/deep nested package')
                seen.add(m.name)
                if len(seen)>4096 or expanded>32*1024**2 or m.size>2*1024**2: raise ValueError('Lane A package expansion limit')
        if str(ROOT/'scripts') not in sys.path: sys.path.insert(0,str(ROOT/'scripts'))
        from lane_a_evidence import verify_package
        with tempfile.TemporaryDirectory(prefix='golden-path-lane-a-public-') as temp:
            p=Path(temp)/name;p.write_bytes(raw);Path(str(p)+'.sha256').write_bytes(checked('packages/'+name+'.sha256'))
            verified=verify_package(p)
            if verified!=audit: raise ValueError('Lane A package audit mismatch')
        with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as t:
            prefix=name.removesuffix('.tar.gz')+'/'
            def retain(member):
                key=suite+'/'+member.removeprefix(prefix)
                if key not in output: output[key]=t.extractfile(member).read(2*1024**2+1)
                paths[key]='packages/'+name+'!/'+member
                return key
            for member in sorted(seen):
                kind=Path(member).name.removesuffix('.bundle.json')
                if kind not in ('image','sbom','provenance','results') or not member.endswith('.bundle.json'): continue
                context=str(Path(member).parent);key=retain(member);bundle=json.loads(output[key])
                if not isinstance(bundle,dict) or not isinstance(bundle.get('dsseEnvelope'),dict): raise ValueError('Invalid bundle envelope')
                statement=json.loads(base64.b64decode(bundle['dsseEnvelope']['payload'],validate=True))
                if not isinstance(statement,dict): raise ValueError('Invalid bundle statement')
                predicate=statement.get('predicateType')
                if CONTRACTS.get(predicate)!=kind: raise ValueError('Canonical bundle predicate mismatch')
                subjects=statement.get('subject') or []
                if not isinstance(subjects,list) or any(not isinstance(s,dict) or not isinstance(s.get('digest'),dict) for s in subjects): raise ValueError('Invalid bundle subjects')
                digests={s.get('digest',{}).get('sha256') for s in subjects}
                if len(digests)!=1 or not re.fullmatch('[a-f0-9]{64}',next(iter(digests)) or ''): raise ValueError('Ambiguous bundle subject')
                subject=next(iter(digests));stem='signature' if kind=='image' else kind
                report=context+'/verified-'+kind+'-bundle.txt';authenticated=context+'/verified-'+stem+'.json'
                crypto=False;report_key=None;statement_key=None
                if report in seen and authenticated in seen:
                    report_key=retain(report);statement_key=retain(authenticated)
                    # Exact corresponding statement and expected local verifier output only.
                    lines=output[report_key].decode().splitlines()
                    crypto=json.loads(output[statement_key])==statement and lines and lines[-1]=='Verified OK' and all(line.startswith('WARNING: Skipping tlog verification') for line in lines[:-1])
                gate=context+'/CI-authorized.result.json';gate_key=None;authorized=False
                if gate in seen:
                    gate_key=retain(gate);value=json.loads(output[gate_key])
                    if not isinstance(value,dict): raise ValueError('Invalid authorization gate')
                    authorized=crypto and value.get('status')=='VERIFIED' and value.get('digest')=='sha256:'+subject and predicate in value.get('authenticatedPredicates',[])
                before=context+'/CI-delivery.result.json'
                if before in seen:retain(before)
                trust=context+'/local-trusted-root.json';anchor=retain(trust) if trust in seen else None
                group=context.removeprefix(prefix).removeprefix(name.removesuffix('.tar.gz')) or 'principal'
                proofs[key]={'kind':kind,'lane':'A','arm':'G','suite':suite,'context':group,'phase':'retained-final',
                    'subjectDigest':'sha256:'+subject,'cryptoRecorded':bool(crypto),'authorizationRecorded':bool(authorized),
                    'recordedGateVerified':bool(authorized),'verifier':report_key,'statement':statement_key,'gate':gate_key,
                    'trustRoot':anchor,'verificationUTC':None,'boundary':'Exact same-context statement and original local-key verifier; historical receipt, no current verification; exact verification time not recorded'}
                groups.append((group,subject))
    return output,{'artifactId':metadata['id'],'artifactSha256':digest,'suite':suite,'lane':'A','package':verified,
                  'scope':'ZIP selected-document hashes, all package hashes; canonical final bundles only, not every negative snapshot',
                  'attestations':proofs,'paths':paths,'groups':[{'context':g,'digest':'sha256:'+d} for g,d in sorted(set(groups))]}
