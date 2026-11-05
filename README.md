# Golden Path Lab

[Run one legitimate local delivery](docs/EN/legitimate-delivery.md) ·
[Propose a use case](docs/EN/use-case-intake.md)

[English](README.md) · [Español](README.es.md)

Golden Path checks whether a container delivery has the required configuration,
image evidence and authorized source before admitting it to Kubernetes. It addresses
a common delivery problem: a successful build alone does not show what was shipped,
which checks passed, or why deployment should be allowed.

This repository implements that approach in a research laboratory using the synthetic
`quotes-node` service. It is useful to developers inspecting delivery controls and
platform maintainers evaluating how policy, signatures and operational evidence fit
together. One legitimate local delivery is available today; the independent Node starter uses that same engine from a separate repository.

## Delivery overview

```text
Source + configuration → tests and workflow policy → build → image digest
  → manifest policy → original SBOM → vulnerability scan + policy
  → independent image signature + SBOM/provenance attestations
  → fresh verification → signed results authorization → Kubernetes admission
  → rollout + HTTP observations → preserved evidence + owned-resource cleanup
```

This is the protected delivery flow; the laboratory adds controlled fault trials
and a reference delivery. Hosted provenance is issued between preparation and
finalization. See [how it works](docs/EN/how-it-works.md) for actual ordering,
blocking decisions and their evidence.

<a id="getting-started"></a>

## Choose a route

1. [Understand the stages and controls](docs/EN/how-it-works.md): what is checked, where delivery stops and what evidence remains.
2. [Run one legitimate local delivery](docs/EN/legitimate-delivery.md): `bash bin/deliver local`, using Linux AMD64, the pinned environment, Docker and committed source. The fixed profile delivers quotes-node locally.
3. [Create an independent Node consumer](docs/EN/consumer-quickstart.md): a separate service repository with an exact engine pin.
4. [Explore the laboratory](lab/README.md): scenarios, reference delivery, measurements and recorded experiments.

## Current availability

The local delivery engine lives in `bin/` and `src/`; laboratory adapters reuse it.
The [Node consumer quickstart](docs/EN/consumer-quickstart.md) defines its narrow runtime contract. Read the [current scope and limits](docs/EN/legitimate-delivery.md#current-scope)
before running, and use the [code-navigation guide](docs/EN/getting-started.md)
to find the implementation. The [readiness matrix](implementation/docs/EN/evaluation-readiness.md)
binds research observations to exact revisions; the [dated human decision](implementation/registros/evaluation_acceptance_20261004_ES.md)
accepts only its stated reduced evaluation scope.

## Controls and evidence

Delivery can stop at source/workflow checks, manifest policy, vulnerability policy,
signature/content verification or admission. A later rollout or HTTP failure is a
functional observation, not proof that admission rejected the workload. Inspect
the retained structured decision and original log before attributing a failure.
The [phase and control guide](docs/EN/how-it-works.md) links rule IDs, examples,
implementation and tests; [delivery contracts](implementation/docs/EN/delivery-contracts.md)
define the distinct image, SBOM, scan, provenance and results requirements.

## Laboratory

[Enter the laboratory](lab/README.md) for execution, all twenty scenarios,
local/hosted trust, reference/protected configurations, measurements, historical
acceptance, defense procedures and frozen-release recovery. Presentation instructions
and research chronology remain in their canonical guides.

## Contributing, support and roadmap

Use [CONTRIBUTING.md](CONTRIBUTING.md), the [documentation index](docs/EN/README.md),
[repository inventory and migration contract](docs/EN/maintainers/repository-map.md)
and [current TODO](implementation/TODO.md). English is primary; affected Spanish
entry guidance is maintained alongside it. People own requirements and review;
deterministic tools make delivery decisions.

No repository-wide reuse license is declared. Third-party notices retain their
own terms. License selection and a private security-reporting route need owner
decisions; see [reuse and support](docs/EN/getting-started.md#reuse-and-support).
Use [repository issues](https://github.com/tfm-goldenpath/golden-path-lab/issues)
for non-sensitive questions and reproducible defects; no support SLA is declared.

<details>
<summary>Links from the previous introduction</summary>

<a id="quick-start-in-codespaces-or-a-devcontainer"></a>
[Codespaces laboratory procedure](lab/README.md#running-the-laboratory).
<a id="language-and-documentation"></a>
[Language and documentation](docs/EN/README.md).
<a id="contributing-with-or-without-ai"></a>
[Contributing with or without AI](CONTRIBUTING.md).
<a id="evaluation-configurations-and-execution-lanes"></a>
[Configurations and execution lanes](lab/README.md#scenarios-and-configurations).
<a id="repository-structure"></a>
[Repository structure](docs/EN/maintainers/repository-map.md).
<a id="github-integration-and-repository-protection"></a>
[GitHub integration and protection](implementation/docs/EN/github-configuration.md).
<a id="implementation-status-and-next-increments"></a>
[Status and next increments](implementation/TODO.md).

</details>
