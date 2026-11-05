# Latest workflow observations and paired G attestation follow-up

Local follow-up on `feat/demo-control-and-evidence`, based on `96d3901`.
OpenAI Codex implemented the importer, renderer, tests and documentation. Human
review remains pending. No remote workflow, publication, laboratory run or human
acceptance was performed.

## Observations captured on 18 October 2026

| Workflow | Run / attempt | Source | GitHub conclusion |
|---|---|---|---|
| ci.yml | 39119782917 / 1 | b0564232187404df17a9156487d13454b85b924d | success |
| golden-path.yml | 38762578664 / 1 | 1ec4cb9e89fce412df90510b7f3b3f3ca03bb50f | success |
| lane-a-validation.yml | 37353632299 / 1 | 91a33e910ee2ba9ded5391393b06ca70005de4d4 | success |
| paired-rg.yml, historical example | 37202413477 / 1 | 895a3bde79089b7544c1dad76a6cd8f48eede0a8 | success |

The first three are latest at query time, not necessarily executions of current
main. Their metadata/jobs/YAML were captured; packages and signatures were not
verified. Capture IDs and UTC are retained in `evidence/raw/github-observations/`.

The paired artifact `11303646242` is 116,999,171 bytes, SHA-256
`6af4b6c2b2a75018c45484eea227a548e19ab59fec6e134a69e328974bd8220e`.
The G package `run-aYgUGzUp.tar.gz` has SHA-256
`5497f0decd27d6193900f18c8c292826d8c510a335394e43aa83b15d24b15091`;
its 136 internal hashes were checked with the shared verifier. Selective inspection
retains image signature, SBOM, native provenance and results bundles, statements,
verifier outputs and aggregate authorization. Native provenance binds run/attempt;
a deliberately mismatched attempt was rejected. This is not fresh cryptographic
verification or a full audit of R/infrastructure/database packages.

The initial selective import failed because native GitHub verification uses a
result array rather than a bare statement. Capture `37202413477-669a11f763c3` remains
INCOMPLETE. Subsequent successful captures remain separate; none was overwritten.

## Checks and resources

`make doctor`, `make test` (including 951 Node unit tests, policy/workflow/crypto
checks, 82 defense Python tests and 12 model tests) passed. The targeted importer
suite has 19 tests. Existing observations browser regression, the new workflow
refresh browser check and native 200% zoom check passed. Screenshots cover
1366×768, 1920×1080 and 390 px. The offline snapshot and actual export both made
zero network requests; no browser POST actions were sent.

Logs/screenshots: `evidence/raw/workflow-refresh-20261018/`. Actual preview session
export `export-0003` passed archive verification with 63 files; it records an
unprepared preview session plus separately identified historical GitHub captures.
It is not a newly executed demonstration.

Observed machine: 4 CPUs, about 16 GiB RAM, 32 GiB workspace filesystem. Workspace
free space remained about 5.9 GiB before/after, above the 3 GiB reserve; `/tmp` is a
separate filesystem with about 107 GiB free. No retained evidence was removed.
The explicit paired download contains a compressed database, but it was not
extracted. No campaign archive, image or new database was downloaded separately.

See the canonical [EN guide](../docs/EN/defense/demo-workspace.md#refresh-the-latest-workflow-observations)
and [ES guide](../docs/ES/defense/demo-workspace.md#actualizar-los-últimos-datos-de-workflows)
for `--latest`, optional bounded `--paired-artifact`, reopening and offline export.

Suggested PR follow-up: **fix: refresh workflow observations and expose paired G attestation receipts**.
Latest workflow selection uses execution/attempt/capture ordering without dropping
failures. Historical paired evidence is explicitly imported, bounded, associated
and rendered separately from local A material; actions and scenario criteria are
unchanged. Human review is pending.
