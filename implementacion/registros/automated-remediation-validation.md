# Automated remediation validation — development handoff

Base: main `387c75d15e3b0f50d343f6f32b1d6895ab3529dd` (merged PR #43).
Branch: `feat/automated-remediation-validation`. Implementation and validation
were performed in the supplied Codespaces workspace. Exact working-tree source
hashes are retained in the storage-probe plan/report; this is not a committed
or hosted execution claim.

The [English](../docs/EN/automated-remediation.md) and
[Spanish](../docs/ES/automated-remediation.md) guides contain the single command,
continuation, report examples, retention requirements and interpretation limits.

## Observed validation

- Initial focused test run failed because the new repair module did not exist.
  This establishes only that observed initial test state, not an earlier TDD history.
- The 30 focused regressions pass. They use explicitly labelled synthetic
  inputs for all three repairs, six-path sequencing, attributable detection,
  reference diagnostic ordering, wrong-reason/integration errors, zero-exit
  non-completion, archive ownership, source/database drift, retained originals,
  permanent human-calibration exclusion, interruption/timeout, storage failure,
  canonical DB reuse and cleanup boundaries. A real local subprocess exercises
  timeout termination; it runs no delivery workload.
- `make -C implementacion doctor` passes with existing pinned versions.
- Shared `make -C implementacion test` passes: six environment cases, 930
  service/unit cases (including Python wrappers), 43 Python policy cases,
  Conftest/Kyverno, offline Cosign and static workflow checks. Offline cryptographic
  checks are not registry, OIDC or Kubernetes integration.
- The live six-task evaluation is **NOT_EXECUTED**. Workspace and Docker storage
  have approximately 4.9 GiB available, below the runner's 6 GiB reserve. The
  storage probe stops before task preparation, retains six unexecuted report
  positions and creates no lab resources. No Docker pruning, evidence deletion
  or database substitution was performed.
- The first development probe (`automated-storage-probe-01`) correctly stopped
  on source drift: a final implementation edit occurred while it was hashing
  the existing 1.4 GiB database. No task was prepared. That plan/report is retained;
  the subsequent storage probe uses a separately identified, unchanged snapshot.

Development logs and the exact check outputs are retained outside Git in
`implementacion/evidence/environment/automated-remediation-development/`.
The real storage guard's report is in
`implementacion/evidence/manual-tasks/automated-storage-probe-02/report.md`
with JSON, plan/source/database identities and report checksums alongside it.
These artifacts are local evidence, not committed campaign observations.

## Proposed PR

**Title:** Add unattended F03/F10/F11 remediation validation with explicit automated evidence

**Change and acceptance:** Add one command to execute six independent local
F03/F10/F11 × R/G tasks, apply bounded known repairs, validate existing scenario
oracles, clean owned resources and produce JSON/Markdown technical assessments.
Reuse the existing task controller and delivery modules. G requires intended
automatic detection; R completes reference delivery before its scripted diagnostic.
Persist machine identity throughout evidence and reject it from human calibration,
measurement and limit freezing, regardless of later technical review.

**Verification:** Focused synthetic regressions, pinned environment diagnostics
and the shared environment/unit/policy/offline-crypto/workflow suite pass. The
actual storage guard refuses live preparation below the reserve and reports 0/6
executed; six-task delivery/admission integration remains NOT_EXECUTED. Retain
failure logs as well as passing results.

**Limits:** Results are provisional technical evidence for a process with known
repairs. Human-effort evaluation is deferred. This does not close overall pilot
acceptance, authorize or execute the separate paired hosted campaign, or establish
human productivity/calibration. Same-user hashes are not independent custody.

| Activity | AI contribution | Human review status | Decision | Evidence |
|---|---|---|---|---|
| Implementation and verification | OpenAI Codex: shared-controller mode, sequencing, bounded repairs, evidence assessment, synthetic tests and EN/ES documentation | Pending | Proposed for review; no human acceptance supplied | Local development logs and storage-probe report above |

No push, merge, release publication, hosted workflow dispatch or thesis edit was
performed. Historical human reviews and paired campaign records remain unchanged.
