# Bounded Java consumer trial

[Guide](README.md) · [Español](../ES/java-consumer-quickstart.md) · [Validation and limits](maintainers/java-consumer-validation.md)

`java-http-consumer/v1` is one dependency-free JDK HttpServer service using Temurin
25.0.5+8 and Maven 3.10.0. The separately pinned engine owns delivery, policies,
verification and infrastructure. The consumer owns its Java sources, tests and
resources. The supplied POM, Dockerfile and `.dockerignore` are fixed inputs for
this trial. Unknown profiles, mutable engine pins and altered build configuration
reject. Omitting `--profile` continues to select the existing Node starter.

This is an implemented trial awaiting the real delivery acceptance recorded in
the maintainer receipt. It is not general Java/framework support. Namespace
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
