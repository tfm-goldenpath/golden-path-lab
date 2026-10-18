# Early security dashboard validation — 18 October 2026

## Source and boundary

- Branch: `feat/demo-early-security-cases`, based on merged main `aca4ed79cdfb287770cf7b0315b14f38d6e0e5b6` (PR #54).
- Final executed dirty-source content hash: `aa5e53890105dc2fcd255aed064c15e1d6ac6cd4266e60c90df6011a9245348e`.
- Session: `early-20261018t185647z`; profile `early-security`; local execution, no OIDC claim.
- Raw session: `implementacion/evidence/raw/defense-early-20261018t185647z/`.
- Browser observations, screenshots, check logs and resource observations:
  `implementacion/evidence/raw/early-browser-release/` (ignored generated evidence).
- Full file/source inventory and initial dirty status remain in the session's
  `source.json`. Unrelated root npm files and prior evidence were preserved.
- Tools observed: Node 24.21.0, Conftest 0.70.1, Trivy 0.74.0, Docker 29.8.0;
  pinned images/tools were not changed. Four effective CPUs; 15.619 GiB physical RAM.

This is real execution of existing early controls through authenticated browser
buttons. F02/F12 inputs are explicitly inert static fixtures; their Conftest
observations are real. F03 uses actual images/SBOMs and fresh scan reports. No new
kind cluster, admission request, image signature, successful-delivery authorization,
remote workflow or campaign sample was created. This is not full F03/F12 catalogue
coverage, L01, L02 or L06. Human review and narration remain pending.

## Implementation and files

- `scripts/defense-demo/early.py`: isolated case readiness, source/input checks,
  new comparison/attempt identities, cancellation/failure history and resource guard.
- `early-adapter.py` / `early-adapters.sh`: inputs and orchestration over existing
  `workflows.py`, `scenario_runtime_early` and vulnerability scenario/association
  oracles. No policy is reimplemented. Negatives and positives have separate original
  outputs, control exit codes and linked comparison IDs.
- `lib/lab.sh`: extract the existing owned registry/builder operation so F03 needs
  no kind cluster. `lib/delivery.sh`: extract fresh analysis of a prepared SBOM;
  preserve the original scan flags, frozen-database checks and association validator.
- Existing coordinator/case allowlist/server/exporter: wire this separate profile
  through the same supervisor, session lock, cookie/Origin/CSRF checks, source guard,
  bounded output and offline packaging. The F11/F13 sequences are unchanged.
- `demo/`: per-case prepare/compare/repeat, original evidence and F03 digest/CVE/
  database explanation. Existing wide console, history and technical journey remain.
  Spanish **informe / informe de ejecución** replaces **recibo** in the renderer;
  historical files and machine schemas are unchanged. Primary-button contrast and
  the negative/positive counterpart label were corrected after visual inspection.
- Focused Python/model/browser checks; EN/ES defense guide, indexes, architecture
  note and TODO. No framework, dependency upgrade or devcontainer rebuild.

## Actual browser acceptance and timing

Session preparation began at 2026-10-18T18:56:47.889+00:00. Each row below has a denied negative
and an allowed positive, both with confirmed expectations. Operation times include
supervision and evidence closure; comparison time includes both operations and
input checking. The intervals are separate commands, not one continuous human demo.

| Case | Preparation s | Negative evaluation s | Positive evaluation s | Comparison s | Command identity |
|---|---:|---:|---:|---:|---|
| F02 | 0.544 | 0.491 | 0.487 | 1.098 | `c72a663fc0d54d319feefbae499deab3` |
| F12 | 0.685 | 0.637 | 0.645 | 1.399 | `998ae44cd104438e921d647d2075d23f` |
| F03 | 48.146 | 3.955 | 3.966 | 8.082 | `92a17dbaca7c42eeb3329f12222a8685` |

- F02: original workflow accepted; mutable `actions/checkout@v7.0.1` rejected solely
  by `ACTION_SHA`. Inputs, exact diff, policy/tool hashes, arguments and stdout/stderr
  are under `operations/early-f02-{prepare,negative-1,positive-1}/`.
- F12: static example manifest accepted by digest; image tag rejected solely by
  `DIGEST`. No claim that `example.invalid/static-quotes` exists. Original evaluator
  output and attribution: `operations/early-f12-negative-1/control.json` and
  `control.attribution.json`.
- F03: CVE-2021-44906, minimist 1.2.5, CRITICAL, reported fixes `1.2.6, 0.2.4`.
  The repaired image uses minimist 1.2.8 and passes the entire HIGH/CRITICAL gate.
  Original reports are `operations/early-f03-negative-1/vulnerabilities.json` and
  the corresponding positive directory; `analysis.json` / `target-attribution.json`
  establish association and attribution. Original prepared SBOMs are copied unchanged,
  with a preparation-origin record; the live reports are new.
- Vulnerable digest: `8a02fa048845b8743f5d47fb7be81e62ed298866a6f8da68085b64770e6256f3`.
  Repaired digest: `76b8c57cdb23c7b704757ec0c5f757b7d2d202e4e8ba530a21ce2219ad76fb6c`.
- Database update: `2026-10-18T18:32:29.177029985Z`; `trivy.db` SHA-256
  `854a708cd5033f5bbac9b14a8252d49dedf02ebb9a79d002ff7945c299ea5bdd`.
  Snapshot path: `/tmp/golden-path-defense-early-20261018t185647z/snapshots/vulnerability-db-run-tPDLPce5`.
  The same snapshot was checked before/after each scan and retained.
- F02 repeat: new pair `early-f02-2`, 1.232 s; original event prefix unchanged.
- Actual active-operation cancellation: command `9febda5b6bef4ede8c43d37c0a44893f`,
  operation `early-f03-negative-2`; CANCELLED, indeterminate decision, 0.928 s.
  Comparison remains INCOMPLETE and explicitly includes that closed aborted operation.
  No positive observation was invented. `stop.json` preserves the supervised result.
- After cancellation, the browser enabled and completed pair `early-f03-3` in
  8.027 s; command `c40f514c1d89477cbce48bebf66824d6`. No reload/manual state edit was
  needed to unlock it. The harness performs 11 POSTs, including stop/export;
  none are remote dispatches.
- `actions.json` includes browser acceptance/poll latency (`browserSeconds`), not an
  isolated navigation benchmark. Human narration is unmeasured. Do not turn these
  separate intervals into `liveDurationSeconds` or campaign observations.

## Iterations retained, not replaced

1. `early-20261018t184542z`: all three real comparisons, F02 repetition and export
   passed. F03 preparation 47.046 s at command scope. Visual review found low primary
   button contrast and a counterpart link using F13-specific wording. Own registry
   and builder were retired through the ownership plan; evidence/DB/volumes retained.
2. `early-20261018t185204z`: compatible new source; real comparisons and offline tests
   passed. A first cancellation happened during command startup (no scanner observed).
   A separate browser check then stopped an observed F03 operation and completed
   another pair. Its comparison summary omitted the aborted operation ID even though
   the original event and supervisor association were preserved. Fixed the summary
   in `finally`, added cancellation/timeout regressions, and retained this observation.
   Only that session's verified registry/builder containers were retired.
3. `early-20261018t185647z`: final source above; corrected cancellation association verified
   from browser. This session remains available for compatible repetitions.

No earlier preparation was forced through the source guard. Historical snapshots,
failed/aborted observations and original hashes were not rewritten.

## Verification and visual review

- `make -C implementacion doctor`: passed; exact output retained with validation logs.
- Focused early lifecycle/static checks: 9 passed; model checks: 16 passed.
- `make -C implementacion test-defense`: 123 passed on final code, preserving process,
  source, authentication, Origin/CSRF, isolation, traversal, export and cancellation tests.
- Shared `make -C implementacion test`: **PASS**, exit 0, 179.696 s. Six environment,
  951 service/unit, 43 policy and 123 defense checks, plus real local bundle
  cryptography. Original output/timing: `shared-checks.log` / `shared-checks.json`.
  These test fixtures are not live scenario samples.
- `early-check.mjs`: actual browser actions, original controls, new identities,
  immutable prior observations, cancellation, subsequent comparison and export passed.
- `early-visual-check.mjs`: actual evidence at 1366×768, 1920×1080, 390 px and native
  Chromium 200% zoom passed. All three ordinary desktop consoles expose **400 px**
  with **15 px** monospace text. At 1920×1080: 695.22 px. At 390 px, natural page
  scrolling exposes 590.5 px of log; at native 200% zoom, 383.94 CSS px after scrolling.
  No horizontal document overflow. Focus/selection survived polling and back navigation.
- Offline navigation/three blocking logs/15-stage journey: zero HTTP/API requests;
  actions disabled. Screenshots: `visual/f02-overview.png`, `f12-overview.png`,
  `f03-overview.png`, `f03-result.png`, each `*-console.png`, `narrow-reading.png`,
  `zoom-200.png`, `offline.png`; `f03-live-repeat.png` shows the observed active command.
- Existing F11/F13 inline evidence and offline DOM checks passed over retained evidence.
  Two older browser checks remain failing for pre-existing assumptions: the comparison
  overview ends at 1004.33 px in a 768 px viewport **both on main aca4ed7 and this
  renderer** (`existing-height-comparison.json` and paired screenshots); usability's
  workflow assertion expects no imported runs, but authentic run captures exist.
  Their assertions were not weakened. This task does not claim to fix the pre-existing
  four-row layout or remove imported data to make a test pass.
- Development diagnostics retained: a documentation-link check ran before this record
  existed; a direct focused test invocation lacked the documented tools PATH; a browser
  check read “Cargando salida…” before the artifact resolved. These were corrected and
  rerun. `/usr/bin/time` is absent; final suite duration uses Python's monotonic clock.

## Offline backup

`implementacion/evidence/packages/defense-early-20261018t185647z/export-0001/recorded.html`
is self-contained and recorded. Open the file in a browser; it requires no action
server. The original complete artifacts accompany it in `evidence.tar.gz`.
`verify --session early-20261018t185647z` reports VERIFIED, **610 files**, archive integrity
only. Package SHA-256: `51bb434814cd7c2c24bcd37169bf3d2993ffdc9de797e47f93b3a4597ec683c7`.
The large database snapshot is retained separately at its identified path; exact
re-analysis needs that snapshot, not merely the HTML. The HTML includes bounded
excerpts where labelled; full reports remain in the verified package. External
GitHub links are not offline content. No signatures/attestations are invented for
these early cases.

## Resources, conservation and remaining limits

Final observation 18:59 UTC: `/workspaces` and `/var/lib/docker` are the **same** 32 GiB
filesystem, about 24 GiB used / 6.0 GiB available, 1,671,689 inodes free. `/tmp` is a
separate observed 118 GiB backing filesystem, 81 GiB available; do not add its space
to the 32 GiB workspace or assume another Codespace has this topology.

The final session has 46 lightweight operation samples (10-second interval plus
boundary samples): minimum workspace availability **5.964 GiB**, safely above the
3 GiB custody reserve. Minimum available RAM **10.825 GiB** out of 15.619 GiB;
maximum sampled non-available memory about **4.793 GiB**, not an exact RSS peak.
Initial task workspace availability was about 6.8 GiB; no deletion was used to make
preparation pass. Margins remain provisional and do not guarantee other machines fit.

Docker after validation: three cached images (1.973 GB), five containers (127.3 MB),
nine volumes (6.122 GB). Only the last session's two new containers remain; the
pre-existing user's kind/registry/builder remain untouched. The earlier two new
registry/builder containers were removed via their immutable IDs and labels.
No volumes, image caches or generic temporary directories were pruned.

Each of the three preparations retains a ~1.6 GiB snapshot and corresponding cache
in its own `/tmp/golden-path-defense-early-…` tree. Copies were not created per live
click. Raw session trees are 2.3 / 3.4 / 2.4 MiB; package trees 9.9 / 16 / 3.6 MiB.
Resource files distinguish aliases and samples; these are observations, not capacity
or performance guarantees. No evidence was deleted. The final owned registry and
builder can be retired with the documented cleanup plan; doing so disables execution
for that session but preserves reading/export.

Pending: human review and a narrated 160-second rehearsal; historical full catalogue
coverage remains unchanged. A future commit/merge changes the bound source and needs
fresh compatible preparation. Additional rendering work for the existing four-row
comparison is separate from this early-case feature.

## Handoff and proposed PR

Use [EN instructions](../docs/EN/defense/early-security.md) /
[Spanish commands and 160-second script](../docs/ES/defense/early-security.md).
For the already prepared current dirty source:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="early-20261018t185647z"
bash implementacion/scripts/defense-demo.sh serve --session "$DEMO_SESSION" --enable-actions --port 8782
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
# Only when presentation/repetition is finished:
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

Title / suggested commit: `feat: add early security comparisons to the demo dashboard`

Proposed PR description:

> Add a separate `early-security` profile so the presenter can prepare, execute and
> repeat F02 workflow-reference, early F12 image-reference and real F03 vulnerability
> comparisons from the existing authenticated dashboard. Each comparison preserves
> negative/positive observations and immutable command/attempt evidence. F02/F12 do
> not require Docker; F03 reuses shared registry/build/SBOM/scan helpers without kind.
> Keep F11/F13 sequences, production policies and scenario oracles unchanged. Replace
> unclear Spanish “recibo” with “informe de ejecución”, retain original log access and
> show F03 subject/CVE/database/threshold details. Include the cancellation association
> fix observed during actual browser testing, focused regressions and EN/ES guidance.
>
> Validation: real three-case browser comparisons, repetitions, active-operation
> cancellation and recovery of controls; verified 610-file offline package; four
> viewport/zoom reviews, 400 px desktop consoles and zero-network offline navigation;
> shared checks and 123 defense regressions. Two existing browser assumptions remain
> documented (four-row viewport fit and imported-workflow data). No hosted workflow,
> policy change, campaign sample or human narration/acceptance claim.

Assistant contribution: OpenAI Codex implementation, tests, browser operation and
 documentation. Human review/decision: **pending** for this change. No PR was opened,
pushed, merged or published by this task.

## Human acceptance and PR handoff

On 18 October 2026 the requester explicitly asked to create the PR and record
human acceptance ("crea la PR y añade aceptación huamna"). **Decision: accepted
by the requester.** This supersedes the development-time pending status above
for this contribution; historical execution records are unchanged. OpenAI Codex
assisted implementation, tests, browser validation and documentation.

Acceptance does not establish a timed human narration, full F11/L06 catalogue
coverage, independent F13 fixture validation, hosted OIDC, or new campaign results.
The combined HTML early-log excerpt limitation remains open; complete originals
are preserved in the verified archive and viewer. No GitHub review is submitted
on behalf of a human. The requested handoff authorizes pushing this branch and
opening its PR, not merging or publishing images/releases.

Recorded real sessions bind the pre-commit dirty source and retain those exact
identities. Committing changes the source revision: use a new compatible
preparation for further execution; existing results remain available read-only.
