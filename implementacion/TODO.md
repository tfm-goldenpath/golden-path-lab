# Incremental implementation plan

This plan organizes incremental adoption, tasks and completion criteria. Checkboxes indicate completed work; file preparation and execution are recorded separately.

The [modular architecture](docs/EN/architecture.md) separates orchestration, policies and evidence through verifiable contracts. Planned directories are introduced together with their components and tests.

The [first integrated baseline plan](docs/EN/implementation-plan.md) specifies the functional contract and expected tests. Its H0–H6 milestones elaborate increments 0–3 in this TODO: environment, service and R, first local barrier, lane B integration, complete G and demonstration. Milestones are delivery conditions, not another task log; the checkboxes below track progress.

## Available increment: L01/F13 demonstration and F11 checks

- [x] Implement `quotes-node` with separate transport, validation and calculation, a deterministic HTTP contract and automated tests.
- [x] Add Conftest policies, the Kyverno policy generator and tests of their contracts and synthetic inputs.
- [x] Implement validators for SBOMs, subjects and predicates, custom results and authorization of provenance verified by GitHub CLI.
- [x] Prepare the installer with pinned versions and hashes, plus the zot registry and Kyverno chart/images identified by digest.
- [x] Implement `make demo` and `make reference` with a temporary laboratory, build/publication by digest, reports and evidence packages.
- [x] Prepare the L01/F13 sequence and early and directed F11 checks, distinguishing attributable rejection from operational error.
- [x] Prepare CI without publication permissions and the manual GitHub integration workflow, with native provenance and a results artifact.
- [x] Successfully run the included unit and contract tests; keep their scope distinct from real integration.
- [x] Complete an end-to-end lane A execution: `run-8N59m8xw`, L01 admitted and functional, F13 and F11 rejected by their rules, and package verified. This used a local compatibility environment; review by the responsible person and repetition in Codespaces remain pending.
- [x] Observe a complete classic-profile lane B execution with OIDC, GHCR, native provenance and actual Kyverno verification in [run 36314305654](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36314305654), commit `4f8fe77`, included in v0.1.0. This does not validate the later bundle profile.
- [x] Implement hosted classic certificate-chain completion from authenticated Fulcio TUF material, preserving root trust and signed content, with regression coverage.
- [x] Observe the corrected chains and results verified in hosted admission in [run 36303967179](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36303967179), commit `1ae111fc6e1614b32ee86461771836ada60e1d42`: F13 correctly rejected, L01 admitted and healthy, F11 correctly denied by Kyverno. The overall run failed because the rejection parser counted kubectl's preamble `to:` as an extra policy; the final legitimate update was not reached.
- [x] Validate the classic correction and independent L01 image replacement in that hosted run: certificate chains accepted, F13 rejected solely for missing results, then L01 accepted and F11 rejected for its intended rule. Preserve the exact executed commit and evidence package.
- [ ] Review the download and preservation of the hosted execution package and record the observed result.

Current commands are in the [README](README.md) and [execution guide](docs/EN/cases/L01-F13/runbook.md). The [contracts and limitations](docs/EN/delivery-contracts.md) distinguish each lane's guarantees. Checkboxes in the following milestones may remain open even when their files have been prepared: completion requires all stated execution and review conditions to be met. This section does not establish a history of red-green TDD cycles or claim that all twenty scenarios have been executed; policy tests and directed checks do not replace completion of their full scenario records.

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

- [ ] Finalize the minimum `quotes-node` contract: health, version and a deterministic quotation operation using synthetic data. Link it to a story and acceptance criteria.
- [ ] Separate HTTP transport, validation and functional logic in the service; keep reusable commands and explicit parameters for automation.
- [ ] Use Node LTS and `node:test` for the service; record dependencies and the lockfile when introduced.
- [ ] Write and run the first test before implementing the behavior; continue with necessary input validation and regression tests.
- [ ] Confirm initial environment resources and Codespaces quotas if used; add tools according to each increment's needs.
- [ ] Build and test a `linux/amd64` image using verified references. Preserve its digest and distinguish the OCI index from the manifest if both appear.
- [ ] Prepare kind, a dedicated namespace and a minimal workload; check health and valid create/update operations. Do not attribute protection to policies that do not yet exist.
- [ ] Add zot and complete R: publish the image, pull it by digest from kind, deploy it to `tfm-reference` and verify health, version and quotation. Use the same service and functional build that G will use.
- [ ] Give the service its own Docker context and `.dockerignore`; keep the environment probe separate.
- [ ] Record human review in the story and brief evidence of the TDD cycle.

**Outcome:** a tested minimal service and automated R path, with an identified image, a real registry pull and a verified functional response. This does not constitute the complete L01 scenario or pilot completion.

## 2. Early provenance and admission integration

- [ ] First prepare a limited local barrier: Kyverno in `tfm-golden`, a development key, admission of a signed image and rejection of an unsigned image. Check registry access from the client, node and Kyverno; do not confuse this with the complete Golden Path.
- [ ] Finalize the relevant scenario records before testing: acceptance of valid provenance, missing provenance F09 and unauthorized origin F10; distinguish partial checks from complete scenarios.
- [ ] Prepare the reusable workflow and Kyverno configuration with the implementation repository's specific versions and identities.
- [ ] Place workflows in `.github/workflows/` at the repository root; have them coordinate components in `implementacion/` without concentrating rules in their YAML.
- [ ] Check the contract between the image, provenance and authorized object: format, storage, retrieval, signature, issuer, source repository, workflow/builder, commit and digest.
- [ ] Configure permissions, OIDC identity and repository references for hosted integration.
- [ ] Build with a real OIDC identity on GitHub and verify provenance directly with Kyverno in the laboratory cluster. CLI-only verification does not complete this task.
- [ ] Test acceptance and attributable rejections without substituting format, network or API errors. Collect evidence of matching digests.
- [ ] If a material incompatibility appears, document it and assess the BuildKit + Cosign alternative before changing the solution. Do not implement both by default or automatically claim SLSA L3.

**Outcome:** verified critical integration or a specific incompatibility that supports a decision about adaptation. `act` and local signing do not replace this hosted verification.

## 3. Complete controls through small increments

Prepare the scenario record and tests for each behavior first. Include acceptance, rejection and regression checks without postponing testing until the end.

- [ ] Complete lane A with `act`, zot, kind and a development key, checking actual registry connectivity from the cluster and keeping its trust model distinct from lane B.
- [ ] Add Conftest for workflows and manifests with separate inputs and policies. Exercise F01/F02/F11/F12 and their legitimate inputs. Test F01 as configuration without enabling privileged execution of untrusted code.
- [ ] Add local hooks only once the preceding commands work and have tests. Repeat mandatory controls in CI; check that skipping a hook cannot bypass them.
- [ ] Add Trivy: preserve the original CycloneDX JSON SBOM and a separate real scan report; validate the schema and retain tool/database versions. Test the rule with identified synthetic reports and integration with real reports.
- [ ] Prepare real inputs for F03/F04/L02, giving flexible priority to a direct production Node dependency for F03. Confirm severity, fix availability and a functional upgrade before fixing the scenario.
- [ ] Sign the image and SBOM attestation with Cosign; check identity, type, content and digest. Implement F05–F08, including controlled alteration of a well-formed signature in F08.
- [ ] Add an automatically signed results attestation with a custom versioned predicate: issue success only after all mandatory pre-admission controls pass. Link the execution, commit, digest, policies and reports; record the admission response afterwards without requiring it to issue the summary that admission must verify.
- [ ] Complete admission with that attestation and direct checks, the protected namespace and relevant workload operations. Test F13/F14 and complete L01 acceptance.
- [ ] Define and test the contracts for the image, SBOM, report, provenance, results attestation and control decision. Distinguish acceptance, attributable rejection and error.
- [ ] Add negative unit or integration tests for mandatory properties: unauthorized identity, unrelated digest, unsuccessful result, unsupported type/schema and missing required fields. Do not defer these guarantees because the twenty-scenario campaign has no additional scenario for them.
- [ ] Check properties shared by Conftest and Kyverno with consistent inputs and expectations adapted to each tool; do not assume equivalence merely because rule names match.
- [ ] Check that the protected step is blocked when a mandatory control cannot be completed, without an exception path in the baseline.
- [ ] Implement directed checks of later barriers and operational tests kept separate from the corpus count.
- [ ] Complete the shared R/G commands and initial demonstration: legitimate delivery, early and directed F11 checks, missing signature F07, provenance F09/F10 and missing summary F13, isolating each condition and preserving its diagnosis.
- [ ] Test the compatible workflow portions with act and the real identity with GitHub Actions; publish the result as a run artifact and verify its download. Identify these runs as integration tests rather than campaign executions.

**Outcome:** a complete verifiable path with the selected controls and observable causes of acceptance/rejection. Favorable results for every scenario in the future corpus are not required.

## 4. Evaluation preparation and pilot completion

- [ ] Complete the 20 scenario records in a single operational catalogue, reusing the template. Fix the expected detection phase and latest blocking point for each scenario before measurement; review the coverage matrix and actor capabilities.
- [ ] Prepare R/G with the same legitimate path, resources and platform. List the controls retained by each configuration.
- [ ] Replace the old fault driver with an implementation that prepares the actual alteration and records structured causes. Do not use generic text searches or automatic administrative merges.
- [ ] Identify tool, policy, image and vulnerability database versions and comparable cache conditions. Record infrastructure preparation separately from the main measurement interval.
- [ ] Run four pilot pairs in a balanced random order and keep their data separate. Review the provisional ten campaign pairs based on the pilot.
- [ ] Calibrate the six manual tasks: F03/F10/F11 in R/G, conventional tools during measurement, equal per-scenario limits in both configurations and an approximately balanced order.
- [ ] Check result classification: valid favorable/unfavorable, invalid for an evidenced cause, or indeterminate. Apply one retry to evidenced external failures according to the protocol without removing unfavorable results.
- [ ] Verify measurement of total time to the admission response, phases, detection and blocking. Distinguish elapsed time from summed job minutes and applicable monetary cost.
- [ ] Prepare an Actions results artifact, a versioned package associated with a release and a local copy outside Codespaces, reusing the existing procedure. Verify download and table reconstruction during hosted integration.
- [ ] Document disclosure risks associated with SBOMs, vulnerabilities and logs; review the files to be shared. Do not add encryption or a custody service.
- [ ] Close the pilot based on operational readiness and traceability. An instrumentation defect that prevents interpretation requires correction; a genuine control failure may remain an unfavorable result.

**Outcome:** an executable, interpretable protocol with identified versions and preservable data. Perfect detection and satisfaction of a fixed time threshold are not required.

## 5. Campaign and documentation completion

- [ ] Fix versions, corpus, execution order and revised parameters before the campaign.
- [ ] Run the campaign and evaluate subsequent corrections separately.
- [ ] Analyze overhead, detection, blocking, manual tasks and Actions consumption using observed costs and benefits; state the laboratory and sample-size limitations.
- [ ] Relate European insurance-sector needs to controls, scenarios, evidence and limitations. Do not treat a documentary mapping as compliance certification.
- [ ] Integrate design, implementation, results and review evidence into the thesis.

## Current increment: Cosign bundles before campaign freeze

- [x] Preserve v0.1.0 and prepare `feat/cosign-bundles` with default Cosign bundles, predicate-specific verification and Kyverno `SigstoreBundle` consumers. Keep the pinned versions.
- [x] Preserve distinct local and hosted trust profiles, raw bundles, public verification material, verifier outputs and EN/ES documentation.
- [x] Require strict OCI referrer retrieval before attributing missing results; unreadable evidence and changing inventories are integration failures.
- [x] Run regression and actual Cosign cryptographic checks, including SBOM/results substitution, altered signatures, wrong digests and unauthorized development keys.
- [x] Record a fresh local end-to-end run with strict retrieval, F13/F11 attribution, L01 creation and independent image replacement, and verified archive checksums: [run-De88fpWy](registros/cosign_bundles_validation_EN.md), on the documented cgroup-v1 compatibility host. This is not a campaign measurement.
- [x] Run and review the published migration branch in real GitHub Actions at `82728c5`: [run 36321115827](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36321115827), including native provenance, exact identity, certificate/SCT, transparency and L01/F13/F11. See the [review record](registros/pr15_review_EN.md); later source corrections require their own run.
- [ ] Revalidate the PR #15 config-blob and packaging corrections in local/hosted integration on the exact published revision.
- [ ] Complete the remaining directed admission checks in the [migration acceptance list](docs/EN/cosign-bundle-migration.md), including valid attestations without the independent image-signature predicate. Cryptographic and policy-construction tests alone do not complete these live checks.
- [ ] Review, merge and validate the resulting `main` revision, then repeat affected pilot checks before fixing the campaign version.

The [migration guide](docs/EN/cosign-bundle-migration.md) ([Spanish](docs/ES/cosign-bundle-migration.md)) retains the classic compatibility history. The twenty scenarios and comparison of R/G remain applicable. Run both configurations from the same frozen revision; R may omit the additional controls. Earlier classic development measurements are not pooled with the bundle campaign. Kyverno's deprecated policy API remains a separate future migration; the classic chain helper is retained as inactive historical support pending hosted acceptance.

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
