# F03 / F04 / L02 execution and handoff

From the repository root, in the pinned Linux devcontainer:

```bash
make -C implementacion doctor
make -C implementacion test
# Existing preserved scanner snapshot, with db/trivy.db and db/metadata.json:
GP_VULNERABILITY_DB="$PWD/implementacion/.tmp/vulnerability-selection/db-snapshot" \
  make -C implementacion vulnerabilities
```

`vulnerabilities` runs doctor before `demo.sh local vulnerabilities`. It creates
only the owned local registry/cluster, builds a baseline and four isolated fixture
images, scans original SBOMs with one frozen database, checks negative attribution,
compares F03 reference behavior, and authorizes/admit-checks both positive images.
Without `GP_VULNERABILITY_DB`, it downloads one current database and freezes it;
changed advisory findings can invalidate the selected oracles. It never silently
changes an expected finding to get a pass. Recreate the pinned devcontainer to
resolve prerequisites; do not change pins, trust or host networking.

The final `result.json` can say PASS only after all three cases complete. Each
case starts INCOMPLETE. Negative trials require BLOCKED analysis with an exact
target diagnostic; scanner/evaluator errors and unexpected acceptance fail the
procedure. Positives require fresh analysis and authorized evidence for their
own digest. F03's target removal alone is insufficient if any other HIGH/CRITICAL
finding remains. Reference and protected HTTP outputs must agree.

Inspect `evidence/raw/run-*/{F03-vulnerable,F03-repaired,F04,L02}/`, the top-level
`remediation-comparison.json`, completion records, logs and packaged summaries.
Preserve `.tmp/vulnerability-db-run-*/db/` outside Git before disposing of the
workspace. Packages intentionally omit the large database bytes, credentials,
private keys and state. Failed execution still packages allowed evidence.

## Checks actually performed during development

Evidence directory: `implementacion/evidence/raw/vulnerability-development/`
(ignored, local workspace only).

- Real package filesystem scans: minimist 1.2.5 CRITICAL, minimist 1.2.8 no
  findings, ip 2.0.1 HIGH, lodash.unset 4.5.2 two MEDIUM findings. All four used
  the selected frozen DB. Original reports and scan logs are retained.
- Real filesystem CycloneDX inventories also confirm each pinned component and
  npm PURL, including repaired minimist 1.2.8. These are package inventories, not
  inventories from newly built images.
- Actual harmless dependency checks: PASS for all four; F03 outputs identical.
- Real scan of a retained original image SBOM: completed to characterize the
  pinned report contract. This is not a new fixture image scan or delivery.
- Initial candidate scan raced snapshot preparation and failed with “first run
  cannot skip downloading DB”; its original log is retained. The recorded
  successful scans ran after snapshot creation; that failure was not a denial.
- Regression checks include real Conftest decisions on labelled synthetic inputs,
  the actual evaluator/scenario functions with substituted external stages,
  database drift, global threshold, attribution, fresh state and failure stopping.
  Consult `completion.json` for final shared-suite results.
- `doctor`: FAIL, kubectl 1.37.0 instead of pinned 1.35.8. The explicit integration
  entry point also stops at this prerequisite. No new fixture image build, image
  scan, signature issuance, Kubernetes request, rollout or HTTP trial executed.
  Earlier local cluster/network blockers are not established as resolved.

## Hosted regression (instructions only)

This change adds no hosted fixture execution or native provenance issuance for
fixture images. `demo.sh github vulnerabilities` rejects the unsupported lane
before infrastructure creation. Do not upload vulnerable fixtures remotely.
After separate authorization to publish a reviewed revision, the existing normal
workflow can be used as a regression path:

```bash
gh workflow run golden-path.yml --repo tfm-goldenpath/golden-path-lab \
  --ref <published-reviewed-branch-or-tag>
gh run list --repo tfm-goldenpath/golden-path-lab --workflow golden-path.yml --limit 5
```

No dispatch, push or settings changes were performed for this increment. Even a
successful normal hosted run would not complete hosted F03/F04/L02. Hosted support
for the changed SBOM analysis still requires a fresh real regression run.

Proposed PR: **Implement local F03/F04/L02 vulnerability analysis and remediation trials**.
Describe original-SBOM analysis, frozen data, isolated real package fixtures,
strict target attribution and fresh positive authorization. State the real
package-level observations separately from NOT_EXECUTED image/admission trials;
include final tests and leave human review pending.

For independent prerequisite checks, the existing suite and retained failure/database evidence, use [lane A validation](../../lane-a-validation.md). Its current local attempts stop at doctor; they do not close this case’s pending integration boundaries.
