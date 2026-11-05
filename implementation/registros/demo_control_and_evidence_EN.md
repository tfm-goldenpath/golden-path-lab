# Browser control and observed evidence — implementation handoff

Base: fetched `main`, `b0564232187404df17a9156487d13454b85b924d` (merged PR #51).
Branch: `feat/demo-control-and-evidence`. The pending Trivy retrieval correction
was preserved first as a separate commit; unrelated root `package.json` and
`package-lock.json` remain untracked and unchanged. Nothing was reset or stashed.

## Result

1. Existing authenticated, session-bound actions now show environment/next-step
   context. `#demo/live` provides the observed process state, provisional bounded
   tail, last-output time, pause/follow/end, wrapping/copy and the associated final
   receipt. It does not replace pinned closed artifacts or relaunch operations.
2. `observations.py` captures one read-only GitHub run, source-specific workflow,
   jobs and artifact availability, or accepts bounded local public captures. Small
   published campaign summaries are hash-checked. Captures are append-only, never
   dispatch workflows and never retarget local action controls. Workflows separates
   results/jobs/evidence/attestations/configuration. Paired summaries distinguish
   primary R/G timing from GitHub duration; local attestation examples remain in
   their own session context, with separate presence/integrity/cryptographic/
   semantic levels and access to original documents and historical receipts.
3. Four guides per language now live under `docs/EN/defense/` and
   `docs/ES/defense/`. README navigation is organized by goal; prior locations
   contain short compatibility documents retaining their anchors. Cases, contracts,
   campaigns, evaluation records and historical human reviews were not moved.

Implementation uses the existing model, renderer, coordinator and exporter. No new
frontend dependencies, security policy changes or scenario oracle changes.

## Actual historical observation

Imported run **37202413477**, attempt 1, workflow `paired-rg.yml`, source
`895a3bde79089b7544c1dad76a6cd8f48eede0a8`, reported `completed/success` by GitHub.
Captured at `2026-10-18T10:54:12.624+00:00` as
`37202413477-b560062f4742`. Its published summaries matched the SHA-256 values in
`registros/paired-rg-campaign-895a3bd.json`. Pair 1, campaign dataset, order RG:
R 5.547909001 s, G 52.254823386 s, G−R 46.706914385 s; the published analysis marks
both arms valid-favorable and included. These are historical primary measurements,
not timings of this dashboard or current main. No dataset pooling was performed.

The full 116,999,171-byte run artifact and 1,412,065,509-byte campaign publication
were not downloaded. No claim of full-package audit or cryptographic reverification
is made. Full arm admission/HTTP/phase details absent from the small summaries stay
unknown. Jobs/steps are API observations; original job logs are linked on GitHub,
not imported. The importer records HTTP/access/expiry errors when encountered.

The authentic local attestation examples come from retained `rehearsal-01`, source
`e675325ce7bac0101e7dc1294a7d49a6b6963f50`, trust lane A. Their original bundles,
statements, observer end receipts and CI gates were read. This is historical
verification evidence, not a new verifier execution. No hosted lane-B bundle was
captured for the initial GitHub example. The UI makes that absence explicit and
does not associate local examples with the historical GitHub run.

## Validation boundary

Evidence directory: `implementacion/evidence/raw/control-evidence-20261018/`.
Synthetic fixtures exercise transitions/actions, missing evidence and malicious
input only in tests. No synthetic result is presented as a real scenario run.

The actual new viewer `control-evidence-preview-20261018` was created with actions
enabled and reserve 3 GiB on private loopback port 8774. It was **not prepared** and
no preparation/presentation button was invoked. Its export/verify commands passed;
`export-0001/recorded.html` and the updated-renderer `export-0002/recorded.html` include
the real GitHub capture; each verified package contains 11 files. This establishes export integrity, not signature trust
or readiness. The retained complete/incomplete sessions were only viewed.

The initial 8773 viewer restart encountered an unavailable port. No unrelated
process was killed; retained F11 comparison was opened on 8775 instead. Initial
failed regression logs are retained alongside their corrected reruns.

## Checks, visual review and resources

- `make -C implementacion doctor`: PASS.
- `make -C implementacion test`: PASS (147.616 s in the second complete run;
  951 Node unit tests and the other required environment/policy/crypto/workflow/
  defense checks). Earlier passing and failing iteration logs remain retained.
- `make -C implementacion test-defense`: final targeted rerun PASS, **75 Python
  regressions** plus the 11 model checks. It covers the final partial-import export,
  rejected job identity and oversized-metadata safeguards added during the last
  validation cycle; no claim that the source manifest at cycle start was unchanged.
- All ten browser checks passed: browser, usability, inline-evidence, interaction,
  layout, journey, live, observations, zoom and dom. Final focused reruns also pass
  after the auto-scroll guard, pinned imported-evidence changes and attestation return-label correction. The last return-label correction was checked with the current-renderer offline fixture; existing real exports retain their captured renderer hashes.
- The actual new viewer was inspected without an action POST. The actual offline
  export was opened and navigated with **zero network requests**. It remains
  unprepared, not a simulated live trial.
- Visual review: 1366×768, 1920×1080, 390 px and native Chrome zoom 200%.
  The live console test checks **at least 400 visible pixels** at 1366×768 with
  15 px text. The existing closed-log layout retains its 412.5 px measurement.
  Wide paired tables scroll locally on narrow screens; the document does not
  overflow horizontally. At 200% the page reflows and uses natural vertical scroll.

Final full-cycle observations (42 samples, every 10 seconds plus boundaries):
workspace free space 5.895 → 5.886 GiB, minimum 5.886 GiB; at least 1,696,316 free
inodes. That leaves 2.886 GiB over the 3 GiB custody reserve. `/tmp` is a separate
filesystem, minimum 106.447 GiB free, and was not added to workspace capacity.
Available memory never fell below 10.342 GiB in these samples; this is not an exact
peak. The host exposed 4 CPUs and approximately 15.6 GiB physical RAM. The task's
retained validation material occupied approximately 22.3 MiB at measurement.
Docker reported 1.973 GB images, 130.8 MB containers and 6.937 GB local volumes;
reported reclaimability does not authorize deleting them. No cleanup was performed.

A new cold preparation was **not attempted**: current free space is below its
8 GiB safeguard. Nothing lowered that threshold. The initial 3 GiB reserve remains
in force for bounded imports/tests/exports; all retained evidence, failures, frozen
inputs and unrelated resources were preserved. No new narration timing or lab run
is established. Human review of this feature is pending.

Local screenshots (ignored raw evidence, not committed/public artifacts):

| View | Capture |
|---|---|
| Actual controls, new unprepared session | [Controls](../evidence/raw/control-evidence-20261018/verified/preview-controls-real-unprepared.png) |
| Wide live output, labelled synthetic UI fixture | [Console](../evidence/raw/control-evidence-20261018/verified/live-final-running-synthetic.png) |
| Historical run and R/G pair | [Pair](../evidence/raw/control-evidence-20261018/verified/observations-paired-real.png) |
| Observed GitHub jobs | [Jobs](../evidence/raw/control-evidence-20261018/verified/observations-jobs-real.png) |
| Authentic local A attestation receipt | [Attestation](../evidence/raw/control-evidence-20261018/verified/observations-attestation-real.png) |
| Narrow workflow view | [390 px](../evidence/raw/control-evidence-20261018/verified/observations-width-390.png) |
| Large desktop | [1920×1080](../evidence/raw/control-evidence-20261018/verified/observations-width-1920.png) |
| Native 200% zoom | [Reflow](../evidence/raw/control-evidence-20261018/verified/zoom-workflow.png) |
| Actual offline HTML export | [Offline](../evidence/raw/control-evidence-20261018/verified/preview-actual-offline-export.png) |

## Tested entry points

The exact new-viewer command used here:

```bash
bash implementacion/scripts/defense-demo.sh serve --new \
  --session control-evidence-preview-20261018 --profile defense \
  --reserve-gib 3 --enable-actions --port 8774
```

Do not repeat `--new` for that name. Reopen with `serve --session
control-evidence-preview-20261018 --enable-actions --port 8774`. For a real
presentation, create a fresh timestamped name **after finalizing source**, then use
Preparar entorno before the talk and Comprobar entorno after successful preparation.
The [EN guide](../docs/EN/defense/README.md) and [ES guide](../docs/ES/defense/README.md)
provide the full procedure and a proposed 160-second browser route plus 20-second
reserve. Narrated timing is unmeasured; individual 120-second invocation budgets
are not a three-minute end-to-end guarantee.

```bash
python3 implementacion/scripts/defense-demo/observations.py \
  --run 37202413477 --publication-summary
bash implementacion/scripts/defense-demo.sh export --session control-evidence-preview-20261018
bash implementacion/scripts/defense-demo.sh verify --session control-evidence-preview-20261018
```

Import again creates another capture; it never overwrites the first. Repeating a
consumed demonstration requires a new session, not an evidence reset. No shared
infrastructure reuse between new sessions is promised.

## Suggested PR

Title: **feat: add browser demo control and traceable observed evidence**

The dashboard can now explain the next supported operation, follow its bounded
provisional output in a full-height view, and retain access to its final receipt.
Existing authentication, Origin/CSRF, action allowlist, concurrency, source and
preparation guards remain in force. Completed sessions cannot replay old evidence.

Add a bounded CLI-only GitHub capture path and separate observed runs from workflow
configuration. The initial historical paired example uses hash-pinned small
summaries and source-specific YAML; the UI distinguishes missing packages, primary
R/G times and GitHub duration. Authentic local attestation examples show separate
presence, integrity, historical cryptographic and semantic evidence without
claiming hosted OIDC or current reverification.

Organize the four defense guides under EN/ES defense directories, preserving old
links and anchors. Tests cover controls, live reading, imports, hostile archives,
identity/integrity errors, offline navigation, prior isolation and document links.
The prior pending Trivy correction is preserved in its own prerequisite commit.

Assistance: OpenAI Codex implementation, tests, documentation and visual review.
Human review of this new change remains pending. No new lab execution, campaign,
manual workflow dispatch, publication, PR creation or merge. Historical acceptance
is not changed or reused as acceptance of this work.
