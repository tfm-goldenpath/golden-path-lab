# Security toolchain refresh — 28 October 2026

Base: `4e73bf2171f2f4dde35d7bb5b6edaba52537fa18`, fetched current main after
PR #63. Branch: `chore/security-toolchain-refresh`. OpenAI Codex assisted
implementation, source inspection and execution; human review and final decision
remain pending. No merge, release, campaign or Pages publication is authorized.
The two pre-existing untracked root npm files are preserved in the named stash
`preserve pre-existing root npm files before security-toolchain-refresh`.

## Selection and publisher verification

Official releases and repository security advisories were consulted on 28 October.
The selected versions are candidates for the integration results below, not a
claim that the tools or delivered image have no vulnerabilities.

| Component | Previous | Candidate / selected | Official source, compatibility and reason | Required checks |
| --- | --- | --- | --- | --- |
| Trivy | 0.74.0 | 0.76.1 / 0.76.1 | [Release](https://github.com/aquasecurity/trivy/releases/tag/v0.76.1): Go/CA mitigation and scanner fixes; retain CycloneDX 1.7 and DB schema 2 | Actual inventory + separate vulnerability scan, full schema, digest association, EOL, F03/F04/L02 |
| Conftest | 0.70.1 | 0.71.1 / 0.71.1 | [Release](https://github.com/open-policy-agent/conftest/releases/tag/v0.71.1): embedded OPA 1.21.1; retain existing Rego and namespaces | Positive/negative policy decisions, YAML parsers, JSON receipts and evaluator errors |
| Cosign | 3.1.3 | 3.1.4 / 3.1.4 | [Release](https://github.com/sigstore/cosign/releases/tag/v3.1.4): verification/referrer fixes, Go 1.27.3; retain v0.3 bundles and independent image predicate | Offline cryptography, real local registry/admission, separately authorized hosted OIDC/native provenance |
| Kyverno CLI/controllers | 1.19.1 | 1.19.2 / 1.19.2 | [Release/advisories](https://github.com/kyverno/kyverno/releases/tag/v1.19.2): image-verification and other security fixes; supported Kubernetes 1.33–1.35 | CLI policy suite, actual admission, exact image digests/signatures, CREATE/UPDATE/Pod and recovery |
| Kyverno chart | 3.9.1 | 3.9.2 / 3.9.2 | [Publisher index](https://kyverno.github.io/kyverno/index.yaml), appVersion v1.19.2 | Render both lanes, inspect CRDs/dependencies/images/hooks/RBAC/resources and real installation |
| Helm | 4.3.0 | 4.3.1 / 4.3.1 | [Release](https://github.com/helm/helm/releases/tag/v4.3.1): same-minor CRD establishment fix | GPG/checksum, chart rendering and actual install/wait |
| act | 0.2.89 | retained | [Release](https://github.com/nektos/act/releases/tag/v0.2.89); no changed act adapter; not an OIDC substitute | Effective version and existing workflow checks; no additional act laboratory |
| zot | 2.1.21 | retained | [Release](https://github.com/project-zot/zot/releases/tag/v2.1.21); existing OCI registry pin | Real publication/referrers/retrieval and controlled restoration |
| BuildKit | locked SHA-256 | retained | [Publisher](https://hub.docker.com/r/moby/buildkit); unchanged engine digest in lock | Actual Buildx publication and replacement |

Node/npm, Docker/Buildx, kind/Kubernetes, Codex, service base and all three
4 CPU / 16 GB / 32 GB profiles keep PR #63's pins. General Actions updates are
separate. No fixture hashes, oracle expectations, thresholds, filters or trust
exceptions were changed.

Each new binary/archive was compared with the publisher checksum file and, for
GitHub-hosted assets, the release API asset digest. Exact URLs, SHA-256 and
verification identities are in `implementacion/tools.lock.json`. The unchanged
installer still rejects a mismatch before installing. Additional verification:

- Trivy and Kyverno CLI: `cosign verify-blob`, exact tagged release workflow
  identity, GitHub issuer, authenticated certificate/transparency verification.
- Cosign: `verify-blob`, publisher identity
  `keyless@projectsigstore.iam.gserviceaccount.com`, Google issuer. Bootstrap
  verifier 3.1.3 was downloaded against the pre-existing committed hash.
- Conftest: `gh attestation verify`, exact tagged `release.yaml` identity and
  repository; real GitHub provenance returned successfully.
- Helm: detached GPG signature with fingerprint
  `208DD36ED5BB3745A16743A4C7C6FBB5B91C1155`, independently named by the release;
  key from the release-linked Keybase account. An initial agent-start error during
  public-key import was retained; verification with `--no-autostart` succeeded.
  GPG's local web-of-trust warning is retained, not suppressed.
- All seven Kyverno images: resolved manifest bytes/digests and successful Cosign
  verification with exact tagged release workflow identity, GitHub issuer and
  publisher signature repository `ghcr.io/kyverno/signatures`.
- Chart: SHA-256 compared with the publisher index; no detached chart signature
  is claimed. Dependencies are vendored in the verified chart archive.

Public verification outputs and official metadata are retained under ignored
`implementacion/evidence/environment/security-toolchain-refresh/`. No private
signing keys or credentials are included in this record.

## Adapter and chart review

`lab_kyverno_values` is a function-only extraction in the existing laboratory
module, shared by installation and the real chart checks. It uses the chart's
`features.registryClient.allowInsecure` value: true only locally, false hosted,
without duplicate contradictory arguments. The test-hook readiness-checker now
has a matching version and digest. The reports server is explicitly disabled.
The version checker now reports the resolved executable path, with a regression
for an old shadowing binary. No evidence format, policy meaning or classifier
has been broadened.

Both lanes render 43 objects: 22 CRDs, one admission Deployment, its init
container, one test-hook Pod, two Services, two ConfigMaps, one ServiceAccount,
ten ClusterRoles, two ClusterRoleBindings, one Role and one RoleBinding.
No install/upgrade cleanup/migration Jobs or auxiliary controller Deployments
render. The sole Helm test hook is pinned and is not invoked automatically.
Vendored dependencies: grafana/crds 3.9.2, kyverno-api 0.0.1-alpha.4,
openreports 0.1.0 and reports-server 0.1.6, subject to their chart conditions.
The base chart 3.9.1 was also checksum-checked/rendered: it has the same object
count and already enabled `generateValidatingAdmissionPolicy`; no CEL policy is
introduced here. Generated laboratory policies remain ClusterPolicy, Enforce/Fail,
with the restricted actor and protected namespace unchanged. Runtime webhooks
are created by Kyverno and must be inspected in the actual execution.

Admission resources retain chart defaults: request 100m CPU / 128Mi, limit 384Mi
memory (no CPU limit); init and test hook request 10m / 64Mi and limit 100m / 256Mi.
Cache verification remains explicitly disabled. The new upstream verifier still
limits referrers to 50 and decompressed payloads to 10,000,000 bytes, matching the
strict local inventory limits; no limit was raised. See pinned
[sigstore verifier](https://github.com/kyverno/kyverno/blob/v1.19.2/pkg/image/verifiers/cpol/cosign/sigstore.go)
and [payload bound](https://github.com/kyverno/kyverno/blob/v1.19.2/pkg/image/verifiers/limits.go).

Trivy's new [Alpine EOL map](https://github.com/aquasecurity/trivy/blob/v0.76.1/pkg/detector/ospkg/alpine/alpine.go)
includes 3.24, resolving the previously observed missing-version metadata.
The service remains on Alpine 3.23; this source inspection is not a service
migration or an actual scan of an Alpine 3.24 service image.

## Installation, environment and verification

The supplied Codespace has 4 CPUs, about 16 GiB RAM and a 32 GiB workspace/Docker
filesystem. Initial free disk was about 15 GiB. `/tmp` is a separate real disk
filesystem; tmpfs is not counted as additional capacity. No Docker containers,
images or build cache were initially present; three inactive volumes (471.2 MB)
were left untouched.

Despite the machine profile, the running container was Ubuntu 24.04 with older
Node/npm and Docker/Buildx, kubectl 1.37.1 and missing security tools/kind.
The initial doctor failure is retained. No version guard was relaxed. Security
and platform tools were clean-installed into `.tools` using the shared installer.
Docker Engine/CLI were installed at PR #63's exact 29.9.2 using Docker's signed
APT repository, then the sole idle daemon was restarted. The held-package refusal
and explicit exact-version retry are retained. Node/npm were copied from the
successfully built pinned devcontainer image into the local tool prefix.

The shared Dockerfile passed a clean build, including checksummed installation,
signed Debian snapshot packages and optional Codex's non-root version/help checks.
A subsequent cached build incorporated final lock metadata/readiness pin. Running
that image as `node`, without network, confirmed byte-identical embedded/current
lockfiles and actual security binaries from `/usr/local/bin`; Node/npm are
24.22.1/11.19.1 and optional Codex remains 0.164.0. This is a real Dockerfile build,
not a Codespaces UI Full Rebuild or a second nested Docker laboratory.

`setup-validation`, focused version/value regressions and `doctor` pass with
`.tools/bin` first in PATH. `make test` passed environment, 1,000 service/unit, 47 Python policy, 62 Conftest
and 16 Kyverno-engine checks, then stopped at the obsolete literal Cosign 3.1.3
version assertion before cryptography. The probe now reads the exact committed
Cosign pin. Continuing with `test-bundles test-workflows test-defense test-release`
passed the real offline cryptography and remaining shared targets. No previously
successful target was repeated. The original and continuation logs are retained;
these new tests are regressions, not a reconstructed TDD history. Real Conftest
probes separately preserve nonzero malformed-YAML, rule-load and strict builtin
evaluation errors. Existing receipt tests reject empty/malformed evaluation.
The chart was rendered from the production function in both lanes. Real delivery
integrations remain **NOT_YET_VERIFIED** until recorded below.

## Real integrations and retained artifacts

Candidate source, DB identity, execution IDs, package hashes, per-boundary
results and capacity/cleanup will be recorded here after execution. No historical
run or green aggregate substitutes for those observations. L05 needs its own
revision pair and is not part of normal demo; shared L01/L03/L04/L06 observations
are not independent samples. Vulnerability oracles remain unchanged.

Hosted validation is **NOT_EXECUTED**, pending explicit authorization for
`golden-path.yml` on the published candidate branch/SHA. It publishes initial and
replacement images and attestations to GHCR. Local signatures and act do not
validate GitHub OIDC, issuer/certificate/transparency or native provenance.
Unsupported hosted negatives remain NOT_EXECUTED. The PR stays draft while any
required integration remains unresolved.

## Next increment

Prioritize `refactor/kyverno-cel-policies`: migrate the renderer and verification
to supported ValidatingPolicy/ImageValidatingPolicy APIs, with explicit policy
equivalence, independent tests and real positive/negative admission. On 28 October,
the [official support matrix](https://kyverno.io/docs/installation/releases/)
supports 1.19 on Kubernetes 1.33–1.35 until the 1.20 release; the
[API schedule](https://kyverno.io/docs/policy-types/overview/) marks legacy APIs deprecated
in 1.19 and removal in 1.20, estimated November 2026. This estimate is not a
support guarantee. Retaining the patched 1.19 line is a bounded compatibility
step, not a permanent solution. General Actions refresh remains another branch.
