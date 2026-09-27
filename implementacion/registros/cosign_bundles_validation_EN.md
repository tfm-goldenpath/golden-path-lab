# Cosign bundles: local migration validation

[Español](cosign_bundles_validation_ES.md) · [Migration guide](../docs/EN/cosign-bundle-migration.md)

Date: 2026-09-27. This record validates the modified working tree on `feat/cosign-bundles`, based on `9f1999ef8a1ee0b8b4c708625f1d0b663ad9173c`. It does not report an execution of the unchanged v0.1.0 release. The captured implementation source snapshot is `8d79c68d46569c826fb43d693c03dc767631c715f039021717642d3d2991cc0a`.

Documentation was updated afterwards to record the observed result. The snapshot also includes `policies/README.md`, so it is the run's captured fingerprint, not a fingerprint of the final documentation edits. No executable source or test changed after the final run started.

## Observed integration

`bash scripts/demo.sh local` completed with exit code 0 in **run-De88fpWy**, including the strict OCI inventory retriever. The pinned tools ran in a Linux AMD64 container with Docker Engine 24.0.5 on the host. Explicit `GP_CGROUP_V1_COMPAT=1` enabled this older cgroup-v1 host. This is a functional compatibility test, not the prescribed campaign environment or a performance measurement.

| Check | Observation |
| --- | --- |
| Fresh evidence | An isolated zot registry and fresh image digests contained v0.3 bundles. Saved bundles passed direct cryptographic verification; classic signatures could not supply the missing bundle predicates. |
| Strict retrieval | Three referrers before and after F13 denial, four after authorization, and four for the authorized replacement. All advertised manifests/bundle blobs were retrieved and checked by size and digest, and the second listing matched. |
| F13 | Only `tfm-results`/`autogen-require-results` rejected the original image. The pre/post inventories established absent results; the other admission evidence checks passed. Adding valid results allowed that same digest. |
| F11 | The early policy denied the privileged input. The directed admission UPDATE was denied only by the restricted-container rule at `allowPrivilegeEscalation`. |
| L01 | Creation, readiness and the expected HTTP response passed. A distinct image then passed its own analysis, signing, evidence verification, admission and rollout. The ready Pod's image ID matched the replacement digest. |
| Admission profile | All four evidence policies used `SigstoreBundle`. The image-signature policy separately required `https://sigstore.dev/cosign/sign/v1`. |
| Archive | SHA-256 and all 111 internal file hashes verified. Eight raw bundles and two development public-key copies were retained. Credentials, kubeconfig, private keys and internal state were excluded. |
| Cleanup | The command exited successfully and removed its temporary private-key directory and owned laboratory resources. |

Original digest: `sha256:76f160b8370624d2d45e982d909ca6e99303654b2f2cf1c27b79cebb933370a3`.

Replacement digest: `sha256:e4f1336f50574e526c8f8aa0b45d97d6c7b5c93154fa8fb92468febae2b16f32`.

The package is `evidence/packages/run-De88fpWy.tar.gz`, with SHA-256 `113113cc7857dbe15d29d0d6022fe612e1b02ddc388a8b41bdfd6159be059491`. Raw files remain in `evidence/raw/run-De88fpWy/`; both generated directories are ignored by Git. The run retains registry descriptor inventories, raw bundles, original CycloneDX JSON, verifier outputs, applied policies and rollout evidence for both images.

Earlier runs `run-MyEM7tG1` and `run-6AyCNm7h` passed the bundle signing/admission sequence before strict retrieval was wired into the running orchestration. They remain development observations; the run above validates the completed retrieval guard.

## Regression evidence

`make test` passed in the pinned Linux tool container with network disabled:

- 6 environment tests and 247 service, contract, parser, orchestration, classification and packaging tests.
- 15 Python policy/configuration tests, 52 Conftest decisions, 9 Kyverno engine checks and 32 checks against actual policy input files.
- 15 steps in the real Cosign cryptography probe, including successful image-signature, SBOM and results verification, plus rejection of SBOM/results substitution, an altered signature, a different digest and an untrusted development key. Setup steps are included in this count; this is not fifteen catalogue scenarios.

The registry-helper tests cover a single unreadable or malformed referrer, inconsistent bytes/digests, pagination/fallback, changing listings and credential-free HTTPS storage redirects. They do not authenticate a registry by parsing its JSON. Full test output is retained locally in `.tmp/bundle-tests-strict.log`; the integration output is `.tmp/bundle-integration-strict.log` and the packaged `run.log`.

## Limits and remaining acceptance

- Run the published branch on GitHub before accepting lane B: real OIDC identity, Fulcio certificate/SCT and transparency checks, native GitHub provenance, authenticated GHCR retrieval and Kyverno consumption remain unverified for this bundle revision.
- Complete directed admission negatives from the migration checklist, including an image with valid SBOM/provenance/results but no independent image-signature predicate. The positive live run, policy tests and cryptographic substitution tests do not constitute that live F07 experiment or the twenty-scenario campaign.
- Kyverno `ClusterPolicy` deprecation remains visible. The bundle migration removes active classic Cosign signing overrides and chain completion, but does not migrate Kyverno's policy API.
- Local verification deliberately uses a development key without public transparency timestamps. Its warning is expected and does not prove hosted transparency verification; the hosted policy retains that requirement.
- Freeze the adopted revision and trust profile after pilot validation. Both R/G configurations should use that revision; R may omit the additional controls. Do not pool classic-development timing repetitions with bundle-campaign repetitions.

No commit, push, release modification or hosted workflow dispatch was performed for this validation.
