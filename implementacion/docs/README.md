# Documentation

Choose a language:

- [English — primary technical documentation](EN/README.md)
- [Español — documentación de apoyo](ES/README.md)

Start a contribution with the root [contribution guide](../../CONTRIBUTING.md). AI-assisted development has matching [English](EN/ai-assisted-development.md) and [Spanish](ES/ai-assisted-development.md) guides; the same requirements and deterministic checks apply with or without an assistant.

Current evaluation readiness: [EN](EN/evaluation-readiness.md) / [ES](ES/evaluation-readiness.md), with twenty scenario rows and the final-source handoff.

## Organization

Shared topics have the same filename in each language directory. Each language index identifies the available guides; a missing translation is linked to its English version instead of copied as an untranslated Spanish document.

```text
docs/
├── README.md
├── EN/
│   ├── README.md
│   ├── ai-assisted-development.md
│   ├── architecture.md
│   ├── delivery-contracts.md
│   ├── environment.md
│   ├── github-configuration.md
│   ├── implementation-plan.md
│   └── cases/L01-F13/
│       ├── README.md
│       └── runbook.md
└── ES/
    ├── README.md
    ├── ai-assisted-development.md
    ├── architecture.md
    ├── delivery-contracts.md
    ├── environment.md
    ├── implementation-plan.md
    ├── cases/L01-F13/
    │   ├── README.md
    │   └── runbook.md
    └── context/
        └── external-proposal-review.md
```

The case directory describes the integrated L01/F13 demonstration and its directed F11 checks. It contains the specification and runbook; executable scenarios remain in [`tests/scenarios/`](../tests/scenarios/) and are shared by both languages. Add a case directory when it has distinct operational documentation, rather than creating empty directories for the entire experimental catalogue.

Current commands are documented in the runbooks and the [implementation README](../README.md). The implementation plans describe construction milestones, including pending work; contextual reviews describe their stated historical scope. Original execution records remain in [`registros/`](../registros/) with their language and validation scope preserved.
