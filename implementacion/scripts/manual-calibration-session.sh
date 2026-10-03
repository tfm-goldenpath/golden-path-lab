#!/usr/bin/env bash
# Copy this file to implementacion/evidence/manual-tasks/calibration-session.sh
# before editing inputs. The copy is ignored by Git and is not frozen source.
# Run from anywhere inside this repository: bash PATH/TO/COPY prepare
# Preparation stops at READY. Run `start` separately when the person is ready.
set -Eeuo pipefail

repo=$(git rev-parse --show-toplevel)
root="$repo/implementacion"

# EDIT THESE INPUTS in the ignored copy, or supply environment variables.
# Editor example: Visual Studio Code 1.140.0 - Codespaces Desktop
# Check the actual editor version in Help > About; the example is not a finding.
# Participant example: Xylons
# Knowledge example: Project author; familiar with the controls; previous
# preparation failures observed. Include actual prior exposure; do not use
# "none" if you already know the project or scenario.
MANUAL_EDITOR=${MANUAL_EDITOR:-}
MANUAL_PARTICIPANT=${MANUAL_PARTICIPANT:-}
MANUAL_KNOWLEDGE=${MANUAL_KNOWLEDGE:-}
MANUAL_SESSION=${MANUAL_SESSION:-calibracion-01}
MANUAL_SCENARIO=${MANUAL_SCENARIO:-F11}
MANUAL_ARM=${MANUAL_ARM:-G}
MANUAL_SEED=${MANUAL_SEED:-manual-six-v1-2026-10-02}
MANUAL_DB=${MANUAL_DB:-$root/.tmp/vulnerability-selection/db-snapshot}

# OUTPUTS are derived automatically. Do not paste task IDs into this file.
[[ "$MANUAL_SESSION" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]] || { echo 'ERROR: Invalid session name' >&2; exit 1; }
MANUAL_DIRECTORY="$root/evidence/manual-tasks/$MANUAL_SESSION"
MANUAL_PLAN="$MANUAL_DIRECTORY/plan.json"
controller="$root/scripts/manual-tasks.py"
action=${1:-help}
[[ $# == 0 ]] || shift

case "$action" in
  prepare)
    [[ $# == 0 ]] || { echo 'ERROR: Configure inputs above; prepare takes no extra arguments' >&2; exit 1; }
    for name in MANUAL_EDITOR MANUAL_PARTICIPANT MANUAL_KNOWLEDGE; do
      [[ -n "${!name//[[:space:]]/}" ]] || { echo "ERROR: Set $name in the ignored copy or environment" >&2; exit 1; }
    done
    [[ "$MANUAL_SCENARIO" =~ ^F(03|10|11)$ && "$MANUAL_ARM" =~ ^[RG]$ ]] || { echo 'ERROR: Expected F03/F10/F11 and R/G' >&2; exit 1; }
    export PATH="$root/.tools/bin:$PATH"
    test -f "$MANUAL_DB/db/trivy.db"
    test -f "$MANUAL_DB/db/metadata.json"
    make -C "$root" doctor
    python3 "$controller" plan --reuse --seed "$MANUAL_SEED" --output "$MANUAL_PLAN" \
      --database "$MANUAL_DB" --editor "$MANUAL_EDITOR"
    python3 "$controller" prepare --follow --plan "$MANUAL_PLAN" --dataset calibration \
      --scenario "$MANUAL_SCENARIO" --arm "$MANUAL_ARM" \
      --participant "$MANUAL_PARTICIPANT" --prior-knowledge "$MANUAL_KNOWLEDGE"
    ;;
  start|status|check|cleanup|recover|event|tool|review|paths)
    MANUAL_TASK=$(jq -er '.taskDirectory' "$MANUAL_DIRECTORY/current-task.json")
    [[ "$MANUAL_TASK" == "$MANUAL_DIRECTORY/calibration/task-"* ]] || { echo 'ERROR: Task selection belongs to another session' >&2; exit 1; }
    if [[ "$action" == paths ]]; then
      printf 'PLAN %s\nTASK %s\nPARTICIPANT %s\n' "$MANUAL_PLAN" "$MANUAL_TASK" "$MANUAL_TASK/participant"
    else
      export PATH="$root/.tools/bin:$PATH"
      python3 "$controller" "$action" "$MANUAL_TASK" "$@"
    fi
    ;;
  help)
    cat <<'HELP'
Set the three required inputs in your ignored copy, then:
  bash calibration-session.sh prepare       # doctor, create/reuse plan, live log
  bash calibration-session.sh paths         # saved plan/task/participant paths
  bash calibration-session.sh start         # start the timer only after READY
  bash calibration-session.sh status

During actual human work, record only actions that really happen:
  bash calibration-session.sh event investigate --note 'Describe actual activity'
  bash calibration-session.sh tool manifest # F11; scan for F03; provenance for F10
  bash calibration-session.sh event correct --note 'Describe actual activity'
  # Make the correction yourself in the allowed participant input now.
  bash calibration-session.sh event wait --note 'Describe actual waiting'
  bash calibration-session.sh event pause --note 'Describe an actual break'
  bash calibration-session.sh check

Read the check result and linked diagnostics before deciding to finish:
  bash calibration-session.sh cleanup

After closure and successful cleanup, record your explicit review:
  bash calibration-session.sh review --help # required declaration options
  bash calibration-session.sh status
Use the review command with your reviewer, decision, purpose, assistance and rationale.
READY -> start; REVIEW -> investigate/edit/check; COMPLETED -> cleanup;
cleaned-up attempt -> human review. Review identity and assistance are declarations.
Original archived humanAcceptance stays unchanged; status shows the effective review.

Do not run the human commands as an automatic batch. No command repairs a task.
CORRECTION_REJECTED leaves the task in REVIEW with the same timer/window.
Cleanup during REVIEW closes the unresolved attempt as INCOMPLETE.
Ctrl-C during prepare interrupts it. Retain the attempt, run cleanup, then prepare
a new task. Use recover only for a recorded interrupted controller operation.
After cleanup, set the next scenario/arm and update prior knowledge in the copy.
The six calibration combinations are F03/R, F03/G, F10/R, F10/G, F11/R, F11/G.
The retained plan fixes the later measured order; this helper runs calibration.
Keep each task's evidence. Disable AI assistance for the human calibration work.
Changing source, seed, database or editor requires a new session name.
HELP
    ;;
  *) echo "ERROR: Unknown action: $action (use help)" >&2; exit 1;;
esac
