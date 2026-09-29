# F09 / F10 / L05 local integration preflight

Date: 2026-09-29. Branch: `test/f09-f10-l05-integration-validation`.
Fetched current main and started from `80c12bcf7b8337ea0448fcdc60447995b14b66aa`.
Outcome: **BLOCKED before demo**. No new demo run ID exists.
Human review and final decision: **pending**.

## Actual observations

- `make -C implementacion doctor` failed: npm `12.1.0`, expected `11.19.0`.
  Node was the pinned `24.21.0`. Docker CLI/daemon/server reported `29.8.0-1`
  against required `29.8.0`; Buildx was `0.37.0`, expected `0.37.1`.
  This shell does not satisfy the supported environment's version checks.
- Docker responded on Linux AMD64 with cgroup v2. No containers existed before
  the probe. Client DNS resolved Docker Hub and HTTPS `/v2/` returned HTTP 401,
  the unauthenticated registry response; this does not prove image retrieval.
- One disposable docker-container builder used the pinned BuildKit image on the
  existing `kind` network and a Dockerfile containing only the pinned service
  Node base. Metadata retrieval failed with `lookup registry-1.docker.io on
  127.0.0.11:53 ... i/o timeout`. The 60-second bound ended with exit 124.
  No successful image build or local registry round trip was established.
- Cleanup removed the probe builder. Afterwards Docker listed no containers and
  Buildx listed only `default`. The existing network was retained. No firewall,
  daemon, tool pin, trust rule or scenario expectation was changed.
- `make -C implementacion test-env` passed (two test-file entries reported by this
  runner). Full service/policy/crypto tests and `smoke-env` were not run: there is
  no implementation change, and integration prerequisites already failed.

The earlier Docker DNS symptom is reproducible. Client success and container
failure locate the observed boundary; they do not independently establish its
firewall/root cause. Consult the existing [network diagnosis](../docs/EN/kind-network-firewall.md)
without automatically applying its historical workaround. The full demo was not
launched into this known failure. Earlier failed run evidence remains unchanged.

## Immutable source selection

The existing selector successfully exported both actual Git source trees after
an approved retry outside the subprocess-restricted sandbox. Both full commits
exist, are ordered ancestors of recorded local main `80c12bc`, and differ in
`implementacion/services/quotes-node/src/server.js`.

| Selection | Commit | Application tree |
|---|---|---|
| From | `7243334fe4ee7073801a86b25c90986b7d3c5ece` | `32530853938823492672ade08ddce23a1995023b` |
| To | `fc58e220e2d3f38d13216b23e61ffc31271f112f` | `26aeee4965e0b36721235f802a75aa8009a2967c` |

The retained selector output includes file/blob hashes, Git modes and snapshot
hashes. Export establishes source availability only; neither revision was built,
scanned, signed, authorized in admission, rolled out or checked over HTTP here.

## Scenario and readiness boundaries

F09 CI/admission, F10 CI/admission, their exact-inventory recovery and fresh
verification, both L05 deliveries, and L05 policy update/restart/readiness are
**NOT_EXECUTED** in this attempt. There are no new Kyverno diagnostics or
cryptographic verification outputs to inspect. No provenance rejection is claimed.
The packaged completion summary explicitly reports F09/F10/L05 NOT_EXECUTED.

The user reports successful hosted [run 36640544300](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36640544300)
at `80c12bc`: normal hosted delivery and initial admission readiness. This session
did not download or audit that run. It does not execute F09/F10 injection, L05 or
the L05 update/restart path. Hosted negatives and hosted L05 remain NOT_EXECUTED.

## Retained evidence and integrity audit

Paths below are relative to `implementacion/` and ignored by Git:

- `evidence/raw/f09-f10-l05-integration-validation/`: doctor, effective versions,
  source authorization, actual BuildKit output/daemon logs, probe command,
  cleanup, environment tests and explicit blocked result. Sandbox permission
  failures are distinguished from the approved executions in `13-sandbox-notes.txt`.
- `evidence/packages/f09-f10-l05-integration-validation.tar.gz` and `.sha256`:
  preflight diagnostic package, **not a completed scenario run**.
- `evidence/raw/f09-f10-l05-integration-validation-audit.json`: archive checksum,
  all **15 internal file hashes**, and recorded scenario statuses verified.

Archive SHA-256:
`e3f213bef71d1a4259e6d7c6d6f06a2893c8c56641307bfae61cf127b872beb1`.
The audit checked package integrity. It did not rerun signature verification;
this preflight generated no signed image evidence. Raw files were inspected for
private material before packaging; exported source directories are excluded.

## Resume and contribution

Use the [runbook preflight and exact demo command](../docs/EN/cases/F09-F10-L05/runbook.md#environment-preflight-before-retrying).
Select the repository's **Golden Path - implementation** devcontainer/Codespaces
configuration and require pinned environment checks plus BuildKit connectivity
before the demo. Environment repair belongs to its owner; this task did not
change the host or silently bypass the failing doctor.

| Activity | Actual AI assistance | Human review | Final decision |
|---|---|---|---|
| Local preflight, source verification, evidence audit and EN/ES records | Github Copilot (GPT-6) | Pending | Pending |

Documentation review passed: 61 local links across 11 changed/new Markdown files,
both retry command blocks checked with `bash -n`, and `git diff --check`.

No implementation defect was demonstrated. No push, PR publication, remote
workflow, repository-setting change, thesis edit or campaign measurement occurred.

## Proposed PR description

**Title:** `docs: retain blocked F09/F10/L05 local integration preflight`

Record validation from main `80c12bc`: the immutable L05 source pair exports
successfully, but the environment has version mismatches and a bounded pinned
BuildKit probe reproduces Docker Hub DNS failure on kind. Preserve diagnostic
logs and a package with verified archive checksum and 15 internal hashes; provide
exact retry commands and synchronize EN/ES status and TODO.

Validation: environment configuration/probe tests passed; doctor and real BuildKit
connectivity failed. Full demo was not launched. F09/F10 rejection/recovery and
both L05 deliveries, including policy update/restart, remain NOT_EXECUTED.
No signing or policy behavior changed. Github Copilot (GPT-6) assisted; human review and
acceptance remain pending.
