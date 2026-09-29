# L04 and F07 early CI verification

## Oracle fixed before implementation

Base: `3fe4f9e9d595c5f3f34be3021b3c2bc9bd433fbb` (PR #19).
Academic source: supplied `A_evaluacion.md`, F07 lines 319–337, L04
583–601, SHA-256 `efa0b0f2024ed2800217de3099d86dd137acb4dcd91861bc72ad02235a774e45`.

Use the independently built `L01-update` candidate, with a distinct digest and
its own real analysis, SBOM and provenance. After scheduled signing, the local
operator backs up and removes only its independent image-signature manifest.
The read-only CI gate must retrieve the complete current inventory and
authenticate the remaining evidence before attributing `MISSING_IMAGE_SIGNATURE`.
Results are absent at this phase. No successful authorization is fabricated.
The latest blocking point is before results issuance and protected deployment.

An expected-negative harness records the gate's exit and structured outcome;
normal delivery never converts that rejection into authorization. Registry,
transport, malformed evidence, wrong subjects and trust failures are integration
failures. Unexpected verification success is an unfavorable security observation.
Recovery restores the exact original artifact, preserves both errors and requires
fresh verification. L04 then shares L01 replacement's results, admission, rollout
and HTTP checks. One execution yields linked records, not independent observations
or campaign measurements. Admission caching remains disabled.

Hosted negative F07 remains NOT_EXECUTED. The GHCR probe remains inactive. Hosted
normal delivery retains exact workflow identity, issuer and native provenance
verification. Local key verification cannot establish hosted OIDC acceptance.

Implementation and execution observations will be recorded below. Human review
and final acceptance remain pending. GPT-6 assists this increment.

## Implementation

`attestations_issue_delivery` retains scheduled issuance. The existing
`attestations_verify_delivery` caller now issues, then invokes the shared read-only
`ci-verification-gate.mjs`. Results issuance invokes the gate again immediately
before signing, and verifies the authorized inventory afterwards. Each invocation
has a fresh output prefix; it never reads `image.bundle.json` or an old PASS file.
The gate authenticates each current bundle with Cosign, or native hosted provenance
with `gh attestation verify --bundle <retrieved-file>` and the existing exact
identity/source checks. Only complete retrieval plus authenticated non-targets
can yield missing-signature exit 42. Other failures exit nonzero as integration
failures. Registry inventory observations are bounded snapshots, not atomic locks;
the run assumes a single controlled publisher, and admission verifies again.

`scenario_f07_ci` runs only in local `L01-update`, using the same run-owned
repository and a distinct digest. Its explicit `ci-replacement` preparation checks
parent/child mode, registry, cluster, source identity and digest. Admission mode
continues to require the authorized profile. Four inventories and exact original
manifest bytes are retained under `L01-update/F07-CI/`; the helper deletes no blobs.
The EXIT/INT/TERM recovery restores the artifact and runs a fresh gate. Its result
remains intermediate until L04 succeeds. `L04-result.json` shares the rollout with
`L01-image-update.json`; `F07-CI-completed.json` links the recovered candidate to L04.
Later failure prevents the root PASS even if an intermediate file exists.

## Commands and evidence

From the Linux devcontainer repository root:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test
make -C implementacion demo
```

For a read-only recheck while an identified run's registry is still available,
use a new prefix each time, from `implementacion/`:

```bash
node scripts/ci-verification-gate.mjs evidence/raw/run-REPLACE/L01-update CI-manual authorized
```

Keep `CI-*.inventory.json`, `CI-*.result.json`, downloaded `CI-*.bundle.json`,
verifier outputs, validated statements, four `F07-CI` inventories, attempt/recovery
statuses, `L04-result.json`, rollout/HTTP files, applied policy/cache settings and
source identity. Packages include failed attempts and nested F07-CI evidence;
verify both the archive SHA-256 and every internal `SHA256SUMS.txt` entry.

GitHub uses the unchanged `prepare → native provenance → finish → cleanup`
workflow. After separate publication and execution authorization, on the exact
reviewed revision:

```bash
gh workflow run golden-path.yml --ref test/f07-ci-verification-l04
gh run list --workflow golden-path.yml --branch test/f07-ci-verification-l04
gh run download RUN_ID --name golden-path-RUN_ID-1 --dir evidence-hosted-RUN_ID
```

This dispatch is **not performed or authorized by this task**. Hosted normal CI
verification and L04 use the same gate; both negative F07 records stay
`NOT_EXECUTED`. Leave the GHCR probe patch unapplied. No package deletion privileges
or new identities are needed. Hosted acceptance requires an actual run and audit.

## Actual observations — 2026-09-28

Fresh **`run-I3PWZFUO` passed** in Linux Codespaces with real zot, Cosign 3.1.3
and Kyverno 1.19.1, using the modified working tree over PR #19. Docker reported
`29.8.0-1`, cgroup v2; pinned tool versions were unchanged.

| Evidence | Observation |
|---|---|
| Base revision | `3fe4f9e9d595c5f3f34be3021b3c2bc9bd433fbb` |
| Source snapshot | `c3b10ce8df43a8b69037b4567a9d0eb0d42080b48ddcfe2f53b6a14232b318e9` |
| Initial digest | `sha256:489a9728a763767e8267f7774ab6583e08693c53f12d5074082241fee09e91f9` |
| Replacement / L04 digest | `sha256:cb7b07483916b6723044e26306dd6ab8df41e7fc77aa563bfc03f092a9646c89` |
| Early F07 | Exit 42, `MISSING_IMAGE_SIGNATURE`; current SBOM/provenance authenticated, results not yet issued |
| Replacement inventories | 3 artifacts before, 2 negative/after denial, exact original 3 restored |
| Recovery | Primary 0, restoration 0, restoration attempted; fresh gate VERIFIED |
| L04 | Authorized inventory verified, admission/rollout and HTTP passed on the new digest; shared with L01 replacement |
| Preserved checks | F13 rejection, initial directed F07 singleton `tfm-signature` / `autogen-require-image-signature`, exact restoration and same-digest L01, F11 rejection |
| Package | `evidence/packages/run-I3PWZFUO.tar.gz`; 278 internal file hashes verified |
| Archive SHA-256 | `270084205d76aec9f6760ae5b66817335d6d6e1544aa9972bc0083fd37ab4c65` |

The package includes `production-source-sha256.txt`; every listed implementation,
scenario and policy file matches the final working tree. The run's aggregate
snapshot also includes regression sources. The package audit independently
reverified all 25 retained gate bundles with the public development key (these
include repeated observations), checked exact restoration for both F07 phases,
and checked the linked final results. `F07/controller.json` confirms effective
`--imageVerifyCacheEnabled=false`. The package contains no private signing key.

Raw evidence: `evidence/raw/run-I3PWZFUO/`. Development logs, audits and source
hashes: `evidence/raw/f07-ci-l04-development/`. Both paths are ignored by Git.
The live command used temporary forwarding rules limited to the kind bridge
because stale legacy iptables rules blocked the Docker bridge. The wrapper
removed both rules on exit; a subsequent rule inspection confirmed removal.
This environment workaround is not a repository change.

### Failed observation retained

`run-TC8SeiUE` stopped at the original, overly restrictive replacement-repository
guard. The existing replacement uses another digest in the same owned repository;
the initial guard incorrectly expected a separate repository. No early CI mutation
occurred (`originalStatus: 1`, `restorationStatus: 0`, `restorationAttempted: false`).
The initial F13, directed F07, L01 and F11 checks had completed. The run has no
root PASS and does not establish early CI detection or L04 acceptance.

Its source snapshot was
`80c116b1fb1fce1e84e794c8e9148ef152da2a13a76f47ef67a33fc01d59e565`.
The failed archive `evidence/packages/run-TC8SeiUE.tar.gz` and all 174 internal hashes
were audited; SHA-256
`edd9d0564aee5d84267750036cd4c13c2c09d5485c3d6940497210d63c2f95ac`.
The guard was corrected to preserve the existing repository design, with distinct
digest and explicit parent/child checks, before the successful fresh run.
An attempted process stop arrived after this run had already exited; it did not
interrupt the experiment or produce a separate interruption observation.

### Checks actually performed

- 99 focused gate, mutation, recovery, replacement and real-coordinator tests
  passed; the corrected target subset then passed all 29 tests.
- Final `make -C implementacion test` passed outside the execution sandbox:
  6 environment tests, 401 service/unit tests, 15 Python tests, 52 Conftest
  decisions, 18 + 14 Kyverno cases and real offline Cosign checks.
- Fresh local integration and both archive audits above passed their stated checks.
- Bash/Node syntax checks, `git diff --check`, affected relative documentation
  links and final production-source hashes passed.

Initial development tests exposed outdated stage stubs and a test ordering
assumption; their logs remain in the development directory. No retrospective
TDD history is claimed. This increment has no hosted execution: hosted normal
gate/L04 acceptance needs an authorized run and package audit, and hosted
negative F07 remains NOT_EXECUTED. The twenty-scenario catalogue and campaign
measurements are unchanged.

AI assistance: GPT-6 implemented the gate, scenario/recovery integration,
regressions, local verification and EN/ES documentation. Human review and final
acceptance remain pending.

## F08 extension

The [F08 record](../F08/record.md) adds controlled signature-value alteration to
this same replacement execution, with separate pre-results CI and authorized
admission observations. Recovery requires exact restoration and fresh verification
before continuation. L04 remains one shared counterpart; its hosted acceptance
item stays pending until an authorized successful run and evidence audit exist.
