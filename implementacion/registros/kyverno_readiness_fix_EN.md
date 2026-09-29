# Kyverno admission readiness correction

Branch: `fix/kyverno-admission-readiness`, based on merged `main`
`df376debc2d81cd8057569f63f216a94f5c22424`. Changes are uncommitted.
Actual assistance: Github Copilot (GPT-6). Human review and final decision: **pending**.

## Failure and bounded acceptance

Both attempts of hosted run [36636319864](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36636319864)
failed after controller restart, at F13, with a 30-second mutating-webhook timeout.
Builds and native provenance issuance succeeded. The strict F13 classifier
correctly refused to attribute the transport error to missing results.

The previous readiness change was insufficient: rollout success and Ready policy
objects did not establish a responsive admission path. Deployment-based log
selection picked the old controller Pod in both attempts. The second artifact's
saved startup log contains that Pod's shutdown, rather than the replacement's
request-time diagnostics. Restart is implicated; the replacement controller's
internal timeout cause cannot be established from these incomplete diagnostics.
The earlier review record remains historical, not proof of hosted compatibility.

Acceptance for this correction: do not restart at initial installation; preserve
cache refresh for actual revision updates; require current Ready controller Pods
and matching Service endpoints; collect explicit Pod logs; require a real server
admission response before trials. Keep the existing F13 oracle, policies, tool
pins, cryptographic requirements and failure attribution unchanged.

## Implementation and evidence

- `lab_install_admission` explicitly selects initial installation. L05 uses the
  update path, which retains a restart between legitimate revisions.
- `check-admission-controller.mjs` validates observed Deployment generation,
  current ReplicaSet ownership/revision, non-terminating Ready Pods and ready
  EndpointSlice targets/addresses at port 9443 in this single-stack laboratory.
  Stale endpoints are pending; malformed inputs and API errors are failures.
- The wait retains at most 30 observations with two-second intervals. Logs come
  from the selected current Pods. Policy UID/generation/spec checks remain.
- Restricted-actor server dry-run checks the actual protected workload. Initial
  installation requires the existing singleton missing-results reason. Updates
  require legitimate acceptance with already-issued results. A dry-run does not
  deploy a workload or count as a scenario result. Errors are not retried.
- Cleanup captures Pods, EndpointSlices and named-controller-Pod logs after the
  failure, preserving evidence even when startup checks never completed.
- The initial preflight reuses the strict classifier defined by `f13.sh`, loaded
  by the coordinator before lab execution; no scenario oracle was weakened.

Ignored development evidence: `evidence/raw/kyverno-readiness-fix/`.

| Check | Observed result |
|---|---|
| `01-red.log` | Sandboxed subprocess failure; not meaningful TDD evidence. |
| `02-red.log`, before implementation | Seven existing checks passed; four new behavioral assertions failed (initial restart, wrong log target, two timeout paths). The new validator test file also failed to import its not-yet-created module; that is separate from the four assertion failures. |
| `03-green.log` | All 21 focused tests passed after implementation. |
| `04-unit.log` | All 636 service/unit tests passed; scenario classifiers, orchestration and packaging retained. |
| `05-focused.log` | All 28 final focused tests passed, including real shell wait orchestration with synthetic API responses, convergence/exhaustion, transport/malformed observations, unexpected acceptance and multiple-policy denial. |

These are synthetic Kubernetes responses, not real admission coverage.

The fresh local attempt **`run-mlqMo9Oq` failed before image build completed**:
BuildKit could not resolve `registry-1.docker.io` through `127.0.0.11:53`.
Preflight passed **643/643 final service/unit checks**, Python/Conftest checks,
and cluster creation completed. The new admission gate was **NOT_EXECUTED**.
This repeats the known local infrastructure blocker; it is not a policy rejection
and does not demonstrate that the hosted timeout has been resolved.

Evidence: `06-demo.log`, `evidence/raw/run-mlqMo9Oq/` and
`evidence/packages/run-mlqMo9Oq.tar.gz`. Archive SHA-256:
`96e8b553b7de9daf9757ff8a68df06fe2b430011479b7cbf052a74f7b308a06d`.
The checksum and **15 internal hashes** verified (`archive-audit.json`). Cleanup
completed with no Docker containers remaining. No firewall/daemon changes were made.

| Retained log | SHA-256 |
|---|---|
| `02-red.log` | `088801be49f040d53d4ecd6c948f29362c2ca94cec115a80f6d8f50df079ac6f` |
| `03-green.log` | `36e4387d10814f2257cbcfed820502d66c312b44a951797f7b124b46f870eb1c` |
| `04-unit.log` | `50ccf8193872f77000cda6808c24a6d169b90293ac2af03b748c7bcd6165b414` |
| `05-focused.log` | `eb4db3b3af250ebab688aa0f975da9523d8290f648d9ae82b4714c0c82731118` |

Bash syntax, local Markdown links and `git diff --check` passed. Final source and
log manifests are retained as `source-files.json` and `log-hashes.json` in the
ignored development evidence directory. The full crypto/policy suite was not
repeated: policy/signing code and tool pins did not change. No push, commit,
remote comment, workflow dispatch, repository setting or thesis change was made.

## Proposed PR description

Initial hosted delivery timed out at F13 immediately after an unnecessary
controller restart. The readiness check could also read logs from the terminating
Pod. Keep initial installation running, refresh only for revision updates, require
current Pod/Service convergence, capture logs explicitly and exercise admission
with a server dry-run before scenarios. Preserve strict policy attribution and
all trust requirements.

Validation: service/unit suite and focused readiness regressions pass. Actual
hosted confirmation must use the fix revision; the two failed runs cannot prove
this correction. Human review and acceptance remain pending.


| Activity | AI contribution | Human review | Decision |
|---|---|---|---|
| Readiness fix, regressions, diagnostics and EN/ES documentation | Github Copilot (GPT-6) | Pending | Pending |
