# Development environment and first check

[English documentation](README.md)

[Versión en español](../ES/environment.md).

## Design

The devcontainer provides Linux AMD64, Node, build tools and an internal Docker engine. kind creates Kubernetes on that engine. Docker-in-Docker separates laboratory containers from those managed directly by the host engine, but its privileged mode is not a security boundary against hostile code.

The first environment test uses an infrastructure probe independent of `quotes-node`. It checks installation without treating the probe as a corpus scenario or prematurely claiming security integration.

## Pinned versions and sources

| Component | Pinned reference | Rationale and source |
|---|---|---|
| Node / npm | 24.21.0 / 11.19.0 | LTS line and native tests without another framework. [Node release](https://nodejs.org/en/blog/release/v24.21.0), [bundled npm](https://github.com/nodejs/node/blob/v24.21.0/deps/npm/package.json). |
| Development base | `node:24.21.0-bookworm`, AMD64 manifest by SHA-256 | [Official Node image](https://hub.docker.com/_/node); full reference in [versions.env](../../versions.env). |
| Service runtime base | Node 24.21.0 / Alpine 3.23, AMD64 manifest by SHA-256 | Supported Alpine `main` branch recognized by Trivy 0.74.0's EOL metadata. Separate `SERVICE_NODE_IMAGE` in [versions.env](../../versions.env); see [service README](../../services/quotes-node/README.md) for the compatibility decision. |
| Docker Engine / CLI | 29.8.0 | [Official release](https://docs.docker.com/engine/release-notes/29/#2980); installed from Docker's Debian repository. |
| Docker-in-Docker feature | 4.1.0 with lockfile | [Official feature](https://github.com/devcontainers/features/tree/main/src/docker-in-docker). Tagged feature ID in JSON, resolved digest in lockfile; automatic Buildx/Compose disabled. |
| Buildx | 0.37.1 | [Official release](https://github.com/docker/buildx/releases/tag/v0.37.1), AMD64 download with pinned SHA-256. |
| kind | 0.33.0 | [Official release](https://github.com/kubernetes-sigs/kind/releases/tag/v0.33.0), pinned download SHA-256. |
| Kubernetes / kubectl | 1.35.8 | Node image published for kind 0.33.0. Matching client/server follow the [version-skew policy](https://kubernetes.io/releases/version-skew-policy/); actual integration remains a separate check. |
| Git, curl, jq, make, certificates, sudo | Debian packages | Resolved versions are retained as `os-packages.txt` by the environment test. |
| Security/integration tools | [tools.lock.json](../../tools.lock.json) | Trivy, Conftest, Cosign, Helm, Kyverno CLI, act and laboratory images have separate pinned references. Keep this file as the authoritative version list. |

The installer checks kind, kubectl and Buildx downloads against `versions.env`; additional tools use the lockfile. Node and kind images use digests. The feature key must use `docker-in-docker:4.1.0`, with its resolved integrity in `devcontainer-lock.json` beside each configuration. See the [lockfile specification](https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-lockfile.md). A pinned hash detects object changes; it does not by itself prove publisher security.

Debian/Docker transitive packages are not frozen through a historical repository. Major tools are pinned and effective packages recorded; this is not a bit-for-bit reproducibility claim. Preserve effective versions before the pilot.

## Resources and opening the environment

Configuration requests at least 2 CPUs, 8 GB RAM and 32 GB storage. These are initial resources for a small workload, subject to real execution. Images, layers and caches require additional space.

For local development, open `implementacion` in VS Code with Dev Containers and Docker configured for Linux containers, then **Dev Containers: Reopen in Container**. On Windows, the Docker Linux environment must already work. Node/kind/kubectl do not need global Windows installations.

For Codespaces, select **Golden Path - implementation** using root `.devcontainer/implementacion/devcontainer.json`, which builds from the implementation subdirectory. Both locations must exist on the same branch. The internal `implementacion/.devcontainer/devcontainer.json` is used when opening that directory directly; its display name is **Golden Path - initial environment**. Keep the configurations coherent: `make test-env` checks correspondence. See the [README commands](../../README.md#commands-and-expected-results).

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

- **OCI Feature id contains invalid characters:** the feature key must end with `docker-in-docker:4.1.0`; retain its digest in the lockfile, not the key. Update both configurations/locks before rebuilding.
- **BuildKit DNS timeout on kind:** see the [firewall diagnosis and recovery guide](kind-network-firewall.md) for the observed legacy/nft conflict, temporary rules and proposed Codespaces fix.
- **Docker unavailable:** check the host engine and then the internal Docker-in-Docker service.
- **Version mismatch:** rebuild after changing references; do not replace pins with `latest`.
- **Download/checksum failure:** check network, proxy and official release. Installation stops on mismatch.
- **Node timeout/resource shortage:** inspect logs, memory and disk; this is an infrastructure incident.
- **ARM platform:** the base requires AMD64; ARM is optional future work.

The integrated base now contains the service, Conftest, Trivy, Cosign, Kyverno, act and zot configuration. The [initial plan](implementation-plan.md) explains their incremental introduction; file availability does not prove their integration passed. Use the [complete execution guide](cases/L01-F13/runbook.md) to exercise lane A and actual GitHub lane B. `act` does not establish hosted OIDC behavior.

## Reproducible lane A validation

[Run both independent suites](lane-a-validation.md) through the pinned devcontainer, with prerequisite stopping, the bounded BuildKit probe and separate frozen-database artifacts. This remains functional integration, with human acceptance pending.
