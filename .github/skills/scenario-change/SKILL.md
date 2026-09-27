---
name: scenario-change
description: Implement or review a bounded Golden Path Lab scenario change with an explicit oracle, isolated fault and attributable evidence. Use for Fxx/Lxx scenario extensions or regression fixes, not for running the measurement campaign or unrelated documentation edits.
---

# Change a laboratory scenario

Follow [repository guidance](../../../AGENTS.md). This skill packages the existing
scenario-development procedure; it does not grant execution permissions or define
new research acceptance criteria.

## Establish the oracle

Use the [compact record](../../../implementacion/templates/ficha_escenario.md)
and the relevant [case documentation](../../../implementacion/docs/EN/cases/).
Preserve the academic ID and identify the documentary revision used. State the
valid starting input, primary alteration, control property, actor capability,
expected detection phase and latest blocking point. Include a legitimate
counterpart and an attributable diagnostic. If these are unclear, propose the
missing expectation for human decision before changing what the test accepts.

For a regression, retain the approved expectation and reproduce the defect with
the smallest representative input. Label synthetic responses explicitly; they
can test the classifier but cannot establish real cluster admission.

## Make the bounded change

1. Add a test for the intended behavior and observe its initial failure where
   possible. Record what actually happened; tests written later are regression
   tests, not evidence of a retrospective red-green cycle.
2. Reuse `implementacion/scripts/lib/` operations. Put scenario-specific
   preparation and assertions in `implementacion/tests/scenarios/`; place a new
   control in `implementacion/policies/` or its evidence validator, not inside the
   scenario oracle. Keep `demo.sh` responsible for ordering and shared cleanup.
3. Source modules without starting work. Preserve context and phase boundaries.
   Do not wrap an entire Bash stage in `if`, `!` or `||`: this can suppress error
   stopping within the function. Capture an expected rejection at the specific
   external command and classify its response.
4. Check acceptance, intended rejection and an unrelated integration error. For
   changes to the admission classifier, exercise the actual scenario function;
   orchestration tests substitute stages and cannot prove attribution.

Read the [architecture extension procedure](../../../implementacion/docs/EN/architecture.md#extending-a-scenario)
and [delivery contracts](../../../implementacion/docs/EN/delivery-contracts.md)
when wiring the change. Preserve protected scope and CREATE/UPDATE behavior.
Do not widen trusted identities, disable verification or substitute another
attestation for the image signature to make the scenario succeed.

## Verify and report the right scope

From the repository root, select the affected tests in the
[Makefile](../../../implementacion/Makefile): `make -C implementacion test-unit`,
`test-policies` or `test-bundles`. The full `make -C implementacion test` runs those
plus environment tests. Describe any unavailable prerequisite explicitly.

Use the [runbook](../../../implementacion/docs/EN/cases/L01-F13/runbook.md) for
authorized real integration. A CLI check does not prove Kyverno admission; a local
run does not prove hosted OIDC. Preserve the altered input, raw response, rule,
image digest, revision and run ID. An unreached barrier or a registry/trust error
is not an attributable policy rejection. Keep directed checks separate from the
twenty-scenario denominator and integration timings separate from campaign data.

Update the operational record and affected EN/ES instructions with observed
results or an explicit pending status. Hand off the diff, checks, limitations and
contribution record for human review. Leave that review pending until performed.
