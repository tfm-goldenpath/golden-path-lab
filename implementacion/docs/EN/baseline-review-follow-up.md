# Baseline review follow-up

This proposal reviews all discussion comments, inline comments and review summaries on the eight merged PRs in the **Repository baseline** milestone. It is based on merged PR08 (`6962c18`). Historical validation records remain unchanged.

## Findings and disposition

| PR and finding | Disposition in this proposal |
|---|---|
| [PR01: live Debian packages](https://github.com/tfm-goldenpath/golden-path-lab/pull/1#discussion_r4112339022) | The custom Dockerfile layer uses dated, signed Debian and Debian Security snapshots. Installed security-tool versions are checked against `tools.lock.json` by diagnostics and CI. |
| [PR01: missing smoke target](https://github.com/tfm-goldenpath/golden-path-lab/pull/1#discussion_r4112339035) | Already resolved: PR06 introduced `implementacion/Makefile` and `smoke-env`. Run it from `implementacion/`. |
| [PR02: oversized upload continues reading](https://github.com/tfm-goldenpath/golden-path-lab/pull/2#discussion_r4112424970) | Pause the rejected body and close its connection after flushing 413. Apply the same behavior to unsupported media types mentioned in the review summary. Tests leave both uploads unfinished and require the response and connection close. |
| [PR03: malformed digest accepted](https://github.com/tfm-goldenpath/golden-path-lab/pull/3#discussion_r4112429647) | Validate canonical SHA-256 before statement matching. Also require nonempty component names and types in CycloneDX metadata and components, as raised in the summary. |
| [PR03: private PEM packaged](https://github.com/tfm-goldenpath/golden-path-lab/pull/3#discussion_r4112429664) | Remove PEM from the evidence extension list and exclude private-key PEM content in other accepted extensions. Existing state/credential exclusions remain. This is not a general-purpose secret scanner. |
| [PR03: summary symlink overwrite](https://github.com/tfm-goldenpath/golden-path-lab/pull/3#discussion_r4112429677) | Reject symlinked summary and hash-manifest paths; replace metadata atomically rather than following an existing file. Regression tests preserve an external target. |
| [PR03: results for a different image](https://github.com/tfm-goldenpath/golden-path-lab/pull/3#discussion_r4112429698) | Match results attestations against the requested digest before concluding F13 is not isolated. |
| [PR04: missing Pod spec passes](https://github.com/tfm-goldenpath/golden-path-lab/pull/4#discussion_r4112441228) | Explicitly deny missing or non-object Pod specs and Deployment template specs. |
| [PR04: malformed Trivy result](https://github.com/tfm-goldenpath/golden-path-lab/pull/4#discussion_r4112441232) | Require a nonempty result `Type`; reject non-string `FixedVersion` values mentioned in the summary. Missing/empty vulnerability lists remain accepted for clean reports, with positive regressions. |
| [PR05: tagged repository accepted](https://github.com/tfm-goldenpath/golden-path-lab/pull/5#discussion_r4112432867) | Reject a colon in the final image path segment while allowing registry ports. |
| [PR05: missing shared fixture](https://github.com/tfm-goldenpath/golden-path-lab/pull/5#discussion_r4112432886) | Already resolved: PR04 supplied `tests/policies/fixtures/base.json`. The Kyverno runner now evaluates denial counts and rule names with supported CLI return codes, as requested in the review summary, and runs through `make test`. |
| PR06: [service tests](https://github.com/tfm-goldenpath/golden-path-lab/pull/6#discussion_r4112592179), [policy contracts](https://github.com/tfm-goldenpath/golden-path-lab/pull/6#discussion_r4112592199), [demo contract](https://github.com/tfm-goldenpath/golden-path-lab/pull/6#discussion_r4112592212) | Already resolved by the merged PR02–PR05 dependencies. The service tests and `scripts/lab-contracts.mjs` exist in the committed tree. |
| PR06: [GitHub verifier](https://github.com/tfm-goldenpath/golden-path-lab/pull/6#discussion_r4112592226), [policy source tree](https://github.com/tfm-goldenpath/golden-path-lab/pull/6#discussion_r4112592241), [preflight inputs](https://github.com/tfm-goldenpath/golden-path-lab/pull/6#discussion_r4112592258) | Already resolved: verifier, policy directories and service/policy tests are tracked in merged main. |
| PR06: [packager](https://github.com/tfm-goldenpath/golden-path-lab/pull/6#discussion_r4112592273), [probe contract](https://github.com/tfm-goldenpath/golden-path-lab/pull/6#discussion_r4112592285), [F13 checker](https://github.com/tfm-goldenpath/golden-path-lab/pull/6#discussion_r4112592304) | Already resolved: all three helpers arrived in PR03 and exist in merged main. |
| [PR07 summary: repeated cleanup and pending hosted validation](https://github.com/tfm-goldenpath/golden-path-lab/pull/7#pullrequestreview-5327273233) | Mark successful packaging so the workflow's later cleanup phase preserves the earlier diagnostics and archive while still retrying resource removal. A regression uses the real cleanup function twice. Real OIDC/GHCR/admission validation remains a separate manual integration run. |
| [PR08: incomplete success output](https://github.com/tfm-goldenpath/golden-path-lab/pull/8#discussion_r4112705734) | Show the evidence-directory suffix and distinguish the summary from subsequent cleanup output in both root READMEs and both runbooks. |
| [PR08 summary: runbook directory, Spanish grammar, Alpine tests](https://github.com/tfm-goldenpath/golden-path-lab/pull/8#pullrequestreview-5327348031) | Correct the starting directory and Spanish Kyverno sentence; add a command for running service tests inside the delivered Alpine image with a read-only test mount. |

Trivy's pinned [report definition](https://github.com/aquasecurity/trivy/blob/v0.74.0/pkg/types/report.go) marks `Vulnerabilities` as `omitempty`. Requiring that field would reject a valid clean scan. The HIGH/CRITICAL rejection threshold and identity restrictions are unchanged.

## Validation and remaining integration work

The PR description records the commands and observed counts for this revision. Unit and CLI checks establish the specified regressions; they do not establish live signature verification, hosted OIDC, GHCR publication or Kubernetes admission.

Rebuild the devcontainer to validate the dated Debian layer. Snapshot dates must be advanced deliberately for package security updates. The snapshot controls this Dockerfile's direct apt dependencies; the Docker-in-Docker feature and external services retain their own installation and availability constraints. See [Debian snapshot usage](https://snapshot.debian.org/#usage).

Before recording lane B as validated, run the manual hosted integration on the reviewed revision and retain its real evidence. Docker image build/Alpine tests and the full hosted integration are separate from this review's unit and policy validation.
