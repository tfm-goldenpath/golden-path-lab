# Runtime family: execution and evidence

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

Read the [oracle](record.md) and [operation matrix](operations.json). Both lanes
use the shared coordinator, existing tools, policies and trust profiles. There
are no new GHCR mutation permissions or workflow shell implementations.

## Local

From the repository root, in the pinned Linux devcontainer:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test
make -C implementacion doctor
```

Stop on a failure. Once `doctor` passes, run `make -C implementacion smoke-env`
and the [bounded BuildKit-on-kind connectivity prerequisite](../F09-F10-L05/runbook.md#environment-preflight-before-retrying)
(the final section of that guide contains the exact commands). Do not change host
networking to force a pass. After those prerequisites pass:

```bash
make -C implementacion demo
```

This runs the runtime family before the existing replacement/evidence trials.
No L05 revision pair is inferred: its existing pending status remains when no
pair is supplied. Other families require their own attributable execution evidence.

## Hosted

A repository owner must first authorize publication of the reviewed revision and
manual integration. This local task neither publishes the branch nor dispatches
a workflow. Once the reviewed branch is available remotely, the exact command is:

```bash
gh workflow run golden-path.yml --repo tfm-goldenpath/golden-path-lab \
  --ref test/f11-f12-l06-runtime
gh run list --repo tfm-goldenpath/golden-path-lab --workflow golden-path.yml \
  --branch test/f11-f12-l06-runtime --limit 1
```

Record the returned run ID and exact head SHA; inspect that run and download its
artifact with `gh run download RUN_ID --repo tfm-goldenpath/golden-path-lab`.
The workflow retains `prepare` → native attestations → `finish` → `cleanup`.
`buildTag` is read from the initial run's state during finish, independently of
the separate replacement image tag. Local signing and `act` do not prove OIDC.

## Evidence and status

`evidence/raw/run-*/runtime/` holds the predeclared matrix, public source/image
identity, early inputs and diffs, production manifest policy, live policy and
namespace snapshots, per-operation requests, raw responses/exit statuses,
structured attribution, tag bytes/digests and before/after resources. L06 retains
separate controller Pod observations, rollout, generation/template change, HTTP
and direct Pod cleanup evidence. Parent evidence holds pinned tool versions,
trust and `runtime-authorized.*` cryptographic verification. `state.json` remains
excluded from archives, as do private material and credentials.

`F11-completed.json`, `F12-completed.json`, `L06-result.json` and package summaries
distinguish NOT_EXECUTED, INCOMPLETE and completed acceptance. Partial operation
results remain under `runtime/<case>/<kind>-<operation>/`. A complete family
observation does not imply that a later replacement scenario succeeded.

Development checks are retained under `evidence/raw/runtime-development/`.
The initial new oracle regression failed because its module did not yet exist;
later scenario tests are regressions, not a reconstructed TDD history. Sandbox
restrictions caused initial unit failures (listeners/child processes); the
unsandboxed results are recorded separately. Intermediate full/policy runs
(`10-suite.log`, `11-final-policies.log`, `12-kyverno-operations.log`) retain
skipped UPDATE failures: the pinned CLI defaults oldObject to the new resource.
The final engine fixtures supply the accepted original, including a permitted
init container before its security-field update, as supported by the
[pinned CLI processor](https://github.com/kyverno/kyverno/blob/v1.19.1/cmd/cli/kubectl-kyverno/processor/policy_processor.go).
No policy was weakened to obtain rejection. `13-kyverno-old-init.log` records
16/16 engine checks; the final shared suite is retained separately.

Live execution is **NOT_EXECUTED**: `doctor` found kubectl `v1.37.0` instead of
pinned `v1.35.8`. Smoke, BuildKit connectivity and demo were not reached; the
previous network blocker is not established as fixed. Hosted execution was not
dispatched. The user reports baseline hosted run `36750845686` successful at
`d864654`; its artifacts were not independently audited here and it cannot cover
this new family or the skipped F09/F10/L05 and F13/F14 operations.

## Checks completed in this working tree

- `make -C implementacion test`: PASS — 6 environment tests, 759 service/unit
  tests, 43 Python checks, 56 real Conftest decisions, 16 Kyverno engine checks,
  real local Cosign checks and static F01/F02 workflow trials.
- Final classifier/runtime/packaging regressions: 132/132 PASS.
- Bash syntax, `git diff --check` and 23 runtime-family documentation links: PASS.
- `doctor`: FAIL at kubectl version; local and hosted admission NOT_EXECUTED.

Final logs: `14-final-suite.log`, `15-final-targeted.log`; tool versions:
`16-tool-versions.json`. These files, `changed-files.txt` and
`source-hashes.txt` are under `evidence/raw/runtime-development/`.
The working tree is based on `d86465410d74e39ef8e77a9979995bcb268abf9a` and
was not committed or published during this task.

## Proposed PR description

Implement F11/F12 Deployment CREATE and legal template UPDATE rejections, bounded
isolated Pod CREATE checks, and shared L01/L06 creation followed by a real
annotation update. Attribute exact Conftest/Kyverno diagnostics and prove absence
or unchanged desired state. Persist and resolve the original build tag without
registry mutation; keep digest authentication and tag-reference denial distinct.

Retain operation evidence and completion summaries in both lanes without changing
policies, actor privileges, trust profiles or workflow permissions. Add scenario,
state, tag and policy regressions. The shared suite and final 132 focused
regressions pass; see the exact counts and retained logs above. Live local/hosted acceptance remains pending;
the environment pin mismatch blocks integration. Existing live gaps stay open.

AI contribution: Codex (GPT-6; exact serving snapshot unavailable) implemented
code, tests and documentation. Human review: **pending**. Final human decision:
**pending**. No thesis, host networking, versions, settings, releases or campaign
measurements changed. No push or PR publication performed.
