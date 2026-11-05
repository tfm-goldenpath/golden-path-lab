# F03 / F04 / L02: post-build vulnerability analysis

The [operation record](oracles.json) fixes the expected decisions before the
image trials. Source baseline: main `eed5aad2828a7156e4c49bf2e2f3d9c2b0476137`.
Human review and final acceptance remain pending. No PR-stage vulnerability
control is claimed. These are three existing scenarios in the twenty-case
catalogue; the repaired F03 delivery is an additional positive observation.

## Selected real package inputs

Real Trivy 0.74.0 filesystem scans on 2026-09-30, using the same preserved DB,
found the following. Dependencies are direct production dependencies only inside
explicit fixture contexts; the normal quotes-node service stays dependency-free.

| Input | npm component | Target / scanner severity | Expected post-build result |
| --- | --- | --- | --- |
| F03 vulnerable | minimist 1.2.5 | CVE-2021-44906 / CRITICAL | Exact target VULNERABILITY_BLOCK; no results or protected deployment |
| F03 repaired | minimist 1.2.8 | Target absent | Entire threshold passes; option parsing and service compatibility; fresh authorized delivery |
| F04 | ip 2.0.1 | CVE-2024-29415 / HIGH | Exact target VULNERABILITY_BLOCK under the same policy |
| L02 | lodash.unset 4.5.2 | CVE-2026-2950 / MEDIUM | Target present, no HIGH/CRITICAL; full authorized delivery and admission |

The selected minimist correction is supported by the [reviewed advisory](https://github.com/advisories/GHSA-xvch-5gv4-984h),
which lists fixes 1.2.6 and 0.2.4. The comparison uses compatible patch 1.2.8.
Both versions actually parsed the same harmless coverage/amount options with
identical output. No exploit is used. Service HTTP compatibility still requires
the image procedure.

For F04, the [reviewed npm ip advisory](https://github.com/advisories/GHSA-2p57-rm9w-gvfp)
lists no patched version; a read-only npm registry lookup still reports 2.0.1 as
latest. The fixed DB reports no FixedVersion. These observations support the
bounded npm/advisory/snapshot claim, not absence of every possible correction,
fork or future release. Reconsider the fixture if its target or fix status changes.

The [lodash advisory](https://github.com/lodash/lodash/security/advisories/GHSA-f23m-r3pf-42rh)
and the real scan support the MEDIUM boundary. The scan also reports MEDIUM
CVE-2025-13465; this additional finding is retained. L02 does not claim absence of
all vulnerabilities. Its harmless check removes an ordinary object property.

Package manifests, lockfiles with npm integrity, Dockerfiles and behavior checks
are under `tests/fixtures/vulnerabilities/`. `npm ci --omit=dev --ignore-scripts`
runs in a build stage. The final fixture extends the same pinned baseline service
image, contains the actual installed dependency and runs its harmless check before
the service. Definitions are provisional at image level: target/component/image
assertions must pass on the real SBOM before any scenario can complete.

## Original analysis contract and frozen data

The sequence is image → original CycloneDX SBOM → real `trivy sbom` → production
Conftest. The original SBOM and vulnerability JSON stay separate and unmodified.
Characterization using the retained real `run-IIWR8RLL/sbom.cdx.json` established
`SchemaVersion=2`, `ArtifactType=cyclonedx`, `ArtifactName=<SBOM path>` and retained
`Metadata.Reference`, `RepoDigests`, `ImageID`. The SBOM's container name,
`aquasecurity:trivy:RepoDigest` and ImageID must agree with the delivered image
and report. SHA-256 hashes bind the original files to the analysis receipt.
The production policy still accepts its historical `container_image` contract;
the delivery path requires the characterized `cyclonedx` contract and association.

The selected DB was updated `2026-09-29T13:11:12.644596957Z`:

- `trivy.db`: `b3c1bef699d2fb9fed55c280ddfe9f681cf43b117cc73e54f852c1d840d8399e`
- `metadata.json`: `1e3cc0661923e54ef8baf714edbbd66865f78144ab1ea8d409e67d163dfb10a1`
- Preserved local snapshot: `.tmp/vulnerability-selection/db-snapshot/db/`.

Keep these bytes outside Git for exact replay. A new run copies this snapshot
(or downloads and freezes one new snapshot), hashes database and metadata before
and after every scan, and retains its path, metadata and hashes. All four images
share it. No moving registry tag is presented as an immutable DB identity.
Database drift, lookup failure and malformed output stop execution.

## Boundaries and evidence

Each child has separate build inputs, digest, SBOM, report, policy result, source
identity and requests. Only source tests and DB identity are shared. F03 negative
may run on the explicit unprotected reference path R for HTTP comparison; F04
never deploys. Neither negative receives signed successful results or enters G.
Both positive images get fresh signature/SBOM/provenance/results verification,
restricted-actor admission, rollout/Ready digest and HTTP checks. Unrelated HIGH
or CRITICAL findings are enumerated and block positives. They cannot substitute
for the selected negative target. A changed target invalidates the trial.

The root coordinator owns cleanup and packaging. Failures stop subsequent stages;
no recovery turns a negative into PASS. Incomplete child evidence is preserved.
Database bytes are retained separately because of their size; package summaries
include their checksums and snapshot location. Local development-key trust does
not establish hosted OIDC. Vulnerable fixtures are never published to GHCR by
this entry point. Normal hosted delivery remains a regression path, not execution
of this family. Existing F09/F10/L05 and F13/F14 integration gaps remain open.

See [commands and actual checks](runbook.md) and [completion status](completion.json).

The [manual task procedure](../../manual-task-calibration.md) prepares independent
lane A F03/R and F03/G workspaces for human correction. It reuses this real target,
the shared scanner/policy and harmless compatibility check. A participant-selected
patched minimist version must be pinned in the lock, rebuilt, scanned and pass the
whole threshold and functionality requirements. This supporting procedure adds
no human calibration observations or new live scenario acceptance.

AI assistance: Codex, identified by the session as GPT-6; a more specific deployed
model identifier was not exposed. Contribution: implementation, fixture research,
regressions and documentation. Human review and final decision: **pending**.

## Scripted validation increment, 2026-10-04

The [separate automated evaluation](../../automated-remediation.md) reuses this scenario's existing local oracle for F03/F10/F11 × R/G with predefined repairs. It records machine activity, never human diagnosis or calibration. At the initial handoff, live six-task integration was **NOT_EXECUTED** because storage was below the runner's preparation reserve. Historical observations above retain their original scope; human effort evaluation is deferred and overall acceptance remains pending.

On 2026-10-04, after user-authorized removal of two verified redundant database
copies, session `automated-six-01` on `ea790781990766a3cb20bae5a302e1175edd3bd0`
validated all six local combinations, including this scenario in R and G.
Completion, owned cleanup and archive integrity passed without retries,
interruptions or human intervention. See the [result record](../../../../registros/automated-remediation-validation.md)
for exact task/run IDs, timings and hashes. Human acceptance remains pending;
hosted results and earlier observations are not changed by this local execution.
