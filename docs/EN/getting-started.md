# Getting started

[Guide index](README.md) · [Español](../ES/getting-started.md)

## Read and inspect without a cluster

1. Read [the delivery flow](how-it-works.md). Follow one image digest from build to authorization and admission; keep the scan report separate from its SBOM.
2. Open the [readiness matrix](../../implementacion/docs/EN/evaluation-readiness.md). Pick an observation and note its source SHA, lane, run ID and execution boundary. A code path or passing PR check is not a scenario execution.
3. Inspect the [corrected lane-A record](../../implementacion/registros/lane_a_corrected_91a33e9_EN.md) and [machine-readable index](../../implementacion/registros/lane-a-corrected-91a33e9.json). The separate [campaign results](../../implementacion/docs/EN/paired-rg-campaign-results.md) describe timings, not another functional catalogue run.
4. Read the [canonical acceptance declaration](../../implementacion/registros/evaluation_acceptance_20261004_ES.md) alongside those dates. Its reduced scope does not accept later source revisions or unsupported hosted negatives.
5. For selected original logs and the unchanged silent recording, open the existing [recorded demo](https://tfm-goldenpath.github.io/golden-path-lab/demo/). It is a frozen presentation, not a live execution or full evidence archive. Follow [release recovery](../../implementacion/docs/EN/lab-release-freeze.md) only if you need original packages and can satisfy its independent anchors and capacity checks. The [P00 receipt assessment](maintainers/repository-map.md#p00-baseline) states what was actually verified.

All five reading steps work in a browser. In an existing checkout, these read-only
commands locate the implementation and the small committed evidence index:

```bash
git ls-files implementacion/scripts/lib implementacion/policies
cat implementacion/registros/lane-a-corrected-91a33e9.json
```

Reading an index or hash does not reauthenticate signatures. To investigate a
recorded failure, use its linked original report, rule ID and run context; do not
infer a policy rejection from a nonzero exit. Never execute recovered archive code
as a substitute for the reviewed verification procedure.

## Deliberately run the laboratory

Use the [laboratory entry](../../lab/README.md) and its canonical runbook.
The implementation devcontainer requests 2 CPUs / 8 GB RAM / 32 GB disk; this P01
checkout has a requested 4 CPU / 16 GB / 32 GB environment. Free capacity matters
more than nominal disk size. Execution needs Linux AMD64, pinned tools, Docker and
network access. Do not run it merely to read results.

From the repository root, after environment setup:

```bash
make -C implementacion doctor
make -C implementacion test
make -C implementacion demo
```

`doctor` probes tools and Docker. `test` runs the shared environment, service/unit,
policy, offline cryptographic, static workflow, defense and release tests; it is
not a Kubernetes delivery. `demo` builds images, creates kind/registry/builder and
namespaces, runs reference and protected paths with fault/recovery scenarios, and
cleans up owned infrastructure while preserving evidence under
`implementacion/evidence/raw/` and `implementacion/evidence/packages/`.
Private state/keys and frozen database storage have separate retention rules.
`make reference` is an experimental reference path without G's evidence controls;
it is not a secure consumer alternative. Hosted integration publishes images and
evidence and requires deliberate remote authorization.

## Consumer template: planned

There is no supported standalone CLI or consumer template. The measured single-delivery
runner is a research interface, not that future API. Planned work is P03 neutral
extraction → P01b physical separation → P03b interface consolidation → P04 template.
See the [migration contract](maintainers/repository-map.md#migration-sequence).

## Reuse and support

No root `LICENSE`, repository `SECURITY.md`, `SUPPORT.md` or declared support SLA
was found at the P01 base. Public visibility is not a grant of unrestricted reuse.
Owner selection of repository reuse terms remains pending. The vendored
[CycloneDX notices](../../implementacion/schemas/cyclonedx-1.7/LICENSE) and
[is-number license](../../implementacion/tests/fixtures/l03/is-number/LICENSE)
apply to those materials; dependency locks do not replace dependency terms.

Use [repository issues](https://github.com/tfm-goldenpath/golden-path-lab/issues)
for non-sensitive questions and reproducible defects, with source revision and
sanitized diagnostics. Do not put secrets or private evidence there. No verified
private security-reporting contact is declared; an owner must choose that route.
This branch does not invent an address or change licenses/settings. Contribution
and human review follow [CONTRIBUTING](../../CONTRIBUTING.md).
