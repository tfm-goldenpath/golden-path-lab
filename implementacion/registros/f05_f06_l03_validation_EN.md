# F05 / F06 / L03 and complete CycloneDX schema validation

## Successful local integration after network review (2026-09-29)

`make -C implementacion demo` passed in **`run-nWpDa9ZN`** using real Trivy,
zot, Cosign and Kyverno. Source: working tree over
`b380836f0264698c0cdd8e5e8f750427def63761`, recorded source snapshot
`31d09673b3a818270a3d4d7110e7ab3bbd44cf7e83e80789db14d1844331695d`.
Preflight passed 511 service/unit tests. No delivery implementation change was
needed during this network review.

The host had legacy IPv4 `FORWARD DROP` rules accepting only docker0 traffic,
while Docker used a separate nftables forwarding chain. The kind bridge was
therefore blocked: a disposable container failed DNS with `EAI_AGAIN` and the
legacy DROP counter rose from 390 to 400. With explicit execution approval,
a wrapper temporarily permitted traffic from the kind bridge/subnet and
RELATED/ESTABLISHED replies. DNS and the complete demo then succeeded. The
wrapper removed its two uniquely labelled rules; a before/after comparison
confirmed the original chain was restored. Both demo and network recovery exited 0.
This is a host compatibility workaround, not a permanent firewall or repository
policy change. Future runs on this host still require working bridge forwarding;
permanent reconciliation of the two firewall backends remains host administration.

| Boundary | Observed outcome |
|---|---|
| F05 fresh CI | `MISSING_SBOM`, complete stable retrieval, authenticated non-targets, exact restoration and fresh VERIFIED gate |
| F06 fresh CI | Exact unchanged donor bundle received; `SUBJECT_MISMATCH` at registry inventory; target Cosign unreached; donor independently authenticated against original digest |
| F05/F06 directed admission | Both denied solely by `tfm-sbom` / `autogen-require-sbom`, supported by isolated inventories, authentication, positive controls and disabled caching |
| L03 | Real `is-number@7.0.0` addition, separate scans/schema reports and image-specific evidence, CI authorization, admission, rollout and unchanged HTTP response passed |
| Existing controls | F07/F08/F13/F11 and shared L01/L04 passed |
| Hosted negatives / human acceptance | NOT_EXECUTED / pending |

Initial digest:
`sha256:e9cb7f48e5f56ef06c68a91bb22a913e298235831fb69e57fb68bef5fe4d4980`.
Replacement digest:
`sha256:89edb10889d1f210fd47d1811a874c22f7420147999a659583df62800f8576d3`.
L01/L03/L04 share this execution; no additional campaign observation is claimed.

Archive `evidence/packages/run-nWpDa9ZN.tar.gz`, SHA-256
`c6622ac51e53a2b37940a108390d2ea3f369201e48e1c05c882393ce39296f3f`:
**776 internal hashes verified**, **108 bundles independently verified**, and
**two expected altered F08 bundles rejected**. Authenticated SBOM predicates were
revalidated. Independent audit also checked exact donor bytes, exact original
artifact restoration and fresh successful gates for all four SBOM fault checks.
The live `run.log` has the expected archive-path line appended after packaging;
the archived log and its internal hash are valid.

Network diagnosis, the approved temporary wrapper, probe logs, firewall snapshots,
exit outcomes and the independent audit are retained under
`evidence/raw/f05-f06-l03-network-review/` (ignored by Git). The successful run's
original evidence remains under `evidence/raw/run-nWpDa9ZN/`. Previous failed
attempts and the supplementary fixture probe remain unchanged.

## Firewall documentation follow-up

The [EN recovery guide](../docs/EN/kind-network-firewall.md) and
[ES companion](../docs/ES/kind-network-firewall.md) document the exact temporary
rules, Codespaces namespace checks, cleanup limits and proposed permanent fix.
Read-only inspection confirmed the approved shell and daemon share a network
namespace; the restricted agent sandbox differs. This follow-up changed only
documentation, checked local links and whitespace, and did not reapply rules.
The permanent startup correction remains proposed; human review remains pending.

## Source and scope

Branch: `test/f05-f06-l03-sbom-validation`. Actual base and local `main`:
`b380836f0264698c0cdd8e5e8f750427def63761`, merged PR #21. The starting tree was
clean. This record describes an uncommitted working tree over that base; source
hashes are retained in `evidence/raw/f05-f06-l03-development/source-files.json`.
Milestone: **Scenario coverage and pilot**.

The approved oracles were recorded before implementation in
[F05](../docs/EN/cases/F05/record.md), [F06](../docs/EN/cases/F06/record.md) and
[L03](../docs/EN/cases/L03/record.md). The available documentary source was
`evidence/raw/A_evaluacion.md` with SHA-256
`efa0b0f2024ed2800217de3099d86dd137acb4dcd91861bc72ad02235a774e45`;
its upstream thesis revision was not independently established. No thesis file
was modified. Historical F07/F08/L04 attribution remains unchanged.

## Responsibilities and changed behavior

- `schemas/cyclonedx-1.7/` retains unmodified official draft-07 schemas, local
  references, Apache license, immutable upstream revision and integrity hashes.
  `tooling/` pins Ajv and format dependencies separately from service runtime.
  Devcontainer post-create, setup target and both workflows install that lock.
- `validate-sbom-schema.mjs` enforces exactly CycloneDX 1.7 offline. Original
  scanner output is validated before signing; the exact authenticated saved
  bundle's predicate is validated before acceptance. Reports retain schema,
  validator, document, outcome and authenticated bundle hashes. Lab content
  requirements remain distinct. Kyverno performs selected-field validation.
- `ci-verification-gate.mjs` attributes missing SBOM only after complete retrieval
  and authentication of all other mandatory evidence. The downloader preserves
  foreign bundle bytes and a structured subject mismatch without relaxing its
  existing early rejection or claiming a complete inventory.
- `sbom-scenario-evidence.mjs` reuses ownership/backup validation and owns isolated
  OCI fixtures, exact restoration, unchanged donor evidence and independent
  authentication. `tests/scenarios/sbom.sh` owns fault/recovery execution and
  directed SBOM admission attribution. `demo.sh` retains infrastructure cleanup.
- L03's fixture adds real `is-number@7.0.0` source with its MIT license/checksums;
  the service does not import it. Each digest gets separate real reports and
  evidence. `check-sbom-evolution.mjs` requires the known package difference;
  `capture-build-inputs.mjs` retains inputs and checks fixture integrity.
- The existing replacement flow runs F05/F06 before authorization and again at
  directed admission after results, then records shared L01/L03/L04 acceptance.
  Final output records F05/F06 explicitly, including hosted NOT_EXECUTED.
  Packaging includes all four new fault directories and schema reports.

## Actual development sequence

1. Read repository guidance, scenario skill, contracts, architecture, prior
   operational records and the locally available catalogue; wrote the three
   approved oracle records and created the requested branch.
2. Added two schema regressions. The first sandbox test attempt failed at Node
   subprocess creation. The unrestricted run failed both intended assertions:
   nested invalid hash content and unsupported versions were accepted.
3. Added the validator, offline references, reports and producer/consumer wiring;
   checked the retained unmodified real Trivy SBOM. Added further regression tests
   for faults, recovery, formats, malformed input, resolution and real signatures.
   These later tests are regression coverage, not retrospective TDD claims.
4. Full-suite attempts exposed setup string expectations and missing orchestration
   fixtures for the new module. A remaining copied scenario expectation referenced
   L04 instead of L03. Logs preserve those failures and subsequent fixes.
5. Two full suites subsequently passed, including the signed schema-invalid
   Cosign probe. Final report integration was then added and tested in the handoff
   suite. No live integration success is inferred from orchestration substitutes.
6. `make demo` first failed in the sandbox at Docker access. The unrestricted
   preflight attempt `run-eU1gOKjF` failed at the then-unfixed test assertion.
   The fresh retry `run-DknjtwWd` passed preflight and created kind, then failed
   because BuildKit on the kind network could not resolve `registry-1.docker.io`
   through `127.0.0.11:53`. The pinned Node base image was never built in that run.
7. An independent host-Docker builder probe built both actual images, scanned
   each with pinned Trivy, validated the original CycloneDX 1.7 output and passed
   the unchanged vulnerability policy. Cosign `attest-blob --hash` then signed
   their real image digests and original SBOMs with a temporary local key. Both
   verified; the donor failed against the replacement digest. This probe did not
   publish OCI evidence or invoke normal CI authorization/admission. Its initial
   missing-argument signing attempt is preserved in `fixture-crypto-first.log`.

## Automated checks actually completed

`make -C implementacion test` passed in the final handoff run: 6 environment
checks, 510 service/unit tests, 16 Python policy tests, 52 Conftest decisions,
Kyverno CLI cases and real local Cosign cryptographic probes. The latter includes
an authentic but schema-invalid predicate. `git diff --check` passed.
A later focused schema run passed 9 cases after strengthening internationalized
format tests; the final retrieval/report checks passed 28 focused cases.
The final attribution wording correctly says target SBOM Cosign is unreached
for both absence and the early foreign-subject rejection; independent non-target
and donor verification is recorded separately.

## Initial observations before the network review (historical)

| Scenario/property | Local observation | Remaining boundary |
|---|---|---|
| Official schema and lab content | Real Trivy originals and authenticated predicates accepted; nested invalid, malformed and unsupported inputs rejected in tests | Normal hosted execution on reviewed source |
| F05 | Actual scenario-function, gate, recovery and isolation regressions pass | Real registry CI absence and directed Kyverno rejection **NOT_EXECUTED** |
| F06 | Received-byte/mismatch and actual scenario regressions pass; real donor authenticates offline for its original image and fails for replacement | Real target registry consumption and directed Kyverno rejection **NOT_EXECUTED**; F06 operational acceptance not established |
| L03 | Real component addition observed, original schemas accepted, scans below blocking threshold, separate digest-bound SBOM bundles verified offline | Normal registry CI authorization, admission, rollout and HTTP **NOT_EXECUTED** |
| F07/F08/F13/F11 and L01/L04 | Regression suite passes | No fresh successful integrated regression run in this increment |
| Hosted F05/F06 negatives | **NOT_EXECUTED** | No hosted mutation implementation or dispatch; permissions unchanged |

L01/L03/L04 share one eventual integration execution. The supplementary probe is
not an extra catalogue observation or campaign measurement. No inventory
completeness, GitHub OIDC, full-schema Kyverno validation or human acceptance is
claimed.

## Evidence and audit

Ignored development directory: `evidence/raw/f05-f06-l03-development/`.
Important files: `schema-initial-unrestricted.log`, `schema-focused.log`,
`scenario-focused.log`, `full-suite-final.log`, `full-suite-handoff.log`,
`final-boundary-focused.log`, `final-policy-focused.log`, both demo logs,
`archive-audit.json`, `fixture-audit.json` and `source-files.json`.

- Failed archive `run-eU1gOKjF`: checksum and **4** internal hashes verified.
- Failed archive `run-DknjtwWd`: checksum and **13** internal hashes verified.
  Neither contains new signed delivery evidence; both remain FAIL.
- Supplementary archive `l03-independent-fixture.tar.gz`: checksum and **35**
  internal hashes verified. Two SBOM bundle signatures/subjects verified; schema
  report bundle hashes and predicate hashes checked independently. Private key
  material was excluded, then deleted; the public key is retained. Probe image
  tags were removed only after checking their recorded image IDs.
- Initial probe image:
  `sha256:315edb600023ad520e33775878c49e57f1f9115bc2c247b76c9d44c8219a8dec`.
- Replacement probe image:
  `sha256:1b620c9a7965e72c4306bf5380ae62fe7282c01e502d4a13f56a2c72fa5551b5`.
- Trivy observed `pkg:npm/is-number@7.0.0` only in the replacement, at
  `app/node_modules/is-number/package.json`. Original reports, scanner/database
  metadata and hash, both build inputs, public key, bundles and verifier outputs
  are retained under `fixture-probe/`.

At this earlier handoff, fresh local integration was outstanding because of
container networking. The successful network-reviewed execution above now closes
that local execution gap. Its explicitly approved temporary firewall rules were
removed. No repository settings or hosted workflow dispatch occurred.

## Human review checklist

- [ ] Review official schema revision, license, hashes, dialect and format handling.
- [ ] Review unchanged donor bytes, early mismatch retention and independent donor authentication.
- [ ] Review ownership checks, no duplicate masking, stable non-target evidence,
  catchable interruption and preservation of primary/recovery failures.
- [ ] Confirm no signing during negative consumption and no premature authorization.
- [x] Execute and audit fresh local integration (`run-nWpDa9ZN`); human review of the evidence remains pending.
- [ ] Review normal hosted compatibility separately; keep hosted negatives unexecuted.
- [ ] Accept the shared L01/L03/L04 interpretation and inventory-completeness limit.
- [ ] Review the diff, EN/ES instructions and final decision.

## Assistance and decision

| Activity | Actual assistance | Human review | Decision |
|---|---|---|---|
| Implementation, regression tests, diagnostics, evidence audit and documentation | Github Copilot with GPT-6 using the supplied human-approved oracles | Pending | Pending |

GitHub Copilot was requested but was not the tool used in this session. Prior
records retain their original attribution. No remote PR, push, dispatch, merge,
release or settings change was performed.
