# Opt-in Node quality gate validation — 10 November 2026

Base: `ccc52a59c499510d331d5cb06a9a98e164ee2f1e` (merged PR #78).
The initial tree was clean on `feat/java-consumer-trial`; fetch, main fast-forward
and new `feat/consumer-quality-gate` branch preserved all existing ignored evidence.
PR #78 Java/Node observations stay attached to `e083164` and their original runs.
They are not validation of this increment. Human review remains pending.

## Contract and observed checks

The [EN quickstart](../consumer-quickstart.md#optional-test-and-coverage-gate) and
[ES quickstart](../../ES/consumer-quickstart.md#puerta-optativa-de-pruebas-y-cobertura)
contain activation, the full example, exit codes and evidence paths. No coverage
configuration is silently installed. Existing consumers retain ordinary tests.
The gate uses the fixed Node runner and existing capture, without dependencies,
Docker, signing, admission, policy, scenario or campaign changes.

Official [Node 24.22.1 runner documentation](https://nodejs.org/download/release/v24.22.1/docs/api/test.html#collecting-code-coverage)
and an actual starter probe confirm native events and the missing-unimported-file
limitation. The native report covers `server.js` at lines 10/10, functions 2/2,
branches 8/9, omitting the unloaded bootstrap. The committed-scope check rejects
that omission unless the bootstrap is explicitly excluded. No dependency is
needed for this fail-closed boundary; measuring unloaded code remains unsupported.

| Check | Observed result / boundary |
| --- | --- |
| Initial regression | Fails because `quality-contract.mjs` does not exist; retained `initial-red.log`. |
| Focused native-runner, contract and workflow tests | 24 PASS in `focused-final.log`; includes actual subprocess failures and synthetic fault injection. |
| Threshold precision | Exact 80 passes; 80.00000000000001 against 4/5 fails; presentation rounding is not used. |
| Missing/invalid control | NOT_EXECUTED / ERROR; no coverage PASS. |
| Missing/unimported production code | ERROR; explicit reviewed exclusion permits measurement; empty scope errors. |
| Evidence faults | Absent, malformed, truncated, foreign binding, inconsistent counts, unknown metrics, zero denominator, links/FIFO/hardlink and output cap reject. |
| Execution faults | Actual test failure, no actual tests, skipped tests, timeout, original/restored/copy input mutation and detached descendant cleanup exercised. |
| Cleanup fault injection | Original execution exception retained; failed retirement prevents collection/removal. |
| Public interface | Consumer and unrelated CWD, fresh-only output, input/output separation and checksum verification exercised. |

Logs from initial implementation failures are retained, including a copied-mode
mismatch and a report-negative fixture that truncated an as-yet-buffered file.
The latter was corrected to remove/replace the report, reproducing real missing
and malformed collection; no historical evidence was altered. The first workflow
check lacked Conftest on PATH; the locked installer restored it in a task-owned
temporary prefix, without changing project versions.

## Resources and environment

Observed machine: **2 CPUs, 7.8 GiB RAM**, below the requested 4-core/16-GiB size.
Initial workspace: 9.5 GiB available of 32 GiB; `/tmp` is a separate filesystem
with 39 GiB available. Initial inode availability: 1,717,577 workspace and
2,949,078 temporary. Docker: five images, no containers/volumes and 39 cache
records; storage was inspected without creating a cluster or deleting anything.

The host has Node 24.22.2/npm 11.19.1 rather than the repository pins. A temporary
Node 24.22.1 copy was verified against the official SHA-256
`6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6`.
Locked security tools were installed under `/tmp/consumer-quality-gate-tools/`;
no npm/Codex/devcontainer pins changed. New tests use at most two workers and run
sequentially with other heavy suites. Capacity is checked before each suite.

`make -C implementation doctor` was executed and stopped at missing `kind`.
The environment also reports Docker CLI `29.9.2-2` and unpinned host npm; no green
full-environment claim is made. These platform tools are not required by the new
command. No Kubernetes, hosted OIDC, publication or remote consumer repository
execution is claimed.

## Final validation receipt

`make -C implementation test` passed (`shared-01.log`): 10 environment,
1,117 service/unit, 132 Python policy, Conftest/Kyverno, real offline Node/Java
Cosign checks, workflow, 153 defense and 22 release tests. The final diagnostic
refinement then passed all 24 focused tests, including a real SIGTERM whose cause
is now preserved explicitly, Java NOT_APPLICABLE and sealing failure. Separate
Java Python regressions passed 22 tests. No delivery or Kubernetes run was needed:
policy, authenticated contracts, delivery modules and Java sources are unchanged.

Inventory: 862 tracked paths and 11 regressions PASS. Relative-link/anchor review:
410 links PASS; the earlier temporary checker is absent, so its documented one-off
procedure was recreated and retained as `check-doc-links.py`. No tracked generic
link-check target exists. Whitespace review passed.

Exact local-starter revisions, checksums and final-head CI are added below after
the committed-source execution. No previous PR receipt substitutes for these runs.
Evidence is retained outside Git under
`implementation/evidence/raw/consumer-quality-gate/`; each actual quality run has
its own checksum manifest. The independent repository identity is explicitly
`https://example.invalid/local-node-quality-validation`, not remote ownership.

| Activity | Assistant contribution | Human review | Decision |
| --- | --- | --- | --- |
| Implementation, tests, documentation and draft PR | OpenAI Codex / GPT-6 | Pending | Review scope/exclusions/thresholds and exact-head checks before considering merge. |

Java coverage, authenticated-results/admission integration, AI diagnosis/draft-PR
automation, independent SBOM/image comparison and vulnerability reassessment remain
separate work. License, historical custody, selection semantics, hosted OIDC and
human acceptance remain open under their existing records.

## Independent committed starter execution

Final local runtime: **`55dea4a64b6a9a64853fe2c08a4d0288119db784`**.
The engine initialized `/workspaces/consumer-quality-validation-final/consumer`
through `bin/deliver`. Each controlled change was committed separately:

```bash
node implementation/tests/integration/consumer-quality.mjs /workspaces/consumer-quality-validation-final
bash bin/deliver quality --verify /workspaces/consumer-quality-validation-final/pass
```

The harness invokes the public quality command from consumer and unrelated CWDs.
Results and original reports were copied unchanged into the ignored evidence
root's `independent-starter-final/`, with a verified Git bundle and
`validation.json`. Each manifest verifies 12 file hashes (48 total). Below are
SHA-256 anchors for `CASE/checksums.json`, not signed attestations.

| Case | Consumer commit | Result / exit | Manifest SHA-256 |
| --- | --- | --- | --- |
| pass | `311daa773d10e2ca9cfa631e41b16cc9cddbd909` | PASS / 0 | `0f80cb60ffb5769e816693a9fdcf178802ae451ce804cfcfce4e26d5970519f7` |
| threshold | `71bb36e9efc7871c87f1debd98235d2421bc36d8` | FAIL / 1 | `18ff5dae2bad4bc6ededb94bd0f3cffb5a89c685aa2827dc2ea029c3b3fe0f95` |
| test-failure | `245faf5086fa62b8d5d36ae5281b4c233b053ef3` | FAIL / 1 | `5c8e0eead0ba96fc56ced66bc7e266abe8f5e9d9dfa584cb1c59e5b525a59c10` |
| collection-error | `f58b4b122b850164ecd666fdfaa6511f580ab61b` | ERROR / 2 | `4f90bbd7892ea6f55167cfbffa390d620c7c757c942800dbd4f10ba0cfd56b92` |

The passing service reports lines 100% (10/10), functions 100% (2/2), branches
88.88888888888889% (8/9). The threshold case deliberately requires 100% branches.
The assertion failure retains high coverage but fails tests. The collection
negative executes successful tests, creates a harmless symlink and receives ERROR;
its producer is retired before inspection and work removal. No linked bytes are
retained. These are local independent repositories, not a hosted consumer.

Earlier four-case executions at `de0aeae` and `2e03286` remain separately retained
in `independent-starter/` and `/workspaces/consumer-quality-validation-descriptors/`.
Final review hardened descriptor-relative output creation and temporary-root
validation; all 24 focused tests passed (`focused-descriptors-final.log`). Four
Python boundary tests then passed, including existing-report and root symlinks;
the early-error pipe ResourceWarning was fixed and rechecked before the final
four-case execution above. Original failed development logs remain unchanged.

Only this validation document changes after `55dea4a`; selected engine runtime
bytes are unchanged. Final-head push/PR checks and downloaded artifact hashes
are recorded in the draft PR description. CI runs the same four cases against
its own checkout. No previous run identity is attributed to that head.
