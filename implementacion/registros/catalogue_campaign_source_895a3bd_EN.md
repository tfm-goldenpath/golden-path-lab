# Catalogue validation on the campaign source — blocked attempt

[Español](catalogue_campaign_source_895a3bd_ES.md) · [Identity/hash index](catalogue-campaign-source-895a3bd.json) · [Readiness](../docs/EN/evaluation-readiness.md)

On **5 October 2026**, the single authorized workflow run **37342413975**, attempt
1, failed in the shared-test prerequisite of both suites. **0/20 catalogue
scenarios executed; all twenty remain NOT_EXECUTED in this attempt.** This is
an implementation/environment compatibility failure, not an attributable security
rejection. No scenario retry or corrected-source execution was performed.

## Identity and scope

| Item | Recorded identity |
|---|---|
| Experimental controls and runner | `895a3bde79089b7544c1dad76a6cd8f48eede0a8` |
| GitHub tag, resolved before and after dispatch | `evidence-campaign-895a3bd-20261004`, direct commit reference to that exact SHA |
| Documentation branch | `test/catalogue-campaign-source` |
| Clean, updated main used to create the branch | `c2b403cd436449b1b2818f5fe92983ecf946d072` |
| Main fetched and recorded by both jobs | `c2b403cd436449b1b2818f5fe92983ecf946d072` |
| Workflow / event | `.github/workflows/lane-a-validation.yml` / `workflow_dispatch` |
| Run | [37342413975](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37342413975), attempt 1, created `2026-10-05T16:38:42Z`, actor `Xylons` |
| Demo | [job 111872525387](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37342413975/job/111872525387), `failure` |
| Vulnerabilities | [job 111872524933](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37342413975/job/111872524933), `failure` |

The run's `head_sha` and both original `source.json` files match the experimental
SHA, with clean working trees. The later documentation commit is not the tested
source. Review checked the existing workflow, coordinator, vulnerability runner
and operational scenario oracles before dispatch. No executor, control, version,
fixture or policy was changed for that dispatch. The production scripts, tests, policies and locked
configuration have no changes between the experimental source and the branch base.

The executed command was:

```bash
gh workflow run lane-a-validation.yml --repo tfm-goldenpath/golden-path-lab --ref evidence-campaign-895a3bd-20261004
```

GitHub CLI accepts a branch or tag through `--ref` ([official CLI manual](https://cli.github.com/manual/gh_workflow_run)).
The first dispatch request, at `16:37:57Z`, received HTTP 403 from the Codespaces
integration token and created no run. The same authorized command then used the
existing saved-user authentication without the environment token override. Its
returned run URL, creation time, actor, ref and SHA were checked against the saved
before/after run lists: exactly one new run, `37342413975`. The rejected request
is retained; it was not a retry of an experimental observation.

This workflow hosts **lane A** in GitHub Actions: local trust and local registry,
without native OIDC/GHCR negative coverage. `paired-rg.yml` was not dispatched.
The ten-pair campaign and the 4 October acceptance declaration are unchanged.

## Observed failure and bounded correction proposal

Both suites retain the same outcome:

| Observation | Demo | Vulnerabilities |
|---|---|---|
| Launcher, effective versions, doctor | PASS | PASS |
| Recorded stages | 17 PASS; shared-tests FAIL | 17 PASS; shared-tests FAIL |
| Shared environment checks | 6/6 PASS | 6/6 PASS |
| Service/unit checks | 928/930 PASS; 2 failing wrappers | 928/930 PASS; 2 failing wrappers |
| Original / retention exit | 2 / 0 | 2 / 0 |
| Scenario run / execution | `null` / `NOT_EXECUTED` | `null` / `NOT_EXECUTED` |
| Database | `NOT_CREATED`, empty snapshots | `NOT_CREATED`, empty snapshots |

`shared-tests.log` identifies `paired-campaign.test.mjs` and
`paired-measurements.test.mjs`, both using explicitly synthetic fixtures. Their
Python subprocesses report, respectively, 37 tests with 12 failures/6 errors and
51 tests with one error. The common exception is:

```text
TypeError: TarFile.extractall() got an unexpected keyword argument 'filter'
```

The failing call is `restore_database()` in
[paired-rg.py](../scripts/paired-rg.py), line 63 on the experimental source:
`t.extractall(destination,filter='data')`. Both package inventories record
`python3.11 3.11.2-6+deb12u8`. The official Python documentation dates the
[`filter` argument](https://docs.python.org/3.11/library/tarfile.html#tarfile.TarFile.extractall)
to 3.11.4; the actual exception establishes that the installed build lacks it.
[doctor](../scripts/check-environment.sh) checks Python's presence but does not
check this API capability. Its PASS therefore did not establish compatibility.

The [Makefile](../Makefile) stops at `test-unit`. Subsequent policy tests,
offline `test-bundles` and static `test-workflows` were not reached. Neither
suite reached smoke, the BuildKit probe, L05 source export, scenario startup,
image analysis, admission, recovery or the required-results audit. Unit tests
with scenario names and synthetic authorization messages do not establish
catalogue execution or human declarations. There is no `workflows/result.json`,
`run.json`, `coverage.json` or scenario package in either original export.

**Follow-up proposed at the initial review:** make `restore_database()` compatible
with the supported pinned environment by copying only its four already allowlisted
regular members through `extractfile()` into a newly owned, non-symlink destination,
with exclusive output creation and all existing outer/internal hashes and database
identity checks preserved. Reject links, duplicate or extra members and unsafe
destinations; do not fall back to unrestricted archive extraction. Verify the
existing 37/51 regressions and focused unsafe-destination/duplicate-member cases
inside the exact devcontainer, then the full shared suite. Include an environment
capability regression so a newer host Python cannot hide the incompatibility.
Any resulting code change and subsequent live validation have a different source
and require their own authorization; they cannot be credited to this run.

The user subsequently requested the correction. Its implementation and local
checks are recorded [separately](lane_a_python_compatibility_EN.md); no new workflow
was dispatched. This failed run and its original evidence remain unchanged.

This diagnosis does not invalidate the retained timing observations: the timing
workflow uses Python on the Ubuntu runner, while this workflow executes inside
the pinned devcontainer. It does expose a compatibility gap on the common source.
The historical campaign's successful checks are reused as recorded evidence,
not repeated or reinterpreted as this attempt's success.

## Twenty-scenario matrix

**D** means the demo job above; **V** means the vulnerabilities job above.
Every row has run `37342413975`, attempt 1, controls/runner source `895a3bd` (full
SHA above). `D/V: prerequisite failure` specifically refers to that suite's
original `result.json`, `stages.json`, `shared-tests.log` and absence of scenario
outputs. Inputs below are the existing **planned inputs, not applied alterations**.
Image and signed-result associations are not applicable because no scenario image
or results were produced. No legitimate recovery was exercised.

| ID | Planned input / alteration | Expected result | Control / expected phase | Observed result and concrete evidence | Additional barriers | Technical status / limitation |
|---|---|---|---|---|---|---|
| F01 | Inert workflow: `pull_request_target` plus external PR-head checkout | Only `PULL_REQUEST_TARGET` DENY; legitimate workflow accepted | Conftest, static pre-merge check | D and V: prerequisite failure; `workflows/result.json` absent | Static evaluation not reached; fixture never executes | NOT_EXECUTED; unit checks do not substitute for static trial |
| F02 | Inert workflow: replace checkout SHA with mutable tag | Only `ACTION_SHA` DENY; legitimate workflow accepted | Conftest, static pre-merge check | D and V: prerequisite failure; `workflows/result.json` absent | Static evaluation not reached; no upstream-tag attack | NOT_EXECUTED; static input only |
| F03 | `minimist@1.2.5`; known repair `1.2.8` | CRITICAL CVE-2021-44906 blocked; repair removes target, passes threshold and HTTP | Real SBOM/Trivy/Conftest, post-build; repaired protected delivery | V: prerequisite failure; no image, scan or `F03-completed.json` | Remediation comparison, fresh authorization/admission/HTTP not reached | NOT_EXECUTED; no finding or DB-drift observation |
| F04 | `ip@2.0.1` | HIGH CVE-2024-29415 blocked within snapshot-specific no-fix oracle | Real SBOM/Trivy/Conftest, post-build | V: prerequisite failure; no image, scan or `F04-completed.json` | Negative authorization/deployment prohibited by design; trial not reached | NOT_EXECUTED; no universal no-fix claim |
| F05 | Remove only SBOM attestation from owned registry | Missing-SBOM rejection and exact recovery | Fresh CI; directed SBOM admission CREATE | D: prerequisite failure; no `F05-completed.json` | Authentication, directed admission and legitimate recovery not reached | NOT_EXECUTED; lane B negative remains unsupported |
| F06 | Present unchanged authenticated donor SBOM for another digest | Foreign-subject rejection; exact target restoration | Fresh CI subject check; directed SBOM admission | D: prerequisite failure; no `F06-completed.json` | Donor authentication, target checks and recovery not reached | NOT_EXECUTED; cannot infer later verifier execution |
| F07 | Remove independent image-signature predicate only | Missing-signature rejection despite other evidence; restoration accepted | Fresh CI; signature admission | D: prerequisite failure; no `F07-completed.json` or `F07-CI-completed.json` | Both boundaries and same-digest positive control not reached | NOT_EXECUTED; no GHCR mutation proof |
| F08 | Alter only the image bundle's signature value | Attributable cryptographic rejection; original bytes restored | Fresh Cosign CI; directed signature admission | D: prerequisite failure; no `F08-completed.json` | Original/variant cryptographic comparison and recovery not reached | NOT_EXECUTED; prerequisite error is not signature detection |
| F09 | Remove only provenance attestation | Missing-provenance rejection; exact recovery | Fresh CI; directed provenance admission | D: prerequisite failure; no `F09-completed.json` | Complete retrieval, non-target authentication and recovery not reached | NOT_EXECUTED; retrieval errors cannot prove absence |
| F10 | Authentic local provenance naming unauthorized repository | Repository authorization rejection; original delivery accepted after restoration | Authenticated content in CI; directed provenance admission | D: prerequisite failure; no `F10-completed.json` | Fixture authentication, admission and recovery not reached | NOT_EXECUTED; no lane B negative |
| F11 | Set `privileged` and `allowPrivilegeEscalation` true together | Exact PRIVILEGED/ESCALATION denies and singleton runtime rejection | Conftest; Deployment CREATE/UPDATE and direct Pod CREATE | D: prerequisite failure; no `F11-completed.json` | All three operations, state/absence checks and legal counterpart not reached | NOT_EXECUTED; coordinated two-field fault |
| F12 | Replace digest reference with its original mutable tag | DIGEST deny and authorized-repository/digest admission rejection | Conftest; Deployment CREATE/UPDATE and direct Pod CREATE | D: prerequisite failure; no `F12-completed.json` | Before/after tag resolution and unchanged state not reached | NOT_EXECUTED; no provenance or signature claim |
| F13 | Before issuance: absent results; after issuance: remove only results | Attributable missing-results denial; restored delivery accepted | Preissuance admission; postissuance CI and directed CREATE | D: prerequisite failure; no `F13-after-denial.json` or `F13-completed.json` | Both distinct observations and exact recovery not reached | NOT_EXECUTED; observations remain one scenario |
| F14 | Replay authenticated labelled P0 under trusted P1 | `RESULTS_POLICY_VERSION_MISMATCH`; only results rule rejects | Authorized CI and fresh isolated CREATE | D: prerequisite failure; no `F14-completed.json` | P0 authentication, restoration and fresh positive CREATE not reached | NOT_EXECUTED; P0 is a laboratory fixture |
| L01 | Legitimate initial image and independently evidenced replacement digest | Both admitted, ready and functional | CI, admission, rollout and HTTP | D: prerequisite failure; no `L01-image-update.json` | Initial/replacement delivery not reached | NOT_EXECUTED; same-commit replacement is not app evolution |
| L02 | `lodash.unset@4.5.2`, expected MEDIUM target | CVE-2026-2950 MEDIUM, no HIGH/CRITICAL; full protected delivery | Scan/threshold, fresh evidence, admission and HTTP | V: prerequisite failure; no `L02-result.json` | Real findings, authorization and delivery not reached | NOT_EXECUTED; no DB comparison or supported B fixture |
| L03 | Known `is-number@7.0.0` component addition in replacement | Fresh bound SBOM and unchanged functional contract accepted | SBOM CI, admission and HTTP | D: prerequisite failure; no `L03-result.json` | Component/schema/subject checks and delivery not reached | NOT_EXECUTED; shares L01/L04; no completeness claim |
| L04 | Valid independent signature after fresh verification | Authorized signed delivery accepted | CI gate, results, admission and HTTP | D: prerequisite failure; no `L04-result.json` | Fresh cryptography and shared replacement delivery not reached | NOT_EXECUTED; shared L01/L03 observation |
| L05 | Authorized application revisions `7243334` → `fc58e22` (full SHAs below) | Distinct source trees and two fresh digest-specific healthy deliveries | Source guard, CI, admission and HTTP for both | D: prerequisite failure; no `l05-source.log` or `L05-result.json` | Local review checked ancestry only; runtime export/deliveries not reached | NOT_EXECUTED; two application inputs retained; B pair unexecuted |
| L06 | Legal same-image template annotation update | Real generation change, ready digest, HTTP and direct-Pod cleanup | Shared L01 CREATE; template UPDATE and positive Pod | D: prerequisite failure; no `L06-result.json` | CREATE, UPDATE, rollout and cleanup checks not reached | NOT_EXECUTED; shared CREATE is not another sample |

L05 retains `7243334fe4ee7073801a86b25c90986b7d3c5ece` →
`fc58e220e2d3f38d13216b23e61ffc31271f112f`. Review confirmed both are ancestors
of recorded main. They are necessary application inputs to a runner whose source
is `895a3bd`; they must not be replaced with the runner SHA. Neither delivery ran.
Shared L01/L03/L04, L06 CREATE and recoveries add no scenario or independent sample.

## Databases, integrity and preservation

Both database artifacts contain only `index.json` with `NOT_CREATED` and an empty
snapshot list. There is no real suite database or database hash to compare. The
[campaign index](paired-rg-campaign-895a3bd.json) records development run
`37199309814` as the campaign database source:

- `trivy.db`: `f684c51b045908383ef92b1ad55b1723e6f9db6cad7479602f3f51dae6b3c179`.
- `metadata.json`: `b13d003bf452cc52343ca98360433ae64e8657e258cf88c332b4ef551e9ca3d8`.

Those are reused historical identifiers, not databases reverified in this review.
Coincidence/difference is **not applicable**, not “identical”. The unchanged lane-A
workflow would acquire fresh databases after its prerequisites; it did not reuse
the campaign snapshot. No F03/F04/L02 finding, severity or fixture drift can be
assessed from this attempt. Common implementation source does not establish common
databases, trust, host runtime, cache conditions or equivalent experiments.

Originals are retained under the ignored path
`implementacion/evidence/raw/catalogue-campaign-source-20261005/originals/`;
new reports and review helpers are separately under `derived/`. Preservation
includes all four original ZIPs, both extracted suite exports and database indexes,
native Actions log ZIP, CLI log rendering, run/job/artifact metadata, dispatch
outputs, and tag/main/before/after-run receipts. Artifacts expire on **19 October
2026**; the exact expirations and hashes are in the small index. The retained local
copy still needs preservation outside Codespaces; no new release was published.

Checks performed now:

- All four ZIP SHA-256 values match GitHub artifact digests; all ZIP CRC checks
  pass, including the native Actions logs.
- Both outer manifests pass **28 hashes each (56 total)**, including the separate
  DB index. The existing `paired-rg.py::verify_export` auditor also verifies exact
  manifest membership, path safety and file hashes, without running a pair.
- Run/job/artifact/source associations, clean source, recorded main and five
  archived configuration files per suite match the experimental Git objects.
  Eighteen stage records per suite agree with retained logs: 17 PASS, one FAIL.
- No scenario packages exist: internal package hashes, scenario/image/results
  associations and bundle reauthentication are **not applicable**. The coverage
  auditor and real Cosign test stage were not reached; neither is reported as PASS.
- Text inspection found no private-key or GitHub-token pattern. Raw artifacts stay
  out of Git. The 84 original files have a separate preservation manifest.
- Space and inodes were checked before downloads/extraction, between suites and
  after preservation, with a 3 GiB/20,000-inode reserve. About 6.54 GiB and
  1.76 million inodes remained after preservation. No cleanup/deletion was needed.

Derived reports: `verified-downloads.json`, `failure-review.json`,
`storage-checks.jsonl` and `ORIGINALS-SHA256SUMS.txt`. This is a new automated
integrity/failure review. Earlier A1 cryptographic reviews and campaign findings
remain their original observations; none supplies missing evidence for this run.

The initial documentation-only review passed: 238 local links, ten Bash blocks, publication
command syntax without execution, JSON/evidence hashes, four EN/ES matrices of
exactly twenty rows and `git diff --check`, covering eight documentation/index
files. The later correction has its own verification record; local shared tests
do not replace the remote failure.

## Handoff and effect on the evaluation

The full-catalogue-on-campaign-source limitation **cannot be closed**. The new
evidence identifies why this authorized attempt could not reach the catalogue.
Functional trials, scripted repairs, the four-pair pilot and ten-pair campaign
remain separate datasets. Human-effort and economic evaluation, unsupported lane B
negatives and human review/acceptance of this new evidence remain pending.
The [4 October declaration](evaluation_acceptance_20261004_EN.md) retains its
original reduced scope and date; this later observation does not amend it.

The Spanish counterpart contains the proposed thesis paragraph. No thesis file
was edited. No commit, push, remote PR, merge, release or repository-setting change
was made. The original documentation-only PR title was
`test: validate the scenario catalogue on the measured campaign source`;
the subsequent fix handoff describes the corrected implementation while retaining
the blocked experimental outcome and its pending coverage.

| Activity | Assistance | Human review | Decision |
|---|---|---|---|
| Authorized dispatch, evidence preservation, automated diagnosis and EN/ES documentation | OpenAI Codex / GPT-6 | Pending | Execution FAIL; preservation/integrity checks PASS; new evidence acceptance pending |
