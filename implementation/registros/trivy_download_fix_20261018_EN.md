# Trivy preparation download correction — 18 October 2026

`rehearsal-06`, source `179377f9cb15dd5e99b983f02e9c5774f2aa2d2d`, failed during
`analysis` before generating an SBOM. Its original `database-download.log` records
HTTP 404 fetching a layer from `mirror.gcr.io/aquasec/trivy-db:2`. The external
command exited 1. This is an integration failure, not a vulnerability rejection.
The failure was only visible in the nested original; the phase log showed resource
measurements and lacked the diagnostic.

## Correction

The shared `delivery_database_prepare` requests the publisher's
`ghcr.io/aquasecurity/trivy-db:2` explicitly for fresh downloads, respecting
`TRIVY_DB_REPOSITORY` overrides. This uses the existing pinned Trivy CLI and the
[publisher's documented repository](https://trivy.dev/docs/latest/configuration/db/).
Identified/frozen databases and explicit `GP_VULNERABILITY_DB` inputs still bypass
downloads. Database bytes and metadata are identified and checked as before.
No policy, scanner version, signature, scenario oracle or historical result changed.

On command failure, `delivery_analysis_command` preserves the full original,
command and exit code and emits a labelled tail of at most 16 KiB to the parent
operation log. The original status still aborts the stage. No blind retry or
substitution with previous scan output is introduced.

## Validation evidence

Local ignored evidence: `implementacion/evidence/raw/trivy-download-fix-20261018/`.
The three new regression cases failed first for the intended missing explicit
repository / missing parent diagnostic. All 48 vulnerability tests then passed,
including snapshot drift, authorization and error propagation.

A separate real diagnostic ran the corrected `delivery_analyze` on the existing
image, without build, new cluster, signature issuance or deployment:

- Image digest: `sha256:2f1283868ee58022a3bac306df97a066a7abb20e0a5b766e3102a0c016553716`.
- Evidence: `analysis-rkljgtl_/` under the validation directory.
- Result: fresh GHCR download, original CycloneDX generation, offline vulnerability
  scan, association checks and unchanged Conftest evaluation all passed; exit 0.
- Duration: **16.638 seconds**, download and snapshot included; this is an isolated
  analysis diagnostic, not presentation duration or a full demo run.
- Database SHA-256: `6ca3f4f80225560c64f0da4e4dac2ae42622f23786a335d53a81f92b5c44c40f`.
- Cache and identified snapshot retained at `/tmp/golden-path-trivy-fix-zcd_rnqa/`.

The observed machine has four CPUs and approximately 16 GiB RAM; `/workspaces`
has 32 GiB total capacity. Analysis samples (10-second interval plus boundaries)
record at least 5.947 GiB free workspace, 103.467 GiB free `/tmp` and 11.820 GiB
available memory. These are separate filesystems. No cleanup, pruning or evidence
deletion occurred, and existing margins were not reduced.

The original operation evidence remains byte-identical. Running the supported
`cleanup-plan` later updated only the session's controller/last-command metadata;
its failed result remains unchanged. The plan is retained as `cleanup-plan.json`;
no resource removal was executed. The isolated successful scan does not repair or
mark `rehearsal-06` prepared: a future presentation needs a fresh session.

Shared checks all exited 0: `make -C implementacion doctor` (1.021 s),
`make -C implementacion test-defense` (61 tests, 3.625 s) and
`make -C implementacion test` (129.862 s). Results are recorded in `checks.json`
with their original logs. `bash -n` and `git diff --check` also pass.
The new retained database/cache occupies approximately 3.05 GiB on `/tmp`;
workspace evidence and all earlier snapshots remain intact.
See the matching recovery instructions in
[EN](../docs/EN/defense-demo-operations.md#trivy-database-download-failures-during-preparation)
and [ES](../docs/ES/defense-demo-operations.md#fallo-de-descarga-de-la-base-trivy-durante-la-preparación).

Assistance: OpenAI Codex diagnosed the failure, implemented the bounded correction,
added regressions/docs and ran validation. Human review of this new correction is
pending; the earlier dashboard review is a separate record. No push, remote PR
update, workflow dispatch or new campaign sample is part of this correction.
