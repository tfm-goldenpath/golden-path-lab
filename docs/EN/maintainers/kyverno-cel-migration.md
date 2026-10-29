# Kyverno CEL compatibility and attestation selection

Status: **research ready for review; CEL adoption BLOCKED_CONTENT_SELECTION**. Base:
`e0fbe6490794b0da679777d465117a43bdb482ad` (main after PR64), fetched on
29 October 2026. Branch: `refactor/kyverno-cel-policies`.
[Spanish operator note](../../ES/maintainers/kyverno-cel-migration.md).

## Research closure and upstream review — 29 October 2026

This PR is now **tests and documentation**, reviewable independently of whether
CEL can be adopted. Production policies, producers, trust, scenario oracles and
normal delivery/demo installation remain unchanged. The finding is **order-dependent
selection of authenticated content in the tested configuration**. It is not
signature forgery, acceptance without any conforming results, or a demonstrated
vulnerability in all Kyverno configurations. The synthetic capability predicates
are not the complete Golden Path contract. Legacy results are CLI
characterization; only the candidate CEL policy was installed for actual admission.
Passing CI establishes shared regressions, not migration suitability.

### What #18049 actually contains and where it is published

Inspected [issue #18023](https://github.com/kyverno/kyverno/issues/18023),
[PR #18049](https://github.com/kyverno/kyverno/pull/18049), its six commits and
final merge **`edd8b239e393a611137a5d466d12cdc416331224`** (17 October 2026).
The [merged timestamp implementation](https://github.com/kyverno/kyverno/blob/edd8b239e393a611137a5d466d12cdc416331224/pkg/image/verifiers/ivpol/cosign/timestamp.go),
[verifier](https://github.com/kyverno/kyverno/blob/edd8b239e393a611137a5d466d12cdc416331224/pkg/image/verifiers/ivpol/cosign/verifier.go)
and [tests](https://github.com/kyverno/kyverno/blob/edd8b239e393a611137a5d466d12cdc416331224/pkg/image/verifiers/ivpol/cosign/timestamp_test.go)
are the source of this analysis, rather than the PR's initial description or its
example manifest. The merge's go.mod uses Cosign **3.1.3**, sigstore **1.11.0**
and sigstore-go **1.3.0**; these differ from released 1.19.2's embedded libraries.
No patched controller was compiled or run.

| Reference / official publication | Inspected implementation | Conclusion |
| --- | --- | --- |
| v1.19.0 and v1.19.1 | No timestamp selector; repeated payload overwrite | Do not contain this fix |
| v1.19.2-rc.5, published 20 October | Same verifier bytes as v1.19.2; timestamp.go absent | Post-merge publication does not imply inclusion |
| v1.19.2, published 20 October | Overwrite loop; timestamp.go absent; actual CLI/webhook reproduce ordering | Does not contain this fix |
| PR merge and main `79927727e928aaf0d3ce08f1bb256cd02c693696`, inspected 29 October | Newest-candidate selector; verifier/timestamp files match merge bytes | Development source, not a released compatibility claim |

The published release inventory still ends at v1.19.2, with no later stable or
prerelease artifact carrying this fix identified. The merge-to-v1.19.2 comparison
is **diverged**, with merge base `3ada4053fd04787498ebe60ca619da8559f8bb75`;
release-1.19 file history and actual tag contents show no equivalent cherry-pick.
Thus **no currently identified official release contains #18049**. A future tag
must be inspected and its distributed artifacts tested; no future version number
is promised compatible. Even inclusion alone would not preserve all-statements
semantics.

Artifact cross-check: the retained official v1.19.2 CLI archive matches both the
lock and the freshly retrieved published checksum
`357eaf1df8bc24ddd5a73979fadeaae6a032e8710f11af264229756e4956bf4a`.
Its `kyverno` member matches the installed binary SHA-256
`dd492a230e3f7c68235efbf925932cdb34cefbabbd4436d932c3287d9450eea8`.
Go build metadata reports revision `e63308f1e16c05cd009ac4864be6ec25c66b49be`
and embedded Cosign 3.1.2. The official artifact itself reports `vcs.modified=true`;
this is not a locally modified build. Controller images remain the official
chart/lock digests recorded in the admission evidence. No image was rebuilt.

### Final selection algorithm, trust binding and limits

1. The verifier first authenticates the bundle/signature against the configured
   attestor and image digest. The modern path preserves parallel arrays of the
   verified signature, its **same verified bundle**, and the verification result.
   Only matching predicate payloads become candidates. Selection groups by
   predicate type and image, not Golden Path repository/revision/policy context.
2. Byte-identical extracted payloads are deduplicated. Available timestamps are
   retained, taking the later bundle timestamp when identical candidates carry
   different bundle times. This is payload-byte deduplication, not a promise of
   semantic JSON equivalence or a new authorization event on re-signing.
3. A single remaining candidate is selected even without a timestamp. For several
   distinct payloads, **all having bundle timestamps takes precedence**. Otherwise
   all must have usable signed-statement timestamps. Missing a common category
   causes an error. There is no configurable all/any/latest policy strategy and
   no returned collection for CEL to inspect.
4. Within the selected time category, the greatest time wins. Equal times select
   the lexicographically greatest payload bytes, including contradictory payloads;
   equality is deterministic, not an authorization-conflict rejection.
5. A request-scoped candidate store merges choices across attestors/evaluations
   using the same selector; it does not expose discarded candidates. This differs
   from a per-issuer/per-source policy-context ledger.

Timestamp provenance is more specific than “the newest signed time”:

- The modern path first uses nonzero `VerifiedTimestamps` from the corresponding
  sigstore-go verification result, choosing the earliest available time **within
  that bundle**. These results come from successful signature/digest verification.
  The selector does not inspect the timestamp's `Type`: sigstore-go also has a
  `CurrentTime` result for configurations using `WithCurrentTime`, which is verifier
  wall-clock time, not independent signing-time evidence. Cosign 3.1.3 chooses
  `WithNoObserverTimestamps` for our timestamp-free public-key profile; normal
  hosted trust instead requires log/signed timestamps. No `CurrentTime`-based
  selection is demonstrated here. A future contract must specify acceptable time
  types rather than treating every result entry as an external clock attestation.
- Fallback association checks the DSSE envelope bytes or the decoded payload
  against the associated bundle. With transparency enabled it attempts
  `VerifyTlogEntry`; the helper also has a fallback reading the first entry's
  integrated time, relying on prior bundle authentication. It can then use a
  successfully verified RFC 3161 timestamp. The traditional path reads the Rekor
  bundle integrated time when transparency is not ignored, relying on prior
  signature verification, or explicitly verifies an RFC 3161 timestamp. These
  fallback branches need real transparency tests in an eventual released build;
  their presence is not a completed hosted proof here.
- `IgnoreTlog` excludes the helper's unverified Rekor-time extraction. The local
  key profile has no external signing-time evidence; it falls back to dates inside
  the authenticated statement if present. Hosted verification may supply Rekor
  or TSA times. The common **bundle** category does not require every candidate
  to use the same log or the same Rekor-versus-TSA source. Choosing earliest proof
  time per bundle, then latest candidate, has different semantics from choosing
  the author's declared decision time.
- Signed-statement dates are author assertions covered by the signature, not
  independent clock attestations. Lookup checks predicate `metadata`, then
  `runDetails.metadata`, `creationInfo.created`, predicate-level fields, then
  limited top-level fields. Within those locations it takes the first parseable
  known key (including scan/build start/finish, timestamp, created and time), not
  the maximum of every date. Accepted strings include RFC3339/Nano and layouts
  without an explicit zone. Numeric epochs are not parsed by this helper.
- The selector adds no authorization TTL, future-date bound, monotonic sequence,
  context-specific revocation or protection against a registry withholding a newer
  statement. Certificate/timestamp cryptographic validity is a separate property.
  Timestamp-free distinct local statements would fail selection under #18049 even
  if both conform; identical duplicates can collapse to a timestamp-free singleton.
  These are source-derived predictions, **not executions of the patched engine**.

This fixes an ordering mechanism on main but does not by itself implement the
current all-statements contract or the proposed product contract below. In
particular, deterministic byte tie-breaking is insufficient to resolve two
contradictory authorization decisions, and a fresh transparency receipt for an old
payload must not automatically renew that payload's authorization lifetime.

### Pending product decision: which declarations are applicable?

**No new semantics are approved or implemented here.** “All historical statements
must pass” is the observed active-engine behavior, not a universal security
standard. It can prevent legitimate recovery when an authorized issuer has issued
a replacement decision. Conversely, “any PASS” can make an old permission survive
a newer denial. Neither tradeoff is settled merely by changing policy APIs.

An authorization needs an explicit context selected from trusted execution
configuration: image digest, predicate type, authorized authority (local key or
exact hosted issuer/workflow/ref), source repository and revision, expected
builder/build type where required, and exact policy version. Existing results
still require PASS and the seven checks; signature/SBOM/provenance remain
independent requirements. Those outcomes are **conditions to evaluate**, never
filters used to discard a FAIL before selecting a decision.

For the proposed design, an *applicable* statement is an authenticated, unambiguous
statement for that exact context. A recognized different context/version cannot
supply authorization for this one. Malformed or ambiguous context must not be
silently ignored. Context membership must be authenticated before selection;
unknown policy versions cannot become compatible by sorting newer. This explicit
partition is itself a proposed change: the current legacy consumer groups by
predicate/digest/attestor and evaluates source/version conditions on every match.

| Alternative | Benefit | Cost / required policy decision |
| --- | --- | --- |
| All applicable authenticated statements must conform | Rejects contradictions and needs no clock ordering | An old FAIL can indefinitely block a legitimate replacement; define the applicable set rather than treating all history as current |
| At least one complete applicable statement conforms | Allows recovery despite older failures; no field splicing | An old PASS can defeat later FAIL/revocation; requires an explicitly monotonic permission model or a separate freshness rule |
| Explicit current authorization selected by authenticated, deterministic rules | Supports controlled replacement and revocation by the designated authority | Requires an approved identity/freshness/supersession contract and supported verification; registry order or timestamp sorting alone is insufficient |

Examples below compare the alternatives **within one authenticated context**;
“current” means the proposed explicit-authority model, not an implemented feature:

| Input | All | Any complete | Recommended current-authorization behavior |
| --- | --- | --- | --- |
| Old PASS, new FAIL | Reject | Accept | Reject when FAIL is the designated successor; never fall back to old PASS |
| Old FAIL, new PASS | Reject | Accept | Accept only after authorized supersession and all current independent controls pass |
| Different source/context or P0 alongside required P1 | Depends on defined applicable set; current legacy rejects nonconforming matches | Only a full required-context statement can authorize | Partition explicitly; P0/another source cannot replace P1; absence of required context blocks |
| Contradictory statements with the same date | Reject | Accept if one fully passes | Block ambiguous current identity/order; a lexical byte winner is not an authority decision |
| Missing or future date | No temporal rule by itself | No temporal rule by itself | Block missing required freshness material or future time beyond an approved skew; no timestamp defaults |
| Old PASS replayed after newer FAIL is withheld | Can accept if inventory hides FAIL | Can accept | Require the trusted expected current authorization identity/head and freshness; a registry listing alone cannot prove currentness |
| Byte-identical duplicate current statement | Same verdict | Same verdict | Deduplicate without renewing lifetime or creating a new authorization |
| Complementary statements, neither individually complete | Reject | Reject | Reject; fields/checks never combined across statements |

**Recommendation for `design/attestation-selection-contract`:** define one
complete, explicitly identified **current authorization per delivery context**,
with authenticated supersession, rather than accept arbitrary historical PASS or
choose “latest” by a generic timestamp heuristic. Select the expected authorization
ID/content digest from a trusted coordinator receipt or other approved authority
state, outside workload-actor control; authenticate its complete contents and
independent evidence. A new FAIL must be able to supersede PASS; a new PASS must
require an authorized recovery. Reject conflicting decisions at the same current
identity/sequence. Specify signed issuance/expiry, permitted skew and bounded age,
and which independent time evidence anchors them. Parameters and any new fields,
policy version or authoritative-head mechanism require owner approval in the
next design branch; this PR does not invent values or alter golden-path-v1.

The design must address rollback/withholding explicitly. Stateless admission
reading an attacker-controlled registry cannot know that a newer decision was
hidden. An authenticated expected ID/head or suitably maintained authority state
is needed if revocation freshness is promised; an unsigned workload annotation
cannot supply it. Evaluate implementability with official, maintained APIs before
approving this recommendation. If it cannot be implemented, narrow the product
claim or choose a maintained engine rather than build a second verifier here.
The timestamp-free local lane must either remain an explicitly narrower laboratory
profile or gain an approved issuance contract later; it cannot inherit hosted
clock assurances by analogy. Do not apply a results-authorization chronology
implicitly to SBOM inventories or provenance documents.

### Small reproducer and upstream report draft (not sent)

Use the existing opt-in probe; no parallel script collection or production entry
point was added:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
python3 -I -S implementacion/tests/integration/kyverno-cel-capabilities.py \
  --selection-only --admission \
  --output implementacion/evidence/environment/kyverno-cel/fresh-selection
```

Omit `--admission` for CLI-only reproduction. A new output directory is mandatory.
The reduced mode issues four synthetic conforming predicates and one authenticated
nonconforming results predicate. After publication it changes **only** the order
of the same referrer descriptors on one image reference, then restores the first
order. It records exact request hashes, response hashes for immutable manifests/
blobs, descriptor orders, original diagnostics and controls. Cache is disabled in
the CLI and explicitly checked in the controller values. The namespace/actor and
owned-resource cleanup are the same as the existing probe. Normal `deliver`,
`demo`, workflows and production scripts do not import or install this probe;
only isolated Python regression tests import it without starting infrastructure.

`summary.json` separates `testExecution`, `engineObservation`,
`contractEvaluation` and `migrationAdoption`. Reproducing the issue gives
`COMPLETED / ORDER_DEPENDENCE_REPRODUCED / FAIL / BLOCKED` and exit 2. Exit 0 can
only mean the executed subset matched; adoption remains `NOT_ASSESSED`. Errors
and empty observations cannot become success. Historical `observations.json`
files and previous exit results are preserved unchanged.

Closure execution `closure-selection-01` recorded **15 observations**: nine CLI
observations (including isolated legacy controls) and **six real CEL admission
requests**. The same-reference sequence is reject/accept/reject for both CEL
entry points; legacy CLI rejects all three orders. Positive and negative controls
behave as expected. The test completes, contract evaluation fails, and adoption
remains blocked. No patch from #18049 was executed and no full delivery/scenario,
UPDATE/Deployment, classic-transparency or hosted coverage is added.

Executed source was `19c1094d7d8b281a83af884a92bfcc5d63f5fdd5` plus the two
recorded probe/test modifications, **before** the later documentation commit.
Executed probe SHA-256:
`226a2ba5f9fbeb301638068af6e67602443f675961cb9c373c144f467d76e9ae`.
The exact script is retained. All three requests in each entry point have identical
resource bytes; all twelve observed immutable manifest/blob responses for the
selection repository retain their hashes. Image reference:
`172.18.0.1:37059/selection@sha256:5d3d4b8d43a0674bba2819cbad08939e64601801c396acbd7dfc93fdb62894ce`.
Both conforming and nonconforming results bundles independently authenticate with
official Cosign against the retained public key and this digest.

Affected validation: `make -C implementacion test-policies` passes **52 stdlib
Python tests**, Rego, **16 engine checks** and policy scripts; inventory validation
covers 517 paths and its 10 tests pass. Documentation links/Bash syntax and
`git diff --check` pass. The new summary regression initially failed because its
helper was absent, then passed after implementation. Full CI already succeeded
on unchanged prior code at `19c1094` in runs
[40937521940](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/40937521940)
and [40937514053](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/40937514053).
That CI is not attributed to new code: affected checks were rerun locally, and
normal PR CI checks the new revision. No duplicate full local suite or hosted
delivery was dispatched. Production renderer, scripts, workflows, fixtures and
tool/chart/image pins are byte-identical to the base of this iteration.

The single sequential lab stayed on 4 cores / 16 GB / 32 GB, starting and ending
with 9.1 GiB free; capacity/inodes were recorded before creation. Owned kind
container `c9f591f832d777e376ea1a84a7343d307397fce3f59ed942dfdd82dc282ab454`
and registry `9668addfcd8dc06145020aea97fcfc95a91213f4f1036340a5d552f7e4eaf84d`
were removed and their absence checked. Five empty temporary directories from
owned probe cleanup were matched to retained logs, verified empty and retired
with `rmdir`; no credential files remained or unrelated files were removed.
No DB/image/history copy or volume pruning was needed.

Retained compact package:
`implementacion/evidence/packages/kyverno-cel-selection-closure-19c1094-20261029.tar.gz`,
**161,329 bytes / 138 entries**, SHA-256
`6111841999e99994ac7f3bff3f74723d0c5178624e03f5f84bf478692bc245d2`.
Every entry and its checksum list were compared against original retained bytes.
It contains focused observations, source/artifact inspection receipts and necessary
upstream source snapshots, excluding private keys, kubeconfigs, binaries, image
layers, DBs and prior packages. Both earlier packages retain their recorded hashes.

**Unsent upstream draft — scope: release availability and selection semantics**

> Official Kyverno CLI/controller 1.19.2 (revision e63308f), chart 3.9.2,
> Kubernetes 1.35.8; local development-key trust only, verification cache disabled.
> Stable-v1 ImageValidatingPolicy verifies explicit predicates and evaluates two
> fields on the same authenticated results payload. One conforming and one
> nonconforming authenticated results statement share the image digest and signer.
> With the same image reference, resource bytes, policies and signed bundle bytes,
> ordering referrers forward/reverse/forward yields reject/accept/reject in CLI
> and real restricted-actor server-dry-run admission. Positive and isolated
> legacy controls are retained. This is authenticated-content selection dependence,
> not a forged-signature or no-valid-results claim.
>
> Reproducer: the command above and `--selection-only` implementation in PR #65.
> Expected for our current all-statements contract: reject all three requests.
> Actual: the middle request is accepted. The test correctly completes while
> contract evaluation fails; no production migration is enabled.
>
> We inspected final #18049, merged as edd8b239 on main. It is absent from the
> inspected v1.19.2 release artifacts/source, so this is not a claim that #18049's
> patched code reproduced the defect. That patch chooses newest with bundle-time
> preference and payload-byte ties; it does not expose all authenticated statements.
> Please clarify the official release/backport path and whether an authenticated
> collection/explicit selection strategy is planned. Our product is separately
> reviewing current-authorization semantics; no upstream all-statements standard
> or general vulnerability is asserted.

### Support deadline, next branch and partial-runtime option

Consulted **29 October 2026**: the official
[API retirement schedule](https://kyverno.io/docs/policy-types/overview/#deprecation-schedule-for-legacy-types)
lists ClusterPolicy deprecated in 1.19 and removed in **1.20**. The
[community patch policy](https://kyverno.io/docs/installation/releases/#community-patch-support)
lists 1.19 as supported until the 1.20 release, estimated **November 2026**, with
about three months of limited critical-bug/high-or-critical-CVE patches. This is
an event-based estimated deadline, not a guaranteed day or indefinite 1.19.2
support. Kubernetes 1.35 remains within its documented matrix.

Next maintainer review: **2 November 2026**, or the 1.20 release announcement if
it occurs earlier. Open **`design/attestation-selection-contract`** to approve
context, supersession, time/freshness, conflict and replay semantics before changing
producers or consumers. Reassess three explicit exits: (1) validate an official
release with the required capability against unchanged or newly approved contracts;
(2) approve and implement a current-authorization contract that improves the
product, then test both lanes; (3) evaluate a maintained alternative if no supported
route is available before 1.19 support ends. Verify artifact provenance, embedded
libraries, all selection cases, full independent controls, readiness/RBAC/diagnostics,
real local integrations and a fresh authorized hosted run before adoption.
No automatic upgrade or policy removal is scheduled.

A separate runtime-only move to ValidatingPolicy could reduce later work and test
manifest semantics without attestation selection. It also creates a mixed API
inventory/readiness/RBAC/diagnostic burden and still depends on legacy verifyImages.
It therefore does **not** solve ClusterPolicy removal or the support deadline.
Recommendation: prioritize the authorization/support decision, and consider this
bounded intermediate step only if its tests/maintenance savings justify it. It is
neither implemented nor claimed as a complete transition in this PR.


## Architecture decision: canonical bundles, official admission verification

On 29 October 2026 the owner explicitly revised the original **bundle-only
admission** requirement. Merely consulting a classic representation is no longer
a blocker. This is an authorized behavior change, not complete behavioral
equivalence. Historical observations, packages and their bytes remain unchanged.

- **Canonical production and custody:** continue issuing modern Sigstore bundles,
  authenticating those exact bundles in CI and preserving them with the delivery.
  Full CycloneDX 1.7 schema validation remains in CI.
- **Admission representations:** use only official, pinned Kyverno APIs and
  verifiers. Modern bundles and classic DSSE attestations may qualify only after
  real tests establish the same authenticity, subject and authorization checks.
  A conventional classic `.sig` signature is not a DSSE `sign/v1` statement and
  cannot satisfy the independent-signature contract. Registry queries alone do
  not establish support or identify the authenticated object. Mixed evidence is
  not assumed to be merged by the verifier.
- **Representation-independent invariants:** independently require authenticated
  sign/v1, CycloneDX, SLSA provenance and verification-results for the expected
  digest; evaluate all content conditions on one authenticated statement per
  predicate. Keep exact source/revision/builder, golden-path-v1 and seven PASS
  checks. Keep exact hosted workflow/ref/issuer, certificate roots and transparency;
  development-key exceptions remain local only. No fork, custom cryptographic
  verifier or additional verification chain will enforce format exclusivity.
- **Duplicates:** preserve the existing all-authenticated-statements content
  checks. The pinned legacy engine checks each authenticated statement of the
  requested predicate and rejects any content failure. Both equivalent valid
  duplicates must pass; a conforming and nonconforming signed pair must fail in
  either order. Complementary but individually insufficient statements must fail.
  Do not replace this with last-entry or any-entry semantics during migration.
- **Absence and attribution:** bundle-only inventories cannot establish absence
  for a verifier that can consume other representations. Before adapting F07,
  F08 and F13, capture bounded complete referrers plus the effective classic
  `.sig`/`.att` locations before and after the request. A confirmed not-found
  response is distinct from permissions, transport, malformed content or trust
  failure. Authenticate required counterparts and retain exact request/response;
  do not infer which blob Kyverno accepted from a generic message or GET log.
- **Upgrade gate:** rerun real-bundle, valid-transparency classic DSSE and
  conventional-signature distinctions, mixed formats, malformed/invalid inputs,
  independent-signature absence, wrong digest/key/identity/content, duplicate
  ordering, registry errors, cache/annotation attacks and hosted admission on
  each verifier change. Pin embedded libraries as evidence as well as CLI tools.

Adoption remains conditional on these tests, complete consumer migration and a
new hosted run. Active ClusterPolicy policies remain unchanged during capability
assessment. A confirmed official-engine limitation blocks adoption and requires
a reproducer; it must not be hidden by weaker predicates. This PR is now scoped
to reviewable research/tests rather than activation of that migration.

### Earlier format-only finding (superseded as an adoption blocker)

The originally required bundle-only boundary could not be selected through
Kyverno 1.19.2's `ImageValidatingPolicy` Cosign attestor. The real CLI probe
observed the verifier retrieving a classic `.att` manifest when no usable
bundles were present. This conflicts with the migration requirement to retain
the bundle format without silent classic fallback. The active renderer,
installation, classifiers, scenarios and historical readers therefore remain
unchanged. Their ClusterPolicy descriptions still describe the active path;
they must not be relabelled as CEL execution.

The probe's classic, timestamp-free local attestations were **rejected**, not
accepted. The finding is automatic fallback, not a demonstrated local signature
bypass or a claim about hosted acceptance. A correctly signed SBOM did satisfy
the generic `verifyImageSignatures` function; selecting the independent
`https://sigstore.dev/cosign/sign/v1` predicate through
`verifyAttestationSignatures` rejected its absence. That distinction is expressible
and is not the blocker.

## Version-specific evidence and decision

Pins remain Kyverno CLI/controllers **1.19.2**, chart **3.9.2**, Kubernetes
**1.35.8**, Cosign **3.1.4**, Trivy **0.76.1**, Conftest **0.71.1**, Helm
**4.3.1**. The CLI reports commit
`e63308f1e16c05cd009ac4864be6ec25c66b49be`, matching the inspected `v1.19.2`
tag. The chart checksum and controller image digests come from `tools.lock.json`.

Sources consulted on 29 October 2026:

- [Migration guide](https://kyverno.io/docs/guides/migration-to-cel/),
  [ValidatingPolicy](https://kyverno.io/docs/policy-types/validating-policy/),
  [ImageValidatingPolicy](https://kyverno.io/docs/policy-types/image-validating-policy/),
  [release/support schedule](https://kyverno.io/docs/installation/releases/).
  These pages orient the investigation; pinned code/CRDs determine capability.
- [Pinned IVP CRD](https://github.com/kyverno/kyverno/blob/e63308f1e16c05cd009ac4864be6ec25c66b49be/config/crds/policies.kyverno.io/policies.kyverno.io_imagevalidatingpolicies.yaml)
  and [VP CRD](https://github.com/kyverno/kyverno/blob/e63308f1e16c05cd009ac4864be6ec25c66b49be/config/crds/policies.kyverno.io/policies.kyverno.io_validatingpolicies.yaml)
  expose stable `policies.kyverno.io/v1`. Internal client imports of `v1beta1`
  are not evidence that the served stable version is absent.
- [IVP Cosign verifier](https://github.com/kyverno/kyverno/blob/e63308f1e16c05cd009ac4864be6ec25c66b49be/pkg/image/verifiers/ivpol/cosign/verifier.go):
  `buildCheckOptsWithBundleDetection` sets `NewBundleFormat` from the number of
  parsed bundles. `loadBundles` skips unreadable/unparseable candidates and
  returns no bundles on referrer retrieval failure. Both verification entry
  points choose classic verification when the resulting list is empty.
- [CEL image-verification functions](https://github.com/kyverno/kyverno/blob/e63308f1e16c05cd009ac4864be6ec25c66b49be/pkg/cel/libs/imageverify/impl.go):
  verification failures become a count of zero; `extractPayload` uses verified
  in-toto payloads. It exposes statement content, not authenticated bundle-format
  provenance with which a CEL condition could disable fallback.
- [Attestor options](https://github.com/kyverno/kyverno/blob/e63308f1e16c05cd009ac4864be6ec25c66b49be/pkg/image/verifiers/ivpol/cosign/opts.go)
  support explicit keys and exact keyless issuer/subject. The CRD's `cosign`
  properties have no bundle-only format selector. `notary` verifies a different
  evidence contract and is not a substitute. An external preflight does not
  change admission's verifier, and adding a raw-registry CEL retrieval would
  introduce another retrieval/control contract rather than preserve this one.

The latest published stable release returned by the upstream release API on
29 October remains **v1.19.2**. No pins change. Its Go dependencies include
Cosign **v3.1.2**, sigstore **v1.10.9**, sigstore-go **v1.3.0** and Rekor
**v1.5.3** (rekor-tiles/v2 **v2.3.0**); see the
[pinned go.mod](https://github.com/kyverno/kyverno/blob/e63308f1e16c05cd009ac4864be6ec25c66b49be/go.mod).
Cosign CLI **3.1.4** does not update those embedded libraries. The SDK is
`v0.0.0-20261008171927-5a61cbc9e077`. Neither a future release nor classic
acceptance is declared compatible without tests. An upstream strict-format
option is no longer required by the revised architecture decision.

## Revised capability result: authenticated duplicate selection

**Recommendation: do not adopt the CEL renderer on the tested official 1.19.2
engine.** The format-only blocker is withdrawn; a different, reproduced content
selection limitation remains. No fork, custom cryptography, new trust exception,
production renderer change or scenario-oracle relaxation is introduced.

Two validly signed results statements for one digest carry respectively the
synthetic fields `{probe: "results", authorized: true}` and
`{probe: "results", authorized: false}`. All other required predicate bundles
are present and valid. CEL requires both fields on the same extracted payload:
`[extractPayload(i, attestations.results)].all(p, ...)`, after explicit
`verifyAttestationSignatures(...) == 1`.

| Case / expectation | Official CLI | Real CEL webhook | Classification |
| --- | --- | --- | --- |
| Four conforming bundles / accept | Accept | Accept | Allowed capability input |
| Independent sign/v1 absent; other three present / reject | Reject | Reject | Required-predicate rejection |
| SBOM-only with explicit sign/v1 / reject | Reject | Reject | No substitution |
| SBOM-only with generic signature function / accept in characterization | Accept | NOT_EXECUTED | Deliberately unsafe comparator; never production policy |
| Empty inventory / reject | Reject | Reject | Mandatory evidence unavailable |
| Altered signature, wrong key or wrong subject digest / reject | Reject | Reject | Verification failures; not absence detection |
| Malformed bundle alone or with other three predicates / reject | Reject | Reject | Unusable evidence; not absence detection |
| All four modern bundles plus timestamp-free classic copies / accept | Accept | Accept | Mixed inventory; does not identify authenticated representation from requests |
| Classic-only timestamp-free local DSSE / reject in this profile | Reject | Reject | Not a general verdict on classic support |
| Split predicates between bundles and timestamp-free classic DSSE / reject in this profile | Reject | Reject | No union-of-representations claim |
| Interpretable invalid bundle + timestamp-free classic DSSE / reject | Reject | Reject | Cannot establish behavior with valid-transparency classic evidence |
| Malformed bundle + timestamp-free classic DSSE / reject | Reject | Reject | Same limitation |
| Signed provenance/results with synthetic unauthorized content / reject | Reject | Reject | Field checks on authenticated content; not the full delivery contract |
| Two conforming results statements, either order / accept | Accept | Accept | Duplicate positive control |
| Two complementary statements, neither fully conforming, either order / reject | Reject | Reject | No construction from separate payloads |
| Conforming then nonconforming results / reject | Reject | Reject | Expected all-statements behavior |
| **Nonconforming then conforming results / reject** | **Accept** | **Accept** | **Blocking divergence from active all-statements checks** |
| Isolated legacy results policy, contradictory pair in either order / reject | Reject | NOT_EXECUTED | Old-engine characterization; never co-installed with CEL |
| Registry HTTP 401, 403, 503 and disconnect / block as integration error | Error, no pass | Policy evaluation error, request blocked | Not successful F07/F08/F13 detection |
| Minimal privileged runtime fixture / reject | NOT_EXECUTED in revised run | Reject | Bounded VP capability, not complete runtime equivalence |
| Classic DSSE with valid transparency; conventional classic `.sig` | NOT_EXECUTED | NOT_EXECUTED | Required before any classic compatibility declaration |
| Invalid interpretable bundle + **valid-transparency** classic evidence | NOT_EXECUTED | NOT_EXECUTED | Required fallback precedence check |
| Exact hosted identity/certificate/transparency and wrong hosted identity | NOT_EXECUTED | NOT_EXECUTED | No new hosted candidate or compatibility claim |
| Full provenance/results contracts, full runtime, Pod/Deployment UPDATE/oldObject, ephemeral/L06, cache/forged annotations | NOT_EXECUTED | NOT_EXECUTED | Deferred after failed mandatory capability gate |
| deliver, demo, vulnerabilities, L01 and new hosted golden-path.yml | NOT_EXECUTED | NOT_EXECUTED | Active migration not implemented; PR64 is not CEL evidence |

This is an acceptance of **contradictory authenticated content relative to the
existing all-statements policy**, not evidence of forged signatures, a wrong
signer being trusted, or acceptance without any conforming results statement.
The probe uses synthetic content and a minimal OCI image, not quotes-node or a
completed delivery. No scenario ID earns PASS from these capability checks.

### Cause and supported-resolution boundary

The [pinned legacy loop](https://github.com/kyverno/kyverno/blob/e63308f1e16c05cd009ac4864be6ec25c66b49be/pkg/engine/internal/imageverifier.go)
checks conditions for **every** authenticated statement of the predicate type.
The [pinned IVP verifier](https://github.com/kyverno/kyverno/blob/e63308f1e16c05cd009ac4864be6ec25c66b49be/pkg/image/verifiers/ivpol/cosign/verifier.go)
passes each authenticated statement to `AddVerifiedIntotoPayloads`; the
[SDK loader](https://github.com/kyverno/sdk/blob/5a61cbc9e077/extensions/imagedataloader/loader.go)
stores one value per predicate type, replacing the previous value.
`extractPayload` returns that single value. The inspected official CEL library
exposes no authenticated collection over which this policy could apply `all`.
`getImageData` returns image metadata, not the missing verified statement set.
Repeated extraction, additional policy resources or a raw inventory cannot
restore the discarded authenticated collection.

Related upstream [issue #18023](https://github.com/kyverno/kyverno/issues/18023)
was already closed when inspected. Its status is not proof of a fix in 1.19.2;
this reproduction uses that official release and its pinned source. The issue's
proposed newest-statement semantics would also require a separate contract
decision; it does not preserve the current all-statements checks automatically.
No upstream issue/comment was posted and no compatible replacement release is
claimed. To preserve the **currently approved** contract, an official API must expose all
authenticated payloads or equivalent all-statements conditions with subject/attestor
binding. A separately approved product contract could justify a different strategy;
the research-closure section compares those choices without changing the active one.
Rerun this matrix and the outstanding hosted/representation checks before
selecting such a release. Do not silently choose first, last, newest or any
conforming statement to make this migration pass.

### Reproduction, failures and custody for the revised decision

`revised-01` retained the initial CLI experiment, including the order-dependent
result. Its initial existential expectation was corrected after inspection of
the old engine's all-statements loop; the raw original expectations remain
unchanged. It stopped with a parser error because the legacy CLI emits two
same-control failures (attestation verification and required-image verification).
The revised parser normalizes only that explicit pair in the isolated legacy
comparator; it does not broaden CEL parsing or accept extra scenario failures.

`revised-02` completed kind/chart setup but stopped at the test proxy's IPv6 bind
selection. It is an infrastructure error, not an admission result. Owned registry
and kind resources were removed. The proxy now selects the network's IPv4 gateway.

`revised-03` completed **58 observations**, including **27 actual restricted-actor
server-dry-run admission requests**, and returned exit **2**,
`BLOCKED_CONTENT_SELECTION`. Two observations violate expectations: the CLI and
webhook accept the contradictory pair in reverse order. The remaining observations
match their explicitly limited expectations, including integration-error cases;
this is not an overall PASS. Source: `3b2c96135e9b6c1bd4c065cf58f96adc27cbb4ed`
plus recorded dirty files; executed probe SHA-256:
`7b992af9277ad9b371f6269fc9b1c77b5cbc8540091657511eaf7255cc64dc6d`.
The exact executed script is retained alongside its `source.json`.
Image digest:
`sha256:30b8f529347a27b52919e41f9d44af9a0d6d87d7e98e5fe6741e6eda6cbc763b`.

The local proxy changes only referrer-list order. Blobs and manifests remain
byte-identical; both orders use the same statement bundles and image digest in
separate repositories. Ordered descriptors and requests are retained. All four
results fixtures (conforming, second conforming, nonconforming and complementary)
were independently authenticated successfully with official Cosign CLI 3.1.4
against the retained public key and exact digest. This is test verification,
not a second production verification chain. No raw GET log alone is treated as
proof of the payload selected by Kyverno.

`revised-04` repeats CLI characterization on the finalized probe, adding legacy
positive counterparts to rule out an always-rejecting comparator. It records
**34 observations**, one mismatched expectation (contradictory reverse-order
CEL acceptance), and exit **2**. Legacy accepts the conforming singleton and
both conforming duplicate orders, while rejecting both contradictory and both
complementary orders. Its source base remains `3b2c961` plus recorded changes;
probe SHA-256 is
`b2f0d738d701da5ab86ce60aa39d2f4dbf4eb1e2734e2b225545200c38a54c9b`.
Image digest:
`sha256:0cfdbcbbe29eb0ef826398f0159f501d8b5b6144683846f8cde8dd74ffbcd290`.
This additional CLI run does not repeat or expand the actual-admission claim.

Only the two CEL capability resources were active in the cluster; the original
ClusterPolicy list was empty. Strict CRD validation, loaded status, endpoints,
webhooks and policy RBAC probes were retained. Image verification cache was
disabled in the chart values; this is not a substitute for the deferred same-image
removal/restoration and forged-annotation matrix. Pod dry-run does not establish
Deployment or UPDATE coverage. Policy/trust consumers, F07/F08/F13 inventory
extensions and historical readers remain unchanged because switching any of
them now would imply an adopted verifier that failed its mandatory gate.

Original webhook contrast:

```text
Policy cel-capability-probe failed: PROBE_RESULTS
pod/cel-probe created (server dry run)
```

For registry faults the webhook instead reports
`Policy cel-capability-probe error: failed to evaluate policy`, followed by
HTTP status or EOF. Missing/altered evidence can still share a generic control
message. Retain the complete log, controlled input and inventory association;
never classify absent evidence from that message alone.

The revised capability work uses no vulnerability DB and does not copy or alter
the identified security-refresh DB. The task-owned, abandoned Go dependency
cache (about 1.7 GiB) was retired without producing a custom binary. No unrelated
Docker volume, history or raw evidence was removed. Capacity and final package
receipts follow below. The owner-authorized representation decision is recorded;
human PR review and adoption acceptance remain pending.

### Revised validation and retained package

The complete `make -C implementacion test` passed after the revised probe:
9 environment, 1,000 service/unit, **51 stdlib-only Python policy** tests, Rego,
16 active legacy-engine checks, offline Cosign cryptography, static workflows,
153 defense and 22 release tests. These are shared regression results, not CEL
adoption. Inventory validation covers all 517 tracked paths; its 10 tests and
the four probe parsing regressions pass. Relative documentation file links,
unchanged tool/chart/image pins and `git diff --check` were checked. The earlier
setup-validation/doctor observations remain those of the initial capability run;
no pins changed and no redundant setup or coordinator suite was run.

Retained new package:
`implementacion/evidence/packages/kyverno-cel-reassessment-3b2c961-20261029.tar.gz`,
**383,819 bytes**, **606 entries**, SHA-256:
`88455c12d27cf65c2e768d684a5258e11dfef7b17b579d3db375bc5c77e44e3d`.
Every file and its checksum list was compared with retained original bytes.
It includes unsuccessful attempts, exact source/hash receipts, public bundles,
ordered registry observations, original admission diagnostics, pinned verifier
sources and shared-test output. Private keys, kubeconfigs, the full upstream
checkout and the vulnerability DB are excluded. The original capability package
still hashes to `af603f49be805413e78dd410b6477ade6b289e994dbab926dfffa796883ac3f1`.
Neither package claims coordinator finalization or a hosted execution.

Codespace resources remained **4 cores / 16 GB RAM / 32 GB disk**. Free disk
sampled 9.1 GiB after retiring the task-owned Go cache, 7.8 GiB during the
successful admission probe and 9.1 GiB after cleanup; these are samples, not a
measured minimum. No tmpfs capacity was counted. Final Docker inspection found
no running containers; the three pre-existing inactive volumes remain untouched.
The successful probe's kind container
`6ac062410ea1719e6e335b7b9738c0193ea6b5957125c8e0a5db7fc4791bdf5c`
and registry
`dd24acb5e8af8382df75b5c82df9dada2380af9c49b82093198038c7d15d7f4a`
were removed and explicit inspection confirmed absence. No private probe
directories remain. Failed-attempt cleanup records are retained separately.

Rollback is currently **no production change to undo**: keep the active renderer
at its existing revision. Do not install the capability policies as production
policies or reuse a probe preparation. Future adoption requires a fresh lab and
an official verifier satisfying the matrix; reverting an adopted revision must
use another fresh, separate environment and its own evidence, never mixed CEL
and ClusterPolicy state. Detailed preparation/retirement guidance remains below.

## Equivalence matrix before replacement

This is the migration design and acceptance checklist, **not implemented
production CEL policy**. `p` denotes a Pod spec or the explicit Deployment
template spec; `cs` denotes containers plus present init/ephemeral containers.
Expressions must guard presence and type before dereferencing. Required fields
must never acquire safe defaults. Diagnostic identifiers below are logical
targets, not invented API rule fields. Final mapping requires original webhook
responses and strict singleton attribution.

| Current control | Proposed CEL resource/expression | Allowed input | Forbidden input | Required test | Diagnostic target |
| --- | --- | --- | --- | --- | --- |
| tfm-runtime / restricted-runtime | VP; optional host flags absent or boolean false; required `p.securityContext.seccompProfile.type == 'RuntimeDefault'` | Restricted Pod/Deployment | Host flags true, missing/null/wrong seccomp | Real CREATE/UPDATE, oldObject/object; missing/null cases | RUNTIME |
| tfm-runtime / restricted-containers | VP; nonempty main list; `cs.all(c, ...)` with explicit false privileged/escalation, true nonroot/read-only, drop contains ALL and no added capabilities | Every container conforms | Safe main + unsafe init; missing required field; unsafe ephemeral spec | Real engine and directed actor requests | RUNTIME, field/control identified |
| tfm-runtime / authorized-image-repository | VP; every image matches escaped exact repository plus `@sha256:[0-9a-f]{64}` | Authorized digest | Tags, foreign repo even outside IVP image filter, empty image/list | Pod/Deployment CREATE/UPDATE; reference namespace excluded | IMAGE_REPOSITORY |
| tfm-runtime / no-host-path | VP; optional volumes, each lacks hostPath | Non-host volumes | Any hostPath | Real engine, including null/type boundary | HOST_PATH |
| tfm-runtime / no-ephemeral-debug-containers | Separate VP; match pods/ephemeralcontainers CREATE/UPDATE; reject explicitly | Ordinary legitimate update | Ephemeral subresource update | Actual restricted actor/subresource request | EPHEMERAL |
| tfm-signature | IVP; `verifyAttestationSignatures(i, attestations.signature, [attestors.trusted]) == 1`, exact sign/v1 type | Independent signature for digest | Only other signed predicates; wrong key/digest; altered signature | Real multi-bundle positive/absence/tampering; representation and duplicate gates | SIGNATURE; absence vs verifier error needs retained inventory |
| tfm-sbom | IVP; verify CycloneDX then inspect one authenticated payload's bomFormat/specVersion | CycloneDX 1.7 for digest | Absent/wrong subject/type/version | Real bundles plus unchanged full-schema CI gate | SBOM |
| tfm-provenance | IVP; verify SLSA v1, then one payload's lane buildType, repository, first dependency gitCommit, builder | Exact authorized source/builder | Wrong origin/revision/build type/builder or missing values | Real negative bundles and recovery; hosted native provenance separately | PROVENANCE_REPOSITORY / REVISION / BUILD_TYPE / BUILDER |
| tfm-results | IVP; verify current results type; one payload has golden-path-v1, exact source, PASS and seven PASS checks | Complete authenticated P1 | Absent/incomplete/P0/wrong source/failure | Real bundles, semantic CEL field tests, recovery | RESULTS_POLICY_VERSION or precise results condition |
| Scope and independence | Each VP/IVP enforces tfm-golden, Pod/Deployment, CREATE/UPDATE; explicit Deployment coverage; no native VAP autogen | Reference namespace/out-of-scope resources untouched | One passing evidence family bypasses another | No active legacy policies; real matching/nonmatching requests | API/kind/name + validation/control |

All field-level conditions for one attestation must be applied together to the
same authenticated payload. Independent successful checks must not combine
fields from different attestations. Content fixtures are not cryptographic or
SBOM-completeness evidence. `golden-path-v1` remains the required contract;
API changes alone do not justify a new results version.

## Availability, trust, diagnostics and consumers

The active integration is not partially switched. The future inventory must
include `apiVersion`, `kind`, name, UID, generation and spec and compare generated,
applied and loaded resources. Inspect actual
`status.conditionStatus.ready` / `conditions` and autogen configs; do not move
legacy `.status.conditions` assumptions or fabricate observed generations.
Readiness still needs endpoints/webhooks and real requests for initial, update,
prepared and authorized lifecycles. Runtime VP must explicitly disable native
ValidatingAdmissionPolicy generation and restrict Pod-controller autogen to
Deployment. A separate ephemeral-subresource policy avoids broadening that route.

Local trust uses an explicit PEM key with `ctlog.insecureIgnoreTlog` and
`insecureIgnoreSCT` only for the timestamp-free local profile. Hosted trust must
use exact `keyless.identities[].issuer` and `subject`; these are literal fields
in this CRD. If a future API requires regex, escape and anchor both ends. Keep
certificate/transparency verification and Kyverno-scoped registry credentials.

Source inspection traces the CEL engine's verification cache to the shared
`ImageVerifyCacheClient` and `imageVerifyCacheEnabled` flag. The CLI supplies a
disabled cache. The admission probe uses the existing chart values with that
flag false. This is not yet a proof of all same-reference evidence removal,
restoration and forged-annotation cases required by final adoption.

The bounded source search found 68 active code/test references to legacy policy
shapes, names and autogen. Outstanding consumers include `lab.sh`, `admission.sh`,
defense adapters, runtime evidence, F08/SBOM/provenance/results snapshots, L05,
manual-task snapshots, paired measurements and lane-A auditing. Final migration
must update their queries, RBAC denial checks, identities and classifiers
together. Preserve legacy readers for original archives. The probe does not
modify scenario adapters, their human-approved oracles or dashboard behavior.

## Reproduction and retained observations

Use a clean worktree with the existing pinned tools and no active laboratory:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export GP_SOURCE_REPOSITORY=https://github.com/tfm-goldenpath/golden-path-lab
make -C implementacion setup-validation
make -C implementacion doctor
python3 -I -S implementacion/tests/integration/kyverno-cel-capabilities.py \
  --admission --output implementacion/evidence/environment/kyverno-cel/fresh-probe
```

The output must be new. Exit **2** now means a required content-selection
expectation was not met; exit 1/other failures mean a probe/infrastructure error.
Exit 0 covers only the executed capability cases, not migration or hosted acceptance.
Classic retrieval no longer determines the exit status. It is opt-in and is not added to `make test` (which must
remain free of Kubernetes infrastructure). All predicates in this probe are
explicitly synthetic `probe` markers signed by a fresh local key; their four
types do not assert completed delivery checks. It uses a minimal zero-layer OCI
image, not quotes-node. Only local disposable registry content is published.

The first CLI experiment (`probe-01`) on the base plus the uncommitted probe
returned: complete four-bundle input PASS; missing independent signature FAIL;
tampered independent signature FAIL; generic signature with SBOM only PASS;
classic-only local attestations FAIL. Counts were one evaluated policy, no
warnings/errors/skips. Original logs and public bundles are retained under
`implementacion/evidence/environment/kyverno-cel/`. Its exploratory exit 0
recorded observations only; the finalized probe uses the blocking exit described
above. Private keys were deleted and the registry's absence was checked.

`probe-02` stopped before chart installation because the existing Codespaces
network helper rejected the probe's initial cluster-name pattern. Its original
error, kind identity and deletion/absence logs remain retained. The helper was
not relaxed; the probe now uses its accepted `tfm-demo-run-*` ownership pattern.

`probe-03` completed the CLI and real webhook capability checks with exit **2**,
`BLOCKED_CLASSIC_FALLBACK`. Source base remained
`e0fbe6490794b0da679777d465117a43bdb482ad` plus the uncommitted probe;
`source.json` records that distinction and its exact SHA-256:
`524c6b1d968ba5818cb41b0fa3180b8b99af42e57ca472cca6f69e17d9ffa77c`.
Commit `3b2c961` retains the probe with those same bytes; the revised probe is a new version. This is not an end-to-end
execution of a later commit or of quotes-node.

- Synthetic OCI image digest in every isolated repository:
  `sha256:793a57cec5ee88d1c38575cefc16cc65ae89457c508bc2359621099b2caf5021`.
  References use `172.18.0.3:5000/{bundles,no-signature,generic-substitution,classic,tampered}`.
- The server accepted both stable-v1 policy objects with strict CRD validation.
  Loaded status reported `conditionStatus.ready=true`, WebhookConfigured and
  RBACPermissionsGranted; **no observedGeneration was emitted**. VP autogen
  recorded only Deployment; IVP autogen was disabled in this bounded Pod probe.
  This does not establish Deployment equivalence.
- No ClusterPolicy was active. The restricted deployer could not create/update/
  delete VP, IVP or CEL PolicyException. Full trust-resource RBAC remains part of
  the unimplemented migration, not a claim made by this limited probe.
- The real actor's server dry-run accepted all four bundles and rejected missing
  signature, tampering, classic local attestations and the privileged runtime
  fixture. No Conftest gate stood in front of these requests. The complete
  quotes-node runtime contract and UPDATE/ephemeral/L06 matrix remain pending.
- Registry logs contain two actual Kyverno GETs of the classic `.att` manifest,
  one from CLI and one from admission. `classic-fallback-requests.json` retains
  exact paths/status/user-agent; the inventory has no bundle referrers there.
- Kind container `da2046720666e3f1c38f36fdddb11365c2551adc75b59ad35b7bae00970950cd`
  and registry `b8aa365db8e46aed95d123f8f1fa7b955720997d4aba2fd5ad58a21a0b31ab36`
  were removed. Explicit inspection returned `no such object` for each. Private
  temporary keys/kubeconfig were removed; public key/bundles remain retained.

Original webhook diagnostics, excluding the kubectl file-path prefix:

```text
admission webhook "ivpol.validate.kyverno.svc-fail-finegrained-cel-capability-probe" denied the request: Policy cel-capability-probe failed: PROBE_SIGNATURE
admission webhook "vpol.validate.kyverno.svc-fail-finegrained-cel-runtime-capability-probe" denied the request: Policy cel-runtime-capability-probe failed: PROBE_RUNTIME_PRIVILEGED
```

The first message is identical for missing signature, tampered signature and
classic local evidence. It cannot alone establish which of these occurred.
Final attribution needs the requested object/namespace association, exact
single-control response and independently retained inventory/verification
evidence. This probe records controlled inputs, not a production classifier.
No fictitious legacy rule field is introduced.

The Codespace remained 4 cores, 15 GiB reported RAM (16 GB machine), 32 GiB disk.
Initial free space was 9.2 GiB; an in-run observation showed 7.9 GiB and the
post-cleanup observation 9.1 GiB. These are sampled readings, not a measured
minimum. The existing 3 GiB reserve and 5 GiB infrastructure planning allowance
were checked before kind; no tmpfs was counted as additional disk. No unrelated
volumes, packages, root npm files or historical evidence were deleted.

`setup-validation`, `doctor` and the complete `make -C implementacion test`
passed: 9 environment tests, 1,000 service/unit cases, 49 stdlib-only Python
policy tests (including two new synthetic parser regressions), Rego, 16 existing
legacy-engine checks, offline Cosign cryptography, static workflows, 153 defense
tests and 22 release tests. These passing legacy regression checks do not
establish a migrated renderer. Exact inventory validation covered 517 tracked
paths; its 10 unit tests passed. Relative documentation links and Bash-block
syntax were checked; `git diff --check` passed.

Retained package (outside Git):
`implementacion/evidence/packages/kyverno-cel-capability-e0fbe64-20261029.tar.gz`,
93,339 bytes, 165 entries, SHA-256
`af603f49be805413e78dd410b6477ade6b289e994dbab926dfffa796883ac3f1`.
Its `SHA256SUMS` covers original probes, unsuccessful preparation, public bundles,
logs, storage and validation-source records. Every archived file was compared
byte-for-byte with its retained original. Private keys/kubeconfig and the
disposable upstream source checkout are excluded. This is a capability archive,
not a coordinator delivery package; no `finalization.json` is asserted.

No scanner or vulnerability DB is needed/acquired for this capability check.
No functional scenario, L01/L05, delivery, vulnerability suite or timing campaign
execution is established by it. `deliver`, `demo`, `vulnerabilities` and hosted
`golden-path.yml` on a CEL candidate remain **NOT_EXECUTED** pending the revised
capability gate and implementation. PR64's hosted run does not validate CEL. Do not
dispatch a publishing workflow for an unimplemented migration.

## Adoption and continuation

Do not reuse or edit a sealed ClusterPolicy preparation as a CEL preparation.
Retire only resources owned by its recorded state, using its existing coordinator
cleanup. Keep its package, source and original bytes. Once the blocker is fixed,
finish renderer/consumers and create a fresh laboratory from the tested commit;
query `validatingpolicies.policies.kyverno.io` and
`imagevalidatingpolicies.policies.kyverno.io`, retain their loaded specs/status
and original admission diagnostics, and confirm no Golden Path ClusterPolicy is
active. Returning to an older revision requires a separate fresh environment,
not mixed state or live policy conversion.

After equivalence tests and `make test` pass, commit the candidate and execute
sequential `deliver`, `demo`, `vulnerabilities` within the existing resource
margins. The final branch/SHA needs its own authorized hosted workflow dispatch,
native provenance and exact branch identity, package/hash and cleanup review.
Unsupported hosted negatives remain NOT_EXECUTED. Keep Actions upgrades separate.
Human review and final acceptance are pending. Assistance: OpenAI Codex,
capability analysis, probe implementation and documentation; no human decision
or review is inferred.
