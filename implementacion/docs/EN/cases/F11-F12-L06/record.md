# F11 / F12 / L06 runtime operations

The [manual task procedure](../../manual-task-calibration.md) reuses the coordinated
F11 privilege alteration in independent lane A R/G tasks. Completion retains the
existing explicit-false manifest contract, unchanged image and functional checks.
Its synthetic instrumentation tests add no human calibration or live acceptance;
the historical runtime observations below remain separate.

## Human-review mechanism follow-up

After PR #40 merged at `f5eb8dd528b1b26a49f31cf81915963e0bb166c8`, the
[explicit review mechanism](../../manual-task-review.md) separates technical
completion, human decision, assistance, purpose and calibration eligibility.
At the initial handoff, the retained F11/G task, cleanup evidence, original archive
and three text review notes passed a read-only integrity check. No new human review
was recorded on the person's behalf; legacy notes were not automatically imported.
The later explicit reviews below establish human use of the command. Both attempts
remain excluded from calibration-limit selection; six eligible calibrations remain
pending.

The user reported downloading the handoff below. Its local download copy was
removed on request; original task/run evidence and review notes remain available.
External verification of the downloaded copy remains the user's responsibility.

## Human validation of PR #41, 2026-10-03

Francisco supplied the terminal results and explicitly confirmed human review.
He recorded two separate `accepted` reviews with `purpose: rehearsal`; a read-only
audit of the retained files confirms both effective decisions. This establishes
live use of the review mechanism and the demonstrated F11/G functional rehearsal.
It does not establish six eligible calibrations or overall pilot acceptance.

| Task / session | Task source | Review time (UTC) | Effective decision / eligibility |
|---|---|---|---|
| `task-b069656237fc` / `calibracion-54b7fa8-01` | `54b7fa8864291aa86ddd32aaf15b5f2da71b5856` | `19:12:29.046453` | Accepted rehearsal; ineligible |
| `task-c861ec432f94` / `calibracion-pr41-01` | `81fc08aa4d563e8796564c139361a84f17fd0947` | `19:36:42.016925` | Accepted rehearsal; ineligible |

Both records have `technicalStatus: COMPLETED`, completed cleanup and effective
`humanAcceptance: accepted`. Their original sealed acceptance remains `pending`.
Review files remain under each session's `reviews/<task-id>/`; their SHA-256 values
are, respectively:

- `0af6ee2a94011a24d02ab38715cbd9f9f4d68f6c8c36bd4926bd4bd885625f53`.
- `f6526132e42b2d1fabd3a0f948534fabc8978d93333103100c4068253b33f366`.

**Declaration discrepancy retained:** both reviews declare `assistance: none`.
The older task's preserved notes establish AI guidance; the newer review's own
rationale mentions AI guidance and example notes. These declarations do not
establish unaided work. No field was corrected on the reviewer's behalf. The
effective exclusion reason is `purpose:rehearsal`; this live observation does not
demonstrate exclusion through `assistance:ai`. The person must resolve the
discrepancy through an explicit `review --supersedes` if revising the declaration,
preserving the first review and explaining the correction.

### New F11/G rehearsal

`task-c861ec432f94` used lane A, run `run-qwxVqqLS`, on the source above, including
the local PR #41 fixes. The remote PR still pointed to `21be955` when this
confirmation was documented; the newer local source had not been pushed.

- `0002-start` detected exactly ESCALATION and PRIVILEGED. A manual manifest tool
  invocation and two correction-start events are retained.
- `0004-check` records `VALIDATED_COMPLETION`; retained receipts report verified
  image/SBOM/provenance/results evidence, rollout and functional health/version/
  quote success. Before/after namespace and policy snapshots match.
- `0005-cleanup` exited zero and records absence of the owned cluster, registry,
  builder and private state. The user's later `wait` was rejected because the
  attempt was closed; no wait event was appended and the completed timer stands.
- The audit verified 50 final task hashes, event/receipt links, archive association,
  outer checksum and 261 internal hashes. It inspected receipts without rerunning
  a task or replaying cryptographic verification. Original archive SHA-256:
  `9fc4e55f39911ad3d5c51d431e63d22088f6cbbd674f8e0d042300ba0f1aa9be`.

| Recorded interval | Seconds |
|---|---:|
| Total | 414.302996476 |
| Detection latency | 13.162436636 |
| Resolution since detection | 401.140559840 |
| Active diagnosis | 6.739745353 |
| Active correction | 282.727155849 |
| Waiting | 65.626408429 |
| Automatic path | 13.172533006 |
| Unobserved | 46.037153839 |
| Verification (included in waiting) | 45.149897024 |

These times remain excluded from calibration-limit selection and measured-task
analysis. The user's coverage output shows zero eligible attempts for every
F03/F10/F11 × R/G combination; `freeze` refused to proceed. The retained plan
still has all three limits unset and `limitsReview: null`. No limit was selected.

The supplied transcript reports successful preflight, 33 review regressions,
36 controller regressions, six session-helper cases and 14 optional validation-kit
tests. Those tests are synthetic and add zero human observations. This documentary
update checks retained evidence and links; it does not rerun those suites.
Audit: `evidence/measurements/pr41-human-review-confirmation-20261003/`.
Retain/download the new review sidecars alongside both original tasks and archives.
Any source change, including documentation, requires a new plan and new tasks for
formal calibration; do not rewrite this session's source identity. Assistance:
OpenAI Codex audited and documented Francisco's decisions; it issued no review.

## Guided functional rehearsal reviewed 2026-10-03

Francisco accepted `task-b069656237fc`, session `calibracion-54b7fa8-01`, as a
**guided functional rehearsal** at `2026-10-03T12:28:23Z`. His preceding review at
`12:27:20Z` explicitly excludes calibration-limit selection because AI guidance
and example activity notes influenced the session. All three review notes remain
preserved unchanged. This acceptance covers the rehearsal; PR #40, scenario
readiness and overall pilot acceptance remain separate human decisions.

- Source: `54b7fa8864291aa86ddd32aaf15b5f2da71b5856`; lane A, F11/G;
  run `run-2g86oSnT`.
- Image: `sha256:98a5ab3ca3f75baeecd2c044f63dc650082d53c348d077bdfe03703c717a9c76`.
- `0003-check` correctly rejected the retained prohibited settings.
  `0004-check` accepted the two allowed changes and validated signed evidence,
  admission, ready Pods on the same digest and health/version/quote behavior.
  `0005-cleanup` completed; the sealed task status is `COMPLETED`.
- Post-run audit verified 52 task hashes, six event-evidence hashes, the original
  archive and 263 internal hashes, all four completion bundles with the existing
  lane A public-key profile, source/database identity, rollout/HTTP evidence and
  unchanged namespace/policy snapshots. No live task was rerun for the audit.

Raw recorded times: detection 11.917898082 s; total 552.442976361 s; resolution
since detection 540.525078279 s; unobserved 450.854366486 s. These are retained
observations, **excluded from calibration-limit selection and measured analysis**.
An investigation event before start was rejected; a later diagnosis description
was labelled correction, and wait/pause notes used example text. Zero recorded
active diagnosis does not establish zero actual diagnosis. Denominator here:
one functional rehearsal, zero eligible calibration results, zero measured tasks.

The original task and completion snapshot still contain `humanAcceptance: pending`.
The initial handoff used separate human text notes and left an explicit review
action pending. PR #41 implements that action; Francisco's later review above
updates displayed acceptance while preserving these sealed originals and notes.

Evidence copies and audit: `evidence/measurements/manual-review-task-b069656237fc/`.
Download all files under `evidence/packages/manual-review-task-b069656237fc/`,
including the preserved calibration database, and verify `SHA256SUMS.txt` outside
Codespaces. Original archive SHA-256:
`4d6963b8cb3d90c89f91a1c44841e348443a242aa940d0022dc8befbadac5472`.
The user subsequently reported downloading this handoff; external verification
has not been independently performed. Raw records and private material are not
committed to Git; the handoff excludes private keys and kubeconfig.

Assistance: OpenAI Codex audited retained evidence and documented the user's
review. Guidance during the rehearsal remains declared; no human decision or
measurement was generated by the audit.

## Manual calibration observation, 2026-10-03

Task `task-a400cfbcaa31`, session `calibracion-red-01`, source commit `29f099f`
with the locally recorded working-tree identity, ran F11/G in lane A. Its
`0004-check/check-result.json` records `CORRECTION_REJECTED` in phase `manifest`;
the linked evidence contains exactly the expected ESCALATION and PRIVILEGED
diagnostics. The controller correctly retained `REVIEW` until explicit cleanup
closed the unresolved attempt as `INCOMPLETE`; cleanup completed. The human event
notes retained literal command examples. They do not establish actual diagnosis
or correction work, and this attempt does not establish successful calibration.

The subsequent CLI change prints `CORRECTION_REJECTED`, the continuing `REVIEW`
state and the receipt path explicitly. EN/ES instructions separate human editing,
verification and cleanup. Controls and original task evidence are unchanged;
no live task was rerun for this feedback change. Human acceptance remains pending.

## Current hosted status (supplied review, 2026-09-30)

The user reports successful [hosted run 36768108684](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36768108684)
for the runtime increment merged at `eed5aad2828a7156e4c49bf2e2f3d9c2b0476137`.
Their reviewed package contains 449 verified internal hashes, eight authenticated
original/replacement bundles, attributable F11/F12 rejections and successful L06
checks. This review was supplied by the user; it was not independently repeated
in the vulnerability increment. Local validation remains pending. F09/F10/L05
and F13/F14 live-integration gaps remain open. The original handoff below retains
its historical NOT_EXECUTED observations; shared L01/L06 adds no scenario count.

## Original handoff record

The [operation matrix](operations.json) was defined before implementation from the
user's requirements on main `d86465410d74e39ef8e77a9979995bcb268abf9a`.
These are operational records for existing academic identifiers. No thesis
revision was reviewed or changed. Human oracle review and final acceptance remain
pending. Shared L01/L06 observations do not increase the twenty-scenario count.

| Case | Starting input and controlled alteration | Early oracle | Admission oracle |
|---|---|---|---|
| F11 | Authorized digest; set `privileged=true` and `allowPrivilegeEscalation=true` together | Exactly `PRIVILEGED: quotes-node must declare privileged=false` and `ESCALATION: quotes-node must declare allowPrivilegeEscalation=false` | Only `tfm-runtime` / `restricted-containers` (Deployment `autogen-` form); pattern mismatch at `/securityContext/privileged/` or `/securityContext/allowPrivilegeEscalation/` |
| F12 | Change only image reference to the exact original build tag persisted as `buildTag` | Exactly `DIGEST: quotes-node requires an image pinned to a sha256 digest` | Only `tfm-runtime` / `authorized-image-repository`; exact `validation failure: IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest` |
| L06 | Same authorized image; normal L01 creation, then harmless template annotation change | No denials | Admission succeeds, generation increases, only selected template annotation changes, rollout completes, Ready Pods retain expected digest and annotation, HTTP checks pass |

F11 is a **coordinated two-field change**: baseline
`allowPrivilegeEscalation=false` conflicts with `privileged=true`. The fixture
remains Kubernetes-valid and uses the harmless service, without host access or
exploit code. Its reference-namespace server dry-run establishes API shape only;
protected comparisons remain in `tfm-golden`.

The actor can create/update workloads through the existing restricted service
account. It cannot change policies, trust or namespace protection. No privileges
are added. All trial requests use `actor`; `k` observes resources and removes the
owned direct positive Pod. The main coordinator owns infrastructure cleanup.

## Sequence and state oracle

1. Prepare Deployment and isolated Pod inputs, diffs and exact structured Conftest
   results. Hosted preparation preserves these and the original tag in run state.
2. Preserve existing preissuance F13 and normal results issuance. After any F07
   restoration, authenticate the original backing digest with a fresh authorized
   CI gate. Snapshot live policies and namespace identity/protection.
3. Submit F11/F12 Deployment CREATEs while `quotes-node` is absent, plus isolated
   direct Pod CREATEs (`runtime-f11`, `runtime-f12`). Require named `NotFound`
   responses before and after each CREATE. API lookup errors cannot prove absence.
4. Reuse normal L01 creation and HTTP as L06 CREATE. Retain controller Pods as a
   separate observation. Negative Deployment UPDATEs use `replace` on observed
   objects with resourceVersion, changing only the controlled template fields.
   Compare UID, generation and desired spec after rejection. Status,
   resourceVersion and controller-managed metadata may change normally.
5. L06 changes only template annotation `tfm.goldenpath/l06`, using the same image.
   Require real template/generation change, successful rollout and HTTP, Ready
   controller Pods with the expected digest and new annotation. A no-op fails.
6. Submit a legal direct Pod CREATE as `runtime-l06`, observe unchanged image,
   then delete that owned Pod and require actual `NotFound`. Its labels cannot
   match the `app=quotes-node` Deployment selector. No direct Pod UPDATE is used.
7. Compare policy specs/identities and namespace protection. Emit completion
   records only after the positive controls and cleanup succeed. The ordinary
   L01 image replacement and other existing scenario families follow.

Each F12 trial resolves the tag through a bounded read-only registry GET before
and after the request, retaining response bytes, URL, digest header and computed
SHA-256. Both must equal the authorized backing digest. Failed lookups, changed
targets and automatic conversion invalidate the trial. Live verifier configuration
must retain `mutateDigest=false`, `verifyDigest=true`, `required=true` and exact
repository/digest matching. Signature rules match digest references; **these
trials do not claim signatures verified a tag-only reference**. The fresh backing
digest authentication and legitimate digest admission remain distinct evidence.
Snapshots detect observed changes; they do not provide an atomic view or detect
changes reverted between reads. The run assumes no concurrent publisher or
administrator altering its owned image or policies.

Unexpected acceptance, extra/unrelated diagnostics, API validation/immutability,
RBAC, signature, registry, transport, webhook and rule execution errors stop the
run. Raw requests/responses and observed unfavorable state remain. Cleanup never
turns an unfavorable result into a passing rejection.

See [execution and handoff](runbook.md) and [structured observations](completion.json).

## Scripted validation increment, 2026-10-04

The [separate automated evaluation](../../automated-remediation.md) reuses this scenario's existing local oracle for F03/F10/F11 × R/G with predefined repairs. It records machine activity, never human diagnosis or calibration. Live six-task integration remains **NOT_EXECUTED** at this handoff because storage is below the runner's preparation reserve. Historical observations above retain their original scope; human effort evaluation is deferred and overall acceptance remains pending.
