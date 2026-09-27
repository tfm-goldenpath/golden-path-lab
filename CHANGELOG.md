# Changelog

## Unreleased

- Configure Cosign 3.1.3 default Sigstore bundles and Kyverno 1.19.1 `SigstoreBundle` consumers for image signatures, SBOM, provenance and results; require the independent image-signature predicate explicitly.
- Replace local no-log flags with an explicit development signing/trust profile while preserving strict hosted OIDC, certificate and transparency verification. Remove active classic chain-completion calls; retain the helper and historical records pending full hosted acceptance.
- Retain raw bundles, verified outputs and evidence-profile metadata for both initial and replacement images, and synchronize the English/Spanish contracts and branch runbooks.
- Record [local bundle compatibility PASS](implementacion/registros/cosign_bundles_validation_EN.md) in `run-De88fpWy`: pinned tools, fresh zot/kind, strict registry inventory retrieval, attributed F13/F11 rejection, L01 admission and independently verified image replacement. The host used Docker Engine 24.0.5 and cgroup v1 with explicit `GP_CGROUP_V1_COMPAT=1`; this is not a campaign measurement.
- Keep full migration acceptance pending real hosted OIDC, SCT and transparency-log validation and actual F07 negative admission. Preserve the twenty-scenario method and separate classic development timings from later bundle campaign measurements; no SLSA-level increase is claimed.

## 0.1.0 — 2026-09-27

Released classic baseline at `9f1999e`. Hosted run [36314305654](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36314305654) passed on `4f8fe77`, including independent L01 image replacement; the release includes that change. This run does not validate the later release commit or the bundle candidate.

- Add independently verified L01 image replacement, with separate image evidence, native hosted provenance and runtime-digest rollout checks.
- Complete hosted classic Cosign certificate-chain metadata from authenticated Fulcio material, preserve signed content and admission trust, and retain before/after evidence. The subsequent classic hosted validation is recorded in the [migration history](implementacion/docs/EN/cosign-bundle-migration.md#historical-classic-compatibility-findings).
- Tighten F13/F11 rejection attribution and document branch-based integration testing and the impact on the deferred bundle migration.
- Address baseline review findings in HTTP upload handling, evidence packaging, digest/SBOM contracts, Conftest and Kyverno validation, repeated cleanup and bilingual runbooks.
- Use dated Debian package sources, verify security-tool versions against the lock, and include Kyverno CLI regression checks in `make test`.
- Import the existing `quotes-node` laboratory, modular delivery scripts, policies, tests and pinned development environment.
- Include the existing CI and manual GitHub integration workflow definitions.
- Derive the GHCR image name from the source repository to distinguish this laboratory from other repositories in the organization.
- Exclude downloaded policy tools from the delivery source snapshot.
- Adapt documentation to the separate implementation repository and retain prior validation as historical observations.
- Use English for the implementation, policy messages and primary technical guides, with a Spanish entry point and supporting guides; preserve scenario IDs and historical evidence.
- Group guides under `docs/EN/` and `docs/ES/`, with matching topic filenames and case-specific specification/runbook folders.

The baseline is a functional integration demonstration, not a completed twenty-scenario evaluation or timing campaign.
