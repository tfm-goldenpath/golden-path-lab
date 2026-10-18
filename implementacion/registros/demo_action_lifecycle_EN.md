# Web action lifecycle correction — 18 October 2026

Scope: `fix/demo-action-lifecycle`, based on updated `origin/main` at
`165f1ce` (includes PR #52). No scenario, policy, workflow-import or trust-contract
changes. Root untracked `package.json` / `package-lock.json` were preserved and
excluded. OpenAI Codex assisted implementation and testing. Human review and
acceptance of this correction remain pending; earlier approvals are unchanged.

## Reproduced cause

Read-only diagnosis of `defense-20261018t141707z` was saved before intervention in
`evidence/raw/action-lifecycle-20261018/incident-before.json`. The retained check
ended with exit 0 at `2026-10-18T14:33:43.510+00:00`; controller PID 67481, start
482593, boot `a31db2ba-a5d7-4316-b845-185246d60143` was a zombie owned by viewer PID
10402. The old identity comparison accepted its PID/start/boot and the boolean OR
short-circuited `Popen.poll()`. This is both a code defect and an observed process
state, not an inferred registry/Kubernetes failure.

A new regression launches an actual harmless Python child, lets it exit without
reaping, and posts two authenticated checks. It failed before the fix and passed
afterwards. These are actual recorded regression runs, not a reconstructed test history. `baseline-test.log` and `first-fixed-test.log` preserve both outcomes.
At this initial validation checkpoint, the incident viewer and laboratory were
not reset or cleaned. The later operator-requested retirement is recorded below;
the historical receipts remain retained.

## Implementation

- `actions.py`: fixed-action runner, per-command identity and sanitized receipt,
  process observation distinct from identity, unconditional child reaping, stop
  acknowledgements, orphan handling and emergency receipt reserve on ENOSPC.
- `server.py`, `core.py`, `coordinator.py`: session-bound API correlation,
  artifact index/export inclusion, PID/start/boot safeguards, owner-only release,
  deadline propagation to actual readiness adapter. A cancelled check may be
  checked again if preparation is retained; presentation gates stay separate.
- Dashboard: persistent action card, selected command routes, exact final output,
  readiness receipt links, clear waiting/cancellation/closure outcomes. Header and
  console remain broad; original presentation timing is not overwritten by checks.
- EN/ES operations/workspace guides: prior preparation, browser procedure, safe
  viewer-only recovery and explicit resource/rehearsal limits.

## Validation

Evidence directory: `implementacion/evidence/raw/action-lifecycle-20261018/`.
Files are generated/ignored, never committed as laboratory observations.

- `make -C implementacion test` passed, including environment, unit/service,
  Conftest, Kyverno, real offline Cosign, workflow and 103 defense tests at that
  checkpoint (`shared-test.log`). The next shared rerun (`shared-final.log`) passed the other targets but exposed
  a new test patching `coordinator.start_server`, which is actually imported from
  `server` inside the entry point. The test was corrected at that boundary;
  `test-defense-112.log` passes all **112** defense regressions. The complete final
  rerun **passed**, including all 112 defense tests (`shared-complete.log`).
- Final lifecycle-only run: **18 tests passed** (`lifecycle-final.log`), including
  an additional actual archive export/verification regression for command and Stop
  receipts, sanitized diagnostics and exclusion of private original output.
- Real subprocess tests cover fast/silent completion, failed startup and source
  preconditions, exact `resume-check-N` correlation, new IDs/history retention,
  timeout/stop, stale PID/zombies, viewer reconciliation and two readers.
- Additional tests cover closing/late stop, fixture-origin output/receipts,
  ENOSPC emergency metadata and cancelled-readiness capability separation.
- `action-check.mjs`: actual authenticated HTTP action API and real subprocesses,
  with ONLY the expensive readiness adapter substituted by a labelled harmless
  Python script. Two checks complete with distinct IDs, a third is cancelled,
  controls recover, reload/two tabs preserve selection and offline makes zero
  network requests. This is **not** a Kubernetes or F11 execution.
- First visual iteration had 375.375 px visible console height and failed. The
  compact header correction gives **414.97 px visible during check at 1366×768**,
  with 15 px monospace text. Completed output remains about 400 px visible.
  Captures cover 1366×768, 1920×1080, 390 px and 683×384 reflow. Native Chromium tab zoom 2.0 passed the existing `zoom-check.mjs`: 683×384
  effective CSS viewport, no horizontal overflow and focused content visible.
- Preserved development failures include a test helper waiting for the hidden
  comparison while on a detail route and an invalid synthetic fixture relation;
  corrected tests retain their original assertions.

Additional browser results: `live-check.mjs`, `interaction-check.mjs`,
`layout-check.mjs` (F11 comparison fixture), `dom-check.mjs`,
`repeatable-check.mjs` and `zoom-check.mjs` passed. The initial layout invocation
against the defense profile failed its F11 comparison-specific path assertion;
rerunning against the correct retained F11 session passed without changing the
assertion. Authentication failure/reconnection, double-clicks, session isolation,
obsolete artifact responses, focus/scroll and old snapshots remain covered.

Screenshots (labelled synthetic commands; generated files stay out of Git):

- `evidence/raw/action-lifecycle-20261018/web-closure-check-running.png`
- `evidence/raw/action-lifecycle-20261018/web-closure-check-completed.png`
- `evidence/raw/action-lifecycle-20261018/web-closure-next-check-enabled.png`
- `evidence/raw/action-lifecycle-20261018/web-closure-cancelled.png`
- `evidence/raw/action-lifecycle-20261018/web-closure-viewport-1920.png`
- `evidence/raw/action-lifecycle-20261018/web-closure-viewport-390.png`
- `evidence/raw/action-lifecycle-20261018/web-closure-offline.png`
- `evidence/raw/action-lifecycle-20261018/zoom-console.png`

Reproduce the browser action fixture (no laboratory):

```bash
python3 implementacion/tests/defense_demo/browser-action-server.py
# Use the printed ephemeral loopback URL in a second terminal:
node implementacion/tests/defense_demo/action-check.mjs \
  http://127.0.0.1:PORT /tmp/action-lifecycle-browser
```

Stop this test-only server with Ctrl-C when the check has finished. Its disposable
synthetic session is isolated from real `.tmp/defense-demo` sessions.

Read-only retained viewers opened with the actual CLI:

```bash
bash implementacion/scripts/defense-demo.sh serve --session rehearsal-01 --port 8791
bash implementacion/scripts/defense-demo.sh serve --session f11-20261017t193938z --port 8775
```

Keep the forwarded ports Private. These commands read historical observations,
not a new execution. Fresh preparation command and three-minute browser route:
[EN](../docs/EN/defense/defense-demo-operations.md#web-action-lifecycle-and-recovery) /
[ES](../docs/ES/defense/defense-demo-operations.md#ciclo-de-vida-de-acciones-web-y-recuperación).

## Resource boundary and outstanding acceptance

Observed: 4 CPUs, approximately 15 GiB usable RAM; 32 GiB workspace filesystem,
initially about **4.1 GiB free**, finally **3.99 GiB free**, >1.67 million free inodes. `/tmp` is a different filesystem
with about 104 GiB free. The 3 GiB reserve is retained. Cold defense preparation
needs reserve plus 2 GiB growth; F11 preparation requires its 8 GiB floor. Docker reported 1.973 GB images, 196.3 MB containers and 8.739 GB volumes;
reported reclaimability was not treated as proof of ownership or permission to
delete. Task evidence occupies about 12 MB. No
additional cluster/image/database was created, no margin lowered, and no retained
evidence, snapshot or foreign Docker resource deleted. Therefore the requested
new-source real-laboratory sequence check → check → F11 → cancellation remains
pending sufficient preparation margin. The original CLI presentation does not
validate these web actions, nor does the harmless browser fixture establish
admission or a narrated three-minute rehearsal.

## Suggested PR

**fix: close demo web actions reliably and correlate their evidence**

### Change and acceptance

A completed environment check could leave a zombie controller trusted as active,
blocking subsequent actions and making Stop inconclusive. Reap owned children
before examining persisted state, preserve command-specific outcomes and link
checks/fixture operations to an exclusive command identity. The action card and
wide console show the selected result and its exact receipt independently of the
original presentation result. A terminated action releases execution controls.

### Verification

- Shared environment, service/unit, policy, offline Cosign, workflow and defense
  checks; exact logs and development failures are listed above.
- 112 targeted defense regressions, including real harmless subprocesses over the
  authenticated API, rapid completion, timeout, stop, restart and metadata races.
- Browser: actual harmless check → check → cancellation; separate command IDs,
  closed logs, restored controls, reload/two tabs and zero-network offline view.
- Existing interaction, live, layout, DOM, repeatable and native-zoom checks pass.
  Console is 414.97 px visible at 1366×768; no font reduction.

### Assistance and review

| Activity | AI contribution | Human review status | Decision | Evidence |
| --- | --- | --- | --- | --- |
| Lifecycle correction | OpenAI Codex: diagnosis, implementation, tests, EN/ES docs | Pending for this change | Pending | This validation record and generated local logs/screenshots |

### Limits or follow-up

Retain authentication, Origin/CSRF, fixed actions, source guards, session locking,
owned cleanup and immutable historical evidence. No new workflow features, policy
changes, remote dispatch, publication or human acceptance. New-source Kubernetes
rehearsal remains pending: about 4 GiB free is below defense preparation's 5 GiB
requirement with the requested 3 GiB reserve. Harmless browser fixtures do not
establish F11 admission or narrated duration. The incident evidence is retained;
a viewer-only restart procedure is documented separately from cleanup.

## Subsequent operator-requested space recovery — 18 October 2026

The later F13 preparation refusal required 8 GiB (3 GiB custody reserve plus
5 GiB growth); the observed workspace had approximately 3.99 GiB available.
Creating another session alone does not resolve that condition.

On the operator's request to recover space, retired three obsolete laboratories:
`rehearsal-06`, `defense-20261017t203701z` and `defense-20261018t141707z`.
None had a live controller or operation and all failed the current-source guard.
The currently bound `defense-20261018t153037z` had no laboratory resources.

The standard cleanup initially refused the two stopped registries because their
IP addresses were empty. A focused regression reproduced this error. Retirement
now uses its existing immutable container-ID and label checks without requiring
the prepared network address; strict readiness still requires that address and a
running registry. The 24 comparison regressions passed after the correction.

Existing cleanup produced verified exports and retirement receipts. An additional
one-off inventory recorded the six exclusive node/builder volume mounts before
retirement. Each exact volume was removed only after a matching successful
container-retirement receipt, unchanged volume metadata, no remaining consumers
and no other session ownership record referencing the container. No global prune
or directory deletion was used. Standard cleanup's volume-retention contract is
unchanged; the one-off script and decisions are retained in generated evidence.

Net free space increased from 4,283,080,704 to 9,649,123,328 bytes (approximately
**5.00 GiB recovered, 8.99 GiB free**). All three original evidence directories,
private directories and verified exports remain. Historical operational outcomes
remain ERROR/COMPLETED/COMPLETED respectively. Four volumes without sufficient
ownership proof and all three shared images remain. No new laboratory or F13
execution was started. Preparation must use a new session on the final source;
its own resource check remains authoritative as disk consumption changes.

Receipts, before/after observations and checks:
`implementacion/evidence/raw/space-recovery-20261018/` (ignored generated evidence).
The subsequent `make -C implementacion test` passed, including 114 dashboard
regressions; `shared-test.log` retains the result. `git diff --check` also passed.
This recovery removes the observed disk blocker at that moment; the earlier web
Kubernetes rehearsal remains unperformed and human review remains pending.
