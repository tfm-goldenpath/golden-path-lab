"""Selective inspection of an existing paired artifact; no extraction or trust decisions."""
import base64
import hashlib
import importlib.util
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
import tarfile
import tempfile
import zipfile

from core import ROOT

CONTRACTS = {
    'https://sigstore.dev/cosign/sign/v1': 'image',
    'https://cyclonedx.org/bom': 'sbom',
    'https://slsa.dev/provenance/v1': 'provenance',
    'https://tfm-goldenpath.dev/attestations/verification-results/v1': 'results',
}
MAX_DOCUMENT = 2*1024**2


def safe_name(name):
    parts=PurePosixPath(name).parts
    if not parts or name.startswith('/') or '..' in parts or '\\' in name or str(PurePosixPath(name))!=name.rstrip('/'):
        raise ValueError('Unsafe package path')


def bounded_package(raw):
    """Validate all tar headers before invoking the shared package hash verifier."""
    if len(raw)>8*1024**2: raise ValueError('G package compressed limit exceeded')
    total=0;seen=set()
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as archive:
        for member in archive:
            safe_name(member.name)
            if not member.isfile() or member.name in seen: raise ValueError('Unsafe or duplicate package member')
            seen.add(member.name);total+=member.size
            if len(seen)>512 or total>32*1024**2 or member.size>MAX_DOCUMENT:
                raise ValueError('G package expansion limit exceeded')
    return seen


def recorded_authorization(gate, measurement, predicate, report, native=False):
    """Conservative description of old receipts, not a new trust decision."""
    image=measurement.get('image','')
    phases=measurement.get('phases',{})
    return (gate.get('status')=='VERIFIED' and gate.get('image')==image
            and '@sha256:' in image and gate.get('digest')==image.split('@')[-1]
            and predicate in gate.get('authenticatedPredicates',[])
            and all(phases.get(p,{}).get('exitCode')==0 for p in ('verify-delivery','authorize-results'))
            and (bool(report.strip()) if native else report.strip()==b'Verified OK'))


def paired_documents(path, run, artifacts, artifact_id):
    """Verify the API ZIP hash and G package, retaining only public explanatory documents.

    The database entry is never decompressed. This is deliberately NOT a full
    pair/export audit and does not reverify signatures or infer R verification.
    """
    from observations import associate
    metadata=next((a for a in artifacts if a.get('id')==artifact_id),None)
    if not metadata or not re.fullmatch(r'sha256:[a-f0-9]{64}',metadata.get('digest') or ''):
        raise ValueError('Artifact identity or recorded SHA-256 unavailable')
    if path.stat().st_size!=metadata.get('size_in_bytes') or path.stat().st_size>128*1024**2:
        raise ValueError('Artifact size mismatch or limit exceeded')
    with path.open('rb') as stream: digest=hashlib.file_digest(stream,'sha256').hexdigest()
    if metadata['digest']!='sha256:'+digest: raise ValueError('GitHub artifact checksum mismatch')
    with zipfile.ZipFile(path) as archive:
        entries=archive.infolist();seen=set();total=0
        for entry in entries:
            safe_name(entry.filename);mode=(entry.external_attr>>16)&0o170000
            if entry.filename in seen or mode not in (0,0o100000,0o040000): raise ValueError('Unsafe or duplicate ZIP member')
            seen.add(entry.filename);total+=entry.file_size
            if len(seen)>2048 or total>512*1024**2: raise ValueError('ZIP inventory limit exceeded')
        def small(name,limit=MAX_DOCUMENT):
            entry=archive.getinfo(name)
            if entry.is_dir() or entry.file_size>limit: raise ValueError('Oversized selected document')
            return archive.read(entry)
        pair_raw=small('pair.json');pair=associate(json.loads(pair_raw),run)
        # Archived G package name comes only from the associated pair manifest.
        record=pair.get('packageVerification',{}).get('G',{})
        name=record.get('archive','')
        if not re.fullmatch(r'run-[A-Za-z0-9]+\.tar\.gz',name): raise ValueError('G package reference unavailable')
        raw=small('packages/'+name,8*1024**2);bounded_package(raw)
        sys.path.insert(0,str(ROOT/'scripts')) if str(ROOT/'scripts') not in sys.path else None
        from lane_a_evidence import verify_package
        with tempfile.TemporaryDirectory(prefix='golden-path-observation-package-') as directory:
            package=Path(directory)/name;package.write_bytes(raw)
            Path(str(package)+'.sha256').write_bytes(small('packages/'+name+'.sha256'))
            checked=verify_package(package)
            if checked!=record: raise ValueError('G package manifest mismatch')
        with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as package:
            prefix=name.removesuffix('.tar.gz')+'/'
            def document(basename):
                member=package.getmember(prefix+basename)
                return package.extractfile(member).read(MAX_DOCUMENT+1)
            measurement_raw=document('measurement.json');measurement=json.loads(measurement_raw)
            spec=importlib.util.spec_from_file_location('demo_paired_validation',ROOT/'scripts/paired-rg.py')
            validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)
            finalized=dict(measurement,classification=validator.classify(measurement))
            if pair['arms'].get('G') not in (measurement,finalized): raise ValueError('G measurement association mismatch')
            validator.verify_arm_progress(measurement,pair,'G')
            output={'pair.json':pair_raw,'measurement.json':measurement_raw}
            paths={'pair.json':'pair.json','measurement.json':'packages/'+name+'!/'+prefix+'measurement.json'}
            def retain(basename):
                output[basename]=document(basename)
                paths[basename]='packages/'+name+'!/'+prefix+basename
                return output[basename]
            gate=json.loads(retain('CI-authorized.result.json'))
            contract=json.loads(retain('CI-authorized-2.provenance-contract.json')) if prefix+'CI-authorized-2.provenance-contract.json' in package.getnames() else {}
            image=measurement.get('image','');expected=image.split('@sha256:')[-1]
            proofs={}
            for member in package.getmembers():
                basename=member.name.removeprefix(prefix)
                if not re.fullmatch(r'CI-authorized-[0-9]+\.bundle\.json',basename): continue
                bundle=json.loads(retain(basename))
                statement=json.loads(base64.b64decode(bundle['dsseEnvelope']['payload'],validate=True))
                predicate=statement.get('predicateType');kind=CONTRACTS.get(predicate)
                if not kind: continue
                if any(p['kind']==kind for p in proofs.values()): raise ValueError('Ambiguous duplicate attestation contract')
                if not statement.get('subject') or any(s.get('digest',{}).get('sha256')!=expected for s in statement['subject']):
                    raise ValueError('Attestation subject differs from G image')
                stem=basename.removesuffix('.bundle.json')
                authenticated=json.loads(retain(stem+'.statement.json'))
                issuer=None
                if kind=='provenance':
                    match=contract.get('matchedResult')
                    if not isinstance(authenticated,list) or type(match) is not int or match<0 or match>=len(authenticated):
                        raise ValueError('Native verification result association unavailable')
                    selected=authenticated[match]
                    if selected.get('attestation',{}).get('bundle')!=bundle:
                        raise ValueError('Native verifier and bundle differ')
                    verified=selected.get('verificationResult',{})
                    invocation=statement.get('predicate',{}).get('runDetails',{}).get('metadata',{}).get('invocationId')
                    expected_invocation='https://github.com/'+run['repository']['full_name']+'/actions/runs/'+str(run['id'])+'/attempts/'+str(run['run_attempt'])
                    if invocation!=expected_invocation: raise ValueError('Native provenance run attempt mismatch')
                    issuer=verified.get('signature',{}).get('certificate',{}).get('issuer')
                    authenticated=verified.get('statement')
                if authenticated!=statement: raise ValueError('Verifier statement and bundle differ')
                verifier=stem+('.verify.json' if kind=='provenance' else '.verify.log')
                report=retain(verifier)
                # This explains retained evidence. No current crypto or content validator invocation.
                recorded=recorded_authorization(gate,measurement,predicate,report,native=kind=='provenance')
                phase=measurement.get('phases',{}).get('authorize-results',{})
                proofs[basename]={'kind':kind,'subjectDigest':'sha256:'+expected,'arm':'G',
                    'lane':'B' if contract.get('authorised') is True and contract.get('commit')==run['head_sha'] and contract.get('identity')=='https://github.com/'+run['repository']['full_name']+'/.github/workflows/paired-rg.yml@refs/heads/main' else 'unknown',
                    'provenanceIdentity':contract.get('identity'), 'issuer':issuer, 'recordedGateVerified':recorded,
                    'verificationUTC':phase.get('end',{}).get('utc'),
                    'gate':'CI-authorized.result.json','verifier':verifier,'statement':stem+'.statement.json',
                    'boundary':'Historical aggregate gate receipt and original verifier output; no current cryptographic or semantic reverification'}
            return output,{'artifactId':artifact_id,'artifactSha256':digest,'package':checked,
                'scope':'G package internal hashes and run/source/subject association; R/infrastructure/database packages not audited',
                'paths':paths,'attestations':proofs}
