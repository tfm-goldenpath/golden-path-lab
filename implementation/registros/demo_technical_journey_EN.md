# Full technical journey — navigation handoff

Branch: `feat/demo-technical-journey`, created from fetched `origin/main`
`b5d0a27f79aabab29ca43b01ef829dfae8ccc626` (merged PR #50). The latest dashboard
was already in main. The pre-existing uncommitted Trivy retrieval correction and
untracked root npm files remain intact; they are separate from this UI work.
The initial implementation was local. On 18 October 2026 the requester confirmed
human review and explicitly requested creation and closure of the PR. Closure is
without merging; the branch is retained. No workflow dispatch or Pages publication
is included. Normal push/PR CI may run through the repository's existing triggers.

## Result and implementation

- `demo/model.js` centralizes the journey read model over the **captured** catalogue
  phase membership and operation receipts. All fifteen phases remain discoverable.
  The chronological list preserves input receipt order; no ordering or timings are
  fabricated from the pedagogical map.
- `demo/index.html`, `app.js`, `style.css` expose Recorrido técnico, with map/sequence
  tabs, session/preparation/attempt/conservation filters, lazy expansion and hash
  navigation. No new renderer asset, dependency or framework was introduced.
- Global preparation and conservation receipts open through numeric operation
  routes without inventing an Fxx/Lxx scenario. The wide console remains the main
  evidence view. Return, Back/Forward, polling, expanded sections, focus and scroll
  are preserved. Selecting evidence never starts an operation.
- Multiple outcomes in one phase are retained separately. Red F11/F13 blockers
  stay visible when collapsed, alongside aggregate successful observations or
  downstream No alcanzado. F13 recovery remains independent. Reused preparation
  links to its recorded origin and never appears as another live operation.
- File metadata identifies capture provenance. Equal bytes from the same recorded
  source in an earlier operation are labelled inherited, linked to that earlier
  observation and explicitly not the selected control's output. Generated operation
  logs are not equated just because they contain identical bytes. File presence and
  hashes do not establish signature verification.
- Incomplete preparation has a warning with operation receipt/output links and,
  when captured, separate download/SBOM/analysis diagnostics. No cause is inferred
  from filenames or exit codes. `rehearsal-06` remains an incomplete preparation:
  four G attempts No alcanzado; 321.22 s preparation; live time unknown. Its valid R
  observation does not confirm G readiness. No session-specific values are in code.
- Matching EN/ES navigation/operations/architecture guides and TODO describe the
  flow. Per-attempt technical details remain scoped and link to the full journey.

## Validation and retained evidence

Ignored local evidence root: `implementacion/evidence/raw/technical-journey-20261018/`.
Original receipts/packages, failed session results and human declarations were not
modified. Viewer startup updates only its normal session/server bookkeeping.

Read-only retained sessions:

- `rehearsal-01`: defense, source `e675325ce7bac0101e7dc1294a7d49a6b6963f50`; actual
  recorded F11/Conftest, F13 and independent F11/Kyverno observations and recovery.
- `f11-20261017t193938z`: F11 comparison, evidence source
  `73b3a65302a352fc0e131e420da50a18dbb62be2`; partial F11/L06 and controlled R.
- `rehearsal-06`: failed preparation, evidence source
  `179377f9cb15dd5e99b983f02e9c5774f2aa2d2d`; no successful G rejection claim.

Rendering/polling/action/offline fixtures are explicitly labelled. Action requests
are intercepted in browser tests; no real action was invoked. The exact Conftest
original opened through the journey is checked against its recorded SHA-256.
Missing originals are not replaced with inherited copies. Offline tests embed
captured content using the same existing renderer assets and make zero requests;
actual exporter lifecycle/security regressions retain their package checks.

Early regression failures were retained: polling moved the map's page scroll;
mobile select intrinsic width overflowed; the fixture HTML generator interpreted
JavaScript replacement-string tokens while embedding a regex. These were fixed
without weakening assertions. The cross-session filter also exposed inconsistent
session IDs in old synthetic browser fixtures; the fixtures now consistently label
their copied events. Foreign-session events remain excluded in the model tests.

Final check commands/results, source identities and resource samples are recorded
under `final/`. Screenshots below are local review files, excluded from Git:

| Check | Observed result |
|---|---|
| `make -C implementacion doctor` | PASS, 1.019 s |
| `make -C implementacion test-defense` | PASS, 61 Python regressions plus model checks, 3.580 s |
| `make -C implementacion test` | PASS, 145.014 s; includes the final model compatibility regression |
| `node --test implementacion/tests/defense_demo/model.test.mjs` | PASS, all 11 tests |
| Browser checks | All eight PASS: browser, usability, inline-evidence, interaction, layout, journey, zoom, dom |
| Syntax / whitespace | `node --check implementacion/demo/app.js` and `git diff --check` pass |

The journey check measured **412.515625 px visible console height** at 1366×768,
with 15 px text. It recorded zero action POSTs, zero offline network requests and
no browser errors. Visual review also covered 1920×1080, 390 px width and native
Chrome zoom 200% (confirmed by the browser zoom API). Normal page scrolling is
intentional for the full map and narrow layouts; these are not claims that all
fifteen phases fit in one viewport. The incomplete summary may also require
scrolling to its final attempt. No whole-document horizontal overflow was found.

`validated-source.json` captures the source at the start of the checks;
`source-after-checks.json` captures the final working tree. During the shared
suite, an old-metadata compatibility guard and its model test were finalized:
a live receipt missing its optional phase must not imply that preparation never
reached G. The shared suite's final defense checks, all subsequent browser checks
and the explicit 11-test model rerun cover that final version. Documentation was
then updated with these results. Evidence-source revisions above remain distinct
from the dirty renderer checkout based on `b5d0a27`.

Observed machine: 4 CPUs, approximately 15.6 GiB physical RAM and a 32 GiB
workspace filesystem. Across 38 samples (10-second polling plus check boundaries),
workspace free space went from 5.925 to 5.918 GiB; the lowest sampled value was
5.918 GiB, leaving 2.918 GiB above the 3 GiB reserve used for these checks. The
minimum observed free inode count was 1,696,792. Available memory stayed at or
above 11.646 GiB. These are sampled observations, not exact peaks. `/tmp` uses a
different filesystem, with a sampled minimum of 106.666 GiB free; its space was
not added to the workspace budget. This task's retained screenshots/logs/fixtures
occupied approximately 17.82 MiB at measurement. No cleanup was needed; failed
checks, browser profiles, original evidence and prepared resources were retained.
The 8 GiB cold-preparation safeguard was not lowered or exercised by these UI
tests; current free workspace space would need checking before a new preparation.

| View | Capture |
|---|---|
| Demonstration | [Summary](../evidence/raw/technical-journey-20261018/final/verified-journey-demo.png) |
| Complete map | [All fifteen phases](../evidence/raw/technical-journey-20261018/final/verified-journey-map-complete.png) |
| Recorded sequence | [Preparation receipts](../evidence/raw/technical-journey-20261018/final/verified-journey-sequence.png) |
| Original console | [Conftest](../evidence/raw/technical-journey-20261018/final/verified-journey-console.png) |
| Incomplete preparation | [No alcanzado](../evidence/raw/technical-journey-20261018/final/verified-journey-incomplete.png) |
| Narrow map | [390 px](../evidence/raw/technical-journey-20261018/final/verified-journey-map-390.png) |
| Larger desktop | [1920×1080](../evidence/raw/technical-journey-20261018/final/verified-journey-map-1920.png) |
| Native 200% zoom | [Focused map phase](../evidence/raw/technical-journey-20261018/final/verified-zoom-journey-focused.png) |
| Offline fixture | [Map and restored selection](../evidence/raw/technical-journey-20261018/final/verified-journey-offline.png) |

No new full archive export or Kubernetes execution was necessary for this UI work.
Existing export files remain unchanged; a renderer update is not a new execution.

## Open and explain

These loopback commands were tested in this Codespace (Ports visibility Private):

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
bash implementacion/scripts/defense-demo.sh serve --session rehearsal-01 --port 8771
bash implementacion/scripts/defense-demo.sh serve --session rehearsal-06 --port 8772
bash implementacion/scripts/defense-demo.sh serve --session f11-20261017t193938z --port 8773
```

Use `/#journey/map`, `/#journey/sequence` or the visible Recorrido técnico tab.
The names refer to retained sessions here, not universal fixtures. Other-session
inventory inspection does not retarget actions. See [EN](../docs/EN/demo-workspace.md)
/ [ES](../docs/ES/demo-workspace.md) for preparation/control/cleanup commands.
Preparation and disk safeguards remain outside the three-minute talk; none were
relaxed. This change only inspected retained observations.

Proposed Spanish route, **not a measured human rehearsal**: 0–25 s identify the
recorded session/profile and preparation outside the live interval; 25–65 s open
Recorrido técnico and distinguish map from sequence; 65–110 s select F11 and read
its Conftest original; 110–140 s return to the same context and show independent
Kyverno/F13/recovery only where recorded; 140–160 s return to Demostración and state
the limits; 20 s reserve. With incomplete preparation, explain No alcanzado and its
recorded diagnostic; do not describe unexecuted controls as successful detections.

## Suggested PR

Title: **feat: add the complete demo technical journey**

Opening an attempt's detail explains only that attempt. Add a visible Recorrido
técnico destination for the full fifteen-phase process and the recorded operation
sequence, while retaining the full-height evidence console. Context filters keep
preparation, independent attempts and conservation distinct; mixed outcomes and
F13 recovery do not erase earlier rejections. Original logs and attribution open
in one click, including global preparation operations, and returning restores
filter, expansion, focus and reading position.

The read model uses the captured catalogue and receipts, labels reused/inherited
evidence, and explains incomplete preparation without inventing a diagnosis or
live duration. Historical evidence, scenario oracles, trust and backend action
restrictions remain unchanged. Matching EN/ES documentation and focused browser/
model regressions cover the new navigation, old metadata and offline rendering.

Assistance: OpenAI Codex implemented the UI/model, tests and documentation and
performed automated and visual validation. The requester confirmed human review
on 18 October 2026 and authorized PR creation and closure without merging. This
records the human's declaration, not an assistant-authored GitHub approval.
Narrated timing remains unmeasured. No new campaign sample, live laboratory run,
GitHub imports, remote dispatch or Pages scope. The prior Trivy fix in the working
tree remains a separate change, not part of this presentation-only implementation.
