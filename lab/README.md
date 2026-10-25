# Laboratory

[Product introduction](../README.md) · [Español](README.es.md)

The executable research laboratory remains under `implementacion/`. This directory
is a navigation entry only. It groups experiments and presentation material apart
from the [delivery explanation](../docs/EN/how-it-works.md).

## Running the laboratory

Use the [L01/F13 runbook](../implementacion/docs/EN/cases/L01-F13/runbook.md) for
prerequisites, expected responses and owned cleanup; the [environment guide](../implementacion/docs/EN/environment.md)
and [implementation README](../implementacion/README.md) describe pinned tooling.
From the repository root in the configured Linux AMD64 devcontainer:

```bash
make -C implementacion doctor
make -C implementacion test
make -C implementacion demo
```

The demo creates kind, registry, builder and namespaces, builds initial/replacement
images, exercises fault and positive scenarios, then preserves evidence and removes
owned temporary infrastructure. It needs Docker, network and adequate free disk.
The implementation configuration requests 2 CPU / 8 GB RAM / 32 GB; the defense
configuration requests 4 CPU / 16 GB / 32 GB. Those are requests, not free-capacity
guarantees. Read-only documentation work needs none of these laboratory resources.
Do not delete retained evidence or globally prune Docker to make room.

[Hosted integration](../.github/workflows/golden-path.yml) is a separate manual
workflow with GHCR publication and GitHub attestations. A code change or local
command is not authorization to dispatch it.

## Scenarios and configurations

The [twenty-row readiness matrix](../implementacion/docs/EN/evaluation-readiness.md)
is the entry for **F01–F14 and L01–L06**, including actual source/run identities,
shared observations, unexecuted boundaries and current acceptance. The
[technical index](../implementacion/docs/EN/README.md) links each family runbook;
[scenario modules](../implementacion/tests/scenarios/) own fixtures and oracles.

- **R/G** select reference or Golden Path controls. `make reference` deploys the experimental reference; it omits G's evidence controls.
- **A/B** select local development-key trust or actual hosted GitHub OIDC trust. A hosted devcontainer running local keys is still A; `act` does not prove B.
- F01/F02 are static checks. Unsupported hosted negatives, including F07, remain `NOT_EXECUTED`.
- Shared L01/L03/L04 deliveries and positive counterparts are linked observations, not independent samples. Same-image F13 recovery is different from L01 image replacement.

## Measurements and limits

Read [evaluation readiness](../implementacion/docs/EN/evaluation-readiness.md), then
the relevant dataset: [scripted remediation](../implementacion/docs/EN/automated-remediation.md),
[four-pair timing pilot](../implementacion/docs/EN/paired-rg-pilot-review.md) or
[ten-pair campaign](../implementacion/docs/EN/paired-rg-campaign-results.md).
The [measurement protocol](../implementacion/docs/EN/paired-rg-measurements.md)
and [resource assessment](../implementacion/docs/EN/economic-evaluation.md) define
what those quantities mean. Functional trials are a separate dataset.
Human effort, eligible manual calibration and limit freezing remain deferred;
known automated repairs cannot become human productivity evidence.

## Historical records and acceptance

[Original records](../implementacion/registros/) retain their bytes, dates and
limitations. The [canonical 4 October decision](../implementacion/registros/evaluation_acceptance_20261004_ES.md)
closes reduced-scope evaluation; [English translation](../implementacion/registros/evaluation_acceptance_20261004_EN.md)
is available. Later corrected-source catalogue observations have their own review
status. A technical pass, release or PR merge does not broaden that declaration.

## Defense and demonstration

Use the [defense guide by objective](../implementacion/docs/EN/defense/README.md)
for live preparation, controls, recording, offline export and lifecycle procedures.
The [published recorded demo](https://tfm-goldenpath.github.io/golden-path-lab/demo/)
lets readers inspect selected historical evidence without Kubernetes. It is not
a live dashboard or the complete private freeze. The original silent video stays
unchanged; narration and presentation-computer playback were excluded from the
release task by the owner and are not P00/P01 blockers.

## Frozen release and evidence recovery

[lab-v2026.10.24](https://github.com/tfm-goldenpath/golden-path-lab/releases/tag/lab-v2026.10.24)
freezes selected source and original transports. Follow the [release-freeze guide](../implementacion/docs/EN/lab-release-freeze.md)
and [input specification](../implementacion/releases/lab-freeze.inputs.json) for
anchored recovery, resource margins and private/public custody boundaries.
The [P00 baseline assessment](../docs/EN/maintainers/repository-map.md#p00-baseline)
records the existing independent published-byte receipt and remaining human/custody
gates. This is a mutable GitHub release (`immutable=false`). Frozen-0002 custody
does not imply custody of the entire evaluation dossier.
