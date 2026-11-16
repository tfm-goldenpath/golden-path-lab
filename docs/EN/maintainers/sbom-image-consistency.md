# Independent image inventory experiment

[Español](../../ES/maintainers/sbom-image-consistency.md).

## Question and boundary

Can an independent filesystem inventory detect concrete inconsistencies in the
current Trivy CycloneDX SBOM? This opt-in experiment compares installed dpkg
binary identities, full versions and architectures on **linux/amd64**. It never
runs the application. It does not change `bin/deliver`, seven checks, attestations,
Conftest, Kyverno, vulnerability scanning or admission.

Base: PR [#80](https://github.com/tfm-goldenpath/golden-path-lab/pull/80), actually
merged 16 November 2026 at `03203f4a1b99ed15b7ca1811ee6915e0e3923494`.
A clean worktree `/workspaces/sbom-image-consistency` preserves the pre-existing
newline-only lock change in `/workspaces/golden-path-lab`. Neither that change nor
historical evidence was overwritten. Experimental contract was committed at
`4c5516c` before scanning. Executed acquisition code: full engine commit
`391b77aa4313040a60a8b900fcd45160b68f0766`; receipts also hash the runner bytes.

## Tool choice and independence

Official sources consulted 16 November 2026:
[release](https://github.com/anchore/syft/releases/tag/v1.57.1),
[verification](https://oss.anchore.com/docs/installation/verification/),
[scan targets](https://oss.anchore.com/docs/guides/sbom/scan-targets/),
[catalogers](https://oss.anchore.com/docs/guides/sbom/catalogers/),
[license](https://github.com/anchore/syft/blob/v1.57.1/LICENSE), and
[dpkg parser](https://github.com/anchore/syft/blob/v1.57.1/syft/pkg/cataloger/debian/parse_dpkg_db.go).
Syft 1.57.1 is a stable Apache-2.0 release. The experiment retains Syft JSON
16.1.13 native metadata rather than losing it in another CycloneDX conversion.
The signed producer checksums were verified with existing Cosign 3.1.4, exact
release-workflow certificate identity and GitHub OIDC issuer. The archive SHA-256
is `bf52519eb57f675d47c07d43213cb6dff6449f3d6d1147ff6701ed91f44eef0c`.
Only the bounded regular `syft` member was installed locally; no installer pipe,
nightly, production pin or devcontainer dependency changed.

Trivy remains **0.76.1**. Syft reads `docker-archive:` with `scope=squashed`,
`dpkg-db-cataloger` only and file catalogers disabled. Its recorded effective
cataloger list is checked. It never reads the Trivy report or discovers attached
SBOMs. Both scanners read the same archive, hashed before/after each process.
The runner reads bounded outer image metadata without extracting any filesystem
layer; config digest and platform must agree with both reports. Syft's reconstructed
Docker manifest digest is not the OCI manifest digest emitted by Buildx.

Limits: two scanner CPUs, two workers, 900 seconds, 32 MiB report/log acceptance
limits, 2 GiB image/per-file hard bound, 3 GiB reserve plus estimated growth.
Polling may overshoot the report limit before rejecting; the hard per-file bound
also covers scanner temporary files. Scanner cleanup failures/timeouts cannot
produce a successful collection. No application/container command obtains inventory.

## Matching contract

The versioned [contract](../../../implementation/tests/integration/sbom-image-contract.json)
precedes the matrix. Key: family, distribution/version, binary name, architecture.
Value: exact full installed version. `all` and `amd64` are distinct. Source package
names/versions are retained as provenance, not substituted for binary identity.
Original pointers, PURLs, every qualifier and location/layer evidence remain in
separate normalized rows. Non-dpkg families are explicitly NOT_EVALUATED.

One observed modeling difference required a lossless refinement: Trivy expresses
66 Debian epochs as a PURL qualifier, whereas Syft embeds the epoch in its PURL
version. Native versions already include it. The comparator reconstructs the
full version from a numeric `epoch` qualifier; a simultaneous embedded epoch is
an error. Initial strict evaluation remains preserved as ERROR. No suffix,
revision, architecture or qualifier was removed to manufacture agreement.

Duplicate identities (even identical), missing/conflicting fields, empty scoped
inventories, invalid formats/schema, changed hashes, wrong image/platform and
failed collection are ERROR. CycloneDX uses the existing official 1.7 schema
validator; Syft uses a strict supported-field contract, not a claimed complete
Syft-schema validation. MISMATCH describes a difference between scoped inventories,
not automatically an omitted component or proof that either scanner is complete.

The Syft parser skips `deinstall` entries but does not expose the original dpkg
Status in native metadata. Other dpkg states need an explicit future policy;
general arbitrary-dpkg-state support is not established by these images.

A separate bounded Syft file-content probe of `/var/lib/dpkg/status` confirms all
413 Node rows have `install ok installed`, with exact binary/version/architecture
agreement. This reads the same final image statically; no layer extraction or
image command was used. The original probe and hash receipt are retained.

## Real inputs and observations

The independent consumer is initialized from the committed Node starter and
committed separately at `193373a0164325a9d8a052f1fb8b9643b9a43292`. Its only runtime
profile adjustment is a pinned Debian base, because the production Node starter
uses Alpine. Source capture reuses `src/capture-build-inputs.mjs`; build request
logging reuses `delivery_analysis_command`. Buildx exports locally; no registry,
Kubernetes, full delivery or image publication is used. Consumer Git bundle,
configuration, Dockerfile and captured source bytes are retained.

| Identity | Value |
| --- | --- |
| Node base platform manifest | `node:24.22.1-bookworm@sha256:f9b3548b20b15b705b66aeecaeac7dd690c73d5e4661357aac02e60e3d38c88a` |
| Consumer OCI platform manifest | `sha256:0bb01fcabd480cdbfc04fb94ac7ce224266e22c625490868fad5bdf4363264b2` |
| Consumer config / ImageID | `sha256:c0271bbf1ce72ae830981c92a813f209132f6bc15c35b8b02044824e88f3b3e0` |
| Export-local index (not a published multi-platform index) | `sha256:c5925c3e8d9ebe8e57dbbd8855d9837941ba83c9e52bd143f7c1bed3f32f253d` |
| Consumer Docker archive SHA-256 | `7bd66965ce88710e991c95f42c26b98c7b6e64cb5d9d73ddb9848547c80836a1` |
| Node original Trivy JSON SHA-256 | `9897db4ef14d03e288f9b54bd40d1ebf5c900f2e81fb1f4f5c51a82545880945` |
| Node original Syft JSON SHA-256 | `a6c241282cbcd50a1c1b62d5ac5214019cd006ac475e461db02a69656d27bb30` |
| Java base platform manifest | `eclipse-temurin:25.0.5_8-jre-noble@sha256:41a70a160a5a157126929c1901e8dcf17ea4fd88eca1e7b9abf3cb1bb04df6c2` |
| Java base config / ImageID | `sha256:683186371bf175d1304b45e802b048ed7c55875098d3bfbe3564b190ef6914e2` |

| Case | Expected | Observed |
| --- | --- | --- |
| A: same real Node image | Observe, no assumed MATCH | MATCH, 413 dpkg packages |
| B: labelled copy removes `adduser` | MISMATCH | MISMATCH, one ONLY_SYFT |
| C: labelled copy changes `adduser` 3.134 → 3.134-spike | MISMATCH | MISMATCH, one VERSION |
| D: original Node report paired with real Temurin base inventory | ERROR | ERROR, archive association |
| E: deliberately malformed JSON copy | ERROR | ERROR, JSON parsing |
| F: valid Node archive, nonexistent Syft executable | ERROR | ERROR, scanner exit 127; never omission |
| Java base, separate observation | Observe | MATCH, 108 dpkg packages |

B/C are explicitly transformed fixtures, not Trivy emissions. A's reports remain
intact. Negative harness success means the negative is rejected, not that it passes.
The Java result concerns the **base JRE image only**, not a complete Java consumer.
Its original Trivy output has Ubuntu plus 108 packages, no separate JRE component.
Syft was restricted to dpkg; its lack of a JRE component is therefore not an
independent test of general Java runtime detection. A new Java identification DB
was downloaded for Trivy, with its bytes/metadata retained separately. No CVE
scan or interpretation occurred. Full Java consumer: NOT_EXECUTED.

Preserved failures: early input read race/check, unsupported OCI archive input in
Trivy, temporary-file size cap too small for the Node binary, missing Java DB,
and initial epoch-model interpretation. None is silently converted into MATCH.
Node final scanning took approximately 10.69 s Trivy + 12.07 s Syft; Java base
3.52 s + 3.82 s, excluding build/download. These are single observations, not a
benchmark or independent statistical samples.

## Reproduction and custody

Evidence root: `implementation/evidence/raw/sbom-image-consistency-20261116/`.
Commands run from the engine repository root. Inputs are unsigned local evidence;
hashes establish byte identity, not producer identity or image authorization.
Archive reanalysis is deterministic; rebuilding may change image metadata, so a
fresh build must get fresh identities and receipts. Preserve the original archive
for exact image replay. Never recover historical campaign archives for this spike.

```bash
# Prepare a fresh independent Node experiment (downloads verified Syft and image).
bash implementation/tests/integration/sbom-image-prepare.sh implementation/evidence/raw/sbom-image-consistency-new
# Reanalyze preserved reports without scanners, Docker or credentials.
node implementation/tests/integration/sbom-image-compare.mjs implementation/evidence/raw/sbom-image-consistency-20261116/node-final
# Fresh scan of the retained Docker archive; destination must not exist.
python3 implementation/tests/integration/sbom-image-run.py implementation/evidence/raw/sbom-image-consistency-20261116/image-docker.tar implementation/evidence/raw/sbom-image-consistency-20261116/replay implementation/.tools/sbom-spike/syft
# Directed fixture matrix; destination must not exist.
node implementation/tests/integration/sbom-image-matrix.mjs implementation/evidence/raw/sbom-image-consistency-20261116/node-final implementation/evidence/raw/sbom-image-consistency-20261116/java-final implementation/evidence/raw/sbom-image-consistency-20261116/replay-matrix
# Package compact selected evidence; images and DB remain separate retained inputs.
python3 implementation/tests/integration/sbom-image-evidence.py package implementation/evidence/raw/sbom-image-consistency-20261116 implementation/evidence/packages
python3 implementation/tests/integration/sbom-image-evidence.py verify implementation/evidence/packages/sbom-image-consistency-20261116.tar.gz
node --test implementation/tests/unit/sbom-image.test.mjs
python3 -I -S implementation/tests/unit/test_sbom_image_runner.py
```

Preparation uses `bin/deliver init`, commits the copied consumer with its Debian
base, and captures it using the existing capture helper. Exact build argv is in
`build-docker-request.txt`; it uses `--platform linux/amd64 --provenance=false
--sbom=false --output type=docker,dest=...`. For byte-identical consumer recovery,
clone the retained `consumer.bundle` instead of initializing a new consumer pin.
Tool URL/version/checksum/identity are in the experimental tools manifest; download
the archive, checksums and bundle, verify using the official procedure, then
install only the regular bounded binary. No shell installer is needed.

The effective Codespaces metadata names `.devcontainer/implementation/devcontainer.json`;
it is not the universal image. Current/new shells resolve `/usr/local/bin` Node
24.22.1, npm/npx 12.2.2 and Codex 0.167.0. Doctor passes. Docker and workspace share
one 32 GB filesystem; `/tmp` is separate and is not added to that budget. Initial
free space was about 25.8 GiB. No experiment containers, named builders, tags or
volumes were created. Existing default Buildx cache is retained because exclusive
cache ownership cannot be proven. No broad prune or unrelated resource deletion.
Image archives, consumer bundle and Java identification DB remain retained locally;
compact packaging deliberately excludes layers, scanner caches and private data.

## Conclusion and review

**GO for further design of an optional dpkg consistency control**, within this
explicit Node/Debian/linux-amd64 identity/version/architecture scope. Independent
static acquisition and attributable directed differences work. **Not yet a delivery
gate**: arbitrary dpkg states, broader distro/model variations, source-package
semantics, authenticated acquisition and policy ownership need separate decisions.
The complementary base-JRE observation does not establish general Java support.

No complete-SBOM, malware, runtime-file integrity, vulnerability absence,
regulatory compliance or admission claim is made. AI assistance: OpenAI Codex
implemented and ran the experiment. Human review, acceptance, custody and licensing
decisions remain pending. Promotion to optional control and authenticated-results/
admission integration require separate branches and approved requirements.
