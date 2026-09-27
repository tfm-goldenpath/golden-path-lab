# PR #15: review findings and release recommendation

[Español](pr15_review_ES.md) · [Migration guide](../docs/EN/cosign-bundle-migration.md)

Review date: 2026-09-27. [PR #15](https://github.com/tfm-goldenpath/golden-path-lab/pull/15) was first reviewed at `82728c5c0fd69bbc9bff9007239a895f6467826c`; a follow-up reviewed `947684e9589ccf078fff53c465ceea434946ca27`. The corrections below distinguish those revisions from later local changes; the earlier hosted run does not validate either set of corrections. No review replies, thread resolutions, pushes, milestones or tags are created by this record.

## Review disposition

| Comment | Assessment | Action |
| --- | --- | --- |
| [Parser rejects image bundles](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115470375) | False positive for pinned Cosign 3.1.3 image signing. Both real hosted image bundles use DSSE, with `cosign/sign/v1`, and pass the strict parser. | Keep the DSSE requirement. Do not accept an unsupported representation merely to silence the comment. |
| [Signing and verification disagree](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115470391) | False positive: this image-signing path produces an attestation bundle, not the `messageSignature` representation used by `sign-blob`. | Keep producer, direct attestation verification and admission aligned. Add a source comment explaining the pinned behavior. |
| [Encrypted private-key exclusion](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115470404) | The stated example is already excluded: the original regex matches `ENCRYPTED PRIVATE KEY` and `ENCRYPTED COSIGN PRIVATE KEY`. A separate weakness exists: the allowed public-key filename did not constrain its content. | Require exactly one `PUBLIC KEY` PEM block with nonempty canonical Base64 and no additional text or blocks. Extend private-key header recognition to labels containing punctuation. These are structural archive checks, not authentication or general secret detection. |
| [Unchecked OCI config descriptor/blob](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115470414) | Valid for Sigstore candidates: a missing or malformed config could previously coexist with a successful bundle inventory. | Validate and retrieve the config using bounded size, digest and transport checks; check the pinned empty-config contract and preserve its digest/size. Reuse identical verified config bytes within one retrieval. Non-Sigstore artifacts remain manifest-classified, outside bundle-content validation. |

The pinned [image-signing implementation](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/sign/sign.go#L158-L225) builds an in-toto statement and calls `NewAttestationBundle`. Its [DSSE construction](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/signcommon/common.go#L364-L388) and [image-signature predicate](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/types/predicate.go#L19) support the current contract. This differs from [blob signing with PlainData](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/sign/sign_blob.go#L110-L125).

Follow-up review at `947684e`:

| Comment | Assessment | Action |
| --- | --- | --- |
| [Authenticated content binding](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115875488) | Valid: the saved bundle and content returned by a separate registry query were not bound to the same statement. | Validate content extracted from the exact bundle that passed cryptographic verification. |
| [F13 inventory consistency](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115875516) | A consistency gap between pre/post observations, not a demonstrated admission bypass. | Compare strict descriptor sets, document the single-publisher assumption and retain mandatory later L01 acceptance. |
| [Node test count](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115875529) | 253 and 270 describe different revisions; both counts are valid. | Retain historical counts and identify each tested revision explicitly. |

## Existing hosted evidence

[Run 36321115827](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36321115827), attempt 1, executed `82728c5` on `feat/cosign-bundles` and passed L01 creation/replacement, F13 missing-results rejection and F11 privilege-escalation rejection. Each denial was attributed to its intended rule. GHCR retrieval used the supported referrers-tag fallback. The policies retained exact workflow identity/issuer, certificate trust and public transparency requirements.

The downloaded `run-HWj6gVNb.tar.gz` matched SHA-256 `4e579ed9603b6715d27a5aa60a7ba1b23b1dc3645c106221774e42a70b1cf6c7`; all 103 internal hashes matched. All eight retained bundles (image, SBOM, provenance and results for each image) passed separate Cosign verification against the retained trust snapshot, expected digest, predicate, exact branch workflow identity and GitHub OIDC issuer.

The job took 4m31s versus 3m05s in [main baseline run 36316243657](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36316243657). Verification/admission increased from 90s to 161s. These are functional-run observations, not an experimental estimate of intrinsic bundle overhead: runner regions differed and the logs combine cryptography, registry access and rollout latency.

## Acceptance after the corrections

At `947684e`, local verification passed: **270 Node tests** across service, environment and unit/contract suites, including 24 inventory and 21 packaging tests; **15 Python policy/configuration tests** also passed. The historical **253** at `82728c5` is 247 service/unit plus 6 environment tests. The corrections add 8 inventory and 9 packaging tests: 253 + 17 = 270. These checks used Node 24.18.0 and Python 3.10.0 on Windows; the external Conftest/Kyverno engines and full integration were not rerun. `git diff --check` passed. The [count comment](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115875529) therefore needs revision context, not replacement of the historical count. These totals do not describe the subsequent changes below.

The offline crypto probe signs synthetic image-signature, SBOM and results predicates with `attest-blob`. It checks real cryptography, predicate/digest binding and rejection of altered signatures or unauthorized keys; it does not exercise the actual `cosign sign` image producer, OCI publication/discovery or admission. The labels now state that boundary. The existing hosted image bundles separately support the pinned producer's representation; neither check completes the missing-signature F07 admission experiment.

The follow-up binds content validation to the saved bundle that passed `verify-blob-attestation`: only then does `verified-bundle-statement.mjs` extract its statement into the existing `verified-*.json` outputs. A second registry query can no longer supply unrelated content for those checks. Regression tests also ensure that an extra `payload` field cannot select a different nested statement. Native GitHub provenance retains its authenticated GitHub CLI route.

F13 also compares the strict registry descriptors captured before and after denial, retaining `F13-inventory-consistency.json`. The comparison rejects added, removed or changed entries and ignores ordering. This supports the controlled single-publisher experiment on a fresh digest; it is not an atomic registry snapshot or proof against transient changes between observations. Attribution still requires the isolated results-policy denial and later successful L01 admission for that same digest after results issuance.

The uncommitted follow-up based on `947684e` passed **296 Node tests** with zero failures/skips (26 added), **15 Python tests**, and the real offline Cosign 3.1.3 probe. The final Node run includes the nested-statement regressions; its TAP output is retained in `.tmp/pr15-review/post-fix-node-tests.tap`. Content validation passed for six previously authenticated hosted Cosign bundles; the production shell rejected an authenticated `FAIL` results predicate without continuing or substituting a separate `PASS` statement. Replaying the retained hosted F13 sidecars found three unchanged referrers. Syntax and whitespace checks passed. Docker was unavailable and external Conftest/Kyverno engines were not installed locally; neither full local nor hosted integration was rerun. These targeted replays do not validate live registry retrieval or admission of the changed revision.

A read-only attempt to exercise the new config retrieval against the two previously published GHCR images stopped on the first image with HTTP 403 while reading referrers using the available local credentials. It did not reach config validation. The helper correctly stopped; this is neither proof of a config incompatibility nor a successful integration. No access restrictions were relaxed.

- Publish the reviewed corrections and execute local/hosted integration on their exact revision; retain fresh evidence. Previous successful bundles do not validate config retrieval, authenticated-content binding or the new F13 comparison.
- Complete the directed F07 admission test with valid SBOM, provenance and results but no independent image-signature predicate. Require an attributable signature-policy denial; registry or trust errors are integration failures.
- After merge, validate the resulting `main` commit separately before release. Keep v0.1.0 and prior observations unchanged.

## Recommended milestone sequence

| Milestone | Scope and completion | Version recommendation |
| --- | --- | --- |
| Repository baseline | Already released classic profile; retain its historical supporting PRs. Move #15 out and close when no baseline work remains. | Preserve v0.1.0. |
| Bundle migration — v0.2.0 | PR #15, review corrections, F07 directed acceptance and successful integration of the adopted revision. | Tag the verified post-merge commit v0.2.0; retain the GitHub pre-release designation while the laboratory is experimental. |
| Scenario coverage and pilot | Complete the twenty operational scenarios through small PRs by control family; R/G measurements, four pilot pairs, calibration of the six measured manual tasks and frozen parameters. Completion means interpretable evidence, not universally favorable results. | Provisionally v0.3.0 for the frozen campaign candidate. |
| Evaluation campaign and results | Campaign on the frozen revision, preserved raw results and reproducible analysis. Separate later corrections from the original campaign. | Associate results with the frozen tag; use a new revision/tag if executable inputs change. |

The minor increment distinguishes the evidence/consumer contract change during 0.x development. It is a project versioning convention, not proof of stability or an obligation imposed by SemVer. [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Prioritize completion of the existing control families and pilot over adding unrelated tools. Automatic releases, Kyverno policy-API migration, extra scanners and optional scenarios remain separate work unless a concrete compatibility issue blocks the agreed scope.
