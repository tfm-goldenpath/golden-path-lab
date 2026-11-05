# Independent case attempts and lane A attestations — 18 October 2026

Implementation continues on `feat/demo-control-and-evidence`, from `46e3cf3`.
`origin/main` was `b0564232187404df17a9156487d13454b85b924d` after fetch; it did
not contain the workflow importer. No open PR for this branch was found. Existing
root npm files remain untracked and unchanged. No push, PR creation, merge,
workflow execution or acceptance was performed.

## Implemented boundary

- `cases.py`, coordinator, adapters and server: fixed F11 case actions, isolated
  inputs, fresh operation IDs and receipts, predecessor/preparation association,
  original timing preserved, shared source/ownership/readiness/authorization
  checks and controlled cancellation. No policy or scenario oracle changes.
- Independent F13 child preparation uses the existing full `defense-short`
  pipeline, its own laboratory/image reference and no-results check. Recovery
  stays bound to that child. Explicit owned-resource cleanup preserves evidence.
  This is cold preparation with additional resource cost, not instantaneous
  repetition or infrastructure reuse. It remains outside the live interval.
- Model/UI: read-only actions explain their disabled state; new attempts remain
  separate from selected history; live console is wide; original preparation
  origins are not replaced by later fixture seals. Workflow tabs use blue active
  styling, keyboard tabs, focus and contextual counts. Lane A bundles group by
  suite/context/digest.
- `lane_a_observations.py` and importer: bounded two-level ZIP/tar inspection,
  association/hash checks, public documents only, exact per-context verifier and
  semantic gate association. Export stores hardlinked closed fixture documents as
  regular archive files. Existing archives are unchanged.

## Authentic import

Run **37353632299**, attempt **1**, source
`91a33e910ee2ba9ded5391393b06ca70005de4d4` was accessible.
Capture: `evidence/raw/github-observations/37353632299-2466860c6c8d/observation.json`.

| Artifact | Bytes | ZIP SHA-256 | Internal hashes checked |
|---|---:|---|---:|
| lane-a-demo-37353632299-1 / 11363314552 | 4176767 | c0490c0ee8d033b4f79489084d3247e6b0d08a35c3e3e53a28b34323e12e28f0 | 1963 |
| lane-a-vulnerabilities-37353632299-1 / 11363283724 | 639212 | a334d2f7f8b10fcb3ad4d7ab794aa5619f203e9113a5359b1351a94294b5da0c | 349 |

102 public documents include **24 canonical final bundles**, four contracts in
six contexts: principal, L01-update, L05-from, L05-to, F03-repaired and L02.
Database artifacts were not downloaded. Original downloaded ZIPs remain under
`/tmp/golden-path-lane-a-inspection/`; captured documents remain in ignored
`evidence/raw`. Historical cryptographic receipts are not current reverification.
Exact verifier time is unknown where not recorded. Negative intermediate
snapshots are not exhaustively imported. Existing paired G attestations remain
available independently; lane A on GitHub remains local-public-key trust, not B.

## Validation and limits

Evidence root: `evidence/raw/repeatable-cases-20261018/` (ignored generated output).

- `doctor.log`: PASS.
- `shared-test.log`: shared `make test` PASS, including 951 service/unit tests,
  environment checks, 43 policy tests, real local Cosign checks, workflow checks
  and the then-current 90 Python defense regressions. Final targeted checks
  cover the fixes and documentation: 95 Python defense regressions, 14 model
  checks, real nested imports and browser checks; see their retained logs.
- Synthetic case regressions exercise immutable IDs/files, stale/retired/busy
  refusal, missing/independent F13 fixtures, recovery association, authenticated
  session-bound POST/CSRF/double launch, CLI failure persistence and hardlink export.
  They substitute laboratory stages and do not establish real admission.
- Lane A parser fixtures cover association/hash failures and prohibit transferring
  verifier receipts across digests. Real nested-package import above complements
  these tests; no new cryptographic verification was performed.
- Browser checks use retained complete F11/defense evidence read-only and labelled
  synthetic active-state fixtures. Layout: 1366×768, 1920×1080, 390 px; native
  Chromium zoom **2.0**, reflow at 683×384 CSS. No horizontal document overflow.
  Conftest and Kyverno consoles each had **400 px actually visible**, font **15 px**.
  Narrow/high-zoom layouts scroll naturally rather than shrinking text.
- First actual authenticated browser action, session `repeat-controls-20261018`,
  hit the resource guard. It exposed duplicate `coordinator` module exception
  identity in CLI execution: the error was logged but not persisted as lastCommand.
  That failed attempt is retained. The entry point now shares its module identity;
  a regression runs the actual `__main__` handler with a synthetic boundary error.
- Second actual authenticated browser action, new session
  `repeat-controls-20261018b`, returned 202 then correctly persisted and displayed
  `RESOURCE_EXHAUSTED`, exit 1. No preparation operation, fixture, cluster, image
  build or scenario execution started. See `actual-web-final.json`. This validates
  action authentication and truthful resource-stop propagation, **not a successful
  F11/Kyverno repeat**.
- Actual export `evidence/packages/defense-repeat-controls-20261018b/export-0001/`
  verified all **137** captured files. It retains a pending/resource-stopped session
  and real GitHub captures; it is not a successful demo run.

Machine: 4 CPUs, 16,770,490,368 bytes RAM; workspace `/dev/loop4` 32 GiB total.
At final checks approximately **5.9 GiB free**, **1.69 million free inodes**, **10 GiB
available RAM**. `/tmp` is a separate `/dev/sdb1`, about 107 GiB free; it does not
increase workspace capacity. The unchanged **8 GiB cold-preparation safeguard**
prevents a new full rehearsal; the **3 GiB reserve** remains. No evidence, database,
key or unrelated resource was deleted, no prune was run and no resource safeguard
was reduced. No peak-memory claim or new three-minute runtime measurement.

Remaining: real fresh-preparation/button F11 repeats, isolated F13/recovery and
cancellation under Kubernetes when margins permit; human review and narrated
rehearsal. The prior session's historical success is not evidence for those checks.

## Usage and proposed talk

See canonical [EN](../docs/EN/defense/demo-workspace.md#independent-case-attempts-and-lane-a-bundles)
and [ES](../docs/ES/defense/demo-workspace.md#intentos-independientes-y-bundles-de-vía-a)
for new action-enabled viewer, preparation, web-only case execution/inspection,
F13 fixture lifecycle, import/export and a proposed 160-second route plus reserve.
To inspect retained evidence now, `serve --session rehearsal-01 --port 8791` is
read-only. The actual resource-stop viewer is bound to
`repeat-controls-20261018b` on 8793. Changing source invalidates executable
preparation; do not bypass that guard or reset a historical session.

## Proposed PR

Title: **feat: add independent demo attempts and authentic lane A attestations**

A completed demo could only be inspected, while workflow tabs were difficult to
identify and lane A artifacts were metadata-only. Add fixed case actions that
create new F11 attempts with isolated outputs and immutable history, plus explicit
independent F13 preparation/recovery/retirement. Reuse the existing coordinator,
restricted actor, scenario oracles, authentication and source/resource guards.

Make workflow tabs accessible and visibly selected. Import the two authentic
lane A artifacts for run 37353632299 using bounded nested-package inspection,
retain exact digest/context associations and distinguish integrity, historical
cryptographic receipts and semantic authorization. Document browser controls,
resource costs, scopes and capture commands in EN/ES.

Validation: shared tests and focused case/import/model/browser/export checks;
read-only historical views and labelled synthetic orchestration fixtures. An
actual authenticated web request stopped honestly at the disk safeguard; full
new Kubernetes repeat/recovery rehearsal remains unvalidated because available
workspace space is below 8 GiB. No remote workflow, policy changes or historical
measurement changes. Human review and acceptance **pending**.

AI contribution: OpenAI Codex implemented orchestration/UI/importer changes,
tests, diagnostics and documentation. Human owns requirements/oracles and final
review. This record does not authorize a campaign or claim a new campaign sample.

Final rendering captures and measurements are in `visual-final-*`, `browser-final-*`,
`layout-f11-*`, `native-zoom-*` and `live-final-*` beneath the validation evidence root.
The first layout invocation used the defense profile against an F11-comparison-only
fixture expectation and failed on the expected log path; the profile-correct rerun
passed, without broadening the assertion or substituting an original.

Final export `defense-repeat-controls-20261018b/export-0002` verifies 285 files,
including all bounded captures available at export time. `visual-final.json`
records zero requests while navigating that actual HTML and opening a lane A
bundle excerpt. The complete original bundle was also fetched through the live
read-only viewer's hash-checking route. `cases-safety-final.log` retains the
focused path/ownership checks; `test-defense-complete.log` records 95 passing
Python checks, with no Kubernetes assertions substituted as live observations.

Suggested commit structure: `feat: add isolated demo case attempts and live controls`,
`feat: import nested lane A attestation packages`,
`docs: document repeatable demo cases and validation limits`.
