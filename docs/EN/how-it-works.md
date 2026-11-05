# How the implemented delivery works

[Index](README.md) · [Español](../ES/how-it-works.md) ·
[Authoritative contracts](../../implementation/docs/EN/delivery-contracts.md)

The protected path binds checks and evidence to one image digest and an authorized
source. A mandatory check that cannot complete stops delivery. A policy decision,
a verification failure and an operational error must remain distinguishable even
when each prevents progress. The tables describe current implementation, not a
new policy catalogue or a proposed consumer API.

## Phases and stopping points

The [canonical modules](../../implementation/docs/EN/architecture.md#implemented-modules-and-dependencies)
live in `src/` and share one Bash context. Policies, service and tooling remain
under `implementation/`. The table follows legitimate local delivery; laboratory
adapters add preflight/scenarios and hosted trust as noted. See the
[current scope and limits](legitimate-delivery.md#current-scope).

| Phase: purpose and input | Owner/tool and control | Outcome and next step | Retained evidence |
| --- | --- | --- | --- |
| Source/configuration and environment: select run, source and tool pins | `context.sh`, local environment adapter, `check-environment.sh`; validate committed source, fresh state/resource ownership and versions | Valid context proceeds; missing tools, invalid state or environment errors stop before delivery. The local delivery requires a real commit; laboratory sentinel handling does not relax it. | `state.json` (private/excluded from packages), source snapshot, `versions.txt`, `tool-versions.txt`, build inputs |
| PR/CI: check repository changes | [ci.yml](../../.github/workflows/ci.yml), Make shared tests, Conftest workflow rules | Passing checks support review; failing tests/policy stop CI. Tool/runner errors do not prove policy detection. Merge enforcement depends on configured GitHub rules. No image publication/admission here. | CI logs, static workflow decisions/artifact |
| Delivery preflight: test selected source and actual workflows | `delivery.sh`: service tests, workflow policy and tools; laboratory adapter adds lab tests | Pass permits infrastructure/build; test or policy failure and incomplete tooling stop. This is additional to ordinary PR CI. | `unit-tests.log`, `workflow-policy.json`; laboratory adds `laboratory-unit-tests.log` and policy test logs |
| Build/identity: source context and pinned base → image | `delivery.sh`, Docker Buildx; Linux AMD64, explicit build inputs and resolved SHA-256 digest | Valid published digest proceeds; invalid base/digest or build/registry errors stop. Build success alone is not authorization. | `build-inputs.json`, `build-metadata.json`, saved digest/build tag |
| Manifest policy: generated protected workload | `delivery.sh`, `contracts.mjs`, Conftest | Accepted shape/digest/restricted settings proceed; an attributable rule denial blocks. Parser/evaluator failure stops separately. | `tfm-golden.json`, `manifest-policy.json` |
| Original SBOM: identify image components | `delivery.sh`, Trivy, `validate-sbom-schema.mjs`, contract validator | Official CycloneDX 1.7 schema plus laboratory content checks allow analysis; invalid content/schema or generation errors stop. Validity is not completeness. | Original `sbom.cdx.json`, schema receipt, generation command/log/exit |
| Vulnerabilities: scan that original SBOM | Trivy with preserved DB, Conftest, `vulnerability-evidence.mjs` | HIGH/CRITICAL blocks even without fixes. Valid allowed report permits signing; malformed report, mismatched image/hash or DB/tool failure stops without successful authorization. | `vulnerabilities.json`, `database-identity.json`, `analysis-association.json`, `vulnerability-policy.json`, `analysis.json` |
| Independent image signature and SBOM/provenance | `attestations.sh`, Cosign; local key A or hosted B trust. B native provenance is issued by [golden-path.yml](../../.github/workflows/golden-path.yml) between prepare/finish | Each required digest/type/trust contract must verify. Missing/invalid evidence or signing/transport errors stop. SBOM/results cannot substitute for the image signature. | Raw bundles, trusted public material, successful verifier output, authenticated `verified-*.json` |
| Fresh verification and delivery authorization | `ci-verification-gate.mjs` retrieves registry inventory, authenticates exact bundles, then validates subject/source/content | Pass proceeds; classified absence/mismatch blocks only with required supporting evidence. Registry/verification errors stop but do not establish absence. Gate repeats immediately before results issuance. | `CI-delivery.*`, `CI-authorization.*`, strict inventories and verification logs |
| Results attestation: prior mandatory successes | `attestations.sh`, `contracts.mjs`; recheck analysis, generate/sign `golden-path-v1` results and freshly verify authorized inventory | Successful checks permit issuance; any required failure stops. Admission is observed later, avoiding circular authorization. | `results-predicate.json`, `results.bundle.json`, `verified-results.json`, `CI-authorized.*`, `evidence-profile.json` |
| Admission: actual protected workload request | `lab.sh`, Kyverno renderer, restricted `actor`; runtime, repository, image signature, SBOM, provenance and results rules | All required rules allow request to proceed; attributable denial blocks. Unavailable webhook/registry/trust errors stop separately and are not successful fault detection. Kyverno does not scan vulnerabilities. | Applied policies/configuration, request, admission response and inventories |
| Deployment/rollout/HTTP: admitted image | `workload.sh`, scenario-owned rollout checks, kubectl/curl and `check-image-rollout.mjs` | Ready Pods with expected digest and expected API responses establish the bounded functional observation. Timeout, wrong digest or HTTP mismatch fails even after admission allows. | Deployment/Pod observations, health/version/quote JSON, `L01-image-update.json` for replacement |
| Preservation/cleanup: success or failure | `src/run-delivery.sh` owns delivery cleanup/finalization through the local adapter and `src/package_evidence.py`; the lab retains its own trap/selection | Preserve original failure and first diagnostics/archive; cleanup only validated owned resources. Cleanup/packaging failures remain failures. | `finalization.json` is the final command outcome; archive/hashes exclude private state |

For the exact producer/consumer checks use [contracts](../../implementation/docs/EN/delivery-contracts.md),
[architecture](../../implementation/docs/EN/architecture.md) and
[policy sources](../../implementation/policies/README.md). Package integrity does
not repeat cryptographic evidence verification or establish human acceptance.

## Laboratory ordering is explicit

[demo.sh](../../implementation/scripts/demo.sh) runs preflight, infrastructure,
build, manifest rendering and **reference deployment/HTTP** before the protected
manifest and analysis path. Reference is an experimental comparison, not a secure
consumer route. It prepares the replacement image before hosted `prepare` returns.

Hosted order is `prepare` → native provenance for both digests → `finish` →
`cleanup`. During finish (or the corresponding local sequence), signing/fresh
verification precedes the directed **preissuance F13 missing-results admission**.
Results authorization follows that rejection. Local F07 removal/restoration,
negative runtime CREATE trials, legitimate admission/HTTP, runtime UPDATE trials,
image replacement and optional selected-source L05 then follow the coordinator.
Faults and their oracles belong to [scenario modules](../../implementation/tests/scenarios/);
they are not mandatory actions for a future consumer pipeline.

L01's second digest has fresh image-specific scan, SBOM, signature, provenance and
results in `L01-update/`. Source tests may be shared for the same commit. This
replacement tests delivery mechanics, not a functional upgrade. The frozen demo's
same-image F13 recovery is not L01 replacement. The separate paired measurement
runner is not the consumer engine.

## Finding a blocking control

These are representative navigation examples using existing rule IDs; the linked
source and operational records remain authoritative. P15's richer control/evidence
catalogue is future work. Early Conftest and Kyverno are different implementations
and need separate tests.

| Risk and practical value | Enforcement / existing ID | Valid → invalid example | Evidence, implementation and tests / scope |
| --- | --- | --- | --- |
| Mutable workflow dependencies or excess privileges | Early workflow Conftest: `ACTION_SHA`, `PR_WRITE`, `PULL_REQUEST_TARGET` | External action pinned to full SHA → tag; PR read permissions → write | [Rule source](../../implementation/policies/conftest/workflow.rego), [static trials and evidence](../../implementation/docs/EN/cases/F01-F02/runbook.md), [tests](../../implementation/tests/policies/test_workflow_scenarios.py). Structural checks, not general workflow data-flow analysis. |
| Mutable/unapproved workload image; privilege escape | Manifest `DIGEST`, `PRIVILEGED`; admission `authorized-image-repository`, `restricted-containers` under `tfm-runtime` | Authorized digest and `privileged=false` → tag-only image or privileged container | [Early rules](../../implementation/policies/conftest/manifests.rego), [renderer](../../implementation/policies/kyverno/render.py), [runtime trials](../../implementation/docs/EN/cases/F11-F12-L06/record.md), [policy tests](../../implementation/tests/policies/test_render.py). Protected namespace and covered operations, not all cluster security. |
| Shipping known severe findings | Analysis Conftest `VULNERABILITY_BLOCK`; malformed input `TRIVY_REPORT_INVALID` | Valid MEDIUM-only fixture → target HIGH/CRITICAL | [Rules](../../implementation/policies/conftest/trivy.rego), [real-image fixture record](../../implementation/docs/EN/cases/F03-F04-L02/record.md), [tests](../../implementation/tests/policies/run_rego.py). DB/component detection bounded; admission consumes authorization, does not rescan. |
| Missing or altered independent image signature | Fresh gate `MISSING_IMAGE_SIGNATURE`; admission `tfm-signature` / `require-image-signature` | Authentic `cosign/sign/v1` for digest → absent signature despite present SBOM | [Gate](../../src/ci-verification-gate.mjs), [F07](../../implementation/docs/EN/cases/F07/record.md), [F08](../../implementation/docs/EN/cases/F08/record.md), [real crypto tests](../../implementation/tests/integration/bundle-crypto.sh). Valid signature does not imply vulnerability safety. |
| Absent or unrelated component evidence | Schema/content verification; admission `tfm-sbom` / `require-sbom` | Authentic matching CycloneDX → missing or different-digest donor | [Schema validator](../../src/validate-sbom-schema.mjs), [SBOM trials](../../implementation/docs/EN/cases/F05-F06-L03/runbook.md), [schema tests](../../implementation/tests/unit/sbom-schema.test.mjs). CI full schema and selected admission fields are distinct; neither proves inventory completeness. |
| Unauthorized origin or build claim | Authenticated content checks; `tfm-provenance` / `require-provenance`, `PROVENANCE_REPOSITORY`, `PROVENANCE_REVISION`, `PROVENANCE_BUILD_TYPE`, `PROVENANCE_BUILDER` | Configured source/revision/builder → signed different repository | [Contracts](../../src/contracts.mjs), [provenance trials](../../implementation/docs/EN/cases/F09-F10-L05/runbook.md), [tests](../../implementation/tests/unit/provenance-contract.test.mjs). Local development keys do not prove hosted OIDC; no isolated-builder/SLSA L3 claim. |
| Deployment without current successful authorization | Fresh gate `MISSING_RESULTS`, `RESULTS_POLICY_VERSION_MISMATCH`; `tfm-results` / `require-results`, `RESULTS_POLICY_VERSION` | Authentic PASS with required checks under `golden-path-v1` → missing results or laboratory P0 replay | [Results trials](../../implementation/docs/EN/cases/F13-F14/record.md), [tests](../../implementation/tests/unit/results-authorization.test.mjs), [admission conditions](../../implementation/tests/policies/test_results_conditions.py). Custom results predicate, not VSA conformance; health remains separate. |

For a failure, identify its phase, exact source/image, raw command status, structured
decision and expected rule. A missing evidence report caused by registry failure
cannot prove absence. Negative scenarios require attributable rejection and their
positive recovery; unknown/unreached barriers stay unknown/unreached. No combination
of these technical controls establishes full DORA compliance.
