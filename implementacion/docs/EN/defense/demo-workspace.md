# Demo navigation and full-height evidence detail

[Español](../../ES/defense/demo-workspace.md) · [F11 profile](f11-comparison.md) · [Operations](defense-demo-operations.md)

One application has five visible destinations: **Demostración**, **Recorrido técnico**, **Escenarios**,
**Workflows** and **Sesiones**. Each replaces the main area. An attempt's detail
is a dependent view of Demostración, not a bottom inspector or a modal. Audience
text is Spanish. Navigation never starts, retries or stops a laboratory operation.

The compact header separates viewer connection, recorded/observed execution and
laboratory state. **Identidad y procedencia** holds the full session identity,
evidence source, renderer hash, recorded resources, preparation and complete
technical detail. A connected viewer can display old evidence from a cleaned lab.
**Tiempo registrado de ejecución** is a recorded duration, not a current timer.

## Open the viewer in Codespaces

Inspect the available sessions and use a free private port. These read-only
commands were tested against retained local evidence on this Codespace:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
bash implementacion/scripts/defense-demo.sh --help
bash implementacion/scripts/defense-demo.sh list
bash implementacion/scripts/defense-demo.sh serve \
  --session f11-20261017t193938z --port 8768
# Independent retained defense/F13 session, also read-only:
bash implementacion/scripts/defense-demo.sh serve \
  --session rehearsal-01 --port 8770
```

Open the chosen port from **Ports**, visibility **Private**. Those names are
retained sessions in this workspace, not universal fixtures for a fresh Codespace.
Serving them reads past observations; it does not resume their consumed preparation.
A new code revision cannot execute an old preparation by changing viewer settings.
If an owned viewer already uses another port, follow the safe viewer-only restart
instructions in the operations guide. Do not kill unrelated listeners.

For a new supported F11 comparison, create a new bound session before the talk:

```bash
export DEMO_SESSION="f11-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf '%s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile f11-comparison \
  --reserve-gib 3 --enable-actions --port 8765
```

Then use **Preparar entorno** in the web strip. Alternatively use the existing
`prepare --serve --enable-actions` command in the F11 guide. This cold preparation
was not repeated for this UI change. It remains outside the presentation window.
`up` still prepares **and** presents automatically. Reopening without execution:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session "$DEMO_SESSION" --enable-actions --port 8765
# CLI alternatives to the supported web modes, on an intact fresh preparation:
bash implementacion/scripts/defense-demo.sh present \
  --session "$DEMO_SESSION" --auto --budget-seconds 120
bash implementacion/scripts/defense-demo.sh step --session "$DEMO_SESSION"
```

Automatic and step modes are alternatives, not replay instructions. The web API
uses its existing 120-second budget per invocation. Step invocations include fresh
checks and do not establish one continuous timed rehearsal.

## Full technical journey

Open **Recorrido técnico** in the main navigation or **Ver proceso completo** in
Demostración. The journey replaces the comparison; logs still open in the wide
main detail. **Detalle técnico** inside a detail remains specific to that operation
or attempt and links back to the full journey.

- **Mapa de controles** (`#journey/map`): the fifteen captured catalogue phases,
  in pedagogical reading order left-to-right/top-to-bottom. This is not a claim of
  chronological execution. Expand a phase for conditions, inputs, outputs, tool
  version files when captured, original log, attribution and receipt.
- **Secuencia ejecutada** (`#journey/sequence`): operation receipts in recorded
  order, including global preparation and conservation. NOT_REACHED notices remain
  visible but are explicitly not executed operations. Missing timestamps/durations
  stay unknown; nested observer intervals are not added to parent timings.
- Filter **Toda la sesión**, **Preparación**, a named arm/scenario/attempt, or
  **Conservación / cierre** when recorded. Mixed results are broken down, never
  turned green by a later recovery. Reused preparation links its actual origin and
  does not become another live operation. Multi-control receipts remain aggregate.

**Ver salida original** opens the selected operation's file directly, even without
an Fxx/Lxx scenario. **Volver al recorrido técnico**, Back and Forward restore the
filter, expanded phase, focus and reading position. Global details use safe receipt
identifiers (`#demo/operation/<sequence>/console`), not arbitrary filesystem paths.
The original file's metadata identifies its capture producer and source. Matching
bytes/source in an earlier receipt are labelled as an inherited copy and link to
that origin; this does not prove which operation originally created the bytes.
A copied test log never establishes a subsequent admission rejection.

Incomplete preparation displays a warning in both views and links its recorded
failed operation where available. Captured download/SBOM/scan logs are also linked separately when present;
their presence alone is not a diagnosis. The UI does not infer disk/network/trust causes
from an exit code. R's successful preparation cannot confirm G readiness. For
retained `rehearsal-06`, the data gives four G rows **No alcanzado**, 321.22 s of
preparation and no live measurement. These values are not hardcoded in the UI.

Read-only commands tested for the journey (free private loopback ports):

```bash
bash implementacion/scripts/defense-demo.sh serve --session rehearsal-01 --port 8771
bash implementacion/scripts/defense-demo.sh serve --session rehearsal-06 --port 8772
bash implementacion/scripts/defense-demo.sh serve --session f11-20261017t193938z --port 8773
```

Open the port privately in Codespaces and select Recorrido técnico, or append
`/#journey/map` / `/#journey/sequence` to that viewer URL. No new laboratory work
is started. The same hash navigation, filters and origin references work in the
self-contained offline HTML with included excerpts, zero API requests and no
execution buttons. Missing files remain missing. No logs are eagerly downloaded
when opening the map.

Proposed three-minute route (not a measured human rehearsal): 0–25 s, explain
recorded/live status, profile and preparation outside the interval; 25–65 s, open
the map and distinguish phases from execution; 65–110 s, filter F11 and open its
Conftest original; 110–140 s, return and show independent Kyverno/F13 and recovery
only in the selected profile; 140–160 s, return to comparison and state the scope;
20 s reserve. Use incomplete preparation to explain **No alcanzado**, never as a
successful blocking demonstration. This UI change does not rerun the lab.

## During the presentation

Choose an attempt name to pin it and open **Resultado**. Click a red blocking
segment to open its original console immediately. The result separates the actual delivery outcome
from confirmation of the expected scenario outcome. **Ver log del bloqueo** opens
the exact closed original control output; **Ver atribución** opens its result
receipt. Neither requires a terminal or another application. In **Consola**,
expand metadata for operation command/exit, timestamp, path, hash and redaction.
The operation/oracle exit is distinct from the tool exit in its command receipt.
Missing or corrupt evidence remains unavailable; no later inherited copy fills in.

Tracks express order, not elapsed-time proportions or percentages. A reused
preparation is labelled ↶ and never portrayed as a rebuild/signing pass in that
attempt. Multi-control operations are explicitly aggregate receipts, not invented
independent per-control successes. Red marks attributable rejection even when
**Bloqueo esperado** confirms the test. Integration failure is a separate error;
no observation, insufficient evidence, not reached and intentionally omitted R
controls have distinct labels. F11 concerns privileges; F13 concerns results.

The `defense` profile includes its prepared valid reference and separate F13
recovery. It does not claim privileged R execution or L06. `f11-comparison` has
four directed observations and no F13 attempt. Its F11 and L06 coverage is partial;
L06 is not a distinct-image L01 replacement. R exposure does not prove exploitation.
All these local observations use lane A, not GitHub OIDC lane B.

The detail uses the main area from the first click. **Resultado**, **Consola**,
**Evidencias**, **Detalle técnico** and **Alcance** share a compact header. Desktop
has a hideable 230-pixel attempt list; narrow/low-height layouts use an accessible
selector. Switching attempts retains the tab but clears evidence belonging to the
previous attempt. The console has readable 15-pixel text, line wrapping, copy of
the displayed content (explicitly labelled when an excerpt), full-file access and
expandable metadata. Its content is the single scrolling console region; other
tabs use normal document flow. There is no required “Ampliar” step.

**Volver a demostración**, Escape and browser Back restore context. Hash routes
such as `#demo` and `#demo/attempt/attempt-1/console?op=f11-early` work without a
server in exported HTML. Routes use known attempt/operation IDs and optional
allowlisted artifact IDs, never credentials or arbitrary paths. Back/Forward
preserve tabs, selected artifacts, reading positions, catalogue filters and open
technical sections. Missing artifact IDs are explicitly unavailable, with no
substitution. Folded technical headings retain scenario/tool/attempt blocker badges.
Multi-control receipts do not establish independent per-control successes. Files
are grouped and loaded lazily; a file or hash alone does not prove verification.

**Seguir ejecución en directo** is explicit. Manual selection pins the evidence;
provisional output never overwrites a closed selected log. Polling preserves the
selected attempt, tab, open technical sections, focus and console scroll. A missing
worker is shown as interrupted/uncertain until a final receipt exists. Disconnect
or action-authentication failure disables execution and marks displayed data stale.
A 202 response means accepted, not completed. Stop remains **Detención solicitada**
until the backend establishes the outcome; double-click starts are suppressed.

**Más acciones** on Demostración contains environment check, export and owned
cleanup. Preparation is under **Identidad y procedencia**. Read-only viewers hide
execution/mode controls, retaining navigation, evidence and available downloads.
Authorized sessions show their execution strip; active **Detener** stays in the
global header across views. Header and navigation reflow at high zoom.
The cleanup preview still lists its scope and requires confirmation. The server
provides action capabilities and rechecks gates; cookie, Origin, CSRF, fixed action
allowlist and session locks remain. Scenario data cannot supply shell commands.

## Explore without changing the bound session

Use the visible destinations; each replaces the main area while retaining
presentation selection:

- **Escenarios:** twenty discoverable IDs, search and type/family/availability
  filters, guarantee, definition diagram, actual observations, limits and a
  separate historical reference. No observation does not mean unimplemented.
  L06 availability comes from the captured operation definition; old snapshots
  and historical reviews are not rewritten.
- **Workflows GitHub:** separate imported observations from captured configuration; see the read-only capture procedure below. Missing imports remain unknown.
- **Sesiones:** at most 100 directory entries inspected, regular JSON
  metadata bounded to 2 MiB per entry, allowlisted summary fields, invalid entries
  isolated, no symlink traversal or archive unpacking. Another session offers
  opening instructions; it cannot retarget actions, artifact or download routes.
- **Detalle técnico completo** under **Identidad y procedencia**: session/attempt-filtered controls and receipts,
  including linked recovery events whose academic scenario is null.

## Resources and offline fallback

Keep the 4 CPU / 16 GB / **32 GB total** defense profile and existing resource
thresholds. This UI requires no environment rebuild, frontend build, browser
installation or additional cluster. Disk shown in the header is a recorded sample,
not a promise of current free space. Preparing checks real filesystems, inodes and
reserves. Never lower safeguards or delete retained evidence to make a check pass.

Export runs explicitly after the talk. Renderer asset hashes are separate from
evidence-source identity. New exports embed all renderer assets, captured context
and bounded excerpts (existing 2 MiB total excerpt budget; main control files
prioritized). The recorded page makes no API/network calls, cannot execute actions,
and retains hash navigation, full-height detail, tracks, filtering and badges. Full evidence remains in the
verified adjacent package. Existing exports remain immutable and retain their old
renderer. Local inventory is labelled as captured at export time.

```bash
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

## Proposed 160-second route, plus 20-second reserve

This is a narration proposal, **not a measured human rehearsal** or a new runtime
claim. Preparation, full export and general cleanup occur beforehand/afterward.

- 0–20 s: identify session, local trust and prior preparation; explain the four
  F11 comparison rows and the independent admission request.
- 20–60 s: start the supported comparison. Explain R exposure/withdrawal and the
  red Conftest boundary. If still running, describe only current observations.
- 60–100 s: select early F11; open **Ver log del bloqueo** and the two diagnostics.
  Switch to independent admission using the attempt list and show the Kyverno
  attribution. Return to Demostración without losing selection.
- 100–135 s: select legitimate L06, same image and partial scope. Point to the
  original state/HTTP evidence rather than inferring acceptance from a green icon.
- 135–160 s: open **Alcance**, show the source and recorded-export fallback.
- 160–180 s: reserve. If live execution cannot complete, explicitly switch to an
  already verified recorded export; do not present it as a live success.

Read-only GitHub capture is now available below. Remote dispatch, new workflows and Pages remain outside scope.

<a id="browser-controls-and-live-console"></a>
## Browser controls and live console

The compact strip identifies the bound session/profile, environment state and the
server-declared next operation. Automatic and step mode use the existing
coordinator. Choosing a mode or navigating never sends an action. Disabled actions
have a reason; Stop remains accessible in the global header during execution.
HTTP 202 means accepted, not completed. Source, boot, resource and sealed-readiness
checks remain mandatory. No session field is edited to revive consumed preparation.

**Consola en directo** opens `#demo/live` in the main area. It reads the server's
bounded, sanitized provisional tail (up to 8 KiB), observed worker state and output
modification time. Missing output does not establish a stopped worker. Missing
worker evidence does not establish continued execution. On disconnect, the output
is retained and state is labelled stale; actions stay disabled until refresh.

**Pausar seguimiento**, scrolling up and **Volver al final** control reading only.
Wrapping and copying refer to the displayed excerpt. A closed artifact inspected
elsewhere is never replaced. When the operation finishes, **Ver recibo y salida
final** opens its exact recorded operation. The provisional tail is not silently
promoted to a final result. Offline HTML is always recorded, with no actions or
polling. A synthetic UI fixture is not a live laboratory trial.

<a id="observed-github-runs-and-attestations"></a>
## Observed GitHub runs and attestations

Workflows separates **Resultado**, **Jobs y pasos**, **Evidencias**, **Atestaciones**
and **Configuración**. Imported captures are read-only and never retarget the
session's controls. Definitions come from the run's head SHA, not current main.
GitHub success/failure/cancelled/skipped states are observations, not inferred
scenario attribution. Original job logs are linked on GitHub; they are not
silently reconstructed from YAML or downloaded automatically.

Import one run through the CLI (no token is exposed to the frontend):

```bash
python3 implementacion/scripts/defense-demo/observations.py \
  --run 37202413477 --publication-summary
```

This tested example captures historical campaign source `895a3bd…`, attempt 1,
plus small hash-pinned published `analysis.json`/`report.json`. It consults asset
sizes before download. It does **not** retrieve the 117 MB run artifact, 1.4 GB
campaign package, images or Trivy databases. Integrity and association of these
summaries do not establish a full package audit or current cryptographic verification.
The paired table selects only the matching run; missing arm details remain unknown.
Primary timing runs from before service tests through Deployment CREATE return;
preparation, rollout, HTTP, packaging and cleanup are outside that interval.
GitHub job/run duration, billing and primary R/G timing remain separate.

For already-downloaded metadata, provide a directory with `run.json` (GitHub run
object including repository identity), `jobs.json` (`jobs` array wrapper), and the
workflow basename at that source revision:

```bash
python3 implementacion/scripts/defense-demo/observations.py \
  --run 37202413477 --from-directory /path/to/public-capture
# Optional: --pair /path/to/pair.json or --archive /path/to/small-public.zip
```

Local metadata is explicitly operator-supplied, without fresh GitHub authentication.
The importer accepts only this repository and its four workflow names. Local ZIP
inspection allows at most 128 MiB compressed, 32 MiB expanded and 2048 entries;
it rejects links, traversal, duplicate names and ambiguous summary basenames, and
copies only allowlisted public documents. It never applies archive paths or unpacks
a database. Each document is bounded to 2 MiB, each capture to 8 MiB; metadata
inventory reads at most 32 captures / 4 MiB. Preserve the 3 GiB disk reserve and
10,000 free inodes. Partial captures retain HTTP errors and unavailable definitions;
403/404 or absent packages are not successful verification. A successful plan-only
run is not a pair. Full local pair inputs use existing analysis contracts when
complete; failures remain visible. Capture directories are append-only under
`implementacion/evidence/raw/github-observations/`, excluded from Git.

**Atestaciones** shows documents supplied with the selected capture; their subject/type are unverified claims, not authenticated run association.
No hosted B bundles were downloaded for the initial summary example. Use
**Consultar atestaciones de la sesión local vinculada**, or **Identidad y procedencia
→ Atestaciones de la sesión**, for authentic retained local A examples. These belong
to that session, not the GitHub run. Image signature, SBOM, provenance and results
remain separate contracts. The view distinguishes presence, byte integrity,
historical cryptographic receipt and semantic authorization. Expand **Comprobar y
explicar recibos históricos** to read the recorded boundary/statement/gate, then
open the original bundle or verifier output. This is not a new cryptographic run.
Missing originals stay missing; a visible JSON/hash alone does not authenticate it.
Local keys do not establish hosted OIDC; R omits these Golden Path attestations.

Refresh the viewer after CLI import. Export captures the bounded metadata/excerpts
and includes captured originals in its package; navigation and filters make no
network requests offline. Large excerpts remain labelled, with full originals in
the package. Existing exports remain unchanged:

```bash
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
# After inspecting the concrete plan:
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

No workflow dispatch, rerun, publication, historical review changes or new campaign
is implemented. Human review and narrated timing of this change remain pending.
