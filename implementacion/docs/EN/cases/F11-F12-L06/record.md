# F11 / F12 / L06 runtime operations

The [operation matrix](operations.json) was defined before implementation from the
user's requirements on main `d86465410d74e39ef8e77a9979995bcb268abf9a`.
These are operational records for existing academic identifiers. No thesis
revision was reviewed or changed. Human oracle review and final acceptance remain
pending. Shared L01/L06 observations do not increase the twenty-scenario count.

| Case | Starting input and controlled alteration | Early oracle | Admission oracle |
|---|---|---|---|
| F11 | Authorized digest; set `privileged=true` and `allowPrivilegeEscalation=true` together | Exactly `PRIVILEGED: quotes-node must declare privileged=false` and `ESCALATION: quotes-node must declare allowPrivilegeEscalation=false` | Only `tfm-runtime` / `restricted-containers` (Deployment `autogen-` form); pattern mismatch at `/securityContext/privileged/` or `/securityContext/allowPrivilegeEscalation/` |
| F12 | Change only image reference to the exact original build tag persisted as `buildTag` | Exactly `DIGEST: quotes-node requires an image pinned to a sha256 digest` | Only `tfm-runtime` / `authorized-image-repository`; exact `validation failure: IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest` |
| L06 | Same authorized image; normal L01 creation, then harmless template annotation change | No denials | Admission succeeds, generation increases, only selected template annotation changes, rollout completes, Ready Pods retain expected digest and annotation, HTTP checks pass |

F11 is a **coordinated two-field change**: baseline
`allowPrivilegeEscalation=false` conflicts with `privileged=true`. The fixture
remains Kubernetes-valid and uses the harmless service, without host access or
exploit code. Its reference-namespace server dry-run establishes API shape only;
protected comparisons remain in `tfm-golden`.

The actor can create/update workloads through the existing restricted service
account. It cannot change policies, trust or namespace protection. No privileges
are added. All trial requests use `actor`; `k` observes resources and removes the
owned direct positive Pod. The main coordinator owns infrastructure cleanup.

## Sequence and state oracle

1. Prepare Deployment and isolated Pod inputs, diffs and exact structured Conftest
   results. Hosted preparation preserves these and the original tag in run state.
2. Preserve existing preissuance F13 and normal results issuance. After any F07
   restoration, authenticate the original backing digest with a fresh authorized
   CI gate. Snapshot live policies and namespace identity/protection.
3. Submit F11/F12 Deployment CREATEs while `quotes-node` is absent, plus isolated
   direct Pod CREATEs (`runtime-f11`, `runtime-f12`). Require named `NotFound`
   responses before and after each CREATE. API lookup errors cannot prove absence.
4. Reuse normal L01 creation and HTTP as L06 CREATE. Retain controller Pods as a
   separate observation. Negative Deployment UPDATEs use `replace` on observed
   objects with resourceVersion, changing only the controlled template fields.
   Compare UID, generation and desired spec after rejection. Status,
   resourceVersion and controller-managed metadata may change normally.
5. L06 changes only template annotation `tfm.goldenpath/l06`, using the same image.
   Require real template/generation change, successful rollout and HTTP, Ready
   controller Pods with the expected digest and new annotation. A no-op fails.
6. Submit a legal direct Pod CREATE as `runtime-l06`, observe unchanged image,
   then delete that owned Pod and require actual `NotFound`. Its labels cannot
   match the `app=quotes-node` Deployment selector. No direct Pod UPDATE is used.
7. Compare policy specs/identities and namespace protection. Emit completion
   records only after the positive controls and cleanup succeed. The ordinary
   L01 image replacement and other existing scenario families follow.

Each F12 trial resolves the tag through a bounded read-only registry GET before
and after the request, retaining response bytes, URL, digest header and computed
SHA-256. Both must equal the authorized backing digest. Failed lookups, changed
targets and automatic conversion invalidate the trial. Live verifier configuration
must retain `mutateDigest=false`, `verifyDigest=true`, `required=true` and exact
repository/digest matching. Signature rules match digest references; **these
trials do not claim signatures verified a tag-only reference**. The fresh backing
digest authentication and legitimate digest admission remain distinct evidence.
Snapshots detect observed changes; they do not provide an atomic view or detect
changes reverted between reads. The run assumes no concurrent publisher or
administrator altering its owned image or policies.

Unexpected acceptance, extra/unrelated diagnostics, API validation/immutability,
RBAC, signature, registry, transport, webhook and rule execution errors stop the
run. Raw requests/responses and observed unfavorable state remain. Cleanup never
turns an unfavorable result into a passing rejection.

See [execution and handoff](runbook.md) and [structured observations](completion.json).
