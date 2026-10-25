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
