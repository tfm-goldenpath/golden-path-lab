# Incremental implementation plan

This plan organizes incremental adoption, tasks and completion criteria. Checkboxes distinguish implemented files, observed execution and pending acceptance; one does not imply the others. Current baseline: merged PR #15 at `dd381d3`, published as the **v0.2.0 prerelease**. The next milestone is **Scenario coverage and pilot**, not the campaign itself.

The [modular architecture](docs/EN/architecture.md) separates orchestration, policies and evidence through verifiable contracts.

The [first integrated baseline plan](docs/EN/implementation-plan.md) defines the functional contract and H0–H6 acceptance conditions behind increments 0–3. This checklist tracks implementation and acceptance separately.

## Current paired lane B pilot status

- [x] Independently review development RG `36926824792` and GR `36927943550` at `02674a57d290083648a9af44c48fd049808b2d70`: original ZIP/outer/internal/database hashes, eight unique authenticated bundles, independent images/caches, fresh CREATE, rollout/HTTP, timing endpoints and cleanup pass. G provenance runs only in G's position; GR correctly skips the second-position native step. See the [EN](docs/EN/paired-rg-pilot-review.md) / [ES](docs/ES/paired-rg-pilot-review.md) review.
- [x] Record completed development job consumption on separate analysis copies: 5.650 and 5.983 minutes. Keep development runs outside the pilot sample and preserve historical preparation failure `36924958484`.
- [x] Execute and independently review the four authorized pilot pairs GR/GR/RG/RG: `36964061878`, `36964593732`, `36965104583`, `36965606734`. Each used the exact source and `database_run=36926824792`; each artifact was reviewed before the next dispatch. Remote `main` matched before all four launches and after the series. Preserve the initial HTTP 403 launch request, which created no job; saved-user authentication resolved access without bypassing guards or retrying a pair.
- [x] Verify the pilot's four ZIP digests, 140 outer/808 internal package hashes, four database archives/12 internal hashes, eight independent images, 16 unique authenticated bundles, cache reuse/rebuild, fresh CREATE, rollout/HTTP, timing endpoints and cleanup. All four attempts are valid-favorable; 4 included, 0 excluded/incomplete, 0 retries. No slow observation was discarded.
- [x] Analyze all four pilot attempts together: median G−R 55.339 s, median relative overhead 908.023%, difference MAD 6.759 s and range 44.494–62.124 s; 22.050 observed Actions job minutes. Billed minutes and monetary expenditure remain unknown. See the linked EN/ES report and local JSON/CSV analysis.
- [x] Break down G's phases and Deployment admission from all four retained attempts. Delivery verification and results authorization account for 58.4% of G's primary time; individual admission evidence checks average 1.86–2.01 s. The EN/ES report recommends finer operation timing and evaluating bounded parallel verification in a separate reviewed revision; savings remain unmeasured.
- [ ] Download the prepared `evidence/measurements/pilot-review/` folder outside Codespaces. Original ZIPs, extracted originals, metadata/logs and separate analysis copies are retained locally; external preservation awaits the user's download.
- [ ] Human decision on the provisional ten campaign pairs. The review recommends retaining ten balanced pairs for an exploratory comparison, with observed variability and a rough 52.5–58.3 job-minute extrapolation for ten equivalent timing runs. This does not establish required precision or total campaign effort.
- [ ] Close the overall pilot after separate manual-task calibration, scenario readiness review and human acceptance. The automated timing series is complete; overall pilot acceptance remains pending. Campaign remains NOT_EXECUTED. Assistance: OpenAI Codex / GPT-6. Historical entries below retain the observations of their original increments.

## Current manual task calibration procedure

- [x] Implement a human-operated lane A interface for independent F03/F10/F11 tasks in R/G: prepare, start, activity events, conventional tool invocation, completion check, interruption recovery and cleanup. Reuse the shared modules through `demo.sh`; preserve controls and the completed lane B pilot. See the [EN](docs/EN/manual-task-calibration.md) / [ES](docs/ES/manual-task-calibration.md) operator guides and separate participant instructions.
- [x] Retain versioned task/event records, source/configuration/database identities, attributed automatic/manual detection, active diagnosis/correction, waiting and verification, incomplete attempts and safe packages under ignored evidence directories. Distinguish detection latency, resolution since detection and total duration; window exhaustion is censored, never a zero time.
- [x] Prepare a reproducible six-task plan with seed and a randomized two-pairs/one-pair RG/GR balance. Calibration and measurement records remain separate; scenario limits start unset and require completed real human calibrations and an explicit review before freezing one equal R/G limit per scenario.
- [x] Verify synthetic event ordering, clocks, interruptions, subprocess deadlines, timing calculations, six-position ordering, input restoration, source/build guards and evidence retention at `1b06e01`. Shared `make test` passed: 896 service/unit cases (including the wrapper for 29 synthetic Python manual-task cases), six environment cases, 43 Python policy cases, Conftest/Kyverno, offline Cosign and workflow checks. These establish instrumentation and control behavior, not human calibration or live task execution. Initial local `doctor` rejected kubectl 1.37.0 against pinned 1.35.8. Logs: `evidence/raw/manual-task-development/`.
- [x] Align the Codespace's installed tools with existing repository pins; `doctor` now passes. Preserve the initial failure above and the environment evidence in `evidence/environment/doctor-alignment-4qhIRRLp/`. This environment repair changes no repository tool version or control.
- [x] Confirm and address [Copilot's PR #40 finding](https://github.com/tfm-goldenpath/golden-path-lab/pull/40#discussion_r4169081711): completion checks now require an explicit decision with matching evidence to continue an unresolved correction; integration/evaluator failures close the attempt as `INCOMPLETE`. Follow-up `make test` passes: 905 service/unit cases (including the wrapper for 29 synthetic Python manual-task cases), six environment cases, 43 Python policy cases, Conftest/Kyverno, offline Cosign and workflow checks; `doctor` passes. Preserve the reproduced failures and subsequent synthetic regression logs in `evidence/raw/manual-task-copilot-review/`. Contribution: GitHub Copilot automated review (model not disclosed); OpenAI Codex / GPT-6 implementation, tests and EN/ES documentation. Human review and final acceptance remain pending.
- [ ] Validate the new harness in the pinned lane A environment, then have a person calibrate all six tasks using conventional tools, declare prior knowledge/learning effects and retain every attempt. No human observations or durations were generated by the assistant.
- [ ] Choose and freeze the three total-duration limits from that calibration, review scenario readiness and human acceptance, and separately authorize any measured session. The overall pilot remains open; this increment does not run the campaign, change tool versions or optimize signing/verification. Assistance: OpenAI Codex / GPT-6; human review pending.

## Available increment: L01/L04, F13, local F07/F08 and F11 checks

- [x] Implement `quotes-node`, policies, evidence validators and pinned tools, detailed in increments 0–3.
- [x] Provide `make demo`, `make reference`, CI and manual hosted integration, with digest-based delivery, L01/F13, directed F11 checks and evidence packages.
- [x] Successfully run the included unit and contract tests; keep their scope distinct from real integration.
- [x] Complete an end-to-end lane A execution: `run-8N59m8xw`, L01 admitted and functional, F13 and F11 rejected by their rules, and package verified. This used a local compatibility environment; review by the responsible person and repetition in Codespaces remain pending.
- [x] Observe complete classic-profile lane B, including independent L01 image replacement, in [run 36314305654](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36314305654), commit `4f8fe77`, included in v0.1.0. This does not validate the later bundle profile.
- [x] Implement hosted classic certificate-chain completion from authenticated Fulcio TUF material, preserving root trust and signed content, with regression coverage.
- [x] Observe the corrected chains and results verified in hosted admission in [run 36303967179](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36303967179), commit `1ae111fc6e1614b32ee86461771836ada60e1d42`: F13 correctly rejected, L01 admitted and healthy, F11 correctly denied by Kyverno. The overall run failed because the rejection parser counted kubectl's preamble `to:` as an extra policy; the final legitimate update was not reached.
- [x] Review the downloaded hosted bundle package at `82728c5`: archive checksum, 103 internal hashes and eight independently verified bundles. Preserve that scope in the [review record](registros/pr15_review_EN.md); the latest main-run package still needs its own audit.

Current commands are in the [README](README.md) and [execution guide](docs/EN/cases/L01-F13/runbook.md); the [delivery contracts](docs/EN/delivery-contracts.md) distinguish each lane's guarantees. Executable scenario modules cover L01/L04, F13, local early CI and directed admission F07/F08, and F11 checks. Hosted F07/F08 remain NOT_EXECUTED. Policy tests and cryptographic probes do not complete the twenty scenario records, establish TDD history or constitute pilot measurements.

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
- [x] Complete operational F01/F02 static records and inert injections; see the workflow family below.
- [x] Implement F11/F12 runtime records and manifest injections with shared L06 checks; supplied hosted review and pending local validation are recorded below.
- [ ] Assess optional local hooks once the preceding commands work and have tests. Introduce them only for useful early feedback; mandatory controls remain in CI, and skipping a hook must not bypass them. Hooks are not a pilot prerequisite.
- [x] Integrate Trivy with separate original CycloneDX JSON and real scan reports, tool/database identification, synthetic policy tests and observed image scans.
- [x] Implement offline official CycloneDX 1.7 JSON Schema validation before signing and after authenticating the exact bundle; retain separate lab checks and reports. This does not establish inventory completeness.
- [ ] Confirm the selected F03/F04/L02 package fixtures in real images. Direct production npm candidates, package scans, inventories and harmless compatibility checks are prepared; image-level severity, remediation and service compatibility remain pending in the new family record.
- [x] Sign and verify image/SBOM bundles with explicit identity, predicate, content and digest checks; retain actual cryptographic negative probes, including signature-byte alteration.
- [ ] Complete operational F05–F08, including hosted negative F07/F08; local F07 passed in `run-xFGRe6X1` and controlled F08 CI/admission passed in `run-IIWR8RLL` (see the F08 record). Synthetic cryptographic probes do not complete these scenario executions.
- [x] Issue a signed versioned results predicate only after successful mandatory pre-admission controls, retain report hashes and record the later admission response separately.
- [x] Implement direct admission and results checks for the protected namespace and selected CREATE/UPDATE operations; observe L01/F13 and F11 in the recorded integrations.
- [ ] Complete remaining F13/F14 operational acceptance and scope checks; retain the same-digest positive control and distinguish attributable rejection from operational failure.
- [x] Test image, SBOM, scan, provenance, results and decision contracts, including unauthorized identity/key, wrong digest, unsuccessful results, unsupported types and missing fields at their documented test levels.
- [ ] Complete remaining live negative guarantees and link each to its evidence; parser, policy-construction and offline cryptographic tests cannot substitute for admission checks.
- [ ] Check properties shared by Conftest and Kyverno with consistent inputs and expectations adapted to each tool; do not assume equivalence merely because rule names match.
- [x] Test mandatory-stage failure propagation and implement directed F11/F13 checks with strict rejection attribution; retain operational tests separately from the corpus count.
- [ ] Complete the remaining directed barriers and operational failures in the scenario records, including F07/F09/F10. Do not infer a later barrier was reached from an earlier rejection.

**Outcome:** a complete verifiable path with the selected controls and observable causes of acceptance/rejection. Favorable results for every scenario in the future corpus are not required.

## F08 bounded increment

- [x] Fix the [F08 operational oracle](docs/EN/cases/F08/record.md) on base `1369a0c`, then implement local signature-only OCI replacement, fresh CI attribution, guarded recovery and directed admission using shared L04.
- [x] Retain and audit fresh local F08 `run-IIWR8RLL`: CI and directed Kyverno rejection, exact recovery and shared L04 acceptance; 452 package hashes, 44 valid bundles and two rejected variants audited. Preserve DNS-failed `run-lnUGtdTB` (12 hashes audited). Final suite: 443 service/unit tests plus environment, policy and Cosign checks; see the F08 record.
- [ ] Human review and final acceptance of F08.
- [ ] Retain a successful hosted normal gate/L04 run and audit its evidence before closing hosted acceptance. Hosted negative F07 and F08 remain **NOT_EXECUTED**, with no new mutation permissions or workflow activation.

## 4. Next milestone: Scenario coverage and pilot

Use small PRs in this order; sections 1–3 retain the detailed control and acceptance gaps. The thesis already defines F01–F14/L01–L06: operationalize that catalogue rather than creating a second academic catalogue.

- [x] **1. Prepare lightweight AI collaboration guidance:** `AGENTS.md`, Copilot instructions, one scenario-change skill, `CONTRIBUTING.md`, PR template, [EN/ES guidance](docs/EN/ai-assisted-development.md) and CI triggers covering their changes. Files are prepared locally; runtime loading and human review remain below.
- [ ] Verify instruction/skill loading in the intended tools and record human review of the guidance; file availability alone does not establish runtime behavior or approval.
- [ ] **2. Fix operational records and close migration acceptance:** complete the 20 records in one catalogue using the [template](templates/ficha_escenario.md) and the identified thesis revision. Set actor capabilities, injection, expected detection phase, latest blocking point and evidence before measurement; review the [F07/L04 CI increment](docs/EN/cases/L04/record.md); hosted F07 remains gated on GHCR compatibility.
- [ ] **3. Complete control-family PRs:** evidence/provenance/results, workflow/runtime, then real vulnerability/remediation inputs, with legitimate counterparts and attributable negative cases. Reuse existing L01/F11/F13 modules and policy tests; complete all twenty operational cases without counting directed checks as extra scenarios.
- [x] **4. Implement paired R/G instrumentation:** one independent legitimate delivery per arm, exact lane B workflow trust, prepared isolated caches, persisted timing and safe evidence. See the [protocol](docs/EN/paired-rg-measurements.md) and [completed automated timing pilot review](docs/EN/paired-rg-pilot-review.md). Manual calibration, scenario readiness and human acceptance remain separate.
- [ ] Identify tool, policy, image and vulnerability database versions and comparable cache conditions. Record infrastructure preparation separately from the main measurement interval.
- [ ] Check result classification: valid favorable/unfavorable, invalid for an evidenced cause, or indeterminate. Apply one retry to evidenced external failures according to the protocol without removing unfavorable results.
- [ ] Verify measurement of total time to the admission response, phases, detection and blocking. Distinguish elapsed time from summed job minutes and applicable monetary cost.
- [ ] Extend existing Actions artifacts and checksummed packages to measurement data, associate the reviewed package with its release, and preserve a local copy outside Codespaces. Verify download and table reconstruction; current functional archives do not contain campaign measurements.
- [ ] Document disclosure risks associated with SBOMs, vulnerabilities and logs; review the files to be shared. Do not add encryption or a custody service.
- [x] **5. Run four timing pilot pairs** in the stored balanced GR/GR/RG/RG order and keep them separate from development. All four attempts are included in the [review](docs/EN/paired-rg-pilot-review.md); its recommendation keeps ten campaign pairs provisional pending a human decision.
- [ ] Calibrate the six manual tasks: F03/F10/F11 in R/G, conventional tools during measurement, equal per-scenario limits in both configurations and an approximately balanced order.
- [x] Implement the [supporting lane A procedure](docs/EN/manual-task-calibration.md), with operator/participant separation and synthetic instrumentation checks. Actual calibration and the resulting limits remain pending above.
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

## F05 / F06 / L03 bounded increment

- [x] Fix operational records on base `b380836f0264698c0cdd8e5e8f750427def63761` using supplied approved oracles and the locally available academic catalogue.
- [x] Implement pinned offline schema validation, isolated local SBOM faults, early mismatch evidence, recovery, and a real pinned L03 component fixture.
- [x] Pass the full suite and independently observe real host-built L03 images, Trivy component difference, schema validity, unchanged vulnerability policy and offline digest-bound SBOM signatures; audit the 35-file supplementary archive.
- [x] Complete fresh local registry/admission integration in `run-nWpDa9ZN`: F05/F06 CI and directed SBOM admission rejection, exact recovery, and shared L01/L03/L04 acceptance. Audited 776 package hashes, 108 valid bundles and two expected F08 rejections. The approved temporary kind-forwarding rules were removed; failed runs remain preserved. See [per-boundary observations](registros/f05_f06_l03_validation_EN.md).
- [ ] Human review and final acceptance.
- [ ] Hosted normal delivery validation on reviewed source; hosted negative F05/F06 remain **NOT_EXECUTED**.

See the [EN procedure](docs/EN/cases/F05-F06-L03/runbook.md) and [ES procedure](docs/ES/cases/F05-F06-L03/runbook.md). L01/L03/L04 share one execution, with no additional campaign observations.

## F09 / F10 / L05 bounded increment

- [x] Define the [operational oracle](docs/EN/cases/F09-F10-L05/record.md) and initial failing contract/gate checks before implementing on base `38631e1`.
- [x] Align explicit provenance repository, revision, build type and builder requirements in CI/admission; add isolated local F09/F10 preparation, attribution and exact recovery.
- [x] Add opt-in L05 using two explicit immutable main-history commits, actual exported application source, separate tests/builds/evidence and exact revision authorization.
- [ ] Complete and review fresh local F09/F10 CI and directed admission plus L05 rollout/HTTP. Consult the [validation record](registros/f09_f10_l05_validation_EN.md) for actual results and outstanding boundaries.
- [x] Retain and audit the [main `80c12bc` local preflight](registros/f09_f10_l05_integration_validation_EN.md): distinct source pair exported; environment pins and real BuildKit DNS failed. Diagnostic checksum and 15 internal hashes verified. No full demo launched; rejection/recovery, both L05 deliveries and update/restart remain **NOT_EXECUTED**.
- [ ] Demonstrate hosted L05 across two authorized actual Actions run revisions and audit both packages. Hosted F09/F10 negatives remain **NOT_EXECUTED**.
- [x] Address the five PR #24 comments locally and audit the supplied CI/hosted logs and package; see the [review record](registros/pr24_review_EN.md). Hosted run `36631562615` checked baseline `38631e1`, not PR head `d337a3c` or the review fixes.
- [ ] Human review and final acceptance; no campaign measurements claimed.

## Merged-run admission readiness correction

- [x] Reproduce the readiness regression and implement initial/update separation, current Pod/endpoint checks, explicit logs and server dry-run; see the [record](registros/kyverno_readiness_fix_EN.md).
- [ ] Complete readiness validation: user reports hosted `36640544300` passed normal delivery/initial readiness at `80c12bc`; not independently audited in this follow-up. L05 policy update/restart remains **NOT_EXECUTED** after the blocked local preflight. Failed run `36636319864` attempts 1/2 remain integration errors, not F13 detections.

## F13/F14 results authorization

- [x] Define post-issuance F13 removal, authentic laboratory P0 replay F14 and same-digest L01 recovery; preserve separate preissuance F13/readiness checks. See [oracle](docs/EN/cases/F13-F14/record.md).
- [x] Add fresh authorized CI attribution, fixed P1 agreement with Kyverno, isolated owned-registry trials, exact recovery and evidence packaging; retain the custom versioned results predicate.
- [x] Add actual-function regressions and real offline P0 signing/authentication probes. See [verification record](registros/f13_f14_results_authorization_EN.md).
- [ ] Execute local F13/F14 CI, directed admission and same-digest recovery in the pinned devcontainer; npm is now pinned to 11.19.0, but the retry stops at kubectl v1.37.0 versus v1.35.8; Docker and Buildx also differ from their pins. Historical BuildKit DNS blocker is not retested. See [commands](docs/EN/cases/F13-F14/runbook.md).
- [ ] Hosted negative trials remain NOT_EXECUTED; no GHCR mutation permissions added.
- [ ] Human review and final acceptance. PR #26's F09/F10/L05 gaps remain open; no campaign measurements or VSA-conformance claim.

## PR #27 hosted OIDC response failure

- [x] Audit hosted `36741081776` at `d39086c`: initial delivery, preissuance F13, L01 and directed F11 reached their expected observations; replacement signing failed while parsing the GitHub OIDC response. Verify package checksum and 153 internal hashes. See [record](registros/pr27_hosted_oidc_failure_EN.md).
- [x] Add a bounded retry only for malformed ambient-OIDC responses before signing, retain attempts, and preserve mandatory verification and failure propagation.
- [ ] Audit the user-reported successful hosted run `36746422169` at `d66d223` and complete human review. Hosted F13/F14 negatives were skipped; the failed run does not establish their coverage.

## F01 / F02 static workflow family

- [x] Define the [operational oracle](docs/EN/cases/F01-F02/record.md) on main `d66d223`; retain the L01 workflow-only counterpart and inert inputs outside active workflows.
- [x] Add a shared pinned Conftest evaluator, exact diagnostic attribution, isolated alterations, evidence and ordinary CI execution while preserving checks of actual workflows.
- [x] Correct event lookup for the pinned YAML parser's unquoted `on` → `true` representation. Keep Action-reference scope unchanged.
- [x] Observe actual static L01 acceptance and isolated F01/F02 rejection; retain the initial unexpected F01 acceptance and subsequent checks in the [validation record](registros/f01_f02_workflows_EN.md).
- [ ] Human review and final acceptance; no campaign measurements or new complete delivery execution.

User-provided context reports hosted run `36746422169` succeeded at `d66d223` after
the OIDC correction. This increment does not independently audit that package.
Hosted F13/F14 negatives were skipped; F09/F10/L05 and F13/F14 live gaps remain
open. F11/F12/L06 runtime work is outside this increment.


## F11 / F12 / L06 runtime family

- [x] Define the [operation matrix and oracle](docs/EN/cases/F11-F12-L06/record.md) on main `d864654`; retain coordinated API-valid F11 fields and exact structured diagnostics.
- [x] Persist the original build tag, resolve it read-only around F12 trials and preserve digest authentication, repository restriction and disabled automatic conversion.
- [x] Add Deployment CREATE/legal template UPDATE and isolated Pod CREATE trials; prove NotFound or unchanged UID/generation/spec after rejection. Share L01 creation with L06 and require a real annotation update, rollout, Ready Pods and HTTP.
- [x] Add function, state, tag, packaging and real policy regressions; wire both lanes through shared modules without new permissions. See [checks, evidence and commands](docs/EN/cases/F11-F12-L06/runbook.md).
- [ ] Execute local runtime admission in the pinned environment: doctor still stops at kubectl v1.37.0 versus v1.35.8. Smoke/BuildKit/demo were not reached; the previous network blocker is not resolved by this work.
- [x] Record the user-supplied review of hosted `36768108684` for the runtime increment merged at `eed5aad2828a7156e4c49bf2e2f3d9c2b0476137`: 449 verified internal hashes, eight authenticated original/replacement bundles, attributable F11/F12 and successful L06. This increment did not independently repeat that audit. Local validation remains pending; historical observations and F09/F10/L05, F13/F14 gaps are preserved.
- [ ] Human review and final acceptance. Preserve F09/F10/L05 and F13/F14 live gaps; shared observations do not change the twenty-scenario denominator.

## F03 / F04 / L02 vulnerability family

- [x] Define post-build oracles and isolated npm candidates; real filesystem scans confirm the target CRITICAL/HIGH/MEDIUM findings and minimist target removal. See [record](docs/EN/cases/F03-F04-L02/record.md).
- [x] Implement original image SBOM → real Trivy SBOM scan → production Conftest with image association, frozen DB checks, strict target attribution and separate positive authorization.
- [x] Add local `make vulnerabilities`, isolated build contexts/locks, function regressions and explicit package directories; normal hosted delivery remains the regression path.
- [x] Complete and independently audit real fixture image scans, F03 reference HTTP comparison and positive admission/rollout/HTTP in lane A run `36881119588` at `b8eb603e7965e4d58cc9f58ec78f74971944a547`. Local Codespaces doctor still rejects kubectl 1.37.0 versus 1.35.8; preserve that separate blocker.
- [ ] Run normal hosted regression for the changed analysis sequence after separate publication/dispatch authorization. Additional hosted F03/F04/L02 execution is unsupported and NOT_EXECUTED.
- [ ] Human review and final acceptance. No campaign measurements or change to the twenty-scenario denominator.

## Reproducible lane A integration validation

- [x] Add independent demo + opt-in L05 and vulnerability suites through shared Make/Python orchestration and a manual devcontainer workflow. Retain read-only permissions, full-SHA actions, unpersisted checkout credentials and disabled remote image publication. See [EN](docs/EN/lane-a-validation.md) / [ES](docs/ES/lane-a-validation.md).
- [x] Record a fetched local `main` in disposable Actions checkouts and retain the fixed L05 source pair; preserve existing ancestry/source checks.
- [x] Add prerequisite stopping, effective versions, shared checks, smoke and the bounded delivery-configured BuildKit probe, with original failure status and owned-builder cleanup.
- [x] Add required-result audits and safe evidence retention, including separate allowlisted archives of each frozen Trivy database and explicit drift failures. Regression fixtures are synthetic, not integration evidence.
- [x] Attempt both local entrypoints. Initial PATH lacked kind; retries using the existing `.tools/bin` stop at doctor: kubectl v1.37.0 versus v1.35.8. Both retain original Make status 2 and retention status 0 in `evidence/lane-a/local-{demo,vulnerabilities}-tools`. No tool pins, networking or trust were changed.
- [x] Run shared checks with the existing `.tools/bin` on PATH: environment tests, 823 service/unit tests, 43 Python policy tests, real Conftest/Kyverno checks, offline Cosign checks and F01/F02 static trials pass. Initial shared attempt without that PATH failed five evaluator tests; both logs are preserved in `evidence/raw/lane-a-development/`. Final focused runner/audit regressions also pass.
- [x] Complete both functional suites in the pinned environment: independently reviewed lane A run `36881119588` passes smoke, BuildKit, real image scans, admission and both L05 deliveries. The original increment was prerequisite-blocked; preserve its historical local failures. Human acceptance remains separate below.
- [x] Validate the merged manual workflow on ephemeral runners in `36881119588`: demo and vulnerabilities both PASS at `b8eb603`. The assistant reviewed this user-supplied run without dispatching another. Lane A does not establish hosted OIDC/GHCR mutation coverage.
- [ ] Human launcher/source review and final acceptance. Assistance: OpenAI Codex / GPT-6; see the linked runbook. No campaign measurements or change to the twenty-scenario denominator.

### Lane A first runner attempt and parser regression

- [x] Independently inspect run [36829165325](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36829165325) at `6b9e303`: both devcontainers and doctor pass; shared tests fail on undeclared PyYAML in the new workflow test. Verify 28 artifact hashes per suite; scenarios NOT_EXECUTED and databases NOT_CREATED.
- [x] Reproduce with Python site packages disabled; replace the test's PyYAML import with the existing pinned Conftest parser and enforce `python3 -S` in its Node wrapper. Focused regression passes without changing environment/tool pins or acceptance assertions.
- [x] Full shared suite passes after the fix: 825 service/unit tests, 43 Python policy tests, 62 Conftest decisions, Kyverno, offline Cosign and static F01/F02. Log: `evidence/raw/lane-a-run-36829165325/shared-tests-fix.log`.
- [ ] Rerun remotely after review/publication authorization and complete actual scenario acceptance. No assistant dispatch; historical local blockers remain. See the EN/ES validation guide for retained evidence. AI assistance: OpenAI Codex / GPT-6; human review pending.

### Lane A run 36830599263: fresh directed admission

- [x] Inspect run `36830599263` at `5255c7f`: both suites pass doctor/shared tests/smoke/BuildKit. Vulnerabilities finishes with all required boundaries PASS, including F03 remediation, real image scans and repaired/L02 admission/rollout/HTTP. Inspect originals and verify 348 internal package hashes plus the frozen DB archive; independent reauthentication of every bundle was not repeated.
- [x] Preserve demo failure: postissuance F13 rejects and recovers; F14 CI detects P0 but admission returns `quotes-node unchanged`. Original scenario status 1 survives successful restoration. Verify 1,081 package hashes and the separate DB archive. Later directed F05/F06/F08/F09/F10 and L05 remain unreached in this run.
- [x] Replace the shared unchanged-apply pattern in directed F05/F06/F08/F09/F10/F13/F14 with isolated, zero-replica Deployment CREATE, explicit absence, fresh positive CREATE after restoration and owned cleanup. Retain exact diagnostics, normal workload probes and original failure statuses; policies/tool pins/trust are unchanged.
- [x] Final shared checks pass: 842 service/unit tests, 43 Python policy tests, 62 Conftest decisions, Kyverno, offline Cosign and static F01/F02. Preserve the intermediate F06 harness failure and final log in `evidence/raw/lane-a-run-36830599263/`.
- [ ] Complete the corrected live demo after publication and separate dispatch authorization. Local doctor still rejects kubectl 1.37.0 versus 1.35.8. Human review/acceptance pending; no new scenario IDs or measurements. See [EN](docs/EN/lane-a-validation.md) / [ES](docs/ES/lane-a-validation.md).
- [x] Address PR #34 Copilot review: require raw initial NotFound and successful server dry-run CREATE for the expected resource. All 30 focused audit tests pass, including 11 new regressions that failed before the fix. AI contribution: GitHub Copilot review (model not disclosed), OpenAI Codex / GPT-6 implementation; human review pending. This follow-up does not establish live execution.
- [x] Address contributor-supplied Copilot recovery warning on PR #34: audit Deployment type/namespace, UID, request ownership, zero replicas, isolated selector/Pod labels and image. All 45 focused audit tests pass; 15 new cases include 11 reproduced gaps and four existing rejections. Codex / GPT-6 implementation; human review and live validation pending.

### Lane A run 36877044496: controller termination convergence

- [x] Inspect demo at `7548dcb`: prerequisites pass; L05-from readiness stops on validating-webhook timeout. Verify 74 outer/1,814 internal hashes and the frozen database archive. Preserve failure and uncompleted L05; vulnerability job success is GitHub-reported, without an independent package audit here.
- [x] Reproduce premature readiness with terminating controller Pods/replicas; require their removal within the existing bounded wait. All 33 focused tests pass; original snapshot becomes PENDING. This fixes an observed readiness gap, not a proven timeout root cause.
- [ ] Corrected live demo and human acceptance. Local doctor still rejects kubectl v1.37.0 vs v1.35.8. No workflow dispatch. AI assistance: OpenAI Codex / GPT-6; human review pending.
- [x] Shared suite passes after the convergence change: 873 service/unit tests, 43 Python policy tests, Conftest/Kyverno, offline Cosign and static F01/F02. Log: `evidence/raw/lane-a-run-36877044496/shared-tests.log`.

### Lane A run 36881119588: independently reviewed success

- [x] Confirm `.github/workflows/lane-a-validation.yml` on merged `main`, commit `b8eb603e7965e4d58cc9f58ec78f74971944a547`; both matrix jobs and scenario/retention stages pass. Independently rerun all 27 demo and 12 vulnerability audit rows against original evidence.
- [x] Preserve both artifacts, Actions logs and both separate frozen database archives outside Git. Verify 76/75 outer and 1,960/348 internal hashes; DB allowlists/checksums and all per-image identities match. Shared DB bytes are identical; download timestamps differ between suites, without within-suite drift.
- [x] Verify lane A signature/SBOM faults, F09/F10, distinct preissuance/postissuance F13 and F14, F11/F12 CREATE/legal UPDATE/direct Pod checks, L01/L03/L04/L06 recovery and both actual authorized L05 revisions. Directed/shared observations retain the twenty-scenario denominator. This closes those lane A execution gaps, not lane B negative coverage.
- [x] Recheck eight image-analysis receipts; replay four original vulnerability SBOM scans with preserved DB and identical results after input-path relocation. F03 CRITICAL target removed after correction with functional compatibility; F04 HIGH blocked within documented no-fix scope; L02 two MEDIUM findings and no HIGH/CRITICAL, followed by authorized admission/rollout/HTTP.
- [x] Independently verify 28 unique bundles (27 authentic, one expected F08 corruption), 24 positive content contracts/evidence hashes, 14 inventory isolation/restoration boundaries and L05 source ancestry/hashes. No implementation repair required. See [EN](docs/EN/lane-a-validation.md#first-successful-end-to-end-lane-a-run-36881119588) / [ES](docs/ES/lane-a-validation.md).
- [ ] Human launcher/source review and final acceptance. Evidence supports beginning paired R/G runner development, not campaign acceptance or measurements. Local Codespaces version/network blockers and historical failed runs remain recorded. Private state hashes cannot be recomputed from deliberately excluded state files. AI: OpenAI Codex / GPT-6; review pending. No push, merge, dispatch or measurement implementation in this review.


### First paired R/G measurement instrumentation

- [x] Implement separate single-delivery prepare/native-provenance/finish/cleanup orchestration over shared modules; retain existing functional entry points and twenty scenario IDs.
- [x] Define versioned protocol/records, exact new workflow identity, common/G controls, separate prepared caches, immutable warmup and measured current source, frozen per-pair Trivy data and retained phase/failure evidence.
- [x] Store reproducible balanced four-pair plan (seed `paired-rg-pilot-v1-2026-10-01`, order GR/GR/RG/RG); add paired absolute/relative statistics, dispersion, denominators and manual evidenced single-retry limits. Job consumption is separate from delivery time; no monetary estimate.
- [x] Run focused synthetic timing/order/cache/source/classification/partial-record regressions and shared environment/unit/policy/offline-cryptographic checks. Validation logs are stored locally outside Git.
- [x] Development RG `36926824792` and GR `36927943550` were subsequently authorized, executed and reviewed at `02674a57d290083648a9af44c48fd049808b2d70`, including native provenance, independent images/caches, fresh CREATE, rollout/HTTP, preserved DB and consumption. The original instrumentation handoff preceded those executions; see the [merged review](docs/EN/paired-rg-pilot-review.md).
- [x] Review development evidence and hold source/database conditions fixed for the four authorized GR/GR/RG/RG pilot pairs. The automated timing pilot is complete; ten campaign pairs, manual calibration and overall human acceptance remain separate pending decisions.
- [ ] Human review and acceptance. AI assistance: OpenAI Codex / GPT-6. Supplied lane A success `36885654089` at `5ae6f84a01407789933bd36bcdb05250a6d6c4f5` supports the requested next implementation; its package was not independently reaudited here. Historical lane A records and local blockers remain unchanged.

- [x] Address PR #37 review: preserve the normalized retry diagnostic reference and require a successful development artifact for database reuse. Reproduce both defects before correction; add three initialization regressions. Focused validation evidence is stored locally. Live smoke was pending at this follow-up and subsequently completed as recorded above; human acceptance remains pending.

- [x] Address the second PR #37 Copilot review: align paired bootstrap and post-analysis guards with the production CycloneDX 1.7 contract; reproduce both version failures before fixing them. Restore historical lane A attribution from main. GitHub Copilot review (model not disclosed), OpenAI Codex / GPT-6 corrections; human review pending. Live smoke was pending at this follow-up and subsequently completed as recorded above. Validation evidence is stored locally.


### Paired development run 36924958484: preparation failure

- [x] Inspect run `36924958484`, source `6fc297929254ba4472d6b3b9f95ebaca667dd508`: dependencies/shared tests/readiness pass; first cache warmup fails with missing source/lockfile. Both deliveries remain NOT_EXECUTED; cleanup succeeds and final status preserves failure.
- [x] Verify 20 outer and 42 internal package hashes plus the frozen database archive and identity. Evidence is stored locally outside Git.
- [x] Reproduce the empty warmup archive from the implementation cwd; export from repository root without changing the immutable source or cache recipe. Actual-command regression fails before correction; all 51 measurement tests pass afterward.
- [x] The correction was merged through PR #38, followed by successful fresh development RG/GR and the four-pair pilot recorded in the [merged report](docs/EN/paired-rg-pilot-review.md). Preserve `36924958484` as its original preparation failure; it was not an external-failure retry or a pilot observation. OpenAI Codex / GPT-6 assistance; human acceptance remains pending.

- [x] Fix PR #38 CI test setup after run `36926144447`: use isolated synthetic Git history for the export regression. Reproduce failure in a depth-1 clone; all 51 measurement tests pass after correction, and the original production bug still fails the regression. No checkout-depth or production-source changes. Logs stored locally; Codex / GPT-6 assistance, human review pending.
