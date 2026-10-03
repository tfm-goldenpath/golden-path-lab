# Calibration with reusable inputs and paths

[Español](../ES/manual-calibration-session.md) · [Procedure and oracles](manual-task-calibration.md)

The [command file](../../scripts/manual-calibration-session.sh) prepares **one
calibration task** per invocation: it checks the environment, creates or reuses
the plan, and displays the live log. It stops at `READY`. Starting the timer and
recording human events remain separate actions.

## 1. Editable copy and inputs

From the repository root, create the copy once:

```bash
MANUAL_RUNNER="$PWD/implementacion/evidence/manual-tasks/calibration-session.sh"
mkdir -p "$(dirname "$MANUAL_RUNNER")"
if [[ ! -e "$MANUAL_RUNNER" ]]; then
  cp implementacion/scripts/manual-calibration-session.sh "$MANUAL_RUNNER"
fi
```

Edit **this ignored copy**. Editing the original script during a session changes
the source fixed by the plan. Replace the three empty assignments at the top.
Adapt these examples before running:

```bash
MANUAL_EDITOR=${MANUAL_EDITOR:-'Visual Studio Code 1.140.0 - Codespaces Desktop'}
MANUAL_PARTICIPANT=${MANUAL_PARTICIPANT:-'Francisco'}
MANUAL_KNOWLEDGE=${MANUAL_KNOWLEDGE:-'Project author; familiar with the controls; previous preparation failures observed'}
```

Check the actual version in **Help → About**: `1.40.0` and `1.140.0` are different.
The example does not verify your editor. Describe actual experience, including
previous attempts; do not declare `none` if you know the project or scenario.

| Input | Initial value | Purpose |
|---|---|---|
| `MANUAL_SESSION` | `calibracion-01` | Choose a new unused name when source, database, seed or editor changes. |
| `MANUAL_SCENARIO` | `F11` | Next scenario: `F03`, `F10` or `F11`. |
| `MANUAL_ARM` | `G` | Next arm: `R` or `G`. |
| `MANUAL_KNOWLEDGE` | Required | Update exposure after each attempt. |
| `MANUAL_DB` | `.tmp/vulnerability-selection/db-snapshot` under `implementacion/` | Existing frozen database; the file neither downloads nor replaces it. |
| `MANUAL_SEED` | `manual-six-v1-2026-10-02` | Keep the agreed seed. |

Environment variables can override inputs. After cleaning up the preceding task:

```bash
MANUAL_SCENARIO=F11 MANUAL_ARM=R bash "$MANUAL_RUNNER" prepare
```

This changes those inputs for that invocation only. Keep the same session name
in subsequent commands.

## 2. Prepare in one invocation

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh prepare
```

Expect `PLAN_CREATED` or `PLAN_REUSED`, `TASK`, tool output and, only after
successful preparation, `READY; total timer has not started`. There is no separate
plan command or task ID to copy. `plan --reuse` checks source, database, seed and
editor without overwriting identities; changes require another session. Missing
required inputs stop the helper before infrastructure preparation.

Preparation can take time. Ctrl-C interrupts it: retain the attempt, run `cleanup`
and review the cause before preparing another. There is no automatic retry.
Another preparation requires cleanup of the preceding task, even if incomplete.

### Codespaces networking after restart

Preparation now checks kind connectivity automatically in Codespaces and restores
only the diagnosed temporary forwarding pair when needed. See the
[network guide](kind-network-firewall.md) for its scope, evidence and removal.
The helper runs before image build, outside the task timer.

After updating this source, retain and clean up the previous attempt, then use a
new session name. For example, with the three required inputs already configured:

```bash
export MANUAL_SESSION=calibracion-red-01
bash implementacion/evidence/manual-tasks/calibration-session.sh prepare
```

Keep that export for `paths`, `start`, `status` and `cleanup` in this terminal;
in another terminal export it again or set the session in the ignored copy.
Choose another unused name if this example already has a plan from older source.
Wait for `READY` before `start`. The previous DNS-failed attempt remains evidence,
not a resumable prepared task.

## 3. Saved paths and starting

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh paths
bash implementacion/evidence/manual-tasks/calibration-session.sh start
```

`paths` prints the plan, task and `participant/`. Run `start` when ready: it begins
the timer and rejects tasks outside `READY`. Before creating infrastructure,
`prepare` saves `<session>/current-task.json`, including attempts that later fail.
This file selects the task; `record.json` remains the source of its status.

Use the same file in another terminal. External commands can also retrieve the path:

```bash
MANUAL_TASK=$(jq -er '.taskDirectory' \
  implementacion/evidence/manual-tasks/calibracion-01/current-task.json)
```

## 4. Human work and cleanup

Follow the [participant instructions](manual-task-participant.md). Use these
commands individually; **do not run them as an automatic batch**. Record notes
and activities only when they actually occur:

These are separate steps, with human work between them. The note strings are
examples: replace them with what you actually do.

**Begin investigation**, then inspect the retained output yourself:

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh event investigate --note 'Describe your actual investigation'
bash implementacion/evidence/manual-tasks/calibration-session.sh tool manifest
```

Use `manifest` for F11, `scan` for F03 and `provenance` for F10.

**When you begin your correction**, record that transition:

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh event correct --note 'Describe your chosen correction'
```

Now make the correction yourself in the allowed participant input, using your
declared tools. `event correct` only records an activity; it edits no task input.
Use `event wait` only for an actual wait, and `pause` for a break. Tool/check
execution already records waiting automatically; mark active work again when
resuming. Disable AI assistance during the human task.

**After the actual edit**, verify it:

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh check
```

Read the result before deciding what to do next:

- `CORRECTION_REJECTED; task remains REVIEW`: open the printed `CHECK_RESULT`
  file and its linked diagnostics. Completion is unvalidated; continue human
  work with the same timer/window. `check` does not repair the input.
- `VALIDATED_COMPLETION`: the completion checks passed.
- `INCOMPLETE` or `EXHAUSTED`: retain the outcome and clean up the attempt.

**When you decide to finish the attempt**, run cleanup separately:

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh cleanup
```

Cleanup during `REVIEW` closes an unresolved attempt as `INCOMPLETE`; successful
resource cleanup does not validate a correction. Preserve it and prepare a new
attempt if needed. Use `recover` before cleanup only after abrupt controller
termination with a recorded operation. `humanAcceptance` remains `pending`;
completion is separate from a person's later review.

After `CLEANUP_COMPLETE`, preserve evidence, change scenario/arm and update prior
knowledge in the copy, then prepare again. Cover F03/R, F03/G, F10/R, F10/G, F11/R
and F11/G. Calibration limits remain unset. The plan separately retains the order
of the eventual six measured tasks. Preparation does not run the campaign or
establish human acceptance.

## Later human review

Use the [review command and worked examples](manual-task-review.md) after closure
and successful cleanup. The helper accepts `bash "$MANUAL_RUNNER" review` with
all required review options and forwards them to the saved task. `status` displays
the effective decision, purpose, assistance, eligibility/reasons and review path.

The original sealed task/package and earlier notes remain unchanged. Their
`humanAcceptance: pending` is the historical snapshot; only a person's explicit
review updates the displayed acceptance. Guided rehearsals can be accepted while
remaining ineligible for calibration limits. Missing reviews do not imply acceptance.

READY → `start`; REVIEW → investigate/edit/`check`; COMPLETED → `cleanup`;
closed and cleaned up → human `review`. Source changes require a new plan for
formal calibration. The [reviewed F11/G rehearsal](cases/F11-F12-L06/record.md#guided-functional-rehearsal-reviewed-2026-10-03)
remains excluded from calibration-limit selection.
