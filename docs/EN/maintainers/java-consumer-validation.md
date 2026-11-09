# Bounded Java consumer trial — 9 November 2026

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
