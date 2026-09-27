# Control contracts

Early checks run with Conftest; Kyverno checks the required properties again when workloads are created or updated in the `tfm-golden` namespace. The scope does not depend on labels that a workload could change. The reference configuration uses a different namespace and is not subject to these policies.

## Early checks

| File / Rego namespace | Input | Decision |
| --- | --- | --- |
| `conftest/manifests.rego` / `manifests` | A rendered Pod or Deployment | Require an image digest, the protected namespace, unprivileged containers without privilege escalation or added capabilities, non-root execution, a read-only root filesystem and `RuntimeDefault` seccomp; prohibit host access. |
| `conftest/workflow.rego` / `workflow` | GitHub Actions workflow | Pin external actions to full commit SHAs; require explicit permissions with write access scoped to the delivery job; prohibit `pull_request_target` and write permissions in PR workflows. |
| `conftest/trivy.rego` / `trivy` | Real image scan JSON report | Reject HIGH and CRITICAL vulnerabilities even when no fixed version is available. Reject missing or empty reports, unexpected structures and invalid severity values. |

Examples from `implementacion/`:

```bash
conftest test manifest.json --policy policies/conftest --namespace manifests
conftest test ../.github/workflows/golden-path.yml --policy policies/conftest --namespace workflow
conftest test trivy.json --policy policies/conftest --namespace trivy
python3 tests/policies/run_rego.py
python3 -m unittest discover -s tests/policies -p 'test_*.py' -v
```

If Kyverno CLI is installed, `python3 tests/policies/run_kyverno.py` also checks runtime rules with the actual engine for Pods and Deployments, including autogeneration and rejection of other repositories, tags and privileged containers. This optional local policy check complements real admission testing in the demonstrator.

A scanner, parser or policy engine error is not treated as an absence of findings. The delivery process must also check that Trivy completed successfully and scanned the expected digest: Rego cannot turn an arbitrary report into authentic evidence. Fixture SHAs are synthetic values used to test the rule's input shape; they are not references to executable action versions.

## Admission and trust for each execution

`kyverno/render.py` produces a JSON `List` that can be applied with `kubectl apply -f`. It requires the source repository, commit, exact OCI repository and observed CycloneDX version. It does not embed private keys. It rejects wildcard identities and incomplete trust parameters.

```bash
python3 policies/kyverno/render.py \
  --mode local \
  --repository "$SOURCE_REPOSITORY" --commit "$SOURCE_COMMIT" \
  --image-repository "$IMAGE_REPO" --sbom-version "$SBOM_VERSION" \
  --public-key "$PUBLIC_KEY" --output "$POLICY_FILE"
```

For GitHub, replace `--mode local --public-key ...` with `--mode github --identity "$CERT_IDENTITY"`; for a private registry, also pass `--registry-secret gp-ghcr`, which must already exist in the Kyverno namespace. The identity must match the full workflow URL and its ref, for example `https://github.com/OWNER/REPO/.github/workflows/golden-path.yml@refs/heads/main`; GitHub Actions is the only permitted issuer.

| Policy | Verified property |
| --- | --- |
| `tfm-runtime` | Exact OCI repository, digest and restricted configuration for all containers; no hostPath. Explicit rejection of added ephemeral debug containers. |
| `tfm-signature` / `require-image-signature` | Valid independent image-signature bundle with predicate `https://sigstore.dev/cosign/sign/v1`, using the development key or authorized OIDC identity. Other attestation predicates cannot satisfy this rule. |
| `tfm-sbom` / `require-sbom` | Signed CycloneDX attestation with the correct format and selected schema version. |
| `tfm-provenance` / `require-provenance` | Signed SLSA v1 provenance with the expected build type, source repository and commit. |
| `tfm-results` / `require-results` | Signed results attestation with the expected policy version, repository and commit, and a `PASS` result for every mandatory check. |

Pod rules are generated and Kyverno autogenerates their Deployment equivalents. The demonstration must check both levels and retain the `require-results` rejection for F13. A network failure or invalid signature is not a substitute for that specific rejection. Workload updates are also evaluated; this configuration does not provide continuous monitoring of already admitted Pods.

Tag-to-digest mutation is disabled: manifests must already specify a digest. Signature and attestation checks use `required=true`, `verifyDigest=true`, `Enforce` mode and `failurePolicy=Fail`. The installer must disable the Kyverno verification cache (`--imageVerifyCacheEnabled=false`) so that a previous result cannot hide the F13 injection. HTTP registry access is enabled only in the isolated local lane. Only that lane permits `keys.rekor.ignoreTlog: true` and `keys.ctlog.ignoreSCT: true` for development-key bundles without public log timestamps. The GitHub lane retains HTTPS, exact OIDC identity/issuer, certificate trust, transparency and applicable timestamp/SCT checks.

Kyverno 1.19.1's bundle verifier reports `no matching signatures found` both for missing predicates and some trust failures. F13 therefore requires exactly one identified `tfm-results`/`require-results` rejection (including its generated Deployment rule), valid bundle-only inventories captured before and after denial, with the original preflight revalidated before the request, absent results and present image-signature/SBOM/provenance predicates for the same digest. Other admission policies must pass, and L01 must subsequently admit that same digest after results issuance before the overall run can pass. Inventory parsing is structural evidence, not signature authentication. Additional rules, malformed or unavailable inventories and unrelated verification errors fail the test.

## Attestation formats

The custom results summary uses `predicateType=https://tfm-goldenpath.dev/attestations/verification-results/v1` and the following predicate contract:

```json
{
  "policyVersion": "golden-path-v1",
  "source": {"repository": "https://github.com/OWNER/REPO", "commit": "40_HEXADECIMAL_CHARACTER_COMMIT"},
  "result": "PASS",
  "checks": {
    "unitTests": "PASS",
    "manifestPolicy": "PASS",
    "workflowPolicy": "PASS",
    "vulnerabilityPolicy": "PASS",
    "signature": "PASS",
    "sbom": "PASS",
    "provenance": "PASS"
  }
}
```

Cosign wraps this predicate in an in-toto statement and cryptographically binds it to the image digest. It is a custom verification summary contract, not a claimed VSA-conformant implementation. It does not assert in advance that admission has taken place. Direct signature, SBOM and provenance checks remain in place even though they also appear in the summary.

Lane A uses a local key and the provenance build type `https://tfm-goldenpath.dev/buildtypes/local/v1`; it does not demonstrate a hosted identity or a SLSA level. Lane B uses native GitHub provenance with `https://actions.github.io/buildtypes/workflow/v1`. Conditions inspect `buildDefinition.externalParameters.workflow.repository` and `buildDefinition.resolvedDependencies[0].digest.gitCommit`. If the producer format changes, the check must fail and the contract must be reviewed rather than silently bypassed.

## Compatibility and sources

The bundle candidate retains `ClusterPolicy`/`verifyImages` with pinned Kyverno 1.19.1. Its deprecation remains visible; migration to a different policy family is separate work requiring equivalent runtime scope, enforcement, trust, readiness and rejection attribution. Changing the evidence format does not complete that migration.

All required image evidence uses `verifyImages.type=SigstoreBundle`: image signature, SBOM, local or native GitHub provenance, and results. Cosign 3.1.3 producers use their default bundle format. Each control requires its own `attestations[].type`; in particular the image-signature predicate is distinct from the other signed attestations. The signed in-toto statement still uses `predicateType`. The active bundle path does not use the historical classic chain-completion helper.

This is a [migration candidate](../docs/EN/cosign-bundle-migration.md), with [local compatibility PASS](../registros/cosign_bundles_validation_EN.md) in `run-De88fpWy`, including strict inventory retrieval; actual F07 negative admission and real hosted OIDC, SCT and transparency-log verification remain pending. Generated policies and unit checks do not prove registry retrieval, cryptographic trust or admission. The acceptance checks must reject a missing image-signature predicate even when SBOM/provenance/results bundles are valid, and retain F13's specific missing-results attribution. Preserve raw bundles, verified outputs, `evidence-profile.json` and applied policies for each digest; a structural profile report is not cryptographic proof. Keep the twenty-scenario method and prior classic results distinct, and freeze the adopted bundle profile after the pilot.

- [Conftest and Rego](https://www.conftest.dev/).
- [Kyverno: verifyImages, required, verifyDigest and caching](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/).
- [Kyverno: signatures, attestations and GitHub bundles](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/).
- [Kyverno: autogeneration for Pod controllers](https://kyverno.io/docs/policy-types/cluster-policy/autogen/).
- [Cosign: signature and attestation verification](https://docs.sigstore.dev/cosign/verifying/verify/).
- [GitHub: official attestation action](https://github.com/actions/attest).
- [Trivy: CycloneDX SBOM and separate vulnerability scanning](https://trivy.dev/latest/docs/supply-chain/sbom/).

Unit tests exercise decisions using synthetic inputs and check the generator contract. The demonstrator's real admission test is needed to establish compatibility with the registry, signatures and webhooks; testing generated JSON does not establish those integrations.
