# All demo families in one session

`defense-all` adds a combined profile without removing `defense`,
`defense-short`, `f11-comparison` or `early-security`. All attempts appear in
Demonstration and the technical journey. The viewer remains bound to this one
session; selecting a row only inspects evidence.

## Start

From the current checkout, use a new session and a free **private** port:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="all-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile defense-all \
  --reserve-gib 3 --enable-actions --port 8783
```

If occupied, choose another port; do not stop an unrelated viewer. Reopen with
`serve --session "$DEMO_SESSION" --enable-actions --port 8783`, without `--new`.
A prior profile or incompatible preparation cannot be converted by editing JSON.

## Browser procedure

1. **Preparar entorno** prepares the common defense laboratory before presenting.
   It deliberately leaves results authorization absent for F13. There is one
   kind cluster, registry, builder and baseline image.
2. In **Controles tempranos**, select F02, F12 or F03 and **Preparar caso**.
   F02/F12 also work before common preparation, without Docker/Kubernetes.
   F03 requires the common preparation: it builds the two existing vulnerability
   fixtures using its registry/builder and frozen database, without creating a
   second cluster, replacing the baseline digest or issuing results.
3. **Iniciar comparación** runs the main sequence; **Paso a paso** advances only
   the next permitted operation. Order: F11 early → F13 missing results → issue
   results → legitimate recovery/HTTP → defense F11 admission → validate
   authorized comparison inputs → controlled R/withdrawal → directed comparison
   F11 admission → legitimate L06 template update.
4. **Ejecutar comparación / Repetir comparación** in early controls separately
   evaluates the selected negative and positive inputs. These operations keep
   their own preparation, IDs and timings. They are not silently added to the
   main automatic sequence. F11 repeat buttons retain the existing defense
   behavior; the additional R/L06 sequence is single-use. Independent F13
   repetition still needs its separate fixture and additional capacity.
5. Click a blocking log or attribution to open the wide evidence view. Return to
   Demonstration to inspect another attempt. Export and owned cleanup remain in
   **Más**, with the existing preview and action protection.

The two admission F11 rows are **different new requests**, retained from the two
original profiles, with separate IDs and logs. Recovery never recolors F13.
L06 is a partial template UPDATE demonstration, not complete L06 or L01. Static
F12 is early-only; F03 is a new scan of prepared SBOMs. R establishes observed
risk admission/execution and withdrawal, not exploitation. Lane A is local-key
trust, not hosted OIDC.

## Resources, timing and fallback

Keep 4 CPU / 16 GB / 32 GB total disk. The common preparation uses the existing
8 GiB free-space safeguard and 3 GiB custody reserve; early work retains its
per-case growth checks. Do not lower margins to start. A failed common preparation
leaves its main attempts unreached; independently prepared F02/F12 remain usable.
Early failures retain their own command/result without replacing the common
laboratory outcome. Every subsequent runtime invocation still checks sealed
identity, source, boot, policies and resources.

Preparation and F03 fixture builds occur before the presentation. Main-sequence
wall time and early comparison times are separate; there is no measured claim
that all cases plus human narration fit three minutes. For a short explanation,
choose one early case, F13 recovery and one F11/L06 evidence view. A human rehearsal
remains necessary. The complete main sequence consumes its normal invocation
budget, including readiness and R withdrawal.

```bash
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

The exported HTML preserves all rows, navigation and available logs as recorded
results, with no executable actions. The retained database is separately required
for reanalysis; a readable export is not a new scan or cryptographic verification.
See the [combined validation record](../../../registros/demo_combined_profile_EN.md)
for actual observations and pending runtime acceptance.

## Unified case controls

The **Caso de la sesión** selector lists F11, F13, authorization/recovery,
R/G, partial L06, F02, F12 and F03 together. The selected initial operation
can run only when it is the coordinator's next step. Selection never starts
work or skips prerequisites. **Preparar laboratorio común** prepares the shared
laboratory; F02/F12/F03 have their own preparation buttons. After execution,
F11 supports a new independent attempt. R/L06 do not offer an unsupported
isolated repeat. Additional F13 fixture preparation is under **Más acciones**,
not the primary laboratory preparation control. The main automatic sequence
and independent early comparisons still retain separate timing and evidence.

### Current combined HTML limitation

With many artifacts, the HTML excerpt budget can omit early-control logs.
Read the original in the viewer or in `evidence.tar.gz`, checked by `verify`.
An empty excerpt is not evidence of acceptance or rejection.
