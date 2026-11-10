# Product and implementation guide

[Repository](../../README.md) · [Español](../ES/README.md)

1. [Understand the delivery stages and controls](how-it-works.md).
2. [Run one legitimate local delivery](legitimate-delivery.md): `bash bin/deliver local`; Linux AMD64, pinned tools, Docker and committed source, with the fixed local quotes-node profile.
3. [Create an independent Node consumer](consumer-quickstart.md).
   [Bounded Java trial](java-consumer-quickstart.md) (real delivery acceptance pending).
4. [Explore laboratory scenarios and recorded experiments](../../lab/README.md).

For orientation without execution, use [getting started](getting-started.md).
Maintainers can follow the [module contract](../../implementation/docs/EN/architecture.md#implemented-modules-and-dependencies),
[repository map](maintainers/repository-map.md) and [current decisions](../../implementation/TODO.md#current-decisions-and-actions).
[Propose a use case](use-case-intake.md) or consult the proposed
[attestation-selection ADR](maintainers/attestation-selection-contract.md).

Detailed [architecture](../../implementation/docs/EN/architecture.md),
[delivery contracts](../../implementation/docs/EN/delivery-contracts.md) and
[technical index](../../implementation/docs/EN/README.md) retain their existing URLs.
The [TODO](../../implementation/TODO.md) tracks current work; historical records
retain their original dates and acceptance status. The [thesis repository](https://github.com/tfm-goldenpath/golden-path)
owns the academic catalogue and research decisions.

English is primary for code, messages and contribution. Spanish entry guides explain
the same implementation, command names and rule IDs. A translation does not change
an oracle or historical record. Follow [CONTRIBUTING](../../CONTRIBUTING.md).
