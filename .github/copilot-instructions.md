# Copilot instructions

Use the root [AGENTS.md](../AGENTS.md) for the repository map, commands and delivery
invariants, and [CONTRIBUTING.md](../CONTRIBUTING.md) for the contribution process.
GitHub Copilot is the intended contributor tool; record the assistant actually
used for each change rather than attributing historical work to Copilot.

Work on the requested deliverable and the human-defined acceptance criteria.
Propose small changes with appropriate tests; keep policy decisions, orchestration
and evidence handling in their existing modules. Use English for code and primary
guides, with Spanish support for changed execution instructions.

Preserve digest/identity binding, independent image signatures and hosted trust
checks. A registry or certificate error is an integration failure, not successful
attack detection. Do not change an oracle or weaken a control to make a test pass.
AI proposals do not count as human review and are excluded from measured manual
tasks and runtime authorization.

For a scenario change, use the task-specific
[scenario-change skill](skills/scenario-change/SKILL.md). Report the checks actually
run, evidence links and remaining limitations. Ordinary local edits do not
authorize remote publication, workflow dispatch, merges or repository settings.

When reviewing a PR, prioritize actionable defects in changed behavior. Check
claims against the pinned tool version, actual caller and tests; distinguish a
reproduced failure from a hypothesis needing integration. Keep synthetic test
coverage separate from real admission evidence. Never mark a human review or
unexecuted check complete.
