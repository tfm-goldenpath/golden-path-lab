# Independent consumer validation — 5 November 2026

Baseline: fetched `origin/main` **`f64dcc0fb283b7fd2c904858b716150484704b5d`**,
PR #75 merged. Branch: `feat/independent-consumer-template`. Existing untracked
root npm files, historical evidence/private recovery and three existing Docker
volumes are preserved. Initial capacity: workspace/Docker 8.5 GiB free, separate
`/tmp` 110 GiB free, approximately 12 GiB available RAM. No containers were running.
No remote repository creation, hosted workflow dispatch, public image publication,
Pages deployment, release or merge is authorized/performed.

## Contract and validation boundary

The [quickstart](../consumer-quickstart.md) defines the fixed Node HTTP profile.
`templates/node-http/` contains service-owner files only. `src/consumer.mjs`
validates versioned configuration, exact engine checkout, committed files/modes,
separate repositories and the fixed Docker COPY/ignore boundary. Consumer tests
and workflows never fall back to engine files. Existing delivery modules own the
single pipeline and lifecycle; compatibility aliases and laboratory authorization
retain their semantics. Engine/configuration/consumer snapshot bindings occur in
both signed provenance and results and are required by fresh bundle verification
and consumer-specific Kyverno conditions. The old producer allowlist is unchanged
outside the explicitly selected consumer profile. The pending admission-selection
and CEL decision is unchanged.

Development outputs are retained in
`implementation/evidence/raw/independent-consumer-template/`. Initial regression
attempt `initial-red.log` had an incorrect test CWD; `initial-red-02.log` then
failed on the intended missing initializer behavior. `consumer-02.log` retained
an initializer copy error; `consumer-03.log` passes all six consumer contract
regressions. `focused-01.log` also found a direct-call service-root fallback
regression; the fallback was restored. No earlier TDD history is claimed.

Runtime candidate, real integration identities, archive hashes, final shared
checks and cleanup receipts will be recorded here after execution. Until then,
real independent delivery and representative legacy compatibility are pending;
implementation and synthetic tests alone do not establish support.

## Limits and review

Hosted OIDC, public registry publication and production clusters are
**NOT_EXECUTED**. General workload configuration, external runtime dependencies,
Java, human measurement, SBOM completeness and full DORA compliance are not
established. The next dependent increment is the bounded Java consumer trial.
License, private reporting, custody and human acceptance remain separate decisions.

| Activity | Assistant contribution | Human review | Final decision |
| --- | --- | --- | --- |
| Implementation, tests, documentation and local validation | OpenAI Codex / GPT-6 | Pending | Draft for owner review; no human acceptance inferred |
