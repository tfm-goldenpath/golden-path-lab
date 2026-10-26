# Development environment and first check

[English documentation](README.md)

[Versión en español](../ES/environment.md).

## Design

The devcontainer provides Linux AMD64, Node, build tools and an internal Docker engine. kind creates Kubernetes on that engine. Docker-in-Docker separates laboratory containers from those managed directly by the host engine, but its privileged mode is not a security boundary against hostile code.

The first environment test uses an infrastructure probe independent of `quotes-node`. It checks installation without treating the probe as a corpus scenario or prematurely claiming security integration.

## Pinned versions and sources

| Component | Pinned reference | Rationale and source |
|---|---|---|
| Node / npm | 24.22.1 / 11.19.1 | LTS line and native tests without another framework. [Node release](https://nodejs.org/en/blog/release/v24.22.1), [bundled npm](https://github.com/nodejs/node/blob/v24.22.1/deps/npm/package.json). |
| Development base | `node:24.22.1-bookworm`, AMD64 manifest by SHA-256 | [Official Node image](https://hub.docker.com/_/node); full reference in [versions.env](../../versions.env). |
| Service runtime base | Node 24.22.1 / Alpine 3.23, AMD64 manifest by SHA-256 | Supported Alpine `main` branch recognized by Trivy 0.74.0's EOL metadata. Separate `SERVICE_NODE_IMAGE` in [versions.env](../../versions.env); see [service README](../../services/quotes-node/README.md) for the compatibility decision. |
| Docker Engine / CLI | 29.9.2 | [Official release](https://docs.docker.com/engine/release-notes/29/#2992); installed from Docker's Debian repository. |
| Docker-in-Docker feature | 4.1.3 with lockfile | [Official feature](https://github.com/devcontainers/features/tree/main/src/docker-in-docker). Tagged feature ID in JSON, resolved digest in lockfile; automatic Buildx/Compose disabled. |
| Buildx | 0.38.1 | [Official release](https://github.com/docker/buildx/releases/tag/v0.38.1), AMD64 download with pinned SHA-256. |
| kind | 0.33.0 | [Official release](https://github.com/kubernetes-sigs/kind/releases/tag/v0.33.0), pinned download SHA-256. |
| Kubernetes / kubectl | 1.35.8 | Node image published for kind 0.33.0. Matching client/server follow the [version-skew policy](https://kubernetes.io/releases/version-skew-policy/); actual integration remains a separate check. |
| Git, curl, jq, make, certificates, sudo | Debian packages | Resolved versions are retained as `os-packages.txt` by the environment test. |
| Security/integration tools | [tools.lock.json](../../tools.lock.json) | Trivy, Conftest, Cosign, Helm, Kyverno CLI, act and laboratory images have separate pinned references. Keep this file as the authoritative version list. |

The installer checks kind, kubectl and Buildx downloads against `versions.env`; additional tools use the lockfile. Node and kind images use digests. The feature key must use `docker-in-docker:4.1.3`, with its resolved integrity in `devcontainer-lock.json` beside each configuration. See the [lockfile specification](https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-lockfile.md). A pinned hash detects object changes; it does not by itself prove publisher security.

Debian build packages come from the signed Debian and Debian-security snapshots dated `20261025T000000Z` in `.devcontainer/debian.sources`. `Check-Valid-Until: no` allows a dated archive; signature verification remains enabled through the Debian archive keyring. The Docker feature uses Docker’s signed Debian repository, with an explicit Engine/CLI version; its transitive packages are not all frozen. Record `dpkg-query -W` after building; this is not a bit-for-bit reproducibility claim.

## Resources and opening the environment

Configuration requests at least 4 CPUs, 16 GB RAM and 32 GB storage. These are initial resources for a small workload, subject to real execution. Images, layers and caches require additional space.

For local development, open `implementacion` in VS Code with Dev Containers and Docker configured for Linux containers, then **Dev Containers: Reopen in Container**. On Windows, the Docker Linux environment must already work. Node/kind/kubectl do not need global Windows installations.

For Codespaces, select **Golden Path - implementation** using root `.devcontainer/implementacion/devcontainer.json`, which builds from the implementation subdirectory. All three profiles, including **Golden Path - F11 defense**, share the installer and resource minimums. Both locations must exist on the same branch. The internal `implementacion/.devcontainer/devcontainer.json` is used when opening that directory directly; its display name is **Golden Path - initial environment**. Keep the configurations coherent: `make test-env` checks correspondence. See the [README commands](../../README.md#commands-and-expected-results).

Codespaces needs access to official registries/downloads. Student benefits depend on eligibility and available quota; check [billing and usage](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces), stop unused spaces and review retained storage. Unlimited free capacity is not assumed.

## Commands

| Command | Check | Effects |
|---|---|---|
| `make test-env` | Reference consistency and probe behavior | No Docker/Kubernetes use. |
| `bash scripts/check-environment.sh --tools-only` | Pinned versions and file checks | Runs at devcontainer creation. |
| `make doctor` | Tools, versions and Docker engine | Does not create a cluster. |
| `make smoke-env` | Image build, Docker execution and Kubernetes execution | Creates temporary resources and preserves local evidence. |

The full smoke test requires explicit invocation. It uses unique names, its own kubeconfig and `tfm-environment` namespace in a temporary cluster. It does not select or modify the normal Kubernetes context. `kind load docker-image` loads the image directly and the Job uses `imagePullPolicy: Never`; no registry publication is needed.

## Acceptance criteria

Expected final result: `PASS`, when all of the following hold:

1. Main tools match pinned versions and Docker responds on Linux AMD64.
2. The image builds and its build-time Node test passes.
3. The container produces the expected probe output/runtime/platform.
4. The kind node reaches `Ready` with the chosen Kubernetes version.
5. ConfigMap creation/update preserve expected values.
6. The Job completes and produces the same probe output.

Timeouts are diagnostic operational limits, not temporal acceptance thresholds for the campaign. This probe does not evaluate admission policies, signatures, SBOMs, vulnerabilities or provenance. It uses a temporary image tag; the Golden Path implements digest-based delivery separately.

## Evidence and cleanup

Each attempt retains `result.json`, `run.log`, `versions.env`, engine/package versions, image inspection and Docker/Kubernetes outputs under `evidence/environment/run-*`, ignored by Git. On cluster failure, kind diagnostics are exported where possible.

Docker image IDs and Kubernetes `imageID` values are recorded as reported; they may name different objects and are not asserted to prove delivery-digest equality.

Cleanup removes the temporary cluster and probe tag while retaining base images/caches. If cluster deletion fails, the result is `FAIL` and the kubeconfig is kept for diagnostics. No global Docker cleanup is performed. Review logs before sharing; no additional custody service is introduced.

## Troubleshooting and subsequent integration

- **OCI Feature id contains invalid characters:** the feature key must end with `docker-in-docker:4.1.3`; retain its digest in the lockfile, not the key. Update all three configurations/locks before rebuilding.
- **BuildKit DNS timeout on kind:** see the [firewall diagnosis and recovery guide](kind-network-firewall.md) for the observed legacy/nft conflict, temporary rules and proposed Codespaces fix.
- **Docker unavailable:** check the host engine and then the internal Docker-in-Docker service.
- **Version mismatch:** rebuild after changing references; do not replace pins with `latest`.
- **Download/checksum failure:** check network, proxy and official release. Installation stops on mismatch.
- **Node timeout/resource shortage:** inspect logs, memory and disk; this is an infrastructure incident.
- **ARM platform:** the base requires AMD64; ARM is optional future work.

The integrated base now contains the service, Conftest, Trivy, Cosign, Kyverno, act and zot configuration. The [initial plan](implementation-plan.md) explains their incremental introduction; file availability does not prove their integration passed. Use the [complete execution guide](cases/L01-F13/runbook.md) to exercise lane A and actual GitHub lane B. `act` does not establish hosted OIDC behavior.

## Reproducible lane A validation

[Run both independent suites](lane-a-validation.md) through the pinned devcontainer, with prerequisite stopping, the bounded BuildKit probe and separate frozen-database artifacts. This remains functional integration, with human acceptance pending.

## Clean Codespace and optional Codex

On GitHub use **Code → Codespaces → … → New with options**, choose the reviewed
branch, **Golden Path - implementation**, and a machine with **4 cores / 16 GB RAM /
at least 32 GB storage**. Do not restore old evidence, measurements, demo sessions,
databases or caches to validate a clean environment. `hostRequirements` declares
[minimums](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/configuring-dev-containers/setting-a-minimum-specification-for-codespace-machines);
it neither resizes an existing machine nor caps consumption. Select the actual
machine in Codespaces. 32 GB total is not 32 GB free.

A new Codespace has separate storage. **Codespaces: Full Rebuild Container**
recreates the development container without build cache, but retains the existing
workspace; it does not make a clean Codespace or resize the machine. Before a
rebuild, commit/push the branch and record the SHA and completed/pending checks.
See [GitHub’s rebuild guide](https://docs.github.com/en/codespaces/developing-in-a-codespace/rebuilding-the-container-in-a-codespace).
After reopening, verify the actual versions and resources:

```bash
nproc
free -h
df -h
df -i
docker_root=$(docker info --format '{{.DockerRootDir}}')
df -h "$docker_root"
df -i "$docker_root"
docker system df
make -C implementacion setup-validation
make -C implementacion doctor
codex --version
codex --help
```

Do not add free space from paths on the same filesystem. Run builds, smoke tests
and integrations sequentially, with at most one Kubernetes laboratory. Delivery
retains its 3 GiB operational reserve and planned growth checks (including 5 GiB
for Docker before infrastructure). Stop on insufficient capacity; do not lower
these protections. The creation hook only installs the validation dependencies
and checks tools; repeated invocation is safe. It does not start Kubernetes,
download vulnerability databases or invoke an assistant.

The common image installs the official **Codex CLI 0.164.0**, independently locked
under `.devcontainer/codex/`, including the Linux AMD64 native dependency. It is
available on PATH to `node`; `--version` and `--help` need no login. Codex is optional:
`doctor`, CI and delivery never require its executable, account or model access.
The **openai.chatgpt** VS Code extension is a separate editor client, declared by
identifier in all three profiles. The identifier is verified through the
[official IDE documentation](https://learn.chatgpt.com/docs/codex/ide); this does
not reproducibly pin an extension version. No external CLI override is configured.

Authentication is the user’s choice. Follow the [official CLI instructions](https://learn.chatgpt.com/docs/codex/cli)
and [remote authentication guide](https://learn.chatgpt.com/docs/auth): use `codex login`
for browser sign-in, or `codex login --device-auth` in a remote terminal if device
code login is enabled for the account/workspace. Complete the one-time browser
flow privately. This branch does not enable organization permissions, change
sandbox/approval settings or overwrite personal configuration. Keep credentials,
`auth.json`, keys and sessions out of images, Git, logs and validation packages.
No authentication or model request is part of environment validation.

From a committed candidate with clean selected delivery inputs, run:

```bash
make -C implementacion test-env
make -C implementacion test
make -C implementacion smoke-env
# Confirm smoke cleanup before starting the next integration.
make -C implementacion deliver
```

The [legitimate delivery guide](../../../docs/EN/legitimate-delivery.md) defines
acceptance and packaging. Smoke loads an image directly into kind; it cannot
replace registry/DNS/BuildKit, signing, admission, rollout and HTTP validation.
For retrying cleanup of a known finished delivery, use its absolute directory:

```bash
bash implementacion/scripts/deliver.sh cleanup "$PWD/implementacion/evidence/raw/delivery-RUN_ID"
```

Inspect `state.json`, immutable resource receipts and process/session ownership
before cleanup. For other laboratory profiles use their own documented cleanup
command. Then inventory exact paths (`du -xh --max-depth=2 implementacion/evidence
implementacion/.tmp`) and Docker (`docker system df`, `docker ps -a`, `docker volume ls`).
Discard only identified completed development runs or regenerable caches after
checking absolute paths, symlinks and active users. Ignored files are not inherently
disposable. Preserve unpublished work, credentials and tracked files; separately
resolve unique historical archives or unknown data. Never use blanket clean/prune
commands or delete remote assets as local maintenance.

For the next PR retain the code SHA, machine/profile/image identity, tool versions,
commands and outcomes, unresolved diagnostics, service digest, database identity,
final package checksum and cleanup receipts. Keep only the relevant final package
outside Git and a compact review record. State which intermediate originals were
discarded; a new validation never replaces historical observations. See the
[current refresh record](../../../docs/EN/maintainers/devcontainer-refresh-validation.md).
