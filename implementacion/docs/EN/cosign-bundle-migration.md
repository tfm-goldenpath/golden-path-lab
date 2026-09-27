# Cosign Sigstore bundle migration

[English](cosign-bundle-migration.md) · [Español](../ES/cosign-bundle-migration.md) · [Documentation index](README.md)

**Status: local compatibility PASS including strict inventory retrieval. Full acceptance remains pending real hosted OIDC, SCT and transparency-log validation, and the actual F07 negative admission check.** This branch changes producers and consumers together. Configuration and regression checks do not establish registry or admission interoperability. The released classic baseline is **v0.1.0**, commit `9f1999e`; its observations are not bundle validation.

[Local run `run-De88fpWy`](../../registros/cosign_bundles_validation_EN.md) passed with pinned tools, fresh zot/kind and strict inventory retrieval: F13 and F11 were rejected for their expected reasons, L01 was admitted, and its independently verified replacement digest completed rollout. The host used Docker Engine 24.0.5 with cgroup v1 and explicit `GP_CGROUP_V1_COMPAT=1`. This is compatibility evidence, not the prescribed campaign environment or a timing measurement. The run validates the modified working tree based on `9f1999e`, with source snapshot `8d79c68d46569c826fb43d693c03dc767631c715f039021717642d3d2991cc0a`; it is not an execution of unchanged v0.1.0. Hosted trust and actual F07 negative admission remain separate pending checks.

## Selected profile

Cosign **3.1.3**, Kyverno **1.19.1** and chart **3.9.1** remain pinned by the [tool lock](../../tools.lock.json). Cosign emits its default Sigstore bundles for the image signature, original CycloneDX SBOM, local provenance and signed results. Native GitHub provenance remains an `actions/attest` bundle. The active path removes classic-format overrides and classic certificate-chain metadata completion; it has no silent classic fallback.

All image evidence policies select `verifyImages.type=SigstoreBundle`. The independent image-signature rule explicitly requires `https://sigstore.dev/cosign/sign/v1`: a valid SBOM, provenance or results bundle must not satisfy that requirement. The in-toto statement's `predicateType` and Kyverno's `attestations[].type` remain distinct fields. Source, digest, predicate, policy and successful-check conditions still apply.

| Lane | Producer and trust | Consumer requirements |
| --- | --- | --- |
| A: local development | Ephemeral development key; explicit signing configuration without public transparency-log services. | Verify with that public key. Only A permits `keys.rekor.ignoreTlog: true` and `keys.ctlog.ignoreSCT: true`, matching bundles without public log timestamps. The isolated registry may use HTTP. |
| B: GitHub | GitHub OIDC and the hosted default signing configuration; authenticated Sigstore trust material and native GitHub provenance. | Exact workflow identity and issuer, certificate trust, digest and required predicates; retain transparency and applicable timestamp/SCT verification. No local trust exceptions, wildcard identities or insecure registry transport. |

The [delivery contracts](delivery-contracts.md) define the trust boundary. A common representation does not give a local development key GitHub authority. Parsing downloaded JSON is not cryptographic verification; content checks consume successful verifier output. Raw downloaded bundles and verified outputs are separate retained artifacts.

`ClusterPolicy` remains in this candidate. Its deprecation and a future policy-family migration are separate work, requiring scope, readiness, enforcement and rejection-attribution checks before a Kyverno upgrade that removes it. Warnings are not hidden. The old [classic chain helper](../../scripts/complete-classic-chain.mjs) and its tests remain historical compatibility support pending full hosted bundle acceptance; the migrated path does not call it or apply `.sig`/`.att` annotations to bundles.

## Strict registry inventory retrieval

Cosign 3.1.3's [`GetBundles`](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/cosign/verify.go) skips individual referrers that cannot be read or parsed as bundles. Successful `cosign download attestation` output therefore cannot establish a complete inventory or prove that results are absent.

The new [read-only inventory helper](../../scripts/download-bundle-inventory.mjs) retrieves OCI referrers directly, using bounded pagination and the specified fallback index when needed; see the [OCI Distribution 1.1 referrers contract](https://github.com/opencontainers/distribution-spec/blob/v1.1.0/spec.md#listing-referrers). It verifies manifest/blob sizes and digests, validates every expected bundle and requires an unchanged second listing. Missing, malformed, unsupported, over-limit or changed retrieval stops the check; entries are not silently discarded. Local HTTP remains isolated to A; hosted access uses HTTPS and a fixed GHCR repository pull scope.

The helper emits the bundle array and `registry-inventory-before-results.json`, `registry-inventory-after-denial.json` or `registry-inventory-authorized.json` alongside the corresponding content/profile reports. These records establish the checked retrieval from the configured registry, not signature trust or an atomic, independently complete view of a potentially dishonest registry. Cosign/GitHub and admission still authenticate evidence separately. The complete strict-retrieval path passed local compatibility run `run-De88fpWy`; hosted retrieval and trust still require their own execution.

## Acceptance and evidence

Run the [local and branch-hosted acceptance sequence](cases/L01-F13/runbook.md) on the exact candidate commit, using fresh per-run image digests. Do not infer bundle use from a generic successful verification when residual classic evidence could be present.

- [x] Verify actual publication, strict inventory retrieval and cryptographic verification in A: compatibility run `run-De88fpWy`, with fresh zot/kind and no classic fallback.
- [ ] Verify B on GitHub/GHCR with real OIDC, the exact authorized workflow identity, authenticated certificate trust and required transparency/timestamp material.
- [ ] Repeat in B the F13 missing-results attribution and subsequent L01 admission for the same digest. Local run `run-De88fpWy` passed the sequence with strict before/after retrieval and same-digest L01 acceptance.
- [ ] Repeat in B the F11 rejection and independently verified L01 replacement, including rollout and functional comparison. Local run `run-De88fpWy` passed both checks with strict inventory retrieval.
- [ ] Complete the actual F07 negative admission check: retain valid SBOM/provenance/results but omit the image-signature predicate; admission must reject it. Passing cryptographic probes and policy regressions do not replace this check. Retain the negative-check contracts for altered signatures, unauthorized keys/identities, wrong digests and incompatible or unsuccessful results; retrieval/verifier failure must stop the mandatory check.
- [x] Preserve both local image evidence sets and verify the archive plus all 111 internal hashes: [validation record](../../registros/cosign_bundles_validation_EN.md). Eight raw bundles, public development keys, original CycloneDX JSON, verifier outputs, profiles, policies and admission responses are included; credentials and private keys are excluded.
- [ ] Repeat package preservation and checksum verification for B, including authenticated hosted trust material and native provenance.
- [x] Record the local working-tree snapshot, base commit, versions, run identifier and limitations in the validation record.
- [ ] Record the actual hosted commit and results, then repeat affected pilot checks before freezing the adopted bundle profile for campaign measurement.

The public commands remain `make test`, `make demo` and manual `golden-path.yml`; preparing this candidate does not dispatch GitHub or publish a branch. The candidate is ready for maintainer publication and hosted validation after review; publish the intended revision and dispatch that exact commit. Actual F07 negative admission remains an acceptance task. A failed integration is retained as such; it does not justify weakening the hosted trust profile.

## Experimental scope

The thesis method and twenty-scenario catalogue remain unchanged: F07 concerns independent image signing, F13 missing authorization and F14 incompatible policy. CycloneDX remains the mandatory SBOM, and results remain a custom VSA-inspired predicate. Bundle adoption alone establishes neither VSA conformance nor a higher SLSA level.

Freeze the adopted implementation, trust profile and tool versions after the pilot, before collecting campaign measurements. Run R and G from that same frozen revision; R omits G's experimental signing, attestation and admission controls while retaining ordinary Kubernetes and functional checks. Keep classic development timings and bundle campaign measurements separate. Preserve v0.1.0, prior PR descriptions and [historical records](../../registros/); report later corrections as different revisions. Thesis editing is a separate task.

## Historical classic compatibility findings

The following chronology preserves observations and pending work **as recorded at the time**. References below to an active classic adapter or a deferred migration describe that historical baseline, not this branch's bundle path.

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

**Subsequent hosted observation:** [run 36303967179](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36303967179/job/108576831438), on `fix/fulcio-chain` at commit `1ae111fc6e1614b32ee86461771836ada60e1d42`, passed the chain-completion/verification steps. Kyverno rejected F13 only for the missing results predicate, then admitted L01 after results issuance; the deployment became healthy and its functional comparison passed. It also denied F11 at `/securityContext/allowPrivilegeEscalation/`. The overall run is **FAIL**, because the classifier counted the standalone `to:` in kubectl's UPDATE preamble as a policy before reading the actual denial block. The parser correction scopes interpretation to that block and retains the exact expected reason checks. The final legitimate update and overall PASS still require a new hosted execution; the previous failed run remains valid historical evidence and is not relabelled as successful. Bundle migration remains deferred.

**Completed baseline integration:** [run 36310983700](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36310983700/job/108596721755), on `main` at commit `21f8fc46b158ae209c657c33f9376254223d62df`, subsequently completed the classic-profile sequence with `PASS`: F13 was denied for the missing results predicate, L01 was admitted and healthy after results issuance, and F11 was denied for privilege escalation. Its final legitimate update changed a Deployment annotation; it did not test delivery of a new image version. This observation closes the earlier baseline integration gap, not the later predicate-field correction, a bundle migration, a policy-family migration or the twenty-scenario campaign.

## Later classic image-replacement observation

[Hosted run 36314305654](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36314305654) completed on `4f8fe77` with PASS, including the independently verified replacement image, both native provenance steps and the L01/F13/F11 checks. Its artifacts were audited. The subsequent v0.1.0 release is at `9f1999e`, which includes that change; do not relabel the earlier run as an execution of the release commit. These are classic-profile observations and do not validate the bundle candidate.

## Sources

1. [Cosign 3.1.3: downloading bundles and classic attestations](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/download/attestation.go).
2. [Cosign 3.1.3: image-signing predicate](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/types/predicate.go).
3. [Kyverno 1.19.1: signature and attestation verification paths](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/verifier.go).
4. [Kyverno 1.19.1: bundle retrieval, trust and timestamp requirements](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/sigstore.go), with [upstream tests](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/sigstore_test.go).
5. [Kyverno 1.19.1: policy fields and verifier options](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/engine/internal/imageverifier.go).
6. [Sigstore bundle specification](https://docs.sigstore.dev/about/bundle/) and [Cosign 3.1.3 signing defaults](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/sign.go).
