# Local F11 comparison on a prepared laboratory

[Current defense guide](README.md) · [Browser controls and captured runs](demo-workspace.md#browser-controls-and-live-console)
The current interface uses [internal navigation and full-height evidence detail](demo-workspace.md); see its controls, original log links and proposed narration route.

This profile extends the existing defense coordinator, dashboard and five shared
modules. It compares one authorized image in lane **A**: R executes the two
privilege settings, G rejects them early, G rejects a separate directed UPDATE,
and a legitimate L06 template UPDATE succeeds. Every observation is new. R/G
selects controls; Codespaces does not establish GitHub OIDC or lane B.

**A real local comparison completed:** preparation took 423.02 s and the live
interval took 19.01 s on the observed 4 CPU / 16 GB Codespace. See the
[validation record](../../../registros/f11_comparison_validation_EN.md) for exact
source, preserved earlier failures and partial F11/L06 coverage. This single run
is not a performance guarantee. The full 160-second spoken presentation and human
review of subsequent changes remain pending; the user accepted the bounded PR
at `e675325`. A failed preparation provides no live comparison.

## Start and reopen

Use the optional `.devcontainer/defense/devcontainer.json` profile, which reuses
`implementacion/.devcontainer/Dockerfile`, its build context, locked Features and
tool versions. It requests minimums of 4 CPUs, 16 GB RAM and 32 GB storage.
`hostRequirements` is a minimum; rebuilding does not resize a Codespace. All three profiles request the same minimums; the optional defense profile also
forwards port 8765. They pin Docker CE 29.9.2. Run `make -C implementacion doctor`
before preparation to verify both CLI and daemon. Do not rebuild or restart during
a presentation.

From a new, correctly provisioned Codespace:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="f11-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf '%s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh prepare \
  --profile f11-comparison --session "$DEMO_SESSION" \
  --reserve-gib 3 --serve --enable-actions --port 8765
```

Save the printed session name. The server binds to loopback; open port 8765 in
Codespaces Ports with **Private** visibility. No public URL is generated here.
Preparation may take minutes and **does not start presentation**. It runs the
shared suite, infrastructure, one image build, real analysis, signature, SBOM,
provenance, results authorization, trust verification, policies, valid rollout and
HTTP. The node's existing digest is checked in its cache. No L01 replacement image
is built. F13's existing preparation still omits results. `up` retains its historical
prepare-and-present behavior; it is not a preparation-only command.

Reopen without executing laboratory operations:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session "$DEMO_SESSION" --enable-actions --port 8765
bash implementacion/scripts/defense-demo.sh present \
  --session "$DEMO_SESSION" --auto --budget-seconds 120
```

Omit `--enable-actions` for a read-only viewer. If changing an already running
viewer's mode, use `serve --stop-server` with the desired option. This restarts
only the verified viewer process, not the laboratory. `serve --session NAME`
reopens a session; it never implicitly prepares it. For a fresh session prepared
from the web, use `serve --new --profile f11-comparison --session NAME
--enable-actions --port 8765`, then **Prepare**. Each preparation/presentation
can be consumed once; a second rehearsal requires another session and preparation.
Do not edit internal JSON or reuse copied state after restart, rebuild or cleanup.

## Four observations and their scope

| Attempt | Actual operations required to confirm expectation | Scope |
| --- | --- | --- |
| R / warning | Restricted actor UPDATE in this run's reference namespace; Ready rollout, Pod privileges, digest, HTTP and withdrawal | Risk configuration executed, no exploitation or cluster-compromise claim. Kubernetes/RBAC remain. A PSA or other rejection fails this expectation and retains its original response. |
| G early / red | Real Conftest, exactly PRIVILEGED and ESCALATION, exit 1 and no incidental diagnostics | Stops this request before any API submission; preparation's earlier build already occurred. |
| G admission / red | Independent actor `replace`; exclusive `tfm-runtime/restricted-containers` denial; unchanged UID/generation/spec; valid HTTP and unchanged policies | F11 Deployment UPDATE only. CREATE and direct Pod operations are omitted: **partial F11**. |
| Legitimate / green | Conftest acceptance, actor template-annotation UPDATE, increased generation, rollout, updated Pods, same digest and HTTP | **L06 — legitimate update demonstrated; partial scope**. No direct Pod trial or full catalogue completion. |

R runs first and withdraws its altered workload before proceeding. Early and
admission requests have distinct identities; the admission request is not a
continuation of the rejected early pipeline. Namespaces/ownership labels and the
two fault fields have separate structured differences. The positive helper is
also called by the original complete runtime family; this profile does not run
F12 or increment the twenty-scenario denominator.

The four attempt rows distinguish **delivery decision** from **expectation confirmed**.
Errors and interruptions never become detections. Gray distinguishes not executed
from not reached. Exact logs are inert text, with bounded previews, complete-file
downloads, hashes, original/copy/redaction identity and command receipts. The
console retains its selection and output after completion. The attempt selector
also filters technical detail; preparation is folded separately.

Web controls are Prepare, Check environment, Run comparison, Next step, Stop,
Export and Clean owned resources. Action mode uses a session-specific HttpOnly
SameSite cookie and an independent CSRF credential held in memory, Host/Origin
checks, enumerated commands and session locks. `/api/health` is not authorization.
A closed tab does not stop or restart work. Stop targets the server-launched
coordinator and its owned process group. Timeout/forced cancellation is ABORTED;
inspect withdrawal receipts and run owned cleanup if withdrawal was interrupted.
There is no automatic successful retry or historical substitution.

## Resource custody

The F11 defaults are a 3 GiB custody reserve, 8 GiB before preparation, warning
below 5 GiB and 256 MiB conservative live-evidence growth. These provisional
operating margins are configurable with `--reserve-gib`, `--prepare-free-gib`,
`--warning-free-gib` and `--live-growth-mib`; they are not validated capacity
requirements and are never reduced automatically. Historical profiles retain
their original default reserve.

Filesystem observations use actual device IDs and retain aliases rather than
summing the same filesystem twice. The Docker root is recorded only for a visible
local daemon path. Unknown Docker storage is not attributed to another mount.
Resource receipts include free bytes/inodes (floor 10,000), CPUs, memory and
cgroups. Before/after samples and lightweight 10-second samples report the largest
**sampled** consumption, not an exact peak. Live execution does not run recursive
`du` or `docker system df`, rebuild, scan or fetch a database. Low reserve stops
new work and cancels the owned process; failure receipts and cleanup are exempt
from new-work thresholds. A small owned metadata reserve is released on ENOSPC.

Cleanup plans identify immutable container IDs, owner, reason and unknown size
where no reliable estimate exists. They reject replacement IDs and another
retained session's references. No generic directory collector, global prune,
image/cache eviction or evidence deletion is implemented. Container retirement
keeps private state, snapshots, receipts, exports, image caches and Docker volumes;
these retained resources mean reclaimed disk space is not guaranteed. An
unrecorded partial resource is refused rather than deleted by name alone.

```bash
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh check --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

Export estimates growth plus reserve before writing. It streams artifacts and the
identified F11 snapshot database, verifies hashes and includes the selected view,
all attempts and source identity. Sensitive material remains excluded. HTML says
**recorded execution** and has no execution controls. `verify` checks archive
integrity; original cryptographic receipts remain distinct. Keep `recorded.html`,
`evidence.tar.gz`, `manifest.json` and `SHA256SUMS.txt` together; independently run
`sha256sum -c SHA256SUMS.txt` in that export directory.

When export cannot fit, cleanup retains an export-pending receipt and can remove
only recorded owned containers while preserving originals. It does not require a
second archive before this recovery. A completed F11 cleanup leaves its new
cleanup receipts for a later explicit export, avoiding another automatic full
package. Failure status is preserved. Export/cleanup occur outside presentation;
R withdrawal occurs inside it.

## Three-minute narration and fallback

Use the [Spanish script](../../ES/defense/f11-comparison.md#guion-orientativo-160-segundos).
The uninterrupted timer starts before readiness and includes waits, evidence
closure and R withdrawal. The CLI's 120-second limit is an operational limit,
not the 90-second performance target. Separate `step` invocations are not one
continuous measured presentation. The recorded 19.01-second comparison includes
all five live operations; the 160-second narration remains an indicative script,
not a measured human presentation.

Open a verified `recorded.html` offline as an explicitly recorded backup. If no
real export exists, do not present a historical or synthetic PASS as current.
The bounded static fallback is:

```bash
bash implementacion/scripts/defense-demo/f11-static.sh
```

It uses a labelled synthetic manifest and real Conftest. It proves only the two
static diagnostics, not R execution, signatures, Kyverno, L06 or a live delivery.
No new economic, productivity, campaign or human-acceptance conclusion follows.
The user confirmed review/acceptance at `e675325`; later viewer/port changes have their own pending review.

For occupied ports and safe viewer reopening, see [the operations guide](defense-demo-operations.md#occupied-port-reopen-the-viewer-without-repeating-delivery).
