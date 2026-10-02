# Human calibration of F03 F10 and F11

[Español](../ES/manual-task-calibration.md) · [Participant instructions](manual-task-participant.md) · [Current status](../../TODO.md)

This procedure supports **six human tasks in lane A: F03/F10/F11 in R and G**.
Implementation and synthetic tests are not human calibration or live scenario
acceptance. No human times, limits or acceptance have been supplied by this
increment. The [completed lane B timing pilot](paired-rg-pilot-review.md) keeps
its own protocol and observations. Its four pilot pairs and provisional ten
campaign pairs do not apply to these six tasks.

## Operator preparation and existing oracles

Use one frozen source/configuration, scanner database and declared conventional
tool set for the session. The plan records the Git base, hashes of source files,
tool lock, database bytes, editor declaration, seed and sequence. A changed source,
database, order or frozen limit is rejected. Each task gets a new owned kind
cluster, zot registry, builder and development key through the existing modules.
Resources, trust profile, prepared build history and fixtures are equivalent
across arms; run names, keys and image digests are independent. Resource class
must match the preceding preparations. Clean up one attempt before preparing
another. This does not establish hosted OIDC/GHCR negative coverage.

The entry point is deliberately **post-build**: inputs, initial images, fixture
evidence, database, admission readiness and positive functionality are prepared
before the task starts. Preparation confirms the fault for the operator and
leaves the measured workload absent. Preparation tests are not participant
detections. Build cache starts in a new builder and then reflects this recorded
preparation; this is not the lane B prepared-cache experiment.

| Scenario and existing record | Prepared problem | G's first applicable control | Validated human correction |
|---|---|---|---|
| [F03](cases/F03-F04-L02/record.md) | Real minimist 1.2.5 dependency with CVE-2021-44906 and an available correction in the frozen DB | Existing Trivy SBOM analysis and production vulnerability policy | Edit the dependency manifests; build a distinct image and scan it with the same DB. Target absent, global HIGH/CRITICAL threshold passes, dependency behavior and service HTTP unchanged. |
| [F10](cases/F09-F10-L05/record.md) | Existing labelled local fixture: authentic provenance for the digest, with only the repository origin unauthorized | Existing fresh registry/cryptographic CI gate | Obtain/select the already prepared authorized artifact from the supplied local catalog. Freshly authenticate its evidence, admit and exercise it. No policy relaxation, re-signing or provenance-claim rewrite. |
| [F11](cases/F11-F12-L06/record.md) | Kubernetes-valid coordinated `privileged=true` and `allowPrivilegeEscalation=true` alteration | Existing Conftest manifest policy | Remove the prohibited settings under the existing explicit-false contract; unchanged image, remaining manifest and functional responses; successful delivery. |

R starts the reference deployment without G's automatic scanner/evidence/policy
gates. Both arms have the same conventional tools and functional requirements.
R may discover the problem through manually invoked scanners/verifiers; these
actions and their attributable results are recorded. A nonzero exit alone is
never detection. G still enforces its existing later gates and admission when
the path reaches them. An early block leaves later barriers unreached.

`operator/prepared.json` and the raw run contain oracles, initial identities and
preparation checks. Give the participant `participant/` and the task commands,
without directing them through the operator's solution records. This separation
organizes the procedure; it is not filesystem access isolation or blinding.
Record prior scenario/tool knowledge, previous attempts and exposure to the
other arm. Learning and the supplied F10 artifact catalog limit generalization
to open-ended incident response. Disable AI assistance for calibration and
measurement so the calibration remains comparable to the measured tasks.

## Commands for the calibration session

Run from the repository root in the pinned Linux devcontainer. These commands
prepare one task at a time and never launch a series:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion doctor
make -C implementacion setup-validation
MANUAL_DB="$PWD/implementacion/.tmp/vulnerability-selection/db-snapshot"
test -f "$MANUAL_DB/db/trivy.db"
MANUAL_PLAN="$PWD/implementacion/evidence/manual-tasks/session-01/plan.json"
read -r -p 'Editor name and version: ' MANUAL_EDITOR
python3 implementacion/scripts/manual-tasks.py plan \
  --seed manual-six-v1-2026-10-02 --output "$MANUAL_PLAN" \
  --database "$MANUAL_DB" --editor "$MANUAL_EDITOR"
```

The existing snapshot above is used without changing its bytes. If it is absent,
restore a reviewed preserved database first and use its directory; do not silently
substitute a fresh download. Preparation rejects a changed F03 target or missing
correction. Expected plan output: `PLAN_CREATED <path>`, the six-task sequence,
then `LIMITS_UNSET`. Keep both `plan.json` and `initial-plan.json`.
For the example seed, the retained future measured sequence is
`F11/G F11/R F03/G F03/R F10/R F10/G`. Calibration is stored separately.
The current Codespaces doctor rejects kubectl 1.37.0 against required 1.35.8;
use the pinned environment before a human session. Do not bypass that check.

```bash
read -r -p 'Participant identifier: ' MANUAL_PARTICIPANT
read -r -p 'Prior knowledge and previous exposure: ' MANUAL_KNOWLEDGE
python3 implementacion/scripts/manual-tasks.py prepare --plan "$MANUAL_PLAN" \
  --dataset calibration --scenario F03 --arm R \
  --participant "$MANUAL_PARTICIPANT" --prior-knowledge "$MANUAL_KNOWLEDGE"
read -r -p 'Paste the TASK path printed above: ' MANUAL_TASK
python3 implementacion/scripts/manual-tasks.py start "$MANUAL_TASK"
python3 implementacion/scripts/manual-tasks.py event "$MANUAL_TASK" investigate \
  --note 'Beginning manual review'
python3 implementacion/scripts/manual-tasks.py tool "$MANUAL_TASK" scan
```

Successful preparation prints `TASK <directory>` and `READY; total timer has not
started`. `start` prints `HUMAN_REVIEW_STARTED` when its automated path completes
or has an attributable block. Read the printed operation directory's
`command.log`; `state-path.txt` points to the full raw tool outputs. A completed
R path is not task completion. For F10 use `tool ... provenance`; for F11 use
`tool ... manifest`. The same commands are available in both arms. Their detection
mechanism is `manual:<tool>`; G's initial path records `automatic:<tool>`.
The first attributed result is timestamped at the control, not retrospectively
entered by a participant. Earlier recognition without retained tool evidence can
be described in activity notes; it is not silently backdated as verified detection.

For each fresh calibration, use the same `prepare` command with the corresponding
`--scenario` and `--arm`, then set `MANUAL_TASK` to its new printed path:

| Calibration tasks | Manual control command suffix |
|---|---|
| `--scenario F03 --arm R` and `--scenario F03 --arm G` | `tool "$MANUAL_TASK" scan` |
| `--scenario F10 --arm R` and `--scenario F10 --arm G` | `tool "$MANUAL_TASK" provenance` |
| `--scenario F11 --arm R` and `--scenario F11 --arm G` | `tool "$MANUAL_TASK" manifest` |

```bash
python3 implementacion/scripts/manual-tasks.py event "$MANUAL_TASK" investigate \
  --note 'Reviewing the retained tool output'
python3 implementacion/scripts/manual-tasks.py event "$MANUAL_TASK" correct \
  --note 'Beginning the selected correction'
# Human edits only this task's allowed participant input using declared tools.
python3 implementacion/scripts/manual-tasks.py event "$MANUAL_TASK" wait \
  --note 'Waiting for an external command; describe it here'
python3 implementacion/scripts/manual-tasks.py event "$MANUAL_TASK" correct \
  --note 'Resuming active correction'
python3 implementacion/scripts/manual-tasks.py check "$MANUAL_TASK"
python3 implementacion/scripts/manual-tasks.py status "$MANUAL_TASK"
python3 implementacion/scripts/manual-tasks.py cleanup "$MANUAL_TASK"
```

Use `wait` only for an actual wait; use `pause` for a break or unobserved interval.
Tool execution and completion verification automatically count as waiting.
Mark active work again when resuming. `check` verifies the participant's input;
it supplies no repair. F03 rebuilds and scans the edited dependency, F10 consumes
the selected existing artifact, and F11 checks the edited manifest. Output is
`VALIDATED_COMPLETION`, `REVIEW` after unsuccessful verification, or `INCOMPLETE`
for a configuration/protocol failure. Failed checks retain distinct operation
directories and exit codes. Review those diagnostics; if an instrumentation or
external failure prevents interpretation, record `event "$MANUAL_TASK" abandon
--note '<observed reason>'` and clean up. A failed correction alone does not
invalidate the task.
`cleanup` prints `CLEANUP_COMPLETE` only after packaging and observing that owned
cluster/registry/builder/private state are absent. A repeated cleanup preserves
the first evidence package. Keep the task path, then prepare the next calibration
with its scenario/arm and updated prior-knowledge declaration. Cover all six
combinations; do not reuse a modified workspace as another arm's initial input.

Ctrl-C during a command stops its process group and retains an incomplete attempt.
After a killed controller or reboot, use `recover <task>` and then `cleanup`.
Recovery checks the recorded process identity before stopping an orphan; it does
not invent an end time. Unknown gaps remain incomplete with an observed lower
bound. Do not restart an interrupted automated path inside the same attempt.

## Timing and limits

The monotonic total timer starts immediately before the prepared automated path
is invoked. Human review starts at its process exit, whether accepted or blocked.
Explicit activity events delimit diagnosis, correction, waiting and unobserved
time; active time is never inferred from an idle terminal. UTC and boot identity
are retained alongside monotonic timestamps. A reboot cannot join two clocks.

- Detection latency: first attributable detection minus total start.
- Resolution time: validated completion minus that detection.
- Total duration: validated completion minus total start, including automation,
  active work and waits. Cleanup and initial preparation are outside it.
- Verification time is reported separately and is a subset of waiting time.

Calibration records live under `calibration/`, with **no experimental time limit**.
After real human calibration, the responsible person chooses one total-duration
limit for each scenario, identical for R and G, and records the rationale:

```bash
# Set CAL_F03_R, CAL_F03_G, CAL_F10_R, CAL_F10_G, CAL_F11_R, CAL_F11_G
# to the six retained, completed and cleaned-up calibration task directories.
read -r -p 'F03 total limit, seconds: ' MANUAL_F03_LIMIT
read -r -p 'F10 total limit, seconds: ' MANUAL_F10_LIMIT
read -r -p 'F11 total limit, seconds: ' MANUAL_F11_LIMIT
read -r -p 'Reviewer: ' MANUAL_REVIEWER
read -r -p 'Calibration-based rationale: ' MANUAL_RATIONALE
python3 implementacion/scripts/manual-tasks.py freeze-limits --plan "$MANUAL_PLAN" \
  --limit "F03=$MANUAL_F03_LIMIT" --limit "F10=$MANUAL_F10_LIMIT" --limit "F11=$MANUAL_F11_LIMIT" \
  --calibration "$CAL_F03_R" --calibration "$CAL_F03_G" \
  --calibration "$CAL_F10_R" --calibration "$CAL_F10_G" \
  --calibration "$CAL_F11_R" --calibration "$CAL_F11_G" \
  --reviewer "$MANUAL_REVIEWER" --rationale "$MANUAL_RATIONALE"
```

Expected: `LIMITS_FROZEN`. Synthetic, incomplete or different-configuration records
cannot support this command. The immutable `frozen-plan.json` records the decision;
this is the operator's declared review, not assistant-created acceptance.

For a separately authorized later measurement session, use `prepare --dataset
measurement` with the same plan and the next printed scenario/arm. The harness
requires the stored sequence and prior cleanup, with exactly six positions.
The seed randomly selects the repeated RG/GR order and shuffles its scenario
assignment: two scenario pairs use that order, one the opposite. Each pair's tasks
are consecutive. No new order is selected after seeing outcomes.

The total-duration deadline also terminates a running command. At exhaustion,
`not-detected-within-window` and `detected-unresolved-within-window` are distinct
censored outcomes. Missing detection/resolution times stay null; their observed
lower bounds are separate fields. These are neither zero-time successes nor
automatically invalid attempts. Late edits or checks cannot complete the window.
Preserve incomplete attempts and learning exposure before any fresh calibration.

## Retention and acceptance

Keep the session directory, the linked `evidence/raw/run-*` directories and
`evidence/packages/run-*.tar.gz` plus checksum sidecars, and the frozen DB outside
Codespaces. Task records/events, operation requests/logs and checksums are ignored
by Git. The safe packages exclude credentials, private keys, kubeconfig and raw
state; build input bytes and per-operation diagnostics are retained. Do not copy
private `.tmp/private-*` directories. The same-user filesystem is not an
independent custody or participant-isolation boundary.

Successful cleanup writes `SHA256SUMS.txt` for the final task directory. Verify
that copy with `(cd "$MANUAL_TASK" && sha256sum -c SHA256SUMS.txt)` before review;
verify the linked safe archive's checksum sidecars separately. Keep the original
records unchanged and use copies for analysis.

Human checklist:

1. Verify environment pins, database and source; declare tools and prior knowledge.
2. Prepare one task; keep operator oracles separate from participant instructions.
3. Start with unchanged inputs; disable AI and record actual activity/wait changes.
4. Retain attributable detection, every correction attempt and validated completion
   or an incomplete/censored outcome; clean up before the next independent task.
5. Review all six calibrations before fixing the three equal-across-arm limits.
6. Preserve evidence externally; leave overall pilot acceptance and scenario
   readiness as separate human decisions.

Assistance: OpenAI Codex / GPT-6 implemented the procedure and synthetic tests.
Human calibration, new live harness validation and final acceptance are pending.

Development base: main `fa4ed35d793a7257c13a335ad6b5ae208e79f60f`.
`make -C implementacion test` passed: 896 service/unit cases, including the wrapper
for 29 synthetic Python manual-task cases, plus environment, policy, offline
Cosign and workflow checks. Syntax and local documentation links were checked.
Logs are retained under `evidence/raw/manual-task-development/`. The environment
doctor failure above prevents claiming live validation of this new harness.
