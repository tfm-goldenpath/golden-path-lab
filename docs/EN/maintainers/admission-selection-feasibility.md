# Official admission selection feasibility — 1 November 2026

**NO_GO for the four exact statement hashes in the proposed [ADR](attestation-selection-contract.md).**
Kyverno **1.19.2** lacks the selector/collection; Sigstore policy-controller
**0.15.1** does not expose the authenticated statement bytes or their hash to
policy. Its exposed artifact digest can bind a verified, evaluated envelope, but
does not preserve the ADR's statement identity across envelope representations.
The bounded CLI counterexample below demonstrates that distinction. It is not a
signature forgery or a general security finding about either product.

[Spanish explanation](../../ES/maintainers/admission-selection-feasibility.md).
Branch: `spike/admission-selection-feasibility`; fetched main/base:
`8a2cfd0fe08b999bb11e987e15aed5485e13e4f4`. The checkout contained two unrelated
untracked root npm files, preserved without staging. The new branch starts directly
at updated `origin/main`; the dirty local `main` was not reset or advanced.

| Boundary | Actual result |
| --- | --- |
| Experiment | Source/API gates completed; second CLI attempt completed, five evaluations and a separate signed-byte mutation check; first failed attempt retained |
| Observed capability | Policy-controller can require particular **envelope digests** among authenticated, same-object content-checked attestations |
| Contract | **FAIL / NO_GO**: envelope identity is stricter than exact signed statement identity; direct statement-byte selection is unavailable |
| Local viability | Registry, local real signatures and official tester work; no kind cluster created after the failed semantic gate |
| Admission / rollout / HTTP | **NOT_EXECUTED**; no Kubernetes requests, actor, installed policy or effective webhook claim |
| Hosted identity / transparency | **NOT_EXECUTED** for delivery; source feasibility only. Verification of the downloaded tester is a separate publisher check |
| Product adoption | **BLOCKED**, human review/design decision pending; PR #65/#66 merge and green CI do not approve adoption |

## Sequential capability gates

Sources consulted on **2026-11-01 UTC**, beginning at 18:10. The
[release inventory](https://api.github.com/repos/kyverno/kyverno/releases?per_page=5)
still ends at [Kyverno v1.19.2](https://github.com/kyverno/kyverno/releases/tag/v1.19.2),
tag commit `e63308f1e16c05cd009ac4864be6ec25c66b49be`. The
[support matrix](https://kyverno.io/docs/installation/releases/) retains 1.19
until 1.20, estimated November, and Kubernetes 1.33–1.35. The
[migration guide](https://kyverno.io/docs/guides/migration-to-cel/) still announces
legacy API removal in 1.20. An estimate is not an observed release or retirement.

The released [verifier](https://github.com/kyverno/kyverno/blob/e63308f1e16c05cd009ac4864be6ec25c66b49be/pkg/image/verifiers/ivpol/cosign/verifier.go#L314)
still adds matching payloads in a loop; the
[CEL interface](https://github.com/kyverno/kyverno/blob/e63308f1e16c05cd009ac4864be6ec25c66b49be/pkg/cel/libs/imageverify/lib.go#L81)
returns an attestor count and one extracted payload. Its verifier SHA-256 is still
`808531702f1cdf4fdcb5f28c4612a8e900b5debfdb7cdb9e773c1e88933cdafa`.
[#18049](https://github.com/kyverno/kyverno/pull/18049), merge `edd8b239`, is not
included: the merge/release comparison remains diverged, 98 ahead / 279 behind.
Current main `381e19a46340c4162c43fcc569a2a87efcfcc47c` retains the newest selector;
its timestamp file matches the prior investigation hash `c6028aa9…5700d`.
Neither newest selection nor signed-subject annotation filtering supplies the four
expected byte hashes. **Gate 1 fails.** Reuse the [previous artifact and admission
research](kyverno-cel-migration.md); no new Kyverno executable, identifier-filter
trial or cluster was needed. Global pins remain unchanged.

The only alternative inspected is [Sigstore policy-controller v0.15.1](https://github.com/sigstore/policy-controller/releases/tag/v0.15.1),
latest published release on this consultation, commit
`cc75baab1d34d3bae47bde7bd934bf79e5ca3afc`. The official project is active; its
[README support table](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/README.md#support-policy)
does not establish Kubernetes 1.35 compatibility. No such compatibility is inferred.
Its release uses Cosign **3.0.5** and sigstore-go **1.1.4**, independent of our
Cosign CLI **3.1.4**. Current development main `b6c7d5b0` was also read; it is not
a published alternative artifact or an execution claim.

| Official boundary | Finding |
| --- | --- |
| [API](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/pkg/apis/policy/v1beta1/clusterimagepolicy_types.go) | `ClusterImagePolicy`, per-attestation Rego/CUE, an outer policy over authority results; no expected raw-statement-hash field |
| [Authentication and content](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/pkg/webhook/validator.go#L830) | Authenticates candidates, then evaluates each requested type's content; successful members reach the outer policy. The artifact digest and evaluated content derive from the **same** `va` object; fields are not assembled across candidates |
| [Policy input conversion](https://github.com/sigstore/cosign/blob/v3.0.5/pkg/policy/attestation.go#L55) | Decodes the DSSE payload, unmarshals the statement and marshals it again. Rego/CUE therefore cannot hash the original statement bytes; hashing JSON again is not the ADR |
| [Outer result](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/pkg/webhook/validator_result.go#L121) | `Payload` is excluded with `json:"-"`; exposed `digest` is `va.Digest()`, not SHA-256(decoded DSSE payload). `id` is also not a content hash; local classic DSSE produced the empty-signature hash |
| [Formats and trust](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/pkg/webhook/validator.go#L1352) | `signatureFormat: bundle` requires keyless; local key plus bundle is explicitly unsupported. Classic DSSE is usable with a local key. Four attestation types, including independent sign/v1, must be requested; a conventional classic image signature is not sign/v1 |
| [Authorities](https://docs.sigstore.dev/policy-controller/overview/#admission-of-images) | Matching CIPs combine with AND; authorities within a CIP normally combine with OR. An explicit single intended authority or outer requirement is necessary; static pass is unsuitable |
| [Discovery](https://github.com/sigstore/policy-controller/blob/cc75baab1d34d3bae47bde7bd934bf79e5ca3afc/pkg/webhook/validation.go#L91) | Experimental `enable-oci11` is false in this fixture. Its separate discovery path is not used as evidence of authentication. Enabling another discovery mode requires a separate trust review |
| Tags and scope | Validator requires digest references; default mutator resolves tags, so default installation does **not** prove rejection of tag requests. Source registers Pod and Deployment CREATE/UPDATE (also init/ephemeral containers); scale-down, deletion and status exceptions exist. No blanket UPDATE coverage is claimed |
| Cache | CLI uses `NoCache` (`FromContext` fallback), with a fresh tester process per evaluation. Controller cache state/effect and resource-version invalidation are **NOT_EXECUTED** |
| Hosted viability | Exact subject/issuer, Fulcio roots, SCT, Rekor and trust-root paths exist. Public-key classic success proves none of them. Native GitHub bundle/statement association and both image provenances require an authorized hosted trial |

The artifact-digest route is sufficiently plausible to test **gate 2**, rather
than reject it solely because the fields have different names. A trusted mapping
can associate a retained envelope digest with E; the experiment checks that the
official engine returns that digest for the same authenticated, evaluated object.
It must also preserve the stated criterion: if the exact selected signed statement
remains available, a harmless change outside those signed bytes cannot make E
unavailable. That is where this route fails. A fixed envelope contract may be a
useful **different proposal**, but has not silently replaced the ADR here.

## Executed minimal fixture and decision matrix

[Tracked adapter](../../../implementacion/tests/integration/admission-selection-feasibility.py)
reuses the existing probe's registry lifecycle, image, four synthetic predicates,
Cosign signing and original logs. No proxy/verifier, fork, ledger or selection
service was added. The harness publishes declared fixtures, including every
candidate; it does not filter retrieval on behalf of the engine. Policies contain
protected constants, and no workload annotations are inputs to this CLI policy.
These predicates exercise capability, **not the complete Golden Path schema,
seven results checks, F07/F08/F13 or academic scenarios**.

`attempt-02` ran on base `8a2cfd0` plus uncommitted probe SHA-256
`4edf2b89994275dde0f2b174cc4c23d719d6e38cd12f9fb93e5df7cc70ca2c2f`;
the reused probe remained `226a2ba5…e9ae`. `source.json` and `executed-probe.py`
retain exact provenance; this execution is not attributed to a later commit.
The final harness additionally creates its temporary root on a fresh checkout
(SHA-256 `99aac08514e3e6c6b7e93ef4411729696bf0dc0cd1397ee31ed676fa6e007da6`).
That one-line startup correction received the final shared suite; the engine
fixture was not repeated after its failed capability gate.
Every CLI invocation has the same image reference and, except the explicitly
rebound control, the same policy bytes. Image digest:
`sha256:10384c57a3b77100dca78aa79dc399ccbecc510d07804877dfd59b0c4f3dbb67`.

The selected results statement SHA-256 is
`fa24bbe26932268db187883cf8e75cad8b4d15c4679d06ddcf6d5c42317ad86a`.
Its compact envelope digest is `efd8b7f3…01f2e`; the indented envelope digest is
`8d9e7a39…17bf`. **Decoded statement bytes and signatures are identical.**
The other three statements/envelopes do not change. All full hashes, statements,
bundles, descriptor lists and actual outer policy inputs are retained. Independent
audit matched every published descriptor to the authenticated evaluated input in
all five evaluations; the duplicate permutation changes only descriptor order.

| Gate-two case (expectation fixed in code before evaluation) | Expected under statement identity | Observed |
| --- | --- | --- |
| Four original selected synthetic statements | ACCEPT | ACCEPT |
| Original plus differently formatted envelope of identical signed bytes, forward | ACCEPT | ACCEPT |
| Same descriptor multiset reversed | ACCEPT | ACCEPT |
| Only the differently formatted envelope remains; E's exact signed bytes still present | ACCEPT | **CONTENT_SELECTION_REJECT** |
| Diagnostic control: change only protected expected envelope digest | ACCEPT | ACCEPT; authenticates/evaluates the previously rejected representation |
| Alter signed `authorized:true` bytes to `false`, keep signature/digest/key/type | Authentication rejection | Official Cosign rejects: threshold/signature failure; original passes |

Thus the failing case is an attributed outer-policy rejection, not missing
evidence, bad cryptography, registry failure or a skipped evaluation. It isolates
the stricter artifact identity. **Gate 2 fails; gate 3 is NOT_EXECUTED.**
The content-filtered outer collection also must not be described as a collection
of all authenticated PASS and FAIL statements. No complete contract is inferred
from this narrow probe.

The requested full matrix remains the acceptance oracle for any revised proposal:

| Full-contract case | Required | Observed in this spike |
| --- | --- | --- |
| Four conforming selected statements | ACCEPT | Minimal synthetic subset only; full content/admission NOT_EXECUTED |
| Identical statement duplicates | ACCEPT, same E | CLI ACCEPT in both orders; representation-only case above disproves general statement identity |
| E=PASS plus authentic FAIL, both orders, scope A | ACCEPT both | NOT_EXECUTED: gate 2 failed |
| E=FAIL plus authentic PASS, both orders | REJECT both | NOT_EXECUTED: gate 2 failed |
| E absent, other authentic PASS exists | Block without substitution | NOT_EXECUTED: gate 2 failed; the observed counterexample has E **present** |
| Two distinct conforming statements | Only E authorizes | NOT_EXECUTED: gate 2 failed |
| Individually missing sign/v1, SBOM, provenance, results | Four independent blocking cases | NOT_EXECUTED: gate 2 failed |
| Wrong expected hash, image digest or authority | Block with established cause | NOT_EXECUTED: gate 2 failed |
| Complementary incomplete statements | REJECT without field splicing | NOT_EXECUTED: gate 2 failed |
| Workload annotation attempts to change selection/trust/verification | No authorization gained | NOT_EXECUTED: no workload request or restricted actor |
| Protected E2 versus earlier E1 authorization | E1 cannot authorize E2 | NOT_EXECUTED: rebound diagnostic is not this test |
| Registry, permissions or connectivity failure | Classified integration error | No engine fault injection; parser regressions reject such errors as selection detections |
| Signed-byte modification retaining signature | Authentication rejection | Executed with real Cosign; no admission claim |

`attempt-01` is retained as **ERROR/INCONCLUSIVE**, zero evaluated policies: classic
DSSE descriptors lacked the official required empty signature annotation. The
correction follows Cosign `NewAttestation`/`sigLayer.Base64Signature`, without
relaxing authentication. Its cleanup parser also initially expected uppercase
`No such object`; the actual lowercase absence response is retained. Both owned
container IDs were independently checked absent; the failed receipt is not rewritten.
Release verification first tried the workflow's GCP service-account identity;
that failed. The successful check requires the exact publisher workflow SAN and
GitHub issuer, with normal certificate/transparency verification enabled.

## Reproduction and custody

Run from repository root with the existing verified pinned tools on PATH. Check
capacity/inodes/memory, Docker storage (`/var/lib/docker` here), containers and kind
clusters first. The inherited CLI guard requires 3.5 GiB free (3 GiB reserve plus
512 MiB); admission would require at least 8 GiB **plus candidate growth**, but is
not reached. No Trivy DB, scans, compilation or global prune is involved.

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion doctor
df -h /workspaces /tmp /var/lib/docker
df -i /workspaces /tmp /var/lib/docker
free -h
docker system df
docker ps -a
kind get clusters
experiment_tools=$(mktemp -d /tmp/admission-selection-tools.XXXXXXXX)
release=https://github.com/sigstore/policy-controller/releases/download/v0.15.1
curl -fL "$release/tester-linux-amd64" -o "$experiment_tools/tester"
curl -fL "$release/tester-linux-amd64-keyless.sig" -o "$experiment_tools/tester.sig"
curl -fL "$release/tester-linux-amd64-keyless.pem" -o "$experiment_tools/tester.cert.base64"
base64 -d "$experiment_tools/tester.cert.base64" > "$experiment_tools/tester.cert.pem"
printf '%s  %s\n' bf9cd8d21dd17c2c1e890ee540ae19d36021d8d805db9c7754b391c405a41437 "$experiment_tools/tester" | sha256sum -c -
cosign verify-blob --certificate "$experiment_tools/tester.cert.pem" \
  --signature "$experiment_tools/tester.sig" \
  --certificate-identity https://github.com/sigstore/policy-controller/.github/workflows/release.yaml@refs/tags/v0.15.1 \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com "$experiment_tools/tester"
chmod +x "$experiment_tools/tester"
df -h /workspaces /tmp /var/lib/docker
python3 implementacion/tests/integration/admission-selection-feasibility.py \
  --tester "$experiment_tools/tester" \
  --output implementacion/evidence/raw/admission-selection-reproduction
# Expected exit 2 with COMPLETED / NO_GO and exactly five evaluations.
# Exit 1 means an integration/harness error, never successful detection.
docker ps -a
kind get clusters
df -h /workspaces /tmp /var/lib/docker
```

The output directory must be new. Retain it even on failure. Only the temporary
tools directory created by that invocation may be retired after verification;
the probe removes its own registry by creation ID and temporary private keys.
Reproduction needs no ignored adapter. Official release checksum, detached signature,
certificate, verification logs and tester version/build metadata are retained;
no downloaded tester is packaged. The tagged source files were checked against
20 official Git blob identities. GitHub reports `bad_cert` for its annotated tag;
this is not presented as verified tag signing. The **binary** signature check succeeds.

Initial `doctor` failed because the tool directory was absent from PATH; it passed
after selecting existing pinned tools. Initial sandbox Git/Docker access errors
were resolved after permission configuration changed. No environment/pin changes
were needed. Eight focused harness regressions cover complete evaluation, omitted
types, integration-error attribution, byte identity, order and cleanup. Shared
suite passed on the final uncommitted harness bytes above (`shared-tests-final.log`,
`validation-final.json`); normal CI on the eventual commit is linked in the PR.
Inventory validation covers 523 paths with ten passing inventory tests; relative
documentation links, Bash examples and `git diff --check` pass.

The workspace has four cores and about 15 GiB usable RAM. Free space displayed
8.8 GiB initially and about 8.6 GiB at closure on the 32 GiB workspace/Docker
filesystem; over 1.69 million inodes remain free. Downloaded tester storage used
the separate `/tmp` filesystem and was retired after hash checking. Exactly two
registry containers were created **sequentially**, both removed by recorded ID.
No cluster or volume was created; the three pre-existing images and three inactive
volumes remain. No global cleanup or historical evidence deletion occurred.

Evidence package: `implementacion/evidence/packages/admission-selection-feasibility-8a2cfd0-20261101.tar.gz`
(754,101 bytes, 219 members), SHA-256
`f69550f785525c5aaea4e79b7de7e7a53301dd5e025f6b7b77f1d7c16d0e550c`.
All 218 data-file hashes in `SHA256SUMS` and every archived byte were verified
against the originals. The adjacent `.receipt.json` records that verification;
`validation-final.json` inside the package identifies the final tested source.
Raw attempts: `implementacion/evidence/raw/admission-selection-20261101/`.
The package excludes keys, credentials, binaries, image layers, DBs and historical
archives; its member hashes and archive hash are independently checked. It is local
custody evidence, not an upstream publication or release asset.

## Integration implications and closure

In a future approved design, `prepared` can bind the first three authenticated
statements but cannot freeze the results hash before results exist. Preserve the
mandatory checks and preissuance F13 first; only then issue/authenticate results,
freeze the complete protected binding, and perform authorized readiness/admission.
Do not make successful admission a prerequisite for issuing the very results it
requires. An unset fourth hash or invalid policy is a **configuration error**, not
evidence of F13 missing-results detection. F13 would need a separate, valid
preauthorization diagnostic, successful authentication of the other three types,
stable complete inventories before/after denial across every enabled representation,
singleton results attribution and the subsequent same-image positive control.
This integration is not implemented or claimed by the spike.

Protected policy/trust/binding writers must remain distinct from the workload
actor; verify actual RBAC and Pod/Deployment CREATE/UPDATE interception before any
adoption. No actor isolation, webhook installation or cache-disable effect was
tested here. Kyverno ValidatingPolicy could complement runtime checks, but cannot
recover raw authenticated bytes that the image verifier never exposes. Likewise,
local keys cannot establish hosted GitHub identity, certificates or transparency.

Scope A remains unchanged: a later unselected FAIL does not revoke E=PASS.
Retiring E1 and preparing E2 is an administrative action, not continuous revocation.
No clock, sequence, ledger or live authorization service is proposed.

Close these **two inspected release candidates** for the four-hash contract.
The concrete next review is whether to approve **immutable signed-envelope artifact
identity**, with an explicit protected association to exact statement bytes and
mandatory re-preparation on rewrapping/re-signing, or require an official engine
API that exposes authenticated raw bytes/statement digests before selection.
The former is stricter and has different availability/representation semantics;
the five CLI observations do not qualify it as GO_LOCAL. Either proposal retains
four independent types, same-object authentication/content, exact image/authority,
no arbitrary PASS substitution and the full local/hosted matrix. Do not announce
`feat/delivery-authorization-selection` as unblocked. Human review remains pending;
the existing 30 November reminder is unchanged.
