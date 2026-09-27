# Future improvement: migration to Cosign Sigstore bundles

[English](cosign-bundle-migration.md) · [Español](../ES/cosign-bundle-migration.md) · [Documentation index](README.md)

**Status: deferred proposal.** This document records the compatibility analysis and impact of a future migration. It does not change the active signing configuration, policies or evaluation baseline. Adoption requires the integration checks below.

## Purpose and current baseline

The proposed improvement is to use Cosign's default Sigstore bundle representation for the image signature, CycloneDX SBOM, local provenance and signed results. Native GitHub provenance already uses a Sigstore bundle. Following the supported default reduces dependence on a deprecated format option; it does not, by itself, increase the demonstrated SLSA level or prove stronger control effectiveness.

The reviewed tool combination is Cosign **3.1.3**, Kyverno **1.19.1** and Kyverno chart **3.9.1**. The [tool lock](../../tools.lock.json) remains authoritative for the active configuration. Current signing explicitly uses `--new-bundle-format=false --use-signing-config=false`; verification selects the classic format. The signing-configuration correction and this future format migration are separate changes.

The [delivery contracts](delivery-contracts.md) distinguish local development-key trust in lane A from GitHub OIDC identity and transparency verification in lane B. That separation must remain after migration. A shared bundle format does not make the two producers equally trusted.

## Confirmed findings and remaining uncertainty

| Finding | Evidence | Migration consequence |
| --- | --- | --- |
| F13 previously required a classic DSSE envelope at the top level. | Hosted run `36277828157` failed on a mixed inventory containing v0.3 GitHub provenance and a classic SBOM. The retained inventory reproduces the failure. | The baseline parser now unwraps supported v0.3 `dsseEnvelope` entries before applying the existing validation. This corrects representation handling, not cryptographic verification or admission. |
| Cosign 3.1.3 `download attestation` already retrieves bundles and classic attestations. | The pinned implementation tries `GetBundles`, emits bundle JSON and then retrieves classic attestations [1]. | The command need not be replaced solely because of the migration; its output consumer must understand the returned representations. |
| The current Kyverno `Cosign` configuration selects classic verification. | The pinned ClusterPolicy adapter builds classic options; `SigstoreBundle` selects a separate verifier [3][4]. | Changing only the producer flags would leave consumers misconfigured. |
| Kyverno 1.19.1 has a bundle path for public keys and OIDC certificate identities. | The bundle policy and trusted-material builders support both configurations [4]. | There is no established need to replace Kyverno or change policy families solely to support bundles. Actual integration remains unverified. |
| The current local trust settings are incomplete for timestamp-free bundles. | The renderer sets `keys.rekor.ignoreTlog`, but an absent CT-log configuration leaves `IgnoreSCT=false`. The bundle verifier then requests an observer timestamp [4][5]. | For local development-key bundles without log timestamps, explicitly configure both `keys.rekor.ignoreTlog: true` and `keys.ctlog.ignoreSCT: true`. Keep these exceptions out of lane B. |
| A generic bundle signature check does not enforce the separate image-signature predicate. | The bundle signature path can accept a valid bundle for the digest without filtering its predicate. Cosign's image-signing predicate is `https://sigstore.dev/cosign/sign/v1` [2][3][4]. | Require that predicate explicitly for the independent image-signature control. A signed SBOM or provenance must not satisfy it accidentally. |
| Raw bundle parsing and verified CLI output are different interfaces. | `lab-contracts.mjs` accepts classic envelopes and decoded statements, but not a raw bundle wrapper. This alone does not establish the shape of successful `verify-attestation` output. | Inspect output from the pinned CLI before changing this parser. Process content only after successful cryptographic verification. |

**Baseline correction independent of migration:** [hosted run 36277828157](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36277828157/job/108503864945) confirmed the mixed-inventory failure after successful signing and verification. The correction accepts classic DSSE and `application/vnd.dev.sigstore.bundle.v0.3+json` attestation bundles, preserves digest/predicate/SBOM checks and rejects malformed, ambiguous or unsupported wrappers. Bundled results for the expected digest still prevent F13 attribution. Verification material must select exactly one certificate, certificate-chain or public-key-identifier shape; nested log and timestamp fields are checked for supported structure, field types and byte encoding. These checks follow the [v0.3 material definition](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_bundle.proto), not certificate trust or cryptographic validity: parsing is not authentication. The original inventory is replayed offline after checking the retained archive's checksum. This does not establish completion of the subsequent live admission checks.

During the compatibility review, eight in-memory diagnostic expectations passed, as did the existing eleven contract/parser tests and ten policy tests. The diagnostic signatures were synthetic. These observations confirm parser behaviour and rendered configuration; they do not demonstrate bundle authenticity, registry interoperability or admission. Docker's daemon was unavailable, so no real cluster verification was performed. Preserve new execution evidence when the work is resumed.

## Certificate-chain finding and baseline correction

The later hosted log (`run-ZiAOuAck`) reached admission after successful CLI verification and F13 inventory inspection. Kyverno rejected the image signature and attestations with `x509: certificate signed by unknown authority`; F13 correctly stopped because the missing-results condition was not isolated. The log alone does not identify the X.509 issuer or prove the contents of the published CA chain.

Two pinned source findings explain the compatibility risk:

- The [classic Kyverno 1.19.1 adapter](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/cosign.go) discards the intermediate pool returned by `FulcioRoots()`. Its embedded [Cosign 3.1.2 verifier](https://github.com/sigstore/cosign/blob/v3.1.2/pkg/cosign/verify.go) can instead obtain intermediates from the signature's attached chain, excluding its last certificate from that pool and retaining the verifier's configured trusted roots.
- Cosign 3.1.3's keyless signing path converts an internal bundle back to classic evidence; [certificate extraction](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/signcommon/common.go) can return just the signing certificate. Classic [image signing](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/sign/sign.go) and [attestation publication](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/attest/attest.go) consequently lack the intermediate-chain annotation. Passing `--certificate-chain` alone is insufficient for this ephemeral keyless path.

The implemented compatibility adapter, [complete-classic-chain.mjs](../../scripts/complete-classic-chain.mjs), keeps the existing policy family and evidence formats. In lane B, the signing module exports trusted material with `cosign trusted-root create --with-default-services`, which obtains the default material through Cosign's authenticated TUF client. It uses that snapshot for CLI signing/verification and selects the matching Fulcio CA chain for each classic signing certificate. The adapter adds missing certificates, nearest intermediate first and root last, exclusively to `dev.sigstore.cosign/chain` in the companion `.sig`/`.att` manifests. It refuses an unmatched certificate, a divergent existing chain or an observed concurrent manifest change.

Payloads, layer/config digests, signatures, certificates, Rekor evidence and the delivered image digest remain unchanged. The companion manifest digest changes when its chain annotation changes; before/after manifests and digests are retained in `image-chain.json`, `sbom-chain.json` and `results-chain.json`, alongside `sigstore-trusted-root.json`. The root in an attached chain is **not** added as a trusted root. OIDC identity, transparency, certificate and admission checks remain mandatory. Local development-key signing and native GitHub provenance are unchanged. GHCR's read-before-write check is not an atomic lock: this adapter is limited to the existing per-run image digest, with no parallel publishers for that digest.

This is a baseline compatibility correction, not the deferred bundle migration. A bundle consumer uses a different verification path and might avoid the classic omission, but a format change does not itself establish trust. Likewise, the [ImageValidatingPolicy verifier](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/ivpol/cosign/verifier.go) detects bundles at image level: the existing native GitHub provenance bundle can affect selection even when other evidence remains classic. Changing policy families requires a mixed-inventory experiment.

Regression tests exercise real generated certificate signatures and mocked registry operations; scenario tests reject certificate/integration errors instead of counting them as F13/F11 detections. A real Cosign 3.1.3 trusted-root export was checked separately. These checks do not prove GHCR publication or admission interoperability. Docker was unavailable for this correction; run the hosted acceptance sequence in the [runbook](cases/L01-F13/runbook.md) on a published fix branch and retain the exact commit. A new dispatch can test a branch before merge; rerunning an older failed run retains its original commit.

## Repository impact

Paths below are relative to `implementacion/`, except where explicitly stated.

| Component | Planned work | Scope |
| --- | --- | --- |
| [Signing module](../../scripts/lib/attestations.sh) | Remove classic-format overrides from signing and verification. Use the hosted default signing configuration while preserving the local development-key/no-log profile. Retain exact hosted identity and issuer checks. | Required. Bundle representation and choice of signing services are separate decisions. |
| [Classic chain adapter](../../scripts/complete-classic-chain.mjs) | Remove calls to the classic `.sig`/`.att` metadata adapter only after the new producer/consumer combination passes real verification. Replace its reports with original bundle and trust-verification evidence. | Required on migration; never apply the classic manifest adapter to a bundle or use it as a fallback that hides failed bundle verification. |
| [F13 parser](../../scripts/check-missing-results.mjs) and [scenario](../../tests/scenarios/f13.sh) | Retain the implemented classic/v0.3 mixed-inventory handling, complete inventory and same-digest checks. Validate future image-signature and other bundle shapes against real CLI output; malformed data or failed retrieval must remain errors. | Baseline wrapper handling is fixed. Additional migration work depends on observed output; inventory inspection remains separate from cryptographic verification. |
| [Statement contracts](../../scripts/lab-contracts.mjs) | Validate real verified-output fixtures and add an adapter only if the CLI output requires one. Preserve predicate, source and digest checks. | Conditional parser change. SBOM validation and the logical results predicate remain applicable. |
| [Kyverno renderer](../../policies/kyverno/render.py) | Select bundle consumers, use explicit predicate types and apply the local timestamp settings above. Preserve scope, blocking behaviour and all authorization conditions. | Required. Test the image-signature requirement separately from SBOM/provenance/results. |
| [Laboratory setup](../../scripts/lib/lab.sh) | Keep the current policy family if it satisfies the contracts. If a different API is selected, update readiness, deployment-actor permission checks and rejection attribution. | Conditional; a policy-family migration is not assumed. |
| [Tool lock](../../tools.lock.json) | Replace the classic compatibility declaration with the validated bundle configuration. Update tool/controller/chart pins and checksums together only if required. | Required declaration update; no automatic dependency upgrade. |
| [Evidence packager](../../scripts/package-evidence.py) | Preserve original bundles alongside verification results and original CycloneDX JSON. Record versions and the evidence profile used. | Top-level `.json` files are already included. Different extensions or nested directories require packaging changes and tests. |
| [Unit tests](../../tests/unit/) and [policy tests](../../tests/policies/) | Cover actual output shapes, mixed inventories, malformed evidence, distinct predicates, authorization and both trust profiles. Add real CLI and integration checks beyond orchestration stubs. | Required. Synthetic unit tests do not establish cryptographic compatibility. |
| [Hosted workflow](../../../.github/workflows/golden-path.yml) | Re-run hosted integration and retain the resulting bundles and verification evidence. Keep native GitHub provenance and its existing validator unless an observed compatibility issue requires adaptation. | Existing workflow permissions need no blanket expansion. Workflow edits depend on evidence retention needs. |

The service, Trivy vulnerability threshold, CycloneDX content and R/G experimental purpose do not depend on the signature packaging choice. Any changed execution cost must nevertheless be measured using the adopted implementation.

## Documentation and thesis impact

Update both language versions of [delivery contracts](delivery-contracts.md), the [policy guide](../../policies/README.md), and the interoperability sections of the [implementation plan](implementation-plan.md). Update the [L01/F13 specification](cases/L01-F13/README.md), [runbook](cases/L01-F13/runbook.md) and architecture diagram only where evidence paths, commands or consumer responsibilities change.

Add a concise decision and compatibility explanation to the thesis implementation/results sections. Describe the representation, the two trust profiles, direct admission verification and observed limitations. The research method, regulatory mapping and twenty-scenario selection remain applicable; adjust concrete scenario setup/evidence instructions where necessary. Bundle adoption does not establish full VSA conformance or a higher SLSA level.

Record the implementation and its actual validation in the changelog and a new validation record. Preserve historical baseline PR descriptions, logs and previous evidence packages. If a campaign has already started, evaluate the migrated revision separately rather than mixing its measurements with the original baseline.

## Deferred work and acceptance criteria

- [x] Inspect the actual hosted inventory and correct the independent F13 representation failure, with mixed-format and fail-closed regressions. A fresh full hosted integration remains pending.
- [ ] Run a small compatibility experiment using the pinned versions and fresh, isolated test images. Confirm that new bundles are present and fetched; successful CLI verification alone can fall back to classic evidence.
- [ ] Adapt producers, inventory handling and consumers in a focused migration PR with tests. Keep unverified compatibility claims out of the operational guides.
- [ ] Remove the classic chain-completion adapter from the migrated path and confirm that independently verified bundles carry the required evidence without relying on residual classic manifests. Compare authenticated certificate-chain handling explicitly.
- [ ] Verify lane A with a development public key, local registry access and the intended absence of public signing/logging services.
- [ ] Verify lane B with real GitHub OIDC, the exact authorized workflow identity, transparency/timestamp material and GHCR retrieval by Kyverno. Do not disable hosted trust checks to make the migration pass.
- [ ] Demonstrate F13 rejection solely for missing results while the image signature, SBOM and provenance remain valid; publish valid results and demonstrate L01 acceptance for the same digest, including the relevant update operation.
- [ ] Test the F07 distinction: valid SBOM/provenance/results remain present, but the image-signature statement is absent. Admission must reject the delivery for that missing requirement.
- [ ] Confirm rejection of a controlled signature alteration, unauthorized identity, wrong digest and incompatible or unsuccessful results; an unavailable mandatory control must still stop delivery.
- [ ] Retain the original bundles, verification outputs, applied policies and attributed admission results in the evaluation package. Exclude credentials and private keys, and verify the downloaded package.
- [ ] Update English and Spanish documentation, repeat the affected pilot checks and fix the adopted version before campaign measurement. Keep corrections and later measurements separately identifiable.

The outcome is either a validated migration or a documented incompatibility supporting continued use of the pinned classic profile. Upstream support and successful unit tests alone are not sufficient acceptance evidence.

## Sources

1. [Cosign 3.1.3: downloading bundles and classic attestations](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/download/attestation.go).
2. [Cosign 3.1.3: image-signing predicate](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/types/predicate.go).
3. [Kyverno 1.19.1: signature and attestation verification paths](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/verifier.go) and [classic verification options](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/cosign.go).
4. [Kyverno 1.19.1: bundle retrieval, trust and timestamp requirements](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/sigstore.go), with [upstream tests](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/sigstore_test.go).
5. [Kyverno 1.19.1: mapping policy fields to verifier options](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/engine/internal/imageverifier.go).
6. [Sigstore bundle specification overview](https://docs.sigstore.dev/about/bundle/) and [Cosign 3.1.3 signing defaults](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/sign.go).
