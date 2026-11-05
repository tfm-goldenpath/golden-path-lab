// Synthetic OCI fixtures exercise isolation; no cryptographic success is implied.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../helpers/registry-fixture.mjs';
import {planFault,checkIsolation,SBOM} from '../../scripts/sbom-scenario-evidence.mjs';
const types=['https://sigstore.dev/cosign/sign/v1',SBOM,'https://slsa.dev/provenance/v1','https://tfm-goldenpath.dev/attestations/verification-results/v1'];
test('F05 plan refuses duplicate valid SBOM evidence that could mask absence',async()=>{
  const f=fixture({types:[...types,SBOM]});
  const snapshot=await f.run(); assert.throws(()=>planFault(snapshot,f.image,'authorized'),/unambiguous/);
});
test('F05 checks exact restoration and rejects a non-target byte change',async()=>{
  const f=fixture({types}),before=await f.run(),plan=planFault(before,f.image,'authorized');
  checkIsolation(before,before,f.image,'authorized',plan,true);
  const changed=structuredClone(before); changed.rawArtifacts[0].bundle+='AA';
  assert.throws(()=>checkIsolation(before,changed,f.image,'authorized',plan,true),/bytes changed/);
});
test('F06 association changes only unsigned manifest subject, retaining donor bundle bytes',async()=>{
  const f=fixture({types}),donor=fixture({types,imageDigest:'sha256:'+'b'.repeat(64)});
  const before=await f.run(),other=await donor.run(),plan=planFault(before,f.image,'authorized',other);
  const donorSbom=other.rawArtifacts.find(r=>other.inventory.artifacts.find(a=>a.manifestDigest===r.manifestDigest).predicateType===SBOM);
  assert.equal(plan.raw.bundle,donorSbom.bundle);
  assert.equal(JSON.parse(Buffer.from(plan.raw.manifest,'base64')).subject.digest,f.image.split('@')[1]);
  assert.throws(()=>planFault(before,f.image,'authorized',before),/distinct/);
});
test('actual downloader preserves foreign bytes and structured mismatch without returning full inventory',async()=>{
  let foreign;
  const f=fixture({types,transform:b=>{
    const s=JSON.parse(Buffer.from(b.dsseEnvelope.payload,'base64'));
    if(s.predicateType===SBOM) {s.subject[0].digest.sha256='b'.repeat(64);b.dsseEnvelope.payload=Buffer.from(JSON.stringify(s)).toString('base64');foreign=b;}
    return b;
  }});
  await assert.rejects(f.run(),e=>{
    assert.equal(e.subjectMismatch.boundary,'registry-inventory'); assert.equal(e.subjectMismatch.inventoryComplete,false);
    assert.deepEqual(JSON.parse(Buffer.from(e.subjectMismatch.received.bundle,'base64')),foreign);
    assert.equal(e.subjectMismatch.predicate,SBOM);return true;
  });
});
