# Human review and calibration eligibility

[Español](../ES/manual-task-review.md) · [Task procedure](manual-task-calibration.md)

Technical completion, human acceptance and eligibility for calibration limits
are separate. A person records a review after an attempt is closed and cleanup
succeeds. This command does not run a task or generate activity events.

## Review one retained attempt

Use the original task directory under `implementacion/evidence/manual-tasks/`.
Retain its complete files, final `SHA256SUMS.txt`, linked original run archive and
archive checksum sidecar. The command verifies these files and binds the review
to their hashes. A failed preparation without a run archive can be reviewed if
it has a final task checksum manifest and successful cleanup; it is ineligible.

Archive verification checks both outer/internal checksums and task association.
Every member must belong to the expected run root with safe, unambiguous paths;
one root `manual-task.json` must identify the same task, scenario, arm, dataset
and complete source/database/tools/environment identity as the sealed record.
The cleanup-time snapshot may have different operation state, cleanup status and
events. It need not be byte-identical to the final record.

These checks also apply when loading existing reviews and frozen selections.
Valid review sidecars and their hash bindings keep the same format. An old review
of a substituted or missing task archive now fails validation, even if the archive
checksums pass. Preserve the failed evidence; do not rewrite records, packages or
review hashes to make it pass. This command does not use or execute archived code.

Required declarations:

| Option | Meaning |
|---|---|
| `--reviewer` | Nonblank name/identifier of the person making the review. |
| `--decision accepted\|rejected` | Explicit review decision; independent of technical completion. |
| `--rationale` | Nonblank justification, including observations, exclusions and relevant assistance. |
| `--purpose rehearsal\|calibration\|measurement` | Declared purpose. `measurement` requires a measurement dataset and never qualifies for calibration limits. |
| `--assistance none\|ai\|human\|ai-and-human\|unknown` | Assistance during the task. `none` means unaided use of declared conventional tools; `unknown` is ineligible. |

Names and assistance are **human declarations**, not authenticated facts. A tool
cannot infer unaided work from successful tests or identify the real author of
a command. An assistant's evidence audit is not a human review. Do not have an
assistant execute the review command for you or assist during timed tasks.

### Example: accepted guided rehearsal

The retained `task-b069656237fc` is a guided F11/G rehearsal. Its original record,
cleanup evidence, checksums, archive and three human notes remain available after
disk cleanup. See the [historical review](cases/F11-F12-L06/record.md#guided-functional-rehearsal-reviewed-2026-10-03).
Francisco has now recorded an explicit review; see the [confirmed results](cases/F11-F12-L06/record.md#human-validation-of-pr-41-2026-10-03).
To revise that review, use `--supersedes` with its exact current path and explain
the change. Repeating the first-review example unchanged will be refused.
The following is a command for the person to run after inspecting that evidence;
it has not been run on their behalf. It records a **new current review time** and
does not import or backdate the old text notes.

```bash
MANUAL_TASK="$PWD/implementacion/evidence/manual-tasks/calibracion-54b7fa8-01/calibration/task-b069656237fc"
python3 implementacion/scripts/manual-tasks.py status "$MANUAL_TASK"
read -r -p 'Your reviewer name: ' MANUAL_REVIEWER
read -r -p 'Your decision (accepted/rejected): ' MANUAL_DECISION
read -r -p 'Actual purpose (rehearsal/calibration/measurement): ' MANUAL_PURPOSE
read -r -p 'Actual assistance (none/ai/human/ai-and-human/unknown): ' MANUAL_ASSISTANCE
read -r -p 'Your evidence-based justification, including assistance and exclusions: ' MANUAL_REVIEW_REASON
python3 implementacion/scripts/manual-tasks.py review "$MANUAL_TASK" \
  --reviewer "$MANUAL_REVIEWER" --decision "$MANUAL_DECISION" \
  --purpose "$MANUAL_PURPOSE" --assistance "$MANUAL_ASSISTANCE" \
  --rationale "$MANUAL_REVIEW_REASON"
python3 implementacion/scripts/manual-tasks.py status "$MANUAL_TASK"
```

The person must choose and enter the declarations; none is inferred from these
commands. If their decision is `accepted`, with `rehearsal` purpose and `ai`
assistance, expected output is `REVIEW_RECORDED <path>`, then
`CALIBRATION_INELIGIBLE purpose:rehearsal, assistance:ai`.
Status shows `humanAcceptance: accepted`, `archivedHumanAcceptance: pending`,
`review.purpose: rehearsal`, `review.eligibleForCalibration: false`, reasons and
the review path/hash. Acceptance of this rehearsal does not approve calibration
limits, all scenarios or the overall pilot. Change the example declarations if
they do not accurately describe the reviewed attempt.

### Example: genuinely unaided calibration

Use this only after a real unaided calibration has completed, been cleaned up
and been inspected by the reviewer. No eligible calibration is claimed here.

```bash
read -r -p 'Completed, cleaned-up unaided calibration TASK path: ' MANUAL_TASK
read -r -p 'Your reviewer name: ' MANUAL_REVIEWER
read -r -p 'Your evidence-based review justification: ' MANUAL_REVIEW_REASON
python3 implementacion/scripts/manual-tasks.py review "$MANUAL_TASK" \
  --reviewer "$MANUAL_REVIEWER" --decision accepted \
  --purpose calibration --assistance none --rationale "$MANUAL_REVIEW_REASON"
python3 implementacion/scripts/manual-tasks.py status "$MANUAL_TASK"
```

Expected: `REVIEW_RECORDED <path>`, then `CALIBRATION_ELIGIBLE` for a real,
completed, cleaned-up calibration with intact evidence. Status reports the
accepted decision and `review.eligibleForCalibration: true`. It still does not
choose or freeze limits. For a negative review, use `--decision rejected`; the
attempt and justification remain preserved with `decision:rejected` as a reason.

### Review a measurement attempt

For a closed, cleaned-up task whose recorded dataset is `measurement`, use the
explicit measurement purpose. No live measurement or acceptance is claimed here.
After inspecting its evidence, the person supplies the decision and declarations:

```bash
read -r -p 'Closed, cleaned-up measurement TASK path: ' MANUAL_TASK
read -r -p 'Your reviewer name: ' MANUAL_REVIEWER
read -r -p 'Your decision (accepted/rejected): ' MANUAL_DECISION
read -r -p 'Actual assistance (none/ai/human/ai-and-human/unknown): ' MANUAL_ASSISTANCE
read -r -p 'Your evidence-based justification: ' MANUAL_REVIEW_REASON
python3 implementacion/scripts/manual-tasks.py review "$MANUAL_TASK" \
  --reviewer "$MANUAL_REVIEWER" --decision "$MANUAL_DECISION" \
  --purpose measurement --assistance "$MANUAL_ASSISTANCE" \
  --rationale "$MANUAL_REVIEW_REASON"
python3 implementacion/scripts/manual-tasks.py status "$MANUAL_TASK"
```

Expected for `accepted` with `none`: `REVIEW_RECORDED <path>` and
`CALIBRATION_INELIGIBLE purpose:measurement, dataset:measurement`. Status displays
the declared decision and `review.purpose: measurement`, with calibration
eligibility false. Using this purpose for a calibration dataset fails with
`Measurement review purpose requires a measurement task`. The prohibition on AI
assistance during measured tasks remains unchanged; a declaration does not waive it.

Existing reviews keep their original purposes. They are never automatically
relabeled; an explicit revision needs `--supersedes` as described below.

The session helper also forwards `review` and its options to the saved task:
`bash "$MANUAL_RUNNER" review ...`. A copied older helper must be refreshed to
use this action; save your declared inputs before replacing an ignored copy.

## Status and allowed next action

`status` is read-only and includes `technicalStatus`, the effective human decision,
purpose, assistance, eligibility/reasons, review path/hash and `nextAction`:

| Task state | Next action |
|---|---|
| `READY` | `start` when the person is ready. |
| `REVIEW` | Investigate, edit allowed inputs and `check` within the same timer/window. |
| `COMPLETED` | `cleanup`. Completion alone grants no acceptance. |
| Closed and cleaned up | Explicit human `review`. |
| Reviewed | Retain evidence; assess eligibility before selecting limits. |

Reviews are stored outside the sealed task in
`<session>/reviews/<task-id>/review-0001-<sha256>.json`. Original `record.json`,
`summary.json`, timestamps, checksums and run archives remain unchanged, including
their historical `humanAcceptance: pending`. Only the displayed effective value
incorporates the new review. Old free-text notes and absent review metadata do
not imply supported acceptance or eligibility.

A second review requires `--supersedes '<exact current review path from status>'`
alongside all declarations. Each revision has a new timestamp and hash, links its
predecessor and preserves earlier decisions. Missing, changed or ambiguous review
history fails validation. Restore damaged originals from the preserved copy;
do not edit review JSON, rehash it or modify old checksums to obtain eligibility.

## Freeze only six eligible calibrations

Use the existing [freeze-limits command](manual-task-calibration.md#timing-and-limits)
with exactly one task for each F03/R, F03/G, F10/R, F10/G, F11/R and F11/G. Every
selected attempt must have an explicitly accepted review, calibration purpose,
`assistance: none`, real completed status, successful cleanup and intact evidence.
Unreviewed, rejected, guided, synthetic, incomplete or duplicate selections fail;
retain all excluded attempts and their reasons.

The same plan, current source/configuration and database requirements still apply.
Historical reviews can be recorded from a newer checkout; **formal calibration
after a source change requires a new plan and new tasks on that source**. A review
cannot migrate an old calibration to the new source. The person supplies the
three limits and rationale; each scenario uses one total limit shared by R/G.

The frozen decision retains each selected record and review path/hash. Loading a
frozen plan verifies those selections again. A changed, missing or superseded
review blocks further use, even if its new decision is also accepted. Legacy
frozen plans without review bindings are rejected. Preserve the old decision and
use a new plan; never rewrite a frozen plan to accommodate a later review.

Download the session including `reviews/`, final task records, linked run archives
with sidecars and the identified database. Reviews written after an earlier
download need another external copy. These unsigned local hashes provide change
detection relative to retained evidence, not independent custody or authentication.

No timing definition, scenario oracle, delivery control, tool pin or lane B pilot
protocol changes. Lane A does not establish hosted OIDC/GHCR negative coverage.
Francisco confirmed live use of the review procedure on two accepted F11/G
rehearsals. Both remain calibration-ineligible. Their `assistance: none`
declarations conflict with retained guidance evidence or the review rationale;
they remain unchanged pending an explicit human clarification/revision. The
observed exclusion is by rehearsal purpose. See the [results and evidence](cases/F11-F12-L06/record.md#human-validation-of-pr-41-2026-10-03).
Six-task calibration, scenario readiness and overall pilot acceptance remain
pending; no measured-task execution or live measurement-purpose review is claimed.
