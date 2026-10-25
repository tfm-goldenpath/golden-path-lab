# One legitimate quotes-node delivery (P03)

[Guide](README.md) · [Español](../ES/legitimate-delivery.md) ·
[Architecture](../../implementacion/docs/EN/architecture.md) ·
[Validation](maintainers/delivery-core-validation.md)

The local coordinator `implementacion/scripts/deliver.sh` builds and publishes
one quotes-node image to an ephemeral local zot registry, checks it, signs and
verifies its separate evidence, authorizes results, then submits the workload
through the restricted actor to kind. It observes rollout, effective digest in
the Deployment/ready Pods and real HTTP responses separately. It finally retains
evidence and removes only its recorded resources.

This is a functional extraction, with internal interfaces and the existing paths.
It is not a stable consumer API, installer, production-cluster adapter, full L01
trial or repository separation. It creates no reference R, fault fixture,
comparison, campaign measurement or presentation state. L01's independent
replacement image and the other laboratory scenarios still belong to `demo.sh`.

## Prerequisites and invocation

Use the pinned Linux AMD64 Codespaces/devcontainer tools and Docker. Keep the
current versions. If using the already installed checkout-local tools, add them
to PATH. Install the locked schema validation dependencies only if needed:

```bash
# From /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion setup-validation
make -C implementacion doctor
make -C implementacion test
```

Commit the candidate first. The coordinator rejects tracked edits and untracked
files in its selected source inputs. Unrelated root npm files are not inputs.
It captures the exact selected service (including its tests and Docker ignore
rules), policies, schemas, workflows, locks and runtime helpers. Historical
laboratory snapshot selection and build-fixture checks keep their old meaning.

Check actual resources before integration, after build/packaging and retirement:

```bash
nproc
free -h
df -h /workspaces /tmp /var/lib/docker
df -i /workspaces /tmp /var/lib/docker
docker system df
```

The local adapter requires 3 GiB reserve plus planned growth: initially 5 GiB
for cold Docker growth (8 GiB free total), and 512 MiB for evidence on its own
filesystem, plus a 2-GiB database working allowance before analysis. This is a conservative starting allowance, not a guarantee. Check
the actual Docker root if different. One active kind laboratory per endpoint;
do not stop or remove earlier laboratories without resolving ownership and use.
A Codespace request does not resize an existing machine. Insufficient capacity
stops the next heavy operation; inventory earlier resources/evidence and obtain
specific custody/deletion authorization instead of pruning globally.

```bash
# Supported from the repository root; the script resolves implementacion itself.
bash implementacion/scripts/deliver.sh local
# Equivalent Make entry:
make -C implementacion deliver
```

The profile is fixed to local trust, quotes-node, its pinned base, the
`tfm-golden` namespace and `system:serviceaccount:tfm-golden:deployer`.
`GP_SOURCE_REPOSITORY` can supply the expected HTTPS source repository (default:
this repository). `GP_VULNERABILITY_DB` can select an existing real Trivy DB;
otherwise it downloads the configured publisher DB. A fresh immutable snapshot
and `database-identity.json` bind the analysis. Optional
`GP_VULNERABILITY_SNAPSHOT_ROOT` places that snapshot in an existing canonical
absolute directory; if temporary storage is used, preserve its original bytes
on durable storage before ending the Codespace. Never update an old snapshot.

Every invocation creates `implementacion/evidence/raw/delivery-XXXXXXXX/` and
private recovery material under `implementacion/.tmp/private-XXXXXXXX/`.
`delivery-config.json` states roots, service/build context, execution profile,
source, namespace, actor, producer, trust selection, database input and cleanup
owner. State additionally binds the resolved image, public-key hash, DB snapshot
and immutable resource IDs. `GP_STATE_DIR` and resume are rejected. Retrying is
a new invocation and identity; it must not overwrite an earlier attempt.

## Decisions and authorization

The seven checks remain the canonical `CHECKS` in `lab-contracts.mjs`:
`unitTests`, `manifestPolicy`, `workflowPolicy`, `vulnerabilityPolicy`,
`signature`, `sbom`, `provenance`. No predicate type or `golden-path-v1` policy
version changes. Source/service/workflow controls are mandatory; laboratory
regression tests are run during development, not falsely reported as delivery
checks. A successful service command also needs a complete passing TAP summary.

Stage receipts bind actual successful commands and evidence hashes to source,
configuration and, for image checks, the candidate digest. Fresh registry
retrieval/authentication precedes issuance. The independent image signature,
SBOM, provenance and results are still four distinct contracts. Local provenance
names `implementacion/scripts/deliver.sh`, validated against that expected
producer in the fresh CI gate. Historic callers retain their old producer value.

Authorized admission waits for policy readiness, current controller Pods and
Service endpoints, freshly verifies authorized evidence and requires a successful
restricted-actor server dry-run CREATE of the actual candidate. It never relies
on an earlier missing-results rejection. Actual apply, rollout, digest and HTTP
are subsequent separate checks. Timeout or registry/verifier error stops delivery.

`result.json` and `delivery-steps.json` distinguish `PASS`, attributable
`POLICY_REJECTED`, `ERROR`, and `NOT_REACHED` stages. All unsuccessful outcomes
return nonzero; inspect structured evidence instead of inferring detection from
an exit code. A verification denial does not automatically prove a policy
condition. A cleanup or packaging failure cannot make the overall command pass.
`finalization.json` is the final command outcome (including packaging), retained
alongside the archive after it closes. The archived `result.json` describes the
delivery and cleanup before packaging. `package-failure.json`, when present,
records a packaging failure separately; never infer overall PASS from the archived
delivery result when finalization failed.

## Evidence and retirement

Original reports, source/build inputs, configured/effective versions, database
identity, bundles, authentication reports, admission responses, Deployment/Pods
and HTTP responses remain in the raw directory. `state.json`, credentials,
kubeconfig and private keys are excluded from public packaging. Private recovery
material is retained separately; do not publish `.tmp` or run state.

`evidence/packages/delivery-XXXXXXXX.tar.gz` uses
`legitimate-delivery-package/v1`, without fictitious Fxx/Lxx summaries. Existing
laboratory/measurement/manual/defense packaging profiles remain compatible.
The first archive is never replaced. The coordinator closes its log writer
before computing hashes. Verify the outer and every internal hash with trusted
repository code, without executing code from the archive:

```bash
# Replace delivery-XXXXXXXX with the actual run printed by the coordinator.
cd implementacion/scripts
python3 -c 'from lane_a_evidence import verify_package; import sys; verify_package(sys.argv[1])' \
  ../evidence/packages/delivery-XXXXXXXX.tar.gz
```

Cleanup checks immutable container IDs and recorded volume metadata/consumers.
Foreign or changed resources are left intact with an error. First diagnostics
and packages survive repeated cleanup. If interrupted, from the repository root:

```bash
bash implementacion/scripts/deliver.sh cleanup \
  /workspaces/golden-path-lab/implementacion/evidence/raw/delivery-XXXXXXXX
```

This is retirement only, never resume or reauthorization. Preserve failed attempts,
DB bytes and private recovery material. The existing custody procedure and P00
human gates still apply; the published release is neither a complete backup of
local directories nor asserted immutable. No historical evidence is removed by
this extraction.

Hosted `prepare → native provenance → finish → cleanup` remains the laboratory's
separate interface. This new coordinator has no hosted mode. Local tests and keys
do not verify GitHub OIDC, certificates or transparency. See the validation record
for exact revisions, actual checks, integration outcomes and remaining boundaries.

The [validation dependency maintenance record](maintainers/dependency-refresh-validation.md)
tracks the current AJV/format compatibility checks separately from historical P03 runs.
