# Contracts for the first integrated delivery

[English documentation](README.md)

[Versión en español](../ES/delivery-contracts.md).

The demonstration initially shares one `linux/amd64` image of `quotes-node`, identified by digest, between reference path R and protected path G. L01 subsequently replaces G's image with a second digest from the same source commit and a distinct build label, with its own analysis and signed evidence. This tests image replacement while preserving application behavior; **it is not a timing-measurement pair**. The [execution guide](cases/L01-F13/runbook.md) provides current commands, and [TODO](../../TODO.md) separates implemented capabilities from observed acceptance.

## Bundle profile and validation status

This branch configures Cosign 3.1.3 Sigstore bundles and Kyverno 1.19.1 `SigstoreBundle` consumers for every image evidence requirement. It remains a migration candidate: [local compatibility run `run-De88fpWy`](../../registros/cosign_bundles_validation_EN.md) passed with strict inventory retrieval, while the [acceptance checks](cosign-bundle-migration.md#acceptance-and-evidence) still require real hosted OIDC, SCT and transparency-log results. The local run used Docker Engine 24.0.5/cgroup v1 with explicit `GP_CGROUP_V1_COMPAT=1`; it is not a campaign measurement. The classic v0.1.0 baseline and its retained executions do not prove the new profile.

The independent image-signature contract requires `https://sigstore.dev/cosign/sign/v1` for the expected digest. A signed SBOM, provenance or results statement cannot stand in for it. The remaining predicates, CycloneDX content, vulnerability threshold and authorization conditions are unchanged.

## Inputs, decisions and evidence

| Contract | Implemented check | Limitation |
|---|---|---|
| Service | Health, version/commit, deterministic synthetic quote and rejection of invalid inputs. | Not an actuarial engine; no personal data. |
| Image | `@sha256` reference, same image for scanning/signing/deployment, AMD64 platform. | Does not evaluate ARM or full multi-platform index semantics. |
| Vulnerabilities | Real Trivy report separate from SBOM; Conftest blocks HIGH/CRITICAL even without a fix. | Depends on identified components and available vulnerability information. |
| SBOM | Original CycloneDX JSON and Cosign attestation; signature, predicate type and matching subject. Local validation requires format, version, main component and nonempty component list. | Partial structural validation, not the entire official schema or semantic inventory accuracy/completeness. |
| Image signature | Cryptographic validity, the independent `https://sigstore.dev/cosign/sign/v1` predicate and trust configured for the selected lane. | A valid signature does not mean vulnerability-free or malware-free software. |
| Provenance | Expected subject, type and origin, with different build contracts in A and B. | No claim of SLSA Build L3 or isolation from complete builder compromise. |
| Results | Signed custom predicate, `golden-path-v1` policy, source and mandatory checks reporting PASS. | A statement by the authorized process, not VSA conformance or a replacement for direct verification. |
| Admission | Kyverno runtime, signature, SBOM, provenance and results rules in the protected namespace. | Covers laboratory resources/operations, not all cluster security. |

## Local development provenance: lane A

Kyverno image-verification caching is disabled so that **F13 → results issuance → L01 → image UPDATE** retrieves the relevant evidence. Trivy may reuse downloaded database/cache content, but each digest is analyzed separately and records its scanner version, database metadata and hash. The initial and replacement images have separate run labels and evidence directories under one laboratory builder. Source-level test results may be reused for the unchanged source; image reports and authorizations are not transferred to a different digest. These conditions serve the functional demonstration; campaign cache policy and paired ordering follow the experimental protocol.

The script creates a SLSA v1-shaped provenance statement with custom `buildType` `https://tfm-goldenpath.dev/buildtypes/local/v1`, signed with an ephemeral development key. It retains the declared repository, commit when available, run identifier and selected source-file snapshot. Without a Git repository, forty zeros identify an unavailable commit and `gitCommitAvailable` is false; the snapshot does not turn the sentinel into a real commit.

The local producer uses an explicit signing configuration with no public signing or transparency-log services and a local trust-root file without hosted CA/log material; the configured development public key is the trust anchor. Local Kyverno permits `keys.rekor.ignoreTlog: true` and `keys.ctlog.ignoreSCT: true` for this timestamp-free profile. Those exceptions do not authorize lane B.

This lane checks generation, storage, retrieval, signatures and consumption of the local contract. The same laboratory administration controls the environment and key, so it supplies neither hosted OIDC identity nor an independent guarantee about the statement or SLSA Build L3. See the [SLSA specification](https://slsa.dev/spec/v1.2/).

## Native GitHub provenance: lane B

The manual workflow builds and publishes both image candidates to GHCR. Two SHA-pinned `actions/attest` steps emit native build provenance as a **SigstoreBundle** for their respective digests. GitHub CLI checks each signature, exact workflow identity, OIDC issuer, repository, commit and source reference. The content validator then examines JSON from successful verification; it does not perform cryptography itself. Kyverno retrieves the bundle and enforces provenance conditions directly at admission. References: [GitHub CLI](https://cli.github.com/manual/gh_attestation_verify), [official action](https://github.com/actions/attest), [Kyverno and Sigstore](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/).

Image signatures and SBOM/results attestations use Cosign's default bundle representation and hosted signing configuration. All evidence policies use `SigstoreBundle`, while native provenance keeps its separate GitHub CLI verifier and content contract. B retains authenticated Sigstore trust material, exact OIDC identity/issuer, certificate trust, transparency and applicable timestamp/SCT verification. The active path no longer edits classic `.sig`/`.att` chain annotations. Matching formats do not establish matching trust or successful retrieval; these remain real integration checks. Lane A's identities and keys do not authorize B. The workflow is not an isolated reusable builder that automatically establishes SLSA Build L3.

## Custom results summary and acceptance order

Predicate type: `https://tfm-goldenpath.dev/attestations/verification-results/v1`. Its content includes `policyVersion`, `source`, `result`, `checks` and evidence references with SHA-256 hashes. The orchestrator generates it after mandatory prior checks and validators succeed. Generating JSON does not rerun those checks; trust depends on the authorized process that produces and signs it.

The design is **inspired by VSA's purpose** but uses a custom contract. It does not claim conformance to the [Verification Summary Attestation specification](https://slsa.dev/spec/v1.2/verification_summary). Admission is recorded after issuing the summary, avoiding a circular prerequisite. Kyverno retains direct signature, SBOM, provenance and configuration checks alongside the summary's outcome and policy.

F13 prepares all other evidence and omits only that summary. The preparation check records its absence, and the directed admission test must identify `tfm-results`/`require-results` as the rejection cause. After summary issuance, initial L01 must be admitted and respond correctly. F11 checks privileged input both early and through a directed update. Finally, L01's replacement receives its own signed summary and must pass admission, complete rollout on the distinct digest and preserve the quote response. These checks do not close the remaining catalogue or replace campaign measurements.

Kyverno 1.19.1's bundle verifier reports `no matching signatures found` both for missing predicates and some trust failures. F13 therefore requires exactly one identified `tfm-results`/`require-results` rejection (including its generated Deployment rule), valid bundle-only inventories captured before and after denial, with the original preflight revalidated before the request, absent results and present image-signature/SBOM/provenance predicates for the same digest. Other admission policies must pass, and L01 must subsequently admit that same digest after results issuance before the overall run can pass. Inventory parsing is structural evidence, not signature authentication. Additional rules, malformed or unavailable inventories and unrelated verification errors fail the test.

The [strict inventory retriever](../../scripts/download-bundle-inventory.mjs) replaces any assumption that successful Cosign download output contains every bundle. It performs read-only OCI referrer retrieval with bounded pagination/fallback, checks manifest/blob digests and sizes, validates all expected bundles and requires a matching second listing. It fails on unreadable, malformed, unsupported or changing inventory instead of interpreting missing output as missing results. Local HTTP is confined to A; GHCR uses a fixed repository pull scope. Retain `registry-inventory-before-results.json`, `registry-inventory-after-denial.json` and `registry-inventory-authorized.json` with their bundle arrays. Retrieval integrity is separate from cryptographic trust; see the [migration rationale](cosign-bundle-migration.md#strict-registry-inventory-retrieval).

## Retained representation and evaluation boundary

Each image retains `image.bundle.json`, `sbom.bundle.json` and `results.bundle.json`; A also retains `provenance.bundle.json`. B's native GitHub provenance is retained in the full downloaded inventories. `attestation-inventory-before-results.json` records the F13 preparation state, and `bundle-inventory-authorized.json` records the authorized inventory. These raw files are distinct from the successful `verified-*-bundle.txt` verification reports and `verified-signature.json`, `verified-sbom.json`, `verified-provenance.json` and `verified-results.json` outputs consumed by the content validators. The saved bundles are independently authenticated with `verify-blob-attestation` against their digest and predicate; inventory parsing alone cannot replace that verification. The after-denial snapshot is `attestation-inventory-after-denial.json`; retain `bundle-profile-before-results.json`, `bundle-profile-after-denial.json`, `F13-early.json` and `F13-after-denial.json` with the original admission log. `development-public-key.pem` is retained for reproducible local verification; private keys remain excluded.

`evidence-profile.json` identifies `sigstore-bundle-v0.3`, digest, phase and predicates. It records configuration and structural observations, not an independent cryptographic verdict. Retain it with the original CycloneDX JSON, trust material and applied policies for the initial image and `L01-update/`. Exclude keys and credentials and verify the package's file hashes.

The twenty-scenario method is unchanged. R and G must use the same frozen source revision; R omits G's experimental signing, attestation and admission controls while keeping ordinary Kubernetes and functional checks. Freeze the adopted profile after pilot validation; do not combine classic development timings and bundle campaign measurements. Bundle adoption does not establish a higher SLSA level or full VSA conformance.
