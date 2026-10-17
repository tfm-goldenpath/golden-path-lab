# Local visual defense demonstration

For the bounded four-card F11/L06 local profile, use [F11 comparison](f11-comparison.md). Historical runs below retain their original scope and resources.

[Español](../ES/defense-demo.md) · [Architecture](architecture.md) · [Delivery contracts](delivery-contracts.md) · [Readiness matrix](evaluation-readiness.md)

For prepared-session commands and what to preserve before increasing resources or changing Codespaces, see [Run the demo and preserve it when changing machines](defense-demo-operations.md).

This is a directed **lane A** demonstration: kind, zot and the laboratory's local key. Codespaces does not turn it into lane B. R/G selects the control configuration; A/B selects execution and trust. No remote workflow, publication, human acceptance or campaign sample is produced.

Use the supplied Linux AMD64 devcontainer, with Docker running. The existing Codespaces network helper may repair its documented kind-bridge forwarding conflict; its scoped rules are shared environment preparation, not a change to delivery policy. Diagnostic-container cleanup now waits a bounded interval for Docker removal to finish, without retrying or accepting a failed connectivity probe. The current implementation reuses the interfaces at `1ec4cb9e89fce412df90510b7f3b3f3ca03bb50f`; each session records the actual SHA, local changes and a separate hash covering lab source **and** the new adapters, catalogue, web assets, tests and configuration. It does not source `demo.sh` or invent `demo.sh local prepare`.

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion doctor
make -C implementacion setup-validation
```

Missing security/platform tools: inspect `scripts/install-security-tools.sh`, then use `PREFIX="$PWD/implementacion/.tools" bash implementacion/scripts/install-security-tools.sh --with-platform-tools`. It uses the existing pins and checksums; Buildx's plugin destination follows that installer's Docker configuration. Do not install latest or relax doctor. The documented devcontainer supplies pinned Node/npm/Docker. A host Docker/devcontainer installation uses the same commands and lane A trust.

## One command, or prepared presentation

Run from the repository root. Names must be new and contain lowercase letters, digits and hyphens.

```bash
bash implementacion/scripts/defense-demo.sh up \
  --session rehearsal-01 --profile defense --auto --port 8765

bash implementacion/scripts/defense-demo.sh prepare \
  --session defense-01 --profile defense --serve --port 8765

bash implementacion/scripts/defense-demo.sh present \
  --session defense-01 --auto --budget-seconds 180
```

`up` includes cold preparation and does **not** promise three minutes. Preparation runs the actual `make test` (environment, service/contracts, Python, Rego/Kyverno, local Cosign and static F01/F02), then the distinct delivery preflight, a new build, reference HTTP, manifest checks, real SBOM/vulnerability analysis, delivery signatures/gates and admission readiness. It leaves results absent. CI's checks run locally; this does not approve a GitHub PR. Any failed mandatory check stops preparation.

The default disk reserve is **1 GiB**, with **2 GiB additional headroom** before preparation and at least 10,000 free inodes. This is a local operating choice for the 32 GiB Codespace with cached kind/zot/BuildKit images, not a universal requirement or guarantee of build size. Increase `--reserve-gib` for larger artifacts. `df` and Docker usage are recorded before build/download stages and export. The Trivy download cache defaults to `/tmp/golden-path-defense-SESSION/trivy-cache`, on the separate temporary filesystem in this Codespace; the demo retains its separate identified DB snapshot under `/tmp/golden-path-defense-SESSION/snapshots/vulnerability-db-run-*` through the optional `GP_VULNERABILITY_SNAPSHOT_ROOT` interface (other callers keep their original `.tmp` default). Before analysis, `/tmp` must have 4 GiB available for the observed 1.6 GB cache and snapshot plus working margin. Preserve that snapshot separately for exact replay; the small DB identity travels in the evidence package, while database bytes are excluded by the existing packager. Cleanup does not delete snapshots or previous evidence. GitHub documents that `/tmp` survives a rebuild but **is cleared when the Codespace stops**, including a restart for a machine change: transfer retained snapshots beforehand. See the [preservation guide and its official source](defense-demo-operations.md). A disk failure is an error, not a control rejection; never solve it with global prune or deletion of unknown runs.

`present` validates source/configuration, boot identity, digest/tag resolution, local trust, registry/container identities, controller readiness, unchanged policies and actor permissions. It does not build, sign delivery evidence or repair missing infrastructure. Results issuance is a single live operation, never retried automatically. Two mutators cannot own one session, and two preparations cannot run simultaneously.

## Open and read the panel

Open **Ports** in Codespaces, forward `8765`, keep visibility **Private**, and open the forwarded URL. Locally use `http://127.0.0.1:8765`. The server binds only loopback and remains running after success or failure. Its availability does not change the work's exit code. Use another port for another live viewer, or stop the old session's server explicitly during cleanup.

The three views show the compact pipeline and separate attempts, technical controls/receipts and immutable evidence, and the twenty-case catalogue/workflow correspondence. Select a stage to open its receipts. An adapter exit 0 means its deterministic oracle confirmed the expected outcome; it does not mean a rejected Kubernetes request succeeded. The restricted-request receipts retain their own actual exit codes. Accepted and final runtime operations also retain fresh cluster/policy identity comparisons within the measured live interval. Live polling reports the last server read separately from the last closed evidence. Long-running output is provisional and has no final hash until closed. An unchanged completed run is not a disconnected viewer.

1. **F11 early:** set both `privileged=true` and `allowPrivilegeEscalation=true`; Conftest must return exactly the existing PRIVILEGED and ESCALATION diagnostics. This request does not reach protected admission/deployment. The image was already built/scanned during preparation; no claim that this request prevented that earlier work is made.
2. **F13 preissuance:** valid manifest, authenticated signature/SBOM/provenance, complete consistent inventories without results. Only `tfm-results/require-results` may reject CREATE; named NotFound observations before/after establish Deployment absence. A certificate, registry, API or evaluation error is not F13 detection. Recovery remains pending.
3. **DEMO_VALID_ACCEPT:** re-read the registry, authorize/sign/verify results, then admit the **same digest under the same policies**. Ready Pods, effective image and real HTTP must pass. This completes the linked F13 recovery; it is not full L01, which also requires a replacement digest.
4. **F11 admission:** a new restricted-actor UPDATE of the now-authorized workload must be rejected only by `tfm-runtime`. UID, generation and spec stay unchanged; HTTP remains available. This directed request bypasses only the rehearsal's early step, without disabling any product control.

`privileged` changes container privileges; `allowPrivilegeEscalation` controls gaining more privileges than the parent process. Neither grants the Kubernetes RBAC `cluster-admin` role. The actor remains restricted. The five actual policies are `tfm-runtime`, `tfm-signature`, `tfm-sbom`, `tfm-provenance`, `tfm-results`.

## Terminal control, time and failure

```bash
bash implementacion/scripts/defense-demo.sh status --session defense-01
bash implementacion/scripts/defense-demo.sh list
bash implementacion/scripts/defense-demo.sh step --session defense-01
# Alternatively, on a newly prepared session:
bash implementacion/scripts/defense-demo.sh present --session defense-01 --interactive --budget-seconds 180
```

`--auto` asks no notes or acceptance questions. Interactive mode pauses only between operations; the budget includes pauses. `step` runs the next operation, with fresh readiness checks; separate invocations are not reported as one continuous timed presentation. Ctrl+C or the deadline signals the owned process group, allows five seconds for termination, then kills remaining local children. The receipt is ABORTED, later operations are NOT_REACHED, and partial evidence remains. A Docker/Kubernetes request may have completed remotely before interruption; do not infer non-publication or repeat signing. Inspect the session, then explicitly clean it or start a new session. A changed boot makes continuous elapsed time unknown and invalidates preparation. SIGKILL leaves an interrupted RUNNING record; no operation can be replayed over it. Cleanup refuses a still-running owned worker.

Aim for **160 seconds including explanation**, leaving 20 seconds of margin. The final-source local rehearsal on 16 October 2026 measured **27.38 s live** and **713.80 s preparation**; see the validation record for the exact source, evidence and limits. This supports using the full profile here, not a guarantee for another environment. The measured continuous live interval includes readiness and evidence capture, not cold preparation. If a step stalls around 20 seconds, continue explaining; switch to a previously exported/grabbed recording before the budget is endangered. Never present a saved session as live. Explicit `--profile defense-short` (at preparation) omits the fourth attempt; it still requires F13 recovery and reports late F11 as unexecuted. Use it only with a clearly labelled real saved example of the omitted barrier. There is no automatic historical substitution.

Suggested three-minute narration (actual measured timings govern suitability):

- 0–25 s: “The image and its evidence were prepared. Lane A uses a local key. These are the exact source and digest.”
- 25–50 s: “F11 changes two container fields. Conftest blocks this request; it never reaches protected deployment.”
- 50–90 s: “F13 has other valid evidence, but no signed results. Only the results policy rejects it; no Deployment exists.”
- 90–130 s: “The deterministic controls revalidate and issue results. The same digest is now admitted and serves real HTTP.”
- 130–160 s: “A separate privileged update meets Kyverno. It is denied; the working Deployment remains intact.”
- 160–180 s: margin; open one original receipt or use the recorded backup. These are not human-effort or R/G campaign measurements.

## Export and cleanup

```bash
bash implementacion/scripts/defense-demo.sh export --session rehearsal-01
bash implementacion/scripts/defense-demo.sh cleanup --session rehearsal-01 --stop-server
# Now prepare defense-01 on the freed port. Never reuse the authorized rehearsal image for F13.
```

Export writes `implementacion/evidence/packages/defense-SESSION/export-NNNN/recorded.html`, `evidence.tar.gz`, `manifest.json`, and `SHA256SUMS.txt`. The HTML embeds UI/data and bounded excerpts, says **“Ejecución guardada; no en directo”**, and works without network. Keep the adjacent archive for full evidence; artifact IDs map to package paths in its manifest. Download both through the panel or Ports/file explorer and preserve a copy outside Codespaces. No video is fabricated or automatically recorded.

The original module files remain under `implementacion/evidence/raw/run-*`. Closed per-operation and per-observer copies, command logs and append-only receipts live under `implementacion/evidence/raw/defense-SESSION/`. `implementacion/.tmp/defense-demo/SESSION/session.json` is the final local session record; `lab-path.txt`, `ownership.json` and `server.json` are controller-private and never served. Private keys/kubeconfig are outside public evidence. A sanitized copy has its own hash and recorded original provenance. No hash establishes signature trust, semantic acceptance or human review by itself.

Cleanup first verifies exports using the existing laboratory packager and its exclusions, checks resource ownership, then uses the shared cleanup implementation and verifies absence. It retains a final export **after** its cleanup receipt; use the last `export-NNNN` and session record. A partial preparation with no laboratory has no invented laboratory package or removed-resource claim. Cleanup is explicit/idempotent; it never prunes global Docker resources or deletes evidence/DB snapshots. If retention or removal fails, cleanup is not confirmed. Work status/exit remains separate from cleanup success.

## Extension and verification

`scripts/defense-demo.sh` is the thin entry point. `scripts/defense-demo/coordinator.py` owns lifecycle/budget; `adapters.sh` reuses modules and scenario oracles; `core.py`, `observer.py` and `exporting.py` own receipts and custody; `server.py` is read-only. `demo/catalogue.json` describes stages/controls/scenarios and workflow facts are extracted from the actual YAML. `demo/index.html`, `style.css`, `app.js` render without CDN/build. The optional hook in `scripts/lib/attestations.sh` is inactive without `gp_observe` and keeps direct errexit behavior.

To extend: define the existing academic ID/boundary and human-approved oracle; add a fixed adapter ID to the executable allowlist and sequencing, implement its adapter using shared controls, add declarative metadata and tests, then run real integration. Never store shell commands in the catalogue. The server and renderer need no scenario-specific code. Document unexecuted boundaries; no new academic scenario is implied by DEMO_VALID_ACCEPT.

```bash
make -C implementacion test-defense
make -C implementacion test
bash implementacion/scripts/defense-demo/f11-static.sh
```

The separate fallback runs real Conftest against a **labelled synthetic manifest and placeholder digest**. It needs Node/jq/Conftest, no cluster. It proves no image build, signature, F13 or admission. If Kubernetes is unavailable, F13 can only be shown as a clearly identified saved real execution, or as unexecuted. Unit substitutes are labelled and never count as live acceptance. See the [local validation record](../../registros/defense_demo_validation_EN.md) for actual outcomes and remaining review.

To repeat a completed demo on 8765, see [run again on the same port](defense-demo-operations.md#run-the-demo-again-on-the-same-port): a new session is required; `serve` only reopens the viewer.
