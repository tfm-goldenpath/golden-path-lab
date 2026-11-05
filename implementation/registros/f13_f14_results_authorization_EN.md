# F13/F14 results authorization implementation

## Source and scope

Branch: `test/f13-f14-results-authorization`, created from current local main
`d758ef50bdeee57574c8b18330aef8d07a35abfe` (merge of PR #26). Changes remain in the
working tree for review. [Operational oracle](../docs/EN/cases/F13-F14/record.md)
and [exact commands](../docs/EN/cases/F13-F14/runbook.md).

F13 now has an isolated post-issuance trial removing only results. F14 legitimately
prepares successful `laboratory-results-p0-fixture` evidence, then replays its
unchanged signed bytes with `golden-path-v1` required and P1 unavailable. The
preissuance F13/readiness path is preserved and separately reported. The custom
versioned results predicate is retained without claiming full VSA conformance.

## Changed files and rationale

Paths below are relative to `implementacion/`.

| Files | Reason |
|---|---|
| `scripts/lab-contracts.mjs`, `scripts/ci-verification-gate.mjs` | Trusted P1, structured results failures, raw retrieved bytes authenticated before policy fields, complete unrelated-evidence checks before attributing absence or mismatch. |
| `policies/kyverno/render.py` | Require the same fixed P1 and emit `RESULTS_POLICY_VERSION`; reject configuration attempting to downgrade it. |
| `tests/scenarios/results.sh`, `tests/scenarios/results-evidence.mjs` | Separate P0 preparation/replay; isolated local mutation, strict attribution, recovery and same-digest L01 admission/rollout/HTTP. |
| `scripts/f07-signature-evidence.mjs`, `scripts/provenance-scenario-evidence.mjs` | Reuse the existing planned mutation/restoration implementation for both families with existing ownership/backup checks. |
| `tests/scenarios/l01.sh`, `scripts/demo.sh` | Schedule local trials after successful normal results issuance; retain hosted NOT_EXECUTED and separate F13Preissuance. |
| `scripts/package-evidence.py` | Preserve results trial directories, bundles, inventories, policy context and recovery observations. |
| `tests/unit/results-{authorization,evidence,scenario}.test.mjs` | Content, fresh gate, actual fault functions, OCI byte isolation, P1 masking, failures and interruption. Synthetic external responses are explicitly labelled. |
| `tests/unit/{l01-update,orchestration,packaging}.test.mjs` | Sequence, failure propagation, hosted compatibility and evidence retention regressions. |
| `tests/policies/test_render.py`, `tests/policies/test_results_conditions.py` | P1/diagnostic construction and real Kyverno engine evaluation of rendered field conditions through a labelled adapter. This does not exercise bundle retrieval or verifyImages diagnostics. |
| `tests/integration/bundle-crypto.sh` | Real offline Cosign P0 authenticity and policy rejection; optional retention of public probe evidence. |
| `TODO.md`, EN/ES `architecture.md`, `delivery-contracts.md`, `cases/F13-F14/{record,runbook}.md`, these EN/ES records | Operational oracle, commands, boundaries, observations and review handoff. |

## Verification evidence

Ignored evidence directory: `evidence/tdd/f13-f14/`. No generated evidence or
private material is added to Git.

- `01-red.log`, `02-scenarios-red.log`: initial tests preceded implementation.
  The first log reports failure without a detailed child diagnostic under the
  sandbox; the second records the missing helper module. These are limited
  initial observations, not proof of an earlier complete red/green cycle.
- `03-gate-green.log`, `04-scenarios.log`, `05-focused.log`, `06-focused.log`:
  development observations, including a missing decoder fixed while extracting
  shared mutation code and missing packaging coverage. `06-focused.log` has
  56 passing focused checks. Sandbox subprocess failures required an approved
  rerun; they are not scenario detections.
- `07-doctor.log`: unadjusted PATH lacks kind. `08-doctor-pinned-path.log`:
  existing pinned tool directory enabled; doctor stops because npm is 12.1.0,
  expected 11.19.0. No environment or host-network changes were made.
- `09-suite.log`: first shared run failed outdated orchestration fixtures that
  lacked the new stages. `12-focused-final.log` subsequently found the separate
  preissuance packaging fallback missing when an aggregate existed; fixed before
  the final suite. These unfavorable observations are retained.
- `10-policies.log`, `11-bundles.log`: successful policy and real offline Cosign
  runs, respectively. P0 authenticates, then fails the expected P1 policy check;
  wrong signer/digest fail cryptographic verification.
- `13-final-suite.log`: final `make -C implementacion test` with existing pinned
  security tools on PATH. The final result and counts are recorded below.
- `offline-bundles/`: retained synthetic P0/P1 predicates and exact bundles,
  replayed bytes, public key/root, artifact and raw P0 authentication/policy logs.
  This is an offline probe, not a registry delivery or admission observation.

No network failure occurred in these offline checks. No new live network probe
was launched after the version preflight failed. The earlier BuildKit DNS failure
remains an observation of [PR #26's attempt](f09_f10_l05_integration_validation_EN.md),
not a new measurement or a resolved prerequisite.

## Remaining boundaries

Local F13/F14 fresh registry CI, directed Kyverno admission, exact live restoration
and same-digest rollout/HTTP are **NOT_EXECUTED**. In particular, the exact F14
verifyImages error wrapper is an expected diagnostic, not a captured live result.
Hosted F13/F14 negatives are **NOT_EXECUTED**; no GHCR mutation permissions or
workflow dispatch were added. Normal hosted compatibility is covered by code and
orchestration regressions, not a new hosted execution.

F09/F10/L05 integration gaps from PR #26 remain open. Directed fault checks are
linked observations of the existing academic cases; no extra scenarios or campaign
measurements are claimed. The shared Bash process separates responsibilities but
does not isolate the preparation producer from the registry actor as security
principals. Trial snapshots assume a controlled publisher and are not atomic.

## Contribution and proposed PR

| Activity | Actual AI assistance | Human review | Final decision |
|---|---|---|---|
| Oracle, implementation, regressions, offline verification and EN/ES documentation | OpenAI Codex, GPT-6 | Pending | Pending |

**Proposed title:** `test: cover F13/F14 results authorization and recovery`

Add isolated post-issuance F13 removal and authentic laboratory P0 replay for F14.
Fresh CI attributes absence or policy-version mismatch only after validating
unrelated evidence; Kyverno requires the same P1 with a specific diagnostic.
Retain exact-byte recovery, same-digest L01 controls, preissuance F13, complete
trial evidence and hosted negative NOT_EXECUTED status.

Validation: shared environment/unit/policy/offline Cosign suite; actual scenario
functions tested with synthetic external responses; real P0 signing and verification.
Live trials blocked by npm pin mismatch, with the earlier BuildKit DNS gap retained.
F09/F10/L05 gaps remain open. Codex GPT-6 assisted; human review and acceptance pending.
No push, PR publication, remote dispatch, release/campaign changes or thesis edits.

## Final verification result

`13-final-suite.log`: exit **0**. Environment tests **6/6**; service/unit tests
**717/717**, no skips; Python policy tests **33 passed** (including renderer tests
also discovered through the condition adapter); **52/52** Conftest decisions;
**9/9** runtime Kyverno checks; real-file policy checks **18/18** and **14/14**;
all **33** offline Cosign probe steps passed. The condition adapter additionally
ran **16** real Kyverno evaluations of valid/invalid results fields within the
Python tests. These counts describe software checks, not catalogue executions.

Command used from the repository root:

```bash
PATH="$PWD/implementacion/.tools/bin:$PATH" \
GP_BUNDLE_PROBE_EVIDENCE_DIR="$PWD/implementacion/evidence/tdd/f13-f14/offline-bundles" \
make -C implementacion test
```

The destination above now exists and preserves this run; choose a new absolute
path for a later probe. Final source hashes, documentation checks and public probe
hashes are in `evidence/tdd/f13-f14/14-source-hashes.json`, `15-doc-review.log` and
`16-offline-audit.json`. The source manifest identifies the uncommitted implementation
on the recorded base; no scenario run ID or delivered image exists for this handoff.

## npm correction and live retry

Following the user's explicit request, npm was changed globally from 12.1.0 to
**11.19.0** using `npm install --global npm@11.19.0 --ignore-scripts --no-audit
--no-fund`. Installation and subsequent `npm --version` succeeded. There was no
network issue during the download. Repository version pins were not edited.

The fresh `make -C implementacion doctor`, with existing pinned tools on PATH,
stopped at **kubectl v1.37.0**, expected **v1.35.8**. Additional read-only checks
confirmed Docker CLI/daemon **29.8.0-1** versus **29.8.0**, and Buildx **v0.37.0**
versus **v0.37.1**. Node and kind match their pins. Only npm was authorized for
version correction; the other tools and host networking remain unchanged.

The retry therefore remains **BLOCKED_BEFORE_LIVE_TRIAL**. Smoke, BuildKit network
probe, F13/F14 injection, admission and same-digest recovery are **NOT_EXECUTED**.
The previous BuildKit DNS failure has not been retested. No new demo run ID or
scenario detection exists; prior test and source-hash evidence remains unchanged.

Diagnostics are retained under `evidence/raw/f13-f14-live-retry/`: npm installation
log, doctor log, effective versions, explicit blocked result and a checksum
manifest. This follow-up changes the installed npm and documentation only; the
successful implementation test suite above was not rerun. Codex GPT-6 assistance
continues; human review and acceptance remain pending.
