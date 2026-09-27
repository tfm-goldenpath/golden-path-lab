# Changelog

## Unreleased

- Complete hosted classic Cosign certificate-chain metadata from authenticated Fulcio material, preserve signed content and admission trust, and retain before/after evidence. Hosted admission validation remains required.
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

This entry does not declare a published release or a completed evaluation campaign.
