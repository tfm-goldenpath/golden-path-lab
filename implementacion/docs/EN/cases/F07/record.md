# F07 directed image-signature admission check

Prepared before implementation on base `0c0b928ace01145408f826acabd20f288a5684ad`.

| Field | Fixed expectation |
|---|---|
| Identification | F07, missing independent image signature; directed admission extension. |
| Documentary source | Supplied `implementacion/evidence/raw/A_evaluacion.md`, F07 lines 319–337 and L04 lines 583–601; exact file SHA-256 `efa0b0f2024ed2800217de3099d86dd137acb4dcd91861bc72ad02235a774e45`. This content hash identifies the supplied documentary revision; its thesis Git commit was not supplied. |
| Property | Valid SBOM, provenance and results cannot replace `https://sigstore.dev/cosign/sign/v1`. |
| Starting input | Current run's digest with legitimately issued and verified image signature, SBOM, provenance and successful results. Existing trust and tool versions; image verification cache disabled. |
| Actor | Laboratory operator can remove/restore one OCI signature referrer in the run-owned local registry. The workload actor remains the restricted namespace deployer and cannot alter admission policies. No broader hosted deletion privilege is authorized. |
| Injection | After F13 denial and normal results authorization, back up exact OCI manifest/config/layer bytes, identify a unique predicate/subject match, then remove only that signature manifest. Preserve the image and shared blobs. |
| Expected barrier | Before Deployment creation: singleton `tfm-signature` / `require-image-signature` or `autogen-require-image-signature`, with the pinned bundle-verification absence diagnostic. Other policies must pass. |
| Error oracle | Registry, certificate, transport, malformed evidence, changing inventory, additional policy failures or recovery failures are integration failures. Unexpected admission is an unfavorable security result. A generic nonzero status is insufficient. |
| Recovery and positive check | Install recovery before mutation; restore the original artifact, then existing L01 must admit the identical image reference/digest and pass HTTP probes, followed by F11 and L01 replacement. Preserve both primary and restoration failures. |
| Evidence | Complete strict inventories before mutation, immediately before request, after denial and after restoration; hash-bound raw OCI backup; authenticated non-target bundles and verifier outputs; raw denial, attributed rule, run/source identity and recovery status. Inventories establish structure/presence, not authenticity. |
| Coverage | Directed functional integration only. Academic F07 also requires CI verification before promotion and names L04 as legitimate counterpart. A repaired L01 fixture does not complete F07 or L04 or add campaign measurements. |
| Initial observation | Not executed. Local mutation proof precedes orchestration wiring. Hosted GHCR compatibility pending within existing authorization; no publication/dispatch authorized. |

Human review: pending. Implementation assistance: GitHub Copilot and Codex (GPT-6), requirements from the user; individual edits are not attributed where that detail was not recorded. Final decision pending human review.

## Implementation status and gates

The branch contains an unwired local scenario, a strict predicate/manifest mapping,
raw OCI backup, a digest-checked single-manifest DELETE/PUT helper and F07 evidence
packaging. `demo.sh` and the hosted workflow remain unchanged. The local registry
protocol proof subsequently passed outside the sandbox in `run-IOwYIXos`;
coordinator wiring and actual admission are still pending.
Tool versions, trust configuration, authorization checks and policies are unchanged.

The helper deletes only the chosen manifest, never image manifests or blobs. It
restores the original manifest bytes after checking that its original config and
bundle blobs remain intact. Missing blobs cause an explicit restoration failure;
the backup retains all three original byte streams. Recovery is installed before
DELETE and also runs when its response is lost. The scenario subshell owns only
signature recovery; the coordinator continues to own shared infrastructure cleanup.
Catchable INT/TERM signals trigger recovery; SIGKILL or host loss cannot run a trap.
Retain the backup for manual diagnosis/recovery if restoration fails.

Snapshots bracket the admission request but are not an atomic view of Kyverno's
registry reads. The controlled run must have no concurrent publisher for its image.
The scenario authenticates each retrieved bundle using the normal local trust and
content validators before alteration, then requires unchanged non-target bytes.
Normal successful results issuance is never bypassed or changed.

### Local gate

From the repository root, run:

```bash
bash implementacion/tests/integration/f07-registry.sh
```

This starts only the pinned zot registry and uses explicitly synthetic OCI unit
fixtures to test the registry protocol. The empty predicates and synthetic
signature bytes cannot authorize a delivery. The proof checks unchanged image
bytes, exact removal of one referrer and exact restoration. It retains original
OCI material and observations in its printed `evidence/raw/run-*` directory.
It does not establish cryptographic verification or Kubernetes admission.

Attempt on 2026-09-28: **blocked before creating a run** because access to
`unix:///var/run/docker.sock` was denied. Earlier in the session Docker info was
available; the environment's permission profile subsequently changed. No local
registry compatibility or admission result is claimed.

After an observed successful protocol proof, load `f07.sh` after `f13.sh` and call
`scenario_f07_admission` directly after `attestations_authorize_results`, before
`scenario_l01_accept`. Do not invoke the entire stage under `if`, `!` or `||`.
The complete required order remains:

```text
F13 → normal results authorization → F07 backup/removal/rejection/restoration
→ L01 same-digest acceptance and HTTP probes → F11 → L01 image replacement
```

Add coordinator tests for that order and failures, and include the F07 result in
the final structured result only after same-digest L01 and the existing regressions
pass. `F07/result.json` currently records only directed rejection plus restoration
and explicitly leaves the same-digest positive check pending. It is not overall PASS.
Real admission on the exact reviewed source revision remains mandatory. The local
protocol gate is now satisfied by `run-IOwYIXos`; this does not establish admission.

### Hosted gate

Hosted F07 stops before mutation. No GHCR mutation or workflow dispatch was attempted
or authorized. The existing workflow publishes into a shared repository and no
safe, reversible single-referrer mutation has been demonstrated with its current
authorization. [GitHub's Container registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-in-a-github-actions-workflow)
describes package deletion/restoration through its REST API with package-admin
permission; it does not establish compatibility of this precise OCI operation.
This is an unproven compatibility gate, not an observed GHCR denial. No package
API deletion, bulk cleanup, new permission, administrator PAT or replacement
signature is implemented. Hosted F07 remains pending.

## Development verification and handoff

Tested source: uncommitted working tree on
`0c0b928ace01145408f826acabd20f288a5684ad`, branch
`test/f07-image-signature-admission`; no reviewed implementation revision or
integration run ID exists yet. Development logs and a hash manifest are retained
under `implementacion/evidence/raw/f07-development-20260928/` (ignored by Git).

- Direct Node runs: 12 F07 evidence/mutation tests, 17 actual scenario-function
  tests, 2 F07 packaging tests, 24 existing inventory tests, 4 bundle-profile
  tests, 9 inventory-consistency tests and 16 missing-results tests passed. External
  responses are labelled synthetic; these do not establish live admission.
- `make -C implementacion test` was attempted and failed in `test-unit` under the
  restricted environment. Existing subprocess tests encounter `spawnSync EPERM`;
  HTTP tests cannot bind their test server. There is no full-suite pass.
- `make -C implementacion test-policies`: 15 Python tests passed; stopped because
  Conftest is unavailable. Remaining policy checks are outstanding.
- `make -C implementacion test-bundles`: stopped at missing Cosign; real
  cryptographic checks remain outstanding.
- Registry proof, local admission and hosted admission: not executed successfully.
- Coordinator load/order/final-result changes and hosted workflow wiring: pending
  the registry gate, not represented as implemented orchestration coverage.

No retrospective test-first history is claimed. Human review and final decision
remain pending; Codex (GPT-6) assisted implementation, regressions and documentation.

### Permission diagnosis

The Docker socket is mode `0660`, owned by `nobody:nogroup`; the agent process is
in `nogroup` and its filesystem access check succeeds. An actual Unix socket
connection returns `EPERM`, and IPv4 socket creation also returns `EPERM`.
`/proc/self/status` reports `NoNewPrivs: 1`, `Seccomp: 2` and one seccomp filter.
These observations point to the restricted execution sandbox rather than socket
ownership. Docker reported version `29.8.0-1` before the session permissions changed.

A minimal Node subprocess exits successfully with inherited stdio or ignored
stdio; with captured pipes it also exits but reports `spawnSync EPERM`. The new
scenario and packaging tests use file-backed subprocess output and pass. The
existing tests were not rewritten to hide environment failures. Ordinary pipes
and Unix socket pairs work; the precise failing syscall in Node's capture path
is unresolved because `strace` itself is blocked by the ptrace restriction.
Check `docker info` from an ordinary Codespaces terminal to distinguish host
availability from this agent's sandbox. Changing Unix socket modes is not indicated.

## Retry outside the sandbox (2026-09-28)

After explicit approval, Docker was reachable outside the sandbox at version
`29.8.0-1`. The unchanged local registry protocol probe passed in `run-IOwYIXos`:
original failure and restoration failure are both null, the image remained intact,
and the original signature manifest was restored exactly. Evidence is under
`implementacion/evidence/raw/run-IOwYIXos/`: `protocol.log`, `outcome.json`,
`before.json`, `negative.json`, `restored.json`, `alteration-check.json` and
`restoration-check.json`. This remains a synthetic protocol fixture against real
zot, not successful delivery authorization or admission.

- Image digest: `sha256:09ade42fe3e69018a3360bb092265af902f9e7d6013146cf152c82ac3a944707`.
- Signature manifest: `sha256:30a6d53949d6d31493d03a62f7285b6907c2d1ab05d38905bc357da70c85b88e`.
- Source: same uncommitted working tree on `0c0b928ace01145408f826acabd20f288a5684ad`;
  preserved file hashes in `f07-development-20260928/source-files-registry-proof.sha256`.
- The first unrestricted `make test` passed 6 environment tests, all 321
  service/unit tests and 15 Python policy tests, then stopped at missing Conftest.
  This confirms the earlier subprocess/HTTP failures were environment-related.
- The repository installer then installed the unchanged, checksum-verified pins
  into ignored `implementacion/.tools/bin` for the remaining checks.

The subsequent full suite completed successfully (exit 0) with
`implementacion/.tools/bin` prepended to PATH:

```bash
make -C implementacion test
```

All environment, service/unit, Python/Conftest/Kyverno policy and real local
Cosign cryptographic checks passed. The complete log is retained at
`implementacion/evidence/raw/f07-development-20260928/full-suite-unsandboxed.log`.
No application, policy or test oracle changes were needed for this retry.

Earlier failed attempts remain historical observations. Human review is still
pending. No hosted mutation, publication or workflow dispatch was performed.

## PR #17 review corrections

GitHub Copilot's automated review identified two defects on `2d490bc`:
[repository targeting](https://github.com/tfm-goldenpath/golden-path-lab/pull/17#discussion_r4119158057)
and [recorded rule attribution](https://github.com/tfm-goldenpath/golden-path-lab/pull/17#discussion_r4119158095).
Codex reproduced both with focused regressions before implementing the fixes.
Direct removal and restoration now require the complete repository path to equal
`quotes-node-<run-id>`, so a nested path cannot pass by sharing that suffix.
`F07/result.json` retains the actual attributed rule, matching `attribution.json`
for both `require-image-signature` and `autogen-require-image-signature`.

Verification on the modified working tree over `2d490bc`:

- The new target regressions initially failed because the helper reached the
  registry instead of rejecting the target; the generated-rule assertion initially
  failed because the result recorded the base rule. Both now pass.
- All 14 F07 evidence tests and 17 scenario tests passed, followed by the complete
  `make -C implementacion test` suite outside the sandbox with the pinned tools.
- A fresh pinned-zot protocol proof passed in `run-2DUw70qG`, retaining exact
  removal/restoration evidence under `implementacion/evidence/raw/run-2DUw70qG/`.
- Regression logs and `review-fixes-full-suite.log` are retained under
  `implementacion/evidence/raw/f07-development-20260928/`.

These corrections do not add coordinator wiring, local Kubernetes admission or
hosted acceptance. The review above is automated; human review remains pending.
