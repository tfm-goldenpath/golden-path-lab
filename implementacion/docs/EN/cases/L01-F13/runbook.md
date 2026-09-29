# Execution guide: legitimate delivery and missing results authorization

[English documentation](../../README.md)

[Versión en español](../../../ES/cases/L01-F13/runbook.md).

The first demonstration integrates `quotes-node`, an image registry, early policies, vulnerability scanning, an SBOM, signatures, provenance and Kubernetes admission. It combines **L01**, a complete legitimate delivery, with **F13**, a missing mandatory results attestation. The [case specification](README.md) defines the oracle and limitations.

Outputs below are **expected results**, not a claim that a new run has been performed. The bundle profile passed local compatibility and [hosted OIDC/SCT/transparency validation at `82728c5`](../../../../registros/pr15_review_EN.md); local directed F07 subsequently passed in `run-xFGRe6X1` (see the F07 record below), while hosted F07 remains pending. Unit tests alone do not establish Docker/Kubernetes integration, and the local lane does not establish GitHub OIDC identity. Each run's evidence records its observed result.

## 1. Open the correct environment

Keep these paths under the same repository root:

```text
repository-root/
├── .devcontainer/implementacion/devcontainer.json
├── .github/workflows/
│   └── golden-path.yml
└── implementacion/
    ├── .devcontainer/
    ├── services/quotes-node/
    ├── scripts/
    ├── policies/
    └── Makefile
```

In GitHub Codespaces, choose **Golden Path - implementation**, located under `.devcontainer/implementacion/`. In VS Code, open the repository root, run **Dev Containers: Reopen in Container** and select that configuration. Opening only `implementacion` uses its internal configuration for local development; GitHub workflows must still remain at the repository root.

Run the following in the devcontainer's **Linux terminal**, starting at the repository root. If the terminal already opens in `implementacion/`, omit `cd implementacion`. They are not instructions for running the complete laboratory directly in Windows PowerShell or Git Bash.

```bash
cd implementacion
make doctor
make test
```

`make doctor` must confirm environment readiness. `make test` runs automated service, contract and policy checks. Resolve preparation failures before interpreting a later result as a security acceptance or rejection.

The environment requires Docker, `linux/amd64`, network access to downloads and sufficient resources for kind, Kyverno, the registry and scanner. Configuration requests at least 2 CPUs, 8 GB of memory and 32 GB of storage. Codespaces availability depends on account eligibility and accumulated use; student status does not guarantee unlimited capacity. Stop unused Codespaces.

### Check cgroups before creating kind

The preferred environment uses **cgroup v2**, the kernel mechanism for container resource management:

```bash
docker info --format '{{.CgroupVersion}}'
```

Expected value: `2`. If the engine reports `1`, prefer a host supporting cgroup v2. An explicit option exists for diagnosing older environments:

```bash
GP_CGROUP_V1_COMPAT=1 make demo
```

This sets `failCgroupV1: false` in the kubelet of the **temporary kind nodes** and retains the configuration in the evidence. The parameter controls whether kubelet refuses to start on cgroup v1; it is not an admission policy. It does not migrate or reconfigure the host, nor disable signatures, scanning or Kyverno. The same L01/F13/F11 criteria apply, but record the run as compatibility diagnostics, separately from a cgroup v2 campaign. The option does not automatically apply to `make smoke-env`. See the [kubelet configuration reference](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/).

## 2. Run the complete local demonstration: lane A

```bash
make demo
```

`scripts/demo.sh` prepares an isolated laboratory with **kind, zot and local development keys**. It first builds one `linux/amd64` image shared by the reference and protected paths, then prepares a distinct image for L01's legitimate UPDATE. Both use the same source commit; the L03 fixture adds pinned `is-number@7.0.0` to the second image without changing application behavior. Development keys are neither committed nor trusted by the GitHub lane.

The service runtime uses **Node 24.21.0 on Alpine 3.23**, pinned by digest through `SERVICE_NODE_IMAGE` and separated from the Debian devcontainer. This supported Alpine `main` branch is recognized by Trivy 0.74.0's EOL metadata; see the [compatibility decision](../../../../services/quotes-node/README.md). The service has no production npm dependencies, so its Dockerfile removes npm, npx and Yarn from the delivered image. Trivy still analyzes the remaining components; this reduction does not guarantee no vulnerabilities or relax the HIGH/CRITICAL threshold.

Outside a Git checkout, the local commit field contains forty zeros as an **unavailable-commit sentinel**. Local provenance records `gitCommitAvailable: false` and a `sourceSnapshotSha256` hash of selected source files. This links a working copy to a run, but is not a real commit, does not automatically cover every repository file and does not establish GitHub provenance. Lane B uses the hosted run's actual commit. See [delivery contracts](../../delivery-contracts.md).

Expected sequence:

1. Service and policy checks pass.
2. The image works by digest in the reference namespace R.
3. G checks manifests, scans that image with Trivy and applies the HIGH/CRITICAL rule. It generates the original CycloneDX SBOM and a separate vulnerability report.
4. G signs the image and produces/verifies the local SBOM and provenance evidence.
5. Before results authorization is issued, F13 confirms its absence and directly exercises the later barrier: Kyverno in `tfm-golden` must reject the request for that missing attestation while other evidence remains valid. This directed check is not an additional catalogue scenario.
6. After previous mandatory checks succeed, the successful summary is issued and signed. L01 must be admitted and return the expected functional response.
7. F11 is checked through early policy and a directed admission update. L01 then applies the replacement digest, with its own Trivy report, SBOM, signature, provenance and signed results. The UPDATE must pass admission, complete rollout, leave ready Pods reporting that runtime digest and preserve the reference quote. This tests image replacement, not a functional upgrade.
8. Diagnostics and an evidence package are retained, and temporary laboratory resources are removed.

Expected summary before cleanup and packaging output (`<run-directory>` is the actual evidence directory):

```text
== PASS: L01 accepted; F13 and F11 rejected. Evidence: <run-directory> ==
```

F13 is a negative test: **rejection by the expected rule is the correct test result**. A network failure, unavailable webhook, failed download or unrelated signature failure does not demonstrate F13 and fails the demonstration. If Trivy reports HIGH/CRITICAL findings, G stops; the control is not bypassed to manufacture a passing demo.

`POST /quotes` with `{"insuredAmountCents":100000,"coverage":"basic"}` must return:

```json
{"currency":"EUR","premiumCents":1000,"tariffVersion":"demo-v1"}
```

`GET /healthz` must return `{"status":"ok"}`; `GET /version` must report service name, version and build commit. These checks exercise the deployed service. Node tests alone do not replace admission or digest-based pulling.

## 3. Run only the reference path

```bash
make reference
```

R uses the same API and functional build, deployed to its reference namespace. It does not require G's experimental policies or authorizing evidence. Ordinary Kubernetes validation and functional checks remain: R does not represent a team without automation.

After the bundle pilot passes, freeze the adopted revision and profile before campaign measurements. Do not pool classic development timings with bundle campaign measurements; the twenty-scenario method remains unchanged.

The initial R/G comparison reuses one digest. The later L01 replacement uses a second digest only in G. **This is not a timing-campaign pair**: the extra UPDATE build does not provide independent reference and protected builds. Recorded times are diagnostics, not the final experimental overhead.

## 4. Run real GitHub integration: lane B

The content must be published to the repository with `.github/workflows` at its root. Enable Actions and verify that repository/organization policies allow declared permissions and GHCR publication.

1. Open **Actions**.
2. Select **Golden Path GitHub integration**, defined in `.github/workflows/golden-path.yml`.
3. Choose **Run workflow** for the revision being tested. The manual workflow must exist on the default branch to appear in this interface.
4. Review preparation of both image digests, the two native provenance steps through `actions/attest`, and finalization. The replacement uses `update_image` and `update_digest` from preparation and requires its own verified provenance.
5. Download **`golden-path-<run-id>-<attempt>`** and retain a copy outside Codespaces. The workflow sets 14-day retention.

The runner creates its own kind cluster; **it does not need access to the Codespace cluster API**. It publishes to GHCR, signs through workflow OIDC identity and generates hosted provenance as a Sigstore bundle. Admission must verify the trusted issuer and identity, digest and required predicates. Local development provenance does not replace this issuance-and-consumption test.

Use the provided `GITHUB_TOKEN` and narrowly scoped job permissions for packages, OIDC and attestations. Do not put personal tokens in project files or transient GHCR credentials in evidence packages. Organization restrictions are environment preparation issues. Follow the [GitHub configuration guide](../../github-configuration.md), including package access and visibility.

Attestation availability and Actions quotas depend on repository visibility and account plan. This base targets the public thesis repository; private repositories may have different entitlements. Keyless signing or `actions/attest` **does not by itself establish SLSA Build L3**.

`act` can check compatible workflow steps, but does not provide GitHub's hosted OIDC identity and services. Use `make demo` for the first complete local run; actual lane B requires GitHub.

### Test the bundle candidate before merging it

Once the manual workflow is registered on the default branch, a new dispatch can select the workflow and source from a published correction branch. The correction does not need to be merged first. The following commands can run in **Git Bash on Windows** with authenticated GitHub CLI; they request a hosted run, rather than running the laboratory on Windows. Create and publish `feat/cosign-bundles` yourself before using this example, or replace it with the actual branch name. [GitHub manual dispatch](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow), [workflow reference selection](https://cli.github.com/manual/gh_workflow_run).

```bash
gh workflow run golden-path.yml \
  --repo tfm-goldenpath/golden-path-lab \
  --ref feat/cosign-bundles
```

Identify the new run and check that `headBranch` and `headSha` match the branch and committed correction you intend to validate. If it is not visible immediately, repeat the list command; do not dispatch another run merely to refresh the list.

```bash
gh run list \
  --repo tfm-goldenpath/golden-path-lab \
  --workflow golden-path.yml \
  --branch feat/cosign-bundles \
  --event workflow_dispatch \
  --limit 10 \
  --json databaseId,headSha,headBranch,status,conclusion,url
```

Replace `RUN_ID` below with that run's numeric `databaseId`, then wait for completion. The command returns a failing exit status when the run fails; retain that result.

```bash
gh run watch RUN_ID \
  --repo tfm-goldenpath/golden-path-lab \
  --exit-status
```

After completion, download any produced artifact even if the run failed. Replace `RUN_ID` in both the command and destination. This destination is outside the repository; the package remains subject to the custody guidance below.

```bash
gh run download RUN_ID \
  --repo tfm-goldenpath/golden-path-lab \
  --dir "$HOME/golden-path-evidence/run-RUN_ID"
```

An early failure may produce no artifact; retain the run URL and logs in that case. See the CLI references for [listing](https://cli.github.com/manual/gh_run_list), [watching](https://cli.github.com/manual/gh_run_watch) and [downloading](https://cli.github.com/manual/gh_run_download) runs.

Do not use **Re-run jobs** on an older `main` run to test a newly pushed correction: a rerun retains the original commit and ref. Start a new dispatch on the correction branch. [GitHub rerun semantics](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs).

The temporary cluster authorizes the exact workflow identity for the selected branch, for example `https://github.com/tfm-goldenpath/golden-path-lab/.github/workflows/golden-path.yml@refs/heads/feat/cosign-bundles`, and the corresponding source commit. It does not use a wildcard or present the branch as an approved production release. This workflow currently references no GitHub environment; repository and organization permissions still apply. It publishes to the shared GHCR package, using a per-run image label and digest; cleanup does not remove those remote images or their evidence. After review and merge, validate the resulting `main` revision separately.

### Bundle compatibility and acceptance

This branch uses the candidate bundle profile described in the [migration guide](../../cosign-bundle-migration.md), with Cosign 3.1.3 and Kyverno 1.19.1 unchanged. All image evidence rules use `SigstoreBundle`; `tfm-signature` independently requires `https://sigstore.dev/cosign/sign/v1`. The active path does not complete classic certificate-chain annotations or silently retry classic verification.

Lane A uses `local-signing-config.json` without public signing/log services and `local-trusted-root.json` without hosted CA/log material; the development public key supplies trust. Only A permits no-log/no-SCT verification and isolated HTTP registry access. Lane B retains authenticated `sigstore-trusted-root.json`, exact GitHub identity and issuer, certificate trust and required transparency/timestamp checks. Do not copy A's exceptions into B to obtain a successful run.

The classic [run 36310983700](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36310983700) validated the earlier annotation-only UPDATE. The later classic [run 36314305654](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36314305654), on `4f8fe77`, passed L01/F13/F11 and independently verified image replacement; its artifacts were audited. The released v0.1.0 is at `9f1999e`, which includes that change. Neither classic run validates this bundle candidate or a different commit.

Start a fresh dispatch on the published `feat/cosign-bundles` commit and verify its `headSha` before interpreting the result. Acceptance requires F13 rejection **only** for missing results, L01 admission after results issuance, F11 rejection and a ready replacement digest with its own verified evidence. In addition, the migration acceptance checks must show that other valid bundles cannot substitute for the independent image-signature predicate, and reject tampering, unauthorized trust and wrong digests. Preserve retrieval, signature, provenance and network failures as integration failures.

[Local bundle run `run-De88fpWy`](../../../../registros/cosign_bundles_validation_EN.md) passed with pinned tools, fresh zot/kind and strict inventory retrieval: attributed F13/F11 rejections, L01 admission and rollout of the independently verified replacement digest. The host used Docker Engine 24.0.5/cgroup v1 with explicit `GP_CGROUP_V1_COMPAT=1`. This is compatibility evidence, not the campaign environment or a timing measurement. The run used the modified working tree based on `9f1999e`, identified by the source snapshot in the linked record. Hosted validation subsequently passed at `82728c5`. Local directed F07 passed in `run-xFGRe6X1`; hosted F07 remains pending (see the F07 record below). Keep raw bundles, verifier outputs and applied policies proving the profile exercised.

Kyverno 1.19.1's bundle verifier reports `no matching signatures found` both for missing predicates and some trust failures. F13 therefore requires exactly one identified `tfm-results`/`require-results` rejection (including its generated Deployment rule), valid bundle-only inventories captured before and after denial, with the original preflight revalidated before the request, absent results and present image-signature/SBOM/provenance predicates for the same digest. Other admission policies must pass, and L01 must subsequently admit that same digest after results issuance before the overall run can pass. Inventory parsing is structural evidence, not signature authentication. Additional rules, malformed or unavailable inventories and unrelated verification errors fail the test.

Retain `F13-inventory-consistency.json`, comparing the strict pre/post descriptor sets. Added, removed or changed descriptors fail; ordering is ignored. Use a fresh digest with one controlled publisher and no evidence changes during the request. This is not an atomic registry guarantee and cannot exclude transient changes between observations; later same-digest L01 admission remains required.

The [strict inventory retriever](../../../../scripts/download-bundle-inventory.mjs) replaces any assumption that successful Cosign download output contains every bundle. It performs read-only OCI referrer retrieval with bounded pagination/fallback, checks manifest/blob digests and sizes, validates all expected bundles and requires a matching second listing. It fails on unreadable, malformed, unsupported or changing inventory instead of interpreting missing output as missing results. Local HTTP is confined to A; GHCR uses a fixed repository pull scope. Retain `registry-inventory-before-results.json`, `registry-inventory-after-denial.json` and `registry-inventory-authorized.json` with their bundle arrays. Retrieval integrity is separate from cryptographic trust; see the [migration rationale](../../cosign-bundle-migration.md#strict-registry-inventory-retrieval).

## 5. Evidence and cleanup

Raw results go under `evidence/raw/`; packages go under `evidence/packages/`. Both are ignored by Git. Retain the run identifier and immutable image reference to relate reports, signatures, admission responses and HTTP checks. The after-denial snapshot is `attestation-inventory-after-denial.json`; retain `bundle-profile-before-results.json`, `bundle-profile-after-denial.json`, `F13-early.json` and `F13-after-denial.json` with the original admission log. `development-public-key.pem` is retained for reproducible local verification; private keys remain excluded.

For each image, retain `image.bundle.json`, `sbom.bundle.json`, `results.bundle.json` and, in A, `provenance.bundle.json`, alongside successful Cosign/GitHub verifier outputs. B's native provenance is retained in the complete inventories. Preserve `attestation-inventory-before-results.json` for F13 and `bundle-inventory-authorized.json` after authorization. `evidence-profile.json` records the `sigstore-bundle-v0.3` representation, digest, phase and predicates; its structural checks are not cryptographic verification. Keep original CycloneDX JSON and trust material as well. Files from unreached steps may be absent in failed runs; document that failure.

Within each run, `L01-update/` retains the replacement build, image-specific reports and attestations, admission log, Deployment and Pods. `L01-image-update.json` in the parent records the original and replacement references, observed Deployment generation and ready Pods' runtime image IDs; `result.json` includes it as `legitimateUpdate`. Both images' evidence is included in the evaluation package.

Evidence must distinguish legitimate acceptance, attributable F13 rejection and a technical failure or earlier control that prevented the test from being reached. A package's existence alone does not prove a passing run.

Cleanup runs on completion and controlled failure. If interruption leaves laboratory resources, request cleanup using **that run's actual directory**:

```bash
GP_STATE_DIR=evidence/raw/run-IDENTIFIER bash scripts/demo.sh local cleanup
```

Replace `run-IDENTIFIER` with the directory printed by the run. Cleanup removes the identified temporary resources and retains evidence. Do not remove unrelated clusters, networks or containers.

SBOMs and vulnerability reports can expose component names and versions. Review them before sharing and apply custody appropriate to the real environment. This laboratory adds neither encryption nor a separate custody service.

## 6. Troubleshooting

| Observation | Meaning and action |
|---|---|
| Docker is unavailable or kind does not start | Check the devcontainer and Docker resources. This is not an F13 rejection. |
| cgroup v1 is reported | Prefer a cgroup v2 host; use the explicit compatibility option only for separately identified diagnostics. |
| Tool, image or database download fails | Check connectivity, quotas and retained diagnostics; preserve download-integrity checks. |
| Trivy reports HIGH/CRITICAL | G must stop. Review the base/components and prepare a corrected delivery; do not change the threshold to obtain PASS. |
| F13 is accepted | The requirement failed. Review policy application/scope and whether the attestation was truly absent for that digest. |
| F13 is rejected for signature, provenance or network reasons | The expected condition was not isolated. Resolve the preparation issue before counting success. |
| F13 is correctly rejected but L01 is not admitted | Review summary issuance/publication, verification, identity, commit and policy version. Preserve both responses. |
| L01 replacement is admitted but rollout verification fails | Inspect `L01-update/deployment.json`, `pods.json` and probe diagnostics. Old Pods, the old digest or incomplete readiness do not satisfy the UPDATE oracle. |
| Run workflow is absent | Check the root location, default-branch presence and Actions enablement. |
| GHCR or attestation permissions fail | Review job and organization/repository permissions; do not add long-lived credentials to the code. |

## F07 local admission

`make demo` now sequences F13 → normal results authorization → local F07
backup/removal/rejection/exact restoration → same-digest L01 and HTTP probes →
F11 → independently verified L01 replacement. See the [operational record](../F07/record.md)
for actual observations and remaining acceptance gates.

Retain `F07/before.json`, `negative.json`, `after-denial.json` and `restored.json`,
raw OCI backups, `*.verify.txt`, `*.statement.json`, `controller.json`,
`admission.log`, `admission.json`, `attribution.json` and `recovery.json`.
`F07/result.json` deliberately leaves the positive control pending.
`F07-completed.json` is written only after L01 admission/probes and the original
digest's Deployment/ready Pod checks (`F07/L01-*.json`). The final `result.json`
includes this completion record only when F11 and image replacement also succeed.
A later failure preserves the intermediate evidence and packages overall FAIL.

Hosted delivery keeps its existing flow and records F07 as `NOT_EXECUTED` with
GHCR compatibility pending. It never invokes the mutation helper. The [early CI F07/L04 increment](../L04/record.md) adds a separate pre-results replacement check; this directed check adds no catalogue
scenario or campaign measurement. No hosted dispatch or package privileges are
part of the local command. A failed restoration is an integration failure; retain
the original backup and both statuses in `recovery.json` for diagnosis.

For the inactive hosted protocol probe, reviewed command proposal and stopping condition, see [F07 hosted compatibility](../F07/hosted-compatibility.md). `make demo` and `golden-path.yml` do not invoke it. No hosted execution was performed in that investigation.

## F07 CI / L04

`make demo` now also exercises the replacement candidate's missing-signature CI
barrier before authorization, restores the original artifact, then shares L01's
replacement admission/rollout/HTTP observation with L04. Inspect `F07-CI-completed.json`,
`L04-result.json` and `L01-update/F07-CI/` alongside the original F13/F07/F11 evidence.
The [operational record](../L04/record.md) distinguishes actual runs, failures and
unexecuted hosted checks, and supplies local/GitHub commands. Hosted negative F07
remains NOT_EXECUTED; no prepared GHCR probe is invoked.

## F08 on the local replacement

`make demo` now also exercises [F08](../F08/record.md) on `L01-update`:

```text
scheduled signing → F07 CI removal/recovery → F08 CI alteration/recovery
→ normal results authorization → directed F08 admission/recovery
→ shared L01/L04 replacement admission, ready Pod digest and HTTP checks
```

The F08 negative inventory contains one readable independent image signature
with an altered cryptographic value. Fresh CI verification must reject it;
original acceptance, exact isolation and separately authenticated non-targets
support attribution. Recovery removes the injected manifest, restores the exact
original set and freshly verifies it. No signing occurs during fault or recovery.
The authorized directed check first requires successful server dry-run admission,
then singleton image-signature rejection; eventual real L04 admission is mandatory.

Retain `L01-update/F08-CI/`, `L01-update/F08-admission/`, all `CI-F08*` files and
`F08-completed.json`, alongside L04 and source identity. Audit the archive checksum
and each internal hash. Failed attempts remain evidence; a generic Kyverno error
is not attributable F08. The record distinguishes actual runs from expected flow.
Hosted F08 and negative F07 stay `NOT_EXECUTED`. Hosted gate/L04 acceptance remains
pending a successful separately authorized execution with audited evidence.

## SBOM family increment

Install schema tooling with `make setup-validation` before local tests. The replacement now includes F05/F06 early CI and directed admission checks, with exact recovery before normal authorization and shared L01/L03/L04 acceptance. See the [SBOM runbook](../F05-F06-L03/runbook.md) for validation responsibilities and the recorded integration limitation. Hosted negative F05/F06 remain NOT_EXECUTED.
