# Manual task participant instructions

Use these instructions after the operator has prepared your assigned task.
Run commands from the repository root; use the printed task directory as
`MANUAL_TASK`. Read the task's `record.json` for scenario, arm and declared tools.

The goal is a corrected delivery with the same health, source-version and quote
behavior. Work only on the assigned input:

- F03: dependency manifests in `participant/source/`. Keep the runtime wrapper
  and harmless behavior check. A real rebuilt image and scan must validate the
  correction and the whole vulnerability threshold.
- F10: the artifact selection in `participant/image.txt`. The operator supplies
  an authorized local artifact catalog in `participant/authorized-artifact.txt`.
  Obtain authorized evidence with the artifact; do not edit claims, signing keys,
  policy or trust.
- F11: the prohibited privilege settings in `participant/manifest.json`. Keep
  the image and other workload settings. Successful HTTP behavior remains required.

Use the same declared conventional tools in R and G. R can invoke scanners and
verifiers manually. AI assistance is disabled during this session. Declare prior
knowledge, earlier attempts and exposure to the other arm; this is not blinded.

1. Run `python3 implementacion/scripts/manual-tasks.py start "$MANUAL_TASK"`.
   The automated path begins the total timer; its finish begins human review.
2. Record `event "$MANUAL_TASK" investigate --note 'actual activity'` before
   active investigation, using the same script prefix. Inspect retained outputs.
3. Invoke `tool "$MANUAL_TASK" scan`, `provenance` or `manifest` as appropriate.
   Commands and verifiable detections are retained. Use `event ... correct`,
   `wait` and `pause` with real notes; mark active work again when resuming.
4. Make your correction with conventional tools, then invoke `check "$MANUAL_TASK"`.
   This validates your input without repairing it. Failed attempts remain recorded.
5. Invoke `status "$MANUAL_TASK"`, then `cleanup "$MANUAL_TASK"` when finished.
   Preserve the result even if you do not detect or resolve the problem.

Preparation and operator oracles are outside your task timer. Calibration has no
experimental limit; later measured tasks use the frozen total limit. Never reset
the timer or discard a slow attempt. Stop after an exhausted window. Use
`recover "$MANUAL_TASK"` after an interrupted controller and retain the incomplete
attempt before cleanup and any new task.
