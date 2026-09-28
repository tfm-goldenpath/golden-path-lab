#!/usr/bin/env node
// Cosign 3.1.3 GetBundles skips individual retrieval/parse errors:
// https://github.com/sigstore/cosign/blob/v3.1.3/pkg/cosign/verify.go
// Enumerate OCI referrers independently so absence is never inferred from that
// best-effort output. This is retrieval/structure validation, not authentication.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseEnvelopes } from './check-missing-results.mjs';

const BUNDLE = 'application/vnd.dev.sigstore.bundle.v0.3+json';
const BUNDLE_PREFIX = 'application/vnd.dev.sigstore.bundle';
const INDEX = 'application/vnd.oci.image.index.v1+json';
const MANIFEST = 'application/vnd.oci.image.manifest.v1+json';
const EMPTY_CONFIG = 'application/vnd.oci.empty.v1+json';
const MAX_REFERRERS = 50; // Matches pinned Kyverno's bundle verifier.
const MAX_MANIFEST = 4 * 1024 * 1024;
const MAX_CONFIG = 64 * 1024;
const MAX_BUNDLE = 10 * 1000 * 1000;
const hash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const isBundle = value => typeof value === 'string' && value.startsWith(BUNDLE_PREFIX);
const canonical = value => JSON.stringify(value, function (_key, item) {
  return object(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item;
});

function location(mode, image) {
  const match = /^([^/]+)\/([^@]+)@(sha256:[a-f0-9]{64})$/.exec(image || '');
  if (!match || !match[2].split('/').every(part => /^[a-z0-9]+(?:[._-]+[a-z0-9]+)*$/.test(part))) {
    throw new Error('Expected a canonical repository and SHA-256 image digest.');
  }
  const [, host, repository, digest] = match;
  if (mode === 'github') {
    if (host !== 'ghcr.io' || !repository.includes('/')) throw new Error('Hosted inventory is restricted to GHCR.');
    return { origin:'https://ghcr.io', repository, digest };
  }
  if (mode !== 'local') throw new Error('Inventory mode must be local or github.');
  const local = /^(\d+\.\d+\.\d+\.\d+):([1-9]\d{0,4})$/.exec(host);
  if (!local || Number(local[2]) > 65535) throw new Error('Local inventory requires a private IPv4 host and explicit port.');
  const octets = local[1].split('.').map(Number);
  if (octets.some((value, index) => value > 255 || String(value) !== local[1].split('.')[index])
      || !(octets[0] === 10 || octets[0] === 127 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
        || (octets[0] === 192 && octets[1] === 168))) {
    throw new Error('Local inventory requires a private IPv4 host and explicit port.');
  }
  return { origin:'http://' + host, repository, digest };
}

export async function bytesOf(response, maximum) {
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maximum)) throw new Error('Registry response exceeds its size limit.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Registry response has no readable body.');
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new Error('Registry response exceeds its size limit.');
      }
      chunks.push(Buffer.from(value));
    }
  } catch {
    throw new Error('Registry response could not be read within its size limit.');
  }
  if (declared !== null && Number(declared) !== size) throw new Error('Registry response length does not match its body.');
  return Buffer.concat(chunks);
}

function jsonOf(bytes) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error('Registry returned malformed JSON.'); }
}

function descriptor(value, maximum) {
  if (!object(value) || !digestPattern.test(value.digest || '') || !Number.isSafeInteger(value.size)
      || value.size < 1 || value.size > maximum || typeof value.mediaType !== 'string' || !value.mediaType) {
    throw new Error('Registry returned an invalid or oversized OCI descriptor.');
  }
  return value;
}

export async function downloadBundleInventory({ mode, image, actor, token, request = fetch }) {
  const { origin, repository, digest } = location(mode, image);
  let authorization;
  async function fetchResponse(url, headers = {}) {
    try { return await request(url, { headers, redirect:'manual', signal:AbortSignal.timeout(30_000) }); }
    catch { throw new Error('Registry request failed.'); }
  }
  if (mode === 'github') {
    if (typeof actor !== 'string' || !actor || typeof token !== 'string' || !token) throw new Error('Hosted inventory requires the workflow actor and token.');
    const response = await fetchResponse('https://ghcr.io/token?' + new URLSearchParams({
      service:'ghcr.io', scope:`repository:${repository}:pull`,
    }), { Authorization:'Basic ' + Buffer.from(`${actor}:${token}`).toString('base64') });
    if (!response.ok) throw new Error(`GHCR token request failed (HTTP ${response.status}).`);
    const access = jsonOf(await bytesOf(response, 16 * 1024));
    if (typeof access.token !== 'string' || !access.token) throw new Error('GHCR returned an invalid token response.');
    authorization = 'Bearer ' + access.token;
  }
  const headers = accept => ({ Accept:accept, ...(authorization ? {Authorization:authorization} : {}) });
  const apiPath = `/v2/${repository}/referrers/${digest}`;
  const fallbackPath = `/v2/${repository}/manifests/${digest.replace(':', '-')}`;

  async function listReferrers() {
    let next = origin + apiPath;
    let source = 'referrers-api';
    const seenPages = new Set();
    const entries = new Map();
    for (let page = 0; next; page++) {
      if (page >= 10 || seenPages.has(next)) throw new Error('Referrer pagination is repeated or excessive.');
      seenPages.add(next);
      let response = await fetchResponse(next, headers(INDEX));
      if (page === 0 && ([400, 404, 405, 406].includes(response.status)
          || (response.ok && response.headers.get('content-type')?.split(';')[0].trim() !== INDEX))) {
        source = 'referrers-tag';
        next = origin + fallbackPath;
        response = await fetchResponse(next, headers(INDEX));
      }
      if (!response.ok) throw new Error(`Reading referrers failed (HTTP ${response.status}).`);
      if (response.headers.get('content-type')?.split(';')[0].trim() !== INDEX) throw new Error('Referrer index has an unexpected content type.');
      const value = jsonOf(await bytesOf(response, MAX_MANIFEST));
      if (!object(value) || value.schemaVersion !== 2 || value.mediaType !== INDEX || !Array.isArray(value.manifests)) {
        throw new Error('Registry returned an invalid OCI referrer index.');
      }
      for (const entry of value.manifests) {
        descriptor(entry, MAX_MANIFEST);
        if (entries.has(entry.digest)) throw new Error('Referrer index contains a duplicate descriptor.');
        entries.set(entry.digest, entry);
        if (entries.size > MAX_REFERRERS) throw new Error('Referrer count exceeds the pinned Kyverno limit.');
      }
      const link = response.headers.get('link');
      next = null;
      if (link) {
        if (source !== 'referrers-api') throw new Error('Unexpected pagination on a referrers fallback tag.');
        const match = /^\s*<([^>]+)>\s*;\s*rel=(?:"next"|next)\s*$/.exec(link);
        if (!match) throw new Error('Registry returned unsupported referrer pagination.');
        let url;
        try { url = new URL(match[1], origin + apiPath); }
        catch { throw new Error('Registry returned an invalid pagination URL.'); }
        if (url.origin !== origin || url.pathname !== apiPath || url.username || url.password || url.hash
            || [...url.searchParams.keys()].some(key => !['n', 'last'].includes(key))
            || url.searchParams.getAll('n').length > 1 || url.searchParams.getAll('last').length > 1
            || (url.searchParams.has('n') && !/^[1-9]\d{0,3}$/.test(url.searchParams.get('n')))) {
          throw new Error('Referrer pagination escapes the expected registry endpoint.');
        }
        next = url.href;
      }
    }
    return { source, descriptors:[...entries.values()].sort((a, b) => a.digest.localeCompare(b.digest)) };
  }

  async function fetchContent(path, entry, maximum, blob = false) {
    descriptor(entry, maximum);
    let url = origin + path;
    let response;
    for (let redirect = 0; ; redirect++) {
      response = await fetchResponse(url, redirect === 0 ? headers(entry.mediaType) : {Accept:entry.mediaType});
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      if (!blob || mode !== 'github' || redirect >= 3) throw new Error('Unexpected or excessive registry redirect.');
      let target;
      try { target = new URL(response.headers.get('location'), url); }
      catch { throw new Error('Registry returned an invalid blob redirect.'); }
      if (target.protocol !== 'https:' || target.username || target.password || target.hash
          || (target.port && target.port !== '443')
          || !(target.hostname === 'ghcr.io' || target.hostname.endsWith('.githubusercontent.com'))) {
        throw new Error('Registry blob redirect is outside the permitted HTTPS storage hosts.');
      }
      url = target.href;
    }
    if (!response.ok) throw new Error(`Reading registry content failed (HTTP ${response.status}).`);
    const bytes = await bytesOf(response, maximum);
    if (bytes.length !== entry.size || hash(bytes) !== entry.digest) throw new Error('Registry content does not match its OCI size and digest.');
    const reported = response.headers.get('docker-content-digest');
    if (reported && reported !== entry.digest) throw new Error('Registry content digest header does not match its descriptor.');
    return bytes;
  }

  const before = await listReferrers();
  const bundles = [];
  const artifacts = [];
  const configs = new Map();
  const rawArtifacts = [];
  for (const entry of before.descriptors) {
    const manifestBytes = await fetchContent(`/v2/${repository}/manifests/${entry.digest}`, entry, MAX_MANIFEST);
    const manifest = jsonOf(manifestBytes);
    if (!object(manifest) || manifest.schemaVersion !== 2 || manifest.mediaType !== MANIFEST
        || !Array.isArray(manifest.layers) || !object(manifest.config)) throw new Error('Referrer is not an OCI image manifest.');
    if (entry.artifactType && manifest.artifactType && entry.artifactType !== manifest.artifactType) throw new Error('Referrer artifact types disagree.');
    const candidate = [entry.artifactType, manifest.artifactType, manifest.config.mediaType,
      ...manifest.layers.map(layer => layer?.mediaType)].some(isBundle);
    if (!candidate) {
      // Non-Sigstore contents cannot satisfy a bundle requirement. Inspect their
      // manifests for classification without retrieving unrelated artifact data.
      artifacts.push({manifestDigest:entry.digest, kind:'non-sigstore', check:'manifest-only'});
      continue;
    }
    if (manifest.artifactType !== BUNDLE || (entry.artifactType && entry.artifactType !== BUNDLE)
        || manifest.subject?.digest !== digest || manifest.layers.length !== 1 || manifest.layers[0]?.mediaType !== BUNDLE) {
      throw new Error('Unsupported Sigstore referrer type, subject or layer structure.');
    }
    // Both pinned publishers use an OCI empty JSON config; Cosign optionally
    // adds artifactType to its descriptor, while the GitHub publisher omits it.
    // Cosign v3.1.3 pkg/oci/remote/write.go and @sigstore/oci 0.7.2 image.ts.
    const config = descriptor(manifest.config, MAX_CONFIG);
    if (config.mediaType !== EMPTY_CONFIG) throw new Error('Unsupported Sigstore config media type.');
    if (configs.has(config.digest)) {
      if (configs.get(config.digest).length !== config.size) throw new Error('Shared config descriptors disagree on content size.');
    } else {
      const configBytes = await fetchContent(`/v2/${repository}/blobs/${config.digest}`, config, MAX_CONFIG, true);
      const value = jsonOf(configBytes);
      if (!object(value) || Object.keys(value).length !== 0) throw new Error('Sigstore OCI empty config must contain an empty JSON object.');
      configs.set(config.digest, configBytes);
    }
    const layer = descriptor(manifest.layers[0], MAX_BUNDLE);
    const bytes = await fetchContent(`/v2/${repository}/blobs/${layer.digest}`, layer, MAX_BUNDLE, true);
    const bundle = jsonOf(bytes);
    // Validate every returned wrapper, including unrelated predicate types.
    const [statement] = parseEnvelopes(JSON.stringify(bundle), {bundlesOnly:true});
    if (statement.subject.some(subject => subject.digest.sha256 !== digest.slice(7))) throw new Error('Bundle subject differs from the requested image.');
    rawArtifacts.push({manifestDigest:entry.digest, manifest:manifestBytes.toString('base64'),
      config:configs.get(config.digest).toString('base64'), bundle:bytes.toString('base64')});
    bundles.push(bundle);
    artifacts.push({manifestDigest:entry.digest, configDigest:config.digest, configSize:config.size,
      bundleDigest:layer.digest, bundleSize:layer.size, predicateType:statement.predicateType,
      subjectDigest:digest, kind:'sigstore-bundle-v0.3'});
  }
  if (!bundles.length) throw new Error('The registry contains no supported Sigstore bundles.');
  const after = await listReferrers();
  if (canonical(before) !== canonical(after)) throw new Error('Referrer inventory changed during retrieval.');
  return { bundles, rawArtifacts, inventory:{image, source:before.source, descriptors:before.descriptors, artifacts,
    check:'complete OCI referrer listing and manifests; Sigstore configs, bundle layers and structure; signatures verified separately'} };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (![4, 5].includes(process.argv.length)) throw new Error('Usage: download-bundle-inventory.mjs MODE IMAGE [INDEX_JSON]');
    const [, , mode, image, metadata] = process.argv;
    const {bundles, inventory} = await downloadBundleInventory({mode, image, actor:process.env.GITHUB_ACTOR, token:process.env.GH_TOKEN});
    if (metadata) writeFileSync(metadata, JSON.stringify(inventory, null, 2) + '\n');
    console.log(JSON.stringify(bundles, null, 2));
  } catch (error) {
    console.error('Bundle inventory failed: ' + error.message);
    process.exitCode = 1;
  }
}
