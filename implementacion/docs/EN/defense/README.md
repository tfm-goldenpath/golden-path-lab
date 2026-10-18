# Defense demonstration

[Early security F02/F12/F03](early-security.md).

[Real web rehearsal, 160-second route and offline fallback](web-rehearsal.md).
Supported F11 cases can create independent attempts on valid retained preparation. The initial defense sequence includes F13; repeating F13 requires a separately prepared fixture. See [case attempts and authentic lane A bundles](demo-workspace.md#independent-case-attempts-and-lane-a-bundles). The original presentation is never reset.

[Español](../../ES/defense/README.md) · [Documentation index](../README.md)

Use updated `main` and the optional defense Codespace profile: **4 CPUs, 16 GB RAM,
32 GB total disk**. Preserve uncommitted work when updating. Preparation takes place
before the three-minute talk. A rebuild does not resize a Codespace. Check actual
free space/inodes and retain the 3 GiB custody reserve. With that reserve, current
growth guards require 5 GiB for defense preparation and 8 GiB for f11-comparison
or an independent F13 fixture. These are operational margins, not capacity guarantees.

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

Use the [single 160-second browser route and presenter worksheet](web-rehearsal.md#proposed-160-second-route): initial F11/F13/recovery, exact original logs, then the full technical journey. Keep workflow exploration for questions; historical GitHub timing is a separate dataset.

The [real rehearsal record](../../../registros/demo_web_rehearsal_EN.md) separates measured preparation, automatic execution and browser navigation from the still-pending human narration. The 120-second web budget is per invocation; it does not guarantee a three-minute talk. Switch explicitly to the verified recorded fallback if the live sequence fails or cannot support the next explanation.

[Combined profile: all demo families in one session](combined-profile.md).
