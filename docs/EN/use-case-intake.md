# Propose a use case

[Guide index](README.md) · [Español](../ES/use-case-intake.md) · [Contributing](../../CONTRIBUTING.md)

Use the [use-case form](https://github.com/tfm-goldenpath/golden-path-lab/issues/new?template=use-case.yml)
for a new service/language, delivery integration, control, laboratory coverage or
documentation/operator improvement. Search [existing issues](https://github.com/tfm-goldenpath/golden-path-lab/issues)
first. Choose “Unsure or general request” if the category is unclear. English and
Spanish answers use the same form; ordinary questions and defects can still use
existing issue routes.

This is a **public, non-sensitive request**, not a confidential vulnerability
channel. Omit credentials, tokens, personal/customer information, private keys,
private evidence, full logs and evidence archives. The reminder does not detect
secrets automatically or establish a private reporting route.

## Make the request actionable

The five required answers are category, problem/value, a concrete use case,
environment/constraints and observable acceptance criteria. Explain who is
blocked, what happens today and what improvement they could observe. A short
example is more useful than a proposed architecture.

Language/build tool, local or hosted execution, Kubernetes relevance, CPU/RAM/disk,
network and compatibility needs may be **unknown**. State what is known and what
needs investigation; no policy IDs, implementation design or regulatory mapping
are required. Implementation ideas and references are optional.

Write criteria as “given this input, when this action happens, observe this
result.” For a control, distinguish:

- **Permitted input:** what should be allowed, and what observation establishes it.
- **Prohibited input:** what should be rejected, with an attributable decision.
- **Unable to evaluate:** what happens if a registry, verifier or evaluator cannot
  complete. An integration failure is not successful detection; a nonzero exit
  alone does not prove rejection by the intended control.

For documentation, a criterion might be that a newcomer can locate the applicable
command and its prerequisites from the guide. State open questions rather than
inventing successful results or declaring acceptance in advance.

## Reuse existing context safely

Start with [implemented controls](how-it-works.md#finding-a-blocking-control) and
the [readiness matrix](../../implementacion/docs/EN/evaluation-readiness.md).
Reference an existing Fxx/Lxx identifier only if relevant: these are the established
twenty laboratory scenarios, not IDs to allocate or renumber in a request.
**A/B** means local/hosted execution and trust; **R/G** means reference/Golden Path
controls. Local keys do not establish hosted trust integration.

If public evidence helps, link the sanitized observation and identify its source
revision, image digest where relevant, run and execution boundary. Explain what it
shows and what it leaves unknown. Preserve failed/unreached observations. A
successful historical run does not validate a new source revision, and an evidence
link alone does not reauthenticate its signed content. Do not upload private state
or archives to make a request more complete.

## From proposal to implementation

A product change adds or changes behavior offered to a consumer or operator. A
laboratory extension adds a controlled trial and an expected outcome for evaluating
behavior. They may need separate work: a new test does not itself deliver a new
consumer capability, and implemented code does not establish scenario execution.

Maintainers use this lightweight process:

1. Check duplicates, scope and missing information.
2. Identify the affected module/control and relevant existing tests.
3. Define positive, negative and integration-error expectations where applicable.
4. Assess compatibility, evidence requirements and resource cost.
5. Record a planning decision: **needs information**, **candidate**, **deferred**
   or **declined**, with a brief reason and any open questions.
6. If implementation is selected, create a separately scoped branch/PR and a
   validation plan. Laboratory changes follow the [scenario-change instructions](../../.github/skills/scenario-change/SKILL.md).

These are documented triage outcomes, not GitHub labels, automation or a mandatory
board. There is no response SLA or implementation commitment. Submission does not
establish support, authorize implementation or prove a control works. A candidate
is a planning option; implemented means code exists; verified claims need checks
on an identified revision and boundary. Human review/acceptance is recorded
separately, never inferred from submission, merge or green CI.

The [current roadmap](../../implementacion/TODO.md) and
[migration contract](maintainers/repository-map.md#migration-sequence) retain:
physical product/laboratory separation → interface consolidation → independent
consumer template → Java trial. This bounded intake work has its own authorization;
P00/P01 human acceptance, custody and physical restructuring remain separate.
Admission-selection implementation remains blocked by its existing capability and
validation requirements. Intake does not reopen the inconclusive research or
adopt Graphify, Serena or Repomix. Any future regulatory mapping needs separately
sourced review.

## Illustrative requests — unimplemented

Both examples are proposed outcomes, not delivered functionality or run results.

**Java consumer trial.** Category: new service/language. A Java developer wants to
try a small Maven service through the future consumer template, without learning
laboratory fixtures. Example: build the service and deliver its identified image
using the supported interface. Initial environment: local Linux, Kubernetes
relevance and capacity/network limits to be confirmed. Desired observation: an
independent consumer can follow documented prerequisites, invoke that interface
and associate delivery observations with the expected image; unsupported inputs
and unavailable infrastructure have distinct outcomes. This depends on the supported
interface/template work; **Java support and that template do not exist today**.
Build-tool compatibility and validation scope remain questions.

**Vulnerability reassessment.** Category: new control. An operator wants to reassess
a deployed image or check it before redeployment when vulnerability knowledge has
changed. Example: evaluate the same immutable image digest using an identified
scan/database and retain the decision. Environment: Kubernetes workload; local or
hosted evaluation, registry access and resource limits still to be decided. Desired
outcomes: an allowed report is distinguishable from an attributable prohibited
finding; unavailable scanning or mismatched image identity is an evaluation error,
not a clean scan or successful detection. What scan age is acceptable? Which
snapshot and image identity must be recorded, and what action should follow?
This requests a design and validation scope; it implements or promises no
continuous monitoring, revocation or automatic remediation.

## Form maintenance

The [form source](../../.github/ISSUE_TEMPLATE/use-case.yml) follows GitHub's
[Issue Forms syntax](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)
and [form schema](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema)
(consulted 4 November 2026). Local parsing and configuration tests do not prove
GitHub rendering. After merge, open the form from **New issue**, check the fields,
required/optional behavior and guide links, then leave without submitting a test
issue. Human usability review remains separate from an assistant walkthrough.
