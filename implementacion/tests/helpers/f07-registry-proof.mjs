// Synthetic unit fixture exercised against a real run-owned zot instance.
// Empty predicates are deliberately NOT valid authorization or delivery reports.
import {basename, join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {fixture, bytes, digest, MANIFEST} from './registry-fixture.mjs';
import {downloadBundleInventory} from '../../scripts/download-bundle-inventory.mjs';
import {mutateSignature, checkAlteration} from '../../scripts/f07-signature-evidence.mjs';
const [directory, host] = process.argv.slice(2), run = basename(directory), repo = 'quotes-node-' + run.toLowerCase();
const base = `http://${host}/v2/${repo}`;
const save = (name, data) => writeFileSync(join(directory, name + '.json'), JSON.stringify(data, null, 2) + '\n');
async function send(path, options, status) {
  const response = await fetch(base + path, {...options, redirect:'manual', signal:AbortSignal.timeout(30000)});
  if (response.status !== status) throw new Error(`Synthetic protocol probe HTTP ${response.status}, expected ${status}`);
  return response;
}
async function blob(raw) {
  const response = await send('/blobs/uploads/', {method:'POST'}, 202);
  const url = new URL(response.headers.get('location'), base);
  if (url.origin !== new URL(base).origin || !url.pathname.startsWith(`/v2/${repo}/blobs/uploads/`)) throw new Error('Upload endpoint escaped probe registry.');
  url.searchParams.set('digest', digest(raw));
  await send(url.pathname.slice(new URL(base).pathname.length) + url.search, {method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:raw}, 201);
}
const config = bytes({architecture:'amd64',os:'linux',rootfs:{type:'layers',diff_ids:[]}});
await blob(config);
const imageBytes = bytes({schemaVersion:2,mediaType:MANIFEST,config:{mediaType:'application/vnd.oci.image.config.v1+json',digest:digest(config),size:config.length},layers:[]});
await send('/manifests/protocol-fixture', {method:'PUT',headers:{'Content-Type':MANIFEST},body:imageBytes}, 201);
const f = fixture({host,repo,imageDigest:digest(imageBytes),types:['https://sigstore.dev/cosign/sign/v1','https://cyclonedx.org/bom','https://slsa.dev/provenance/v1','https://tfm-goldenpath.dev/attestations/verification-results/v1']});
const material = await f.run();
for (const raw of material.rawArtifacts) {
  await blob(Buffer.from(raw.config,'base64'));
  await blob(Buffer.from(raw.bundle,'base64'));
  // The synthetic subject descriptor carries the actual image manifest size.
  const manifest = JSON.parse(Buffer.from(raw.manifest,'base64'));
  manifest.subject.size = imageBytes.length;
  const content = bytes(manifest);
  await send('/manifests/' + digest(content), {method:'PUT',headers:{'Content-Type':MANIFEST},body:content}, 201);
}
const state = {mode:'local',registry:'tfm-zot-' + run.toLowerCase(),imageRepository:host + '/' + repo,digest:digest(imageBytes)};
save('state', state);
const snapshot = () => downloadBundleInventory({mode:'local',image:f.image});
const before = await snapshot(); save('before', before);
let original, recovery;
try {
  await mutateSignature({state,run,image:f.image,backup:before});
  const negative = await snapshot(); save('negative', negative);
  save('alteration-check', checkAlteration(before,negative,f.image));
  const unchangedImage = await send('/manifests/' + state.digest, {headers:{Accept:MANIFEST}}, 200);
  if (digest(Buffer.from(await unchangedImage.arrayBuffer())) !== state.digest) throw new Error('Image changed during probe.');
} catch (error) { original = error; }
finally {
  try {
    await mutateSignature({state,run,image:f.image,backup:before,restore:true});
    const restored = await snapshot(); save('restored',restored);
    save('restoration-check',checkAlteration(before,restored,f.image,true));
  } catch (error) { recovery = error; }
  save('outcome',{scope:'synthetic registry protocol fixture; no authorization/admission claim',image:f.image,originalError:original?.message ?? null,restorationError:recovery?.message ?? null});
}
if (original || recovery) throw new AggregateError([original,recovery].filter(Boolean),'Registry protocol proof failed');
console.log('PASS: exact referrer removal/restoration and unchanged image; synthetic protocol fixture only.');
