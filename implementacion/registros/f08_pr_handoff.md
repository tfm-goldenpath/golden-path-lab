# Proposed F08 PR

- **Title:** `test: reject cryptographically altered image signatures (F08)`
- **Branch:** `test/f08-altered-signature`
- **Base:** `1369a0c322cf5f5f0f68747f168d630ae7f0bb22`
- **Milestone:** Scenario coverage and pilot
- **Publication scope:** the contributor authorized committing, pushing this branch and creating the PR after local validation.

## Change and acceptance

F08 now replaces a real local registry image-signature bundle with a readable
cryptographically altered variant after scheduled signing. The shared CI gate
rejects it before results issuance. Attribution requires signature-only isolation,
original acceptance, unchanged trust, independent non-target authentication and
actual cryptographic rejection. Recovery removes the injected referrer, restores
the exact original artifact set and requires fresh successful verification.

A separate authorized Kyverno check requires positive server dry-run and a
restricted-actor image-signature rejection. Both checks share the existing L04
replacement admission, ready Pod digest and HTTP observation. F07/F13/F11 remain
active. Gate diagnostics, regression coverage, packaging and EN/ES guidance are
updated. See the [operational record](../docs/EN/cases/F08/record.md).

## Verification

- `make -C implementacion test`: passed with pinned tools outside the sandbox;
  443 service/unit tests plus environment, Python, Conftest, Kyverno and real
  offline Cosign checks.
- Fresh real local `run-IIWR8RLL`: F08 CI and directed admission rejected the
  isolated alteration; both recoveries and shared L04 completed. F07, F13, F11
  and L01 passed.
- Package audit: all 452 internal hashes; 44 valid retained bundles independently
  verified; both altered variants cryptographically rejected. Exact restoration,
  signature-only raw changes and unchanged production-source hashes checked.
- DNS-failed `run-lnUGtdTB` retained and audited (12 hashes). Approved temporary
  kind-bridge forwarding rules enabled the retry and were removed on exit.
- Bash/Node syntax, relative documentation links and `git diff --check`: passed.

The record retains exact digests, source snapshot, archive hashes and development
logs. The first tests failed for the absent module before implementation; later
coverage is recorded as regression work. No retrospective TDD history is claimed.

## Assistance and review

| Activity | AI contribution | Human review status | Decision | Evidence |
|---|---|---|---|---|
| Development assistance | GitHub Copilot (GPT-6), identified by the contributor as the main tool | Pending | Pending | Contributor attribution in the publication request |
| Implementation and validation | Codex (GPT-6): scenario/helper, regressions, live run, audit and documentation using the user's supplied requirements/oracle | Pending | Pending | [F08 record](../docs/EN/cases/F08/record.md) |

## Limits or follow-up

Hosted F08 and negative F07 remain **NOT_EXECUTED**. Hosted normal gate/L04
acceptance remains open until a separately authorized successful run and audited
package are retained. No workflow dispatch, permission expansion, thesis edit
or measurement campaign was performed. Local P-256 trust does not prove OIDC.
Snapshots assume one controlled publisher; SIGKILL/host loss require manual
recovery. Human review and final acceptance remain pending.
