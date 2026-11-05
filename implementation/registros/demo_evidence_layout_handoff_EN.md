# Full-height demo evidence detail — local correction

This correction is on `fix/demo-evidence-layout`, created from the existing dirty
`feat/demo-navigation-and-catalogue` checkout, HEAD
`0f2d623a3cf09ad37960f14dbe1093d225d22ff1` (merged PR #49). It preserves that local
implementation and unrelated untracked root npm files. The local implementation
and validation phase performed no commit, push, PR, workflow dispatch, cluster
preparation or publication. The user subsequently authorized committing these
changes, pushing this branch and opening a PR; human review remains pending.

The user's revised layout requirement supersedes the bottom-inspector design
recorded in [the preceding handoff](demo_navigation_handoff_EN.md). That record
remains a description of the preceding implementation and checks, not this layout.

## Behavior and files

- `demo/index.html`, `style.css`, `app.js`: four visible destinations replace the
  main content. Hash navigation supports browser history. Attempt names open
  Resultado; blocking segments and log links open the exact original Consola
  immediately, with comparison hidden. Desktop detail has a hideable 230 px list;
  narrow/low-height views use a selector and normal document scrolling.
- The detail keeps Resultado, Consola, Evidencias, Detalle técnico and Alcance.
  Console text is 15 px, wraps long lines, supports copying displayed content and
  exposes full files and command/exit/hash/origin metadata. Missing IDs/files are
  explicitly unavailable. A file from another attempt cannot fill the gap.
- The compact global header distinguishes connection, recorded/observed data and
  lab state. Provenance holds full identities, preparation and captured resources.
  Read-only viewers hide execution/mode controls; authorized sessions retain the
  existing coordinator controls, with active Stop accessible across views.
- `demo/model.js`: retains independent R/G, F11, F13 and recovery semantics;
  confirmed legitimate L06 and reference exposure have explicit audience labels.
  No scenario oracle, policy, cryptographic trust or admission criterion changed.
- Workflow exploration now uses a list and wide selected definition. Scenario
  search/filtering and bounded read-only inventory remain separate from execution.
  Existing backend inventory/action capabilities and export changes from the
  preceding local implementation are preserved and included in validation.
- `tests/defense_demo/`: adapted existing checks; added `layout-check.mjs` and
  native browser `zoom-check.mjs`. The latter uses the installed Chromium with a
  small local test-only extension to set tab zoom to exactly 2; no downloads.
- EN/ES demo, operations, comparison, navigation and architecture guides plus
  TODO describe the new flow. Renderer assets remain the same four files; the
  existing exporter embeds/hashes them, with no new asset packaging path.

The before capture had renderer `a6ec01bacaae` and evidence source
`73b3a65302a352fc0e131e420da50a18dbb62be2`. The final `app.js` renderer is `3c8631a0daea`. Updating the renderer does not rerun
that source or bypass prepared-source guards. Final asset identities and the
working source manifest are retained in the validation directory.

## Validation and visual evidence

All raw results, including failed checks and rejected visual iterations, remain
under `implementacion/evidence/raw/evidence-layout/` (ignored by Git).
`validated-source/verification.json` records commands, exit statuses and durations; its files
are indexed by `validation-index.json`. Rendering fixtures are explicitly
labelled and do not represent new laboratory observations.

Final checks all exited **0** on working-source content hash
`f31864a2f721d991f30d72dfe6de3d93259a62573df6ca53061b361f1b52c3a7`:

| Check | Result / duration |
|---|---|
| `make -C implementacion doctor` (doctor) | PASS · 1.021 s |
| `make -C implementacion test-defense` (defense) | PASS · 3.376 s |
| `make -C implementacion test` (shared) | PASS · 131.898 s |
| `node implementacion/tests/defense_demo/browser-check.mjs http://127.0.0.1:8768 /workspaces/golden-path-lab/implementacion/evidence/raw/evidence-layout/validated-source/verified-browser` (browser) | PASS · 1.826 s |
| `node implementacion/tests/defense_demo/usability-check.mjs http://127.0.0.1:8770 http://127.0.0.1:8768` (usability) | PASS · 4.032 s |
| `node implementacion/tests/defense_demo/inline-evidence-check.mjs http://127.0.0.1:8770 /workspaces/golden-path-lab/implementacion/evidence/raw/evidence-layout/validated-source/verified-inline-evidence` (inline-evidence) | PASS · 4.228 s |
| `node implementacion/tests/defense_demo/interaction-check.mjs http://127.0.0.1:8768 /workspaces/golden-path-lab/implementacion/evidence/raw/evidence-layout/validated-source/verified-interaction` (interaction) | PASS · 23.676 s |
| `node implementacion/tests/defense_demo/layout-check.mjs http://127.0.0.1:8768 /workspaces/golden-path-lab/implementacion/evidence/raw/evidence-layout/validated-source/verified-layout` (layout) | PASS · 8.746 s |
| `node implementacion/tests/defense_demo/zoom-check.mjs http://127.0.0.1:8768 /workspaces/golden-path-lab/implementacion/evidence/raw/evidence-layout/validated-source/verified-zoom` (zoom) | PASS · 1.481 s |
| `node implementacion/tests/defense_demo/dom-check.mjs http://127.0.0.1:8768` (dom) | PASS · 0.969 s |

The shared suite includes 948 service/unit checks, 43 Python policy tests,
62 Conftest decisions, 36 + 14 Kyverno checks, local Cosign cryptographic checks,
workflow/orchestration checks and the 61 defense regressions. Expected failures
inside synthetic scenarios are unit-test inputs, not new failed real deliveries.

At **1366×768**, measured console/viewport intersection grows from **84.6 px**
to **412.5 px** for both original F11 Conftest and independent Kyverno outputs.
Font size is **15 px**, without expanding a panel. At **1920×1080**, the console
has **724.5 px** visible. Mobile width **390 px** and native desktop tab zoom
**200%** reflow without horizontal document scrolling. At high zoom the document
scrolls naturally; text is not reduced to preserve a fixed-height layout.

The layout regression exercises direct blocking links, exact originals, browser
Back/Forward and reload, sidebar switching, pinned console scroll/focus while
another worker is observed, retained open technical sections, profile filtering,
truthful missing-artifact states and offline navigation with zero network calls.
Existing interaction checks cover 202 versus completion, double-click guards,
authentication/disconnect recovery, worker disappearance, stop acknowledgement,
artifact response races, inert hostile-looking output and session-bound actions.

A newly added nonzero-scroll regression first failed (`0 !== 88`) when unrelated
activity re-rendered a pinned closed log. The cache now observes activity only
where relevant to result/provisional content; the corrected check preserves the
closed output and scroll. The earlier layout failure exposed lost expanded
sections on Back, also corrected. A preparation-return regression also caught polling resetting the selected attempt; preparation now retains its own heading and restores the previous attempt. No integrity or attribution assertion was removed.

Screenshots (paths relative to this directory):

| View | Before / after |
|---|---|
| Comparison | [Before](../evidence/raw/evidence-layout/before-summary.png) / [After](../evidence/raw/evidence-layout/validated-source/verified-layout-summary.png) |
| F11 Conftest | [Before](../evidence/raw/evidence-layout/before-console.png) / [After](../evidence/raw/evidence-layout/validated-source/verified-layout-conftest.png) |
| Independent Kyverno | [After](../evidence/raw/evidence-layout/validated-source/verified-layout-kyverno.png) |
| Collapsed technical badges | [After](../evidence/raw/evidence-layout/validated-source/verified-layout-technical.png) |
| Workflows | [After](../evidence/raw/evidence-layout/validated-source/verified-layout-workflows.png) |
| 390 px | [After](../evidence/raw/evidence-layout/validated-source/verified-layout-width-390.png) |
| 1920 px | [After](../evidence/raw/evidence-layout/validated-source/verified-layout-width-1920.png) |
| Native zoom 200% | [Header](../evidence/raw/evidence-layout/validated-source/verified-zoom-header.png) / [Console](../evidence/raw/evidence-layout/validated-source/verified-zoom-console.png) |
| Offline retained-content rendering fixture | [After](../evidence/raw/evidence-layout/validated-source/verified-layout-offline.png) |
| F13 / recovery | [F13](../evidence/raw/evidence-layout/validated-source/verified-usability-f13.png) / [Recovery](../evidence/raw/evidence-layout/validated-source/verified-usability-recovery.png) |

These ignored captures are local review evidence, not committed fixtures or
published execution records. Earlier zoom screenshots exposed a screenshot-tool
clipping issue; the native zoom console capture uses the browser's viewport
capture directly. The final images were inspected as images, not only DOM metrics.

## Observed resources and retained material

Observed 4 CPUs and approximately 15.6 GiB RAM in the configured 4-core / 16-GB /
32-GB-total Codespace. During final checks, available memory stayed above
**11.14 GiB**; maximum sampled cgroup memory was
**6.61 GiB** (includes other processes/cache).
Sampling was every 10 seconds during longer checks and before/after each phase,
35 samples total; this is not an exact peak or dashboard-only usage.

`/workspaces` had at least **7.47 GiB free** and
**1,717,396 free inodes**; final free space was
**7.47 GiB**. `/tmp` is a different observed filesystem,
with at least **105.66 GiB free**; capacities are not summed or
attributed to a hidden Docker daemon mount. Docker inventory remained three images
(1.973 GB), three containers/two active and six volumes (5.404 GB).

No resource cleanup or deletion was needed. Existing evidence, failed checks,
exports, snapshots, keys and Docker resources remain. Screenshots/logs from all
iterations occupy approximately 22.1 MiB before the
final index. Native-zoom test profiles remain in their newly created `/tmp/gp-layout-zoom-*`
directories, recorded in test receipts. No browsers or dependencies were downloaded.
The existing 8 GiB F11 cold-prepare safeguard exceeds current workspace free space;
this UI validation does not certify a new preparation or lower that safeguard.

## Open the current renderer

Both commands were checked against already-running, private loopback viewers:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
bash implementacion/scripts/defense-demo.sh serve \
  --session f11-20261017t193938z --port 8768
bash implementacion/scripts/defense-demo.sh serve \
  --session rehearsal-01 --port 8770
```

They return `already running`; refresh the page to load the current renderer.
Use **Ports → 8768 → Private** for the F11 comparison. These are retained sessions
in this Codespace, not universally available session names. They have consumed
preparation and must not be presented again as a new live run. No terminal is
needed to inspect their logs. Commands for new preparation, auto/step controls,
export, verification and owned cleanup are in the matching
[EN](../docs/EN/demo-workspace.md) / [ES](../docs/ES/demo-workspace.md) guides.

## Presentation route and limits

Proposed Spanish route, not a measured human rehearsal:

- **0–20 s:** «Comparamos la misma imagen por R y G. El laboratorio y las firmas
  se prepararon antes. Esto es vía A con confianza local». Identify whether the
  viewer shows recorded evidence or a genuinely active supported comparison.
- **20–60 s:** Run only on fresh intact preparation; otherwise state explicitly
  that the view is recorded. Explain the independent rows and red blocking phase.
- **60–100 s:** Click Conftest's block and read ESCALATION / PRIVILEGED. Use the
  attempt list to open independent Kyverno and its original denial/attribution.
- **100–135 s:** Return to Demostración; show reference risk and legitimate L06.
  «Admisión observada no significa explotación; L06 tiene alcance parcial».
- **135–160 s:** Show Alcance and provenance. Point to the recorded offline fallback.
- **160–180 s:** Reserve. Never represent a stalled live request as successful
  by substituting historical evidence.

F11 CREATE/UPDATE/Pod and full L06 coverage are not established by this UI work.
No new Kubernetes execution, timing campaign or economic/human-effort conclusion.
No GitHub imports, historical attestation retrieval, remote dispatch or Pages.
A new full real-session archive was unnecessary for layout validation: offline
rendering uses labelled retained-content fixtures; the existing actual exporter
is covered by synthetic lifecycle/package tests. Old exports remain unchanged.
Human review and narration timing for this correction remain pending.

## Prepared commit and PR description

Commit / PR title: **fix: give demo evidence a full-height detail view**

Proposed complete PR description:

> Opening an original control log previously left about 85 px visible beneath
> the comparison. Replace that bottom inspector with internal hash navigation and
> an attempt detail view: logs open directly in the main area, with about 413 px
> visible at 1366×768 and 15 px text. Demostración, Escenarios, Workflows and Sesiones
> each use the main area; a compact global header retains context and active Stop.
>
> Preserve per-attempt outcomes, exact blocker badges, original/attribution links,
> independent F13 recovery, partial L06 scope, server-bound action authentication,
> read-only behavior and self-contained offline navigation. Back/Forward and
> polling preserve selection, expanded sections, focus and reading position.
> Workflow definitions remain captured configuration, never inferred remote runs.
>
> Validation: `make -C implementacion doctor`, `test-defense` (61), `test` and seven
> browser checks pass. Screenshots: see `registros/demo_evidence_layout_handoff_EN.md`
> and its local validation index. No scenario oracles, trust, policy criteria,
> frozen evidence, historical review or runtime measurements were changed.
>
> Assistance: OpenAI Codex implemented UI navigation/layout, regression tests and
> EN/ES documentation and performed automated/browser visual review. Human review
> and final acceptance of this correction remain pending. No new campaign sample,
> GitHub import/dispatch or Pages scope. Branch push and PR creation were subsequently authorized by the user.
