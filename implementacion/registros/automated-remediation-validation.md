# Automated remediation validation — implementation and live results

Base: main `387c75d15e3b0f50d343f6f32b1d6895ab3529dd` (merged PR #43).
Branch: `feat/automated-remediation-validation`. Implementation and validation
were performed in the supplied Codespaces workspace. Development probes retain
their working-tree identities. The subsequent live session below used the unchanged
local implementation commit `ea790781990766a3cb20bae5a302e1175edd3bd0`;
no hosted execution is claimed.

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
- At the initial development handoff, live evaluation was **NOT_EXECUTED**.
  Workspace and Docker storage had approximately 4.9 GiB available, below the
  runner's 6 GiB reserve. The storage probe stopped before task preparation,
  retained six unexecuted report positions and created no lab resources. No
  pruning, evidence deletion or database substitution occurred in that probe.
  The later user-authorized cleanup and live execution are recorded below.
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

## Live local execution — 2026-10-04

**6/6 VALIDATED**, with completion, owned cleanup and archive integrity passing
for each combination. These are provisional automated technical observations;
human acceptance remains **pending** and every task is permanently ineligible
for human calibration, measurement and limit freezing.

Session: `automated-six-01`; seed: `automated-six-v1`; lane A; dataset:
`automated-validation`; execution mode: `scripted`; actor: `automation`.
The single invocation ran from 08:48:54.323231 to 09:30:35.382754 UTC
(2501.060 s, about 41.68 minutes including preparation, identity checks, repairs,
verification, packaging and cleanup), and exited 0. All six tasks were real,
independent executions: no synthetic reports, operation retries, interruptions,
human interventions, activity notes or human-review commands.

The user explicitly requested cleanup of old executions before the live run.
Only two redundant frozen-DB copies belonging to completed, packaged runs
`run-Dpn979Qu` and `run-fixmwBSs` were removed after matching their bytes to the
retained canonical DB and verifying the old package hashes. Available space rose
from 5,211,316,224 to 8,114,561,024 bytes (about 2.70 GiB reclaimed). Earlier
records, raw evidence, archives and the canonical DB were retained. There was no
global Docker prune. All six preparation reserve checks passed; about 7.5 GiB
remained after the session. Post-run inspection found no Docker containers,
volumes, kind clusters or task-owned builders.

### Observed combinations

Each expected detection below matched the observed mechanism. G detected during
initial delivery; R completed reference delivery before its scripted diagnostic.
All repairs, completion checks, cleanup and archive integrity passed. Times are
seconds from task start to detection and verified completion, excluding preparation
and cleanup. They measure this script with known repairs, not human effort,
developer productivity or autonomous discovery.

| Order | Combination | Expected = observed | Task | Detection s | Completion s | Assessment |
|---|---|---|---|---:|---:|---|
| 1 | F10/G | `automatic:provenance` | `task-d55fd5aa0205` | 12.580 | 73.822 | VALIDATED |
| 2 | F10/R | `scripted:provenance` | `task-4f6c16d69db9` | 42.967 | 103.662 | VALIDATED |
| 3 | F03/G | `automatic:scan` | `task-0b0909315f55` | 35.509 | 157.821 | VALIDATED |
| 4 | F03/R | `scripted:scan` | `task-96ec30506752` | 82.485 | 209.797 | VALIDATED |
| 5 | F11/R | `scripted:manifest` | `task-f850f66aca7e` | 40.670 | 100.840 | VALIDATED |
| 6 | F11/G | `automatic:manifest` | `task-2ee57fd0c764` | 9.068 | 55.859 | VALIDATED |

- F03: both rebuilt images had new digests; the target finding was removed, the
  complete vulnerability threshold passed and health/version/quote behavior was
  preserved. Only package.json and package-lock.json changed to minimist 1.2.8.
- F10: each repair changed only image.txt to that task's read-only authorized
  reference. Fresh authenticated provenance and deployed behavior passed.
- F11: only quotes-node privileged and allowPrivilegeEscalation changed to false.
  The image and all other manifest properties were preserved; completion passed.

The retained logs include Dockerfile default-ARG and Kyverno API deprecation
warnings. They did not prevent these runs; no tool, policy or trust setting was
changed to suppress them. No unresolved technical failure was observed.

### Retained evidence and identities

The complete [Markdown report](../evidence/manual-tasks/automated-six-01/report.md)
and [JSON report](../evidence/manual-tasks/automated-six-01/report.json) retain
per-operation timings, original diagnostics, repair transformations and hashes,
validation receipts and archive associations. These generated artifacts remain
outside Git; preserve the complete session, linked raw runs, safe packages and
canonical database as described in the guides. This committed record captures
results and identifiers without embedding generated packages or private material.

- Source commit: `ea790781990766a3cb20bae5a302e1175edd3bd0`.
- Source tree SHA256: `270a03a9191531fa9ec786427b8b75c0fbe032430f90feace369070774a6f246`.
- tools.lock.json SHA256: `b466879d7f8e02f0bc1fb8eb9ad212d818249bba449184a1dd875311d93d2a45`.
- Canonical DB: `implementacion/.tmp/vulnerability-selection/db-snapshot`.
- trivy.db SHA256: `b3c1bef699d2fb9fed55c280ddfe9f681cf43b117cc73e54f852c1d840d8399e`.
- metadata.json SHA256: `1e3cc0661923e54ef8baf714edbbd66865f78144ab1ea8d409e67d163dfb10a1`.
- Original final report.json SHA256: `47a53ae9c0b5e20dc6a719d1e887c92a020619c312223216441c3ec0266ee9f7`.
- Original final report.md SHA256: `e9ee6afccfe7b19794bddd96d57712b89bd9e5cae3e828f7b2dbf47a96e4474c`.

Report regeneration can change report hashes; the values above identify the
original final output. The six sealed tasks and their archive hashes remain fixed.
Raw directories are `implementacion/evidence/raw/<run>/`; packages are under
`implementacion/evidence/packages/`. Each archive has its existing checksum sidecar.

| Combination | Retained package | SHA256 |
|---|---|---|
| F10/G | `run-rZHXsd7i.tar.gz` | `8ef9ec8c54efb51e591b52a67ac7189dc25d1485dcbae21575504f1ac88bbdf4` |
| F10/R | `run-pd8oXkxS.tar.gz` | `aa1bbfbc9386a13336f3f9809066fcb3c54231573d85fc908eb97e64fd6f904b` |
| F03/G | `run-G0n1bJ9K.tar.gz` | `354b22bda1c7822b6fa3c744d0d1296139603a53a62eaa2fe763b10ed2ae4c97` |
| F03/R | `run-gKNMKGI0.tar.gz` | `84682ba19758ffbcf2c8ea2b6dfa0f47fa2eb64d16bc53d9bb651e1f5a37eafc` |
| F11/R | `run-Dh0ak8AA.tar.gz` | `e3efac5eb98dab0e17fc2336b602668ec36783b3cecfbabe6a2492fca5875683` |
| F11/G | `run-4mg9a28a.tar.gz` | `e801caa5f04dc91d1b181c7b0e3dfeeda944e66fc58d98ebcf4df92ac08d487f` |

Cleanup authorization, exact removed paths/hashes and free-space observations are
in `evidence/environment/automated-six-live-20261004/storage-cleanup.json`.
The same directory retains `01-storage-cleanup.log`, `02-doctor.log`,
`03-six-run.log` and `04-final-audit.log`. Final automated verification rechecked
all six assessments and sealed archive associations, report checksums, unchanged
source/database identities, 78 core task/operation/repair records carrying scripted
identity, absence of human-review activity and absence of containers/volumes.
The same-user hashes provide integrity checks, not independent custody.

Documentation verification passed 125 local links, the 10 executable EN/ES guide
Bash blocks, and agreement of all six registered rows/timings/archive hashes with
the report. `git diff --check` passed. Logs `05-documentation-checks.log` and
`06-documentation-checks.log` retain the initial overly broad syntax check
(which encountered an unchanged historical Spanish placeholder) and the scoped
passing check. No historical commands were rewritten to hide that observation.

These documentation updates were made after the execution ended and do not alter
its recorded source. Human-effort evaluation remains deferred. The historical
rehearsals, PR #43 paired campaign, overall pilot acceptance and hosted campaign
authorization retain their separate status.

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
initial storage probe correctly refused preparation below the reserve (0/6).
After explicitly authorized removal of two redundant DB copies, the real Codespaces
session on `ea790781990766a3cb20bae5a302e1175edd3bd0` validated all six
combinations, including completion, owned cleanup and archive integrity; exit 0.
No retries, interruptions or human interventions. Initial failures/probes remain
retained alongside the successful evidence.

**Limits:** Results are provisional technical evidence for a process with known
repairs. Human-effort evaluation is deferred. This does not close overall pilot
acceptance, authorize or execute the separate paired hosted campaign, or establish
human productivity/calibration. Same-user hashes are not independent custody.

| Activity | AI contribution | Human review status | Decision | Evidence |
|---|---|---|---|---|
| Implementation and verification | OpenAI Codex: shared-controller mode, sequencing, bounded repairs, evidence assessment, synthetic tests, EN/ES documentation, user-authorized storage cleanup and live execution/result verification | Pending | Proposed for review; no human acceptance supplied | Development logs, storage probes and six-task live evidence above |

No push, merge, release publication, hosted workflow dispatch or thesis edit was
performed. Historical human reviews and paired campaign records remain unchanged.
