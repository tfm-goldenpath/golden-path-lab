# Contributing

Contributions should keep the laboratory reproducible and its conclusions traceable. Start with the [README](README.md), [architecture](implementacion/docs/EN/architecture.md), [delivery contracts](implementacion/docs/EN/delivery-contracts.md) and the relevant scenario record. English is primary for code, tests and contributions; update affected Spanish commands, expectations and explanations alongside the English guide.

## A small, reviewable change

1. Identify the requirement, affected paths and expected acceptance or rejection before implementing it. The contributor owns the test oracle; an assistant may propose it but does not establish its correctness.
2. For new behavior or a defect, add a targeted regression and check that its initial failure concerns the intended behavior. Implement the smallest useful change, then run the relevant regression checks. Do not reconstruct a TDD history for existing code; a characterization test may already pass. Documentation changes need editorial and link checks.
3. Review the diff and evidence. Keep policy rejection distinct from integration failure, preserve failed observations and do not weaken trust, expected results or mandatory checks to obtain a pass.
4. Describe the resulting behavior, checks actually run, limitations and material assistance in the PR. Human review is recorded only when a person has performed it; review by another assistant remains automated review.

Implementation work stays in this repository. Thesis edits, remote publication, releases, workflow dispatch and repository settings require their own authorized scope. Label synthetic unit-test fixtures; use real reports for integration and campaign claims. Keep credentials, private keys and generated evidence packages out of Git.

## Run the existing checks

From the repository root in the Linux devcontainer or Codespaces:

```bash
make -C implementacion doctor
make -C implementacion test
```

`make test` runs environment, service/unit, policy and offline Cosign checks. Targeted entry points are `test-env`, `test-unit`, `test-policies` and `test-bundles`. There are no `lint` or `format-check` targets yet. Report unavailable tools and unrun checks instead of presenting a partial run as complete.

When the change affects registry access, trust, evidence consumption or admission, follow the [runbook](implementacion/docs/EN/cases/L01-F13/runbook.md) for the relevant real integration. The local entry point is `make -C implementacion demo`; GitHub integration is a separate manual workflow on the exact reviewed revision. Ordinary documentation edits do not require a full cluster run.

CI runs the shared tests for pull requests and pushes. Instructions, skills and a passing local command do not enforce merging: required checks and permissions depend on the repository's configured rules. Source files alone do not configure those rules or grant remote access.

## AI assistance and contribution record

AI may propose bounded changes, tests and explanations. People remain responsible for requirements, expected outcomes, review and interpretation. Generative AI does not decide runtime authorization and is excluded from the six measured manual tasks. The project remains usable without an assistant, account or model.

Use the [AI-assisted development guide](implementacion/docs/EN/ai-assisted-development.md) ([español](implementacion/docs/ES/ai-assisted-development.md)), the shared [agent entry point](AGENTS.md), [Copilot instructions](.github/copilot-instructions.md) and, where supported and relevant, the [scenario-change skill](.github/skills/scenario-change/SKILL.md). Verify that the selected client loads the intended guidance; file presence is not evidence of loading or compliance.

For material assistance, use the [PR template](.github/pull_request_template.md) to record the activity, tool/model when known, contribution, human review status, final decision and evidence. A compact entry or a link to an existing record is enough. Do not keep hourly logs or duplicate full conversations. Attribute earlier Codex work to Codex and later Copilot work only when it occurred; do not invent model details, human review or historical test cycles.
