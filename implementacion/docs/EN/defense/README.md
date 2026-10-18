# Defense demonstration

Supported F11 cases can now create independent attempts on valid retained preparation; F13 requires a separately prepared fixture. See [case attempts and authentic lane A bundles](demo-workspace.md#independent-case-attempts-and-lane-a-bundles). The original presentation is never reset.

[Español](../../ES/defense/README.md) · [Documentation index](../README.md)

Use updated `main` and the optional defense Codespace profile: **4 CPUs, 16 GB RAM,
32 GB total disk**. Preserve uncommitted work when updating. Preparation takes place
before the three-minute talk. A rebuild does not resize a Codespace. Check actual
free space/inodes; retain the 3 GiB custody reserve and 8 GiB preparation safeguard.

| Goal | Canonical guide |
|---|---|
| Prepare Codespaces and retain evidence | [Operations](defense-demo-operations.md) |
| Choose F11 comparison or defense/F13 | [Profiles](defense-demo.md), [F11 scope](f11-comparison.md) |
| Run from the browser | [Controls and live console](demo-workspace.md#browser-controls-and-live-console) |
| Read an original or the full journey | [Navigation](demo-workspace.md#full-technical-journey) |
| Show GitHub observations and attestations | [Read-only capture](demo-workspace.md#observed-github-runs-and-attestations) |
| Export and retire owned resources | [Export and cleanup](defense-demo.md#export-and-cleanup) |

## Current browser-first procedure

From the repository root, after finalizing source changes:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="defense-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf 'Session: %s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile defense \
  --reserve-gib 3 --enable-actions --port 8765
```

Forward 8765 **privately**. Before the talk, click **Preparar entorno**, inspect
its live console, then **Más → Comprobar entorno**. Wait for confirmed completion.
`defense` demonstrates F11/F13 and recovery; choose `f11-comparison` instead for
controlled R privilege exposure and partial L06. No extra scenario is added by
opening the catalogue. Ordinary inspection and supported execution use the web.

Reopen without execution using `serve --session "$DEMO_SESSION" --enable-actions
--port 8765`. A viewer started without `--enable-actions` is read-only; no browser
switch can grant permissions. If another viewer owns the port, use its reported
`stop-server --session <owner>` command or choose a free port. Do not stop unrelated
processes. `up` still prepares **and** presents; it is not preparation-only.

Consumed, failed, changed-source or cleaned sessions cannot be restarted over
old receipts. Create a new session for another presentation. Infrastructure reuse
across new sessions is not implemented. Step mode records separate segments and
presenter pauses; it does not manufacture one continuous live duration.

## Three-minute route (proposed, not human-timed)

- 0–20 s: identify the bound profile/session, prior preparation and trust lane A.
- 20–80 s: start Automatic, or one supported next step; open Consola en directo.
  Explain provisional output versus the final receipt. Stop remains in the header.
- 80–115 s: open the exact blocking log, distinguish Conftest from the independent
  Kyverno request, and show recovery only when its receipt confirms it.
- 115–140 s: Workflows → paired-rg.yml → the captured historical run. Explain R/G
  primary timing versus GitHub duration, without pooling it with the demo.
- 140–160 s: show a local attestation and its historical verifier receipt; return
  to the comparison and state scope. Keep 20 s reserve.

If operations exceed the available time, use an explicitly labelled recorded
fallback. The web budget is 120 seconds **per invocation**, not a guarantee about
three minutes including narration. No human rehearsal or new lab execution is
established by this UI change.
