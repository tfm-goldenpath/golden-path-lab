#!/usr/bin/env node
// Standalone protocol experiment. Never imported by demo.sh; no package REST API.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, realpathSync, statSync, openSync, closeSync} from 'node:fs';
import {basename, resolve, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {downloadBundleInventory, bytesOf} from '../../scripts/download-bundle-inventory.mjs';
import {validateBackup, checkAlteration} from '../../scripts/f07-signature-evidence.mjs';
import {statementFromVerifiedBundle} from '../../scripts/verified-bundle-statement.mjs';
import {validateGithubVerificationResults} from '../../scripts/github-attestation.mjs';

const hash = b => 'sha256:' + createHash('sha256').update(b).digest('hex');
const read = p => JSON.parse(readFileSync(p));
const requireThat = (value, message) => { if (!value) throw new Error(message); };
const MANIFEST = 'application/vnd.oci.image.manifest.v1+json';
const PROVENANCE = 'https://slsa.dev/provenance/v1';
const REF = 'refs/heads/test/f07-hosted-admission-compatibility';

export function workflowContext(env) {
  requireThat(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch'
    && env.RUNNER_ENVIRONMENT === 'github-hosted' && env.GITHUB_REF === REF
    && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY || '')
    && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '')
    && /^[1-9]\d*$/.test(env.GITHUB_RUN_ID || '') && /^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT || '')
    && env.GITHUB_WORKFLOW_REF === `${env.GITHUB_REPOSITORY}/.github/workflows/golden-path.yml@${REF}`,
  'Protocol probe requires the explicitly selected hosted manual workflow.');
  return {repository:env.GITHUB_REPOSITORY, commit:env.GITHUB_SHA, ref:env.GITHUB_REF,
    run:env.GITHUB_RUN_ID, attempt:env.GITHUB_RUN_ATTEMPT, identity:'https://github.com/' + env.GITHUB_WORKFLOW_REF};
}

export function assertInvocation(certificate, context) {
  requireThat(certificate.runInvocationURI === `https://github.com/${context.repository}/actions/runs/${context.run}/attempts/${context.attempt}`,
    'Authenticated provenance belongs to another workflow run/attempt.');
}

export function assertFixture({context, receipt, state, result, run, expectedImage, stateCreated, now = Date.now()}) {
  requireThat(JSON.stringify(receipt.context) === JSON.stringify(context)
    && Number.isFinite(receipt.started) && receipt.started <= stateCreated && stateCreated <= now
    && now - receipt.started < 2 * 60 * 60 * 1000, 'Fixture receipt is stale or belongs to another run.');
  const image = `${state.imageRepository}@${state.digest}`;
  requireThat(/^run-[A-Za-z0-9]+$/.test(run) && state.mode === 'github'
    && state.imageRepository === `ghcr.io/${context.repository.toLowerCase()}-quotes-node`
    && /^sha256:[a-f0-9]{64}$/.test(state.digest || '') && image === expectedImage
    && state.sourceRepository === 'https://github.com/' + context.repository
    && state.sourceCommit === context.commit && state.identity === context.identity,
  'Fixture is not the current run-owned hosted image.');
  requireThat(result.status === 'PASS' && result.mode === 'github' && result.image === image
    && result.F07?.status === 'NOT_EXECUTED' && result.source?.commit === context.commit
    && result.source?.repository === state.sourceRepository,
  'Normal validated hosted delivery must finish before this protocol experiment.');
  return image;
}

// Fixed GHCR endpoint and repository scope; never follow a mutation redirect.
// Requesting delete capability does not grant it or change workflow permissions.
export async function registryClient({image, actor, token, request = fetch, observe = () => {}}) {
  requireThat(/^ghcr\.io\/[a-z0-9._-]+\/[a-z0-9._-]+@sha256:[a-f0-9]{64}$/.test(image)
    && actor && token, 'Expected fixed GHCR image and workflow credentials.');
  const repository = image.split('@')[0].slice(8);
  const base = `https://ghcr.io/v2/${repository}`;
  async function send(url, options) {
    try { return await request(url, {...options, redirect:'manual', signal:AbortSignal.timeout(30_000)}); }
    catch { throw new Error('GHCR protocol transport failed.'); }
  }
  const response = await send('https://ghcr.io/token?' + new URLSearchParams({service:'ghcr.io',scope:`repository:${repository}:pull,push,delete`}),
    {headers:{Authorization:'Basic ' + Buffer.from(`${actor}:${token}`).toString('base64')}});
  observe({operation:'token',status:response.status});
  requireThat(response.status === 200, `GHCR capability request failed (HTTP ${response.status}).`);
  let access;
  try { access = JSON.parse(await bytesOf(response, 16384)); }
  catch { throw new Error('Malformed GHCR capability response.'); }
  requireThat(typeof access.token === 'string' && access.token, 'Invalid GHCR capability response.');
  const authorization = 'Bearer ' + access.token;
  return {
    async get(kind, digest, maximum) {
      requireThat(['manifests','blobs'].includes(kind) && /^sha256:[a-f0-9]{64}$/.test(digest), 'Invalid content address.');
      let url = `${base}/${kind}/${digest}`;
      let response;
      for (let n = 0; ; n++) {
        response = await send(url, {headers:{Accept:MANIFEST, ...(n === 0 ? {Authorization:authorization} : {})}});
        if (![301,302,303,307,308].includes(response.status)) break;
        requireThat(kind === 'blobs' && n < 3, 'Unexpected registry redirect.');
        const next = new URL(response.headers.get('location'), url);
        requireThat(next.protocol === 'https:' && !next.username && !next.password && !next.hash
          && (!next.port || next.port === '443') && (next.hostname === 'ghcr.io' || next.hostname.endsWith('.githubusercontent.com')),
        'Unsafe blob redirect.');
        url = next.href;
      }
      requireThat(response.status === 200, `GHCR content unavailable (HTTP ${response.status}).`);
      const bytes = await bytesOf(response, maximum);
      requireThat(hash(bytes) === digest, 'GHCR content digest mismatch.');
      return bytes;
    },
    async mutate(selected, restore) {
      const method = restore ? 'PUT' : 'DELETE';
      const response = await send(`${base}/manifests/${selected.entry.digest}`, {
        method, headers:{Authorization:authorization, 'Content-Type':MANIFEST},
        ...(restore ? {body:Buffer.from(selected.raw.manifest, 'base64')} : {}),
      });
      // Retain only status and digest, never tokens, challenges or redirect URLs.
      observe({operation:method,status:response.status,digest:response.headers.get('docker-content-digest')});
      requireThat(response.status === (restore ? 201 : 202), `GHCR ${method} failed (HTTP ${response.status}).`);
      if (restore) requireThat(response.headers.get('docker-content-digest') === selected.entry.digest, 'Restored digest header mismatch.');
    },
  };
}

export async function imageWitness(client, image, run) {
  const manifestBytes = await client.get('manifests',image.split('@')[1],4 * 1024 * 1024);
  const manifest = JSON.parse(manifestBytes);
  requireThat(manifest.mediaType === MANIFEST && Array.isArray(manifest.layers) && manifest.layers.length > 0, 'Expected one OCI image manifest.');
  const configBytes = await client.get('blobs',manifest.config.digest,4 * 1024 * 1024);
  const config = JSON.parse(configBytes);
  requireThat(config.config?.Labels?.['tfm.lab.run'] === run.toLowerCase(), 'Image is not labelled for this fresh run.');
  for (const layer of manifest.layers) {
    requireThat(Number.isSafeInteger(layer.size) && layer.size > 0 && layer.size <= 128 * 1024 * 1024, 'Oversized image layer.');
    const bytes = await client.get('blobs',layer.digest,layer.size);
    requireThat(bytes.length === layer.size, 'Image layer size mismatch.');
  }
  return {manifest:manifestBytes.toString('base64'),config:configBytes.toString('base64'),layers:manifest.layers};
}

// Dependencies are injected only by unit tests; the CLI uses real retrieval and
// verifiers. This experiment makes no admission request and never reports F07 PASS.
export async function runProtocol({image, inventory, verify, witness, client, save, interrupted = () => false}) {
  let selected, before, originalImage, mutationAttempted = false, primaryError = null, restorationError = null;
  const checkSignal = () => requireThat(!interrupted(), 'Protocol probe interrupted.');
  try {
    checkSignal();
    before = await inventory(); save('before.json',before);
    selected = validateBackup(before,image);
    // Single-manifest DELETE cannot also edit a fallback referrers tag. Stop.
    requireThat(before.inventory.source === 'referrers-api', 'GHCR native referrers API is required; fallback tag mutation is out of scope.');
    await verify(before);
    originalImage = await witness(); save('image-before.json',originalImage);
    const rechecked = await inventory(); save('pre-delete.json',rechecked);
    checkAlteration(before,rechecked,image,true);
    checkSignal();
    mutationAttempted = true; // A lost response can still mean DELETE took effect.
    await client.mutate(selected,false);
    checkSignal();
    const negative = await inventory(); save('negative.json',negative);
    checkAlteration(before,negative,image);
    const negativeImage = await witness(); save('image-negative.json',negativeImage);
    requireThat(JSON.stringify(negativeImage) === JSON.stringify(originalImage), 'Image bytes changed during removal.');
  } catch (error) { primaryError = error.message; }
  finally {
    if (mutationAttempted) {
      try {
        // Do not issue new blobs or signatures. Recovery only restores the backed-up manifest.
        for (const [entry,encoded] of [[selected.manifest.config,selected.raw.config],[selected.manifest.layers[0],selected.raw.bundle]]) {
          const bytes = await client.get('blobs',entry.digest,entry.size);
          requireThat(bytes.equals(Buffer.from(encoded,'base64')), 'Restoration blob differs from backup.');
        }
        await client.mutate(selected,true);
        const restored = await inventory(); save('restored.json',restored);
        checkAlteration(before,restored,image,true);
        const restoredImage = await witness(); save('image-restored.json',restoredImage);
        requireThat(JSON.stringify(restoredImage) === JSON.stringify(originalImage), 'Restored image bytes differ.');
      } catch (error) { restorationError = error.message; }
    }
  }
  if (interrupted() && !primaryError) primaryError = 'Protocol probe interrupted.';
  const result = {status:primaryError || restorationError ? 'INTEGRATION_FAILURE' : 'PROTOCOL_ONLY_COMPLETE',
    hostedF07:'NOT_EXECUTED',image,mutationAttempted,primaryError,restorationError};
  save('recovery.json',result);
  if (primaryError || restorationError) throw new Error('GHCR protocol failed; inspect recovery.json for both errors.');
  return result;
}

function command(tool, args, output, errorOutput) {
  const out = openSync(output,'wx'), err = openSync(errorOutput,'wx');
  try {
    const result = spawnSync(tool,args,{stdio:['ignore',out,err],timeout:60000});
    requireThat(!result.error && result.status === 0, `${tool} verification failed; inspect retained output.`);
  } finally { closeSync(out); closeSync(err); }
}

async function main() {
  const [operation, receiptFile, statePath, outputPath] = process.argv.slice(2);
  const context = workflowContext(process.env);
  if (operation === 'arm') {
    requireThat(process.argv.length === 4, 'Usage: f07-ghcr-protocol.mjs arm RECEIPT');
    writeFileSync(receiptFile,JSON.stringify({context,started:Date.now()})+'\n',{flag:'wx',mode:0o600});
    return;
  }
  requireThat(operation === 'probe' && process.argv.length === 6 && process.env.GP_F07_PROTOCOL === 'authorized',
    'Usage after separate authorization: GP_F07_PROTOCOL=authorized f07-ghcr-protocol.mjs probe RECEIPT STATE NEW_OUTPUT');
  const stateDir = realpathSync(statePath), root = realpathSync(resolve(import.meta.dirname,'../..'));
  requireThat(resolve(statePath) === stateDir && resolve(stateDir,'..') === join(root,'evidence/raw'), 'Unsafe fixture directory.');
  const receipt = read(receiptFile), state = read(join(stateDir,'state.json')), result = read(join(stateDir,'result.json'));
  const image = assertFixture({context,receipt,state,result,run:basename(stateDir),expectedImage:process.env.GP_F07_IMAGE,
    stateCreated:statSync(join(stateDir,'state.json')).birthtimeMs});
  requireThat(process.env.GITHUB_ACTOR && process.env.GH_TOKEN, 'Use the current workflow token.');
  // One use per receipt. Never retry a mutation on a previous run automatically.
  writeFileSync(receiptFile+'.used',image+'\n',{flag:'wx'});
  mkdirSync(outputPath); const output = realpathSync(outputPath);
  const save = (name,value) => writeFileSync(join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  save('fixture.json',{context,receipt,image,run:basename(stateDir),scope:'protocol-only; hosted F07 NOT_EXECUTED'});
  let stop = false;
  const interrupt = () => { stop = true; };
  process.on('SIGINT',interrupt); process.on('SIGTERM',interrupt);
  try {
    let sequence = 0;
    const client = await registryClient({image,actor:process.env.GITHUB_ACTOR,token:process.env.GH_TOKEN,
      observe:value => save(`http-${++sequence}.json`,value)});
    const inventory = () => downloadBundleInventory({mode:'github',image,actor:process.env.GITHUB_ACTOR,token:process.env.GH_TOKEN});
    const verify = async snapshot => {
      for (const raw of snapshot.rawArtifacts) {
        const type = snapshot.inventory.artifacts.find(a => a.manifestDigest === raw.manifestDigest).predicateType;
        const prefix = join(output,raw.manifestDigest.slice(7));
        const text = Buffer.from(raw.bundle,'base64').toString();
        writeFileSync(prefix+'.bundle.json',text,{flag:'wx'});
        if (type === PROVENANCE) {
          command('gh',['attestation','verify','oci://'+image,'--bundle',prefix+'.bundle.json','--repo',context.repository,
            '--cert-identity',context.identity,'--source-digest',context.commit,'--source-ref',context.ref,
            '--deny-self-hosted-runners','--predicate-type',type,'--format','json'],prefix+'.verify.json',prefix+'.verify.log');
          const verified = read(prefix+'.verify.json');
          const contract = validateGithubVerificationResults(verified,
            {image:state.imageRepository,digest:state.digest,repository:state.sourceRepository,commit:context.commit,identity:context.identity,ref:context.ref});
          assertInvocation(verified[contract.matchedResult].verificationResult.signature.certificate,context);
          save(raw.manifestDigest.slice(7)+'.contract.json',contract);
        } else {
          command('cosign',['verify-blob-attestation','--trusted-root',join(stateDir,'sigstore-trusted-root.json'),
            '--certificate-identity',context.identity,'--certificate-oidc-issuer','https://token.actions.githubusercontent.com',
            '--bundle',prefix+'.bundle.json','--digest',state.digest.slice(7),'--digestAlg','sha256','--type',type],prefix+'.verify.txt',prefix+'.verify.log');
          save(raw.manifestDigest.slice(7)+'.statement.json',statementFromVerifiedBundle(text,state.digest,type,state.sourceRepository,context.commit));
        }
      }
    };
    const protocol = await runProtocol({image,inventory,verify,witness:() => imageWitness(client,image,basename(stateDir)),client,save,interrupted:() => stop});
    save('protocol-result.json',protocol);
  } catch (error) {
    save('failure.json',{status:'INTEGRATION_FAILURE',hostedF07:'NOT_EXECUTED',error:error.message});
    throw error;
  } finally { process.removeListener('SIGINT',interrupt); process.removeListener('SIGTERM',interrupt); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error('F07 GHCR protocol: '+error.message); process.exitCode = 1; });
}
