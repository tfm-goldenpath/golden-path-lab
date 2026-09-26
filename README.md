# Golden Path Lab

[English](README.md) | [Español](README.es.md)

A reproducible laboratory for early policy checks and verifiable software delivery to Kubernetes. The implementation supports the TFM **Golden Path para la entrega cloud-native: verificación temprana de políticas e integridad en el flujo CI/CD**. Thesis authoring and its research decisions remain in the [thesis repository](https://github.com/tfm-goldenpath/golden-path).

The synthetic `quotes-node` service makes delivery behavior observable without requiring a complex business application. The current demonstration exercises a legitimate delivery (**L01**), missing signed authorization (**F13**) and directed checks against a privileged workload (**F11**).

## Quick start in Codespaces or a devcontainer

Select the **implementacion** devcontainer configuration. Once its setup completes, run these commands from the repository root:

```bash
cd implementacion
make doctor
make test
make demo
```

The expected successful demo ends with `PASS: L01 accepted; F13 and F11 rejected`. It creates an ephemeral kind cluster and registry, verifies delivery evidence and removes the resources it created. Evidence packages remain locally under `implementacion/evidence/packages/`.

The [execution guide](implementacion/docs/EN/cases/L01-F13/runbook.md) explains prerequisites, expected responses and troubleshooting. A [Spanish guide](implementacion/docs/ES/cases/L01-F13/runbook.md) is also available. Tool versions and checksums are fixed in `implementacion/versions.env` and `implementacion/tools.lock.json`; the actual Codespaces quota depends on the account.

## Language and documentation

English is the primary language for the implementation and technical documentation to support international contribution and reuse, and to keep terminology consistent with the cloud-native ecosystem. This follows a common industry convention, rather than a mandatory technical standard. For example, [Kubernetes maintains English source documentation with community localizations](https://kubernetes.io/docs/contribute/localization/). The thesis and its academic rationale remain in Spanish.

Code, comments, tests, project-generated messages, workflow labels and the primary technical guides use English. The [documentation index](implementacion/docs/README.md) groups primary guides under `docs/EN/` and supporting guides under `docs/ES/`. The [Spanish entry point](README.es.md) supports thesis readers. Historical validation records under `implementacion/registros/` and the external-proposal review retain their original language and observations.

Maintain one implementation per scenario: `F13` has the same inputs, identifiers and acceptance criteria in both languages. Case documentation lives under `docs/EN/cases/L01-F13/` and its Spanish counterpart; executable scenarios remain shared in `tests/scenarios/`. Prefer English for commits, PR descriptions and future contributor or AI-assistance instructions. Keep executable paths, JSON fields, error codes and rule IDs stable. When behavior changes, update the English guide and the affected Spanish commands and expected outputs in the same change; explicitly mark any explanation that has not yet been synchronized. Translations must not rewrite historical logs or evidence packages.

The [language revision validation](implementacion/registros/language_normalization_EN.md) records passing checks and the remaining Windows Conftest runtime limitation.

## Evaluation configurations and execution lanes

- **R/G:** the reference path delivers the service; the Golden Path adds the selected security controls and evidence checks.
- **A/B:** lane A uses local development keys and infrastructure; lane B uses real GitHub identity, GHCR and hosted attestations. Local execution does not prove hosted identity integration.

The current demo is a functional integration check, not the complete twenty-scenario experiment or a timed campaign.

## Repository structure

| Path | Responsibility |
|---|---|
| `.devcontainer/implementacion/` | Repository-level Codespaces entry point. |
| `.github/workflows/ci.yml` | Existing service, unit and policy tests on relevant PR/push changes. |
| `.github/workflows/golden-path.yml` | Manual hosted build, evidence verification and admission demonstration. |
| `implementacion/services/quotes-node/` | Synthetic API, tests and image definition. |
| `implementacion/scripts/` | Delivery entry points, reusable modules and evidence processing. |
| `implementacion/policies/` | Conftest and Kyverno controls. |
| `implementacion/tests/` | Configuration, unit, policy and scenario tests. |
| `implementacion/docs/EN/`, `implementacion/docs/ES/` | Guides grouped by language, with shared topics and case-specific specifications/runbooks. |
| `implementacion/registros/` | Validation records, distinguishing prior observations from this import. |
| `implementacion/Makefile` | Shared local and CI commands. |

See the [implementation README](implementacion/README.md) for the module responsibilities and [architecture](implementacion/docs/EN/architecture.md) for their contracts.

## GitHub integration and repository protection

The hosted workflow must be present on the default branch before it can be dispatched. Run **Golden Path GitHub integration** on a reviewed revision. It publishes to `ghcr.io/<owner>/<repository>-quotes-node`; for this repository the destination is `ghcr.io/tfm-goldenpath/golden-path-lab-quotes-node`.

Review package access, the exact authorized workflow identity and the resulting image digest. The workflow uses `GITHUB_TOKEN` and OIDC, and exports an evidence artifact with fourteen-day retention. Preserve a verified local copy.

The [GitHub configuration guide](implementacion/docs/EN/github-configuration.md) covers rulesets, Actions permissions, Dependabot, optional CodeQL, SBOM exports, attestations and releases. Adding these source files does not apply repository settings. The extra lint/format gate described there is a subsequent increment, not an existing command.

## Implementation status and next increments

This base imports an existing prototype. The [import validation record](implementacion/registros/validacion_importacion_ES.md) identifies checks performed in this checkout. Earlier [integration observations](implementacion/registros/validacion_integracion.md) remain historical evidence; hosted execution in this repository and reproduction in Codespaces must be established separately.

After reviewing the import, introduce the agreed development guidance and automatic quality checks through separate changes, validate hosted integration, then complete scenario fixtures and the evaluation runner. Short-lived branches merge into `main`; scenarios remain versioned tests rather than permanent branches. Fix a tag and commit for the campaign and preserve results from subsequent corrections separately.

The [implementation plan](implementacion/TODO.md) lists deliverables; older unchecked entries must be reconciled with the implemented increments and their remaining acceptance conditions. No release version is assigned by this import. License selection remains pending; this repository does not yet declare a reuse license.
