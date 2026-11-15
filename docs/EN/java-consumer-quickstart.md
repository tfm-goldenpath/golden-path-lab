# Bounded Java consumer trial

[Guide](README.md) · [Español](../ES/java-consumer-quickstart.md) · [Validation and limits](maintainers/java-consumer-validation.md)

`java-http-consumer/v1` is one dependency-free JDK HttpServer service using Temurin
25.0.5+8 and Maven 3.10.0. The separately pinned engine owns delivery, policies,
verification and infrastructure. The consumer owns its Java sources, tests and
resources. The supplied POM, Dockerfile and `.dockerignore` are fixed inputs for
this trial. Unknown profiles, mutable engine pins and altered build configuration
reject. Omitting `--profile` continues to select the existing Node starter.

Real bounded Java/Node delivery and directed admission validation passed at the
exact revision in the maintainer receipt; human acceptance remains pending. It is not general Java/framework support. Namespace
`tfm-golden`, Deployment/container `quotes-node`, actor `deployer`, port 3000 and
Linux AMD64 remain compatibility constraints. No production dependencies,
frameworks, database or hosted delivery are supported by this profile.

## Prerequisites and initialization

Use the existing Linux engine devcontainer tools and a separate Git consumer.
No host Java installation or devcontainer rebuild is needed for the supported
container test command. Reuse verified tooling; `make doctor` checks engine tools.
Inspect CPU/RAM, `df -B1`, `df -i`, Docker containers, volumes and builders first.
The Java cold-start gate requires **10 GiB free on Docker storage** (3 GiB reserve,
5 GiB existing cold growth, 2 GiB Java allowance). Evidence needs 3.5 GiB free;
Java DB source and snapshot filesystems each need 7 GiB free. Shared-filesystem
allowances may accumulate: measure actual growth before each protected stage.
Tests use two CPUs, 1 GiB RAM, one Maven/Surefire worker and a fresh temporary
repository. Run one workload at a time. `/tmp` helps only if it is a separate,
sufficiently large mount; it does not enlarge Docker storage. Never prune another
run or historical evidence to pass the gate.

Set real absolute paths, your reviewed 40-character engine commit, and your
expected HTTPS consumer repository identity. Use a checked-out engine whose HEAD
and origin match that pin. For an unhosted local trial, explicitly label an
`https://example.invalid/...` identity as test data; it is not remote verification.

```bash
ENGINE=/absolute/golden-path-engine
CONSUMER=/absolute/my-java-service
ENGINE_SHA=REPLACE_WITH_REVIEWED_FULL_SHA
SERVICE_REPOSITORY=https://your-source-host.example/your-team/my-java-service
export PATH="$ENGINE/implementation/.tools/bin:$PATH"
make -C "$ENGINE/implementation" doctor
bash "$ENGINE/bin/deliver" init "$CONSUMER" \
  --profile java-http-consumer/v1 \
  --repository "$SERVICE_REPOSITORY" --engine-commit "$ENGINE_SHA"
git -C "$CONSUMER" init
git -C "$CONSUMER" add .
git -C "$CONSUMER" commit -m 'Initialize independent Java consumer'
bash "$ENGINE/bin/deliver" check --consumer "$CONSUMER"
```

`init` copies only starter files, checks the engine pin and refuses nonempty
destinations. `check` validates immutable committed inputs/modes, configuration,
origin strings and engine prerequisites. Neither command proves tests, scanning,
admission or remote ownership. Main/test Java and resources are captured, including
relative test resources. Root `service/target/` is excluded both from trusted source
and Docker context; host-generated JARs/classes cannot enter the image. Other
unexpected build configuration or binary JAR/class inputs reject.

## Tests, delivery and evidence

Choose a fresh output directory for each standalone test. The engine retains the
Maven log, process status, original Surefire XML, artifact hashes and container
ownership receipt. All tests must execute and pass; missing, stale, malformed,
empty, failed or skipped reports reject, as does process failure with good XML.

The producer must be retired and absence confirmed before generated outputs are
inspected. Collection uses descriptor-relative `O_NOFOLLOW` opens and validates
opened objects; symlinks, hard links and nonregular entries are rejected, including
report roots/intermediate directories and JAR/POM artifacts. Limits: 10,000 entries,
32 directory levels, 64 MiB per artifact, 512 MiB artifact bytes total, 4 MiB per
report and 16 MiB report bytes total. Retained reports preserve original bytes,
mtime and hashes. These are starter bounds, not configurable Maven policy.

Retirement is attempted independently of execution/receipt/collection errors.
Errors stay nonzero, preserve the primary exception and never issue a successful
`java-tests.json`. `java-test-errors.json` is best effort on a full filesystem;
`java-test-work.json` identifies recovery work outside uploadable evidence. If
retirement cannot be confirmed, no generated output is collected and work/ownership
receipts remain for recovery. Cleanup requires exact ID, owner and pinned image;
a label alone cannot authorize deletion. Repeated cleanup confirms absence.

```bash
TEST_OUTPUT=/absolute/fresh-java-test-evidence
python3 "$ENGINE/src/java-tests.py" "$CONSUMER/service" "$TEST_OUTPUT"
# Optional DB placement: create these on verified storage before the run.
DB_STORAGE=/absolute/verified-database-storage
mkdir -p "$DB_STORAGE/cache" "$DB_STORAGE/snapshots"
export TRIVY_CACHE_DIR="$DB_STORAGE/cache"
export GP_VULNERABILITY_SNAPSHOT_ROOT="$DB_STORAGE/snapshots"
bash "$ENGINE/bin/deliver" local --consumer "$CONSUMER"
```

Delivery repeats tests and rechecks sources before build and authorization. The
image is built from captured bytes, with separate pinned builder and JRE stages.
Only the application JAR and a labelled build-artifact hash inventory enter the
runtime; Maven, its cache and test libraries do not. Fixed POM versions are **not
a complete dependency lock**. Resolved POM/JAR hashes are observations, not a claim
that transitives can never change.

The JVM budget is 64 MiB heap, 48 MiB metaspace, 24 MiB code cache, 256 KiB thread
stacks and Serial GC, within the unchanged 192 MiB workload limit. Non-root,
read-only root, dropped capabilities, seccomp and readiness checks remain required.
Actual memory/rollout acceptance remains subject to the validation receipt.
`/healthz` serves `{"status":"ok"}` from the running listener; `/version` reports
`independent-java` and actual consumer `BUILD_COMMIT`; `/` returns the fixed greeting.

The seven checks and four independent evidence types are unchanged. Provenance
and results bind the exact Java profile/producer, consumer repository/commit,
engine repository/commit, both input snapshots and configuration hash. A Node
expectation cannot accept a Java binding. Trivy scans the delivered image digest
into CycloneDX, validates its full schema, then scans that SBOM. Java requires an
explicit main DB and Java identification DB snapshot, with metadata and hashes,
checked before and after use. There are no ambient DB updates during analysis.
Do not reuse old DB bytes while describing the assessment as current. This starter
has no third-party runtime libraries; general Java dependency coverage and SBOM
completeness are outside the conclusion.

The delivery prints `RUN_DIRECTORY`; its package is under the engine's
`implementation/evidence/packages/`. Set `ARCHIVE` to the corresponding `.tar.gz`.

```bash
RUN_DIRECTORY=/absolute/engine/implementation/evidence/raw/delivery-XXXXXXXX
ARCHIVE=/absolute/engine/implementation/evidence/packages/delivery-XXXXXXXX.tar.gz
python3 "$ENGINE/src/verify_package.py" "$ARCHIVE"
bash "$ENGINE/bin/deliver" cleanup "$RUN_DIRECTORY"
# Only for an interrupted standalone test:
python3 "$ENGINE/src/java-tests.py" cleanup "$TEST_OUTPUT"
```

Archive verification checks outer and every internal hash; it is distinct from
live admission. Normal exit retires owned containers; cleanup validates immutable
IDs and ownership and preserves original evidence. Java DB snapshots remain
outside Git for replay and are identified in the archive, like the main DB.

Common failures: committed source drift/missing inputs (`consumer-inputs.json`,
`run.log`); test/download failures (`unit-tests.log`, `java-test-exit.txt`,
`java-test-reports/`); image/tool download diagnostics (original command output);
DB/scan failures (`database-download.log`, `java-database-download.log`,
`database-identity.json`, `sbom-generation.log`, `vulnerability-scan.log`);
policy rejection (`analysis.json`, `admission-failure.json`). A download error is
not an executed test, and a scanner/network error is not policy detection. Fix
inputs in a new committed attempt; preserve the first failed attempt.

Hosted OIDC, public image publication, production and full catalogue execution
remain **NOT_EXECUTED**. License, custody and human review decisions stay separate.

The runtime stage upgrades only `apt` and `libapt-pkg6.0t64` to
`2.8.4ubuntu0.1` from the signed Ubuntu snapshot `20261109T000000Z`, fixing
[CVE-2026-109518](https://ubuntu.com/security/CVE-2026-109518). APT retries are
disabled during this bootstrap. The base-image digest and 192 MiB limit remain fixed.

## Optional Java test and coverage gate

The validated Java profile now supports `quality`. Without a committed
`service/quality-gate.json`, it returns **NOT_EXECUTED / 0**, not coverage acceptance
(previous engines reported NOT_APPLICABLE). Ordinary delivery tests remain unchanged.
Use the same `ENGINE`, `CONSUMER` and exact engine pin defined above. Update an
existing consumer's pinned engine and starter workflow together in a reviewed commit.

```bash
cat > "$CONSUMER/service/quality-gate.json" <<'JSON'
{
  "schema": "java-quality-gate/v1",
  "include": ["src/main/java/"],
  "exclude": [],
  "thresholds": {"lines": 80, "methods": 80, "branches": 70},
  "limits": {"timeoutSeconds": 300, "maxOutputBytes": 16777216}
}
JSON
git -C "$CONSUMER" add service/quality-gate.json
git -C "$CONSUMER" commit -m 'Enable reviewed Java quality gate'
QUALITY_OUTPUT=/absolute/evidence/fresh-java-quality
bash "$ENGINE/bin/deliver" quality --consumer "$CONSUMER" --output "$QUALITY_OUTPUT"
bash "$ENGINE/bin/deliver" quality --verify "$QUALITY_OUTPUT"
```

80/80/70 is a reviewable example, **not a standard or a promise that the starter
passes**. Scope rules are literal files or directories ending `/` under
`src/main/java/`; no globs, shell commands or JVM options. Every rule must match a
committed file. All compiled production classes are reported, including classes
never executed; only explicitly selected source files contribute to thresholds.
Java metrics are **lines, methods, branches**. JaCoCo may count constructors and
initializers as methods; branches exclude exception handling. Coverage proves
neither assertion quality nor security. A zero denominator is not zero coverage:
it is NOT_APPLICABLE for that metric and an ERROR for a requested threshold.
Comparison uses integer counters and exact decimal thresholds, before rounding.

Requires Linux, pinned Node, Python, Git, Docker and bounded access to official
JaCoCo releases/Maven repositories. No host JDK is needed. Keep **10 GiB free in
Docker storage, 3.5 GiB at output and 5 GiB in temporary storage**, accounting for
shared filesystems. Run one workload at a time. Each producer has 2 CPUs, 1 GiB
memory, no swap, one fork, 128 MiB test heap and 256 MiB Maven/report heap.
`timeoutSeconds` is 1–300 **per phase**; `maxOutputBytes` is 4 KiB–16 MiB per log
and selected-output collection. Fixed limits include 10,000 working entries,
32 directory levels and 512 MiB working files. Evidence has a 128 MiB total bound.

[JaCoCo 0.8.16](https://github.com/jacoco/jacoco/releases/tag/v0.8.16) supports the
fixed Java 25. The official release ZIP and standalone agent/CLI hashes are pinned
in `src/java-quality-toolchain.json` (verified 15 November 2026). No JDK, Maven,
JUnit or production dependency upgrade is required. The copied POM is transformed
as XML: preserves the original and JVM limits, adds the exact agent/session, and
keeps `forkCount=1`. Compile → `surefire:test` once → trusted CLI reporting are
separate retired producers. A quality-only Surefire failure-ignore setting lets
validated assertion reports distinguish FAIL from Maven infrastructure ERROR;
it never changes the consumer POM or ordinary delivery acceptance.

| Result | Exit | Meaning |
| --- | --- | --- |
| PASS | 0 | Complete tests and evaluable coverage satisfy configured thresholds. |
| FAIL | 1 | Attributed assertion failure or unmet threshold. |
| ERROR | 2 | Invalid configuration, compile/download/process error, missing agent, stale/mismatched classes/data, invalid XML, collection or cleanup error. |
| NOT_EXECUTED | 0 | Opt-in absent; no tests or coverage acceptance by this command. |

Read `summary.txt`, `result.json`, `inputs.json`, original/effective POM and
`transformation.json`. `compile/`, `tests/`, `report/` preserve commands, bounded
logs, process/ownership receipts, original Surefire, class bytes/hashes, execution
data and JaCoCo XML. The verified CLI associates class IDs with execution data;
run nonce/times, source/configuration hashes and original captures are rechecked.
XML accepts only JaCoCo's exact known DOCTYPE declaration and never fetches a DTD
or resolves external entities. Final collection is strict and follows no links.
`checksums.json` verifies local bytes, **not signatures or deployment authorization**.

A compilation or dependency download failure is ERROR even without Surefire XML.
Check each phase's `unit-tests.log` and `errors.json`; missing/unsafe data and
instrumentation failures remain errors. If retirement or collection fails,
`result.json` identifies recovery directories outside uploadable evidence. Retire
only a phase's verified container with `python3 "$ENGINE/src/java-tests.py" cleanup
"$QUALITY_OUTPUT/tests"` (substitute the recorded phase). Never delete live recovery
work. Cleanup needs exact ID, owner and image receipts.

The starter workflow uses Ubuntu with Node/Docker and the exact engine checkout.
Opted-in consumers invoke this public command; otherwise the bounded ordinary
Java tests run once. Summaries/artifacts are retained on rejection. No privileged
Docker-in-Docker, publication secrets or admission changes are introduced.
See the [single quality validation record](maintainers/consumer-quality-validation.md)
for actual local/engine-CI observations, distinct from hosted consumer execution.

For the observed universal-image/NVM mismatch, inspect `type -a node npm npx`,
`node -p 'process.execPath'`, `npm config get prefix` and resolved links before
installing anything. Prepend the repository's verified `implementation/.tools/bin`
in the Codespace's persistent shell configuration, then check current and fresh
login/interactive shells. If pinned npm is absent, use only the official archive
and existing `NPM_INTEGRITY` verification in
`implementation/.devcontainer/install-tools.sh`, with `--engine-strict` and no
installation scripts; do not run the whole installer or select `latest`.
`make -C "$ENGINE/implementation" doctor` checks actual tools; it does not prove
the Codespace selected the canonical devcontainer profile.
