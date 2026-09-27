# GitHub repository protection and configuration

[English documentation](README.md)

This guide defines the proposed settings for the public `tfm-goldenpath/golden-path-lab` repository. It distinguishes existing local workflow definitions, settings to apply in GitHub, and optional extensions. It does not assert that the remote repository has been configured or that hosted integration has passed. Feature availability was checked against official GitHub documentation in September 2026; account and organization policies must also be checked when applying the settings.

The objective is a manageable research repository: reviewed changes, reproducible dependencies, limited workflow privileges and verifiable evidence. These protections support the implementation process; they are not additional cases in the twenty-scenario corpus or proof of regulatory compliance.

## 1. Recommended scope and cost

The usual abbreviation is **GHAS: GitHub Advanced Security**. Current GitHub offerings distinguish **GitHub Code Security** and **GitHub Secret Protection**. Public repositories can use code scanning, secret scanning and push protection without purchasing those products. Private organization repositories have different licensing requirements; a personal student entitlement must not be assumed to cover every organization feature. [GitHub security features](https://docs.github.com/en/code-security/getting-started/github-security-features)

| Capability | Recommendation for this repository |
|---|---|
| Repository branch/tag rulesets | Baseline: protect `main` and release tags. |
| PR lint, unit and policy checks | Baseline: required once implemented and successfully executed. |
| Dependency graph and Dependabot | Baseline repository maintenance; updates require review. |
| Secret scanning and push protection | Baseline: enable/verify their effective status. |
| CodeQL | Optional source-code security analysis, separate from experimental measurements. |
| GitHub repository SBOM export | Optional supplementary inventory in SPDX JSON. |
| Trivy image SBOM and vulnerability report | Existing laboratory design: CycloneDX JSON and separate analysis for the image digest. |
| GitHub build provenance and Cosign evidence | Existing workflow design; validate in the new repository. |
| Actions evidence artifacts and local copy | Baseline: temporary hosted result plus preserved local package. |
| Immutable releases | Recommended for final releases once package assembly is ready. |
| Dependency Review enforcement, Trivy SARIF upload and AI remediation | Future extensions; not required for this TFM baseline. |

Standard GitHub-hosted runners in public repositories have no execution-minute charge. Larger runners are charged, and artifact/cache storage has separate limits and billing conditions. Keep the existing standard Ubuntu runner, short retention and no paid add-ons. Inspect the **organization's** Billing and licensing usage/budgets; do not assume an alert-only budget stops charges. Codespaces has its own account quota. [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## 2. Ownership and repository defaults

Apply these settings after the bootstrap commit and before normal development:

| Location | Proposed value or action |
|---|---|
| Organization → Settings → Authentication security | Require 2FA after confirming current collaborators are ready. Use a passkey/security key or another supported secure method and retain account recovery information. |
| Repository → Settings → Collaborators and teams | Keep administration with the maintainer; grant only the role needed. External contributions normally arrive through forks and PRs. |
| Settings → General | Default branch `main`; enable automatic deletion of merged branches. Allow merge commits to retain useful development history; squash is optional for small changes. |
| Settings → General | Leave automatic merging off initially. Add a license explicitly rather than assuming public visibility grants reuse rights. |
| Settings → Advanced Security | Enable private vulnerability reporting and subscribe to security notifications. |
| Root `SECURITY.md`, added through a PR | Describe supported laboratory versions and the private reporting route; distinguish deliberate test fixtures from accidental vulnerabilities. |

Requiring organization 2FA can remove outside collaborators who have not enabled it, so check the membership impact before applying it. Private vulnerability reporting is a separate setting from merely adding `SECURITY.md`. [Organization 2FA](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-two-factor-authentication-for-your-organization/requiring-two-factor-authentication-in-your-organization), [private reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository), [security policy](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/add-security-policy)

GitHub menu names may appear under **Security and quality**, **Advanced Security**, or **Code security** depending on the interface. Check the effective feature rather than relying solely on a menu label.

## 3. Rulesets for branches and versions

Use **repository-level** rulesets under **Settings → Rules → Rulesets**. Branch/tag rulesets are available for public repositories on GitHub Free, including Free for organizations. Organization-wide rulesets and push rulesets have different plan requirements; they are unnecessary here. If equivalent branch protection already exists, review its combined effect instead of duplicating conflicting rules. [Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)

### `main-reviewed`

Target the default branch and set enforcement to **Active** after the initial checks exist.

| Rule | Recommended configuration |
|---|---|
| Require a pull request | On. Changes enter through a reviewable PR. |
| Required approving reviews | Leave disabled for solo work. Record the student's review in the PR. Require one independent approval only when an actual second reviewer is available. |
| Resolve review conversations | On. |
| Required status checks | Select the actual `quality` and `tests` check names after successful runs. Currently only the existing `tests` job is defined; `quality` is planned. |
| Expected check source | Select GitHub Actions where available; avoid ambiguous duplicate job names. |
| Branch up to date | On, to test against current `main` before merging. |
| Block force pushes / restrict deletion | On. |
| Linear history / signed commits | Not mandatory initially. They are separate from artifact signing and would add workflow constraints. |
| Required deployment or merge queue | Not required for this laboratory. Manual integration is recorded at relevant milestones. |
| Bypass | No routine bypass for the owner, bots or Dependabot. |

Do not enable **Restrict updates** on `main`: that is different from requiring reviewed PRs and can prevent normal updates by everyone except bypass actors. Administrators able to edit settings remain a trust assumption. A ruleset does not protect against complete administrative compromise. [Available rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

The required CI must run on every PR, without workflow-level path filters. `ci.yml` now triggers on every PR and push, including changes limited to documentation or AI guidance. Preserve this coverage when changing triggers: a skipped required workflow can leave the check pending. Only make checks required after they exist and have run successfully; `quality` remains planned. This source change does not configure a repository ruleset. [Required-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)

### `release-tags`

Create an active tag ruleset targeting `v*`, with **Restrict updates** and **Restrict deletions** enabled and no routine bypass. Initially, tag creation can remain available to the maintainer, who is the only ordinary write actor. Revisit creation permissions if other writers join. Never move an evaluated tag to point to a correction: create a new version and preserve previous results. [Creating rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)

Export each applied ruleset as JSON through its menu and retain a reviewed configuration record. The export is evidence of settings at that time, not automatic enforcement in another repository. [Managing and exporting rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository)

## 4. Actions permissions and execution boundaries

Under **Settings → Actions → General**:

- Allow the specific external actions in use: `actions/checkout`, `actions/setup-node`, `actions/attest` and `actions/upload-artifact`. Extend the allow-list through review if another action becomes necessary.
- Enable **Require actions to be pinned to a full-length commit SHA** where available. Keep the existing SHA pins and readable version comments. GitHub's setting permits tag-based reusable workflow references; the project's Conftest rule is stricter and also requires pinned external reusable workflows.
- Select the restrictive default `GITHUB_TOKEN` permissions. Leave **Allow GitHub Actions to create and approve pull requests** disabled for ordinary workflows; Dependabot's native update mechanism does not require enabling broad workflow approval powers.
- Require approval for workflow runs from **all external contributors**. Inspect the proposed changes before approving compute execution.
- Keep artifact/log retention modest; the existing evidence upload explicitly uses fourteen days.

Organization policies can override repository choices. Do not enable all third-party marketplace actions just to make a new workflow run. [Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository), [secure use of Actions](https://docs.github.com/en/actions/reference/security/secure-use)

The existing separation should remain:

| Workflow | Trigger and permissions | Role |
|---|---|---|
| `ci.yml` | PR and push; `contents: read` | Deterministic code and policy checks. Add the planned lint/format checks here. |
| `golden-path.yml` | Manual `workflow_dispatch`; integration job has `contents: read`, `packages: write`, `id-token: write`, `attestations: write` | Publish the laboratory image and verify real provenance, signatures and admission. |
| Optional future CodeQL | Its own supported configuration and narrowly scoped permissions | Source analysis, outside delivery-time measurement. |

Keep write permissions at the job that needs them. `id-token: write` allows OIDC token issuance; it is not permission to modify repository contents. Use the provided `GITHUB_TOKEN`, not a stored broad PAT, for hosted publication. Do not pass deployment credentials to PR tests or execute untrusted PR code through `pull_request_target`. [Token permissions](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)

Use GitHub-hosted runners for contributions rather than exposing a personal persistent runner. The current hosted integration requires `workflow_dispatch`; adding tag/release triggers would require adapting and testing that contract. Creating a release alone does not run the existing integration.

**Optional environment:** a later `lab-integration` environment can restrict jobs to selected reviewed branches/tags, but creating it in Settings has no effect until the job declares `environment:`. It is not necessary for the current ephemeral kind laboratory. Do not require an unavailable independent reviewer or enable prevention of self-review when that would leave a solo maintainer unable to run it. [Deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)

## 5. Dependency maintenance with Dependabot

In **Settings → Advanced Security**, verify the dependency graph, Dependabot alerts and security updates. These have different purposes:

- **Alerts:** report known vulnerable dependencies recognized on the default branch.
- **Security updates:** attempt corrective PRs when supported fixes can be resolved. An alert may have no available repair.
- **Version updates:** periodically propose newer supported dependencies, even without a vulnerability; configured in root `.github/dependabot.yml`.

Sources: [alerts](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-alerts), [security updates](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-security-updates), [version updates](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-version-updates).

Start with weekly updates and a small open-PR limit. This example is documentation, not an installed configuration:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 3
  - package-ecosystem: "npm"
    directory: "/implementacion/services/quotes-node"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 3
  - package-ecosystem: "docker"
    directory: "/implementacion/services/quotes-node"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 3
  - package-ecosystem: "docker"
    directory: "/implementacion/.devcontainer"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 3
```

Add `/implementacion` as an npm update directory only if the planned development-tool manifest/lockfile is created there. `quotes-node` currently has no production dependencies, so absence of npm update PRs can be correct. The PR limit above governs version updates; security updates are handled separately.

Dependabot supports updating SHA-pinned Actions and their version comments. However, GitHub's current advisory-alert coverage excludes SHA-versioned Actions; do not promise that every pinned action will produce a vulnerability alert. Keep pins and review update PRs and advisories. [Supported ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [alert coverage](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-alerts)

Project-specific limits require human review:

- The updater does not maintain custom `versions.env` and `tools.lock.json` entries. Update versions, image digests, download checksums and relevant tests together.
- The delivery script overrides the service Dockerfile image with `SERVICE_NODE_IMAGE` from `versions.env`. A Dockerfile-only PR may therefore leave the actual build unchanged.
- Do not automatically merge updates or grant dependency PRs publishing credentials. CI must still pass and a person checks the effective dependency change.
- Keep deliberately vulnerable fixtures and frozen campaign inputs explicit. New maintenance PRs may continue, but they must not silently replace the version being evaluated. A necessary correction becomes a new revision and separate results.

## 6. Secret scanning, GHAS and optional CodeQL

Verify **secret scanning** and **push protection** for the public repository. Push protection can prevent publication of supported secret patterns; it is not an exhaustive detector or a replacement for excluding credentials. Investigate findings and revoke/rotate any real credential that was exposed. Never bypass a finding simply to complete a push. Synthetic examples must contain no working secret. [GitHub security features](https://docs.github.com/en/code-security/getting-started/github-security-features)

**CodeQL is optional for this iteration.** It analyzes source code and data flows, while the experiment uses Trivy to assess image vulnerabilities. It can improve the repository without changing the agreed single-analyzer experimental design. Neither CodeQL nor Dependabot results count as Trivy detections in the campaign.

If adopted, start with **Settings → Advanced Security → CodeQL analysis → Default** and review supported languages: JavaScript/TypeScript, Python and GitHub Actions workflows. Keep ShellCheck and Conftest/Kyverno tests; CodeQL does not replace their coverage. [CodeQL analysis](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning)

Default setup minimizes maintained YAML, but its documented coverage excludes fork PRs. Advanced setup is a separate option if that coverage becomes necessary; do not run default setup and a competing advanced CodeQL configuration together. Review action allow-list compatibility when enabling it. [Setup types](https://docs.github.com/en/code-security/concepts/code-scanning/setup-types), [default setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning)

A successful analysis job does not mean that no vulnerabilities were found. Optional **Require code scanning results** rules enforce separate tool/severity conditions and have documented exceptions, including some Dependabot/default-setup and merge-queue cases. Start by reviewing results; adopt a blocking policy only with tested coverage and an agreed threshold. [Code scanning merge protection](https://docs.github.com/en/code-security/concepts/code-scanning/merge-protection)

There is also a concrete local compatibility issue: `policies/conftest/workflow.rego` currently rejects `security-events: write` and all write permissions in PR workflows. A future advanced CodeQL or SARIF-upload workflow therefore needs a narrow policy design and tests for that specific reporting capability. Do not remove the general restriction to make a sample workflow pass. CodeQL, Dependency Review, Trivy SARIF publication and automated AI fixes remain optional; none is activated by this guide.

## 7. SBOM exports: repository versus delivered image

| Inventory | Source and format | Use and limitation |
|---|---|---|
| GitHub repository SBOM | Dependency graph → SPDX JSON | Supplementary repository dependency inventory; not proof of the contents of a built image. |
| Laboratory image SBOM | Trivy → CycloneDX JSON | Required inventory of the selected image digest, retained as a file and within a Cosign-signed attestation. |
| Vulnerability report | Trivy analysis → separate report | Findings depend on the analyzed object and vulnerability database; a component inventory alone is not this report. |

For the optional repository export, use **Insights → Dependency graph → Export SBOM** and retain the downloaded file with its retrieval context. GitHub exports the repository's current HEAD, not an arbitrary release reference. Record the contemporaneous HEAD, but do not assume a later export reconstructs an older evaluated version. [Export guide](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/export-dependencies-as-sbom), [asynchronous exports and HEAD limitation](https://github.blog/changelog/2026-04-14-sbom-exports-are-now-computed-asynchronously/)

For future automation, use the documented asynchronous REST flow: request `GET /repos/{owner}/{repo}/dependency-graph/sbom/generate-report`, follow the returned `sbom_url`, wait through pending responses and download the temporary result when ready. The current API reference specifies `201` for generation, `202` while fetching a pending report and `302` when its download is ready. The older synchronous `/dependency-graph/sbom` endpoint is scheduled for removal on **13 November 2026**; do not build new automation around it. This is an optional export, not a new implementation task. [SBOM REST API](https://docs.github.com/en/rest/dependency-graph/sboms)

## 8. GHCR and artifact attestations

### Package access

Use the repository's `GITHUB_TOKEN` for publication. Inspect the package's **Settings → Manage Actions access**, linked repository and visibility. A newly published GHCR package is private by default even when the source repository is public. For a public synthetic laboratory image, explicitly making the intended package public simplifies unauthenticated pulls by kind and Kyverno; verify the package contents first. [Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

The imported code derives the image name from `GITHUB_REPOSITORY`: `ghcr.io/<owner>/<repository>-quotes-node`. For this repository it is `ghcr.io/tfm-goldenpath/golden-path-lab-quotes-node`, distinct from the earlier organization-wide `tfm-quotes-node` package. Verify access after its first publication. An `org.opencontainers.image.source` label can help repository linkage; it is not currently present in the service Dockerfile.

### Evidence producers and consumers

GitHub artifact attestations are available for public repositories on Free/Pro/Team; private/internal use requires Enterprise Cloud. The current workflow definition already uses SHA-pinned `actions/attest`, an image subject name/digest and registry publication. Its `create-storage-record: false` setting does not require adding an artifact-metadata write permission. [Attestation setup](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)

Preserve the existing responsibilities:

| Evidence | Producer | Required consumer behavior |
|---|---|---|
| Image signature | Cosign | Check cryptographic validity, trusted identity and exact image digest. |
| Build provenance | GitHub `actions/attest` | Check authorized repository/workflow, source commit/ref, predicate and image subject. |
| CycloneDX SBOM attestation | Cosign | Check signer, type, inventory contract and subject digest; retain the original file. |
| Verification-results attestation | Cosign | Check policy version, required successful results and digest association. |

The CLI and Kyverno checks remain necessary. A signed claim is not proof that the software is safe or that every claim was produced by an adequately isolated builder. Public attestation infrastructure can expose metadata; exclude confidential data. Do not claim SLSA Build L3 merely because `actions/attest` ran. [Attestation concepts](https://docs.github.com/en/actions/concepts/security/artifact-attestations)

Verification must constrain the exact trusted workflow identity and source, not merely accept any signer in the organization. The new repository name and a branch/tag reference change that identity. Repeat hosted verification after migration, including the same-digest correspondence. The current helpers implement constrained GitHub CLI verification; their existence is not an observed result for the new repository. [Verification options](https://cli.github.com/manual/gh_attestation_verify), [delivery contracts](delivery-contracts.md)

GitHub can also attest a provided SBOM, but adding that would duplicate the selected Cosign SBOM path. Leave it optional and keep one mandatory SBOM contract.

## 9. Actions artifacts, releases and preservation

The current workflow uploads `implementacion/evidence/packages/**` as `golden-path-<run-id>-<attempt>` with fourteen-day retention. Signed-in users with repository read access can download artifacts, so public-repository artifacts are not confidential storage. Review the package before sharing and retain a verified copy outside Codespaces before expiry. Do not include keys, credentials or unrestricted private logs. [Downloading artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)

Keep a package manifest containing the evaluated commit/tag, run identifier, configuration, tool/database versions, artifact digests and file checksums. Distinguish a successful upload from cryptographic provenance: uploading a ZIP does not turn its contents into signed delivery evidence. Logs and artifact retention do not replace the versioned evaluation package and local copy.

When packaging is stable, enable **Settings → General → Releases → Enable release immutability** for future releases. Use this order:

1. Evaluate the fixed candidate and assemble the reviewed package/checksums.
2. Create a draft release associated with the intended version.
3. Attach every intended asset and verify its correspondence to the evaluated commit.
4. Publish the complete draft.

Immutable releases lock published assets and the associated tag; title and release notes can still change. GitHub also creates a release attestation, which is distinct from image build provenance and policy-result attestations. A workflow that waits for `release.published` and then tries to attach evidence is incompatible with this model: upload assets while the release is still a draft. [Enable release immutability](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes), [immutable release behavior](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)

If the final documentation release differs from the measured candidate, identify both revisions. New code or dependency fixes are evaluated separately; do not rewrite historical tags, bundles or unfavorable observations.

## 10. Applying and checking the configuration

Follow this order to avoid requiring checks that do not yet exist:

1. **Bootstrap:** create the repository, import the reviewed base, set access/2FA, runner permissions and dependency/secret features.
2. **First CI:** execute the existing tests; implement and validate the planned quality checks. Record their actual names.
3. **Protection:** activate the `main` and tag rulesets; verify a failing test PR cannot merge and a corrected PR can. Close the test change without keeping a deliberate defect.
4. **Maintenance:** add Dependabot configuration through a PR; inspect effective image/tool versions before accepting an update.
5. **Hosted integration:** verify package access and run L01/F13/F11 on the reviewed revision; download and inspect the evidence package. See the [execution guide](cases/L01-F13/runbook.md).
6. **Optional analysis:** introduce CodeQL only as a separately reviewed maintenance decision, with its coverage and permissions documented.
7. **Campaign/release:** record effective settings, freeze the candidate and verify package preservation; enable immutable releases when the draft-and-assets process is ready.

Keep one short configuration record with exported rulesets, effective Actions permissions/allow-list, enabled security features, required check names, GHCR access, retention and links to validation runs. Record optional features as disabled/pending when that is their state. This provides evidence for the thesis without a daily administration log. No remote settings, Dependabot configuration or additional workflows have been applied by creating this guide.
