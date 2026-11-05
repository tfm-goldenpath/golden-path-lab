# F05 — Missing SBOM attestation

## Oracle fixed before implementation

Base: `b380836f0264698c0cdd8e5e8f750427def63761` (merged PR #21). Branch: `test/f05-f06-l03-sbom-validation`.
Milestone: Scenario coverage and pilot.
Source: user-approved expectations, cross-checked against local
`implementacion/evidence/raw/A_evaluacion.md`, SHA-256
`efa0b0f2024ed2800217de3099d86dd137acb4dcd91861bc72ad02235a774e45`.
The local copy has no independently verified thesis revision. Thesis files remain unchanged.

| Field | Approved expectation |
|---|---|
| Valid input and actor | A valid real image with scheduled image signature, CycloneDX SBOM, provenance and (for directed admission) results. The fixture actor can remove one run-owned OCI attestation manifest; it has no signing role during the fault. |
| Isolated alteration/property | Remove only the SBOM attestation at registry consumption. The original SBOM file remains insufficient. Require stable complete retrieval, authentication of every non-target, no duplicate SBOM and unchanged image. |
| Expected phase/latest boundary | Fresh CI must attribute missing SBOM before results authorization and protected deployment. Directed admission after results must reject only the SBOM rule. |
| Legitimate counterpart | L03 fresh inventory acceptance and exact restoration with fresh CI verification. |
| Evidence | Source snapshot, run/digests, original reports, schema validation, authenticated bundles, raw OCI inventories, exact alterations, responses, attribution, recovery and positive controls. Preserve primary and recovery failures separately. |

## Execution and review

Local CI and admission: **NOT_EXECUTED** at record creation. Hosted negative
F05/F06: **NOT_EXECUTED**. No campaign measurement or human acceptance claimed.
Recovery must be installed before mutation; successful authorization must follow
recovery and fresh mandatory verification. Catchable interruption invokes recovery;
host loss/SIGKILL requires retained backups and manual recovery.

Actual assistance: Codex with GPT-6; implementation, tests, diagnostics and documentation.
GitHub Copilot was requested but is not the tool executing this session.
Human review and final decision: **pending**. Historical attribution is preserved.

## Initial observations before the network review (2026-09-29)

Implementation and automated regressions are complete. The full suite passed
510 service/unit tests, 6 environment tests, 16 Python policy tests, Conftest,
Kyverno CLI checks and real offline Cosign checks. A later focused schema run
passed all 9 cases, including valid Unicode format content.

Fresh demo `run-DknjtwWd` stopped building the initial image: DNS resolution of
`registry-1.docker.io` timed out through `127.0.0.11:53` inside BuildKit on the
kind network. CI fault consumption and directed admission remain
**NOT_EXECUTED**. The earlier preflight failure `run-eU1gOKjF` is also preserved.
Both failed archives and all internal hashes were audited (4 and 13 files).

A supplementary host-builder probe built both real images, observed the L03
`is-number@7.0.0` addition in original Trivy output, passed official schema and
vulnerability checks, and verified separate SBOM bundles offline for the real
image digests. The donor is rejected for the replacement digest. This establishes
component generation and offline cryptographic binding only; it does not establish
F05/F06 registry attribution or L03 CI/admission acceptance. Its 35-file archive,
internal hashes and schema report/bundle hashes were audited.

See the [validation and handoff record](../../../../registros/f05_f06_l03_validation_EN.md)
for exact digests, evidence, development sequence, per-boundary status and human
review checklist. Hosted negatives and human acceptance remain pending.

## Local integration now observed (2026-09-29)

Fresh **`run-nWpDa9ZN` passed** after an explicitly approved temporary host
forwarding workaround fixed the kind-network DNS blocker. The wrapper restored
the original firewall chain and exited 0. F05 and F06 passed fresh CI rejection,
exact recovery, directed SBOM admission rejection and the shared L03 positive
control. F06's target CI consumer stopped at the retained subject mismatch;
independent donor verification does not imply target Cosign was reached.
L03 passed real component observation, schema validation, image-specific evidence,
CI authorization, admission, rollout and unchanged HTTP response. Existing
F07/F08/F13/F11 and L01/L04 also passed. L01/L03/L04 share one execution.

Audit: 776 archive hashes, 108 valid bundles and two expected F08 signature
rejections verified; all four SBOM recovery paths restored exact artifact bytes
and passed fresh CI. Source snapshot:
`31d09673b3a818270a3d4d7110e7ab3bbd44cf7e83e80789db14d1844331695d`.
See the [successful integration record](../../../../registros/f05_f06_l03_validation_EN.md#successful-local-integration-after-network-review-2026-09-29)
for digests, archive checksum, boundary attribution and network recovery evidence.
Hosted negatives remain **NOT_EXECUTED**; human review and acceptance remain pending.
