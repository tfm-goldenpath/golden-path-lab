# Kyverno CEL migration — capability gate

Status: **BLOCKED; draft, not an active-policy migration**. Base:
`e0fbe6490794b0da679777d465117a43bdb482ad` (main after PR64), fetched on
29 October 2026. Branch: `refactor/kyverno-cel-policies`.
[Spanish operator note](../../ES/maintainers/kyverno-cel-migration.md).

The required bundle-only boundary cannot currently be selected through
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

The latest published stable release returned by the upstream release API during
inspection was **v1.19.2**. **No compatible released version has been verified to
resolve this blocker.** Do not name an untested future version as compatible.
Resolution requires an upstream, versioned strict-bundle attestor option (or an
equivalent supported verifier) that propagates retrieval errors and never invokes
classic verification. Test it against genuine bundles, classic-only evidence,
unreadable/malformed referrers and mixed inventories before changing pins.
Do not vendor a modified controller or weaken the format requirement here.

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
| tfm-signature | IVP; `verifyAttestationSignatures(i, attestations.signature, [attestors.trusted]) == 1`, exact sign/v1 type | Independent signature for digest | Only other signed predicates; wrong key/digest; altered signature | Real multi-bundle positive/absence/tampering; format gate | SIGNATURE; absence vs verifier error needs retained inventory |
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

The output must be new. Exit **2** means the specific classic-fallback blocker
was observed; exit 1/other failures mean a probe/infrastructure error, not
successful detection. It is opt-in and is not added to `make test` (which must
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
The final committed probe has those same bytes. This is not an end-to-end
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
`golden-path.yml` on a CEL candidate remain **NOT_EXECUTED** while the mandatory
capability gate is blocked. PR64's hosted run does not validate CEL. Do not
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
