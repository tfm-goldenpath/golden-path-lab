# Local F13/F14 results trials

[Oracle](record.md) · [Español](../../../ES/cases/F13-F14/runbook.md)

The normal local demonstration now exercises post-issuance F13 and F14 on the
fully authorized `L01-update/` candidate, immediately after its normal results
issuance. Each trial runs fresh authorized CI, a separate directed admission
request, exact restoration, another fresh CI gate, restricted-actor admission,
rollout and HTTP probes for that same digest. Existing earlier trials still run;
this family does not claim to close their integration gaps.

## Prerequisites and exact commands

Use **Golden Path - implementation** in the devcontainer/Codespaces selector.
Do not launch the demo until `doctor`, smoke and the bounded BuildKit probe pass.
PR #26 recorded version and BuildKit DNS blockers, not F09/F10/L05 execution.
The first attempt failed the npm pin. The authorized retry installed npm 11.19.0,
but doctor now stops at kubectl v1.37.0 (required v1.35.8). Docker CLI/daemon report
29.8.0-1 (required 29.8.0), and Buildx is v0.37.0 (required v0.37.1). Only npm was
changed; host networking and the other tools were left unchanged. See the
[retry record](../../../../registros/f13_f14_results_authorization_EN.md#npm-correction-and-live-retry).

Run from the repository root after its owner resolves the environment. This
reuses the existing source pair for L05; the results trials themselves use the
same source and digest throughout each fault/recovery interval.

```bash
(
  set -euo pipefail
  export PATH="$PWD/implementacion/.tools/bin:$PATH"
  make -C implementacion doctor
  make -C implementacion test
  make -C implementacion smoke-env
  source implementacion/versions.env
  probe_dir=$(mktemp -d)
  probe_builder="gp-results-connectivity-$(date -u +%s)-$$"
  trap 'docker buildx rm "$probe_builder"; rm -rf -- "$probe_dir"' EXIT
  docker network inspect kind >/dev/null
  docker buildx create --name "$probe_builder" --driver docker-container \
    --driver-opt network=kind \
    --driver-opt "image=$(jq -r '.images.buildkit.reference' implementacion/tools.lock.json)"
  printf 'FROM %s\n' "$SERVICE_NODE_IMAGE" > "$probe_dir/Dockerfile"
  timeout --signal=TERM --kill-after=10s 60s docker buildx build \
    --builder "$probe_builder" --platform linux/amd64 --pull \
    --progress=plain --provenance=false "$probe_dir"
  GP_L05_FROM_COMMIT=7243334fe4ee7073801a86b25c90986b7d3c5ece \
  GP_L05_TO_COMMIT=fc58e220e2d3f38d13216b23e61ffc31271f112f \
  make -C implementacion demo
)
```

Stop on any failed prerequisite and retain its log. Do not repeatedly launch the
demo to diagnose the known network issue. The original [preflight diagnosis](../../../../registros/f09_f10_l05_integration_validation_EN.md)
remains valid as a record of that attempt; this change did not retest its network.

## Authorization and attribution

P1 is the trusted code configuration `golden-path-v1` in CI and Kyverno. A predicate
cannot select the expected policy. `laboratory-results-p0-fixture` is P0, a
laboratory preparation policy with the same mandatory successful checks. It is
not a historical production or regulatory policy. A named preparation function
uses the authorized run key to issue P0 with `--no-upload`; the later registry
actor only replays those unchanged bytes. These are responsibility boundaries
inside one trusted laboratory process, not separate security principals.

The starting P1 delivery must pass a fresh gate and admission server dry-run.
F13 removes its sole results manifest. F14 replaces it with the prepared P0 bundle;
no discoverable P1 referrer may remain. Blobs are retained solely for exact
restoration. Inventory isolation rejects P1 alongside P0, changed non-targets and
incomplete retrieval. Each CI call verifies the raw downloaded bundle bytes.

Only gate exit 42 with `MISSING_RESULTS` or `RESULTS_POLICY_VERSION_MISMATCH`,
complete retrieval and authenticated valid unrelated evidence supports attribution.
The latter also requires exact-bundle authentication and only
`RESULTS_POLICY_VERSION` among content violations. Invalid signatures, signers,
subjects, source, predicate, unsuccessful checks, multiple failures and retrieval
errors remain integration failures. Missing results are expected in the distinct
`before-results` phase. Normal issuance still follows successful mandatory checks.

Admission must report exactly `tfm-results` / `require-results` or
`autogen-require-results`. F13's generic missing-bundle diagnostic is attributable
only with the complete isolated inventory and authenticated unrelated evidence.
F14 requires the condition diagnostic `RESULTS_POLICY_VERSION`; a generic signature
failure, timeout, unexpected acceptance or an additional denial fails the trial.
The exact live F14 wrapper remains unvalidated until real admission runs.

## Evidence and recovery

Inspect `L01-update/F13-admission/` and `F14-admission/`: `before.json`, original
bundle, fixture predicate/bundle and authentication, `plan.json`, negative and
after-denial inventories, trust hashes, policies, controller cache arguments,
admission logs, attribution and recovery records. Fresh gate inventories, consumed
bundles, verification logs and decisions use `L01-update/CI-F13-admission-*` and
`CI-F14-admission-*`. `recovery.json` keeps original and restoration status;
`result.json` exists only after rejection and successful same-digest recovery.
Failures during recovery must stop the run. Shared infrastructure cleanup stays
with `demo.sh`; scenario traps restore only their owned fault and probe process.

The package includes these directories and the top-level F13/F14 completion
records. `F13Preissuance` identifies the unchanged preissuance/readiness-era
observation separately. Retained partial directories are `INCOMPLETE`; no directory
alone proves detection. Private keys and credentials remain excluded.

Offline checks can run without a cluster:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test
```

To retain the real offline P0/P1 probe bundles and diagnostics, set
`GP_BUNDLE_PROBE_EVIDENCE_DIR` to a new absolute directory before `make test-bundles`.
Only allow-listed public files are retained; the destination must not exist.
Offline predicates are labelled synthetic and do not authorize a delivery.

Local live boundaries and hosted negative trials remain **NOT_EXECUTED** in this
implementation handoff. Hosted normal delivery retains its trust checks and has
no new GHCR mutation permissions. Directed checks do not enlarge the twenty-case
catalogue or count as campaign measurements. See [actual verification](../../../../registros/f13_f14_results_authorization_EN.md).

For independent prerequisite checks, the existing suite and retained failure/database evidence, use [lane A validation](../../lane-a-validation.md). Its current local attempts stop at doctor; they do not close this case’s pending integration boundaries.
