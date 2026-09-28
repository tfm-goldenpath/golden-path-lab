# Incremental implementation plan

This plan organizes incremental adoption, tasks and completion criteria. Checkboxes distinguish implemented files, observed execution and pending acceptance; one does not imply the others. Current baseline: merged PR #15 at `dd381d3`, published as the **v0.2.0 prerelease**. The next milestone is **Scenario coverage and pilot**, not the campaign itself.

The [modular architecture](docs/EN/architecture.md) separates orchestration, policies and evidence through verifiable contracts.

The [first integrated baseline plan](docs/EN/implementation-plan.md) defines the functional contract and H0–H6 acceptance conditions behind increments 0–3. This checklist tracks implementation and acceptance separately.

## Available increment: L01/L04, F13, local F07 and F11 checks

- [x] Implement `quotes-node`, policies, evidence validators and pinned tools, detailed in increments 0–3.
- [x] Provide `make demo`, `make reference`, CI and manual hosted integration, with digest-based delivery, L01/F13, directed F11 checks and evidence packages.
- [x] Successfully run the included unit and contract tests; keep their scope distinct from real integration.
- [x] Complete an end-to-end lane A execution: `run-8N59m8xw`, L01 admitted and functional, F13 and F11 rejected by their rules, and package verified. This used a local compatibility environment; review by the responsible person and repetition in Codespaces remain pending.
- [x] Observe complete classic-profile lane B, including independent L01 image replacement, in [run 36314305654](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36314305654), commit `4f8fe77`, included in v0.1.0. This does not validate the later bundle profile.
- [x] Implement hosted classic certificate-chain completion from authenticated Fulcio TUF material, preserving root trust and signed content, with regression coverage.
- [x] Observe the corrected chains and results verified in hosted admission in [run 36303967179](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36303967179), commit `1ae111fc6e1614b32ee86461771836ada60e1d42`: F13 correctly rejected, L01 admitted and healthy, F11 correctly denied by Kyverno. The overall run failed because the rejection parser counted kubectl's preamble `to:` as an extra policy; the final legitimate update was not reached.
- [x] Review the downloaded hosted bundle package at `82728c5`: archive checksum, 103 internal hashes and eight independently verified bundles. Preserve that scope in the [review record](registros/pr15_review_EN.md); the latest main-run package still needs its own audit.

Current commands are in the [README](README.md) and [execution guide](docs/EN/cases/L01-F13/runbook.md); the [delivery contracts](docs/EN/delivery-contracts.md) distinguish each lane's guarantees. Executable scenario modules cover L01/L04, F13, local early CI and directed admission F07, and F11 checks. Hosted F07 remains NOT_EXECUTED. Policy tests and cryptographic probes do not complete the twenty scenario records, establish TDD history or constitute pilot measurements.

## 0. Preparation and environment

- [x] Statically review the reference proposal and identify reusable components.
- [x] Identify reusable ideas, incompatibilities with current decisions and automation that should not be copied.
- [x] Organize technical documentation, the template and the incremental plan.
- [x] Define responsibilities, verifiable contracts and modular pipeline organization, with documented technical precedents.
- [x] Pin Node/npm, Docker, Buildx, kind and kubectl, with references and integrity checks.
- [x] Create the devcontainer and environment diagnostic and smoke-test commands.
- [x] Check the configuration and probe with automated tests.
- [x] Define the integrated baseline plan with the proposed quotes-node contract, R/G paths and acceptance criteria.
- [ ] Build and open the devcontainer in Docker Linux or Codespaces.
- [ ] Obtain a real `PASS` from `make smoke-env` and review its evidence.

## 1. Minimum functional baseline

- [x] Implement the minimum `quotes-node` contract: health, version and a deterministic quotation operation using synthetic data, with input-validation and regression tests.
- [x] Separate HTTP transport, validation and functional logic; provide reusable commands with explicit parameters.
- [x] Use pinned Node LTS and `node:test`; retain the dependency-free service's package manifest and lockfile.
- [ ] Link the contract to the operational story and record human acceptance. Preserve available TDD evidence without reconstructing an undocumented red-green history; use test-first changes for subsequent behavior.
- [ ] Confirm initial environment resources and Codespaces quotas if used; add tools according to each increment's needs.
- [x] Build the `linux/amd64` service from verified references and retain its digest; observed integration includes image analysis, deployment and functional checks.
- [x] Prepare kind and dedicated namespaces; exercise healthy creation and independently verified image replacement in L01.
- [x] Implement zot-backed R: publish and pull by digest, deploy to `tfm-reference`, then verify health, version and quotation. The functional demonstration shares its initial image with G; this is not a measured R/G pair.
- [x] Give the service its own Docker context and `.dockerignore`; keep the environment probe separate.

**Outcome:** a tested minimal service and automated R path, with an identified image, a real registry pull and a verified functional response. This does not constitute the complete L01 scenario or pilot completion.

## 2. Early provenance and admission integration

- [x] Implement Kyverno in `tfm-golden` with development-key trust and demonstrate signed delivery plus registry access from the client, node and controller.
- [x] Exercise the isolated **local directed admission** check F07: `run-xFGRe6X1` rejected only the missing independent image signature, restored the original artifact, admitted the identical digest with L01 HTTP/rollout checks, then passed F11 and image replacement. Both successful and failed-run packages were audited; see the [F07 operational record](docs/EN/cases/F07/record.md). Human acceptance remains pending.
- [ ] Complete hosted negative F07/GHCR compatibility. Local early CI and directed acceptance do not establish hosted coverage or campaign measurements.
- [x] Bound the initial hosted F07 investigation: official documentation does not establish precise OCI removal/restoration with the existing workflow token. Prepared an inactive, run-scoped protocol probe and focused regressions; no hosted operation performed. See [findings and prepared commands](docs/EN/cases/F07/hosted-compatibility.md).
- [x] Implement `test/f07-ci-verification-l04`: read-only registry gate, isolated pre-results replacement fault, exact restoration and shared L01/L04 replacement record. See the [L04/early F07 record](docs/EN/cases/L04/record.md) for actual checks and remaining acceptance. Do not expand package permissions or substitute package-version deletion to force hosted F07.
- [x] Observe early CI F07 and shared L01/L04 acceptance in fresh `run-I3PWZFUO`: exact recovery, current-registry verification, admission/rollout/HTTP, preserved F13/directed F07/F11, 278 package hashes and 25 retained gate bundles independently reverified. The earlier guard failure `run-TC8SeiUE` remains archived as FAIL. Full suite: 401 service/unit tests plus environment, policy and real Cosign checks. Human acceptance and hosted gate/L04 execution remain pending.
- [ ] Finalize the relevant scenario records before testing: acceptance of valid provenance, missing provenance F09 and unauthorized origin F10; distinguish partial checks from complete scenarios.
- [x] Prepare pinned Kyverno configuration and root `.github/workflows/` orchestration with repository-specific identities and reusable commands in `implementacion/`. The hosted entry point is manual `workflow_dispatch`, not a reusable `workflow_call` interface.
- [x] Implement image/provenance contracts for format, retrieval, signature, issuer, source, workflow, commit and digest, with positive and negative contract tests.
- [x] Configure hosted permissions/OIDC and observe native provenance consumed by actual Kyverno in the recorded hosted runs. See the migration section for exact revisions and remaining evidence review.
- [ ] Exercise the remaining F09/F10 acceptance/rejection records with matching digests and attributable causes; format, network or API errors do not count as detection.
- [ ] If a material incompatibility appears, document it and assess the BuildKit + Cosign alternative before changing the solution. Do not implement both by default or automatically claim SLSA L3.

**Outcome:** verified critical integration or a specific incompatibility that supports a decision about adaptation. `act` and local signing do not replace this hosted verification.

## 3. Complete controls through small increments

Prepare the scenario record and tests for each behavior first. Include acceptance, rejection and regression checks without postponing testing until the end.

- [x] Exercise lane A with zot, kind and a development key in the documented compatibility environment, keeping its trust model distinct from lane B.
- [ ] Exercise compatible workflow portions with `act` and record their limits; local signing and `act` do not establish hosted OIDC behavior.
- [x] Add Conftest workflow/manifest policies, legitimate inputs and independently mutated policy fixtures; exercise early and directed F11 rejection.
- [ ] Complete operational F01/F02/F11/F12 records and remaining injections. Test F01 as configuration without enabling privileged execution of untrusted code.
- [ ] Assess optional local hooks once the preceding commands work and have tests. Introduce them only for useful early feedback; mandatory controls remain in CI, and skipping a hook must not bypass them. Hooks are not a pilot prerequisite.
- [x] Integrate Trivy with separate original CycloneDX JSON and real scan reports, tool/database identification, synthetic policy tests and observed image scans.
- [ ] Complete full SBOM schema validation; current checks validate selected contract fields, not full schema or inventory completeness.
- [ ] Prepare real inputs for F03/F04/L02, giving flexible priority to a direct production Node dependency for F03. Confirm severity, fix availability and a functional upgrade before fixing the scenario.
- [x] Sign and verify image/SBOM bundles with explicit identity, predicate, content and digest checks; retain actual cryptographic negative probes, including signature-byte alteration.
- [ ] Complete operational F05–F08, including hosted negative F07 and well-formed altered-signature F08; local directed admission passed in `run-xFGRe6X1`. Synthetic cryptographic probes do not complete these scenario executions.
- [x] Issue a signed versioned results predicate only after successful mandatory pre-admission controls, retain report hashes and record the later admission response separately.
- [x] Implement direct admission and results checks for the protected namespace and selected CREATE/UPDATE operations; observe L01/F13 and F11 in the recorded integrations.
- [ ] Complete remaining F13/F14 operational acceptance and scope checks; retain the same-digest positive control and distinguish attributable rejection from operational failure.
- [x] Test image, SBOM, scan, provenance, results and decision contracts, including unauthorized identity/key, wrong digest, unsuccessful results, unsupported types and missing fields at their documented test levels.
- [ ] Complete remaining live negative guarantees and link each to its evidence; parser, policy-construction and offline cryptographic tests cannot substitute for admission checks.
- [ ] Check properties shared by Conftest and Kyverno with consistent inputs and expectations adapted to each tool; do not assume equivalence merely because rule names match.
- [x] Test mandatory-stage failure propagation and implement directed F11/F13 checks with strict rejection attribution; retain operational tests separately from the corpus count.
- [ ] Complete the remaining directed barriers and operational failures in the scenario records, including F07/F09/F10. Do not infer a later barrier was reached from an earlier rejection.

**Outcome:** a complete verifiable path with the selected controls and observable causes of acceptance/rejection. Favorable results for every scenario in the future corpus are not required.

## 4. Next milestone: Scenario coverage and pilot

Use small PRs in this order; sections 1–3 retain the detailed control and acceptance gaps. The thesis already defines F01–F14/L01–L06: operationalize that catalogue rather than creating a second academic catalogue.

- [x] **1. Prepare lightweight AI collaboration guidance:** `AGENTS.md`, Copilot instructions, one scenario-change skill, `CONTRIBUTING.md`, PR template, [EN/ES guidance](docs/EN/ai-assisted-development.md) and CI triggers covering their changes. Files are prepared locally; runtime loading and human review remain below.
- [ ] Verify instruction/skill loading in the intended tools and record human review of the guidance; file availability alone does not establish runtime behavior or approval.
- [ ] **2. Fix operational records and close migration acceptance:** complete the 20 records in one catalogue using the [template](templates/ficha_escenario.md) and the identified thesis revision. Set actor capabilities, injection, expected detection phase, latest blocking point and evidence before measurement; review the [F07/L04 CI increment](docs/EN/cases/L04/record.md); hosted F07 remains gated on GHCR compatibility.
- [ ] **3. Complete control-family PRs:** evidence/provenance/results, workflow/runtime, then real vulnerability/remediation inputs, with legitimate counterparts and attributable negative cases. Reuse existing L01/F11/F13 modules and policy tests; complete all twenty operational cases without counting directed checks as extra scenarios.
- [ ] **4. Implement the paired R/G runner and measurement:** use the same legitimate path, resources, platform and frozen source revision, with explicit retained controls and separate comparable builds. Replace the old fault-driver approach with actual alterations and structured causes; no generic error matching or automatic administrative merges.
- [ ] Identify tool, policy, image and vulnerability database versions and comparable cache conditions. Record infrastructure preparation separately from the main measurement interval.
- [ ] Check result classification: valid favorable/unfavorable, invalid for an evidenced cause, or indeterminate. Apply one retry to evidenced external failures according to the protocol without removing unfavorable results.
- [ ] Verify measurement of total time to the admission response, phases, detection and blocking. Distinguish elapsed time from summed job minutes and applicable monetary cost.
- [ ] Extend existing Actions artifacts and checksummed packages to measurement data, associate the reviewed package with its release, and preserve a local copy outside Codespaces. Verify download and table reconstruction; current functional archives do not contain campaign measurements.
- [ ] Document disclosure risks associated with SBOMs, vulnerabilities and logs; review the files to be shared. Do not add encryption or a custody service.
- [ ] **5. Run four pilot pairs** in a balanced random order and keep their data separate. Review the provisional ten campaign pairs based on the pilot.
- [ ] Calibrate the six manual tasks: F03/F10/F11 in R/G, conventional tools during measurement, equal per-scenario limits in both configurations and an approximately balanced order.
- [ ] **6. Review and close the pilot**, then freeze the campaign candidate, provisionally **v0.3.0**. Require operational readiness and traceability; fix instrumentation defects that prevent interpretation, while preserving genuine control failures as unfavorable results.

**Outcome:** an executable, interpretable protocol with identified versions and preservable data. Perfect detection and satisfaction of a fixed time threshold are not required.

## 5. Campaign and documentation completion

- [ ] Fix versions, corpus, execution order and revised parameters before the campaign.
- [ ] Run the campaign and evaluate subsequent corrections separately.
- [ ] Analyze overhead, detection, blocking, manual tasks and Actions consumption using observed costs and benefits; state the laboratory and sample-size limitations.
- [ ] Relate European insurance-sector needs to controls, scenarios, evidence and limitations. Do not treat a documentary mapping as compliance certification.
- [ ] Integrate design, implementation, results and review evidence into the thesis.

## Bundle migration: observed integration and remaining acceptance

- [x] Preserve v0.1.0 and prepare `feat/cosign-bundles` with default Cosign bundles, predicate-specific verification and Kyverno `SigstoreBundle` consumers. Keep the pinned versions.
- [x] Preserve distinct local and hosted trust profiles, raw bundles, public verification material, verifier outputs and EN/ES documentation.
- [x] Require strict OCI referrer retrieval before attributing missing results; unreadable evidence and changing inventories are integration failures.
- [x] Run regression and actual Cosign cryptographic checks, including SBOM/results substitution, altered signatures, wrong digests and unauthorized development keys.
- [x] Record a fresh local end-to-end run with strict retrieval, F13/F11 attribution, L01 creation and independent image replacement, and verified archive checksums: [run-De88fpWy](registros/cosign_bundles_validation_EN.md), on the documented cgroup-v1 compatibility host. This is not a campaign measurement.
- [x] Run and review the published migration branch in real GitHub Actions at `82728c5`: [run 36321115827](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36321115827), including native provenance, exact identity, certificate/SCT, transparency and L01/F13/F11. See the [review record](registros/pr15_review_EN.md); later source corrections require their own run.
- [x] Merge PR #15 into `main` at `dd381d3` and publish the [v0.2.0 prerelease](https://github.com/tfm-goldenpath/golden-path-lab/releases/tag/v0.2.0). Release availability does not close the remaining acceptance checks.
- [x] Observe all steps successful in main [run 36332256483](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36332256483) at `dd381d3`, with artifact `golden-path-36332256483-1` available. This is hosted integration of the merged review corrections, not a local repeat or a package-content audit.
- [ ] Download, preserve and audit that exact main-run package: verify its checksum, internal hashes, bundle verification, F13 consistency report and L01 replacement evidence; record the observed result and synchronize current-status paragraphs in migration/runbooks while preserving historical observations.
- [ ] Repeat affected local integration on the adopted revision and retain its environment and evidence. Earlier compatibility runs do not establish current local or Codespaces acceptance.
- [ ] Complete the remaining directed admission checks in the [migration acceptance list](docs/EN/cosign-bundle-migration.md), including valid attestations without the independent image-signature predicate. Cryptographic and policy-construction tests alone do not complete these live checks.
- [ ] Review the remaining migration acceptance with the responsible person and carry affected checks into pilot validation before campaign freeze.

The [migration guide](docs/EN/cosign-bundle-migration.md) ([Spanish](docs/ES/cosign-bundle-migration.md)) retains the classic compatibility history. Run R/G from the same frozen revision; R omits the declared additional controls. Do not pool classic development timings with bundle campaign measurements. Kyverno's deprecated policy API remains separate future work; the classic chain helper is inactive historical support, whose removal should be assessed after the remaining acceptance review.

## Extensions, only after completing and reviewing the baseline

The proposed order prioritizes additional coverage of the prototype's guarantees, the consequences of incorrect acceptance and preparation effort. It is not an industry attack-frequency ranking. Unit or integration tests needed to support guarantees already claimed belong to the baseline; the extension consists of turning these conditions into independent measured scenarios in a later campaign.

| Priority | Campaign extension | Rationale |
|---|---|---|
| 1 | Valid signature from an unauthorized identity. | Isolates authorization from cryptographic validity; complements F08 and F10 without automatically attributing this coverage to them. |
| 2 | Authentic attestation with an unsuccessful result while keeping the image and policy correct. | Checks that signed evidence does not authorize merely because it is authentic. Preparing test evidence does not change the rule that issues real authorization only after successful results. |
| 3 | Signed attestation with an unsupported predicate type or schema. | Isolates contract interpretation from issuer authenticity and artifact identity. |
| 4 | Authentic signature for another image, as an extension of F08. | Examines correspondence with the delivered object while keeping the signature valid in its original context. |
| 5 | SBOM that omits a known component. | Adds semantic inventory quality; requires an independent reference and goes beyond the current authenticity and association checks. |

The cryptographic basis for extensions 1 and 4 is documented in the [Cosign verification documentation](https://docs.sigstore.dev/cosign/verifying/verify/). The pilot will review whether the planned tests provide distinguishable information and an attributable rejection reason.

Java, ARM, additional trusted providers, SARIF and Dependency Review, malware/secret detection and remediation assistance, code mutation and extended observability may be considered afterwards. These extend portability, capabilities or use of results and have their own requirements. Syft + Grype remains a documented alternative if Trivy proves unsuitable during the pilot, without a mandatory execution comparison.

## Lightweight tracking

Use existing stories as the primary record, a suggested work-in-progress limit of two tasks and a brief decision/evidence note when relevant. Do not create an hourly diary or duplicate results in this TODO. Mark a task complete only when the evidence specified by its outcome condition exists.
