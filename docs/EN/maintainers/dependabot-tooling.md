# Tooling version-update schedule

[Español](../../ES/maintainers/dependabot-tooling.md) · [TODO](../../../implementacion/TODO.md)

Baseline: merged main `9e68811b13cb202bc0231ba1b9b0de3e8f592ae4`, inspected on
3 November 2026. Branch `chore/dependabot-tooling`. Repository-local checks found
no existing Dependabot YAML, Renovate JSON/JSON5/rc configuration or embedded
package configuration. This adds one updater definition, not another updater.

## Scope and operation

[dependabot.yml](../../../.github/dependabot.yml) adopts the requested configuration
without deviation: npm only at `/implementacion/tooling`, weekly Monday 08:00
`Europe/Madrid`, three open version-update PRs, `versioning-strategy: increase`.
Only `ajv`, `ajv-formats` and `ajv-formats-draft2019` minor/patch **version updates**
join `schema-validation`. Majors and all `@devcontainers/cli` updates remain
individual PRs. No ignore rules, registry credentials, automerge or approval
workflow is added. Existing exact pins and all dependency files remain unchanged.

The [official options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference),
checked on 3 November, supports these settings. `increase` raises requirements;
it does not convert an existing range into an exact pin. Reviewers must preserve
exact pins. The three-PR limit concerns version updates; security PRs have a
separate GitHub-managed limit (currently ten). Directory scope bounds this
schedule, **not repository-wide alerts or pre-existing security-update behavior**.
No repository settings or security-update configuration were changed.

Vulnerability/scenario fixtures, service examples, historical evidence, optional
Codex manifests and devcontainer configuration lie outside the selected directory.
No global advisory suppression protects fixtures; their intentional vulnerabilities
and review requirements remain intact. No Actions/Docker/devcontainer/Codex
schedule is added; updating the tooling CLI is a separate npm dependency proposal.

Merging into the default branch enables version-update proposals. After merge,
inspect **Insights → Dependency graph → Dependabot** for the npm location, last
job and update logs, following [GitHub's operation guide](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates).
Record the actual job identity, configuration revision, outcome and any generated
PRs; an empty update set may be legitimate. Do not infer a service run from local
parsing/CI or trigger upgrades merely to demonstrate activity.

## Reviewing a future bot PR

1. Inspect release notes, advisories and the manifest/lock diff, including resolved
   integrity and transitive changes. Preserve exact pins and the directory boundary.
2. Check AJV/plugin compatibility together. Current accepted versions are AJV
   **8.20.0**, formats **3.0.1**, international formats **1.6.1**.
3. Deliberately review/update the independent installed-version guard in
   [validate-sbom-schema.mjs](../../../implementacion/scripts/validate-sbom-schema.mjs),
   [SBOM tests](../../../implementacion/tests/unit/sbom-schema.test.mjs) and
   [CycloneDX guide](../../../implementacion/schemas/cyclonedx-1.7/README.md) when needed.
   Preserve offline resolution, schema hashes, mismatch rejection, full/international
   formats and no coercion/default insertion. Never derive accepted versions from
   the bot-edited manifest or delete guards to obtain green CI.
4. Run checks appropriate to the dependency and the required shared suite. AJV
   changes need SBOM contract/format/mismatch tests. CLI **0.89.0** is independently
   asserted in [Lane A tests](../../../implementacion/tests/unit/lane_a_validation_test.py);
   [lane-a-validation.py](../../../implementacion/scripts/lane-a-validation.py)
   installs the locked tooling and copies the launcher outside the lifecycle's
   reinstall path. CLI changes may require separate launcher/devcontainer integration
   in their own PR. Adding this schedule requires no such laboratory execution.
5. Merge only after review. A package-only bot PR may correctly fail existing
   guards: diagnose the failing contract, add an explicitly reviewed compatibility
   adjustment or reject/defer the upgrade. Do not bypass CI or approve automatically.

## Existing PR #23 and evidence

Read-only inspection found [PR #23](https://github.com/tfm-goldenpath/golden-path-lab/pull/23)
still OPEN at `7d5734000e2b3a71d4585c463c1aead004b9a26d`. Its two-file patch upgrades
AJV 8.17.1 → 8.20.0. Its manifest already equals current main; its lock retains
fast-uri **3.1.8**, whereas main has **3.1.9**. That is the only differing package
entry in the inspected locks. Main already includes the validator guard, tests
and documentation from the [dependency refresh](dependency-refresh-validation.md).
Recommendation: the owner should review and close #23 as superseded, rather than
merge its stale lock. This task neither closes, merges nor comments on it.

Raw API responses, comparison and local check logs are retained outside Git in
`implementacion/evidence/raw/dependabot-tooling-20261103/`. The configuration test
uses pinned Conftest YAML parsing and stdlib unittest, including negative scope,
group, ignore/credential and duplicate-updater mutations. It checks exact-pin
shape/lock consistency without replacing independent accepted-version guards.
These are configuration tests, not a dependency resolver or real bot execution.
Local validation passed with `PATH="$PWD/implementacion/.tools/bin:$PATH"`:
5 configuration tests, 13 SBOM tests, 16 Lane A tests, `make doctor`, complete
`make test` (9 environment, 1,000 service/unit, 124 Python policy, 153 defense,
22 release tests plus Rego/Kyverno, F01/F02 and local Cosign), exact inventory of
538 paths, 10 inventory tests, 179 local links and `git diff --check`. The initial
configuration test failed because the file was absent, then passed after creation.
Execution-source hashes identify the tested working tree; normal final-commit
push/PR CI results are recorded in the PR; the first observed service
job remains pending after merge. Configuration correctness alone establishes
neither dependency compatibility nor a completed Dependabot run.

## Rollback and review

To retire this schedule, remove `.github/dependabot.yml` in a reviewed PR and
update its contract test/inventory accordingly, retaining these observations.
Do not delete evidence, suppress alerts or change security-update settings. Existing
security PRs and repository-wide alert behavior are a separate concern. No new
credentials, packages, images or persistent services were created. Codex assisted
configuration, tests and documentation; human review remains pending. P00/P01,
admission and experimental acceptance gates remain unchanged.
