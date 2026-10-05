# Evaluation readiness and twenty-scenario coverage

[Español](../ES/evaluation-readiness.md) · [Current work](../../TODO.md) · [Final execution handoff](paired-rg-campaign.md)

## Latest human decision — 4 October 2026

Francisco's [canonical Spanish declaration of human acceptance](../../registros/evaluation_acceptance_20261004_ES.md) ([English translation](../../registros/evaluation_acceptance_20261004_EN.md)) closes the experimental evaluation within its documented reduced scope. It accepts the ten-pair campaign, functional observations, six automated repairs and pilot within their respective sources and execution boundaries. Human-effort measurement remains deferred; Francisco's external-copy location and checksum verification remain pending. Results and limitations have been incorporated into the local Spanish thesis chapters 4–6; the manuscript is maintained outside this repository and its final editorial review remains separate.

This dated decision supersedes pending-human-acceptance wording retained below as historical context. It does not change evidence, hashes, scenario execution status or dataset boundaries, establish coverage of unexecuted hosted negatives, or repeat the full catalogue on the campaign source. The human review relies on retained reports and automated checks, without implying personal repetition of each verification.

## Complementary attempt — 5 October 2026

The [catalogue repetition record](../../registros/catalogue_campaign_source_895a3bd_EN.md)
adds run **37342413975**, attempt 1, on exact campaign source `895a3bd` (A3 below).
Both suites failed the shared-test prerequisite because the pinned devcontainer's
Python lacks `TarFile.extractall(filter=...)`. **0/20 scenarios executed in this
attempt**; no scanner database was acquired. The common-source catalogue gap
remains open. This later failure and its successful integrity review do not amend
the 4 October declaration. Human review and acceptance of A3 remain pending.

## Corrected-source validation — 5 October 2026

After the user requested the correction and a new execution, [run 37353632299](../../registros/lane_a_corrected_91a33e9_EN.md)
passed both suites on **`91a33e910ee2ba9ded5391393b06ca70005de4d4`** (A4).
Independent automated review confirms **20/20 lane A scenarios PASS**, including
static F01/F02. Both real databases are preserved; their hashes differ from the
campaign database. This closes live validation of the corrected source, while
full-catalogue execution on `895a3bd` remains unestablished. A3 remains failed;
A4 does not retrospectively amend the 4 October acceptance. New human review and
acceptance remain pending.

## Current scope

The readiness consolidation was prepared from `940582721d0a5bee2fce54272f5dac60a87fad00`
and merged as PR #45 at `895a3bde79089b7544c1dad76a6cd8f48eede0a8`.
Fresh development RG/GR and the [ten-pair timing campaign](paired-rg-campaign-results.md)
now have reviewed execution evidence on `895a3bd`. That legitimate-delivery path
does not rerun the entire functional catalogue. Implementation, execution,
automated review and human acceptance remain distinct; the dated declaration above
records acceptance of the reduced scope.

Four datasets remain separate: functional scenario trials, PR44's scripted
remediation, the completed four-pair timing pilot and the completed ten-pair timing
campaign. PR44 has six additional observations within F03/F10/F11, not six new
scenarios. Shared L01/L03/L04 deliveries, L06 CREATE and negative-case positive
counterparts are linked observations, not independent samples. F01/F02 evaluate
inert workflow data statically; they do not execute malicious workflows.

Human-effort measurement and eligible manual calibration/limit selection are
**deferred**. Known scripted repairs measure automated execution, not diagnosis,
productivity or autonomous repair discovery. These records remain permanently
ineligible for human calibration even after later review. Human review, overall
acceptance and campaign authorization are not implied by a PR merge.

## Evidence sources and review provenance

The historical source descriptions, earlier matrix observations and handoff below
preserve their review status before the dated human decision. Their pending-human-
acceptance labels are historical; unexecuted cases and source limitations remain
unchanged. A3/A4 are later attempts with their own pending human review and acceptance.

Historical sources A1/A2/B1/AR/P below remain **committed records**, not a new
audit of those originals. Their retention inventory did not reauthenticate historic
bundles. The later C source has separate original-artifact review and publication.
Where a historical original is absent, its committed record remains the source:

- **A1:** [lane-A execution/review record](lane-a-validation.md#first-successful-end-to-end-lane-a-run-36881119588),
  run `36881119588`, source `b8eb603e7965e4d58cc9f58ec78f74971944a547`;
  demo `run-TxAlzChs`, vulnerabilities `run-SeGfzbLB`. The record describes the
  prior automated independent integrity/cryptographic review and passing audits.
  Retained local root: `evidence/raw/lane-a-run-36881119588/`. Human acceptance
  remains pending. A GitHub-hosted devcontainer with local keys is still lane A.
- **A2 (reported only):** the [measurement guide](paired-rg-measurements.md) records
  contributor-reported successful A suites in `36885654089`, source
  `5ae6f84a01407789933bd36bcdb05250a6d6c4f5`. Its original artifact is not retained
  here and this consolidation does not assign new per-scenario proof to it.
- **A3 (new failed attempt):** [EN record](../../registros/catalogue_campaign_source_895a3bd_EN.md)
  and [identity/hash index](../../registros/catalogue-campaign-source-895a3bd.json),
  run `37342413975`, attempt 1, source `895a3bde79089b7544c1dad76a6cd8f48eede0a8`.
  Recorded main: `c2b403cd436449b1b2818f5fe92983ecf946d072`.
  D = demo job `111872525387`; V = vulnerabilities job `111872524933`.
  Both FAIL at shared-tests, original exit 2, retention 0; all catalogue rows
  NOT_EXECUTED, both databases NOT_CREATED. New automated review verifies four
  ZIP digests and 56 outer file hashes; no scenario packages or bundles exist.
  Human review/acceptance of this complementary evidence is pending.
  The later [local Python compatibility fix](../../registros/lane_a_python_compatibility_EN.md)
  passes focused regressions; A4 below records its subsequent live validation.
  A3's source, failed outcome and twenty NOT_EXECUTED rows remain unchanged.
- **A4 (corrected-source execution):** [EN record and twenty-row matrix](../../registros/lane_a_corrected_91a33e9_EN.md)
  and [identity/hash index](../../registros/lane-a-corrected-91a33e9.json), run
  `37353632299`, attempt 1, source `91a33e910ee2ba9ded5391393b06ca70005de4d4`.
  Main: `c2b403cd436449b1b2818f5fe92983ecf946d072`. D = demo job `111910409914`,
  `run-QtLWFwof`; V = vulnerabilities job `111910410156`, `run-WjHQj2u4`.
  Both PASS; 20/20 unique scenarios PASS. New review verifies 151 outer hashes,
  2,312 package hashes, 27 authentic bundles plus expected F08 rejection, 24 positive
  authenticated contracts, both real DB archives and four offline scan replays.
  DBs differ from C; full source differs from A3/C. Human acceptance is pending.
- **B1 (supplied review):** [runtime record](cases/F11-F12-L06/record.md), run
  `36768108684`, runtime increment merged at
  `eed5aad2828a7156e4c49bf2e2f3d9c2b0476137`. The contributor supplied the hosted
  F11/F12/L06 review; this is not a new audit or final-source acceptance.
- **AR:** [PR44 result record](../../registros/automated-remediation-validation.md),
  `automated-six-01`, seed `automated-six-v1`, source
  `ea790781990766a3cb20bae5a302e1175edd3bd0`. Six VALIDATED tasks, completion,
  cleanup and integrity PASS; no retries, interruptions or human interventions.
  Originals remain under `evidence/manual-tasks/automated-six-01/`, linked raw runs
  and safe packages. Human acceptance is pending; all six are calibration-ineligible.
- **P:** [four-pair timing pilot](paired-rg-pilot-review.md), source
  `02674a57d290083648a9af44c48fd049808b2d70`, runs `36964061878`, `36964593732`,
  `36965104583`, `36965606734`, database from development `36926824792`.
  The committed review records 4/4 favorable, zero retries/exclusions, median
  G−R 55.339 s and 22.050 observed job minutes. Local original review downloads
  were removed at the user's request; the external copy is not independently
  verified here. This source/data cannot be relabelled or pooled into the campaign.

- **C:** [ten-pair campaign results and published originals](paired-rg-campaign-results.md),
  source `895a3bde79089b7544c1dad76a6cd8f48eede0a8`, ten linked campaign runs,
  database from development `37199309814`. 10/10 favorable, no exclusions/retries;
  automated technical and integrity review PASS; human acceptance pending.
  This supports the legitimate hosted delivery boundary only, not replacement,
  component evolution, negative fixtures or additional independent positive samples.

## Coverage matrix — exactly twenty scenarios

Paths below identify existing implementation and focused tests; `make -C
implementacion test` also runs their shared checks. Each row uses the full
source/run identity above. **The full catalogue remains unexecuted on the campaign
source in A3: both suites stopped before all twenty trials.** Historical acceptance
is scoped by the 4 October declaration; human review/acceptance of A3/A4 is pending.
A4 establishes all twenty rows on the different corrected source `91a33e9`; its
linked matrix records applied inputs, actual diagnostics, recoveries and limits.
C supplies only the explicitly identified shared positive delivery boundaries.
Unsupported B negatives remain NOT_EXECUTED regardless of A success. Regressions
and CI checks demonstrate their named boundary only. The detailed A3 matrix records
planned inputs, unmet expectations, concrete failure evidence and unreached barriers.

| ID | Property / expected outcome | Implementation / focused test | Boundary | Supported lane | Recorded source/run and evidence | Observed / review status | Remaining limitation / final source |
|---|---|---|---|---|---|---|---|
| F01 | Reject privileged pull_request_target workflow | [workflows.py](../../tests/scenarios/workflows.py); [test_workflow_scenarios.py](../../tests/policies/test_workflow_scenarios.py) | Static workflow / PR CI | Static, lane-independent | A4 D/V; A3 D/V; A1 demo; [static record](../../registros/f01_f02_workflows_EN.md) | A4 PASS (static); new human review pending; history: A3 NOT_EXECUTED (shared-tests); Exact event DENY recorded. Historical automated review; human pending. | No workflow fixture executes; ruleset enforcement is external. Full catalogue on 895a3bd remains unestablished. |
| F02 | Reject mutable external Action tag | [workflows.py](../../tests/scenarios/workflows.py); [test_workflow_scenarios.py](../../tests/policies/test_workflow_scenarios.py) | Static workflow / PR CI | Static, lane-independent | A4 D/V; A3 D/V; A1 demo; static record above | A4 PASS (static); new human review pending; history: A3 NOT_EXECUTED (shared-tests); Exact ACTION_SHA DENY recorded. Historical automated review; human pending. | No upstream-tag attack is executed. Full catalogue on 895a3bd remains unestablished. |
| F03 | Reject fixable HIGH/CRITICAL dependency; repaired image passes | [vulnerabilities.sh](../../tests/scenarios/vulnerabilities.sh); [vulnerabilities.test.mjs](../../tests/unit/vulnerabilities.test.mjs) | Real SBOM scan / CI; repaired admission + HTTP | A; B fixture unsupported | A4 V; A3 V; A1 vulnerabilities; AR F03/G run-G0n1bJ9K, R run-gKNMKGI0 | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); A1 PASS; AR both VALIDATED. Historical automated review; human pending. | B negative NOT_EXECUTED; minimist finding bounded to frozen DB. Full catalogue on 895a3bd remains unestablished. |
| F04 | Reject HIGH/CRITICAL with no fix in the selected snapshot | [vulnerabilities.sh](../../tests/scenarios/vulnerabilities.sh); [vulnerabilities.test.mjs](../../tests/unit/vulnerabilities.test.mjs) | Real SBOM scan / CI | A; B fixture unsupported | A4 V; A3 V; A1 vulnerabilities: ip 2.0.1, CVE-2024-29415 | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Attributable rejection PASS. Historical automated review; human pending. | B negative NOT_EXECUTED; no universal absence-of-fix claim. Full catalogue on 895a3bd remains unestablished. |
| F05 | Reject absent SBOM; accept exact restoration | [sbom.sh](../../tests/scenarios/sbom.sh); [sbom-scenario.test.mjs](../../tests/unit/sbom-scenario.test.mjs) | Fresh CI gate + directed admission | A; B negative unsupported | A4 D; A3 D; A1 demo; [SBOM record](cases/F05/record.md) | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); CI/admission rejection and restoration PASS. Historical automated review; human pending. | B negative NOT_EXECUTED; L03 counterpart is shared. Full catalogue on 895a3bd remains unestablished. |
| F06 | Reject SBOM bound to another digest | [sbom.sh](../../tests/scenarios/sbom.sh); [f06-scenario.test.mjs](../../tests/unit/f06-scenario.test.mjs) | Fresh CI gate + directed admission | A; B negative unsupported | A4 D; A3 D; A1 demo; [SBOM record](cases/F06/record.md) | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Subject rejection and restoration PASS. Historical automated review; human pending. | B negative NOT_EXECUTED; schema checks do not prove inventory completeness. Full catalogue on 895a3bd remains unestablished. |
| F07 | Reject missing independent image signature | [f07.sh](../../tests/scenarios/f07.sh); [f07-ci-scenario.test.mjs](../../tests/unit/f07-ci-scenario.test.mjs) | Fresh CI + admission; exact recovery | A; B negative unsupported | A4 D; A3 D; A1 demo; [compatibility](cases/F07/hosted-compatibility.md) | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Missing-signature rejection PASS. Historical automated review; human pending. | B negative NOT_EXECUTED; GHCR mutation unproven. Full catalogue on 895a3bd remains unestablished. |
| F08 | Reject corrupted image signature | [f08.sh](../../tests/scenarios/f08.sh); [f08-scenario.test.mjs](../../tests/unit/f08-scenario.test.mjs) | Fresh CI + directed admission | A; B negative unsupported | A4 D; A3 D; A1 demo; [signature record](cases/F08/record.md) | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Targeted cryptographic rejection PASS. Historical automated review; human pending. | B negative NOT_EXECUTED; transport errors are not detection. Full catalogue on 895a3bd remains unestablished. |
| F09 | Reject absent provenance | [provenance.sh](../../tests/scenarios/provenance.sh); [provenance-scenario.test.mjs](../../tests/unit/provenance-scenario.test.mjs) | Fresh CI + directed admission | A; B negative unsupported | A4 D; A3 D; A1 demo; [origin record](cases/F09-F10-L05/record.md) | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Rejection and restoration PASS. Historical automated review; human pending. | B negative NOT_EXECUTED; retrieval failure cannot prove absence. Full catalogue on 895a3bd remains unestablished. |
| F10 | Reject authentic provenance from unauthorized repository | [provenance.sh](../../tests/scenarios/provenance.sh); [provenance-scenario.test.mjs](../../tests/unit/provenance-scenario.test.mjs) | Fresh CI + directed admission | A; B negative unsupported | A4 D; A3 D; A1 demo; AR G run-rZHXsd7i, R run-pd8oXkxS | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); A1 PASS; AR both VALIDATED. Historical automated review; human pending. | B negative NOT_EXECUTED; AR selects authorized artifact without editing claims. Full catalogue on 895a3bd remains unestablished. |
| F11 | Reject privileged and escalation flags | [runtime.sh](../../tests/scenarios/runtime.sh); [runtime-scenario.test.mjs](../../tests/unit/runtime-scenario.test.mjs) | CI; Deployment CREATE/UPDATE + Pod admission | A/B runtime; AR A only | A4 D; A3 D; A1 demo; B1; AR R run-Dh0ak8AA, G run-4mg9a28a | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); A1 PASS; B1 supplied review; AR both VALIDATED. Historical automated review; human pending; B1 supplied. | Coordinated two-field fault; accepted guided rehearsals remain ineligible. Full catalogue on 895a3bd remains unestablished. |
| F12 | Reject mutable tag even when it resolves to authorized digest | [runtime.sh](../../tests/scenarios/runtime.sh); [runtime-scenario.test.mjs](../../tests/unit/runtime-scenario.test.mjs) | CI; Deployment CREATE/UPDATE + Pod admission | A/B runtime | A4 D; A3 D; A1 demo; B1 | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); A1 PASS; B1 supplied review. Historical automated review; human pending; B1 supplied. | Tag resolution checked on both sides; not a provenance fault. Full catalogue on 895a3bd remains unestablished. |
| F13 | Reject missing signed results; restore legitimate delivery | [results.sh](../../tests/scenarios/results.sh); [results-scenario.test.mjs](../../tests/unit/results-scenario.test.mjs) | Preissuance admission; postissuance CI/admission | A both; B preissuance only | A4 D; A3 D; A1 demo (pre/postissuance); [results oracle](cases/F13-F14/record.md) | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Both A boundaries PASS. Historical automated review; human pending. | B postissuance negative NOT_EXECUTED; preissuance is a separate observation of same ID. Full catalogue on 895a3bd remains unestablished. |
| F14 | Reject authenticated P0 replay under trusted P1 policy | [results.sh](../../tests/scenarios/results.sh); [results-scenario.test.mjs](../../tests/unit/results-scenario.test.mjs) | Authorized CI + fresh directed CREATE | A; B negative unsupported | A4 D; A3 D; A1 demo; earlier 36830599263 unchanged-apply failure retained | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Corrected CREATE rejection PASS. Historical automated review; human pending. | B negative NOT_EXECUTED; P0 is labelled fixture, not real historic policy. Full catalogue on 895a3bd remains unestablished. |
| L01 | Accept legitimate delivery and new verified replacement digest | [l01.sh](../../tests/scenarios/l01.sh); [l01-update.test.mjs](../../tests/unit/l01-update.test.mjs) | CI + admission + rollout/HTTP | A/B | A4 D; A3 D; A1 demo; P and C timing deliveries support B legitimate path only | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Shared L01/L03/L04 PASS; P 4/4 and C 10/10 timing pairs favorable. Historical automated review; human pending. | P/C have no replacement trial; same-commit replacement is not L05 app evolution. Full catalogue on 895a3bd remains unestablished. |
| L02 | Accept MEDIUM-only vulnerability fixture | [vulnerabilities.sh](../../tests/scenarios/vulnerabilities.sh); [vulnerabilities.test.mjs](../../tests/unit/vulnerabilities.test.mjs) | CI threshold + signature/evidence + admission/HTTP | A; B fixture unsupported | A4 V; A3 V; A1 vulnerabilities: lodash.unset 4.5.2 | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Threshold and positive delivery PASS. Historical automated review; human pending. | B fixture NOT_EXECUTED; CVE-2026-2950 plus CVE-2025-13465 are snapshot-specific. Full catalogue on 895a3bd remains unestablished. |
| L03 | Accept legitimate component/inventory evolution with fresh SBOM | [l01.sh](../../tests/scenarios/l01.sh); [sbom-evidence.test.mjs](../../tests/unit/sbom-evidence.test.mjs) | SBOM CI + admission + functionality | A/B positive path | A4 D; A3 D; A1 demo; [L03 oracle](cases/L03/record.md) | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Shared L01/L03/L04 PASS. Historical automated review; human pending. | Known is-number addition; no completeness claim or independent sample. Full catalogue on 895a3bd remains unestablished. |
| L04 | Accept valid independent image signature after fresh verification | [l01.sh](../../tests/scenarios/l01.sh); [ci-verification-gate.test.mjs](../../tests/unit/ci-verification-gate.test.mjs) | CI gate + results + admission/HTTP | A/B positive path | A4 D; A3 D; A1 demo; C fresh signatures/admission/HTTP; [L04 oracle](cases/L04/record.md) | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Shared L01/L03/L04 PASS. Historical automated review; human pending. | Shared replacement/control; C supports original-image signature delivery only. Neither establishes B negative F07. Full catalogue on 895a3bd remains unestablished. |
| L05 | Accept two authorized real application source revisions | [l05.sh](../../tests/scenarios/l05.sh); [l05-scenario.test.mjs](../../tests/unit/l05-scenario.test.mjs) | Source guard + CI + admission/HTTP for both | A explicit pair; B needs two separately authorized native runs | A4 D; A3 D; A1 demo: 7243334fe4ee7073801a86b25c90986b7d3c5ece → fc58e220e2d3f38d13216b23e61ffc31271f112f | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Both A source deliveries PASS. Historical automated review; human pending. | B paired revision trial NOT_EXECUTED; warmup in timing pilot is not L05. Full catalogue on 895a3bd remains unestablished. |
| L06 | Accept permitted same-image template update | [runtime.sh](../../tests/scenarios/runtime.sh); [runtime-scenario.test.mjs](../../tests/unit/runtime-scenario.test.mjs) | CREATE/template UPDATE + rollout/HTTP + positive Pod | A/B | A4 D; A3 D; A1 demo; B1 | A4 PASS; new human review pending; history: A3 NOT_EXECUTED (shared-tests); Generation 1→2, digest/HTTP PASS; B1 supplied review. Historical automated review; human pending; B1 supplied. | CREATE shares L01; positive Pods and recovery do not add independent samples. Full catalogue on 895a3bd remains unestablished. |

## Execution procedure and recorded handoff

The PR45 handoff below preceded the separately authorized development and campaign
execution now recorded in C. Use the [campaign procedure](paired-rg-campaign.md)
for any new campaign; its commands do not authorize another run. A different
source or sample requires its own reviewed preparation and authorization.

1. Merge all preparation fixes through normal review; on clean current main,
   record `TARGET`, check pinned `doctor` and shared tests, and inspect available
   storage before downloading evidence. Keep the future revision distinct from A1,
   AR and P; never rewrite their source identities.
2. Separately authorize and run fresh development **RG then GR** on that same
   `TARGET`, with GR restoring `database_run=$DEV_RG`. Download both original
   exports and Actions logs; verify hashes and review real build/cache, native
   provenance, admission, rollout/HTTP, endpoints and cleanup evidence. A green
   job or a checksum alone is insufficient. Changes/failures require retained
   evidence and a new source/plan where applicable, not a silent retry.
3. Select a new draft count/seed explicitly; ten is an exploratory example,
   not blanket approval for future campaigns.
   Bind the draft to those development exports, source/configuration and database.
   A person must review and supply the authorization declaration. An assistant may
   record that explicitly supplied declaration as authorized;
   it must never invent the reviewer, rationale or decision.
4. After permission for remote plan publication, publish the exact frozen control
   through the existing plan-only job. Verify and export its identity/manifest.
5. Execute only approved positions in their frozen order, review/export every
   attempt before the next, and retain failures. Only the existing one full-pair
   retry for an evidenced, reviewed external failure is permitted. Never rerun
   because a control rejects, a run is slow or this analysis defect occurred.
6. Analyze **all** retained campaign attempt directories (including retry originals
   and incomplete/unfinalized attempts) with the selected control. Export originals
   and derived analysis separately; unknown durations stay null and partial
   coverage remains explicit. Download outside Codespaces before retention expires.

The analyzer now checks exact arm/archive agreement and mandatory identity even
for incomplete observations. Image/start/end fields may be absent only before
their producer checkpoint. No image can be omitted once post-build phases exist;
no duration or functional completion is inferred when admission has no recorded
endpoint. Successful observations still require complete favorable evidence.
Unknown fields are not synthesized from archive timestamps, phase exits or job
minutes. Existing retry/source/database guards and original bytes are preserved.

Functional readiness review remains separate: use A1's per-boundary record and
identify which functional suites need a new run on the eventual final source.
A lane-A suite rerun cannot close unsupported hosted negatives. Fresh development
RG/GR validates the timing runner on that source, not all twenty scenarios.

Only the finalizer-derived classification may differ from its archived checkpoint,
and only when it equals recomputation from those same facts (for example, cache
validation failing before the timer). A bootstrap package created before arm-init
can be retained as preparation evidence when neither the pair nor archive claims
an arm observation; it supplies no duration or successful arm. All other recorded
fields and presence must match.

## Thesis statements needing later alignment (no thesis edits)

- Replace any claim of completed human diagnosis/remediation comparison or eligible
  manual calibration with deferred scope; distinguish guided rehearsals and scripts.
- Separate twenty scenario IDs from boundary checks, shared positive controls and
  PR44's six additional observations; retain unsupported hosted NOT_EXECUTED cases.
- Attribute lane-A evidence to local trust, even when hosted in Actions; do not
  generalize it to OIDC/GHCR mutation acceptance or all scenarios in both lanes.
- Keep the four-pair pilot's original source and exploratory estimates separate
  from the ten-pair campaign; record its explicit authorization and exploratory
  nature without claiming guaranteed statistical precision.
- Report known-repair timings, G−R delivery intervals and Actions job minutes as
  distinct measures; preserve null/incomplete observations, exclusions and failures.
- Keep technical success, archive integrity, human acceptance and overall evaluation
  completion separate. Update final-source/run references only after actual execution.
