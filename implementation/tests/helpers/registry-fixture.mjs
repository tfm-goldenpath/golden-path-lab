// Synthetic OCI responses: no cryptographic or authorization claims.
import {createHash} from 'node:crypto';
import {downloadBundleInventory} from '../../scripts/download-bundle-inventory.mjs';
const BUNDLE = 'application/vnd.dev.sigstore.bundle.v0.3+json';
const INDEX = 'application/vnd.oci.image.index.v1+json';
const MANIFEST = 'application/vnd.oci.image.manifest.v1+json';
const EMPTY_CONFIG = 'application/vnd.oci.empty.v1+json';
const defaultImageDigest = 'sha256:' + 'a'.repeat(64);
const bytes = value => Buffer.from(JSON.stringify(value));
const digest = value => 'sha256:' + createHash('sha256').update(value).digest('hex');
const response = (body, type = 'application/json', status = 200, headers = {}) => new Response(body, {status, headers:{'content-type':type, ...headers}});
const bundle = (type, imageDigest, index) => ({mediaType:BUNDLE, verificationMaterial:{publicKey:{hint:'synthetic'}},
  dsseEnvelope:{payloadType:'application/vnd.in-toto+json', signatures:[{sig:Buffer.from('synthetic-' + index).toString('base64')}],
    payload:bytes({_type:'https://in-toto.io/Statement/v1', subject:[{name:'synthetic',digest:{sha256:imageDigest.slice(7)}}],
      predicateType:type, predicate:{}}).toString('base64')}});

export function fixture({transform = value => value, mode = 'local', imageDigest = defaultImageDigest, host = '172.18.0.2:5000', repo = 'quotes-node-run-fixture', types = ['https://sigstore.dev/cosign/sign/v1', 'https://cyclonedx.org/bom', 'https://slsa.dev/provenance/v1']} = {}) {
  const origin = mode === 'local' ? 'http://' + host : 'https://ghcr.io';
  const repository = mode === 'local' ? repo : 'example/quotes-run-fixture';
  const image = origin.replace(/^https?:\/\//, '') + '/' + repository + '@' + imageDigest;
  const path = '/v2/' + repository;
  const indexPath = path + '/referrers/' + imageDigest;
  const fallbackPath = path + '/manifests/' + imageDigest.replace(':', '-');
  const contents = new Map();
  const descriptors = [];
  const bundles = types.map((type, index) => transform(bundle(type, imageDigest, index)));
  const layerPaths = [];
  const configPaths = [];
  const manifestPaths = [];
  const overrides = new Map();
  const calls = [];
  for (const value of bundles) {
    const raw = bytes(value);
    const layer = {mediaType:BUNDLE, digest:digest(raw), size:raw.length};
    const configBytes = Buffer.from('{}');
    const manifest = {schemaVersion:2, mediaType:MANIFEST, artifactType:BUNDLE,
      config:{mediaType:EMPTY_CONFIG, digest:digest(configBytes), size:2},
      subject:{mediaType:MANIFEST, digest:imageDigest, size:123}, layers:[layer]};
    const manifestBytes = bytes(manifest);
    const entry = {mediaType:MANIFEST, artifactType:BUNDLE, digest:digest(manifestBytes), size:manifestBytes.length};
    descriptors.push(entry);
    const layerPath = path + '/blobs/' + layer.digest;
    const configPath = path + '/blobs/' + digest(configBytes);
    const manifestPath = path + '/manifests/' + entry.digest;
    contents.set(layerPath, {body:raw, type:BUNDLE});
    contents.set(configPath, {body:configBytes, type:EMPTY_CONFIG});
    contents.set(manifestPath, {body:manifestBytes, type:MANIFEST});
    layerPaths.push(layerPath);
    configPaths.push(configPath);
    manifestPaths.push(manifestPath);
  }
  const index = entries => response(bytes({schemaVersion:2, mediaType:INDEX, manifests:entries}), INDEX);
  async function request(url, options) {
    calls.push({url, options});
    const parsed = new URL(url);
    const key = parsed.pathname + parsed.search;
    if (overrides.has(key)) return overrides.get(key)(url, options);
    if (parsed.pathname === '/token') return response(bytes({token:'TEST-PULL-TOKEN'}));
    if (parsed.pathname === indexPath || parsed.pathname === fallbackPath) return index(descriptors);
    const found = contents.get(parsed.pathname);
    return found ? response(found.body, found.type) : response('', 'text/plain', 404);
  }
  return {mode, image, origin, path, indexPath, fallbackPath, request, contents, descriptors, index,
    bundles, layerPaths, configPaths, manifestPaths, overrides, calls,
    run(extra = {}) { return downloadBundleInventory({mode, image, request, actor:'test-actor', token:'TEST-WORKFLOW-TOKEN', ...extra}); }};
}


export {BUNDLE, INDEX, MANIFEST, EMPTY_CONFIG, bytes, digest, response};
