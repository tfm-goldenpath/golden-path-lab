# Lane A catalogue on the corrected source — 5 October 2026

[Español](lane_a_corrected_91a33e9_ES.md) · [Identity/hash index](lane-a-corrected-91a33e9.json) · [Readiness](../docs/EN/evaluation-readiness.md)

Both suites of [run **37353632299**](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37353632299),
attempt 1, passed. Independent automated review of the retained artifacts confirms
**20/20 catalogue scenarios PASS in lane A**, including static, inert F01/F02.
The experimental source is **`91a33e910ee2ba9ded5391393b06ca70005de4d4`**.
This is the user-authorized execution after the [Python compatibility correction](lane_a_python_compatibility_EN.md).
It does not replace [failed run 37342413975](catalogue_campaign_source_895a3bd_EN.md):
that attempt remains 0/20 on `895a3bd`, with no databases. Human review and acceptance
of this new evidence are pending; the 4 October declaration is unchanged.

[Download the evidence ZIP](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/lane-a-37353632299-91a33e9-evidence-v2.zip)
and [SHA-256 file](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/lane-a-37353632299-91a33e9-evidence-v2.zip.sha256).
The existing prerelease is a storage location: its tag still identifies `895a3bd`,
whereas this supplement explicitly identifies the different corrected source.

## Definition, source and execution

The acceptance criteria were unchanged: use the existing pinned workflow and both
executors, retain attributable denials and legitimate recoveries, audit the original
packages and image associations, and report all twenty IDs without counting shared
deliveries as independent samples. No policy, fixture, dependency, tool version,
severity or scenario oracle was changed. Relative to `895a3bd`, the implementation
and configuration differences are limited to `scripts/paired-rg.py` and its replay
regression tests. The fix validates and copies four allowlisted regular database
archive members without the unsupported extraction-filter API; hashes and trust
requirements remain mandatory. Matching controls do not make two full source
commits identical.

| Identity | Value |
|---|---|
| Controls and runner source; both clean `source.json` files and Actions `head_sha` | `91a33e910ee2ba9ded5391393b06ca70005de4d4` |
| Main fetched by both jobs and used for ancestry review | `c2b403cd436449b1b2818f5fe92983ecf946d072` |
| Workflow / ref | `lane-a-validation.yml` / `test/catalogue-campaign-source` |
| Created / completed, UTC | `2026-10-05T18:07:56Z` / `2026-10-05T18:21:56Z` |
| D: demo | [job 111910409914](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37353632299/job/111910409914); `run-QtLWFwof`; 27 stages PASS |
| V: vulnerabilities | [job 111910410156](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37353632299/job/111910410156); `run-WjHQj2u4`; 26 stages PASS |
| Both results | Original, retention and final exits 0; no failed stage; scenario execution STARTED; human acceptance pending |

One new execution was dispatched, using the existing saved-user authentication.
Its returned URL and the before/after run lists identify this exact new run; there
were no experimental retries. The executed command was:

```bash
gh workflow run lane-a-validation.yml --repo tfm-goldenpath/golden-path-lab --ref test/catalogue-campaign-source
```

Both jobs reused preparation, the pinned devcontainer, doctor, all shared checks,
smoke, their scenarios, audit and retention. This is **lane A inside Actions**,
using local trust and an owned local registry. No `paired-rg.yml` or lane B negative
campaign was run. Subsequent documentation commits are not the tested source.

## Exactly twenty scenarios

D/V refer to the suites above, all under run `37353632299`, attempt 1 and source
`91a33e9` (full SHA above). `workflows/` belongs to each suite export; other filenames
are relative to its scenario package. The existing auditor checks the completion
files against their referenced diagnostics, inventories, images, signed evidence,
admission and HTTP receipts. The index records all eight analyzed image digests.

| ID | Applied input / alteration | Expected result | Observed result and concrete evidence | Control / phase | Additional barriers checked or not reached | Technical status / limitation |
|---|---|---|---|---|---|---|
| F01 | Inert external PR-head checkout under `pull_request_target` | Only `PULL_REQUEST_TARGET` DENY; legitimate workflow accepted | Exact rejection and positive control; D/V `workflows/result.json` | Conftest static workflow policy | Positive counterpart checked; no fixture executes | PASS; static evidence only |
| F02 | Inert checkout Action changed from SHA to mutable tag | Only `ACTION_SHA` DENY; legitimate workflow accepted | Exact rejection and positive control; D/V `workflows/result.json` | Conftest static workflow policy | Positive counterpart checked; no upstream attack | PASS; static evidence only |
| F03 | `minimist@1.2.5`, then known repair `1.2.8` | CRITICAL CVE-2021-44906 blocked; repaired protected delivery healthy | Target CRITICAL found; repaired report has no findings; V `F03-completed.json`, both scan directories | Real SBOM/Trivy/Conftest after build | Repaired fresh authorization, admission, HTTP and functional compatibility PASS; vulnerable authorization not issued | PASS; scripted known repair, not human effort |
| F04 | `ip@2.0.1` | HIGH CVE-2024-29415 blocked, no fix in selected snapshot | HIGH with no FixedVersion; V `F04-completed.json`, `F04/analysis.json` | Real scan and CI threshold | Results issuance/deployment not reached by design after rejection | PASS; no universal no-fix claim |
| F05 | Remove only SBOM attestation | Missing-SBOM denial and exact restoration accepted | Attributable CI/admission rejection and recovery; D `F05-completed.json` | Fresh CI and directed SBOM admission CREATE | Isolation, unchanged non-target evidence and positive delivery checked | PASS; no B negative coverage |
| F06 | Authentic donor SBOM for another digest | Subject mismatch rejected; target restored | Foreign subject rejected and recovery accepted; D `F06-completed.json` | Authenticated subject CI and directed admission | Donor authenticity, target association, isolation and recovery checked | PASS; no SBOM completeness claim |
| F07 | Remove independent image-signature predicate only | Missing signature denied despite other evidence | CI and signature admission denial with recovery; D `F07-CI-completed.json`, `F07-completed.json` | Fresh CI and admission | Same-digest positive control and exact restoration checked | PASS; no OIDC/GHCR negative |
| F08 | Change only image bundle signature value | Attributable cryptographic denial; restore original bytes | Signature threshold failure, directed denial and recovery; D `F08-completed.json` | Cosign CI and signature admission | Original authenticates; variant rejects offline; only signature differs; restoration checked | PASS; no certificate/transport failure counted |
| F09 | Remove only provenance | Missing provenance denied; exact recovery accepted | CI/admission denial and recovery; D `F09-completed.json` | Fresh CI and directed provenance admission | Complete retrieval, non-target evidence and isolation checked | PASS; retrieval errors do not establish absence |
| F10 | Authentic local provenance naming unauthorized repository | Origin authorization denial; original accepted after restoration | Expected repository rejection and recovery; D `F10-completed.json` | Authenticated CI fields and provenance admission | Fixture signature and non-target isolation checked | PASS; local trust, no B negative |
| F11 | Enable privileged and privilege-escalation flags together | Exact PRIVILEGED/ESCALATION CI denies; runtime rejection | CI and all three operations reject; D `F11-completed.json` | Conftest; Deployment CREATE/UPDATE, Pod CREATE | Unchanged live state/absence and legal counterparts checked | PASS; coordinated two-field fault |
| F12 | Substitute original mutable tag for digest reference | DIGEST denial and authorized-repository/digest admission rejection | CI and all three operations reject; D `F12-completed.json` | Conftest; Deployment CREATE/UPDATE, Pod CREATE | Tag resolution before/after and unchanged live state checked | PASS; not a provenance mutation |
| F13 | Results absent before issuance; remove only results after issuance | Missing-results denial and restored delivery accepted | Both boundaries reject as expected; D `F13-after-denial.json`, `F13-completed.json` | Preissuance admission; postissuance CI/directed CREATE | Restoration and positive delivery checked | PASS; two observations of one scenario |
| F14 | Authenticated labelled P0 replay under trusted P1 | `RESULTS_POLICY_VERSION_MISMATCH`; only results admission rule rejects | Expected CI/directed CREATE denial and recovery; D `F14-completed.json` | Authorized CI and fresh isolated CREATE | P0 authentication, isolation and fresh positive CREATE checked | PASS; P0 is a lab fixture |
| L01 | Initial legitimate image and independently evidenced replacement digest | Both admitted, ready and functional | Both protected deliveries PASS; D `L01-image-update.json` | CI, admission, rollout and HTTP | New image-specific evidence and Pod digest correspondence checked | PASS; same-source replacement, not app evolution |
| L02 | `lodash.unset@4.5.2` | Target CVE-2026-2950 MEDIUM, no HIGH/CRITICAL; protected delivery accepted | Two MEDIUM findings, threshold and delivery PASS; V `L02-result.json`, `L02/` | Scan, fresh signed evidence, admission and HTTP | Signature, SBOM, provenance and results independently checked | PASS; findings depend on preserved DB |
| L03 | Add `is-number@7.0.0` to replacement | Fresh bound SBOM and unchanged functional contract accepted | Component/evidence/delivery PASS; D `L03-result.json`, `L01-update/` | SBOM CI, admission and HTTP | Subject and known component association checked | PASS; shares L01/L04, not independent sample |
| L04 | Valid independent image signature with fresh verification | Authorized signed delivery accepted | Verification, results and delivery PASS; D `L04-result.json` | CI gate, results, admission and HTTP | Independent signature contract reauthenticated offline | PASS; shares L01/L03 |
| L05 | Authorized application revisions `7243334` → `fc58e22` | Distinct source trees and two fresh healthy deliveries | Source guards and both deliveries PASS; D `L05-result.json`, `L05-from/`, `L05-to/` | Source, CI, admission and HTTP for each | All 10/11 source files, Git trees, ancestry and snapshot hashes checked | PASS; two app inputs retained; B pair unexecuted |
| L06 | Legal same-image template annotation update | Generation change, ready correct digest, healthy HTTP | Legal update and positive Pod cleanup PASS; D `L06-result.json` | Shared initial CREATE, template UPDATE, rollout and HTTP | Deployment/Pod consistency and direct-Pod cleanup checked | PASS; shared CREATE adds no sample |

L05 preserves the full application-input pair
`7243334fe4ee7073801a86b25c90986b7d3c5ece` →
`fc58e220e2d3f38d13216b23e61ffc31271f112f`, both ancestors of recorded main.
The controls/runner have a common source; these deliberately distinct application
revisions are necessary inputs. L01/L03/L04, recoveries and L06's shared CREATE
do not increase the twenty scenarios or constitute independent samples.

## Real databases and findings

Both suites downloaded fresh databases. Their preserved `trivy.db` hash is
`d0b30302df0af5b967f542393733c4c17eccd22aa97a5b802f937202e656f784`,
schema version 2, updated `2026-10-05T13:07:51.292695513Z`. Metadata differs because
the suites recorded their own download times:

| Suite | DownloadedAt UTC | metadata.json SHA-256 | Database tar SHA-256 |
|---|---|---|---|
| D | `2026-10-05T18:14:20.624379437Z` | `af4ce38126e8ab62549de68f2d861d5d49115891a47c78cd5391493588cda2d6` | `f1cb118db9533ba2af384c8d2c31ff09932051f12e0be03e8aec9a806caac82d` |
| V | `2026-10-05T18:13:35.872879988Z` | `730db3416b46e936c454c0bd2a1150bda5c81149b9753f2a9859bee3e8d60e9e` | `f28b4218d8942171ed364921a8141a609ae4f71f3b0781b64c124b8490ab0bba` |

Both DB and metadata hashes **differ from the campaign's** recorded database
from `37199309814`: `trivy.db`
`f684c51b045908383ef92b1ad55b1723e6f9db6cad7479602f3f51dae6b3c179`, metadata
`b13d003bf452cc52343ca98360433ae64e8657e258cf88c332b4ef551e9ca3d8`.
This comparison reuses the [committed campaign index](paired-rg-campaign-895a3bd.json);
it does not rehash or rescan those historical bytes. This run did not use the frozen
campaign DB and is not a reproduction under identical conditions.

F03 records CRITICAL CVE-2021-44906 (fix `1.2.6, 0.2.4`), removed by `minimist@1.2.8`.
F04 records HIGH CVE-2024-29415 with no fixed version. L02 records MEDIUM
CVE-2025-13465 without a fixed version and MEDIUM CVE-2026-2950 with fix `4.18.0`.
The original F03/F04/L02 expectations hold. Four offline rescans with pinned Trivy
`0.74.0` and the preserved V database reproduce all original `Results`, allowing
only in-memory input-path relocation for comparison. Reports and database hashes
remain unchanged; no database or fixture was selected to improve the outcome.

## Independent review and preservation

Originals and derived reports are separate under ignored
`evidence/raw/lane-a-corrected-91a33e9-20261005/`. The ZIP includes the four original
Actions artifacts, both actual DB archives, native logs, metadata and derived
reviews. Nested archives preserve original bytes; expanded redundant copies are
not needed in the download. Actions artifact expirations are 19 October 2026;
exact sizes, hashes and expirations are in the index.

Checks performed now, beyond a green workflow:

- Four artifact SHA-256 digests match GitHub; ZIP CRCs pass. Existing export and
  package auditors verify **151 outer hashes** (76 D/75 V) and **2,312 internal
  scenario hashes** (1,963 D/349 V). Run/source/main and eight image receipts agree.
- The existing scenario auditor independently passes 27 D and 12 V boundaries;
  these are audit checks, not 39 scenarios. Fourteen mutation-isolation boundaries
  pass existing validators. Private `state.json` is excluded from packages: its
  historical live checks are retained, not independently recomputed offline.
- Pinned Cosign `3.1.3` rechecks 28 distinct local bundles: **27 authenticate**, and
  the altered F08 signature has the expected cryptographic failure. **24 positive
  content contracts** are then checked against authenticated content, subjects,
  repository/source and referenced result hashes. Local trust does not prove OIDC.
- Both real DB archives restore through the corrected existing function, passing
  inventory, outer/internal hashes and exact identity/metadata checks. Four
  offline scan replays match. L05's two exports match their exact Git inputs.
- Two auxiliary reviewer assertions were corrected and preserved: L05's
  `applicationTree` is the `src/` subtree, not the whole service tree; F08's altered
  bundle also occurs under `L01-update/CI-F08-*`. Existing contracts and bytes
  resolve both. These were review-helper errors, not failed experiment stages;
  originals, expectations and production code were not changed to resolve them.
- Space/inodes were checked before downloading/extracting, between suites and
  after review, maintaining a 3 GiB/20,000-inode reserve. No global cleanup or
  deletion of originals, failures, canonical DBs or human declarations was used.

Prior A1/campaign verifications remain reused historical records, not new checks.
The separate index records publication verification and sensitive-data inspection.

## Interpretation and pending review

This closes the technical live-validation gap for the corrected source `91a33e9`.
It does **not** establish full-catalogue execution on the timing source `895a3bd`:
the common controls and unchanged scenario definitions support traceability, while
the fix, full commit identity and databases differ. Functional data and the ten
timing pairs remain separate; timing was not repeated. Human/economic evaluation,
unsupported hosted negatives and human acceptance of this supplement remain open.
The thesis and historical acceptance declarations were not edited.

| Activity | Assistance | Human review | Decision |
|---|---|---|---|
| Execute the authorized corrected-source workflow; review original evidence, cryptography, DBs and sources; prepare EN/ES records and download | OpenAI Codex / GPT-6 | Pending | Automated technical review PASS, 20/20 lane A; new human acceptance pending |

Publication note: v2 corrects the F04 evidence filename to `F04/analysis.json`. The initial supplement is retained unchanged; all original experiment bytes and results are identical.
