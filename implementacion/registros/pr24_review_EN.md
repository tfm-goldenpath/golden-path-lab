# PR #24 execution and comment review

Reviewed 2026-09-29, starting at PR head
`d337a3c7a2f80a931041c3023d4a6e57ecc589d5`. The review fixes are local working-tree
changes. Actual assistance: **Github Copilot (GPT-6)**; the five remote comments were from
**GitHub Copilot**. Human review and final decision remain **pending**.

## Remote executions and evidence

| Execution | Revision actually checked | Observation |
|---|---|---|
| [CI 36631532871](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36631532871) | Checkout `2c8fd37fd66abe666312845eee42bddff09062d3`, GitHub's merge of PR head `d337a3c` into `38631e1` | Successful, about 65 seconds overall; 605 service/unit tests, environment/policy checks and real local Cosign probes passed. No Kubernetes integration claim. |
| [Integration 36631562615](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36631562615/job/109621804711) | **main, `38631e14a6f44838b32c959f138c13ac06b5cecd`** | Successful; integration job 21:11:15–21:16:37 UTC (5m22s), overall run about 5m28s. This is the pre-PR implementation. |

The hosted artifact was downloaded successfully this time. Artifact
`11062865449`, `golden-path-36631562615-1`, contains `run-nyAhctJ6.tar.gz`.
The downloaded ZIP SHA-256 matches the GitHub API artifact digest, the inner
archive matches its checksum, and **all 222 listed internal file hashes match**.

| Object | SHA-256 |
|---|---|
| Artifact ZIP | `303e5abf7d71d66d09fb3c541b4b56b386871f21a00f3fbbf26a702c495e342e` |
| Evidence archive | `8635f02e2cd964c29af7759f0bce4fc979fb6fb3f03dc5e9a3fe2011c916c115` |

Inspection of logs and packaged observations confirms normal CycloneDX validation,
L03's absent-before/present-after `is-number@7.0.0`, the singleton F13 results-policy
denial, the singleton F11 runtime-policy denial, and successful replacement
rollout/HTTP. Initial digest: `sha256:f738bfd22b99ecb197bd3569a1dacef4c8c60a5b42a9350a7e1fa2deb5053e97`;
replacement: `sha256:a4dbae3372fd2bbdefeb0e8b2ec2c27c48d8d9fef2aaf249c1ceb7d687d57f25`.
F05/F06/F07/F08 are explicitly **NOT_EXECUTED** in this hosted evidence.
F09/F10/L05 are absent from this older implementation. The two images share the
same source commit and cannot establish L05.

This audit checked archive integrity and recorded decisions/content. It did not
independently rerun hosted signature/certificate/transparency verification or
reproduce the cluster. It does not establish hosted compatibility of the PR's
strengthened provenance contract or of these review fixes.

Fresh offline content checks also passed: both downloaded SBOMs validate against
the pinned schemas; the current provenance validator accepts both retained GitHub
verifier reports with the expected repository, commit and workflow identity;
the current L03 and rollout validators accept the recorded SBOM and Kubernetes
objects. These checks (`07-content-audit.json`, `08-schema-initial.json`,
`08-schema-replacement.json`) establish content compatibility with the PR's
requirements, conditional on the recorded authentication. They do not replace
new signature verification or a hosted execution of this branch.

## Comment disposition

All five [PR comments](https://github.com/tfm-goldenpath/golden-path-lab/pull/24)
were actionable. They are addressed locally; no remote thread was marked resolved.

| Comment | Local correction | Regression evidence |
|---|---|---|
| [Git modes](https://github.com/tfm-goldenpath/golden-path-lab/pull/24#discussion_r4138438399) | Record Git modes in source authorization and its snapshot hash; export exact permissions despite umask; compare bytes and permissions before build. | Detect executable, restrictive and special-bit chmod changes; preserve executable Git files. |
| [Stale Ready](https://github.com/tfm-goldenpath/golden-path-lab/pull/24#discussion_r4138438475) | Pinned Kyverno does not populate observedGeneration. After Ready, restart the owned admission controller, await rollout/cache startup, reject bootstrap errors, then require unchanged policy UIDs/generations/specs and Ready status. See the [runbook and pinned source references](../docs/EN/cases/F09-F10-L05/runbook.md). | Already-Ready policies still refresh; restart, timeout, generation drift, bootstrap, non-ready and transport failures stop before workload submission. Synthetic orchestration tests do not establish actual Kubernetes cache behavior. |
| [Package summary](https://github.com/tfm-goldenpath/golden-path-lab/pull/24#discussion_r4138438526) | Include F05–F10 and L05 scope and per-scenario recorded statuses/evidence paths. Distinguish incomplete, absent, explicitly unexecuted and invalid records; never infer completion from directories. | Actual archives checked for partial provenance/L05 evidence, completed/unexecuted L05 and malformed records, with hashes retained. |
| [L05 predecessor](https://github.com/tfm-goldenpath/golden-path-lab/pull/24#discussion_r4138438580) | Read the completed, healthy L04 replacement result before the first L05 build; then advance to the first L05 image. | Assert both rollout predecessor arguments; missing/failed L04 stops before delivery. |
| [Human approval](https://github.com/tfm-goldenpath/golden-path-lab/pull/24#discussion_r4138438633) | Keep user-confirmed GitHub Copilot/GPT-6 development attribution; restore human review and decision to Pending in the earlier validation table. | Table now agrees with the pending checklist; no approval is inferred from automated review or CI. |

## Test-first evidence and remaining boundaries

Ignored evidence directory: `evidence/raw/pr24-review/`.

- `01-red.log`: sandboxed subprocess runner failure; not TDD proof.
- `02-red.log`: before production edits, **51 tests: 38 pass, 13 fail**. Failures
  reproduce mode acceptance, stale readiness, wrong predecessor and stale summary.
- `03-green.log`: the same **51 tests pass** after the corrections.
- `04-suite.log`: complete shared suite passes, including **620 service/unit
  tests**, 6 environment checks, 16 Python tests, 52 Conftest decisions, 9 Kyverno
  CLI cases, manifest/workflow checks and real Cosign probes. Additional focused
  failure cases were added during this run; see the final focused check separately.
- `06-final-focused.log`: **56 focused tests pass**, including non-ready and
  transport failures plus malformed and explicit completion/unexecuted summaries.

| Retained log | SHA-256 |
|---|---|
| `02-red.log` | `48bb9d73751b9ad4c1971ef11838be084551323a8cc4eb6d174fc91da62efffe` |
| `03-green.log` | `71692bd3b4f71f0278de79e873c430bc0c6d8a6528efd42e97ff1c0cbf829a93` |
| `04-suite.log` | `7532a25cc9446ea58286a4f18301fcf2bfb7e1d1b0d989f7a50a03b0350b3d2f` |
| `06-final-focused.log` | `f081d04a0cff1a9cd5dbee858fee3a88ef32ea2b1f76cd17eca6d638c1df0471` |

Downloaded run logs, ZIP and audit report are retained in the same ignored
directory. No raw packages, private material or logs are added to Git.

The fresh local attempt **`run-E1KEc3As` failed** while BuildKit resolved the pinned
Node image from Docker Hub: `registry-1.docker.io` DNS via `127.0.0.11:53` timed
out. It passed preflight (**622/622 final service/unit tests**) and exported the
explicit immutable revision pair
`7243334fe4ee7073801a86b25c90986b7d3c5ece` →
`fc58e220e2d3f38d13216b23e61ffc31271f112f`, including Git modes. Cluster creation
completed, but image build, controller installation/refresh and the scenario
trials did not complete. **F09/F10 registry/admission and both L05 deliveries
remain NOT_EXECUTED**. This infrastructure error is not a provenance rejection.

`05-demo.log`, `evidence/raw/run-E1KEc3As/` and
`evidence/packages/run-E1KEc3As.tar.gz` retain the failure. The archive SHA-256 is
`294942f27e2f274cfc4291e688a058b0b1c6d7178884db6bc0b6c9c8b65dc85f`;
its checksum and **14 internal file hashes** verified (`local-archive-audit.json`).
Cleanup completed; no Docker containers remained. No firewall or daemon settings
were changed. The refreshed admission-cache procedure still needs real-cluster
validation after resolving this environment blocker.

Bash syntax, local Markdown links and `git diff --check` passed. Final file/log
hash manifests are retained as `source-files.json` and `log-hashes.json` in the
review evidence directory. No push, remote comment, workflow dispatch, PR update,
repository-setting change or thesis edit was performed; prompt files are unchanged.

## Proposed PR update

Title: `test: add F09/F10 provenance trials and L05 source deliveries`

### Change and acceptance

Add isolated missing-provenance and authenticated unauthorized-repository trials
with exact inventory recovery. Add opt-in L05 deliveries from two explicitly
authorized immutable source commits, with fresh evidence and rollout/HTTP checks.
Bind source snapshots to Git modes, refresh admission policy caches between
legitimate revisions, use the actual deployed predecessor and report incomplete
scenario evidence accurately. Preserve hosted trust and mark unsupported hosted
negative scenarios unexecuted.

### Verification

Validation: shared suite and focused review regressions pass; hosted baseline
artifact audited. The supplied hosted run exercised `main` before these changes,
so PR-level hosted compatibility and full F09/F10/L05 integration remain separate
acceptance requirements. Fresh local `run-E1KEc3As` passed 622 service/unit checks
but failed Docker DNS before image build/admission. Human review/decision pending.

### Assistance and review

| Activity | AI contribution and tool/model | Human review | Decision | Evidence |
|---|---|---|---|---|
| Implementation and review corrections | Github Copilot (GPT-6); automated remote comments by GitHub Copilot | Pending | Pending | This record and the original validation record |

### Limits or follow-up

Complete real local F09/F10 directed rejection/recovery and both L05 deliveries;
review hosted compatibility on the PR revision. Hosted L05 needs two real run
revisions. EN/ES records and instructions reflect these limits.
