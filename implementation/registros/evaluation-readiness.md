# Incomplete campaign evidence and evaluation readiness — handoff

Base: clean main `940582721d0a5bee2fce54272f5dac60a87fad00` (merged PR #44).
Branch: `fix/evaluation-readiness`. Work and local validation used Codespaces.
No tool pin, trust, policy, scenario ID or delivery architecture was changed.

## Defect, repair and observed regression sequence

`verify_pair_packages` required `image`, `primaryStart` and `primaryEnd` even
when the producer had not reached those checkpoints. Matching, checksummed
incomplete records therefore failed with `Archive observation differs from its pair`
instead of remaining excluded observations in campaign analysis.

The initial new test run exposed a test-helper argument-name collision; it was
corrected before the reproduction run. The next run, before production changes,
reproduced the reported archive error for seven producer checkpoints and failed
two CLI analysis classification cases. Both logs remain retained; this records
the actual sequence rather than an invented earlier TDD history.

The verifier now checks mandatory identity/state and complete archived-observation
agreement with the pair, including field presence. Optional image/start/end fields
must agree with reached phases: unstarted, pre-image, failed or lost build,
between build and image binding, pre-admission and interrupted admission.
No endpoint or duration is synthesized. An image is mandatory after post-build
progress; a recorded admission endpoint must match its timer/phase; declared
success still requires complete favorable execution and independent images.
Finalizer-derived classification is the sole permitted field difference, and must
equal recomputation from the original facts. A bootstrap package before arm-init
is retained as preparation only when neither archive nor pair claims an arm
observation. Additional regressions reproduced both checkpoint cases before their
correction; their original fields and unknown durations remain intact.
Source, configuration, database, package hashes/associations and retry restrictions
remain enforced. The producer, original evidence and statistics formulas are unchanged.

Eleven added test methods cover those states, mandatory identity, rehashed semantic
corruption, mismatched/tampered archives, successful pairs, falsely declared
success and one completed arm with an unstarted second arm. They use explicit
**SYNTHETIC** inputs, actual producer marker/finalizer code, the real safe packager,
checksummed temporary archives and the analysis CLI. Infrastructure cleanup is
substituted; no real campaign delivery or human authorization is claimed. Checks
assert classifications/exclusion reasons, unknown durations and byte-for-byte
preservation of original exports. Synthetic authorization objects stay within tests.

## Checks performed

- `python3 implementacion/tests/unit/test_paired_campaign.py`: **37 tests PASS**.
- `python3 implementacion/tests/unit/test_paired_measurements.py`: **51 tests PASS**.
- `make -C implementacion doctor`: **PASS**, existing pinned environment.
- `make -C implementacion test`: **PASS**; six environment cases, 930 service/unit
  cases (including Python wrappers), 43 Python policy cases, Conftest/Kyverno,
  real offline Cosign checks and static workflow cases. No Kubernetes campaign run.
- Documentation: **464 local links, 26 executable Bash blocks and seven CLI help
  interfaces PASS**; paired workflow input names match the existing workflow. Both
  matrices have exactly twenty ordered scenario rows and eight columns. No remote
  commands were executed. `git diff --check` passes.

Exact local logs are under `implementacion/evidence/environment/evaluation-readiness/`:
`01-regression-before.log` (helper failure), `02-regression-reproduced.log`
(expected pre-fix failures), `03-campaign-after.log`, `04-campaign-final.log`,
`05-measurements.log`, `06-doctor.log`, `07-shared-test.log` and
`08-retention-inventory.json`. Follow-up logs `09-derived-classification-before.log`
and `11-bootstrap-before.log` reproduce the two finalizer/initialization cases;
`12-campaign-final.log` and `13-shared-final.log` cover the final code. Intermediate
passing runs remain in `10-campaign-final.log`. Documentation logs 14–16 retain
the initial missing Spanish links (corrected to explicitly labelled EN records),
a check-script YAML key normalization error, and the passing check. Log 17 repeats
the successful link/block/interface/matrix checks after link cleanup. Log 18 checks
the committed diff, including the final TODO link (464 links total).
Generated evidence stays outside Git.

At the user's request, cleanup removed 450,729,178 file bytes (about 430 MiB) of
obsolete/duplicate installation binaries, downloaded packages and extracted
installer copies under `.tmp`. Version metadata, installation logs, all original
scenario/task evidence and canonical databases remain. Available space afterward
was 8,481,042,432 bytes (about 7.90 GiB). `storage-cleanup.json` retains exact paths,
file hashes, authorization and before/after space. No global Docker prune occurred.

## Coverage and execution handoff

The matching [EN](../docs/EN/evaluation-readiness.md) /
[ES](../docs/ES/evaluation-readiness.md) matrices contain exactly twenty rows,
F01–F14 and L01–L06. They use committed lane-A, supplied hosted runtime, paired
pilot and PR44 records. The local inventory establishes presence only: A1 and
PR44 originals remain; the reported later A2 and removed pilot review originals
are unavailable here. No new independent audit is asserted.

The [EN campaign commands](../docs/EN/paired-rg-campaign.md) and
[ES commands](../docs/ES/paired-rg-campaign.md) cover clean final merged source,
pinned checks, separately authorized development RG and GR using one retained
DB, review/export, explicit draft count/seed, binding, human-only authorization,
plan publication, approved positions and all-attempt analysis. Failed-run watch
status is retained while allowing evidence download; added logs/job metadata stay
outside immutable original directories. The analysis command selects every
retained campaign attempt, including incomplete attempts and retry originals.

**Remaining:** review/merge this increment through the normal process, identify
the actual final source, run its environment/shared checks, decide any functional
reruns from the matrix, separately authorize fresh hosted development RG/GR, review
those originals, then decide campaign count/seed, readiness and authorization.
Ten pairs remains provisional. Final-source execution, hosted plan publication,
campaign execution and overall acceptance are NOT_EXECUTED/pending here.

Human-effort measurement, eligible manual calibration and limit freezing are
**deferred**. Scripted known repairs cannot become human calibration/productivity
data. Functional scenarios, scripted remediation, the original four-pair timing
pilot and the future timing campaign remain separate datasets. The readiness
guides list thesis statements for later alignment; no thesis files were edited.

## Proposed PR

**Title:** Fix incomplete campaign archive verification and consolidate evaluation readiness

**Change and acceptance:** Preserve legitimate incomplete campaign attempts through
archive verification and analysis by validating image/timer fields against reached
producer phases. Keep complete archive/pair agreement, mandatory identities and
successful-observation requirements strict. Add producer-to-archive-to-analysis
regressions and matching twenty-row EN/ES readiness matrices, and reconcile the
final-source campaign handoff and deferred human-effort scope.

**Verification:** 37 campaign and 51 measurement regressions, pinned `doctor` and
shared `make test` pass. Labelled synthetic tests exercise actual temporary safe
archives and the CLI; they establish no campaign execution. Preserve reproduced
failures and existing historical observations. Documentation checks pass: twenty rows in each language, 464 local links,
26 Bash blocks, seven CLI interfaces and workflow inputs; logs are retained.

**Limits:** Historical executions retain their original source and review status.
Fresh final-source development, campaign authorization/publication/execution and
overall acceptance remain pending. Ten pairs is a provisional recommendation.
Human-effort/calibration work is deferred and is not completed by automation.

| Activity | AI contribution | Human review | Decision | Evidence |
|---|---|---|---|---|
| Fix, validation and readiness handoff | OpenAI Codex: regression reproduction, phase-aware verification, synthetic tests, authorized installer cleanup, EN/ES coverage and operational guidance | Pending | Proposed for review; no acceptance supplied | Logs and linked records above |

No hosted workflow dispatch, image publication, real campaign freeze/authorization,
human review on another person's behalf, push, merge, release or thesis edit was
performed in this increment. Only synthetic test fixtures exercise authorization.
