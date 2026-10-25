# P03 delivery-core validation

[Operator guide](../legitimate-delivery.md) · [Ownership map](repository-map.md)

Base: fetched main `b00d57b91536a00d3dc99bd1a99f4a82c5bab1ca` on 25 October 2026.
Branch: `refactor/delivery-core`. The root untracked `package.json` and
`package-lock.json` predated this task, are excluded and remain untouched.
No versions, workflows, policy versions, predicate types or historical results
are updated. P00 custody and human-review gates remain open.

## Baseline and environment

Original logs are ignored local evidence under
`implementacion/evidence/raw/p03-development/`. They are not committed or public
assets. The first doctor/test attempts lacked `implementacion/.tools/bin` on PATH:
doctor reported missing kind and eight service/unit tests failed on missing
external tooling. Both attempts are retained. With the existing pinned tools on
PATH, `baseline-doctor-tools.log` and `baseline-test-tools.log` pass before shared
behavior changes. No installation or version refresh was needed.

Effective baseline: Node 24.21.0, npm 11.19.0, Docker CLI/server 29.8.0,
Buildx 0.37.1, kind 0.33.0, kubectl 1.35.8, Python 3.14.2; security versions match
`tools.lock.json` through doctor. Exact version/environment output remains in
`baseline-environment.txt` and the doctor log. Initial resources: 4 CPUs, 15 GiB
reported RAM, 5.6 GiB free on the 32-GB `/workspaces` filesystem; `/tmp` is a
separate filesystem with approximately 108 GiB free. Docker's root is on the
same constrained filesystem as `/workspaces`.

Two pre-existing laboratories were active, with nodes/builders for
`tfm-demo-run-kcnmn8nq` and `tfm-demo-run-mt1eyh0g`. Their state is retained under
`run-KCNmn8NQ` and `run-Mt1eYH0g`; they are not P03-owned resources. No deletion or
custody conclusion is inferred from their names or the published release.

## New boundaries and checks

The focal suite uses synthetic stage substitution to establish ordering and
fail-stop behavior, not real cryptography or admission. It injects failure at
every stage, verifies later stages remain NOT_REACHED, retains the first error
through cleanup, runs without scenario/fixture/measurement/presentation trees,
and exercises the real source selection, producer validation, mandatory receipt
checks, resource identity guards and delivery packaging/hash verification.

A real failing service test exposed Node's inherited recursive-test context:
a nested `node --test` can exit zero while skipping execution. The delivery
profile now removes that context and requires a complete successful TAP summary.
This is retained in the focal failure logs and covered by a passing regression;
no retrospective TDD claim is made for other pre-existing code. Real Conftest
checks a prohibited manifest and stops the stage. Existing vulnerability, strict
inventory, crypto, rollout, historical packaging, paired, defense and manual
regressions remain in the shared suite.

The [shared targets](../../../implementacion/Makefile) include environment,
service/unit, Python/Conftest/Kyverno policies, real offline Cosign bundles,
workflow trials, defense and release checks. There is no `make lint` target.
Candidate check attempts and their results will be recorded below with the
implementation SHA before integration. A generated package alone does not prove
successful delivery or scenario execution.

## Integration and remaining acceptance

Two sequential new integrations are required on the implementation candidate:
`bash implementacion/scripts/deliver.sh local` and `make -C implementacion demo`.
The former is one legitimate delivery, never full L01; the latter keeps the
laboratory's current oracles, including independent replacement and L05.
Actual source/configuration, tool versions, DB identity, commands, outcomes and
original evidence paths must accompany those observations. Failed attempts stay
preserved. Tests with substituted stages cannot close either boundary.

Hosted workflows were not dispatched. Their authorized names/permissions and
prepare/native-provenance/finish/cleanup order are unchanged. Shared optional
producer validation defaults to the historical behavior. If hosted behavior is
subsequently changed, real GitHub verification on that exact revision remains
required; local keys, kind and act cannot establish OIDC/certificate/transparency
integration. No pilot, ten-pair campaign or manual task was run.

## Assistance and review

| Activity | AI contribution | Human review | Decision |
| --- | --- | --- | --- |
| P03 implementation, tests and documentation | OpenAI Codex / GPT-6: code inspection, extraction, regression checks and evidence reporting | Pending | Draft for human review; no acceptance or custody decision inferred |

Separate dependency, devcontainer (including optional Codex) and security-toolchain
refresh branches are specified in TODO and the maintenance sequence. They are
outside this diff; physical separation and the consumer template remain later work.
