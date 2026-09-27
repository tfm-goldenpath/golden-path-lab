# Contracts for the first integrated delivery

[English documentation](README.md)

[Versión en español](../ES/delivery-contracts.md).

The demonstration initially shares one `linux/amd64` image of `quotes-node`, identified by digest, between reference path R and protected path G. L01 subsequently replaces G's image with a second digest from the same source commit and a distinct build label, with its own analysis and signed evidence. This tests image replacement while preserving application behavior; **it is not a timing-measurement pair**. The [execution guide](cases/L01-F13/runbook.md) provides current commands, and [TODO](../../TODO.md) separates implemented capabilities from observed acceptance.

## Inputs, decisions and evidence

| Contract | Implemented check | Limitation |
|---|---|---|
| Service | Health, version/commit, deterministic synthetic quote and rejection of invalid inputs. | Not an actuarial engine; no personal data. |
| Image | `@sha256` reference, same image for scanning/signing/deployment, AMD64 platform. | Does not evaluate ARM or full multi-platform index semantics. |
| Vulnerabilities | Real Trivy report separate from SBOM; Conftest blocks HIGH/CRITICAL even without a fix. | Depends on identified components and available vulnerability information. |
| SBOM | Original CycloneDX JSON and Cosign attestation; signature, predicate type and matching subject. Local validation requires format, version, main component and nonempty component list. | Partial structural validation, not the entire official schema or semantic inventory accuracy/completeness. |
| Image signature | Cryptographic validity and trust configured for the selected lane. | A valid signature does not mean vulnerability-free or malware-free software. |
| Provenance | Expected subject, type and origin, with different build contracts in A and B. | No claim of SLSA Build L3 or isolation from complete builder compromise. |
| Results | Signed custom predicate, `golden-path-v1` policy, source and mandatory checks reporting PASS. | A statement by the authorized process, not VSA conformance or a replacement for direct verification. |
| Admission | Kyverno runtime, signature, SBOM, provenance and results rules in the protected namespace. | Covers laboratory resources/operations, not all cluster security. |

## Local development provenance: lane A

Kyverno image-verification caching is disabled so that **F13 → results issuance → L01 → image UPDATE** retrieves the relevant evidence. Trivy may reuse downloaded database/cache content, but each digest is analyzed separately and records its scanner version, database metadata and hash. The initial and replacement images have separate run labels and evidence directories under one laboratory builder. Source-level test results may be reused for the unchanged source; image reports and authorizations are not transferred to a different digest. These conditions serve the functional demonstration; campaign cache policy and paired ordering follow the experimental protocol.

The script creates a SLSA v1-shaped provenance statement with custom `buildType` `https://tfm-goldenpath.dev/buildtypes/local/v1`, signed with an ephemeral development key. It retains the declared repository, commit when available, run identifier and selected source-file snapshot. Without a Git repository, forty zeros identify an unavailable commit and `gitCommitAvailable` is false; the snapshot does not turn the sentinel into a real commit.

This lane checks generation, storage, retrieval, signatures and consumption of the local contract. The same laboratory administration controls the environment and key, so it supplies neither hosted OIDC identity nor an independent guarantee about the statement or SLSA Build L3. See the [SLSA specification](https://slsa.dev/spec/v1.2/).

## Native GitHub provenance: lane B

The manual workflow builds and publishes both image candidates to GHCR. Two SHA-pinned `actions/attest` steps emit native build provenance as a **SigstoreBundle** for their respective digests. GitHub CLI checks each signature, exact workflow identity, OIDC issuer, repository, commit and source reference. The content validator then examines JSON from successful verification; it does not perform cryptography itself. Kyverno retrieves the bundle and enforces provenance conditions directly at admission. References: [GitHub CLI](https://cli.github.com/manual/gh_attestation_verify), [official action](https://github.com/actions/attest), [Kyverno and Sigstore](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/).

Image signatures and SBOM/results attestations explicitly use classic Cosign storage through `--new-bundle-format=false`. Native provenance uses the `SigstoreBundle` consumer. These mechanisms are not assumed to share storage or retrieval behavior. Lane A's identities and keys do not authorize B. The workflow is not an isolated reusable builder that automatically establishes SLSA Build L3.

## Custom results summary and acceptance order

Predicate type: `https://tfm-goldenpath.dev/attestations/verification-results/v1`. Its content includes `policyVersion`, `source`, `result`, `checks` and evidence references with SHA-256 hashes. The orchestrator generates it after mandatory prior checks and validators succeed. Generating JSON does not rerun those checks; trust depends on the authorized process that produces and signs it.

The design is **inspired by VSA's purpose** but uses a custom contract. It does not claim conformance to the [Verification Summary Attestation specification](https://slsa.dev/spec/v1.2/verification_summary). Admission is recorded after issuing the summary, avoiding a circular prerequisite. Kyverno retains direct signature, SBOM, provenance and configuration checks alongside the summary's outcome and policy.

F13 prepares all other evidence and omits only that summary. The preparation check records its absence, and the directed admission test must identify `tfm-results`/`require-results` as the rejection cause. After summary issuance, initial L01 must be admitted and respond correctly. F11 checks privileged input both early and through a directed update. Finally, L01's replacement receives its own signed summary and must pass admission, complete rollout on the distinct digest and preserve the quote response. These checks do not close the remaining catalogue or replace campaign measurements.
