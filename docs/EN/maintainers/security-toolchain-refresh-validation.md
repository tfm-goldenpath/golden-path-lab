# Security toolchain refresh — 28 October 2026

Base: `4e73bf2171f2f4dde35d7bb5b6edaba52537fa18`, fetched current main after
PR #63. Branch: `chore/security-toolchain-refresh`. OpenAI Codex assisted
implementation, source inspection and execution; human review and final decision
remain pending. No merge, release, campaign or Pages publication is authorized.
The two pre-existing untracked root npm files were preserved in the named stash
`preserve pre-existing root npm files before security-toolchain-refresh`; they are
restored after clean-source validation and excluded from this change.

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
were inspected during the demo: workload validation uses `failurePolicy: Fail`
for CREATE/UPDATE of Deployments, Pods and ephemeralcontainers. The additional
generation-label protection also fails closed. The sole observed Ignore webhook
monitors UPDATE of coordination Leases, not workload enforcement. Namespace
exclusions remain kube-system/kyverno; the policies protect tfm-golden. The ready
admission Pod ran the pinned 1.19.2 digest. Raw webhook/controller JSON is retained.

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
The chart was rendered from the production function in both lanes. The real local
integrations below passed, followed by the explicitly authorized hosted execution
recorded below. Compatibility claims are limited to those observed boundaries.

## Real integrations and retained artifacts

All three successful local commands tested committed source
`041f391dea5346076cdcc9d1ad2eb35bfc5a4c57` with clean coordinator inputs and
`GP_SOURCE_REPOSITORY=https://github.com/tfm-goldenpath/golden-path-lab`.
Commit `a1ec5debd804101af3e8b3c1d46e3af9608ff2a9` adds only this maintenance
record and TODO and is the hosted source below. Later follow-up changes update
only documentation, not code, policies, tool pins or fixtures; they are not
claimed as additional delivery executions.

A fresh real DB came from `ghcr.io/aquasecurity/trivy-db:2` through Trivy's
`--download-db-only`. `GP_VULNERABILITY_DB` selected the same frozen bytes for
all three suites. DB schema is 2; UpdatedAt `2026-10-28T13:01:10.618103814Z`,
DownloadedAt `2026-10-28T14:02:48.107452921Z`, NextUpdate
`2026-10-29T13:01:10.618103614Z`. The canonical retained directory is
`implementacion/.tmp/security-refresh-db` (1,640,521,881 bytes):

- `trivy.db`: `faa015429c6ebd9c9a672be99cfbd5aecec2eade21d1d6e59d4dc091dc752ff3`.
- `metadata.json`: `75ccefb55d36ea911801b1cdb555f4d022f0fc8a813e061b0d491fe9752dc706`.

| Command / run | Observed result and boundary | Package SHA-256 / verified inner files |
| --- | --- | --- |
| Initial deliver `delivery-6iEXPup3` | ERROR before infrastructure: isolated DOCKER_CONFIG resolved old Buildx 0.37.1; preserved finalization exit 1, packaging 0 | `a7d4ac95ae727ebdb5de35bc2aad46efcaa7dba0ca0a7b5606377881017db4c1` / 8 |
| deliver `delivery-Juza7mF4` | PASS, native finalization exit 0, packaging 0, cleanup 0; all delivery-v1 stages | `23566bf2f094a6037a477ff5dea66d197d13645cc7aad44abbf1b665fc6e9608` / 160 |
| demo `run-hRUtsdlZ` | PASS, process exit 0; implemented negative/positive boundaries below | `6454b54b6aaa08f1dabad6e0572d6ea4b63bb931ab09a09a64e5e961ca253d63` / 1,715 |
| vulnerabilities `run-q3FVez06` | PASS, process exit 0; F03/F04/L02 below | `e04ef5d4279c1748a565540c4edf72778616b640b6b72d0b6f772765bc0ab758` / 347 |

Archives and sidecar hashes remain under `implementacion/evidence/packages/`,
original results under `implementacion/evidence/raw/<run>/`; independent audit
receipts and command logs are in the environment directory named above. Outer
hashes and every inner SHA256SUMS entry were verified, including safe unique
archive members. P03 emits `finalization.json` and it was inspected. The ordinary
`demo.sh` coordinator used by demo/vulnerabilities does **not** emit that file:
for those runs the retained evidence is the original result, actual process exit,
verified archive and post-cleanup inventory. No synthetic native finalization is
claimed and no duplicate lane-a-validation suite was run.

The first P03 failure exposed a real environment shadowing issue: an isolated
DOCKER_CONFIG hid the user-level Buildx plugin although doctor in the normal
shell passed. Installing the already verified, unchanged 0.38.1 pin in the
system plugin directory fixed both contexts. The retry used the same source and
DB; the failed attempt remains archived.

P03 exercised build/registry, separate inventory and vulnerability scan, full
vendored CycloneDX 1.7 schema validation before signing and after authentication,
independent image/SBOM/provenance/results predicates, authorization, admission,
rollout, effective digest, HTTP and owned cleanup. Original Trivy reports carry
schema 2, image references/repo digests/image ID and Alpine 3.23.7 metadata; scan
logs explicitly enable vulnerability analysis. Base service reports contain no
findings in this snapshot. Generating an SBOM alone is not counted as that scan.
Image: `172.18.0.3:5000/quotes-node-delivery-juza7mf4@sha256:97f91a55ca88c5d2f794eaf71e12566b73d96b884a259c2fa63cb1887ce5b4b9`.

The demo's original results establish F05/F06 missing or misassociated SBOM,
F07/F08 missing or altered independent signature, F09/F10 invalid provenance,
F13/F14 missing or invalid results, with their implemented CI/admission rejection
and recovery receipts. F13 preissuance reports RESULTS_ATTESTATION_MISSING.
F11/F12 preserve their implemented CREATE/UPDATE/Pod runtime barriers and L06
recovery; no generic nonzero-exit classification replaced attribution. Existing
classifier recognition handled the new actual diagnostics without widening.
L01 independently verifies the replacement and observes Ready Pods with its new
digest; L03/L04 share that replacement, while L06 is the legitimate runtime
counterpart. These are functional observations, not independent campaign samples.
L05 remains **NOT_EXECUTED**, requiring its separate immutable revision pair.
Demo repository: `172.18.0.3:5000/quotes-node-run-hrutsdlz`:

- Initial: `sha256:42ddef5365335f8445025a2ea8d98c8cd06062106210d8ffca1e7277b5c0d78e`.
- Replacement: `sha256:1d6d6b46572b0813ed9dd2c76c23c7be28e8917a5f73f5dcde4b63e24c5b1ed2`.

The vulnerability suite preserved the approved oracles and real findings:

- F03: minimist 1.2.5 / CVE-2021-44906 CRITICAL is blocked; repaired 1.2.8
  removes the target, passes the global threshold, dependency/service checks,
  fresh image-specific authorization, admission and HTTP.
- F04: ip 2.0.1 / CVE-2024-29415 HIGH has no FixedVersion in the npm finding;
  policy blocks it. Results authorization and protected deployment are
  NOT_EXECUTED, as required. This is not a universal no-fix claim.
- L02: lodash.unset 4.5.2 / CVE-2026-2950 MEDIUM is observed, together with
  CVE-2025-13465 MEDIUM; no HIGH/CRITICAL findings. It receives fresh evidence,
  authorization, admission and successful HTTP. The additional finding does not
  invalidate the existing oracle. No threshold, severity, dependency, ignore,
  VEX or DB selection was changed to obtain these results.

Vulnerability repository: `172.18.0.3:5000/quotes-node-run-q3fvez06`:

| Image | Digest |
| --- | --- |
| F03 vulnerable | `sha256:aafda7cacfe07ab3237038192d41b525df44cbcf510d66790e1140b89c7b1a86` |
| F03 repaired | `sha256:87ad6347a3c22185d4a8679a18a3152af004dabd22009797f8f844a6ebb1d85a` |
| F04 | `sha256:a65e1ff166efd3d2f52e9b026280be28d6a62c24083650a9b48684cb57322073` |
| L02 | `sha256:c0c6f6a1755e47bdd72e18d2c631168aae9f2d75db3095d0e62f134752a608fd` |

Capacity was checked before every integration and after cleanup. Workspace and
Docker ended with 9.4 GiB free of 32 GiB (about 15 GiB initially), 19% inodes used;
/tmp retained about 109 GiB free on its separate disk. The 3 GiB reserve was never
lowered. Only one laboratory ran at a time. Project cleanup left zero containers,
zero build cache and only the default builder. The same three pre-existing
inactive volumes (471.2 MB) remain; no volume prune was used. Three reusable
platform images (1.973 GB) remain inactive.

After verifying the devcontainer image, its session-owned image and build cache
were retired (4.381 GB cache reclaimed). Final verified image identity was
`sha256:ba13e76a60e83aea3522725d517c4f3e88c93d1380ee735ee928030eb3cc56bb`.
After each successful integration, its 1,640,521,881-byte duplicate DB directory
was verified against both canonical file hashes and retired; receipts map the original
recorded paths to the single retained canonical snapshot. Replay can restore
those paths from that snapshot. No redundant DB bytes are claimed as retained.
Historical packages/snapshots, source work and credentials were not removed.

Remaining warnings are retained in original logs: ClusterPolicy deprecation,
Pod autogen scope, single-replica lab availability, disabled PolicyExceptions,
BuildKit fixture ARG defaults and npm update notices. These are not suppressed
and do not justify changing service/platform pins or admission semantics.

## Authorized hosted integration

After explicit user authorization, [run 40722150890, attempt 1](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/40722150890)
executed `golden-path.yml` on branch `chore/security-toolchain-refresh`, exact SHA
`a1ec5debd804101af3e8b3c1d46e3af9608ff2a9`, and completed successfully on 28 October.
Its package run is `run-p8Vt7khq`. The initial dispatch using the environment's
integration token returned HTTP 403 and created no run. The already configured
GitHub CLI OAuth session could dispatch it; no credentials or permission settings
were changed. Automatic shared CI also passed for the earlier published head:
[push](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/40706109297)
and [PR](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/40706261893).

The checksum installer and original tool reports confirm the selected security
versions on the runner. The ready admission Pod's imageID matches the locked
Kyverno 1.19.2 digest, with policies loaded, insecure registry access false and
verification cache disabled. Hosted Node/Buildx/kind/kubectl are the expected
24.22.1/0.38.1/0.33.0/1.35.8. The unchanged workflow uses the runner-provided Docker
28.0.4; it does not install the local devcontainer's Docker 29.9.2. This hosted
observation is not a claim that both complete platform environments are identical.

Both images were published under `ghcr.io/tfm-goldenpath/golden-path-lab-quotes-node`:

- Initial: `sha256:6f9a0f7d1f303f90a5558da82b4a12bb9d1c159cabe50ac05600e6d5a5992f88`.
- Replacement: `sha256:a3b888e5a7c2ad709c8354688c32fb4c50a9d4312cf2ea0601de97f7c2d42af2`.

The workflow issued separate native GitHub provenance for each digest. Original
verification outputs confirm the exact certificate identity
`https://github.com/tfm-goldenpath/golden-path-lab/.github/workflows/golden-path.yml@refs/heads/chore/security-toolchain-refresh`,
issuer `https://token.actions.githubusercontent.com`, expected source commit/ref,
GitHub-hosted runner and verified Rekor timestamps (16:06:57Z initial, 16:07:13Z
replacement). No main identity, wildcard, local trust exception or classic-signature
fallback was used. Both images have distinct v0.3 image-signature, SBOM, provenance
and results evidence; all delivery/authorization gates report VERIFIED. The six
Cosign signing operations each succeeded on their first attempt. Thirteen retained
full-schema receipts report VALID for CycloneDX 1.7 before signing and after
bundle authentication across both images.

After download, all eight evidence bundles were reauthenticated independently:
Cosign verified image/SBOM/results for each digest with the exact identity and
issuer, and `gh attestation verify` verified each saved native provenance bundle
with exact source digest/ref and `--deny-self-hosted-runners`. Logs and the
`hosted-reverification.json` receipt are retained outside Git.

Original observations establish preissuance F13 denial by `tfm-results` /
`autogen-require-results`, followed by results authorization and legitimate
acceptance. F11/F12 have attributable Deployment CREATE/UPDATE and Pod CREATE
rejections; L06 records accepted CREATE, legitimate UPDATE and a direct Pod
accepted then cleaned. L01 replaced the initial digest with independently verified
fresh evidence and Ready Pods at the replacement digest, observedGeneration 3,
and successful HTTP. L03/L04 are shared positive observations. Hosted F05/F06,
F07/F08/F09/F10, postissuance F13/F14 mutation trials and L05 remain
**NOT_EXECUTED** in their original records. The preissuance F13 observation does
not turn the unsupported postissuance mutation trial into an execution.

The exact [artifact 12831319641](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/40722150890/artifacts/12831319641)
was downloaded using the run/branch/SHA association, not a latest-run shortcut:

- GitHub ZIP: 1,067,100 bytes; SHA-256
  `324cc74b651f6d837cf627a1fdc9d6ea7ae353edcf9855ba595f8b3681494c43`, matching the API and upload log.
- Inner `run-p8Vt7khq.tar.gz`: 1,071,515 bytes; SHA-256
  `d667e49a642c6d05565989abc536d5897779a4c5b64ebd8055bce15a2e5c2a7d`, matching its sidecar.
- All 490 inner file hashes verified; safe unique regular archive entries checked.
  Original result source is the authorized SHA. The downloaded ZIP, package,
  originals and audit receipt are retained under the ignored environment directory,
  including `hosted-40722150890/`. GitHub artifact retention expires 11 November;
  the local retained copy does not depend on that remote lifetime.

The hosted DB has the same `trivy.db` hash/bytes as the canonical local snapshot,
with the same schema and UpdatedAt. Both hosted images share its frozen identity.
DownloadedAt is `2026-10-28T16:06:29.163589942Z`; hosted metadata SHA-256 is
`75a22ac32f46030f53e5d9b5b07b0396795cdf29968dbac3d83320d99b535759`.
`hosted-db-metadata.json` was restored from the archived metadata fields and its
exact bytes checked against that original hash. `hosted-db-retention.json` maps
it to the single retained canonical DB payload. The original runner directory is
not retained, and no redundant 1.6 GB DB copy was made.

The explicit cleanup and artifact-retention steps succeeded, and the job completed.
As with the normal local demo, this coordinator does not emit `finalization.json`.
Its cleanup implementation suppresses individual deletion errors and has no durable
post-deletion resource inventory: step success is observed, independent confirmation
of each hosted resource's absence is **not** claimed. Logs preserve this boundary;
no stronger cleanup receipt was fabricated. The actual integration establishes the
implemented lane-B trust/admission behavior on this branch, not a later main run,
all twenty scenarios, human acceptance or a new campaign sample. After retaining
the downloaded evidence, the local workspace/Docker filesystem has about 9.2 GiB
free and /tmp about 107 GiB; no local laboratory was started for this review.

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
