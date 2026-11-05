#!/usr/bin/env node
// Compatibility adapter for Cosign 3.1.3 classic evidence and Kyverno 1.19.1.
// Only the public certificate-chain annotation changes; verification remains mandatory.
import { createHash, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CERTIFICATE = 'dev.sigstore.cosign/certificate';
const CHAIN = 'dev.sigstore.cosign/chain';
const MANIFEST_TYPE = 'application/vnd.oci.image.manifest.v1+json';
const DOCKER_TYPE = 'application/vnd.docker.distribution.manifest.v2+json';
const hash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => a.raw.equals(b.raw);

function pemCertificates(pem) {
  if (typeof pem !== 'string') throw new Error('Certificate annotation must be PEM text.');
  const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
  if (!blocks.length || blocks.length > 10 || blocks.join('').replace(/\s/g, '') !== pem.replace(/\s/g, '')) {
    throw new Error('Missing, malformed or excessive certificate chain.');
  }
  return blocks.map(block => new X509Certificate(block));
}

function issuedBy(child, parent) {
  return parent.ca && child.checkIssued(parent) && child.verify(parent.publicKey);
}

function fulcioChains(trustedRoot) {
  if (trustedRoot.mediaType !== 'application/vnd.dev.sigstore.trustedroot+json;version=0.1' ||
      !Array.isArray(trustedRoot.certificateAuthorities)) {
    throw new Error('Expected the authenticated Sigstore trusted-root export.');
  }
  const chains = trustedRoot.certificateAuthorities
    .filter(ca => ca.uri === 'https://fulcio.sigstore.dev')
    .map(ca => {
      const entries = ca.certChain?.certificates;
      if (!Array.isArray(entries) || !entries.length || entries.length > 10) throw new Error('Invalid Fulcio CA chain.');
      const chain = entries.map(entry => {
        if (typeof entry.rawBytes !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(entry.rawBytes)) {
          throw new Error('Invalid CA certificate encoding.');
        }
        return new X509Certificate(Buffer.from(entry.rawBytes, 'base64'));
      });
      if (chain.some(cert => !cert.ca) || !issuedBy(chain.at(-1), chain.at(-1)) ||
          chain.slice(0, -1).some((cert, i) => !issuedBy(cert, chain[i + 1]))) {
        throw new Error('The exported Fulcio CA chain does not link to its root.');
      }
      return chain;
    });
  if (!chains.length) throw new Error('No public Fulcio certificate authorities in the trusted-root export.');
  return chains;
}

export function completeManifest(manifest, trustedRoot) {
  if (manifest.schemaVersion !== 2 || ![MANIFEST_TYPE, DOCKER_TYPE].includes(manifest.mediaType) ||
      !Array.isArray(manifest.layers) || !manifest.layers.length || manifest.layers.length > 128) {
    throw new Error('Expected a bounded classic signature or attestation image manifest.');
  }
  const chains = fulcioChains(trustedRoot);
  const completed = structuredClone(manifest);
  const evidence = [];
  let changed = false;
  for (const layer of completed.layers) {
    const certificates = pemCertificates(layer.annotations?.[CERTIFICATE]);
    if (certificates.length !== 1 || certificates[0].ca) throw new Error('Expected one signing leaf certificate.');
    const leaf = certificates[0];
    const matches = chains.filter(chain => issuedBy(leaf, chain[0]));
    const distinct = new Map(matches.map(chain => [chain.map(cert => cert.fingerprint256).join('/'), chain]));
    if (distinct.size !== 1) throw new Error('Signing certificate has no unique matching authenticated Fulcio CA chain.');
    const chain = [...distinct.values()][0];
    const existing = layer.annotations[CHAIN] ? pemCertificates(layer.annotations[CHAIN]) : [];
    // Do not silently repair an unexpected or substituted existing chain.
    if (existing.some((cert, i) => !chain[i] || !same(cert, chain[i]))) {
      throw new Error('Existing chain differs from the authenticated Fulcio CA chain.');
    }
    if (existing.length !== chain.length) {
      layer.annotations[CHAIN] = chain.map(cert => cert.toString().trim()).join('\n') + '\n';
      changed = true;
    }
    evidence.push({ layerDigest: layer.digest, certificateFingerprint: leaf.fingerprint256,
      certificateIssuer: leaf.issuer, chainFingerprints: chain.map(cert => cert.fingerprint256),
      addedCertificates: chain.length - existing.length });
  }
  return { manifest: completed, changed, certificates: evidence };
}

// Fixed GHCR endpoints and no redirects keep the workflow token off other hosts.
// Responses and credentials are never included in authentication error messages.
export async function completeHostedChain({ image, kind, trustedRoot, actor, token, request = fetch }) {
  const match = /^ghcr\.io\/([a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)+)@sha256:([a-f0-9]{64})$/.exec(image);
  if (!match || !['sig', 'att'].includes(kind)) throw new Error('Expected a GHCR image pinned by digest and sig/att evidence.');
  if (!actor || !token) throw new Error('Hosted chain completion requires the workflow actor and token.');
  const [, repository, digest] = match;
  const response = await request('https://ghcr.io/token?' + new URLSearchParams({
    service: 'ghcr.io', scope: `repository:${repository}:pull,push`,
  }), { headers: { Authorization: 'Basic ' + Buffer.from(`${actor}:${token}`).toString('base64') },
    redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`GHCR token request failed (HTTP ${response.status}).`);
  let access;
  try { access = await response.json(); }
  catch { throw new Error('GHCR returned an invalid token response.'); }
  if (typeof access.token !== 'string' || !access.token) throw new Error('GHCR did not return an access token.');
  const url = `https://ghcr.io/v2/${repository}/manifests/sha256-${digest}.${kind}`;
  const headers = { Authorization: `Bearer ${access.token}`, Accept: `${MANIFEST_TYPE}, ${DOCKER_TYPE}` };
  async function readManifest() {
    const res = await request(url, { headers, redirect: 'error', signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Reading classic ${kind} manifest failed (HTTP ${res.status}).`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > 4 * 1024 * 1024) throw new Error('Classic evidence manifest exceeds the size limit.');
    if (res.headers.get('docker-content-digest') !== hash(bytes)) throw new Error('GHCR manifest digest does not match its content.');
    return { bytes, digest: hash(bytes), manifest: JSON.parse(bytes.toString('utf8')) };
  }
  const original = await readManifest();
  const result = completeManifest(original.manifest, trustedRoot);
  const bytes = result.changed ? Buffer.from(JSON.stringify(result.manifest)) : original.bytes;
  if (result.changed) {
    // Each lab run has a distinct image digest. Also refuse an observed concurrent edit.
    if ((await readManifest()).digest !== original.digest) throw new Error('Classic evidence changed concurrently; refusing to overwrite it.');
    const uploaded = await request(url, { method: 'PUT', headers: { ...headers, 'Content-Type': original.manifest.mediaType },
      body: bytes, redirect: 'error', signal: AbortSignal.timeout(30_000) });
    if (uploaded.status !== 201) throw new Error(`Publishing the completed ${kind} chain failed (HTTP ${uploaded.status}).`);
    if ((await readManifest()).digest !== hash(bytes)) throw new Error('Published chain metadata did not match the expected manifest.');
  }
  return { image, kind, changed: result.changed, trustedRootJsonSha256: hash(Buffer.from(JSON.stringify(trustedRoot))),
    originalManifestDigest: original.digest, completedManifestDigest: hash(bytes),
    certificates: result.certificates, originalManifest: original.manifest, completedManifest: result.manifest,
    scope: 'Public CA chain metadata only; subsequent Cosign and admission verification are mandatory.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [image, kind, trustedRootPath] = process.argv.slice(2);
    const report = await completeHostedChain({ image, kind,
      trustedRoot: JSON.parse(readFileSync(trustedRootPath, 'utf8')),
      actor: process.env.GITHUB_ACTOR, token: process.env.GH_TOKEN });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    // Keep fetch errors terse: never print request headers or token response bodies.
    console.error(`Certificate-chain completion failed: ${error.message}`);
    process.exitCode = 1;
  }
}
