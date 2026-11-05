# F01 / F02 workflow policy — operational oracle

Defined before implementation on main `d66d2237ab384069ed7f2fac7514fe11daba259b`
using the task's explicit F01/F02 requirements and the existing `workflow.rego`.
Academic IDs remain unchanged; this is an operational interpretation of the
existing catalogue, not a new catalogue or an assertion of thesis revision review.
Human review and final acceptance are pending.

| Property | L01 workflow counterpart | F01 | F02 |
|---|---|---|---|
| Starting input | Inert legitimate manual workflow, SHA-pinned checkout, job-scoped packages/id-token/attestations write | Identical accepted original | Identical accepted original |
| Actor capability | Laboratory prepares source data | Contributor can propose workflow edits; cannot change trusted evaluator/policy in this trial | Same; no upstream tag modification |
| Exact alteration | None | Replace workflow_dispatch with pull_request_target and add checkout ref `${{ github.event.pull_request.head.sha }}` | Replace only checkout's full SHA with v7.0.1 |
| Property/rule | No workflow denies | Conservative event exclusion, PULL_REQUEST_TARGET | Immutable external Action reference, ACTION_SHA |
| Injection/first consumer | Static Conftest evaluation | Proposed workflow before PR static evaluation | Same |
| Expected diagnostic set | Empty | Only `PULL_REQUEST_TARGET: this event is excluded from the laboratory` | Only `ACTION_SHA: actions/checkout@v7.0.1 must be pinned to a full 40-character SHA` |
| Latest blocking boundary | Static workflow acceptance | PR check must fail before merge/protected execution of the candidate | Same |

All three use the same pinned Conftest and production policy. The F01 fixture
combines external PR head content with privileged job execution and a command
that would run repository-controlled code. Its SHA-pinned Actions and otherwise
permitted privileges isolate the event rejection. This conservative prohibition
is not general untrusted-data-flow analysis or evidence of actual compromise.
Neither R nor G executes these fixtures. Commands and expressions are data only;
all inputs live outside `.github/workflows/`.

Retain original/variants, exact unified diffs and SHA-256 hashes, copied policy and
hash, tool version and binary hash, source revision, command argv, exit status,
stdout/stderr and structured classification. No image digest is applicable.
Require baseline success and exactly the expected negative diagnostic sets.
Additional denies, malformed YAML, tool/version/compilation/transport errors,
timeouts, invalid JSON and unexpected acceptance are failures, not detections.

Repository rulesets and trusted CI configuration enforce merge requirements
externally. These files do not configure them or stop a candidate from editing
its own checks. Actual repository workflows remain independently evaluated.
This L01 observation is workflow acceptance only, not a complete delivery.
Static execution, software regressions, live delivery and campaign measurements
remain separate. Existing F09/F10/L05 and F13/F14 live gaps remain open.

Initial observation: **NOT_EXECUTED**. Subsequent observations belong in the
[validation record](../../../../registros/f01_f02_workflows_EN.md).
