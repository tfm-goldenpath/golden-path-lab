# Laboratory release preparation — 24 October 2026

Implementation branch: `chore/lab-release-freeze`.
Actual fetched main/base: `3afa1c850f4d294d23cc302558d6ce87c62aa279` (PR #58).
No product roadmap exists in this checkout; the owner's request is the specification.
Unrelated root `package.json` / `package-lock.json` and ignored originals are retained.

## Recovered bytes and source boundaries

| Selection | Actual recovery / verification |
|---|---|
| Demo transport | Release 416806306 / asset 654877193, 24,870,638 bytes, `deba74a10eb63503cfbe58b1e447f3d1cbb06a2ed9f404ddd0c2519c4cbf7a92`; fresh Pages fetch/unpack and exact 541-file site verification PASS. |
| Exact private frozen-0002 | Existing original verified with reviewed Pages code; fresh private copy matches all 547 files (546 checksum entries), 81,988,946 bytes. Both checksum inventories, five historical anchors, manifest/portable/source/renderer associations pass. Never reconstructed from Pages. |
| Campaign archive | Release 403052949 / asset 609973571, 1,412,065,509 bytes, `99925065ddb8725b165a736e8d8845fe88718ee21f69c746fd2852d96bf43afa`; downloaded original, exact 3,424-member FILES.sha256 and source association PASS. |
| Corrected lane-A v2 | Asset 613384625, 246,596,801 bytes, `1f276947f5ed375df0b4ab41cd93360ea9f6f8443749f36c0d5b216d500bbe4b`; exact 169-member inventory/source/run/attempt PASS. v1 retained remotely, not replaced. |
| Failed catalogue attempt | Asset 613292923, 5,862,321 bytes, `3e18d534d3ee4f0d2a9dee7894e3462e90b086b5c66c5db5db492d70dfdae298`; exact 166-member inventory/source/run/attempt PASS. Original failure and zero scenario execution remain unchanged. |
| Campaign restoration metadata | Six original JSON/README/checksum assets, 57,458 bytes; all selected API sizes/digests pass. Both README versions retained. |
| Code | Explicit candidate source plus four generated historical source transports; new transport hashes never relabel original evidence. |

Ten public originals total **1,689,452,727 bytes**. Exact origins, IDs, sizes,
hashes and classifications are committed in the [specification](../releases/lab-freeze.inputs.json).
Nested original archives are retained opaque members authenticated by publication
inventories. This task does not repeat signature verification, expand databases,
re-analyze measurements or execute scenarios.

Original identities remain 38e7228 runtime, original dirty status/content hash,
e54eb91 renderer-equivalent with its precommit dirty identity, 895a3bd campaign and
failed catalogue attempt, and 91a33e9 corrected A run. Original image/replacement
coordinates, profiles, database hashes and outcomes remain in their original
manifests/indexes. The 4 October canonical closure explains current reduced-scope
human acceptance without rewriting earlier pending declarations. A3/A4 retain
later pending human review.

## Checks and resources

Resource preflight: 4 CPUs, 15 GiB displayed physical RAM, 11 GiB available;
workspace 6.1 GiB free / 1,655,136 inodes; separate `/tmp` 108 GiB free.
Docker read-only usage inspection succeeded after sandbox access changed: no
container, volume, image or cache removal. Initial socket denial remains recorded.
Large originals processed sequentially under `/tmp/lab-release-20261024-irneyni7`;
workspace staging under ignored `implementacion/evidence/packages/lab-release-20261024`.
Reserve: 3 GiB plus copy/extraction forecast, 10,000 spare inodes plus growth.

- Real browser restoration: PASS, file:// with zero HTTP requests; static HTTP
  under `/golden-path-lab/demo/`; F11/F13/early logs and attributions, four F13
  inventories, original download hash, distinct historical L01 digests, navigation,
  disabled laboratory actions, corrupt/missing originals and no JS errors.
- Console: 400 px visible at 1366×768, 15 px text; 1920 and 390 px layouts pass.
  Actual F12 console screenshot inspected; content readable and recorded/read-only
  labels retained. Historical HTML was not modified.
- Owner scope update: retain the original **silent video**, without audio or
  narration. Presentation-machine playback, decoder checks and narration are
  excluded from release requirements and blockers. Earlier media diagnostics
  remain local; they are not release acceptance requirements.
- Focused synthetic release tests: valid fixture, missing/changed inputs, trusted
  outer anchor versus recomputed checksums, identities, unsafe/duplicate/colliding
  archives, exact sets, resource reserve, existing output, interruption/partial
  download, unchanged originals, source binding and remote attestation failure.
  Initial run failed because the new entry point did not yet exist; a later mock
  correction preceded passing focused tests. No earlier TDD history is implied.
- First shared-suite run: reached 153 defense checks and failed one documentation
  link because this new record had not yet been written when that check ran. The
  log is retained; the final complete-tree rerun is separate.
- `doctor`: PASS with pinned environment/tools. Shared-suite final results and
  exact tested revision are recorded in the follow-up below when completed.

Reports are ignored under `implementacion/evidence/raw/lab-release-20261024/`:
`preflight.json`, original release metadata, `frozen-verification.json`,
`restored-frozen-verification.json`, `original-preservation-before.json`,
`inventory-01.json`, `browser/result.json`, browser screenshots, test logs and
separate candidate receipts. The campaign download completed across a server
interruption and was hash-checked again before use; its independent recovery
record preserves that fact. No interrupted run is counted as a passing test.

## Remote protection and remaining decisions

Read-only release inventory: all four existing releases report immutable=false.
Actual tag targets: v0.1.0 → 9f1999ef8a1ee0b8b4c708625f1d0b663ad9173c;
v0.2.0 → dd381d3db6403a1b2e74d73c88d458ef434820d4;
demo transport → 1d2d71ea0dfd647973d051b444f1ae675542cb80;
campaign → 895a3bde79089b7544c1dad76a6cd8f48eede0a8.
The planned `lab-v2026.10.24` tag was absent at inspection; publication date and
availability must be checked again. Title:
**Golden Path Lab — frozen research and demonstration baseline**.

### Initial observation (before the owner follow-up)

The immutable-release setting and classic required-status-check endpoints returned
HTTP 403 with the integration token. The readable main ruleset lists deletion,
non-fast-forward and pull-request rules; no required-status-check rule was returned.
That partial visibility does not authorize bypassing review/checks. Settings and
permissions were not changed. `gh 2.102.0` help confirms supported release commands.
No release attestation verification is claimed for these non-immutable originals.

Required private original is locally recoverable and verified; durable external
custody of the full freeze/evaluation dossier remains unverified. The owner said
there is no need to copy complete evidence from the public subset; no external
private location was supplied. Existing publication exclusions remain in force.
Historical A2/P and omitted-cache limitations remain stated in the coverage guide.

### Owner confirmation and authenticated follow-up — 24 October 2026

The owner confirmed that the downloaded **frozen-0002** is in their custody and
confirmed its hash after receiving the checksum-verification commands. The trusted
`SHA256SUMS` anchor is
`11250ad2912018df2eff16d852823fb8729c417599fc17dcb88b5fc108f4d4de`.
This is an owner declaration about that downloaded copy, distinct from the earlier
local automated verification. The private destination was not disclosed and is
not invented here. No independent inspection of the owner's copy, custody of the
complete historical evaluation dossier, PR approval or publication authorization
is inferred. The earlier pending observation above remains historical.

The owner completed `gh auth login`. Read-only API checks using stored user
credentials, with `GH_TOKEN` and `GITHUB_TOKEN` omitted, resolve the earlier 403:

- Immutable releases: `enabled=false`, `enforced_by_owner=false`.
- Classic required-status-check protection: HTTP 404, `Branch not protected`.
- Active main ruleset 24047874: deletion, non-fast-forward and pull-request rules;
  zero required approving reviews and no required-status-check rule returned.

No repository setting was changed. Enabling immutability remains a separate
owner decision. The EN/ES procedure distinguishes this exact classic-protection
404 from permission failures and still checks active rulesets and exact-source CI.
The release helper carries the owner declaration separately from its local private
byte verification; the declaration never overrides an integrity failure.

Follow-up validation: 22 synthetic release tests PASS, including a scoped owner
confirmation that cannot override a failed local inventory check. The retained
local frozen original still passes the trusted verifier, with the owner declaration
carried separately in new custody metadata. Documentation regression, links,
Bash syntax, exact-404 guard checks and `git diff --check` pass. Reports remain
ignored in `evidence/raw/lab-release-20261024/custody-followup-*`; no full shared
suite or new experiment is claimed for this follow-up.

The specification changes with this follow-up. Earlier candidate manifests and
receipts keep their original source/specification hashes; they are not relabelled
as verification of this revision. Generate the final manifest after merge from the
explicit selected source. Release review and publication remain pending.

Publication is pending, separately authorized after review and merge. Final merged
source selection, required-check visibility, draft inventory, publication and
fresh published-byte verification have **not** happened. No final tag, release,
Pages deployment, workflow dispatch, merge or repository refactor was performed.

## Assistance and review

| Activity | Assistance | Human review | Decision | Evidence |
|---|---|---|---|---|
| Release contract, tests, read-only recovery and bilingual documentation | OpenAI Codex (GPT-6); no delegated agents | PENDING | Draft PR for review; no publication authorization | Specification, guides, local verification reports and PR checks |

**LAB_RELEASE_NOT_YET_VERIFIED**

**REPOSITORY_REFACTOR_BLOCKED**

## Candidate and complete-suite follow-up

Candidate 01 was prepared from committed `fb1ce500dd3d2c7ee7b820d4dad154faa312c0ac`
and verified from a fresh copy of all **19 proposed public attachments**.
Manifest SHA-256: `79bb9e137fcb33114cefde8d1b2c5d282373f205db84f37e611d0de15a9d713e`.
Specification SHA-256: `3b7fc3a7f0731f4cf1e63f47b9e55560f6d8efb513663a1fed934385e560f182`.
This is a candidate anchor, not a published release or the eventual merged source.
The final PR head needs its own generated manifest; no self-referential source SHA
is committed into the specification.

The complete-tree shared rerun passed: 6 environment, 951 service/unit,
45 Python policy, Conftest/Kyverno, real offline Cosign, static workflow,
153 defense and then 20 release tests. It started at fb1ce50 with only subsequent
documentation edits before completion. The later manifest-promotion hardening
adds a checksum-close failure test: 21 focused release tests PASS. The final
committed implementation rerun and candidate receipt are identified in the PR.
An interrupted checksum write now leaves only a partial manifest, never a
completed candidate manifest. All interruption diagnostics are preserved.

Final preservation comparison: all 547 private original files and all ten public
input assets unchanged. Protected policy/scenario files, canonical acceptance,
campaign index, Pages lock/workflow have no diff from the implementation base.
Generated assets/reports are ignored or outside the repository. Runbook Bash syntax
and local documentation links pass; publication commands were not executed.
