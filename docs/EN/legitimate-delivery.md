# One legitimate quotes-node delivery

[Guide](README.md) · [Español](../ES/legitimate-delivery.md) ·
[Stages and controls](how-it-works.md) · [Implementation](../../implementacion/docs/EN/architecture.md#implemented-modules-and-dependencies)

`bash bin/deliver local` builds one quotes-node image, checks and signs its
evidence, authorizes deployment to ephemeral local kind, observes the workload,
then preserves evidence and retires its owned resources.

<a id="prerequisites-and-invocation"></a>

## Prerequisites and capacity

Use Linux AMD64, the pinned Codespaces/devcontainer environment, Docker and
network access. From the repository root, add existing checkout-local tools to
PATH if needed, install locked schema dependencies only if missing, then check
the environment:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion setup-validation  # Only if locked validation dependencies are missing.
make -C implementacion doctor
```

Commit the source first. The command rejects tracked edits and untracked files
in selected inputs. Every delivery gets a fresh identity; resume and `GP_STATE_DIR`
selection are unsupported. A retry must preserve the previous attempt.

Inspect actual capacity before running; use the Docker root reported below:

```bash
nproc
free -h
docker info --format '{{.DockerRootDir}}'
df -h /workspaces /tmp /var/lib/docker
df -i /workspaces /tmp /var/lib/docker
docker system df
```

Keep **3 GiB reserve plus operation-specific growth**: initially 5 GiB for cold
Docker growth (about **8 GiB free total**), 512 MiB for evidence on its filesystem,
and a 2-GiB DB working allowance before analysis. These checks can stop a run;
nominal 32-GB disk size is not free capacity. Separate `/tmp` capacity does not
increase `/workspaces`. Run one local cluster/integration at a time. Never lower
the checks or prune unrelated resources to force execution.

## Run

From the repository root, after the checks above:

```bash
bash bin/deliver local
```

An absolute entry path works from another working directory. The fixed profile
uses quotes-node, local development-key trust, `tfm-golden` and the restricted
`deployer` actor. See [current scope](#current-scope).

<a id="decisions-and-authorization"></a>
The sequence is committed source → service/workflow checks → build → manifest
policy → original SBOM and vulnerability analysis → authenticated evidence and
results authorization → policy/controller readiness and authorized server dry-run
→ deployment, rollout, effective-image and HTTP observations → cleanup/archive.
The mandatory checks remain `unitTests`, `manifestPolicy`, `workflowPolicy`,
`vulnerabilityPolicy`, `signature`, `sbom`, `provenance`. Any failed or incomplete
mandatory control stops later protected stages. Independent image signature,
SBOM, provenance and results remain separate evidence contracts.

<a id="evidence-and-retirement"></a>

## Inspect results and evidence

The command prints `implementacion/evidence/raw/delivery-XXXXXXXX/`.
Inspect **`finalization.json` as the final command outcome**, plus the command's
exit status. `result.json` and `delivery-steps.json` explain delivery/cleanup and
stage outcomes: `PASS`, attributable `POLICY_REJECTED`, operational `ERROR`, and
`NOT_REACHED`. A nonzero exit alone does not prove detection. Registry, network,
verifier or evaluator failure is not an attributable policy rejection; rollout,
effective-image and HTTP observations are separate from admission.

The raw directory retains original reports, bundles, verification, source/build
inputs and workload observations. The archive is under
`implementacion/evidence/packages/`. Verify its outer and every internal hash
with trusted checkout code, substituting the printed run ID:

```bash
python3 src/verify_package.py \
  implementacion/evidence/packages/delivery-XXXXXXXX.tar.gz
```

The archived `result.json` precedes packaging; `finalization.json` is written
alongside the raw evidence after packaging closes. Never infer final PASS from
an archived result if packaging failed; inspect `package-failure.json` when
present. `state.json`, credentials, kubeconfig and private keys are excluded from
public packages. Recovery material stays under `implementacion/.tmp/`; do not
publish raw state or private files. Preserve identified DB bytes separately.

## Cleanup

Normal exit performs owned-resource cleanup. After an interruption, use the
original checkout and the absolute raw delivery directory:

```bash
bash bin/deliver cleanup \
  /workspaces/golden-path-lab/implementacion/evidence/raw/delivery-XXXXXXXX
```

Cleanup is retirement only. It validates immutable container IDs and volume
ownership/consumers, refuses foreign or changed resources, and preserves the
first diagnostics and archive. Cleanup or packaging errors cannot turn failure
into PASS. Retain failed attempts and private recovery material.

## Current scope

This available path is fixed to **local quotes-node**. It has no standalone
installer, independent consumer template, stable public configuration API or
production-cluster adapter. It does not run reference/scenario/measurement or
presentation procedures; those belong to the [laboratory](../../lab/README.md).
Local keys do not establish hosted OIDC/certificate/transparency verification.
No production-readiness, full DORA compliance, SLSA Build L3, complete SBOM
inventory or blanket vulnerability-safety claim follows from a successful run.
Historical executions validate their recorded revisions, not a later checkout.
See [current decisions and next increment](../../implementacion/TODO.md#current-decisions-and-actions).

<details>
<summary>Advanced: retained configuration and compatibility</summary>

`GP_SOURCE_REPOSITORY` supplies the expected HTTPS source repository (default:
this repository). `GP_VULNERABILITY_DB` selects an existing real Trivy DB; otherwise
the publisher DB is downloaded. Each run retains a fresh immutable snapshot and
`database-identity.json`. `GP_VULNERABILITY_SNAPSHOT_ROOT` can place that snapshot
in an existing canonical absolute directory. If using temporary storage, preserve
its original bytes durably before ending the Codespace. Never update old snapshots.

Engine/service/policy/tooling/evidence/private paths are **derived internal paths**,
recorded in `delivery-config.json`; symlinked roots are rejected. See the
[module contract](../../implementacion/docs/EN/architecture.md#module-contract).
Legacy `bash implementacion/scripts/deliver.sh local`, its cleanup command and
`make -C implementacion deliver` delegate to the same implementation. Provenance
retains the authorized producer `implementacion/scripts/deliver.sh`;
`legitimate-delivery-package/v1` remains compatible.

The [maintainer validation](maintainers/delivery-core-validation.md#p01b-implementation-boundary--4-november-2026)
records sparse-checkout independence, exact execution revisions, hashes and
historical package verification. It does not close custody or human-review gates.

</details>
