# Bounded Java consumer trial — 9 November 2026

## PR #78 review follow-up — 9 November 2026

Reviewed and starting head: `25ba72af5393ed37b5441bdbd00698f733a8e8c4`, matching
fetched branch. Unrelated root `package.json`/`package-lock.json` are preserved.
The sections below are historical observations; this follow-up supersedes their
claim that only documentation followed `017f20a`. No old integration receipt is
attributed to the repaired runner. [Resumen en español](../../ES/maintainers/java-consumer-validation.md).

Two mocked regressions were run **before** changing the runner:
`vulnerable-regressions.log` records acceptance of a harmless external report link
and ENOSPC replacing a timeout before retirement. The fixes stop and confirm the
exact owned container's removal before collection; traverse generated reports and
JAR/POM files with no-follow descriptor opens/fstat; reject nonregular entries and
bound count/bytes. Retirement is independent of evidence writes. The original
execution exception is retained alongside collection/cleanup errors; unresolved
errors cannot produce PASS. Failed retirement preserves recovery work/receipts.

Focused checks cover external links, report roots/intermediate directories,
artifact links, FIFO/socket, link swaps, limits, stale/fresh bytes and hashes,
process/OOM/interruption failure, ENOSPC/read/hash/manifest failures, exact ownership
and incomplete retirement. These are deterministic test doubles, not Docker or
admission observations. The added stale-report regression exposed a buffered-write
mtime mistake during development; flushing before restoring mtime corrected it.
Both failures and the passing rerun are retained separately.

CI additionally runs normal real Java tests followed by a real-container harmless
link fixture through the ordinary runner/gates. It requires successful Maven
execution, an attributable collection rejection, confirmed producer absence and
no external sentinel contents in uploadable files. CI container tests do not prove
local delivery, cryptographic admission, database scans or runtime memory limits.

Local checks: `python3 implementation/tests/unit/test_java_consumer.py` passed
22 focused tests; `make -C implementation doctor` and `make -C implementation test`
passed (9 environment, 1,096 service/unit, 132 Python policy, Conftest/Kyverno,
real offline Cosign Node/Java negatives, workflows, 153 defense and 22 release).
A second full shared run validates the final runtime bytes; its original log is
`shared-final.log`. Inventory covers 854 tracked paths with 11 inventory regressions.
A one-off relative-link/anchor review checked 395 references in the changed guides;
EN/ES Java shell blocks match. No generic tracked link-check Make target exists.
`git diff --check` passed. Logs distinguish deterministic fixtures from real offline
cryptography. The latter does not establish live registry or admission behavior.

The supported `make -C implementation test-java JAVA_TEST_OUTPUT=...` was attempted
with the fresh output `implementation/evidence/raw/java-runner-review-20261109/local-java-test-capacity-stop`.
It rejected at the unchanged 10 GiB Docker guard before pull/create/Maven; its log
is `local-java-test-capacity-stop.log`. No tests executed in that local attempt.
The local generated-link container negative and both full deliveries were therefore
not started. No new local database dates, hashes, images or consumer bindings exist.
This fix changes only Java test lifecycle/collection; no extra fixed/lab integration
is justified by those paths alone. The earlier shared profile changes still need
the requested Java/Node live coverage before assessing broader acceptance.

### Committed fix and CI artifact verification

Runtime fix commit: **`7a0127a5d435f2f34fec652c151d1a839bb0a012`**. Subsequent
handoff edits are documentation only; all 70 canonical engine-input files retain
identical bytes and executable modes (`runtime-files.json`). No real consumer
integration is attributed to this commit. The final PR head and its separate push/
PR checks are recorded in the PR description and retained `final-head-ci.json`;
this source record identifies the immutable runtime tested below.

Both [push CI 42631337823](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/42631337823)
and [PR CI 42631348008](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/42631348008)
passed on attempt 1 at that exact runtime commit. Each executed two ordinary
Java service tests in the pinned 2 CPU/1 GiB Maven container, followed by the real
harmless generated-link fixture. Maven exited 0 in the fixture; collection then
rejected the unsafe entry, without PASS, after verified producer retirement.
This is an actual bind-mount/collection negative, **not** an admission negative.

Downloaded artifacts retained under `implementation/evidence/raw/java-runner-review-20261109/`:

| CI artifact / local ZIP | Verified GitHub SHA-256 | Original ServerTest XML SHA-256 |
| --- | --- | --- |
| `13681770966` / `java-13681770966.zip` (push) | `312319d82dbce5b6126c39c0155ef85538e266befd35c9a67709d4f039c8fbab` | `37b79fb4ff5923c65b5c1027ad7cf09699cc8cbfcad0e12abdb884c6a209ce8a` |
| `13682320409` / `java-13682320409.zip` (PR) | `01ce632b73707b69853ded36dd770fdd1914958e3aa042e7d80138756aa0c766` | `afd134b68502436411516318b5ba632dc6a517896a8e048b81fa09df9376e59e` |

`verify-ci-artifact.py` checked GitHub ZIP digests, normal report/log/artifact-manifest
hashes and pinned toolchain, plus all ten internal hashes in each negative receipt.
Each ZIP contains 20 files and **no symlinks or external sentinel contents**, including
the failed run's uploaded evidence. ZIP timestamps do not preserve nanosecond
freshness; that property was enforced at execution, while archive checks compare
original bytes/hashes. `java-<artifact>-verification.json` retains these observations.
Original Maven/runner logs and report bytes remain inside the ZIPs; no extra large
archive was created. Both receipts observed builder image ID
`sha256:c7a5284d62811ecb0d3f8154ad1ed5303d5f8f327492a9947d48960bfe96d462`
for the pinned builder manifest above, and application JAR SHA-256
`d73a0e2d5bac3fde87fbe32a6ba0c2f8499e75e719d1541f4df8beb98f2cf41a`.
These are test-build artifacts, not a delivered runtime image or SBOM. Shared-final log SHA-256 is
`b0b83cc1bd4556d2a8247a8500fbb63c1e383270e1df73df06afd0a367e0e06b`.

### Capacity and preserved evidence

Read-only inventory: 4 CPUs, approximately 15 GiB RAM/13 GiB available, no swap.
Workspace and Docker share device 1796 (`/dev/loop4`); `/tmp` is separate device
2049. At 13:58:13 UTC Docker/workspace had **8,364,621,824 bytes free**, 1,681,528
free inodes. Java's unchanged 10 GiB gate needs **2,372,796,416 additional bytes**
(2.210 GiB); this is only the gate deficit, not a complete allowance for cumulative
image/build/DB/snapshot/evidence growth. Node's 8 GiB gate also fails.
Separate `/tmp` had 114,619,088,896 free bytes; it cannot enlarge Docker storage.

No containers or active named builder exist. APT has no downloaded `.deb` files.
Three original infrastructure images (~1.973 GB) and three inactive BuildKit volumes
(~471 MB) remain. Historical coordinator receipts identify removed containers but
not immutable container-to-volume mounts; labels are absent. A name match alone
cannot justify deletion. No pre-existing resource was deleted: **0 bytes reclaimed**. Unique
historical evidence, private recovery and DB snapshots remain untouched.

Evidence for this follow-up is retained under
`implementation/evidence/raw/java-runner-review-20261109/` (ignored by Git):
`capacity.json`, original failing regression logs, `focused-final-02.log`,
`doctor.log`, shared/inventory/link check logs and final CI verification receipts.
No new large archive is created. Previous packages and sidecars remain at
`implementation/evidence/packages/`; their historical identities are listed below.
**`/tmp/java-consumer-trial` is absent in this Codespace session**. Its older paths
below describe the original run, not currently recoverable files; repository copies
under `implementation/evidence/raw/java-consumer-trial/` remain. Missing originals
must not be reconstructed or silently treated as retained custody.

### Fresh-Codespace handoff and remaining acceptance

1. Preserve the current checkout, unrelated files, `implementation/evidence/`,
   physical historical `implementacion/evidence/`, and private recovery/DB snapshots
   under `implementacion/.tmp/`. Transfer existing packages with their sidecars;
   copy missing raw/private material directly to verified destination storage.
   Do not build a second large archive here. Verify transfer hashes at destination
   before any deletion; custody of missing old `/tmp` originals remains unresolved.
2. Provision Docker storage with at least 10 GiB **free**, plus space for cumulative
   growth on shared mounts. Retain the separate 3.5 GiB evidence, 5 GiB test-temp and
   7 GiB per DB source/snapshot guards. Reinspect mounts/bytes/inodes before each
   download, build, database copy, cluster and package stage. Do not lower gates.
3. Fetch the final PR head; use its exact reviewed runtime commit as `ENGINE_SHA`.
   Follow the [Java quickstart](../java-consumer-quickstart.md) with fresh, independent
   committed consumers and unique evidence directories. Run normal container tests
   then the harmless real negative:
   `python3 implementation/tests/unit/test_java_consumer.py --real-link-negative "$FRESH_NEGATIVE_OUTPUT"`.
   This requires an absolute, nonexistent output path and ordinary Docker capacity.
4. Complete Java delivery, current main/Java DB capture and delivered-image SBOM
   inspection, four authenticated evidence types, 192 MiB restricted rollout and
   [directed wrong-binding admission/restoration](independent-consumer-validation.md).
   Verify the archive, retire only its owned resources, remeasure, then complete
   Node delivery on that same engine commit. Do not reuse historical consumer pins.
5. Reassess whether fixed/lab runtime coverage still needs a bounded extra run.
   Shared fixed/lab regressions pass only at their tested boundary; no full catalogue
   or campaign is required. Keep hosted delivery/OIDC, publication and production
   **NOT_EXECUTED**, and human review pending.

No fresh integrated consumer commits, delivered image digests, databases or delivery
packages exist for this fix yet. Full Java/Node delivery and the directed admission
negative remain merge blockers, independently of CI. Final commit/check details are
recorded below and in the same draft PR; no merge/release is authorized.

## Implementation plan and acceptance

Baseline: fetched `origin/main` at `39f93a449623920368fcad8e19da7714f8752280`,
including merged PR #77. Branch `feat/java-consumer-trial` starts there. Unrelated
root npm files and all pre-existing evidence, images and volumes are preserved.

1. Replace only the explicit Node assumptions in consumer initialization, fixed
   template validation, test execution/report parsing, build arguments, HTTP
   assertions and authenticated profile/producer expectations. Default Node,
   fixed delivery and laboratory interfaces retain their current behavior.
2. Add `java-http-consumer/v1`: Temurin 25, Maven, JDK HttpServer, no production
   libraries, fixed POM/plugins/test dependencies and fixed Docker context. Keep
   namespace, workload identity, port and restricted runtime contract unchanged.
3. Capture Java main/test/resources and build configuration against immutable Git
   trees. Exclude only root `service/target/`, also excluded from Docker. Capture
   binary resources without interpreting them as UTF-8. Recheck before protected
   stages. Run tests in a fresh copy with bounded CPU/memory, no credentials or
   Docker socket, and ownership-checked cleanup. Validate real Surefire reports
   and process success, retaining logs, resolved artifact hashes and reports.
4. Bind both authenticated contracts and admission to the exact configured Java
   profile/producer and existing consumer/engine/configuration snapshots. Preserve
   all seven checks, four independent evidence types and vulnerability thresholds.
5. Preserve the Java identification database alongside the main Trivy database,
   with explicit acquisition, metadata, hashes and immutable per-attempt copies.
6. Test configuration/source/report/trust/cleanup negatives and existing adapters;
   run doctor/shared checks and CI. On a committed candidate, run independent Java
   delivery plus one attributable admission negative/restored acceptance, retire
   it, then independent Node. Verify both archives. Further fixed/lab integration
   depends on uncovered shared behavior; no full catalogue or hosted dispatch.

Acceptance requires those real deliveries; unit fixtures and implementation alone
cannot establish it. Human review remains pending.

## Resource boundary

Initial host: 4 cores, 15 GiB RAM (13 GiB available), no swap. Workspace and Docker
share a 32 GiB filesystem with approximately 7.9 GiB free and 1,681,914 free
inodes. `/tmp` is a separate 118 GiB filesystem with 109 GiB free. No containers
are active. Three pre-existing BuildKit volumes and three images are preserved.
The existing 3 GiB reserve + 5 GiB cold-growth gate already fails. Java requires
additional builder/runtime, Maven and Java DB allowances. `/tmp` placement does
not increase Docker capacity. No image pull or cluster creation is authorized by
a failed capacity check. Lightweight implementation/checks continue; runtime
acceptance stays pending until safe capacity is available.

## Selected versions and official verification

Verified **2026-11-09**. [Apache's download page](https://maven.apache.org/download.cgi)
identifies Maven **3.10.0** as the current stable release. [Adoptium's API](https://api.adoptium.net/v3/assets/latest/25/hotspot?architecture=x64&image_type=jdk&os=linux)
returned Temurin **25.0.5+8 LTS**. The [official Maven image definition](https://github.com/carlossg/docker-maven/blob/4bcc1dea6507fba8ec40c602bf1bfdb963e21288/eclipse-temurin-25-noble/Dockerfile)
and [Docker Official Images catalogue](https://github.com/docker-library/official-images/blob/master/library/eclipse-temurin)
were inspected. Registry manifests/configuration were retrieved without pulling
layers; both selected Linux AMD64 configs report `JAVA_VERSION=jdk-25.0.5+8`.
Tags alone are not treated as immutable.

Exact selections are in [`src/java-toolchain.json`](../../../src/java-toolchain.json):

| Input | Exact verification |
| --- | --- |
| Maven builder, Linux AMD64 | `maven:3.10.0-eclipse-temurin-25-noble@sha256:b726d3a43d3de48046821dfbfdf55babb0a01474d1059ec6ce8ad4aebb07927f` |
| JRE, Linux AMD64 | `eclipse-temurin:25.0.5_8-jre-noble@sha256:41a70a160a5a157126929c1901e8dcf17ea4fd88eca1e7b9abf3cb1bb04df6c2` |
| Temurin distribution SHA-256 | `68982529869257d0ee6b824ec5aa270ff8b118bb438670da0b97ebdab178d7fb`; downloaded official release bytes matched the Adoptium checksum |
| Maven distribution SHA-512 | `908b1501bfb420bf7c8affb855534a9c407fd6099367bfb9f2f2dcb8e9799102bffb84518cde74c679bd76870247c6528683abdd620581bffa90f95d92d175aa`; downloaded official bytes matched the publisher checksum |
| Fixed Maven plugins | clean 3.5.0, resources 3.5.0, compiler 3.16.0, surefire 3.6.1, jar 3.5.1; stable releases checked in official Maven Central metadata |
| Test dependency | JUnit Jupiter 6.1.3, test scope only; resolved hashes retained separately from runtime inventory |

Trivy remains **0.76.1**, without changing existing tool locks/downloader. Its
[pinned JAR analyzer](https://github.com/aquasecurity/trivy/blob/v0.76.1/pkg/fanal/analyzer/language/java/jar/jar.go)
opens a Java DB client; its [pinned client](https://github.com/aquasecurity/trivy/blob/v0.76.1/pkg/javadb/client.go)
rejects skipping updates when metadata is absent. Java therefore requires
`ghcr.io/aquasecurity/trivy-java-db:1` acquisition before protected analysis, in
addition to the existing main DB. No actual new database download/scan is claimed
while Docker delivery is blocked. Database dates/hashes from PR #77 remain
historical and are not reused as a current Java vulnerability assessment.

## Observations and failed checks

Development logs and downloaded verification receipts are retained locally under
`/tmp/java-consumer-trial/`; selected handoff logs will also be retained under
`implementation/evidence/raw/java-consumer-trial/`. Raw evidence and distributions
are not committed. These are local observations, not independent custody.

- `focused-01.log`: 94 focused checks PASS (Node, Java, fixed delivery and legacy
  boundaries); deterministic fixtures do not prove live admission.
- `host-tests-01.log`: real Java source compiled and two JUnit tests passed using
  the checksum-verified Temurin distribution and pre-existing Maven 3.10.0. This
  preliminary check is not a container or delivery result.
- `java-regressions-02.log`: one added synthetic lifecycle check FAILED because
  wall-clock nanoseconds preceded filesystem timestamp visibility. The runner
  now uses a fresh marker on the same filesystem. `java-regressions-03.log` PASS
  preserves stale-report rejection, process failure and interruption cleanup.
- `render-02.log`: 17 renderer tests PASS, including exact Java profile/producer
  equality and Node-producer rejection. No cryptographic/live admission claim.

The initial implementation was followed by focused regressions; no earlier TDD
history is asserted. Runtime acceptance, integrated consumer revisions, archives,
Java SBOM contents, actual memory under 192 MiB and directed live admission are
**NOT_EXECUTED** until a safe-capacity delivery is observed. No runtime PASS is
inferred from compilation, schema fixtures or a green shared suite.

`doctor-01.log` PASS. `shared-01.log` PASS: 9 environment, 1,093 service/unit,
132 Python policy, Conftest/Kyverno, offline Cosign (Node and Java), static workflow,
153 defense and 22 release checks. This shared suite starts no Kubernetes delivery.
The real offline tests use labelled synthetic predicates and real keys/signatures;
they reject cross-profile authorization and signature-type substitution after
cryptographic verification. They do not establish registry/admission integration.
PR #77 push [42472801921](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/42472801921)
was independently confirmed `success`, attempt 2, head `225f9843f8029470ad669d122eca17bdf596765e`.

The preliminary JAR inspection retained `Main-Class: trial.Server`, implementation
version 1.0.0, Java 25 metadata and Maven `pom.properties` for
`dev.goldenpath.trial:independent-java:1.0.0`. Its only class is `trial/Server.class`;
no test/dependency JAR is embedded. This proves the inspected application archive's
contents, not deployed-image SBOM identification. The latter is still unexecuted.

## Committed-candidate attempts and exact limits

Candidate **`300fc5958da4bf31c14b23add317a451879d7fc6`** was committed before the
separate repositories were initialized through `bin/deliver init --profile ...`.
Both have explicit local `https://example.invalid/java-trial-{java,node}` identities,
no remote origin and distinct Git histories. Exact commands/CWD/status/timings are
in `/tmp/java-consumer-trial/candidate-300fc59/receipt.json`, SHA-256
`0854d7226effdf4fcd20aa43fa174e333d04eb3b3a068b42a1387d0a9782cd96`.

| Consumer | Committed source | Actual observations |
| --- | --- | --- |
| Java | `e2dd53b04a3ccf32b3efc70a9194493e89979dc5` | `check --consumer` PASS from `/tmp`; two real tests PASS in 4.703 s using both checksum-verified distributions, from consumer `service/`; delivery stopped at capacity before unitTests/build/infrastructure. |
| Node | `bef217923fe8734b88d09833ca2771b024635204` | `check --consumer` PASS from `/tmp`; actual Node tests PASS in 0.363 s; delivery stopped at capacity before infrastructure. |
| Intentional Java test failure | `791602e4c01c4e9fd17cdfef8e91184833247631` | Separate initialized/committed fixture with wrong greeting; real Maven exited 1 in 4.650 s. Original failed Surefire report retained; not a delivery/admission negative. |

The successful Java Surefire report SHA-256 is
`2ece29f053ee21fd9f165d9df5de2861aae11a47d74b45246fcb320df8499c4a`;
Maven output `61bbdf6c392bbe0890db004ec4927e47674c8554bbd0db1f3bc568f70c3a3f92`.
The failed report is `dfc8621afe139c00a04e56af51fb3467924a12c65466fac1dacf83efd1c7b32b`.
Node test output is `8bee38fbaaae6d3f7f07df2398bc6b02b76d7d7f832a2ffdb97baa931f564191`.

The exact candidate JAR also ran in a host JVM with the documented heap/native
budgets. All three routes returned the expected values, including actual consumer
commit `e2dd53b…` at `/version`. After 100 sequential requests, `/proc` reported
59,428 KiB RSS/high-water and 15 threads. The owned process was terminated. This
is **not** a 192 MiB cgroup, read-only-container, image scan or Kubernetes proof.
It cannot satisfy the requested runtime acceptance.

Both capacity-stop attempts preserve an ERROR result, unreached protected stages,
first archive and private recovery. `verify_package.py` passed outer/internal
hashes, and repeated `cleanup` exited 0 without replacing those archives:

| Attempt | Archive in `implementation/evidence/packages/` | SHA-256 | Internal hashes |
| --- | --- | --- | ---: |
| Java capacity stop | `delivery-dXxezlcI.tar.gz` | `619e3b9790dd572c870f7f3679ed190e4fb0e5c7ed999d9ff1d655b581d8c061` | 14 |
| Node capacity stop | `delivery-H6fG6uwG.tar.gz` | `a3178e7a62332b53f6f0312950bcf9a49eb8cf884e579c870e3371fca4533434` | 13 |

At the measured checkpoint Docker/workspace free bytes were **8,364,756,992**
(7.790 GiB), below Node's 8 GiB gate by **225,177,600 bytes** and Java's 10 GiB
gate by **2,372,661,248 bytes** (2.210 GiB). Separate `/tmp` had
114,515,107,840 free bytes. No image layers were pulled, DBs downloaded, cluster
created, or existing image/volume deleted. Three pre-existing volumes and three
images remain. Safe Docker capacity remains the blocking requirement; do not
lower the gate or treat `/tmp` free space as Docker capacity.

Required remaining acceptance: full independent Java delivery and authenticated
four-type evidence; current main/Java DB bytes and delivered-image SBOM analysis;
192 MiB restricted-container rollout; attributable live admission negative and
restored acceptance; then full Node compatibility delivery. Fixed/laboratory
checks passed in the shared suite, but because neither consumer reached shared
runtime stages, the decision to omit additional fixed/lab integration cannot yet
be justified by live coverage. Reassess after the two required deliveries; no
catalogue/demo/campaign rerun is claimed. Hosted OIDC/signing, public publication,
production and full catalogue remain **NOT_EXECUTED**.

| Activity | Assistant contribution | Human review | Decision |
| --- | --- | --- | --- |
| Implementation, tests, EN/ES documentation and bounded local checks | OpenAI Codex / GPT-6 | Pending | Draft implementation; real delivery acceptance blocked by capacity |

Repository licensing, private reporting and historical custody decisions remain
unchanged. Existing third-party notices are retained. No remote consumer
repository, hosted dispatch, settings change, merge or release was performed.

`shared-02.log` also passed (1,095 service/unit checks plus the same remaining
shared suites), adding Java source mode/symlink and XML package coverage. Final
source review corrected Java build state to record `javaBuilderImage` and
`javaRuntimeImage`, avoiding an irrelevant legacy `nodeImage` field. The affected
build-adapter regression in `java-final-01.log` passed all nine Java checks and
verifies both immutable arguments and the captured build context. This is a
synthetic Docker boundary, not an image-build result. Eleven inventory regressions
passed; 853 tracked paths have exact coverage. EN/ES Java command blocks match,
499 relative links/anchors in 16 affected guides passed, and whitespace checks
passed. The final push/PR CI status is recorded in the draft PR against its exact
head; no earlier CI is relabelled.

### Final runtime candidate

After the build-state correction, both consumers were initialized and tested again
on **`017f20ac6979c5ab70b8447876e299bab35ecaa2`**. Both checks and host service tests passed; both
deliveries again stopped at the unchanged environment capacity gate before tests,
build, scan, signing or infrastructure. Repeated cleanup passed and all archive
hashes verified. These are capacity-stop observations, not full deliveries.

| Consumer | Commit | ERROR run | Archive SHA-256 |
| --- | --- | --- | --- |
| java | `bf2c6a80472ddf1053cdbe6fba0580578ca1c331` | `delivery-Q20qd13r` | `d5b7858b48db8bcd073eb2821c4b0f1ac0f91b9ecb961573ddfc9db90c8ca8fc` |
| node | `1ae942efddedf1cabb2a64de38429ff73ff2aab7` | `delivery-ILYFGGt3` | `ceedf3e5e3db8c7a7bfd5fe1c1c478aa1d5352fd227d1ac21dabf166871d587f` |

Final candidate receipt: `/tmp/java-consumer-trial/candidate-017f20a/receipt.json`,
SHA-256 `52838c6a1806e6cd722b6826e9268251cee64a29e9b3473845508fb9a292c9af`.
Only documentation changes follow this runtime candidate; source/mode continuity
is checked against the final PR head. Its two capacity-stop archives contain
14 (Java) and 13 (Node) verified internal hashes. All local containers are absent;
the original three images and three volumes remain unchanged. Full acceptance
stays blocked by the capacity requirement above.
