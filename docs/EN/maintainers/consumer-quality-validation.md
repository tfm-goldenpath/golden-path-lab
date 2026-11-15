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


## Concurrent temporary deletion review fix — 14 November 2026

PR #79 head and reviewed baseline both were
`687fae1b55f76f1b7ba581819be858ecee95097f`; no later changes were reset. Runtime fix:
**`a92734c74d799cfdf6a1d4825d92df6164e253f9`**. Unrelated root npm files were preserved.
PR #78 is merged and outside this work. The historical observations above remain
attached to their original revisions, not this fix. Human acceptance is pending.

### Cause, reproduction and correction

The active monitor enumerated a parent, then stat'ed entries or visited queued
child paths. Normal temporary deletion between those operations raised
`FileNotFoundError`, retired the producer and incorrectly produced ERROR.
Two deterministic hooks in `test_quality_runner.py` reproduce deletion after
parent enumeration/before child traversal and before `DirEntry.stat()`, without
sleeps. On the original implementation, both failed specifically with
`FileNotFoundError` (`reproduction-before-fix.log`: six tests, two errors).

Only active child enumeration/stat/open handles that specific disappearance.
Other exceptions propagate. Descriptor-relative directory opens use `O_NOFOLLOW`;
opened child identities must match their metadata. The root is checked against
its original identity on every poll and again after traversal/storage checks;
missing/replaced/linked roots remain ERROR. No new retries, waits or production
test hooks were added. The 32-level, 2,000-entry, byte and 3 GiB reserve limits
remain. Final collection, committed-input hashes/modes, primary-error preservation
and independent retirement/cleanup remain strict. No thresholds, exclusions,
policies, attestations, dependencies, devcontainer or Java coverage changed.

| Regression | Observed result |
| --- | --- |
| A: child directory deleted after parent enumeration | Monitor continues; also covers deletion after open/before enumeration. |
| B: child file deleted before metadata | Monitor continues. |
| C: missing/replaced/symlinked root, including during traversal | ERROR; original identity is required. |
| D: permissions, IO/storage faults | ERROR; exceptions are not hidden. |
| E: directory replaced by symlink or different inode | ERROR; outside directory never traversed. |
| F: committed input removed/modified by a real subprocess | Collection ERROR despite process exit 0; retirement and cleanup complete. |
| G: aggregate size, count, depth and disk reserve | Limits still reject; exactly 3 GiB remains the reserve boundary. |
| H: collection/cleanup failure | Error remains; no false PASS; failed retirement prevents inspection/removal. |

Supervisor: **16 tests PASS** (`supervisor.log`). Gate: **24 tests PASS**
(`quality-focused.log`), including real native coverage, input drift, malformed
reports, failing assertions, sealing and detached-process cases. These focused
checks use temporary fixtures and deterministic fault injection; the four cases
below are separate committed-consumer runs. Original failing logs are retained.

### New independent committed consumer cases

Executed in order after supervisor and gate regressions, on the runtime commit:

```bash
export PATH="$PWD/implementation/.tools/bin:$PATH"
python3 implementation/tests/unit/test_quality_runner.py
node --test --test-concurrency=2 implementation/tests/unit/quality-gate.test.mjs
node implementation/tests/integration/consumer-quality.mjs /workspaces/quality-monitor-independent-20261114
```

The first harness invocation mistakenly used an output parent inside the engine;
consumer isolation rejected its PASS case before any tests ran. That initial
ERROR is retained in `independent-consumer/` and `four-real-cases.log`; it is not
an assertion/monitoring failure. The corrected invocation used a new independent
repository outside the engine and never overwrote the first attempt.

| Case | Consumer commit | Result / exit | checksums.json SHA-256 |
| --- | --- | --- | --- |
| pass | `c8b25a5360008a4c98e53fdb991752b40c233257` | PASS / 0 | `6394821943e639714ed8e2cd401158951750a73ee46e98b875c146cb4b7130e7` |
| threshold | `36e348773356504a8d6b76bc8817c07ad982b46e` | FAIL / 1 | `35caeb0472fe8e10a784ca3cceed6ac5ba845a733917c071d89755476943be08` |
| test-failure | `7603b50878e08f7a936a782b3b9c7c0274e7bf81` | FAIL / 1 | `c8b352ae3a1da9c90907a12860cb7111ba2db5a176637902ee01484b83dd2510` |
| collection-error | `10615c3f907698fc9fe60d64c7dc1d5995a061d2` | ERROR / 2 | `0a0d2d2a507986a320ed94b57c843abd627ab233a5fb982436b8d221c00cb1da` |

The successful metrics remain lines 10/10, functions 2/2, branches 8/9. Threshold
FAIL identifies branches; assertion FAIL retains its actual test diagnostic.
Collection ERROR identifies the harmless generated link after tests exit 0.
All producers retired, all work directories were removed, and 48 original hashes
verified (`real-case-verification.json`). No Kubernetes or delivery execution was
needed. Original files and Git bundle remain in the independent directory; verified
copies are under the new evidence root's `independent-consumer-real/`.

### Resources, environment and retained evidence

This session actually has 4 CPUs, approximately 15 GiB RAM (13 GiB available), no
swap. Before integration, workspace/Docker shared device 1796 with
7,803,883,520 free bytes and 1,680,609 free inodes; separate `/tmp` device 2049 had
116,096,921,600 free bytes. Reserve plus 64 MiB bounded test growth was checked.
One heavy task runs at a time, consumer workers at most two. The full shared suite
uses a receipt-owned temporary Node wrapper solely to run test files sequentially;
it delegates to the existing pinned Node 24.22.1 and changes no repository tooling.

`make -C implementation doctor` exits **2** at:
`ERROR: npm: expected 12.2.2, found 11.19.1. Rebuild the environment.`
kind already exists; nothing was installed. This is not a valid full-environment
receipt. Do not reinterpret the old session's missing-kind result as this result.
Docker inspection found no containers, three pre-existing images, three volumes
and no build cache. No Docker resources, historical evidence or caches are removed.
Only this task's verified temporary wrapper is eligible for retirement after use.

New evidence is separate under
`implementation/evidence/raw/quality-monitor-review-20261114/`: original failures,
focused/shared logs, resource receipts, four-case copies, checksum manifests and
final-head CI receipts. The earlier `implementation/evidence/raw/consumer-quality-gate/`
path cited above is absent in this session; those historical receipts are not
recreated or relabelled. Existing PR #78 evidence remains untouched.

The shared-suite exit/duration, inventory/link/whitespace results and final-head CI
are recorded in the continuation below and in the same draft PR. Documentation-only
changes after the runtime fix retain explicit runtime byte/mode continuity. No
Kubernetes, complete Node/Java delivery, hosted delivery, release or deployment is
claimed. Linux local tests remain unsandboxed against hostile same-user code;
Java coverage, authenticated coverage evidence and human acceptance remain separate.


### Shared checks and final handoff

After the four cases, `make -C implementation test` passed with exit 0 in
434.636 seconds (`shared-command.json`): 10 environment, 1,120 service/unit,
132 Python policy, Conftest/Kyverno, real offline Node/Java cryptography,
workflow, 153 defense and 22 release checks. The recorded suite uses the temporary
sequential Node wrapper described above; no extra workload ran concurrently.
`shared.log` SHA-256:
`68a1bf157126c5166ad3e3279454690eaedc633977cfaf6e6765ae4c0af4a0d8`.

Then ownership inventory passed for 862 tracked paths with 11 regressions;
21 relative links/anchors in the three affected documents and unchanged EN/ES
shell commands passed the retained one-off `check-doc-links.py`. No generic
tracked link-check target exists. `git diff --check` passed. No new runtime
file/dependency needs adding to the engine input inventory: existing `src/`
selection still includes the changed supervisor.

The temporary wrapper was retired only after the suite exited, with matching
path/device/inode, exact script contents and no remaining process using it.
`cleanup.json` records 223 script bytes removed plus the empty temporary directory;
measured `/tmp` free space increased from 115,700,494,336 to 115,700,502,528 bytes.
Workspace free space was 7,842,451,456 bytes (7.304 GiB). No other cleanup occurred;
original reports, consumer repository/bundle, earlier failures and Docker resources
remain. `local-checksums.json` inventories new retained evidence outside Git.

Only documentation follows runtime commit `a92734c`. `runtime-continuity.json`
records exact final head and unchanged canonical runtime bytes/modes; final push
and PR CI results, their exact head and relevant artifact verification are retained
in `final-ci.json` and the updated PR #79 description. Those CI executions are their
own observations, not reassigned local receipts. Doctor remains blocked by the
npm mismatch above; no full-environment or human-acceptance claim is made.

## Opt-in Java adapter — 15 November 2026

PR #79 is merged. This increment starts from current `origin/main`
`d52190240d9f44ef908cd6d3237b2a69ed531157`, on `feat/java-quality-gate`.
The unrelated root npm files were preserved. Earlier baseline PASS observations
are not Java coverage validation. Commands/configuration are in the
[Java quickstart](../java-consumer-quickstart.md#optional-java-test-and-coverage-gate)
and [Spanish counterpart](../../ES/java-consumer-quickstart.md#puerta-optativa-de-calidad-java).

### Recovery and environment

The owner's handoff `java-quality-environment-handoff-20261114.tar.gz` matches
SHA-256 `dfbc8b8e0ee6e72fe00f8070450d8c34dcc579038d18f963f0285a33822a803a`.
Safe member inspection rejected no entry: 121 regular files comprise **120
manifest entries plus the manifest**, not 121 entries in that manifest; 512,005
expanded bytes. Extraction used a new directory under
`implementation/evidence/raw/java-quality-continuation-20261114T1555/handoff-import/`.
All manifest hashes, five nested Node manifests, bundle reachability and 73 engine
input byte/mode associations were verified. Original receipts were not rewritten;
relocations and rechecks are separate receipts. No imported script was executed.
The continuation package remains separately preserved with SHA-256
`f5881f7e5e0df57ba468c4783a7a46824fe1b593dcc68bbe0793218706d9504f`.

Actual environment: universal image, **not** the repository devcontainer profile;
4 CPUs, 15 GiB reported RAM (16 GB class), 32 GB workspace/Docker filesystem;
`/tmp` is a separate larger mount. NVM previously shadowed the verified repository
Node/npm installation. Persistent PATH now resolves Node **24.22.1**, npm/npx
**12.2.2** through `implementation/.tools/bin` (physical legacy `implementacion/`).
Current and new login/interactive shells agree. No npm reinstall or pin change was
needed. A newer local Codex symlink shadowed the existing isolated-lock **0.167.0**
installation; only that symlink was corrected, preserving its prior target and
active 0.169.0 application-server files. Version/help checks passed without model
or credential access. `doctor-functional-01.log` records diagnostic PASS, including
ten environment tests. This does not establish the canonical profile was selected.

The owner subsequently authorized removal of unnecessary material to recover
capacity. Exact ownership/inactivity/file inventories precede each action in
`implementation/evidence/raw/java-quality-resume-20261115/`:

- Eight inactive reproducible caches (old Copilot packages, npm download cache,
  inactive Codex daemon and unused root node_modules) reclaimed 2,993,938,432 bytes.
  Root package/lock files, latest Copilot and active Codex remained.
- The 28 October Trivy DB was losslessly archived and read-back/hash verified
  before removing its uncompressed copy. Archive SHA-256
  `f94d57f6a6c5f1686aeae35d179d2ab6f716d13c5e8752f5518055c29adf93f3`,
  136,043,532 bytes, retained next to `db-preservation.json`. This is historical
  custody, **not a current vulnerability assessment**. The first preservation
  attempt failed closed on an inactivity check and remains separately logged.
- Three unused exact pinned zot/kindest-node/BuildKit image caches reclaimed
  1,973,116,928 bytes. No containers used them; three historical builder volumes
  remained. No global prune, historical evidence deletion or volume deletion.
- Free space reached 13,738,893,312 bytes before pulling the pinned Maven builder;
  after the pull, 13,054,820,352 bytes remained. Docker's 10 GiB gate was not lowered.

### Instrumentation and initial real execution

[JaCoCo 0.8.16 release](https://github.com/jacoco/jacoco/releases/tag/v0.8.16),
verified 15 November, officially supports Java 25. The downloaded ZIP matches
published SHA-256 `a7b90535b30a7159dab62d8db0b276ed1f7bc73b7c2354d314503cd34b9c00ba`;
agent/CLI hashes are in `src/java-quality-toolchain.json`. The official release's
EPL-2.0 notice accompanies extracted tools; no repository license was selected.
No JDK/Maven/JUnit pin changed. Actual JaCoCo XML uses its Report 1.1 DOCTYPE;
the parser recognizes that exact declaration without resolving a DTD. Method and
line aggregates are validated separately; source lines shared by methods/classes
are counted by source-file union, not summed twice.

Engine candidate **`ddbe10130be2db0e8a0343b2fc7d2944eeab1700`** executed all six
independent committed Java cases at `/tmp/java-quality-real-20261115-attempt01/`.
`validation.json` records full consumer commits, durations and each manifest hash;
`consumer.bundle` preserves all cases. The command was
`node implementation/tests/integration/java-quality.mjs /tmp/java-quality-real-20261115-attempt01`.
No synthetic report was used for these observations.

| Real case | Observed status / exit | Detail |
| --- | --- | --- |
| PASS | PASS / 0 | 3 tests; actual agent argument and 128 MiB/2 CPU JVM limits asserted. 20/23 lines, 2/4 methods, 8/8 branches. |
| Threshold | FAIL / 1 | Explicit 100% thresholds reject unchanged coverage. |
| Assertion | FAIL / 1 | Real JUnit assertion failure, independently of coverage. |
| Evidence error | ERROR / 2 | Test replaces execution-data file with a directory; no usable execution data accepted. |
| Unexercised class | FAIL / 1 | `trial/Never` appears with zero coverage; methods fall below configured threshold. |
| Unsafe output | ERROR / 2 | Generated report symlink rejected; external harmless sentinel bytes absent from retained output. |

The fixture chose 80/40/70 **before execution**, without exclusions; main/private
constructor are not exercised by starter tests. Actual JaCoCo counts four methods,
not an inferred five. These fixture thresholds are not project recommendations;
the documented 80/80/70 example would reject the starter's method coverage.
Three sequential limited containers compile, execute tests once, and report.
All producer IDs were retired. Unsafe-output recovery remains outside uploadable
evidence, with exact path/inode/owner receipts, rather than deleting beneath a
potential producer or copying an unsafe target.

The initial pure-contract regression failed on the missing new module (retained
`quality-initial-red.log`). Later synthetic tests were added after implementation;
no earlier TDD history is claimed. The first focused Node run exposed the old
Java NOT_APPLICABLE assertion; its original failure remains recorded and the
expectation was updated to the intentionally changed NOT_EXECUTED behavior.

Final revision, subsequent compatibility checks, CI and artifact verification are
recorded in the final receipt below. Human acceptance, custody/license decisions,
OIDC, production and general Java coverage remain open. Full deliveries, image
scans and Kubernetes are not required here: deployment configuration, security
policy, evidence types and runtime application bytes remain unchanged; ordinary
Java tests and shared delivery/crypto regressions exercise the refactored lifecycle.
