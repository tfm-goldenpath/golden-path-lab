# Early security comparisons

[Español](../../ES/defense/early-security.md) · [Defense index](README.md)

`early-security` is independent of `defense` / `defense-short` / `f11-comparison`.
It reuses their action supervisor, source guard, command identities, evidence
inspector, technical journey and offline exporter. It does not extend the initial
F11/F13 sequence or the twenty-case academic catalogue. Spanish UI uses **informe**
for the structured execution record (formerly “recibo”); original file names and
historical records are unchanged.

## Start before the presentation

Finish source changes first. On the 4 CPU / 16 GB / 32 GB Codespace:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="early-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf 'Session: %s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile early-security \
  --reserve-gib 3 --enable-actions --port 8782
```

Use a free port and keep its Codespaces visibility **Private**. Reopen with
`serve --session "$DEMO_SESSION" --enable-actions --port 8782`, without `--new`.
Without actions the viewer only inspects evidence. No browser switch elevates
permissions. Generic `up`, `prepare` and `present` are deliberately unavailable
for this profile: use its enumerated per-case actions through the web.

Select F02, F12 or F03 in **Demostración**, then **Preparar** before the talk.
Each case has independent readiness. F02/F12 need pinned Conftest and Node, inert
inputs and unchanged source; neither invokes Docker nor Kubernetes readiness.
F03 needs Docker, an owned registry/builder, actual images/SBOMs and Trivy's
identified frozen database. It creates no kind cluster and installs no Kyverno.
The shared build, scan, schema/association validators and scenario oracles remain
the authority. F03's preliminary checks are preparation, not live execution.

The resource guard keeps at least 3 GiB plus a provisional growth allowance:
2 GiB for F03 preparation, 64 MiB for static preparation/evaluation. F03 also
checks 4 GiB and 10,000 inodes in `/tmp` for the database/cache. These are operational
margins, not capacity guarantees; actual filesystems may share storage. The
coordinator samples free bytes/inodes every ten seconds and stops new work on
exhaustion. Failure reports remain writable. No automatic pruning is performed.

## Operate from the browser

1. Select a prepared case and click **Ejecutar comparación**. The negative and
   positive are separate observations linked by a comparison ID. The wide live
   console follows the supervised command; pause following to inspect older output.
2. On completion, inspect **Ver log del bloqueo**, **Ver atribución**, or
   **Evidencias**. A red block with “expectativa confirmada” means the intended
   rejection was established; an integration error is not detection.
3. **Repetir comparación** creates another pair of attempt IDs and original files.
   Prior attempts remain readable; there is no evidence reset. **Detener** uses
   the existing bounded process cancellation. Inspect its final status.
4. **Recorrido técnico** retains all fifteen pedagogical stages, but only recorded
   operations establish results. No downstream signature/admission/deployment is
   implied. Preparation reused by an attempt links its original operation.

| Case | Controlled change and exact evidence | Scope |
|---|---|---|
| F02 | SHA-pinned inert workflow → mutable Action tag; production Conftest, exact `ACTION_SHA`, positive acceptance | Static workflow validation; never executes the unsafe workflow, not L01 or branch protection |
| F12 | Identical static manifest, digest → tag; production Conftest, exact `DIGEST`, positive acceptance | Early F12 only; the example image need not exist, no signing or admission, not full L06 |
| F03 | Actual minimist 1.2.5 / 1.2.8 images and original CycloneDX SBOMs; fresh Trivy reports against one frozen database, production vulnerability policy and existing target/association validators | Target CVE/severity/fix must match the oracle; repaired input must pass the entire HIGH/CRITICAL threshold. Not L02, no signing/results/deployment |

F03 evaluates **a new Trivy scan of an original SBOM from a previously built real
image**. The image/SBOM are not rebuilt during a click. Database identity is checked
before/after; the snapshot is reused without a full copy per attempt. If current
advisories invalidate either fixture, preparation fails honestly and preserves its
diagnostics; F02/F12 remain usable. A failed preparation needs a new compatible
session for that case. Do not edit source, inputs, session flags or frozen reports
to obtain acceptance. Fresh source requires fresh preparation.

## Preserve and close

Use **Más → Exportar** after the comparison. The self-contained HTML is recorded
and has no executable controls or network dependency. The package includes the
original control reports and prepared SBOMs, with hashes; the large database remains
retained at its identified preparation path, not duplicated per export. Export
verification checks package integrity, not a new scan or cryptographic verification.

```bash
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

Cleanup uses the existing immutable-ID/label ownership checks for this session's
containers. Evidence, database snapshots, unrelated resources, image caches and
volumes are retained. Do not run global prune commands.

## Suggested 160-second narration, not a measured human rehearsal

0–20 s: identify source/profile and declare preparation outside the talk.
20–55 s: run F02, explain the mutable reference and open its exact Conftest output.
55–90 s: run F12, compare digest/tag and return from the log to the overview.
90–140 s: run F03, explain prepared SBOM versus fresh scan, target CVE and repaired
whole-policy acceptance. 140–160 s: show attribution and the recorded offline
backup; explain absent downstream controls. Leave 20 s reserve. Use the explicitly
recorded backup if a live operation fails or is too slow; never substitute it
silently. Automated timings and navigation are separate from human narration.

[Execution record and remaining validation](../../../registros/demo_early_security_EN.md).

[Combined profile: all demo families in one session](combined-profile.md).
