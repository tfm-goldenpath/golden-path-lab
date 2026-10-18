# Browser rehearsal and recorded fallback

[Portable defense, selected offline originals and freeze](static-freeze.md).

[Defense index](README.md) · [Español](../../ES/defense/web-rehearsal.md)

Use one new `defense` session on the final source. Lane A uses a local trusted key;
this presentation does not establish GitHub OIDC, full catalogue coverage, a
replacement-image L01, a human-effort result or a campaign sample. Initial F13 is
part of this sequence. An independent F13 repeat requires additional preparation.

## Before the talk

Use 4 CPU / 16 GB RAM / 32 GB total disk. Check free bytes and inodes, not total
capacity. Retain the configured 3 GiB custody reserve and growth margins. Do not
rebuild, sign, download databases or create a cluster during the timed explanation.

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
nproc
free -h
df -h /workspaces /tmp
df -i /workspaces /tmp
docker system df
ss -ltnp 'sport = :8765'
export DEMO_PORT=8765
# If occupied, inspect the owner and choose a free port, e.g. DEMO_PORT=8776.
export DEMO_SESSION="defense-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf 'Session: %s  Port: %s\n' "$DEMO_SESSION" "$DEMO_PORT"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile defense --reserve-gib 3 \
  --enable-actions --port "$DEMO_PORT"
```

Save the printed session/port for another terminal. Forward that port with
**Private** visibility in Codespaces. The server binds loopback. This command
creates the viewer, not the laboratory. Click **Preparar entorno**, then open
**Consola en directo**. Closing the tab does not cancel preparation: reopen the
same command instead of submitting it again. Preflight tests can write to their
own files with little stdout; inspect the final operation's Evidencias.

Wait for **Completada**, then run **Más acciones → Comprobar entorno** twice.
Each action must have a different ID, final receipt and released controls. The
original session must remain prepared with its live cases pending. A source,
configuration or boot mismatch requires new preparation, never editing state.

`up --auto` prepares **and runs** the presentation and is not this procedure.
`prepare --serve --enable-actions` remains a CLI preparation alternative. A server
without `--enable-actions` supports inspection only; the browser cannot elevate it.

## During the talk

Select **Automático → Iniciar comparación**. This runs the pending profile sequence
with new readiness, F11/Conftest, F13/Kyverno, authorization, valid rollout/HTTP and
an independent F11/Kyverno request. A red attributed rejection with confirmed
expectation is a successful control test, not an integration error. Prepared
build/scan/signing work is not repeated. R here is the valid prepared reference,
not the privileged-exposure comparison of `f11-comparison`.

Alternatively, **Paso a paso → Ejecutar siguiente paso** runs only the allowed next
operation. Pauses and separate segments are not one continuous live duration.
Do not change modes merely to bypass a failed step. A completed original sequence
cannot restart over its receipts; compatible F11 **Nuevo intento** buttons create
new identities/evidence after readiness. Read earlier attempts separately.

**Detener** requests cancellation; wait for its terminal receipt. Only use a safe
readiness check for the cancellation rehearsal. A check that finishes first stays
completed. Never interrupt signing or authorization just to demonstrate Stop.

**Ver proceso completo** opens the fifteen-stage map. **Secuencia ejecutada** is
chronological; the map is pedagogical. A stage's **Ver salida original** opens the
wide console. **Volver al recorrido técnico** restores the filter and expansion;
**Demostración** returns to the comparison. Inspecting never changes action targets.

For CLI diagnosis outside the browser rehearsal, the equivalent pending-sequence
command is `bash implementacion/scripts/defense-demo.sh present --session
"$DEMO_SESSION" --auto --budget-seconds 120` (one shell line). Do not run it in
addition to the browser start button or against a consumed sequence.

## Additional F13 and capacity

After the first sequence authorizes results, the same digest no longer establishes
absence. **Preparar nuevo caso F13** prepares an independent fixture outside the
presentation window; its initial safeguard is 8 GiB free (including reserve and
growth), with inodes checked too. Recheck actual space after the first laboratory.
If insufficient, retain the resource refusal and mark independent repetition
resource-blocked. The initial F13 run does not validate its repeat. Do not remove
attestations or delete evidence to force a pass. Use the fixture's own execution,
recovery and retirement controls only when its preparation succeeds.

## Recorded fallback and closure

From **Más acciones → Exportar HTML y evidencia**, export once after the real
sequence and checks. Wait for completion; export is outside presentation timing.
Verify without creating another package:

```bash
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
# CLI alternative to the export button; do not run it again just to verify:
# bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
```

Keep `recorded.html`, `evidence.tar.gz`, `manifest.json` and `SHA256SUMS.txt` together
from the reported export directory. On the presenter computer, verify checksums
with `sha256sum -c SHA256SUMS.txt`, then open `recorded.html` directly in a browser.
The HTML needs no API/server and must identify recorded session, source and capture
date. No live execution is offered. Browser excerpts are bounded and labelled;
full originals and the mapping of artifact IDs to original paths are in the verified
package/manifest. A full bundle can be read without bulk extraction with
`tar -xOf evidence.tar.gz artifacts/<artifact-id>/<filename>` using the exact
allowlisted name in the manifest. Do not claim that an excerpt is complete. External GitHub links
need network; imported GitHub observations retain their historical identities and
are separate from this local run. A present bundle is not a new verification.

To reopen the bound live viewer without execution:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session "$DEMO_SESSION" --enable-actions --port "$DEMO_PORT"
# Inspection only: omit --enable-actions on a separately opened viewer.
# After the talk, inspect the exact scope and retire only this session:
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

Retire a linked F13 fixture first, if present. Cleanup preserves evidence and private
material and retains Docker volumes; further reclamation needs proven ownership.
Do not use global prune. Retired preparation cannot execute again. Transfer required
snapshots before stopping a Codespace; exported identity is not database bytes.

## Proposed 160-second route

| Seconds | Explanation and browser action |
|---|---|
| 0–20 | State profile, lane A, machine and preparation completed beforehand. Identify session/source. |
| 20–55 | Click Iniciar comparación. Open Consola en directo; distinguish provisional output from final receipts. |
| 55–85 | Return to Demostración. Open F11's Conftest blocking log and attribution; explain the two privilege fields and the unreached downstream path. |
| 85–115 | Open F13's Kyverno rejection and its separate recovery. Explain missing results, then authorized delivery/HTTP. |
| 115–140 | Open independent F11/Kyverno evidence. Show its exact rejection and unchanged valid workload; return via the technical map. |
| 140–160 | Show a receipt and scope, identify the recorded fallback and close. Keep 20 seconds reserve. |

If the live run fails or cannot support the next explanation by 85 seconds, stop
claiming its expected result, identify the failure and switch to the pre-opened
recorded HTML. Never silently replace a failed live attempt. If no completed real
fallback exists, present the failure honestly. The 120-second command budget is not
a guarantee of a three-minute narrated talk.

Operator worksheet (leave pending until a person rehearses): date/person ___;
session/source ___; preparation duration ___; automatic interval ___; browser
navigation time ___; human explanation start/end and total ___; incidents/fallback
___; decision and reviewer ___. Human rehearsal and acceptance remain pending.

Measured runs and limitations are in the [validation record](../../../registros/demo_web_rehearsal_EN.md).
