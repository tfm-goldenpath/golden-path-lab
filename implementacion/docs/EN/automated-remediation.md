# Automated F03/F10/F11 remediation validation

[Español](../ES/automated-remediation.md) · [Architecture](architecture.md) · [Current work](../../TODO.md)

This separate lane A technical evaluation provisionally replaces the six manual
tasks in the immediate execution schedule. **Human effort evaluation is deferred,
not completed.** It does not measure human diagnosis, manual remediation effort,
developer productivity or autonomous discovery of a repair. The guided rehearsals,
human review formats and separate paired campaign from PR #43 remain unchanged.
Overall pilot acceptance, human calibration/limits and hosted campaign authorization
remain separate, pending decisions.

## One command in Codespaces

Use the pinned Codespaces/devcontainer environment from the repository root. Keep
the existing frozen database; do not substitute a new download to obtain a pass.
Preflight and dependencies, if not already prepared:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion doctor
make -C implementacion setup-validation
export MANUAL_DB="$PWD/implementacion/.tmp/vulnerability-selection/db-snapshot"
test -f "$MANUAL_DB/db/trivy.db"
```

The unattended interface creates its plan once, then prepares, runs, diagnoses,
repairs, checks, cleans and assesses six independent tasks, sequentially:

```bash
python3 implementacion/scripts/automated-remediation.py run \
  --session automated-six-01 --database "$MANUAL_DB" --seed automated-six-v1
```

There are no activity notes, editing steps or review prompts. The retained seed
selects two scenario pairs with one R/G order and one with the opposite order,
using the existing deterministic ordering function. Each position has one fresh
task, original faulty input and owned lab. A failed attempt is never silently
repeated; subsequent combinations can run only after its cleanup succeeds.

The safety timeout is **per external operation**, including preparation and
cleanup: F03 = 1800 s, F10 = 1800 s, F11 = 1200 s, identical for R/G. These are
operational bounds, not calibrated human-task limits. The existing delivery
timers, tool timeouts, policies, vulnerability threshold and trust remain intact.

Before each preparation and between tasks, the runner checks both the workspace
and Docker data filesystem for **at least 6 GiB free**. This is a conservative
preparation reserve, not a guarantee against disk exhaustion during a build.
Insufficient space or inability to inspect Docker stops the session with a reason
and partial report. No global Docker pruning or earlier evidence deletion occurs.
Sequential tasks reuse the supplied canonical DB bytes, checking their identity
before/after scans; they do not make six database copies. Trivy may retain scanner
cache alongside those bytes. Preserve the canonical DB outside Codespaces too.

## Detection and bounded repairs

| Scenario | Required detection | Predefined repair and completion |
|---|---|---|
| F03 | Real original-SBOM scan attributes CVE-2021-44906 in minimist 1.2.5 under the frozen DB and production vulnerability policy. | Update only package.json and package-lock.json to minimist 1.2.8, taking its lock entry from f03-repaired. Preserve package identity, Dockerfile and exercise.cjs. Existing checks require a distinct rebuilt image, unchanged DB, target removal, the entire HIGH/CRITICAL threshold and unchanged dependency/HTTP behavior. |
| F10 | Fresh authenticated provenance gate attributes only the unauthorized repository origin. | Copy this task's read-only authorized-artifact.txt reference into image.txt. No claim, signature, key, catalog or policy changes; existing completion freshly verifies and deploys the authorized artifact. |
| F11 | Existing Conftest decision attributes both prohibited privilege settings. | Set only the quotes-node container's privileged and allowPrivilegeEscalation properties to false. Preserve image and all other settings; existing completion checks delivery and HTTP. |

G must detect on its initial delivery path; an extra diagnostic cannot compensate
for missing automatic detection. R must finish reference delivery before the
script invokes `scan`, `provenance` or `manifest`. Its mechanism is `scripted:*`,
not human discovery. Registry, certificate, transport, evaluator and other
integration errors do not establish policy rejection. A successful command exit
alone cannot establish corrected delivery. Rejected corrections remain failed
technical observations; the runner supplies no second repair.

## Status, continuation and intervention

```bash
python3 implementacion/scripts/automated-remediation.py status --session automated-six-01
python3 implementacion/scripts/automated-remediation.py report --session automated-six-01
# Continue with the retained plan, database, source and verified boundaries.
python3 implementacion/scripts/automated-remediation.py run --session automated-six-01
```

Ctrl+C or SIGTERM stops the recorded subprocess group and attempts owned cleanup.
A lost controller/reboot is recovered using the existing process identity checks.
Unknown termination time stays unknown; the unfinished phase is not replayed.
Continuation can advance from a verified boundary or move past a closed, cleaned
attempt. Source/database drift blocks new work and still attempts owned cleanup.
Changed source requires a new session; never edit old plan hashes to resume.
After inspecting a failed cleanup, explicitly request only its safe repetition:

```bash
python3 implementacion/scripts/automated-remediation.py run \
  --session automated-six-01 --retry-cleanup
```

Default execution needs no person. If a person takes over an open task, stop the
runner and record that fact before editing (use its actual position and note):

```bash
python3 implementacion/scripts/automated-remediation.py intervention \
  --session automated-six-01 --position 1 --note 'Actual reason for human takeover'
```

This closes the attempt as incomplete, excludes it from fully unattended claims
and cleans its lab. It does not fabricate a repair or completion. Sealed attempts
cannot be modified. Unrecorded participant edits fail the original/repair guards;
they never become a validated unattended result. A forcibly killed cleanup may
need recovery and an explicit cleanup retry; no absence is inferred from errors.

## Records and interpretation

The session lives under `evidence/manual-tasks/<session>/`, with tasks in
`automated-validation/task-*`. The shared `manual-task/v1` schema and internal
file names remain for compatibility; execution identity is part of the records,
not inferred from paths:

```json
{
  "executionMode": "scripted",
  "dataset": "automated-validation",
  "actor": "automation",
  "humanAcceptance": "pending",
  "eligibleForHumanCalibration": false
}
```

These fields persist in task records, requests, validation receipts, archives and
reports. Scripted tasks never emit human activity or `HUMAN_REVIEW_STARTED`;
requests say `scripted-requested`. A later person's technical review cannot make
them eligible for human calibration, measurement or limit freezing. The runner
never invokes `review`, supplies a reviewer, or sets acceptance to accepted.

`report.json` and `report.md` include all six positions, expected/observed
detection, repair transformation and timestamps/hashes, completion, cleanup,
archive integrity, actual automated timings, interruptions and unresolved errors.
`VALIDATED`, intact archives and human acceptance are distinct. Exit 0 requires
6/6 validated; partial, unfavorable, interrupted or unexecuted coverage returns 2.
An invalid invocation/plan returns 1. Historical reporting checks retained evidence
without requiring the current source. Reports may be regenerated; task originals
and invocation histories are retained.

Preserve the entire session (including `initial-plan.json`, original input bytes,
repair records, operation logs, final checksums and reports), linked `evidence/raw/run-*`,
safe `evidence/packages/run-*.tar.gz` with sidecars, and canonical DB. Packages use
the existing secret exclusions and retain original input content in JSON as well
as build-input receipts. They snapshot cleanup before its final exit; retain the
final task directory as well. Checksums detect changes, not independent custody.

Example of an **unexecuted** report row (illustrative shape, not a successful run):

| Combination | Expected | Observed | Repair | Completion | Cleanup | Integrity | Assessment |
|---|---|---|---|---|---|---|---|
| F03/G | automatic:scan | unproven | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | NOT_VERIFIED | NOT_EXECUTED |

See the [development handoff](../../registros/automated-remediation-validation.md)
for actual validation results and the proposed PR description. Synthetic tests
exercise contracts and sequencing; only a live run establishes local integration.
