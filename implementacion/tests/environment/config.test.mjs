import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const versions = Object.fromEntries(read('versions.env').split(/\r?\n/)
  .filter(line => line && !line.startsWith('#')).map(line => {
    const split = line.indexOf('=');
    return [line.slice(0, split), line.slice(split + 1)];
  }));

test('Debian build dependencies use dated signed snapshot repositories', () => {
  const sources = read('.devcontainer/debian.sources');
  assert.match(sources, /archive\/debian\/20260921T000000Z\//);
  assert.match(sources, /archive\/debian-security\/20260921T000000Z\//);
  assert.equal((sources.match(/Signed-By: \/usr\/share\/keyrings\/debian-archive-keyring.gpg/g) || []).length, 2);
  assert.ok(!sources.includes('trusted=yes'));
  assert.match(read('.devcontainer/Dockerfile'), /COPY .devcontainer\/debian.sources \/etc\/apt\/sources.list.d\/debian.sources/);
});

test('every devcontainer COPY source is explicitly included in the restricted build context', () => {
  const rules = read('.dockerignore').split(/\r?\n/).filter(line => line && !line.startsWith('#'));
  assert.equal(rules[0], '**');
  assert.ok(rules.slice(1).every(rule => rule.startsWith('!')), 'The context uses only explicit exceptions after its deny-all rule');
  const sources = [...read('.devcontainer/Dockerfile').matchAll(/^COPY\s+(\S+)\s+/gm)].map(match => match[1]);
  assert.ok(sources.includes('.devcontainer/debian.sources'));
  for (const source of sources) {
    assert.ok(existsSync(new URL(source, root)), `Missing COPY source: ${source}`);
    assert.ok(rules.includes(`!${source}`), `COPY source excluded by .dockerignore: ${source}`);
  }
});

test('build references and checks use the same pinned versions', () => {
  const config = JSON.parse(read('.devcontainer/devcontainer.json'));
  assert.ok(read('.devcontainer/Dockerfile').startsWith(`FROM ${versions.NODE_IMAGE}\n`));
  const [[feature, options]] = Object.entries(config.features);
  assert.equal(feature, 'ghcr.io/devcontainers/features/docker-in-docker:4.1.0');
  assert.match(feature, /^[a-zA-Z0-9_/:.-]*$/);
  const lock = JSON.parse(read('.devcontainer/devcontainer-lock.json'));
  assert.equal(lock.features[feature].version, '4.1.0');
  assert.match(lock.features[feature].integrity, /^sha256:[a-f0-9]{64}$/);
  assert.equal(lock.features[feature].resolved, `${feature.slice(0, feature.lastIndexOf(':'))}@${lock.features[feature].integrity}`);
  assert.equal(options.version, versions.DOCKER_VERSION);
  assert.equal(options.installDockerBuildx, false);
  assert.equal(options.dockerDashComposeVersion, 'none');
  for (const key of ['NODE_IMAGE', 'SERVICE_NODE_IMAGE', 'KIND_NODE_IMAGE']) assert.match(versions[key], /@sha256:[a-f0-9]{64}$/);
  assert.ok(versions.SERVICE_NODE_IMAGE.startsWith(`node:${versions.NODE_VERSION}-`));
  assert.equal(read('services/quotes-node/Dockerfile').split(/\r?\n/)[0], `ARG NODE_IMAGE=${versions.SERVICE_NODE_IMAGE}`);
  for (const key of ['KIND_SHA256', 'KUBECTL_SHA256', 'BUILDX_SHA256']) assert.match(versions[key], /^[a-f0-9]{64}$/);
  assert.match(versions.KIND_NODE_IMAGE, new RegExp(`^kindest/node:v${versions.KUBERNETES_VERSION.replaceAll('.', '\\.')}@`));
  assert.equal(config.remoteUser, 'node');
  assert.equal(config.postCreateCommand, 'bash scripts/check-environment.sh --tools-only');
});

const codespacesConfigUrl = new URL('../.devcontainer/implementacion/devcontainer.json', root);
test('hosted attestation authenticates in the default Docker config and always logs out', () => {
  const workflow = read('../.github/workflows/golden-path.yml');
  const steps = workflow.split(/^      - name: /m).slice(1);
  const prepare = steps.findIndex(step => step.startsWith('Build and prepare the delivery\n'));
  const login = steps.findIndex(step => step.startsWith('Authenticate GHCR for attestation\n'));
  const attest = steps.findIndex(step => step.startsWith('Generate build provenance\n'));
  const attestUpdate = steps.findIndex(step => step.startsWith('Generate replacement image provenance\n'));
  const logout = steps.findIndex(step => step.startsWith('Remove attestation registry credentials\n'));
  const finish = steps.findIndex(step => step.startsWith('Verify evidence, F13, F11 and L01 image replacement\n'));
  assert.ok(prepare >= 0 && login === prepare + 1 && attest === login + 1 && attestUpdate === attest + 1 && logout === attestUpdate + 1 && finish === logout + 1);
  assert.ok(steps[login].includes('GH_TOKEN: ${{ github.token }}'));
  assert.ok(steps[login].includes(`printf '%s' "$GH_TOKEN" |`));
  assert.ok(steps[login].includes('docker --config "$HOME/.docker" login ghcr.io'));
  assert.ok(steps[login].includes('--username "$GITHUB_ACTOR" --password-stdin'));
  for (const index of [attest, attestUpdate]) {
    assert.ok(!steps[index].includes('DOCKER_CONFIG:'));
    assert.ok(steps[index].includes('push-to-registry: true'));
  }
  assert.ok(steps[attest].includes('subject-digest: ${{ steps.prepare.outputs.digest }}'));
  assert.ok(steps[attestUpdate].includes('subject-digest: ${{ steps.prepare.outputs.update_digest }}'));
  assert.ok(steps[logout].includes('if: ${{ always() }}'));
  assert.ok(steps[logout].includes('docker --config "$HOME/.docker" logout ghcr.io'));
  assert.ok(read('scripts/lib/context.sh').includes('export DOCKER_CONFIG="$private/docker"'));
});

test('Codespaces reuses the build and versions from implementacion', {
  skip: !existsSync(codespacesConfigUrl) && process.env.CODESPACES !== 'true',
}, () => {
  const local = JSON.parse(read('.devcontainer/devcontainer.json'));
  const configUrl = codespacesConfigUrl;
  const hosted = JSON.parse(readFileSync(configUrl, 'utf8'));
  const base = dirname(fileURLToPath(configUrl));
  assert.equal(resolve(base, hosted.build.context), fileURLToPath(root).replace(/[\\/]$/, ''));
  assert.equal(resolve(base, hosted.build.dockerfile), fileURLToPath(new URL('.devcontainer/Dockerfile', root)));
  assert.deepEqual(hosted.features, local.features);
  const hostedLock = JSON.parse(readFileSync(new URL('devcontainer-lock.json', configUrl), 'utf8'));
  assert.deepEqual(hostedLock, JSON.parse(read('.devcontainer/devcontainer-lock.json')));
  assert.deepEqual(hosted.hostRequirements, local.hostRequirements);
  assert.equal(hosted.remoteUser, local.remoteUser);
  assert.equal(hosted.postCreateCommand, 'bash implementacion/scripts/check-environment.sh --tools-only');
});
