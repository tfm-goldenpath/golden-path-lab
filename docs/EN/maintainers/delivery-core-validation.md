# P03 delivery-core validation

[Operator guide](../legitimate-delivery.md) · [Ownership map](repository-map.md)

Base: fetched main `b00d57b91536a00d3dc99bd1a99f4a82c5bab1ca` on 25 October 2026.
Branch: `refactor/delivery-core`. The root untracked `package.json` and
`package-lock.json` predated this task, are excluded and remain untouched.
No versions, workflows, policy versions, predicate types or historical results
are updated. P00 custody and human-review gates remain open.

## Baseline and environment

Original logs are ignored local evidence under
`implementacion/evidence/raw/p03-development/`. They are not committed or public
assets. The first doctor/test attempts lacked `implementacion/.tools/bin` on PATH:
doctor reported missing kind and eight service/unit tests failed on missing
external tooling. Both attempts are retained. With the existing pinned tools on
PATH, `baseline-doctor-tools.log` and `baseline-test-tools.log` pass before shared
behavior changes. No installation or version refresh was needed.

Effective baseline: Node 24.21.0, npm 11.19.0, Docker CLI/server 29.8.0,
Buildx 0.37.1, kind 0.33.0, kubectl 1.35.8, Python 3.14.2; security versions match
`tools.lock.json` through doctor. Exact version/environment output remains in
`baseline-environment.txt` and the doctor log. Initial resources: 4 CPUs, 15 GiB
reported RAM, 5.6 GiB free on the 32-GB `/workspaces` filesystem; `/tmp` is a
separate filesystem with approximately 108 GiB free. Docker's root is on the
same constrained filesystem as `/workspaces`.

Two pre-existing laboratories were active, with nodes/builders for
`tfm-demo-run-kcnmn8nq` and `tfm-demo-run-mt1eyh0g`. Their state is retained under
`run-KCNmn8NQ` and `run-Mt1eYH0g`; they are not P03-owned resources. Following an
explicit owner confirmation that neither was in use, the existing
`defense-demo.sh cleanup --session … --stop-server` retired their six containers.
The four attached volumes were removed only after matching their recorded full
metadata and confirming no remaining consumers. Three unrelated volumes were
retained. Both original evidence trees, first packages and defense exports remain.
Receipts: `prior-resource-inventory.json`, `prior-volume-inventory.json`,
`prior-volume-retirement.json`, `retire-kcnmn8nq.log` and `retire-mt1eyh0g.log`
in the P03 development directory. No historical evidence deletion or custody closure was
needed. Free space rose to 9.0 GiB before the legitimate delivery.

## New boundaries and checks

The focal suite uses synthetic stage substitution to establish ordering and
fail-stop behavior, not real cryptography or admission. It injects failure at
every stage, verifies later stages remain NOT_REACHED, retains the first error
through cleanup, runs without scenario/fixture/measurement/presentation trees,
and exercises the real source selection, producer validation, mandatory receipt
checks, resource identity guards and delivery packaging/hash verification.

A real failing service test exposed Node's inherited recursive-test context:
a nested `node --test` can exit zero while skipping execution. The delivery
profile now removes that context and requires a complete successful TAP summary.
This is retained in the focal failure logs and covered by a passing regression;
no retrospective TDD claim is made for other pre-existing code. Real Conftest
checks a prohibited manifest and stops the stage. Existing vulnerability, strict
inventory, crypto, rollout, historical packaging, paired, defense and manual
regressions remain in the shared suite.

The [shared targets](../../../implementacion/Makefile) include environment,
service/unit, Python/Conftest/Kyverno policies, real offline Cosign bundles,
workflow trials, defense and release checks. There is no `make lint` target.
The tested implementation is `e3850a4b59f4cea198d89902285078875457668c`.
A later documentation-only commit records these observations; neither integration
is attributed to that later commit. On the implementation revision:

- `make -C implementacion doctor`: PASS (`e3850a4-doctor.log`).
- `make -C implementacion test`: PASS (`e3850a4-test.log`): 6 environment,
  996 service/unit, 45 Python policy, 153 defense and 22 release tests, plus real
  Conftest, Kyverno, offline Cosign bundle and workflow checks.
- Focused admission/provenance contracts pass (`e3850a4-contracts.log`); the full
  suite includes every final delivery-boundary regression.
- Inventory validator: PASS, exact 508 tracked paths / 233 scripts, helpers and
  tests; 10 validator unit tests pass. The map summary uses validator output.
- `git diff main..HEAD --check` passes. Changed documentation targets were checked;
  generated/raw evidence, private material, dependency pins and unrelated root
  npm files are excluded from the commits.

Earlier development test failures and corrected attempts remain under the same
ignored development directory; they do not replace the baseline or final logs.
A generated package alone does not prove successful delivery or scenario execution.

## Integration and remaining acceptance

The following integrations ran sequentially against the implementation SHA above,
with PATH prefixed by `$PWD/implementacion/.tools/bin`. Neither is a timing sample.

### One legitimate local delivery

```bash
bash implementacion/scripts/deliver.sh local
```

PASS, exit 0: all 21 stages, successful cleanup and packaging. Run
`implementacion/evidence/raw/delivery-FKciP7Y2/`; command log
`implementacion/evidence/raw/p03-development/delivery-attempt-01.log`.
The actual restricted-actor admission accepted the authorized candidate without
F13, followed by apply, rollout, matching Deployment/ready-Pod digest and HTTP
health/version/quote checks. No reference namespace or scenario record was created.
This is an individual legitimate delivery, not the complete L01 replacement trial.

- Source snapshot: `2ed780bf4d2a041aedcd80a219ebd07b0112a56cbbefe60fd41ecd5b0c35deb8`.
- Configuration: `19460f9881cdb289d88e4e28eee897fcde0838d9b0089d8393db21f67b92ecd8`.
- Image digest: `sha256:39a55e609c3d8d398e8df88f01e4a4ee9dd882c4cfc74b35c8d8f306ba999803`.
- Package: `implementacion/evidence/packages/delivery-FKciP7Y2.tar.gz`;
  SHA-256 `a8bb11783170711a2ad8e847df964fd01b389f0eaadac4cdda4cf4804a28c6d2`.

The repository's existing `lane_a_evidence.verify_package` verifies the outer and
internal hashes. Repeated real cleanup exits 0 and preserves the first archive,
checksums, result and diagnostics (`delivery-repeat-cleanup.json`). Owned
containers and volumes are gone; private recovery material remains outside Git.
`finalization.json` reports PASS including packaging.

### Existing laboratory

```bash
export GP_SOURCE_REPOSITORY=https://github.com/tfm-goldenpath/golden-path-lab
export GP_VULNERABILITY_DB="$PWD/implementacion/.tmp/vulnerability-db-delivery-FKciP7Y2"
make -C implementacion demo
```

PASS, exit 0. Original run: `implementacion/evidence/raw/run-20rUZlEe/`;
command log: `implementacion/evidence/raw/p03-development/laboratory-attempt-01.log`.
The existing target invokes `demo.sh local`: service/laboratory preflight,
reference R, initial authorization, directed faults and independent L01 replacement.
The source snapshot retains the historical algorithm:
`0adcb8ffc1080b1f5a386ad6423d8cd9c4511f09a13d7675ad3222b3c12e42e9`.

- Initial digest: `sha256:2922ac8f91a3fb4433e504a395f9deaf2258be59edd63ff3a38c4227b7552dda`.
- Independently scanned/signed/authorized replacement:
  `sha256:9141aa46d070751e63924ea45e6aae8da59cb50f23e42d75f5a3a209e97e9d0f`.
- `L01-image-update.json`: PASS, observed Deployment generation 3 and ready Pod
  image ID matching the replacement. Both HTTP responses match R's quote.
- F05–F10, F13/F14 and runtime F11/F12 retain their directed rejection/recovery
  outcomes; shared positive L03/L04/L06 observations pass. See the original
  `result.json` and per-boundary reports, not independent-sample counts.
- L05 is `NOT_EXECUTED`: no explicit immutable commit pair was selected. The
  separate F03/F04/L02 vulnerability suite was not run. This is the default demo,
  not a fresh execution of all twenty scenarios.
- Package: `implementacion/evidence/packages/run-20rUZlEe.tar.gz`;
  SHA-256 `2ed0da2d86647cbec0ce4b7544c8b3d924cee1234bc21c6d70a6ba0ebd5a63a5`.
  Outer and internal hashes pass the existing verifier.

The existing cleanup retired all three recorded containers and both attached
volumes. Identity/volume inventories and post-retirement checks are retained in
`p03-development/`. The independent laboratory DB snapshot is retained at
`implementacion/.tmp/vulnerability-db-run-20rUZlEe/`; it matches the DB identity
below. No attempt was replaced or discarded.

### Tooling, database and preservation

Effective security tools: Trivy 0.74.0, Conftest 0.70.1, Cosign 3.1.3, Helm 4.3.0,
Kyverno 1.19.1 and act 0.2.89; other effective versions are listed above. Each run
retains `tool-versions.txt`, `versions.txt`, `tools-lock.json`, source/build inputs,
original scanner reports and database identity. No tool version was updated.

The real publisher DB was downloaded for the legitimate delivery and preserved at
`implementacion/.tmp/vulnerability-db-delivery-FKciP7Y2/` (approximately 1.6 GiB):

- `trivy.db`: `41ea1f096472748bead3571d7da40bd66a68f8c04fde4aa0eea6c9dfa3cdae21`.
- `metadata.json`: `5483b54e98601142109dcddc5b95fa009b1dc10440e267105856619ed49c3d62`.
- Updated: `2026-10-25T19:10:35.479132794Z`; downloaded:
  `2026-10-25T21:35:34.093781555Z`.

The laboratory selects that preserved input and makes its own snapshot. The
original DB bytes are retained, not merely their hashes. Only the current task's
duplicate download-cache DB and metadata were removed after both hashes matched
the retained snapshot (`cache-retirement.json`); no historic snapshot was changed.
Trivy's original warnings about missing details for CVE-2026-107891 and severity
fallback remain in the logs. A favorable configured policy decision is not a
claim of complete vulnerability knowledge or absence of vulnerabilities.
Kyverno's existing ClusterPolicy deprecation warning remains separate future work.

Storage checks are retained before each integration, after builds/packaging and
resource retirement. Before the warm laboratory run, 7.5 GiB was free; the revised
forecast used observed first-run consumption and allowed 4 GiB growth plus the
3 GiB reserve, with no second cold DB download. This is a run-specific estimate,
not a universal requirement. Observed free capacity was 4.5 GiB after the initial
build/DB copy, 4.2 GiB after replacement build/admission setup and 5.9 GiB after
packaging and retirement. No task containers remain; the three unrelated volumes
are unchanged. Resource checks: `laboratory-after-build-storage.log`,
`laboratory-after-replacement-build-storage.log` and
`laboratory-after-package-retirement-storage.log`.

Archives and raw evidence remain local ignored artifacts, not PR assets or a
verified external backup. Durable external custody, recovery verification and
human review remain open under P00. No release or acceptance record is rewritten.

Hosted workflows were not dispatched. Their authorized names/permissions and
prepare/native-provenance/finish/cleanup order are unchanged. Shared optional
producer validation defaults to the historical behavior. If hosted behavior is
subsequently changed, real GitHub verification on that exact revision remains
required; local keys, kind and act cannot establish OIDC/certificate/transparency
integration. No pilot, ten-pair campaign or manual task was run.

## AJV alert follow-up

The owner supplied the alert details after publication. The existing
[Dependabot PR #23](https://github.com/tfm-goldenpath/golden-path-lab/pull/23)
proposes AJV 8.17.1 → 8.20.0 in the tooling package manifest and lockfile.
AJV is also a direct pinned tooling dependency, not only a transitive dependency
of ajv-formats. quotes-node has no declared package dependencies.

[GHSA-2g4f-4pwh-qvx6 / CVE-2025-69873](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)
describes ReDoS with `$data` enabled; the affected v8 range ends at 8.18.0.
The inspected SBOM validator uses local hash-checked schemas and constructs AJV
without `$data`. A read-only probe using its constructor options and installed
8.17.1 reported `dataEnabled: false`, consistent with the
[documented default](https://ajv.js.org/options.html#data).
This supports a limited inference that this specific prerequisite is absent in
the inspected validation path; it is not a blanket safety claim or a fixed alert.

Keep remediation separate from P03. PR #23 alone is insufficient for current
source: `validate-sbom-schema.mjs` explicitly rejects versions other than 8.17.1.
The bounded update must also synchronize that version check, its SBOM regression
and schema README, then run schema/contracts, the shared suite and representative
delivery before claiming compatibility. Preserve historical reports/snapshots.
No dependencies were updated or PR merged as part of this follow-up. The original
P03 integrations still refer to implementation `e3850a4` and AJV 8.17.1.

## Assistance and review

| Activity | AI contribution | Human review | Decision |
| --- | --- | --- | --- |
| P03 implementation, tests and documentation | OpenAI Codex / GPT-6: code inspection, extraction, regression checks and evidence reporting | Pending | Draft for human review; no acceptance or custody decision inferred |

Separate dependency, devcontainer (including optional Codex) and security-toolchain
refresh branches are specified in TODO and the maintenance sequence. They are
outside this diff; physical separation and the consumer template remain later work.

## P01b implementation boundary — 4 November 2026

Explicit owner authorization covers physical extraction of the single local
quotes-node path, compatibility adapters, commit/push and one draft PR. Baseline:
`1f9cc61d267aeeff1df1f7e9fa88d74cbaeb4211` (fetched main, merged PR #73).
Untracked root npm files, existing evidence and historical review/custody records
are preserved. This authorization does not close P00/P01 human gates.

Before editing: extract `bin/deliver` and cohesive `src/` context, delivery, trust,
workload and local environment modules; retain laboratory source selection,
scenario readiness, R execution, measurements/manual adapters and archive
allowlists outside that dependency closure. Neutral contract/authentication,
source/build capture and archive primitives have one implementation. The current
service, pinned tooling, policies and schemas remain explicit inputs under
`implementacion/`; moving all configuration and laboratory files is deferred.

Acceptance: legacy entry points/CWD/statuses and provenance identities remain;
an isolated genuine sparse checkout runs actual delivery with laboratory
execution modules absent, followed sequentially by a representative lab run.
Focused boundary/compatibility tests, doctor/shared suite, inventory and links
are required. Real execution, package hashes, retirement and limits are recorded
below when observed; a static dependency check alone is insufficient.

### P01b pre-integration checks

- `doctor` PASS with existing pinned tools (no installation/update). Shared
  `make test` PASS: 9 environment, 1,007 service/unit, 130 Python policy, real
  Conftest/Kyverno, offline Cosign, static F01/F02, 153 defense and 22 release tests.
- Focused affected checks: 169 PASS. New boundary tests execute actual service,
  policies, build capture, packaging and verification in a lab-free projection;
  synthetic unit Git identity is explicitly labelled and not integration evidence.
- Exact inventory: 572 paths; 10 regressions PASS. Local link/anchor check: 473
  links in 15 changed Markdown files PASS. `git diff --check` PASS.
- Initial focused/shared failures are retained: isolated harnesses needed the
  extracted module paths, and committed input verification needed Git executable
  bits rather than unrelated group-write permission bits. No oracle was relaxed.
- Logs: `implementacion/evidence/raw/product-core-separation/` (outside Git).
- PR #73 issue form: read-only URL open attempted; available web access rejected
  the URL as restricted. No browser runtime is available. The three required/two
  optional fields and guide links were **not checked in the rendered GitHub form**;
  no issue was submitted. Existing local form checks remain separate.

Before real integration: 4 CPUs, about 13 GiB available RAM, 8.6 GiB free on the
shared workspace/Docker filesystem and 108 GiB on separate `/tmp`; no containers,
three pre-existing volumes preserved. Pinned kind/zot/BuildKit images are cached.
The existing real `security-refresh-db` (publisher update 28 October 2026) is
selected through `GP_VULNERABILITY_DB`; each run retains its own immutable
snapshot on `/tmp`. This is compatibility validation against those identified
bytes, not a current vulnerability reassessment. Cold 8-GiB and 3-GiB reserve
checks are unchanged.

### P01b observed execution and handoff

Candidate history: extraction `8eca007ea4873751212a2134ed4ad2e067623955`,
entry-directory compatibility `185401c2796a3931b28f95c13a2d243119b916e4`, and
pure shell compatibility imports `6e721a1fcf5d08d763a1e8640525207a6954a2cc`.
The last correction replaces external `dirname` in **sourced laboratory
adapters** with Bash expansion. Final documentation follows these tested commits;
no integration is attributed to a later documentation commit.

| Execution | Exact candidate / result | Preserved evidence |
| --- | --- | --- |
| Genuine lab-free sparse checkout; `tests/integration/product-boundary.py --output /tmp/gp-product-core-validation/export-01 --run` | `185401c`; `delivery-UMD8FHsa` PASS including finalization. Original Git HEAD, 61 selected committed inputs (28 under `bin/`/`src/`), actual service/tooling/policies/schemas; no scenario, measurement, manual or defense implementation. All protected stages completed. | `product-core-separation/export-01/verified.json`, original export receipt, raw evidence, console and package |
| First `make -C implementacion demo` | `185401c`; `run-WKGLaeqZ` ERROR in preflight: strict module-import test detected external `dirname`. Infrastructure, build and scenarios NOT_REACHED. Make exit 2; underlying failure 1. | `product-core-separation/laboratory-01.log`, attempt/package verification receipts; raw `run-WKGLaeqZ` and its archive |
| Fresh `make -C implementacion demo` after correction | `6e721a1`; `run-M7Hm2UlM` PASS, exit 0. L01 and shared L03/L04 replacement, L06, directed CI/admission checks and F11/F12 rejections completed. Optional L05 NOT_EXECUTED. | `product-core-separation/laboratory-02.log`, raw `run-M7Hm2UlM`, audit/package/retirement receipts |

Paths above are relative to `implementacion/evidence/raw/`; canonical laboratory
archives are under `implementacion/evidence/packages/`. The product archive/raw
copy is also retained in `product-core-separation/export-01/`. Original export
and private recovery remain locally preserved, outside Git; a separate ignored
private recovery copy is under `.tmp/product-core-separation/`. These are local
observations, not verified external custody or human acceptance.

The product image is
`sha256:56e0b30541ada6787b57c1b57fc18e78122bd971cd67de4d046030ef0f5bf37d`;
source snapshot
`0f033f26404b31413a1687c7b9ca1265b77e7cca6391bc9862bf2a2c012a91ab`.
The laboratory initially delivered
`sha256:0c9d4aeefd7e56f5b42cbc9b77553c7884709415d428fe3eff564f49c7f389ab`
and replaced it with
`sha256:c6545a0fc12193911ee926565eed88a33fcfae06c4e48108f6f8d2c03d63705e`;
source snapshot
`2f2bbc180e4565f6e8ffab5c4fb81d88ccaac13d641eaa08b26c68f6d6030b0c`.
`product-input-continuity.json` records an empty diff across every exported
product input between `185401c` and `6e721a1`. Both integrations use the retained
DB identified above; original report bytes and DB identities are preserved.

Independent archive verification checked the outer checksum, safe regular
members and every internal hash using the extracted verifier:

| Archive | SHA-256 | Internal hashes |
| --- | --- | ---: |
| `delivery-UMD8FHsa.tar.gz` | `a315cee5b04da42bb39a29e9724a70e85466ee83db1f23f8e7a24219a2d98599` | 160 |
| Failed `run-WKGLaeqZ.tar.gz` | `6c9db41f63a92862177a91e2a8b96c0bbc8127ab015b61e03a4450c81742edc3` | 5 |
| `run-M7Hm2UlM.tar.gz` | `7417e9de3c6f7ef3fd02cf69dea6d2cd852d9a3da364aa7c142ee25b17509dc8` | 1,723 |
| Historical P03 `delivery-FKciP7Y2.tar.gz` | `a8bb11783170711a2ad8e847df964fd01b389f0eaadac4cdda4cf4804a28c6d2` | 163 |

The existing lane-A auditor passes 26 applicable boundaries on the successful
laboratory run. Its full-catalogue aggregate remains FAIL because it also requires
the unselected L05 pair; the original report is retained, not relabelled PASS.
An initial relative-directory audit invocation produced six filename-association
failures; repeating with canonical absolute evidence paths resolves those six.
Both audit reports remain available. This is one representative integration,
not a full scenario catalogue, vulnerability suite, campaign or independent
sample for each shared L01/L03/L04 observation.

After the import correction, `make -C implementacion test` passes on `6e721a1`:
9 environment, 1,009 service/unit, 130 Python policy tests, real Conftest/Kyverno,
offline Cosign, static F01/F02, 153 defense and 22 release tests
(`shared-third.log`). `doctor` passed earlier with the same pinned environment.
Focused tests cover bare/absolute/legacy entry directories, pure imports,
source tampering, ambiguous roots, failure classifications, foreign-resource
refusal and packaging compatibility. Final documentation checks pass: exact 572-path inventory, 10 inventory
regressions, 473 local links/anchors across 15 changed Markdown files and
`git diff --check`. No dependency, policy, schema, Action or
admission-engine version changed.

Each successful run retired its three recorded containers and two recorded
volumes. Independent Docker inventory checks confirm all six container IDs and
four owned volumes absent, with the three pre-existing volumes retained. Repeated
legacy product cleanup exits 0 and leaves the first diagnostics/archive unchanged.
The runs were sequential. Lowest observed Docker/workspace free space was about
6.8 GiB; after retirement it is about 8.5 GiB (32-GiB filesystem), with 103 GiB
on separate `/tmp`, 12 GiB available RAM and 80% free workspace inodes. The
3-GiB reserve and operation-specific growth checks were never lowered. Original
snapshots and recovery files were not pruned.

Hosted workflows and producer identities are unchanged. A retained comparison
finds the seven relocated trust/contract helpers byte-identical after normalizing
imports. Local runs do not prove hosted OIDC, certificate or transparency behavior;
no hosted integration or publishing workflow was dispatched. Hosted readiness
remains pending its separately authorized real run. PR #72, consumer interfaces,
Java, admission-selection blockers and P00/P01 human gates remain separate.
Rollback is a source revert of this bounded PR; retain all original archives,
raw evidence and private recovery, and use their recorded source versions.

| Activity | AI contribution | Human review | Decision |
| --- | --- | --- | --- |
| P01b extraction, compatibility tests, real local integrations and documentation | OpenAI Codex / GPT-6 | Pending | Draft; bounded technical checks do not establish human acceptance or custody |

## Interface consolidation and English layout — 5 November 2026

Base: fetched `origin/main`, exactly merged PR #74 commit
`e0f2f56980ffbb00b926521ecf58eed64c713f1b`; no additional main commits.
Owner authorization covers the interface refactor, tracked English path migration,
local tests/integrations, commit/push and one draft PR. Historical custody and
broader acceptance remain separate. Untracked root npm files and ignored originals
are preserved. The inventory before migration is retained at
`implementacion/evidence/raw/delivery-interface-consolidation/preservation-inventory.json`.

Interface commit `2ce8473` removes caller-local DB selection, documents capture
validation ownership and checks required readiness adapters before side effects.
Focused tests: 106 PASS. The separate migration makes `implementation/` canonical,
retains Linux source aliases/Make delegation and recognizes exact historical
cleanup roots. Local provenance producer identifiers stay unchanged; old Git
source selection and archive verification retain their original path semantics.
No policy, pin, scenario oracle or hosted identity is changed. `contracts.mjs`
needs no split for these callers.

Environment: 4 cores, 15 GiB RAM, 32-GiB workspace/Docker filesystem with 8.5 GiB
initially free; separate `/tmp` had 109 GiB free. Three pre-existing Docker volumes
and cached images are preserved. The existing 3-GiB reserve and operation growth
checks are retained. Validation logs after migration use
`implementation/evidence/raw/delivery-interface-consolidation/`; earlier logs
remain at their original spelling.

The historical `implementacion/evidence/packages/delivery-FKciP7Y2.tar.gz` passes
read-only current verification: SHA-256
`a8bb11783170711a2ad8e847df964fd01b389f0eaadac4cdda4cf4804a28c6d2`, 163 internal
hashes. The retained real DB input is `implementacion/.tmp/security-refresh-db`,
publisher update `2026-10-28T13:01:10.618103814Z` (about eight days old), DB hash
`faa015429c6ebd9c9a672be99cfbd5aecec2eade21d1d6e59d4dc091dc752ff3`, metadata hash
`75ccefb55d36ea911801b1cdb555f4d022f0fc8a813e061b0d491fe9752dc706`.
Using these identified bytes tests compatibility, not a current vulnerability
assessment. Each ordinary delivery still creates its own snapshot.

The results below record exact committed runtime revisions and original attempts.
Hosted OIDC integration is NOT_EXECUTED; no publishing workflow is dispatched.
Human review remains pending. Next: independent consumer template after review.
Rollback reverts source changes while retaining all evidence and original paths.

### Pre-integration checks

- `make -C implementation doctor`: PASS with existing pinned tools.
- `make -C implementation test`: PASS, 9 environment, 1,029 service/unit,
  130 Python policy, actual Conftest/Kyverno, offline Cosign, static workflows,
  153 defense and 22 release tests (`shared-02.log`).
- Migrated focused checks: 167 PASS; subsequent capture/recovery/dependency checks:
  89 PASS. Inventory: 816 tracked paths including 244 compatibility entries;
  11 validator regressions PASS. Changed-guide check: 1,115 links in 87 files
  passed before the final runbook/navigation additions. `git diff --check` PASS.
- The first shared attempt stopped after 1,026 passing unit tests and one failure:
  copying a symlinked installed-dependency tree let the synthetic version-mismatch
  test modify the original installed AJV metadata. The original metadata was
  restored from a fresh installation of the unchanged lock, with semantic equality
  checked apart from the deliberate test version. Canonical dependencies now have
  their own installation; the test copies dereferenced files. Original failure,
  install and restoration receipts are retained; no dependency pin was changed.
- 65 historical source artifacts are byte-identical to the base; 25 selected
  service/policy/schema/pin files are byte-identical after relocation. Inventory
  checks confirm all 62,357 pre-existing ignored evidence/private files retain
  their original size and modification time (dependency/cache files excluded).

The source migration uses compatibility links around ignored directories rather
than moving those originals. Git configuration files themselves are canonical
regular files, since Git deliberately refuses symlinked ignore/attribute files.
New tools/dependencies, raw evidence and private recovery remain ignored.

### Committed runtime integrations and preservation

Both real integrations ran sequentially on
**`ff8d3fca5d8a9e3fada437a915df8047830b76e1`**. The shared suite above tested the
working-tree bytes subsequently committed at that revision; the demo's own
service/unit/policy preflight also ran on the committed revision. The final
handoff changes documentation only, with selected executable/configuration
inputs compared to this execution revision. No execution is attributed to a
later documentation SHA.

| Execution | Actual result | Original evidence |
| --- | --- | --- |
| `python3 implementation/tests/integration/product-boundary.py --output /tmp/gp-delivery-interface-20261105-knhva0vs/product-export --run` | PASS, exit 0, `delivery-nvqUQ9k6`; all 21 protected stages and finalization PASS. Genuine sparse checkout at the original commit with lab execution files absent. Authenticated gates, restricted-actor admission, Deployment/ready-Pod digest and HTTP responses checked. | Original export remains at that absolute path; retained raw/package/console/export receipt under `implementation/evidence/raw/delivery-interface-consolidation/product-01/`. |
| `make -C implementation demo` | PASS, exit 0, `run-CeZOMzLD`; initial delivery, directed rejection/recovery and independently analyzed/signed replacement completed. Optional L05 NOT_EXECUTED; separate F03/F04/L02 suite not run. | `implementation/evidence/raw/run-CeZOMzLD/`; console `delivery-interface-consolidation/laboratory-attempt-01.log`. |
| Actual scripted DB adapter with the preserved real DB | PASS; explicitly selected original DB path, no destination copy, repeated identity checks pass. No manual tasks or measurement campaign. | `delivery-interface-consolidation/scripted-reuse/` and `scripted-reuse.log`. |

The existing lane-A auditor passes **26 applicable boundaries**. Its complete
catalogue aggregate remains **FAIL** solely because L05 requires an unselected
explicit source pair. `laboratory-audit.json`, its exit status and original log
retain that outcome; this is not a complete twenty-scenario campaign. Static
F01/F02 receipts are under `delivery-interface-consolidation/workflows/`, on the
same committed source. No hosted OIDC execution is claimed.

The current verifier checked outer checksums, safe members and every internal
hash, including the retained product copy and the historical archive above:

| Archive | SHA-256 | Internal hashes |
| --- | --- | ---: |
| `delivery-nvqUQ9k6.tar.gz` | `fc2b4eaf7dc6170f64cf8cadc63728ba6c5f3fc2c295c9885aab329c762af94c` | 160 |
| `run-CeZOMzLD.tar.gz` | `489ddc385ff6b3a5be896d81a1e66e29511edce48f37078a17e94fdbd8d92910` | 1,725 |

Product source snapshot:
`7c4544cd89d68b8ffc513cc59d424fb88864f61fdc6173a44f7dd3d39f223777`;
image `sha256:191716910814dbb76a22b24333f2cba136b4938bccbd7db6d0eacbf7f9ba3329`.
Laboratory source snapshot:
`1bf168bb8ece0506add35f19687ae622dc67d8d4df70664d6f7e7923886e79b2`;
initial image `sha256:e704d50353dc39977941fecb6e58c090b927eb2b5aa8a717d5a6a7b0598504a6`,
replacement `sha256:d98d74ddf70c8f27ecb5f2055cf437c99e8f70c9c4771fcd2118f0eadc9c2ec9`.
Each run's independent immutable snapshot is retained under
`/tmp/gp-delivery-interface-20261105-knhva0vs/snapshots/`; both match the original
DB/metadata hashes above and pass the current identity check after execution.

All six observed immutable container IDs and four owned volumes are retired;
`product-verified.json` and `laboratory-retirement.json` record identity/metadata
checks and the unchanged three pre-existing volumes. Repeated product cleanup
from an unrelated CWD passes and preserves the first result, finalization, log,
diagnostics and package hashes. Private recovery copies are under
`implementation/.tmp/delivery-interface-consolidation/`; they are excluded from
public packages. Originals, failed development checks and the sparse checkout
remain preserved. No global prune, evidence cleanup, tag substitution or external
custody claim is made.

Lowest observed workspace/Docker free capacity was **6.7 GiB**; after retirement
it is **8.5 GiB**, with **102 GiB** free on separate `/tmp`, about **13 GiB** RAM
available and **80%** free workspace inodes. Capacity logs cover pre-creation,
build/scanning and packaging/retirement. Guards were never reduced. Existing
Kyverno deprecation warnings remain a separate admission-selection decision.

Remaining old spelling is intentional: Linux compatibility entries, stable local
provenance identifiers, exact historical recovery roots, old immutable Git-tree
selection (L05, frozen paired warmup and release specification), and dated records,
fixtures and generated historical bytecode. No historical claim is assigned to
renamed bytes. Legacy JS export identities and Python verifier access pass their
read-only checks. Symlink support is limited to the supplied Linux environment;
canonical commands work without the legacy source tree in the product export.
Historical manual/defense sessions use their recorded revision in the original
repository location; this branch adds no cross-revision resume contract.

| Activity | AI contribution | Human review | Decision |
| --- | --- | --- | --- |
| Adapter contracts, English migration, regressions, local integrations and handoff | OpenAI Codex / GPT-6 | Pending | Draft for review; no acceptance, custody or measurement decision inferred |

Final documentation checks: **1,100 links/anchors in 87 changed guides PASS**,
exact 816-path inventory and 11 inventory regressions PASS, and diff whitespace
checks PASS. `final-source-continuity.json` compares all 61 product file contents
and Git executable classifications with the actual sparse export, plus the
unchanged laboratory source snapshot. The first whole-snapshot comparison found
filesystem permission differences between sparse checkout and workspace; the
existing capture includes those bits. Both original hashes and that observation
are retained, rather than normalizing historical receipts. No file contents or
Git executable classifications differ, and the final source delta is documentation
only, so the runtime integrations remain applicable to their recorded boundary.
Private recovery verification derives each retained key's public key and matches
it to the run's retained public anchor; kubeconfig contexts match their run owner.
Final push/PR CI URLs and status are reported in the PR handoff on its exact head.
