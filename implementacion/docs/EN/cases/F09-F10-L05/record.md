# F09 / F10 / L05 operational oracle

The [manual task procedure](../../manual-task-calibration.md) reuses F10's labelled,
authenticated local repository-origin fault in independent R/G preparations.
The human correction selects an existing authorized artifact; the completion
check never re-signs or rewrites the faulty provenance. Human calibration and
new live harness validation remain pending. Historical integration observations
below retain their original scope.

Defined before implementation on base `38631e1`. Scope: Scenario coverage and
pilot, functional integration only. Academic identifiers follow the user-supplied
scenario definitions; documentary thesis revision has not been independently
established. Human review and final acceptance remain pending.

| Case | Preparation and actor capability | Rule and expected timing | Recovery / legitimate counterpart |
|---|---|---|---|
| F09 | Valid local replacement; laboratory administrator removes only the provenance OCI referrer, retaining exact bytes. Workload requests use the restricted actor. | Fresh CI: complete retrieval, all unrelated evidence authenticated and valid, provenance alone absent. Directed admission after valid results issuance: only `tfm-provenance/require-provenance` rejects before deployment. | Restore exact original inventory, freshly verify; directed recovery must admit, roll out and pass HTTP checks for the same image. |
| F10 | Valid replacement; labelled laboratory fixture signed with the already trusted local key, for the target digest. Only `buildDefinition.externalParameters.workflow.repository` changes to an unauthorized HTTPS repository. | Authenticate the exact received fixture before content evaluation. Fresh CI rejects only repository authorization; directed admission rejects only the provenance rule. Wrong signature, subject, build type, builder, revision or malformed content is not F10. | Same exact restoration and fresh verification; successful legitimate admission, rollout and HTTP checks. |
| L05 | Two explicit, full immutable Git commit IDs reachable from the locally recorded `main`; distinct service source trees. Export their actual source contents without modifying the user's checkout. Separate records, tests, builds, scans, signatures, provenance and results. | Authorize each exact revision before its delivery, with fixed repository, build type and builder. Each delivery must be verified, admitted and healthy; second image and source revision must differ. | Preserve both executions and source/tree/archive hashes; never infer L05 from L01/L03's same-commit images. |

Unrelated transport, registry, malformed-input and trust failures stop delivery as
integration errors. Multiple-policy rejection and unexpected acceptance fail the
trial. Policies and trust must remain unchanged throughout each fault/recovery
trial. Recovery failure preserves both the original status and the recovery error.
All raw bundles, inventory snapshots, verifier output and decisions belong in the
run evidence, excluded from Git. Unit fixtures are synthetic and do not establish
real registry or Kubernetes behavior.

Initial observation: F09/F10/L05 **NOT_EXECUTED**. Hosted negatives remain
**NOT_EXECUTED**. Hosted L05 requires two genuine Actions runs at different actual
run revisions; a second checkout in one run cannot claim native provenance for
that revision. See the runbook and validation record for subsequent observations.

## Observed validation (2026-09-29)

The final shared suite passed (605 service/unit tests plus environment, policy and
real Cosign probes). Actual initial red/green evidence is recorded in the
[validation record](../../../../registros/f09_f10_l05_validation_EN.md).
Local `run-CKbpvhof` selected/exported the real revision pair but failed building
the initial image because Docker DNS could not resolve Docker Hub. The failed
archive and its 14 internal hashes verified. F09/F10 registry/admission and L05
delivery remain **NOT_EXECUTED** in this increment. Human acceptance is pending.

The subsequent [PR #24 review](../../../../registros/pr24_review_EN.md) records
comment fixes and audits CI `36631532871` plus hosted run `36631562615`. The latter
ran baseline `38631e1`, so it does not close this family's integration requirements.

Merged hosted run `36636319864` failed twice at F13 with webhook timeouts, before
this family's scenarios. The [readiness correction](../../../../registros/kyverno_readiness_fix_EN.md)
retains the same scenario oracles and records the fix's validation limits.

The subsequent [local preflight on main `80c12bc`](../../../../registros/f09_f10_l05_integration_validation_EN.md)
verified/exported the distinct immutable source pair but failed environment pins
and BuildKit DNS on kind. No full demo was launched; F09/F10 rejection/recovery,
L05 deliveries and update/restart readiness remain **NOT_EXECUTED**. The diagnostic
archive checksum and all 15 internal hashes passed; no signatures were generated.
