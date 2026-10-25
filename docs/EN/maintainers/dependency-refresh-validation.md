# Validation dependency refresh

[Maintenance map](repository-map.md) · [Legitimate delivery](../legitimate-delivery.md)

Base: fetched main `32aca8fa4ba8c94af594fb3ccdc8039603507123` (PR #61 merge),
checked on 25 October 2026. Branch: `chore/dependency-refresh`. This is a bounded
validation dependency update, not an environment or security-toolchain refresh.
The owner's unrelated untracked root npm files remain untouched.

## Inventory, findings and version selection

The tracked manifest inventory contains 13 files: two dependency-free quotes-node
manifests, two maintained tooling manifests, eight F03/F04/L02 fixture manifests
and the vendored L03 component manifest. Only the tooling pair changes. Fixtures,
service manifests, official CycloneDX files/hashes and historical records remain
unchanged. No package is added to quotes-node.

The initial full tooling `npm audit --json` completed with exit 1 and findings for
two packages, rather than a registry/transport failure:

| Package | Before | After | Reason and boundary |
| --- | --- | --- | --- |
| AJV | 8.17.1 | 8.20.0 | Exact current stable release in registry/upstream metadata; corrected v8 line, compatible format plugins. |
| fast-uri (AJV transitive) | 3.1.8 | 3.1.9 | Patch on AJV's accepted `^3.0.1` line; four advisory fixes. Current overall latest 4.2.3 is outside that range and is not forced through an override. |
| ajv-formats | 3.0.1 | unchanged | Current stable; AJV dependency/peer range `^8.0.0`. |
| ajv-formats-draft2019 | 1.6.1 | unchanged | Current stable; peer accepts AJV; real international-format tests retained. |
| @devcontainers/cli | 0.89.0 | unchanged | Current stable, Node `>=20.0.0`; existing Node 24.21.0 satisfies it. |

[AJV GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)
(CVE-2025-69873) concerns ReDoS with `$data` enabled and affects v8 before 8.18.0.
The inspected validator does not enable `$data`; that limited exposure assessment
does not remove the vulnerable dependency. AJV is direct and reused by both
format plugins, not merely transitive. The final tree has one installed AJV copy,
8.20.0, with both plugins deduplicated to it.

The baseline additionally reports fast-uri
[scheme decoding](https://github.com/advisories/GHSA-w74x-v6f9-j3xg),
[path equivalence](https://github.com/advisories/GHSA-xhq7-xmqj-769h),
[host canonicalization](https://github.com/advisories/GHSA-wjr9-j795-jxcr) and
[suffix scheme injection](https://github.com/advisories/GHSA-333x-w4r6-6crp)
advisories. The [3.1.9 release](https://github.com/fastify/fast-uri/releases/tag/v3.1.9)
provides the compatible fix. URI resolution remains confined to hash-checked local
schemas; no document-controlled network loader is added.

AJV and the format-plugin metadata declare no Node engine constraint; this
change validates them on the existing Node 24.21.0, not every possible runtime.

The existing [Dependabot PR #23](https://github.com/tfm-goldenpath/golden-path-lab/pull/23)
was OPEN at `7d5734000e2b3a71d4585c463c1aead004b9a26d` when inspected. Its two-file
npm update does not synchronize this repository's strict installed-version guard,
SBOM regression or schema documentation, nor establish the new integration.
This PR includes those obligations and the fast-uri patch; it does not close or
merge #23. [AJV's release](https://github.com/ajv-validator/ajv/releases/tag/v8.20.0)
and [format documentation](https://ajv.js.org/guide/formats.html) accompany retained
registry version, integrity, engine and peer/dependency metadata.

The final full tooling audit completes with exit 0 and no reported findings.
This describes that successful registry query, not absolute security or an audit
of intentionally vulnerable fixtures or opaque bundled code. No dependencies were
omitted from the tooling audit. Both original JSON reports, stderr and exit codes
are preserved separately.

## Compatibility and reproducibility

Runtime versions stay Node 24.21.0 / npm 11.19.0. Both updates use npm with
`--package-lock-only --ignore-scripts --no-audit --no-fund`; AJV uses
`--save-exact`, and `npm update fast-uri` selects its compatible patched line.
No integrity/resolved fields were edited by hand and no override was added.
Two subsequent `make -C implementacion setup-validation` installations pass;
recorded SHA-256 values prove `npm ci` leaves both tracked package files unchanged.

The strict validator guard now requires AJV 8.20.0; it still requires the exact
format-plugin versions. CycloneDX 1.7, draft-07, original local schemas/hashes,
format assertions (including Unicode), no coercion/default insertion, no `$data`
and no remote schema loading remain intact. Reports retain effective installed
versions, exact document hashes and real outcomes. Schema validity still does not
prove mandatory lab content, subject digest, authenticity or inventory completeness.

The CLI is used by `lane-a-validation.py launcher`: install the locked tooling,
copy the installed CLI outside the checkout into `RUNNER_TEMP/lane-a-launcher-*`,
then pass that executable to devcontainers/ci so lifecycle npm installation cannot
remove the running CLI. The local CLI reports 0.89.0; no PATH CLI or such temporary
launcher existed during inspection. Neither that copy mechanism nor the CLI/action
versions change. npm reports no advisory for this package, but its empty declared
dependency set does not independently audit everything bundled into its executable.

## Actions and update automation assessment

All eight unique Action references remain unchanged full SHAs. The table records
upstream tags, pinned `action.yml` runtime and latest release metadata observed on
25 October. Raw current/latest action definitions, latest resolved SHAs and release
notes are retained in `actions-metadata.stdout`; tag matching is retained separately.

| Action | Existing version / SHA | Runtime | Candidate / required follow-up |
| --- | --- | --- | --- |
| actions/checkout | 7.0.1 / `3d3c42e5aac5ba805825da76410c181273ba90b1` | node24 | Current stable; retain. |
| actions/setup-node | 7.0.0 / `820762786026740c76f36085b0efc47a31fe5020` | node24 | 7.1.0 adds version/manifest retry and cache/dependency changes; separate runner/cache checks and real CI. |
| actions/upload-artifact | 7.0.1 / `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` | node24 | 7.0.2 updates artifact library/retry behavior; separate upload/download/hash validation in real CI. |
| actions/attest | 4.2.2 / `1e69f48acb82d1966a394da916b4c1698aa569d6` | node24 | Current stable; retain identity, permissions and native provenance contract. |
| actions/upload-pages-artifact | 4.0.0 / `7b1f4a764d45c48632c6b24a0339c27f5614fb0b` | composite | 5.0.0 changes nested artifact action/hidden-file support; separate Pages packaging and export checks. |
| actions/configure-pages | 5.0.0 / `983d7736d9b0ae728b81ab479565c72886d7745b` | node20 | 6.0.0 uses node24; separate Pages/runtime validation. |
| actions/deploy-pages | 4.0.5 / `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` | node20 | 5.0.1 uses node24 and changes deployment polling; separate authorized Pages validation. |
| devcontainers/ci | 0.3.1900000450 / `513af61f4de4f75d37e4438f184ba4358f0fc1ca` | node24 | Current stable; future rebuild must validate its interaction with the copied CLI. |

The public security-advisory endpoints for these eight repositories and the CLI
returned empty lists successfully. That limited query is not a transitive audit
of compiled Action bundles. No Action is claimed updated here; the useful runtime,
cache and publication checks above remain a separate automation increment.
Workflows, triggers, permissions and signing identities are unchanged.

No Dependabot/Renovate configuration is tracked. Existing #23 establishes a bot
security-update PR, not a configured version-update schedule. The repository
security-update settings endpoint returned HTTP 403; its settings remain unknown.
A later small configuration may target only `/implementacion/tooling`, group
AJV/format-plugin minor and patch updates, cap open PRs at three and retain review
and checks without automerge. Fixtures must remain excluded. No second updater,
alert suppression or automation configuration is introduced in this urgent patch.

## Checks and evidence

Ignored evidence root: `implementacion/evidence/raw/dependency-refresh-9dxb9bqj/`.
Every captured command has separate `.stdout`, `.stderr`, `.exit` and
`.command.json` records. It includes the base/date, dependency trees, initial and
final audits, package/Action metadata, installation receipts and test outputs.
No raw logs, package downloads, keys or npm credentials are committed.

Baseline focal suite: 99 PASS. Three added characterization checks pass on baseline
before updating installed dependencies: no input mutation/coercion/defaults,
altered schema hashes and incompatible installed validator rejection. A fourth
regression guards network primitives while validating a document with a schema URL.
These supplement existing retained Trivy, nested hash, international format,
unsupported version, malformed JSON, missing-reference and delivery fail-stop tests.
No retrospective failing-test history is claimed.

The candidate passes 103 focal tests, `make -C implementacion doctor` and the
complete `make -C implementacion test`: 6 environment, 1,000 service/unit,
45 Python policy, 153 defense and 22 release tests, plus real Conftest/Kyverno,
offline Cosign bundles and workflow checks. `git diff --check`, 161 changed-doc
relative targets and the inventory checks pass: 509 tracked paths, 233 individually
enumerated scripts/helpers/tests and 10 inventory tests. The map uses validator
output. These checks run on the candidate content before its implementation commit.

Implementation commit: `7fe7a760454900caec08737f93c632168596e4eb`.
The integration below runs on that clean tracked revision. The later commit
recording its outcome changes only this document and TODO; it does not receive
retroactive attribution for the integration. No orchestration, laboratory adapter
or hosted behavior changes warrant a second full laboratory integration;
focal/shared compatibility checks and the real delivery cover the changed boundary.

### Real legitimate delivery

Executed from the repository root with the existing tools on PATH:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export GP_VULNERABILITY_DB=/tmp/dependency-refresh-db-wn32n0dg
bash implementacion/scripts/deliver.sh local
```

The temporary DB input was restored from the verified archive described below;
it was retired only after verifying the archive and the new retained local snapshot.
This command records the actual execution, not a promise that its temporary input
still exists. For another run, select the retained new snapshot or restore the
archive and verify its original hashes first; recheck available capacity.

Run `delivery-ZxZX3rpM`: PASS, exit 0. Inspection of `result.json`, all 21 entries in
`delivery-steps.json` and `finalization.json` confirms successful delivery, cleanup
and packaging. Actual SBOM generation/presigning and authenticated-bundle reports
all record AJV 8.20.0, formats 3.0.1 / 1.6.1, and VALID. The real image-signature,
SBOM, provenance and results contracts remain distinct. Fresh authorized admission
reports VERIFIED; the restricted actor's request succeeds. Rollout, effective
Deployment/ready-Pod digest and HTTP health/version/quote observations pass separately.

- Raw evidence: `implementacion/evidence/raw/delivery-ZxZX3rpM/`.
- Implementation: `7fe7a760454900caec08737f93c632168596e4eb`.
- Source snapshot: `2791741ce0807a77fafa3b82d05561a9e40a43f8c9a2a049daac9b020eb9b86d`.
- Configuration hash: `27d61770ff81fea6087480027960a09491f4d764fafaafddf13d2c43baee53fa`.
- Image digest: `sha256:70b5acf6fa1b3a4a39a95696d38243b00d9c2f5979839d6fc37ff27f0ec2d864`.
- Package: `implementacion/evidence/packages/delivery-ZxZX3rpM.tar.gz`.
- Package SHA-256: `bf2990e4af5abf30a1aa09090f1fa8b6bf1a9087ee254d6f81a9c9fde64626a0`.

The existing `lane_a_evidence.verify_package(path)` verifies the outer checksum
and every internal manifest entry without extracting/executing archive code.
`integration-verification.json` in the maintenance evidence records those checks,
matching source, schema versions and immutable resource retirement. All three
owned containers and both owned volumes were retired; the three prior volumes'
full metadata remains unchanged. Private recovery material remains excluded from
the public package. HTTP `/version` identifies the implementation commit; the
quote is EUR / 1000 cents / demo-v1.

The preserved DB came from the real publisher download used by P03, updated
`2026-10-25T19:10:35.479132794Z`, downloaded `2026-10-25T21:35:34.093781555Z`.
Both its original identity and archive recovery were verified before reuse:

- DB SHA-256: `41ea1f096472748bead3571d7da40bd66a68f8c04fde4aa0eea6c9dfa3cdae21`.
- Metadata SHA-256: `5483b54e98601142109dcddc5b95fa009b1dc10440e267105856619ed49c3d62`.
- New retained snapshot: `implementacion/.tmp/vulnerability-db-delivery-ZxZX3rpM/`.

No new publisher download or historic identity rewrite was needed. Trivy's original
warnings about missing details for CVE-2026-107891 and vendor severity fallback
remain in `vulnerability-scan.log`; the configured scan policy passes without a
claim of complete vulnerability knowledge. Existing Kyverno deprecation warnings
remain future policy work. Effective tools are recorded in the run and doctor:
Docker 29.8.0, Buildx 0.37.1, kind 0.33.0, kubectl 1.35.8, Trivy 0.74.0,
Conftest 0.70.1, Cosign 3.1.3, Helm 4.3.0 and Kyverno 1.19.1; none were updated.

This is one legitimate delivery, not all L01 or the catalogue. No pilot, campaign,
manual task or hosted workflow was dispatched. Local keys/kind do not validate
GitHub OIDC, certificate or transparency integration.

## Capacity, retention and next work

The machine reports 4 CPUs / 15 GiB RAM; the 32-GB filesystem is shared by Docker
and the checkout. Initially 5.9 GiB was free, below the coordinator's unchanged
8-GiB Docker preflight. `/tmp` was separately measured at 105 GiB free and is not
durable custody. No containers were active; three pre-existing volumes are untouched.

The owner explicitly authorized retiring previous evidence/snapshots to recover
space. Only the four DB/metadata files in the two identical P03 snapshots were
removed, after comparing both copies with P03's recorded hashes and making and
verifying `retained-p03-vulnerability-db.tar.gz` under this maintenance evidence
root. A test restoration also matched the original hashes. Original reports,
packages, other snapshots and both small scanner caches remain unchanged.
`snapshot-retention.json` identifies the exact retired paths, archive hash and
restored temporary input. This recovers free capacity to 8.8 GiB while retaining
the original bytes in a local archive; it is not an external custody claim.
Archive SHA-256: `b052b596c8de171c115e25ae8d154d0de44c67f7f117252e50f4b00ae712da30`.
Both P03 packages still pass their original outer/internal hashes. The new run's
storage logs and the maintenance `resources-*` records cover preflight, post-build,
post-analysis, packaging and final retirement. Final workspace/Docker free capacity
is 7.3 GiB; `/tmp` returns to approximately 105 GiB after the temporary DB restore
is retired. No global cache/volume prune was used.

To recover either P03 DB at its recorded path, extract the archive with `tar -xzf
ARCHIVE -C ORIGINAL_SNAPSHOT_DIRECTORY`; it contains only `db/trivy.db` and
`db/metadata.json`. Check against that run's original `database-identity.json`
with `python3 implementacion/scripts/vulnerability-database.py check DIRECTORY
IDENTITY_FILE`. Never regenerate the identity to fit changed bytes. The temporary
restore is an integration input; the verified compressed copy remains
in the checkout's storage and must be included in eventual external custody.

Next increments remain `chore/devcontainer-refresh` (reproducible runtimes/images,
three profiles, optional Codex, 4 cores / 16 GB / 32 GB and capacity validation),
then `chore/security-toolchain-refresh`, followed by physical separation/interface
consolidation subject to actual custody/review gates. Action updates and update
automation remain explicit outstanding items; this does not close all branch-A work.

AI contribution: OpenAI Codex / GPT-6 inspected, implemented, tested and documented
the change. Human review is pending; no P00 custody or acceptance decision is inferred.
