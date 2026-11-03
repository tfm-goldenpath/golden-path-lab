# GitHub Actions refresh — 3 November 2026

This bounded maintenance starts at merged main
`0b2ab83d24b1841e19f9ef52fd956ac7f6ce4ee4` (PR #69), on
`chore/github-actions-refresh`. It does not change application dependencies,
security-tool pins, admission, benchmark conclusions or the frozen demonstration.
[Español](../../ES/maintainers/github-actions-refresh.md).

## Reviewed references

Official releases, tag objects (all resolved directly to commits), commit metadata,
`action.yml`, README and available package metadata were consulted on 3 November.
The eight production references cover `ci.yml`, `golden-path.yml`,
`lane-a-validation.yml`, `paired-rg.yml` and `demo-pages.yml`.
Full commit pins follow [GitHub's secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).

| Official release | Previous version / SHA | Selected version / SHA |
| --- | --- | --- |
| [setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0) | 7.0.0 / `820762786026740c76f36085b0efc47a31fe5020` | 7.1.0 / `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| [upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) | 7.0.1 / `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` | 7.0.2 / `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |
| [upload-pages-artifact](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0) | 4.0.0 / `7b1f4a764d45c48632c6b24a0339c27f5614fb0b` | 5.0.0 / `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| [configure-pages](https://github.com/actions/configure-pages/releases/tag/v6.0.0) | 5.0.0 / `983d7736d9b0ae728b81ab479565c72886d7745b` | 6.0.0 / `45bfe0192ca1faeb007ade9deae92b16b8254a0d` |
| [deploy-pages](https://github.com/actions/deploy-pages/releases/tag/v5.0.1) | 4.0.5 / `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` | 5.0.1 / `368f82528645a54fb793d4d04e342629a3f51346` |
| [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1) | 7.0.1 / `3d3c42e5aac5ba805825da76410c181273ba90b1` | unchanged |
| [attest](https://github.com/actions/attest/releases/tag/v4.2.2) | 4.2.2 / `1e69f48acb82d1966a394da916b4c1698aa569d6` | unchanged |
| [devcontainers/ci](https://github.com/devcontainers/ci/releases/tag/v0.3.1900000450) | 0.3.1900000450 / `513af61f4de4f75d37e4438f184ba4358f0fc1ca` | unchanged; version comment made precise |

The selected JavaScript actions use Node 24; configure/deploy Pages move from
Node 20. Node 24 requires runner **v2.327.1 or newer**, as documented by
[setup-node](https://github.com/actions/setup-node/blob/949feb2413d6458794dcd2491c4babbbce0c15c1/README.md).
The existing checkout's authenticated Git operations inside Docker actions have
a separate v2.329.0 requirement. The workflows still use GitHub-hosted Ubuntu 24.04,
`persist-credentials: false`, existing fetch depths, timeouts and permissions.
The application/tooling Node pin remains **24.22.1**, independent of the Action runtime.

Setup-node 7.1 adds version/manifest handling and dependency updates; our existing
`node-version` input/output contract remains applicable. All three uses explicitly
set `package-manager-cache: false`, with no explicit `cache` input, to avoid future
package metadata silently enabling caches in CI, privileged delivery or paired
measurements. Upload-artifact 7.0.2 updates its artifact client to 6.3.1, including
429/Retry-After retry handling. Configure Pages preserves `enablement: false`;
deploy Pages retains `page_url` and adds capped/backoff polling. No caller depends
on a removed input/output.

**Nested dependency:** the official Pages v5 composite still pins upload-artifact
**7.0.0**, `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`, with an artifact-client
`^6.2.0` dependency. Direct 7.0.2 updates do not replace this dependency. We retain
that reviewed official composite, test its actual service round trip and do not
claim every bundled dependency is newest. Its Linux tar command dereferences
links; the existing verified-site inventory rejects links/special files before
that command runs.

The eight repository public-advisory queries returned no entries. Additional npm
advisory queries found [GHSA-6q32-hq47-5qq3](https://github.com/advisories/GHSA-6q32-hq47-5qq3)
(artifact 2.0.0–<2.1.2) and
[GHSA-9w6v-m7wp-jwg4](https://github.com/advisories/GHSA-9w6v-m7wp-jwg4)
(http-client <1.0.8). Reviewed artifact dependency ranges exclude that affected
range, including deploy-pages' separate `^2.1.8` API client. This scoped check is
not a complete transitive audit or proof of absence of vulnerabilities. The
retained devcontainers distribution tag has no root README/package.json; those
404 responses remain in the record, alongside its actual action definition.

## Policy and packaging boundary

Only the two reviewed exact SHAs change in the Pages privilege exception in
[workflow.rego](../../../implementacion/policies/conftest/workflow.rego).
Manual/main guards, dependency on successful validation, exact permissions,
GitHub Pages environment, no enablement and prohibition of extra privileged
steps/settings remain intact. Tests exercise real Conftest parsing/evaluation,
including wrong/floating pins, injected actions/shell/environment, permission
expansion and guard/dependency bypasses. No PyYAML dependency is introduced.

The existing locked transport was fetched and verified with
[pages.py](../../../implementacion/scripts/defense-demo/pages.py), including
validation **before extraction**. Its SHA-256 remains
`deba74a10eb63503cfbe58b1e447f3d1cbb06a2ed9f404ddd0c2519c4cbf7a92`.
All **541 files / 60,567,916 bytes** have no hidden path components. Local packaging
with the reviewed composite's Linux tar command preserved all file hashes and
sizes; member paths/types were checked without extracting the resulting tar.
Thus explicit `include-hidden-files: false` preserves this site. No historical
site bytes, frozen checksums or publication lock were regenerated.

Ordinary read-only CI adds a synthetic three-file Pages packaging smoke with
source SHA/run/attempt identity and harmless hidden exclusion markers. It uses
the same pinned composite, with no Pages permission or deployment. The
[helper](../../../implementacion/tests/integration/actions-artifact-smoke.py)
checks the downloaded ZIP/tar without extraction, against expected input hashes
computed independently from the selected run identity. It rejects extra/missing
files, changed bytes, links, unsafe paths, duplicate members and wrong identities.
The smoke artifact expires after one day; retained verification receipts survive
that service retention window. Static workflow evidence keeps its existing
14-day retention and `always()` upload, including failed runs.

## Validation record

Raw outputs, upstream responses and verification receipts are ignored under
`implementacion/evidence/raw/github-actions-refresh-20261103/`. They identify the
executed source/worktree hashes; local checks before commit are not attributed to
a later commit. Initial environment: 4 cores, 15 GiB reported RAM; workspace
8.6 GiB free, separate `/tmp` filesystem 108 GiB free. No Docker builds, cluster,
registry, scanner database, benchmark or tool installation was performed.

Local checks passed with `PATH="$PWD/implementacion/.tools/bin:$PATH"`:

- `make -C implementacion doctor` and `make -C implementacion test`: 9 environment,
  1,000 service/unit, 119 Python policy, 153 defense and 22 release tests; real
  local Cosign checks, static F01/F02 and Rego/Kyverno checks also pass.
- Focused tests: 4 workflow/cache/Pages tests, 5 artifact tests, 112 hosted/source
  contract tests, 16 Lane A tests and 13 frozen-publication tests.
- Production workflow Conftest: 45/45; exact inventory: 534 paths; 10 inventory
  regressions; 160 local documentation links; `git diff --check`.
- Parsed workflow comparison preserves all structure outside the enumerated pins,
  explicit cache/hidden inputs and the two non-deploying CI smoke steps.

The new explicit-input regressions first failed for absent cache/hidden settings;
all changed behavior now passes. Exact-commit CI and downloaded-artifact results
are recorded separately below. A green shared suite is not real OIDC or Pages
deployment evidence.

## Remaining hosted boundaries and rollback

Pages configure/deploy execution remains **NOT_EXECUTED**. After human review,
merge and separate publication authorization, use the existing frozen package:

```bash
gh workflow run demo-pages.yml --repo tfm-goldenpath/golden-path-lab --ref main
```

This reads existing Pages settings, uploads the verified site and **publishes
GitHub Pages**; it cannot enable Pages and must not be dispatched on this branch.
Then follow the [public verification guide](../../../implementacion/docs/EN/defense/github-pages.md).
No release creation or frozen-site rebuild is needed. Do not relax the main guard.

Attest and devcontainers/ci implementations are unchanged: no new hosted
identity/provenance or launcher execution is claimed or required just to refresh
their comments. Golden-path, paired and lane-A manual workflows were not dispatched.
Static regressions preserve two image-specific provenance steps, G-only paired
issuance, exact source restrictions, credential removal and failure evidence.
A future change to attestation/launcher implementation requires its separate
hosted boundary; paired validation must use development data and exact merged
main, never a new campaign for this maintenance.

Rollback the refresh commits together: workflow pins/inputs, matching two Pages
policy pins, smoke helper/tests and CI steps. Do not revert historical evidence,
frozen assets or unrelated later work. Human review remains pending; Codex assisted
implementation, checks and this record. Admission remains INCONCLUSIVE and the
retrieval pilot remains insufficient evidence to change navigation.
