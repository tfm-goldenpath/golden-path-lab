# AI-assisted development

[Español](../ES/ai-assisted-development.md) · [Contributing](../../../CONTRIBUTING.md) · [Documentation](README.md)

AI assistance supports implementation and documentation; it is not part of the delivery trust model. People own requirements, expected test outcomes, review and interpretation. An assistant can propose a scoped change, tests or an explanation, and run authorized checks. Its output and another assistant's review still need assessment against the requirements and evidence.

## Repository guidance

| File | Role |
| --- | --- |
| [Root `AGENTS.md`](../../../AGENTS.md) | Shared project context, scope, commands and critical constraints for supporting assistants. |
| [Copilot instructions](../../../.github/copilot-instructions.md) | Concise repository-wide guidance for supported Copilot features. |
| [Scenario-change skill](../../../.github/skills/scenario-change/SKILL.md) | Reusable procedure for a bounded scenario change: contract, fixtures, checks and evidence. |
| [Contribution guide](../../../CONTRIBUTING.md) and [PR template](../../../.github/pull_request_template.md) | The same review and reporting process for assisted and unassisted contributions. |

Support and instruction loading vary by client and feature. Confirm the intended files are loaded in the chosen client before relying on them. Do not assume that links or nested instructions are read automatically. See GitHub's [instruction support matrix](https://docs.github.com/en/copilot/reference/custom-instructions-support) and [agent skill documentation](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills).

These files provide guidance, not a sandbox or an enforced security boundary. Tests and policies check behavior; tool permissions and configured repository rules constrain actions. A skill does not replace CI or admission, and a workflow file does not itself make a check mandatory for merging. This increment adds no hooks, MCP connections, custom agents or remote permissions. Add those only for a concrete need with an explicit access scope; local hooks, if introduced later, remain supplementary feedback.

## Working method

Define the expected behavior and allowed paths first. For a new behavior or defect, inspect a targeted failing test, make the scoped change and repeat appropriate regressions. A missing executable is an environment failure, not a valid TDD red phase. Keep legitimate and invalid inputs, inspect rejection causes and preserve failures instead of changing expectations to manufacture success. Do not invent earlier red/green cycles; existing behavior can use characterization tests and documentation can use editorial/link checks.

Use the actual shared commands from the repository root in the Linux development environment:

```bash
make -C implementacion doctor
make -C implementacion test
```

Choose targeted checks and real integration according to the [contribution guide](../../../CONTRIBUTING.md). Verify on the relevant revision and retain its evidence. Unit tests, synthetic fixtures, offline cryptography and hosted admission support different claims; an earlier passing run does not validate a later correction.

The twenty-scenario method is unchanged. Deterministic controls decide runtime authorization; generative AI is excluded from the six measured manual tasks. Assistance is not an additional experimental treatment or proof of productivity. Preserve separate R/G configurations and local/hosted trust; do not weaken a requirement to make a deliberately invalid scenario pass.

## Lightweight, truthful attribution

Use the PR template or an existing linked record for material contributions. Record the activity, assistance and tool/model when known, human review status, decision and evidence. Keep review pending until a person has performed it. Automated tests and AI reviews do not count as human review. Preserve actual tool attribution, including historical Codex contributions; planned Copilot use is not completed use.

One concise entry per meaningful contribution is sufficient. No hourly diary or full prompt archive is required. Keep secrets, private keys and real customer data out of prompts and repository files. The laboratory and its checks remain usable without AI.
