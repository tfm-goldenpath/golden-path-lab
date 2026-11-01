# Experimental immutable-envelope authorization — 1 November 2026

**INCONCLUSIVE overall; minimal selection works, GO_LOCAL is not established.**
No currently maintained Kubernetes combination could be established from the
inspected official support/install/test sources. This is a support-evidence gap,
not an observed incompatibility or a statement that installation is impossible.
The bounded investigation closes here; do not start product implementation or
another documentation-only chain. Branch name:
`spike/inmutable-envelope-authorization` (intentional spelling). Base:
`7ba200fd1119082b93d49dd80bee960e4709244b`, the observed merge of PR #67.
[Spanish explanation](../../ES/maintainers/immutable-envelope-authorization.md).
That merge does not establish migration approval or completed human review.
Unrelated root `package.json`/`package-lock.json` were preserved untracked; the
branch starts directly at updated main without resetting the previous checkout.

| Evidence boundary | Result |
| --- | --- |
| Inspection | Official API/format and support sources inspected; maintained admission combination unresolved |
| Unit tests | 14 harness regressions PASS; no engine capability inferred from them |
| Real CLI | Minimal selection confirmed; actual sign/v1 producer confirmed; other three predicates synthetic |
| Full experimental contract / local viability | INCONCLUSIVE; complete contracts and supported admission not established |
| Real admission / rollout / HTTP | NOT_EXECUTED |
| Hosted integration | NOT_EXECUTED |
| Product adoption | Not approved; human review pending |

## Contract fixed before execution

This experiment changes identity explicitly. For policy-controller's classic
DSSE path, E is the SHA-256 digest of the OCI **layer blob containing the DSSE
JSON envelope**, media type `application/vnd.dsse.envelope.v1+json`. It includes
every envelope byte (payload string, payload type, signatures and JSON formatting).
It is not the image digest, containing OCI manifest digest, canonical bundle hash,
decoded statement hash or a publisher annotation. A retained local envelope file
has this hash only when its bytes equal the uploaded blob. Repacking/re-signing
may require a new protected preparation even when signed statement bytes agree.
The earlier four-statement-hash contract and PR #67's NO_GO remain unchanged.

Trusted preparation authenticates each canonical bundle, retains its exact
statement and signatures, and binds the corresponding admission blob's digest,
image repository/digest, authority and delivery context. The experimental policy
must receive the digest from the same verified object whose complete content
passed its internal policy. The outer collection contains only successful internal
policy results, not all authenticated candidates. Selected FAIL may block before
outer evaluation; other authentic FAIL does not revoke a selected PASS. An outer
digest match alone is insufficient without independent image/authority/content checks.
The blob does not include the containing OCI manifest, descriptor annotations,
certificate annotations or transparency material outside the envelope. Those
remain independent authentication obligations; do not substitute a publisher's
declared digest. In the native bundle path, the same field instead describes a
**derived, JSON-marshaled envelope**, not the retained bundle or OCI blob. The
classic binding demonstrated here cannot be assumed to identify that bundle.

The administrator owns the binding and trust policy; the workload actor must be
unable to modify either. No workload label, annotation or registry metadata may
choose an alternative expectation. Keep four independent sign/v1, CycloneDX,
provenance and results requirements. Results must carry the configured source,
golden-path-v1, result=PASS and all seven existing PASS checks on one statement.
Those checks are `unitTests`, `manifestPolicy`, `workflowPolicy`,
`vulnerabilityPolicy`, `signature`, `sbom` and `provenance`. Provenance must retain
the configured repository/revision, local build type
`https://tfm-goldenpath.dev/buildtypes/local/v1` and builder
`https://tfm-goldenpath.dev/builders/local-development`; hosted provenance instead
requires the existing workflow build type and exact configured workflow builder.
CycloneDX remains version 1.7 with the required main component and nonempty
component list; the [current contracts](../../../implementacion/docs/EN/delivery-contracts.md)
remain the authority for complete producer/CI requirements.
SBOM schema validation belongs in CI; selected fields at admission do not prove
schema conformance or real inventory completeness. Bundles remain canonical.

## Gates and predefined acceptance matrix

1. Official source/API, formats, trust, Kubernetes support and cache feasibility.
2. Real official CLI: minimal selection first, then actual local producer formats
   and contract fields. Record inventory/bytes before each request; no harness
   candidate filtering. A failed necessary capability stops dependent phases.
3. Only after gate 2: one supported isolated cluster, restricted actor, Pod CREATE,
   Deployment CREATE/UPDATE and generated Pods, tags, namespaces/webhooks, failure
   closure, cache E1→E2, separate admission/rollout/HTTP observations.

| Case | Required outcome |
| --- | --- |
| Four authentic conforming selected artifacts | ACCEPT |
| Identical duplicates | Same ACCEPT |
| Selected PASS plus authentic FAIL, both orders | ACCEPT both |
| Selected FAIL plus authentic PASS, both orders | REJECT both |
| Selected absent with another PASS | Proven absence rejection; retrieval error is integration error |
| Two complementary partial statements | REJECT; no field splicing |
| Each of four required types absent | Independent REJECT |
| Other attestation substitutes for sign/v1 | REJECT |
| Wrong image digest, signer or delivery context | REJECT with attributable cause |
| Signed bytes altered, signature retained | Cryptographic rejection |
| Repacked envelope under previous binding | REJECT |
| New protected binding selects conforming repacked envelope | ACCEPT |
| Workload changes selection/trust | No authorization gained |
| Incomplete/ambiguous/altered protected configuration | Configuration error, blocked |
| Network/registry/permission/evaluation failure | Integration error, blocked |

Results issuance follows mandatory checks and preissuance absence diagnostics;
an unset fourth hash is configuration failure, not F13. Removing a previously
selected artifact is a different observation. No synthetic check is called F13,
and initial/replacement image digests require independent authorizations.

## Official capability and admission eligibility

Consulted **2026-11-01 UTC**, 19:10–19:19. Only the already identified alternative
was investigated; Kyverno #65–#67 observations retain their original scope.
Latest official [policy-controller release v0.15.1](https://github.com/sigstore/policy-controller/releases/tag/v0.15.1)
still resolves to `cc75baab1d34d3bae47bde7bd934bf79e5ca3afc`; main is
`b6c7d5b010ffb1a7e7a842758f54e45bdfcd1de8`, not another published candidate.
The tester uses embedded Cosign 3.0.5; the local producer/verifier is pinned
Cosign 3.1.4. No global pins changed.

| Boundary | Inspection / consequence |
| --- | --- |
| [Internal and outer policies](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/pkg/webhook/validator.go#L830) | Verified candidates pass through individual Rego policies; successful results retain the digest from that same object. The outer policy requires one selected digest per independent type and the explicit trusted authority. FAIL candidates are absent from this collection. Their existence does not defeat a selected PASS |
| [Native bundles](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/pkg/webhook/validator.go#L1374) | Still restricted to keyless authorities. Local key + native bundle remains unsupported by this API. Additional classic DSSE representation is demonstrated only for local keys, with canonical bundle verification and identical payload/signatures |
| [Bundle digest conversion](https://github.com/sigstore/cosign/blob/v3.0.5/pkg/cosign/verify.go#L1856) | After bundle verification, Cosign marshals the DSSE object and returns a static attestation. Its digest identifies those derived bytes; it is not the original immutable bundle artifact digest. A hosted binding design must account for this explicitly |
| Hosted trust | Exact subject/issuer, Fulcio/SCT/Rekor and trusted-root paths exist. Local keys do not exercise them. Native GitHub provenance, both image digests and any classic representation retaining certificate/transparency controls need a separately authorized hosted trial |
| [Supported versions](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/README.md#support-policy) | Table lists Kubernetes 1.27–1.29 for controller >0.10.x, qualified as not fully tested. This does not document support for the repository's Kubernetes 1.35.8 |
| [Release E2E matrix](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/.github/workflows/kind-e2e-cosigned.yaml#L35) | 1.31–1.34; inspected main tests 1.33–1.34. Workflow declarations alone are not executed compatibility evidence |
| [Kubernetes lifecycle](https://kubernetes.io/releases/patch-releases/) | 1.34 ended support on 2026-10-27; earlier listed minors are also EOL. 1.35 remains maintained. No overlap with the inspected controller support/test declarations was found |
| [Official Helm chart](https://github.com/sigstore/helm-charts/blob/ac3cd6b417947f4c7f85d67b81ee47937ac3ca0f/charts/policy-controller/Chart.yaml) | Chart 0.10.8 identifies app 0.13.1, not the tested 0.15.1. Absence of a kubeVersion restriction is not a positive support declaration. No chart or controller image was installed |
| Scope / namespaces | Webhooks register Pod and Deployment CREATE/UPDATE; namespace opt-in and matching policies matter. Default tag resolution is not tag rejection. [Scale-down detection](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/pkg/apis/duck/v1beta1/podscalable_types.go) compares replica counts; validator skips that update before policy. Generated Pod enforcement and template-changing updates need explicit tests; blanket Deployment UPDATE enforcement is not claimed |
| Cache | Tester receives the official NoCache fallback and is a fresh process each time. Effective controller cache disabling/invalidation is NOT_EXECUTED. The E1/E2 CLI control is not an admission cache test |

Gate 1 established a plausible classic local identity route but **did not close
supported admission eligibility**. The small CLI exploration completed while
support sources were checked; it is not a sequential three-gate success. No
unmaintained Kubernetes was installed, and the existing 1.35.8 pin was not used
as an unsupported compatibility assumption. Full producer-contract and admission
phases are NOT_EXECUTED after this unresolved prerequisite.

## Actual CLI observations and remaining matrix

The [existing reproducer](../../../implementacion/tests/integration/admission-selection-feasibility.py)
adds `--contract immutable-envelope`; its historical default still characterizes
the previous statement contract. It reuses registry, signing and command capture,
adds stage-aware classification, immutable-ID/name/label cleanup and same-input
order checks. No alternate verifier or selection service was added.

Final `attempt-03` ran base `7ba200f` plus uncommitted harness SHA-256
`43950a52f9460e59b6edbfbbb926cc7b0874408f4830656af1a63ac72d4975b8`.
Its source copy/status and all public bundle/envelope bytes are retained. This is
not attributed to a later commit. The reused base probe is unchanged.

| Case | Observed in attempt-03 |
| --- | --- |
| Four selected synthetic artifacts | ACCEPT, one outer evaluation |
| Identical result-envelope duplicate | ACCEPT |
| Selected PASS + authentic FAIL, forward / reverse | ACCEPT / ACCEPT |
| Selected FAIL + authentic PASS, forward / reverse | Outer selection REJECT / REJECT |
| Selected FAIL only | Internal content REJECT; outer policy correctly unreached |
| Original selected descriptor absent from classic discovery, repacked PASS available | Outer selection REJECT; complete classic manifest stable before/after |
| New protected binding selects repacked envelope | ACCEPT |
| Real `cosign sign` producer for sign/v1, other three synthetic | ACCEPT; canonical bundle separately authenticated with official Cosign before exposure |

Ten evaluations, all matching their predefined outcomes. For each order pair,
image, policy bytes and candidate multiset are identical; only descriptor order
changes. The classic inventories and all blobs are retained. The nonselected FAIL
is actually published/authenticated, not filtered by the harness. The absent case
withdraws the selected descriptor from the enabled classic discovery inventory;
it does not prove physical deletion of an unreferenced blob or absence across
other discovery modes. This is **not preissuance F13**.

Attempts 01 (nine observations) and 02 (ten) are retained as successful partial
development runs, including their original INCONCLUSIVE exit/status and earlier
cleanup receipts. Attempt 03 adds explicit ownership verification before deletion
and complete native-producer envelope custody. No unfavorable result was erased.
Exit 1 for COMPLETED/INCONCLUSIVE is not a policy detection or infrastructure failure.

The following predefined cases remain **NOT_EXECUTED** at the engine boundary:
full local SBOM/provenance/results contracts; complementary full-contract partials;
individual requirement absence/substitution; wrong digest/signer/context;
new signed-byte corruption; workload tampering; invalid protected configuration;
registry/permission/network fault injection. Eligibility remains unresolved and
the exploration stops before full contracts. PR #67's signed-byte rejection is
historical evidence, not relabeled as a new execution. Fourteen harness regressions
cover byte association, candidate/order preservation, exact evaluation counts,
internal/outer/technical classification, persisted unfavorable observations,
changing inventories and cleanup ownership/absence. These unit tests do not
establish any of those unexecuted engine or Kubernetes outcomes.

## Preparation, integration and operational cost

The intended owner is the trusted delivery coordinator using administrator-only
policy/binding writes; the workload actor only requests workloads. Actual RBAC,
policy immutability, namespace admission, tags, fail-closed webhooks, generated
Pods, E1→E2 enforcement, rollout and HTTP are all **NOT_EXECUTED**. Configuration
must require four unambiguous artifact bindings; missing/altered configuration is
an error and must never become an absence diagnosis or a workload-selected fallback.

Keep the current production sequence: authenticate signature/SBOM/provenance;
complete required checks and preissuance absence proof; emit/authenticate results;
freeze the complete binding; authorize admission. No full golden-path-v1 PASS
results were fabricated to advance the experiment. Synthetic `authorized:true`
predicates only exercise selection. Their success does not establish the real
seven checks, CycloneDX schema validation, inventory accuracy or producer integration.
For future preissuance F13, valid independent diagnostics, complete stable
inventories across all enabled representations and singleton cause attribution
are still required; an unconfigured expected results digest cannot satisfy it.

This delivery-specific proposal differs from active policies that check all
authenticated applicable contents: an unselected FAIL does not revoke E=PASS.
Recovery means a new protected binding. Re-signing or rewrapping introduces an
availability/operational cost: retained exact artifacts and explicit re-preparation,
including each replacement image. No continuous revocation, timestamp selection,
ledger, compromised-producer defense or inventory-completeness guarantee is added.

A maintainable direction exists **in principle** through the official classic
local verifier and four protected envelope identities. It is not an available
consumer feature or an implementation-ready route. The smallest external
prerequisite is an official maintained Kubernetes/controller combination for a
published artifact (for example explicit support for 1.35+); then complete the
already defined full local contracts and admission matrix. Hosted representation,
exact GitHub identity/certificates/transparency and both native provenances remain
separate mandatory work. No new upstream issue/comment or hosted workflow was sent.

Reversal: stop invoking this opt-in mode, retire only resources identified by its
creation receipts, and retain the verified package. Active policies, producers,
renderer, demos, workflows, pins and golden-path-v1 remain byte-identical to base.
No migration rollback is necessary because none was activated. Human review is pending.

## Reproduction, resources and custody

Use the [previous verified download procedure](admission-selection-feasibility.md#reproduction-and-custody)
with the same official v0.15.1 tester and exact publisher identity. This run freshly
downloaded and verified checksum **and** detached keyless signature before execution.
Tester SHA-256: `bf9cd8d21dd17c2c1e890ee540ae19d36021d8d805db9c7754b391c405a41437`.
Check CPU/RAM, disk/inodes and Docker storage/resources before reproduction; preserve
3 GiB reserve. The inherited CLI guard requires 3.5 GiB; any future admission needs
at least 8 GiB plus a growth budget preserving the reserve and supported versions.

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion doctor
# experiment_tools is the unique verified-download directory from that procedure.
python3 implementacion/tests/integration/admission-selection-feasibility.py \
  --contract immutable-envelope --tester "$experiment_tools/tester" \
  --output implementacion/evidence/raw/inmutable-envelope-reproduction
# Current partial probe: exit 1, execution COMPLETED, 10 evaluations,
# decision INCONCLUSIVE, fullLocalContract/admission/hosted NOT_EXECUTED.
```

Output directories must be fresh. The package includes the reusable code at its
normal repository paths; no ignored adapter is needed. Private keys are temporary
and excluded. Three owned registry containers were created **sequentially** and
removed with independently checked absence. No cluster, new volume, image build,
scanner/database or controller installation occurred. Existing three Docker images
and three inactive volumes remain. Four cores, about 15 GiB usable RAM, approximately
8.6 GiB free and 1.69 million free inodes on the workspace/Docker filesystem;
Docker root is `/var/lib/docker`. The downloaded tester used separate `/tmp` storage.

Final pinned-PATH `make -C implementacion doctor` and `make -C implementacion test`
passed on the executed harness bytes above. Fourteen focused harness tests and
ten inventory tests pass; inventory covers 525 tracked paths. Relative documentation
links, Bash examples and `git diff --check` pass. Normal CI on the final commit is
linked in the draft PR; it does not establish admission or hosted compatibility.

Local package: `implementacion/evidence/packages/immutable-envelope-authorization-7ba200f-20261101.tar.gz`,
**268,811 bytes / 339 members**, SHA-256
`d42318299b1d8a5c1e9f1add31f7b2b9b251b328bd996ecce4f4d405f4e3c02a`.
All 338 data-file hashes and every archive member were checked against original
bytes. The adjacent `.receipt.json` also records removal of the hash-checked
downloaded tester **after** archive verification. Final workspace/Docker capacity:
9,251,422,208 free bytes (about 8.6 GiB). No prior evidence was removed.
Raw evidence: `implementacion/evidence/raw/inmutable-envelope-20261101/`.
Package excludes private keys, credentials, downloadable binaries, image layers,
DBs and prior historical evidence. Sources, commands, policies, public fixtures,
original outputs, exact executed source, inventories and cleanup are retained.
Codex performed the investigation and changes; human review/adoption remain pending.
