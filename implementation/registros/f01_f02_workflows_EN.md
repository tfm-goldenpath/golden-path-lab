# F01 / F02 static workflow validation

Date: 2026-09-30. Branch: `test/f01-f02-workflows`. Base/current committed source:
`d66d2237ab384069ed7f2fac7514fe11daba259b`, plus the uncommitted implementation
identified by hashes in the retained trial. Human review and acceptance pending.
[Oracle](../docs/EN/cases/F01-F02/record.md) · [Commands](../docs/EN/cases/F01-F02/runbook.md).

## Observations

The real pinned Conftest 0.70.1 / OPA 1.20.2 evaluator accepted the original L01
workflow and rejected F01 only with PULL_REQUEST_TARGET and F02 only with
ACTION_SHA. Command exit statuses were respectively 0, 1 and 1; stderr was empty.
The scenario command returned 0 only after exact structured diagnostic matching.
These are actual static scenario observations. L01 is workflow acceptance only;
no Action, candidate command, cluster or delivery was executed.

The first real F01 trial unexpectedly accepted unquoted YAML `on:`. Conftest's
parser represents that key as `true`; existing JSON-only policy fixtures did not
expose this path. The production policy now examines both event-key forms,
including map/list/string events. The event prohibition and external reference
scope did not change. `first-trial/` and the intermediate failing regressions
retain that unfavorable observation; later success does not erase it.

## Checks actually run

| Check | Result | Retained evidence under `implementacion/evidence/raw/f01-f02/` |
|---|---|---|
| Initial new regression | Failed: missing new evaluator module | `01-red.log` |
| Iterative focused checks | Parser gap and a test setup error found, then corrected | `02-focused.log` through `05-focused.log` |
| Final focused regressions | 10/10 passed; real Conftest plus explicitly labelled synthetic process/classifier tests | `08-focused.log` |
| Shared `make test` in sandbox | Failed at socket-dependent tests; local bind probe confirms EPERM | `06-suite.log`, `12-sandbox-socket.log` |
| Shared `make test` with local socket access | Exit 0: 6 environment, 733 service/unit, 42 Python checks, 52/52 Conftest, 9/9 Kyverno, real-file checks 18/18 and 14/14, all offline Cosign probes, static trial PASS | `07-suite-unrestricted.log` |
| Final affected `make test-policies` after final regression/CI edits | Exit 0: 43 Python checks including all 10 workflow tests; 52/52 Conftest, 9/9 Kyverno, actual workflows 18/18 and manifest 14/14 | `09-final-policies.log` |
| Final named static trial | L01 ACCEPT; F01/F02 exact isolated DENY; overall PASS | `10-static.log`, `final-static-trial/` |
| Archive audit | Archive checksum and 20 internal file hashes verified; static scope and case statuses checked | `11-archive-audit.json` |

Python discovery includes the existing duplicated renderer tests; these counts
are software checks, not additional scenarios. The shared suite ran before the
last added Make failure-propagation regression; the final affected policy suite
includes that regression. No network issue occurred in the static tests. The
sandbox failure concerned local socket permission, not the historical BuildKit
DNS problem; no host networking or tool versions changed.

The trial retains original/altered YAML, exact diffs, production policy copy,
SHA-256 hashes, Conftest version/binary hash, implementation hashes, base revision
and working-tree status, command argv, exit statuses, raw output and structured
results. Inputs remain inert outside active workflows. No image digest applies.
Archive: `implementacion/evidence/packages/f01-f02/final-static-trial.tar.gz`.
SHA-256: `bca8bd62b5bb2835eb5c2b9cacdfe4b68d922b96555cb192dc365f84d9bdb36a`.
Raw files and packages are ignored and are not included in Git.

## Limits and assistance

Ordinary PR/push CI is wired to the shared static command and retains its output;
no remote CI execution of this change has been observed. Actual repository
workflows remain checked independently. Merge enforcement depends on trusted CI
and external repository rulesets; source tests cannot protect their own checks.
F01 is conservative event prohibition, not general data-flow analysis or proof
of compromise. F02 performs no Action execution or upstream mutation.

User-provided context reports hosted run `36746422169` at `d66d223` succeeded;
its package was not independently audited here. Hosted F13/F14 negative trials
were skipped. Existing F09/F10/L05 and F13/F14 live-integration gaps remain open.
This work does not add live delivery execution or campaign measurements. No push,
PR publication, remote dispatch, repository setting or release change occurred.

| Activity | AI contribution and tool/model | Human review | Decision |
|---|---|---|---|
| Oracle, evaluator, scenarios, policy parser correction, regressions, evidence audit and EN/ES documentation | Github Copilot, GPT-6 | Pending | Pending |
