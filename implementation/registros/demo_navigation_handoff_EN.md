# Unified demo workspace — local handoff

Branch: `feat/demo-navigation-and-catalogue`. Base: merged PR #49,
`0f2d623a3cf09ad37960f14dbe1093d225d22ff1`. Changes remain local and uncommitted.
No push, PR creation, merge, workflow dispatch or publication was performed.
Unrelated root `package.json` / `package-lock.json` remain untouched and untracked.
Historical reviews, scenario oracles, trust, policies and recorded measurements
were not changed. OpenAI Codex assisted implementation, diagnostics, tests and
EN/ES documentation. Human review of this branch remains pending.

## Result and files

| Files | Responsibility / resulting behavior |
| --- | --- |
| `demo/index.html`, `style.css`, `app.js` | One presentation workspace, persistent operator strip, selected-result explanation, compact selectable rows, one expandable bottom inspector, secondary exploration. No framework/build step. |
| `demo/model.js` | Pure display mapping of actual profiles, operation receipts, partial scopes, independent recovery, prepared reuse and R omissions. It does not implement policy or decide acceptance. |
| `demo/catalogue.json` | Correct current L06 coverage text. Historical snapshots are immutable. |
| `scripts/defense-demo/server.py` | Server-authoritative action capabilities with source/boot gates, fixed action API, bounded local inventory endpoint, captured workflow facts and all renderer assets. Stop acknowledgement says requested, not completed. |
| `scripts/defense-demo/core.py` | Read-only allowlisted local summaries (100 entries, 2 MiB per regular metadata file); unsafe/corrupt entries isolated. Display facts extracted from captured workflow YAML. |
| `scripts/defense-demo/exporting.py` | Embed/hash both JS modules, capture bounded local context, prioritize main control excerpts within the unchanged total budget. No old export rewritten. |
| `tests/defense_demo/` | Model, metadata safety, action gates, rendering, exact evidence, stable interaction and offline regressions. Existing authentication/ownership/integrity tests preserved. |
| EN/ES `demo-workspace.md`, affected demo guides, architecture and `TODO.md` | Operator instructions, progress semantics, scope, safeguards, offline fallback and proposed narration route. |

Use the [English workspace guide](../docs/EN/demo-workspace.md) or
[Spanish guide](../docs/ES/demo-workspace.md) for the complete operator flow.

## Validation actually performed

- `make -C implementacion test-defense`: **61 tests PASS** (includes four Node
  display-model cases); existing Origin/CSRF, busy, ownership, traversal, tampering,
  resource and profile regressions remain passing.
- `make -C implementacion test`: **PASS**: six environment cases, 948 service/unit
  cases, 43 Python policy cases, Conftest/Kyverno, real offline Cosign, workflow
  checks and 61 defense tests. A final full run follows the late display fixes.
- All four supported browser entry points pass: `browser-check.mjs`,
  `usability-check.mjs`, `inline-evidence-check.mjs`, `dom-check.mjs`.
- `interaction-check.mjs` passes synthetic UI transitions: rapid double-click
  produces one start POST, Stop remains requested until authoritative completion,
  vanished worker, disconnect/auth failure/reconnect, session-bound exploration,
  stale artifact rejection, manual pinning vs explicit following, open sections,
  keyboard focus and internal scroll preserved across new receipts.
- Real original F11 attribution and security diff were opened read-only from
  retained `rehearsal-01`; comparison rendering uses `f11-20261017t193938z`.
  Both are original historical executions, not deliveries on this branch.
- Offline rendering makes zero network/API requests. Synthetic hostile-looking
  text is inert, missing own evidence cannot resolve to inherited files, truncated
  excerpts and missing/corrupt files are labelled. Unit export verification covers
  self-contained HTML, hashes, secret exclusion and verified archive contents.
- Visual review: 1366×768, 1920×1080 and 390×844. No horizontal page scrolling;
  selected result/controls/overview fit the ordinary presentation viewport. The
  bottom inspector remains usable without replacing the main workspace. Full
  files and expanded logs are deliberate secondary reading.

Raw logs and screenshots are local, ignored files under
`implementacion/evidence/raw/navigation-workspace/`. Earlier failed checks remain:
old offline wording assertion, a null/undefined model expectation, an incorrect
Conftest fixture expectation (`CONFIRMED` vs actual `PASS`), focus-induced scroll
in a test setup, and a test incorrectly expecting harmless “Ver resultado” to be
disabled on auth loss. A profile-title leak (F13 in F11 preparation) was corrected.
No failed check was converted into execution evidence.

Reproduce browser validation using the existing optional Playwright installation:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test-defense
make -C implementacion test
node implementacion/tests/defense_demo/browser-check.mjs \
  http://127.0.0.1:8768 /tmp/navigation-browser
node implementacion/tests/defense_demo/usability-check.mjs \
  http://127.0.0.1:8770 http://127.0.0.1:8768 /tmp/navigation-usability
node implementacion/tests/defense_demo/inline-evidence-check.mjs \
  http://127.0.0.1:8770 /tmp/navigation-inline
node implementacion/tests/defense_demo/dom-check.mjs http://127.0.0.1:8768
node implementacion/tests/defense_demo/interaction-check.mjs \
  http://127.0.0.1:8768 /tmp/navigation-interaction
```

The final source content hash is `140658b1f8407c713761be055b31e8bd51c2e80d3c7d075be2850a4970f5e063`; the full dirty-source identity is retained in `validation-source.json`.

The helper reuses `implementacion/.tmp/f11-browser-tools/`; it does not install a
browser. This developer-only dependency is not part of the dashboard/export.

## Screenshots and what they establish

Paths are relative to the local evidence directory above, not published assets:

| Capture | Boundary |
| --- | --- |
| `final-interaction-ready-synthetic.png` | Explicit synthetic prepared UI state; no new preparation |
| `final-interaction-running-synthetic.png` | Explicit synthetic running state; intercepted actions only |
| `accepted-layout-early.png` | Retained real F11 Conftest rejection, current rendering |
| `accepted-layout-admission.png` | Retained independent Kyverno rejection |
| `final-usability-f13.png`, `final-usability-recovery.png` | Retained F13 rejection and its separate recovery |
| `accepted-layout-reference.png`, `accepted-layout-legitimate.png` | Retained R exposure and partial L06 acceptance |
| `accepted-layout-inspector.png` | Exact original log in the single inspector |
| `final-usability-catalogue.png`, `final-usability-workflows.png` | Secondary catalogue/configuration exploration |
| `reopened-inline-offline.png` | Labelled synthetic offline excerpt/navigation; zero network |
| `accepted-layout-viewport-1920.png`, `accepted-layout-viewport-390.png` | Larger and narrow layout checks |

## Tested opening commands and resources

```bash
cd /workspaces/golden-path-lab
bash implementacion/scripts/defense-demo.sh serve \
  --session f11-20261017t193938z --port 8768
bash implementacion/scripts/defense-demo.sh serve \
  --session rehearsal-01 --port 8770
```

Open the selected port privately from Codespaces Ports. These are retained local
sessions and read-only viewers; opening them does not rerun preparation or bypass
source guards. The user's existing 8765 viewer/resources were not stopped. The immediate restart
of the independently opened 8769 viewer was refused by the port check; no foreign
listener was killed. Its retained defense evidence was reopened on free port 8770,
and evidence/navigation checks passed again. The refused attempt log is preserved.
The workspace guide documents fresh `serve --new --enable-actions`, preparation,
automatic/step modes, explicit export/verify and owned cleanup. Fresh cold
preparation and its live comparison were intentionally not run for this UI task.

Observed machine: **4 CPUs**, approximately **15 GiB visible RAM / 12 GiB available**,
**32 GiB total workspace filesystem / 7.5 GiB free**, about **1.718 million free
inodes**. `/tmp` is on a separate 118 GiB filesystem (107 GiB available after shared
checks). These are point observations, not a sampled peak. Initial workspace free space rounded to 7.6 GiB; the final reading rounded to
7.5 GiB. This is not a precise peak-consumption measurement. No resource margins were lowered.

**A new F11 preparation requires the existing 8 GiB free-space threshold; the
observed 7.5 GiB does not meet it.** UI inspection/tests were within the remaining
margin; this handoff does not certify cold preparation capacity. Retained evidence,
active resources, DB snapshots, caches, signing material and reviews were not
deleted to gain space. No cleanup/prune or resource reclamation was performed.
Docker still reports three images, three containers (two active) and six volumes;
only independent read-only viewers were opened for validation. Full real-session
re-export with its frozen database was not repeated for rendering tests.

## Presentation route and remaining limits

Use the [Spanish proposed 160-second route](../docs/ES/demo-workspace.md#ruta-propuesta-160-segundos-y-20-de-reserva):
identify preparation (0–20), start/explain independent rows (20–60), open Conftest
and Kyverno originals (60–100), legitimate L06/same image (100–135), scope and
explicit recorded fallback (135–160), 20 seconds reserve. This is not a timed
human rehearsal or a new runtime performance claim. Export/general cleanup remain
outside the talk; the existing R withdrawal remains inside the live operation.

GitHub execution/artifact import, historical attestation retrieval, remote dispatch,
new workflows and Pages are deferred. No experimental scenario/control, campaign
sample, OIDC claim or economic/human-effort inference was added. Workflow job
facts are lightweight display extraction, not YAML validation. Old exports keep
their old renderer; new rendering of old evidence never establishes a new run.
Human review and an actual narrated rehearsal remain pending.

## Suggested commit

`feat: add a unified demo presentation workspace and evidence inspector`

## Suggested PR title

`feat: add a unified demo presentation workspace and evidence inspector`

## Suggested PR description

The demo previously split presentation, technical evidence and catalogue/workflow
material across prominent views and dense cards. This change keeps the presenter
on one workspace with persistent state-aware controls, a concise selected result,
independent attempt tracks and a single bottom evidence inspector. Original log
and attribution links remain one click away; folded technical headings retain
scenario, blocking tool and attempt identity. F13 recovery remains separate and
incomplete until its acceptance observation exists.

Secondary exploration provides a searchable twenty-case catalogue, captured
workflow definitions, bounded read-only local-session summaries and complete
technical detail. Exploring another session cannot retarget server-bound actions
or files. Availability comes from backend capabilities; starts are guarded against
double clicks, 202 is only acceptance, Stop waits for observed completion, and
stale/auth-failed state disables execution. Pinning, explicit live following,
focus/open sections/scroll and obsolete artifact-response rejection preserve
presenter orientation.

The lightweight HTML/CSS/JS renderer supports new self-contained exports with
asset hashes separate from the evidence source. No CDN/framework, Kubernetes
scenario change, trust/oracle modification, remote import/dispatch or Pages is
introduced. Historical evidence/reviews and the partial F11/L06 boundaries remain
unchanged. EN/ES operator and architecture documentation and TODO are updated.

Validation: 61 defense regressions, the complete shared suite (948 service/unit,
six environment, 43 Python policy cases plus existing policy/bundle/workflow
checks), all four supported browser checks and additional synthetic interaction
checks pass. Visual review covers 1366×768, 1920×1080 and narrow 390×844, with exact
original evidence access and zero-network offline navigation. Screenshots/logs
and limitations are indexed in this handoff. No new Kubernetes run or narrated
duration is claimed; observed free disk is below the unchanged 8 GiB cold-
preparation threshold. OpenAI Codex assisted implementation/tests/docs; human
review of this branch is pending.
