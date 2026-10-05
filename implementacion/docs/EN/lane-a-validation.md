# Reproducible lane A integration validation

This entrypoint validates existing local scenarios before the paired R/G runner.
It adds no scenarios, measurements or acceptance exceptions. A GitHub runner
hosting the local devcontainer still executes **lane A**, with local keys and an
owned local registry. It does not establish hosted OIDC or GHCR mutation coverage.
Human acceptance remains pending.

## Later attempt on the measured campaign source — 5 October 2026

[Run 37342413975](../../registros/catalogue_campaign_source_895a3bd_EN.md) used
`895a3bde79089b7544c1dad76a6cd8f48eede0a8` through its existing evidence tag.
Both suites failed shared-tests on unsupported `TarFile.extractall(filter=...)`
in the pinned Python build, after doctor passed and before static F01/F02 or live
scenarios. Coverage in this attempt is **0/20**, databases **NOT_CREATED**.
The linked record preserves the failure, all four artifacts and a correction
proposal. It is a later observation, with new human review/acceptance pending;
it does not amend the 4 October acceptance of the prior reduced scope. Historical
observations below retain their original sources and statuses.

The subsequently requested [local compatibility fix](../../registros/lane_a_python_compatibility_EN.md)
copies the four allowlisted database members without extraction filters. Its
55 measurement and 37 campaign regressions pass with the failed jobs' Debian
Python packages. The corrected working tree has no new Actions execution;
the twenty-scenario integration check on its future committed source is pending.

## Execution

Use the pinned [implementation devcontainer](../../../.devcontainer/implementacion/devcontainer.json).
Establish a trusted local `main` containing the documented L05 revisions. The
local command records that ref without fetching or moving it. From the repository
root, run each suite independently:

```bash
make -C implementacion lane-a-validation LANE_A_SUITE=demo
make -C implementacion lane-a-validation LANE_A_SUITE=vulnerabilities
```

The commands print a unique directory under `implementacion/evidence/lane-a/`.
`LANE_A_OUTPUT=evidence/lane-a/my-attempt` selects a new directory relative to
`implementacion`; use a fresh directory for each attempt. The demo enables L05
with actual application revisions `7243334fe4ee7073801a86b25c90986b7d3c5ece` →
`fc58e220e2d3f38d13216b23e61ffc31271f112f`. Existing ancestry, source-tree and
fresh per-image evidence checks remain mandatory. The vulnerability suite calls
`make vulnerabilities`, including four isolated images, remediation comparison
and the repaired/L02 positive deliveries. Fixture discrepancies fail the suite;
do not substitute findings or change severities to obtain acceptance.

Order: source identity → effective versions → `doctor` → `make test` (including
static F01/F02 outputs) → `smoke-env` → bounded BuildKit connectivity probe →
existing scenarios → required-result audit → evidence retention. The probe uses
the locked BuildKit image, the `kind` network and `SERVICE_NODE_IMAGE` from
`versions.env`, with a 60-second build timeout and 10-second termination grace.
Smoke alone does not prove this connectivity. The temporary builder is removed;
its failure status and any cleanup failure are retained separately. No firewall
workaround or tool-version bypass is applied.

`lane-a-validation.py` runs stages as separate processes and records their exact
exit statuses. Make can map a failed child to its own exit status 2; both the
stage log and recorded process status remain available. A prerequisite failure
stops that suite. A successful command without the required evidence fails the
suite audit. `coverage.json` reports scenario/boundary observations, including
F09/F10 CI and directed admission, postissuance F13/F14, both L05 revisions,
runtime CREATE/UPDATE and vulnerability analysis/positive admission. Shared
observations and directed checks do not increase the twenty-scenario denominator.
The audit reuses existing validators and raw response classifiers; it does not
replace human review or claim an independent cryptographic reauthentication of
all retained bundles.

## Manual workflow and launcher review

[Workflow](../../../.github/workflows/lane-a-validation.yml) uses independent
`demo` and `vulnerabilities` matrix jobs with `fail-fast: false`, Ubuntu 24.04,
`contents: read`, full checkout history and unpersisted checkout credentials.
Preparation explicitly fetches `origin/main` from the fixed project URL and
records `refs/heads/main`; full history alone would not create that local ref.
The source checkout is not moved. There is no OIDC permission or remote image
publication. `push: never` disables devcontainer image publication.

Automated source review used [devcontainers/ci v0.3](https://github.com/devcontainers/ci/tree/513af61f4de4f75d37e4438f184ba4358f0fc1ca)
at `513af61f4de4f75d37e4438f184ba4358f0fc1ca`, source parent
`00115d9fb3fc4a15dc9b460cce0af467b77dbe21`: action inputs, CLI build/up/exec,
push gating and environment handling were inspected. Human review is pending.
The action's missing-CLI fallback installs a floating version, so the existing
npm tooling lock now includes exact `@devcontainers/cli` 0.89.0 and integrity.
The shared preparation script installs it and copies it outside the mounted
checkout before launch; the container's `postCreateCommand` can safely run
`npm ci` without deleting the active host launcher. Lab tool declarations and
installation configuration are unchanged.

`inheritEnv: false` and explicit `CI=true` limit requested forwarding. This action
also mounts/forwards its four GitHub command files (`GITHUB_OUTPUT`, `GITHUB_ENV`,
`GITHUB_PATH`, `GITHUB_STEP_SUMMARY`). The validation driver removes these from
scenario environments and supplies only its own temporary output file for run
identity. It does not forward tokens or arbitrary `GP_*` variables. Local replay
may explicitly supply `GP_VULNERABILITY_DB` as described below.

After separate authorization, dispatch the merged workflow on `main`:

```bash
gh workflow run lane-a-validation.yml --repo tfm-goldenpath/golden-path-lab --ref main
```

The merged workflow has executed successfully in reviewed run `36881119588`
(see the evidence review below). No additional workflow was dispatched during
that review; subsequent executions still require separate authorization.

## Preserve and replay evidence

Always-upload steps retain safe source/version/preflight logs, stage statuses,
static workflow outputs, coverage and existing checksummed packages. The packages
contain original scenario inputs, diagnostics, SBOMs/reports and results. Failed
attempts before normal packaging still have `result.json`, `stages.json` and
logs. Launcher build/lifecycle output remains in the native Actions log; download
that log too. No `.tmp` directory, private key or kubeconfig is uploaded wholesale.

Each identified frozen database is exported to a separate database artifact with
an exact allowlist: `db/trivy.db`, `db/metadata.json`, `identity.json` and
`SHA256SUMS.txt`. Its outer archive has a checksum, and the identity preserves
expected hashes, observed hashes and original retrieval metadata. Drift fails
validation while retaining observed bytes. No database is reported as created
when the prerequisite stopped before acquisition. Artifacts expire after 14 days;
download both before expiration:

```bash
RUN_ID=REPLACE_WITH_ACTUAL_RUN_ID
ATTEMPT=1
SUITE=demo # repeat for vulnerabilities
DEST="$PWD/saved/lane-a-$RUN_ID-$ATTEMPT/$SUITE"
gh run download "$RUN_ID" --repo tfm-goldenpath/golden-path-lab --name "lane-a-$SUITE-$RUN_ID-$ATTEMPT" --dir "$DEST"
gh run download "$RUN_ID" --repo tfm-goldenpath/golden-path-lab --name "lane-a-databases-$SUITE-$RUN_ID-$ATTEMPT" --dir "$DEST/databases"
gh run view "$RUN_ID" --repo tfm-goldenpath/golden-path-lab --log > "$DEST/actions.log"
(cd "$DEST" && sha256sum -c SHA256SUMS.txt)
(cd "$DEST/databases" && sha256sum -c ./*.tar.gz.sha256)
```

The outer manifest expects the database artifact under `databases/`. If the
index says `NOT_CREATED`, no DB archive exists and the last command is inapplicable.
Keep failed attempts as well as successful ones. For a verified archive, extract
into a new private local directory and verify its internal manifest:

```bash
mkdir -p /absolute/path/to/preserved-db
tar -xzf /absolute/path/to/database.tar.gz -C /absolute/path/to/preserved-db
(cd /absolute/path/to/preserved-db && sha256sum -c SHA256SUMS.txt)
GP_VULNERABILITY_DB=/absolute/path/to/preserved-db make -C implementacion lane-a-validation LANE_A_SUITE=vulnerabilities
```

Use the same verified snapshot for the demo if comparing both suites. The shared
analysis copies it into a new owned frozen snapshot and detects drift. Preserve
source revision, lockfiles and original reports with the database; database bytes
alone do not reproduce an image. Never commit downloaded artifacts or credentials.

## Historical observations for the original increment

Base: `f71bec5` (main after vulnerability PR #31), working branch
`test/lane-a-integration-validation`. Local attempts first stopped at missing
`kind` on PATH. Retrying with the already-installed `implementacion/.tools/bin`
stopped at kubectl **v1.37.0 versus pinned v1.35.8**. Both suites retained original
Make status 2, with no retention error. Effective Docker reports 29.8.0-1 and
Buildx 0.37.0; the latter differs from the 0.37.1 pin. No pins were changed.
Shared checks pass with the existing tools on PATH: environment tests, 823
service/unit tests, 43 Python policy tests, real Conftest/Kyverno checks, offline
Cosign checks and F01/F02 static trials. The initial shared attempt without that
PATH failed five evaluator tests; its log is retained. Final focused regressions
also pass. These checks are separate from the prerequisite-blocked integration
attempts. See [TODO](../../TODO.md).

Local evidence: `evidence/lane-a/local-{demo,vulnerabilities}` and
`evidence/lane-a/local-{demo,vulnerabilities}-tools`; development checks:
`evidence/raw/lane-a-development/`. All are ignored by Git. Smoke, the BuildKit
probe, real image scans, admission and L05 delivery remain **NOT_EXECUTED** in
this increment. Historical BuildKit failures and existing local integration gaps
remain open. No successful acceptance run or hosted OIDC claim is made.

Assistance: Github Copilot, GPT-6 (session-provided model identity), implementation,
regression tests, automated source review and documentation. Human review and
final acceptance: **pending**. Tests were added as regressions; no retrospective
TDD sequence is claimed.

### First ephemeral-runner attempt: 36829165325

[Run 36829165325](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36829165325)
at merge `6b9e303aebbc2b531a06b2e56625cbab7c1305ed` built the devcontainer
and passed `doctor` in both jobs. Both then failed the shared unit tests with
`ModuleNotFoundError: No module named 'yaml'`: the new workflow regression test
imported PyYAML, which is absent from the pinned environment. Local site packages
had concealed that undeclared dependency. The finalizer's failure reflects this
original failure; it is not a second integration fault.

The correction uses the already-pinned Conftest YAML parser and runs the Python
regressions with `-S` to exclude ambient site packages. It preserves every workflow
assertion and changes no tool pins, environment installation, permissions or
scenario expectations. Reproduction without site packages failed before the fix;
the focused regression passes after it. Human review and a remote rerun remain
pending; no workflow was dispatched by the assistant.

Both downloaded artifacts verified all 28 manifest hashes each (including the
separate database index). They record `failedStage: shared-tests`, original status
2, retention status 0, `scenarioExecution: NOT_EXECUTED` and database
`NOT_CREATED`. Smoke, BuildKit, image scans, admission and L05 delivery were not
reached. Evidence and local check logs are retained under
`evidence/raw/lane-a-run-36829165325/`, ignored by Git. This independently inspected
attempt confirms the pinned environment starts on the runner; historical local
version/network failures remain separate observations.

Local correction validation: the full shared suite passes (825 service/unit tests,
43 Python policy tests, 62 Conftest decisions, Kyverno, offline Cosign and static
F01/F02). See `shared-tests-fix.log` in the evidence directory above. This does
not establish that the remaining integration prerequisites or scenarios pass.

### Run 36830599263: F14 unchanged request

[Run 36830599263](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36830599263)
at `5255c7fbf43d5d158071396e9f5dd9e5c46e23fc` passed doctor, shared tests,
smoke and the delivery-configured BuildKit probe in both suites. The vulnerability
suite completed its required-results audit, including real F03/F04/L02 image
analysis, F03 remediation/functionality, the MEDIUM boundary and repaired/L02
admission, rollout and HTTP. This is lane A, not hosted OIDC evidence.

The demo stopped at postissuance F14: the fresh CI gate attributed
`RESULTS_POLICY_VERSION_MISMATCH`, but `admission.log` contained
`deployment.apps/quotes-node unchanged` with exit 0. Postissuance F13 had already
rejected and restored successfully. F14 remains an unfavorable observation; its
successful restoration does not turn it into PASS. Later directed F05/F06/F08/
F09/F10 and L05 were not reached. Initial F07 and runtime F11/F12/L06 completion
records and early F05–F10 records are present; the overall demo did not pass.

A no-op apply does not establish a fresh server admission. Moreover,
[Kyverno 1.19.1's verifier](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/engine/internal/imageverifier.go)
can skip unchanged images previously verified on the old resource, separately
from its registry cache. A metadata-only UPDATE would not fix this test boundary.

The correction uses shared `workload_admission_*` operations for directed
F05/F06/F08/F09/F10/F13/F14 trials:

| Step | Operation and required evidence |
| --- | --- |
| Prepare | Clone the candidate into `admission-fxx`, in `tfm-golden`, with zero replicas and an isolated selector; retain the image and container configuration. Require actual NotFound before use. |
| Positive before | Restricted-actor server dry-run CREATE with legitimate evidence. |
| Negative | Restricted-actor actual CREATE of the identical request after evidence mutation; require the existing exact policy/rule diagnostic and actual NotFound after rejection. |
| Recovery | Restore original registry evidence and verify it; perform an actual CREATE of the same isolated request, retain the API object, then delete only the run-owned object and prove absence. Existing same-digest workload rollout/HTTP checks remain separate observations. |

The zero-replica object cannot start Pods even if unexpectedly accepted and cannot
enter the quotes-node selector. Capture that unfavorable object before owned
cleanup and retain failure. Cleanup errors stop completion. Policy/trust/cache
settings and actor privileges do not change. The audit requires CREATE evidence,
including a returned UID and cleanup, rather than an `unchanged` response. These
checks do not claim UPDATE revalidation of changed registry evidence, add catalogue
IDs or replace L06's actual template UPDATE.

Artifact inspection verified 74 outer hashes and 1,081 internal package hashes for
the demo; 75 outer and 348 internal hashes for vulnerabilities. Each suite's
separate database archive passed its outer and internal checksums and exact file
allowlist. Raw records were inspected; this inspection did not independently
reauthenticate every retained signed bundle. Evidence, regression logs and the PR
description are in `evidence/raw/lane-a-run-36830599263/`, ignored by Git.

The correction still needs a remote demo rerun. Local doctor again stops at
kubectl v1.37.0 versus v1.35.8; no local live retry or assistant workflow dispatch
was performed. Historical blockers remain observations of their original hosts.
Assistance: OpenAI Codex / GPT-6. Human review and final acceptance remain pending.

Final correction checks pass: 842 service/unit tests, 43 Python policy tests,
62 Conftest decisions, Kyverno, offline Cosign and static F01/F02. The earlier
full run exposed a stale F06 harness, now corrected; preserve both logs.
`shared-tests-final.log` records the passing shared suite, not a live rerun.

PR #34 review follow-up: GitHub Copilot (model not disclosed) identified missing
raw initial-absence and positive server dry-run checks in the evidence audit.
OpenAI Codex / GPT-6 added both checks and 11 regressions for missing, incorrect
or failed responses. All 30 focused audit tests pass; the 11 new cases failed
before the fix. Logs: `copilot-red.log` and `copilot-green.log` in the evidence
directory above. These are synthetic unit checks, not live scenario execution.
Human review and final acceptance remain pending.

The additional Copilot warning supplied by the contributor concerns recovery
CREATE evidence. The audit now requires an `apps/v1` Deployment in `tfm-golden`,
the expected name and a nonempty string UID, the request's ownership label,
zero replicas, isolated selector and Pod labels, and the expected image.
OpenAI Codex / GPT-6 added 15 synthetic regression cases: 11 reproduced missing
checks and four confirmed existing rejection checks before the fix.
Logs: `copilot-recovery-red.log` and `copilot-recovery-green.log` in the same
ignored evidence directory. Human review and live validation remain pending.
All 45 focused audit tests pass after this follow-up.

### Run 36877044496: L05 webhook timeout

[Run 36877044496](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36877044496)
at `7548dcb119e3394718946ea59313ac1f830f7bf0` passed demo prerequisites and
reached L05-from. Its legitimate readiness dry-run failed with a 30-second
`validate.kyverno.svc-fail` webhook timeout. This remains an integration failure;
L05 did not complete either delivery. GitHub reports the independent vulnerability
job succeeded; that job's package was not independently audited in this follow-up.

The demo package records a ready new controller alongside `terminatingReplicas: 1`
and a terminating old Pod. The readiness checker previously ignored that Pod.
It now waits for zero reported terminating replicas and removal of Pods owned by
older controller ReplicaSets, within the existing bounded convergence loop.
This closes an observed readiness gap. Stale connections during controller
replacement are a possible timeout cause, not a proven diagnosis. Webhook errors
still stop execution without retries, and a corrected live rerun remains required.

Downloaded evidence: `evidence/raw/lane-a-run-36877044496/` (ignored). Verified
74 outer hashes, 1,814 internal package hashes and the separate database archive's
allowlist and three internal hashes. The offline audit accepts the directed
postissuance fault boundaries, but cannot establish overall completion: final
aggregate/L05 records are absent, and relocated runtime Conftest filenames fail
its path checks. Original evidence was not rewritten. Bundle signatures were not
independently reauthenticated in this inspection.

Five new regression failures reproduced the readiness gap; all 33 focused
controller/refresh tests pass after the change. The saved live snapshot now
returns PENDING. Local doctor still fails kubectl v1.37.0 versus v1.35.8, so no
local cluster retry was attempted. Assistance: OpenAI Codex / GPT-6; human review
and final acceptance pending. No workflow was dispatched.
Shared suite passes: 873 service/unit tests, 43 Python policy tests, Conftest,
Kyverno, offline Cosign and static F01/F02. See `shared-tests.log`.

### First successful end-to-end lane A run: 36881119588

Reviewed [demo job](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36881119588/job/110432829867)
and [vulnerability job](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36881119588/job/110432830289)
from `.github/workflows/lane-a-validation.yml`, attempt 1, `workflow_dispatch` on
`main`, commit **`b8eb603e7965e4d58cc9f58ec78f74971944a547`**. This is the successful
run after PR #35, not the first attempt and not the lane B `golden-path.yml`.
Both suites report PASS, original/retention exit 0, and successful required-result
audits. All recorded stages passed (27 demo, 26 vulnerabilities), including
doctor, shared checks, smoke, the pinned BuildKit/kind/service-image probe,
scenarios and cleanup. Their shared logs report 873 service/unit tests each,
43 Python policy tests, Conftest/Kyverno, offline Cosign and static F01/F02.
Those tests are supporting prerequisites; the scenario evidence below establishes
actual execution.

| Suite | Independently checked observations |
| --- | --- |
| Demo (`run-TxAlzChs`) | All 27 audit rows pass. F01/F02 remain static workflow checks. F05/F06 SBOM absence/foreign subject, F07 signature absence, F08 signature corruption, F09 provenance absence and F10 unauthorized origin reject at their implemented CI/admission boundaries with restored legitimate evidence. |
| Results authorization | Initial F13 rejects before results issuance. Separate postissuance F13 removal and F14 authenticated P0 replay reject at their intended rules; exact restoration, fresh CREATE recovery, cleanup and normal rollout/HTTP pass. These are distinct observations of existing IDs. |
| Runtime and legitimate delivery | F11/F12 reject Deployment CREATE, legal template UPDATE and isolated Pod CREATE with exact early/admission attribution, real NotFound or unchanged desired state. F12's tag resolves to the authorized digest on both sides. L01/L03/L04 pass; L06 shares L01 CREATE, changes template generation 1 → 2, completes rollout/HTTP and cleans up its positive direct Pod. |
| L05 | Both actual source revisions `7243334fe4ee7073801a86b25c90986b7d3c5ece` → `fc58e220e2d3f38d13216b23e61ffc31271f112f` are authorized ancestors of recorded main. Independently checked 10/11 source-file hashes and distinct application trees. Both receive fresh digest-specific evidence, admission, ready-digest rollout and health/quote/version responses. |
| Vulnerabilities (`run-SeGfzbLB`) | All 12 audit rows pass. Four built fixture images have original CycloneDX SBOMs and raw Trivy `cyclonedx` reports, verified digest/component association, scan exit 0 and attributable production-policy decisions. Negative images have no successful results or protected-deployment evidence. |

F03 uses `minimist@1.2.5`: **CVE-2021-44906, CRITICAL**, with scanner corrections
`1.2.6, 0.2.4`. Rebuilding with `1.2.8` removes the finding and leaves no
vulnerabilities in the report. Harmless dependency behavior and reference HTTP
match before/after; the repaired image completes protected delivery.
F04 uses `ip@2.0.1`: **CVE-2024-29415, HIGH**; the fixed snapshot and
[reviewed npm advisory](https://github.com/advisories/GHSA-2p57-rm9w-gvfp)
report no patched version. This is bounded to that ecosystem/snapshot, not a
universal absence-of-fix claim. L02 `lodash.unset@4.5.2` contains the expected
**CVE-2026-2950, MEDIUM**, plus **CVE-2025-13465, MEDIUM**; neither HIGH nor
CRITICAL is present. It completes independent signature/SBOM/provenance/results
authorization, admission, rollout and HTTP. No fixture drift was observed.

#### Preserved evidence and independent review

All artifacts and Actions logs are retained outside Git under
`evidence/raw/lane-a-run-36881119588/`. Both database artifacts exist and are
required; neither is NOT_CREATED. Verified:

| Suite | Outer manifest hashes | Internal package hashes | Separate database |
| --- | ---: | ---: | --- |
| Demo | 76 | 1,960 | Outer checksum, exact four-file allowlist, three internal hashes and four matching image database records |
| Vulnerabilities | 75 | 348 | Outer checksum, same allowlist, three internal hashes and five matching run/image database records |

Both `trivy.db` files hash to
`c39ee6b7f92119e7fadd7bc626d15ca8de69a56522529eeab027f6c9c433a27a`, schema 2,
updated `2026-10-01T13:01:27.395440834Z`. Metadata hashes differ because the jobs
have different `DownloadedAt` values; each suite's complete identity is constant
across its comparisons. Both original snapshots remain preserved for replay.

Review reran the production coverage validators against unmodified evidence,
using temporary aliases for the original absolute input paths, then removed the
aliases. All eight image-analysis receipts were independently reconstructed.
Four offline rescans of the original vulnerability SBOMs reproduce every Result
field after comparing the relocated input filename in memory; raw outputs are
retained unchanged and database hashes remain stable. This replay is an SBOM
rescan, not a new image build or live admission run.

All 28 distinct retained bundles were reverified with pinned Cosign and each
run's retained local trust: 27 authenticate; the deliberate F08 variant fails.
All 24 positive bundle content contracts and signed results' referenced evidence
hashes pass. Independent inventory checks confirm 14 fault boundaries' isolated
alterations and exact restoration, unchanged policy specs and retained public
trust. Private run `state.json` is deliberately excluded from packages, so its
recorded configuration hashes cannot be independently recomputed here; the run's
checks of those hashes remain execution evidence.

Review outputs include `verified-downloads.json`, `*-independent-coverage.json`,
`independent-review.json`, `isolation-review.json`, `bundle-reverification.json`,
`positive-content-review.json`, `l05-source-review.json` and `scan-replay.json`.
No implementation repair or new regression suite was required. The initial replay
comparison exposed only a relocated input path, not scanner/database drift.

This evidence supports **starting development of the paired R/G measurement
runner**. It does not establish paired measurements, repeatability statistics,
manual-task calibration or campaign acceptance. Human launcher/source review and
final acceptance remain pending. Historical failures remain valid observations;
this successful run does not prove the earlier timeout's precise cause. Local
Codespaces version/network blockers remain separate. Lane B OIDC/GHCR negative
coverage is unchanged and remains outside this run. The denominator remains
20 scenarios; shared/directed observations add no IDs. No code repair, push,
merge, workflow dispatch or measurement infrastructure was performed in this
review. AI assistance: OpenAI Codex / GPT-6, artifact audit and EN/ES documentation.
