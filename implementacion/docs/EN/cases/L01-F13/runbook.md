# Execution guide: legitimate delivery and missing results authorization

[English documentation](../../README.md)

[Versión en español](../../../ES/cases/L01-F13/runbook.md).

The first demonstration integrates `quotes-node`, an image registry, early policies, vulnerability scanning, an SBOM, signatures, provenance and Kubernetes admission. It combines **L01**, a complete legitimate delivery, with **F13**, a missing mandatory results attestation. The [case specification](README.md) defines the oracle and limitations.

Outputs below are **expected results**, not a claim that a new run has been performed. Unit tests alone do not establish Docker/Kubernetes integration, and the local lane does not establish GitHub OIDC identity. Each run's evidence records its observed result.

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

Run the following in the devcontainer's **Linux terminal**, from `implementacion/`. They are not instructions for running the complete laboratory directly in Windows PowerShell or Git Bash.

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

`scripts/demo.sh` prepares an isolated laboratory with **kind, zot and local development keys**. It builds one `linux/amd64` image, retains its digest and executes the reference and protected paths. Development keys are neither committed nor trusted by the GitHub lane.

The service runtime uses **Node 24.21.0 on Alpine 3.24**, pinned by digest through `SERVICE_NODE_IMAGE` and separated from the Debian devcontainer. The service has no production npm dependencies, so its Dockerfile removes npm, npx and Yarn from the delivered image. Trivy still analyzes the remaining components; this reduction does not guarantee no vulnerabilities or relax the HIGH/CRITICAL threshold.

Outside a Git checkout, the local commit field contains forty zeros as an **unavailable-commit sentinel**. Local provenance records `gitCommitAvailable: false` and a `sourceSnapshotSha256` hash of selected source files. This links a working copy to a run, but is not a real commit, does not automatically cover every repository file and does not establish GitHub provenance. Lane B uses the hosted run's actual commit. See [delivery contracts](../../delivery-contracts.md).

Expected sequence:

1. Service and policy checks pass.
2. The image works by digest in the reference namespace R.
3. G checks manifests, scans that image with Trivy and applies the HIGH/CRITICAL rule. It generates the original CycloneDX SBOM and a separate vulnerability report.
4. G signs the image and produces/verifies the local SBOM and provenance evidence.
5. Before results authorization is issued, F13 confirms its absence and directly exercises the later barrier: Kyverno in `tfm-golden` must reject the request for that missing attestation while other evidence remains valid. This directed check is not an additional catalogue scenario.
6. After previous mandatory checks succeed, the successful summary is issued and signed. L01 must be admitted and return the expected functional response.
7. F11 is checked through early policy and a directed admission update. A legitimate update is also checked.
8. Diagnostics and an evidence package are retained, and temporary laboratory resources are removed.

Expected final message:

```text
PASS: L01 accepted; F13 and F11 rejected
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

The complete demonstration reuses one digest to compare functional behavior and admission decisions. **It is not a timing-campaign pair**: building once does not measure two independent builds. Recorded times are diagnostics, not the final experimental overhead.

## 4. Run real GitHub integration: lane B

The content must be published to the repository with `.github/workflows` at its root. Enable Actions and verify that repository/organization policies allow declared permissions and GHCR publication.

1. Open **Actions**.
2. Select **Golden Path GitHub integration**, defined in `.github/workflows/golden-path.yml`.
3. Choose **Run workflow** for the revision being tested. The manual workflow must exist on the default branch to appear in this interface.
4. Review preparation, native provenance issuance through `actions/attest`, and finalization.
5. Download **`golden-path-<run-id>-<attempt>`** and retain a copy outside Codespaces. The workflow sets 14-day retention.

The runner creates its own kind cluster; **it does not need access to the Codespace cluster API**. It publishes to GHCR, signs through workflow OIDC identity and generates hosted provenance as a Sigstore bundle. Admission must verify the trusted issuer and identity, digest and required predicates. Local development provenance does not replace this issuance-and-consumption test.

Use the provided `GITHUB_TOKEN` and narrowly scoped job permissions for packages, OIDC and attestations. Do not put personal tokens in project files or transient GHCR credentials in evidence packages. Organization restrictions are environment preparation issues. Follow the [GitHub configuration guide](../../github-configuration.md), including package access and visibility.

Attestation availability and Actions quotas depend on repository visibility and account plan. This base targets the public thesis repository; private repositories may have different entitlements. Keyless signing or `actions/attest` **does not by itself establish SLSA Build L3**.

`act` can check compatible workflow steps, but does not provide GitHub's hosted OIDC identity and services. Use `make demo` for the first complete local run; actual lane B requires GitHub.

## 5. Evidence and cleanup

Raw results go under `evidence/raw/`; packages go under `evidence/packages/`. Both are ignored by Git. Retain the run identifier and immutable image reference to relate reports, signatures, admission responses and HTTP checks.

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
| Run workflow is absent | Check the root location, default-branch presence and Actions enablement. |
| GHCR or attestation permissions fail | Review job and organization/repository permissions; do not add long-lived credentials to the code. |
