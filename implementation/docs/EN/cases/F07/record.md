# F07 image-signature checks

Current early CI behavior and L04 acceptance are tracked in the
[CI/L04 operational record](../L04/record.md). The directed admission observations
below retain their original scope. Hosted negative F07 remains NOT_EXECUTED.

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

## Hosted compatibility investigation — 2026-09-28

Branch `test/f07-hosted-admission-compatibility`, working tree based on
`5375ae5dbbdbf8109c93824b595c6a49d854cd93`. The one-session investigation stops at
**unproven compatibility**. Hosted F07 remains **NOT_EXECUTED**. Official GHCR
package/version documentation does not establish precise OCI manifest DELETE and
exact restoration with the existing workflow token; OCI deletion is optional.
This is not an observed GHCR denial or a claim that every possible design is
unsupported. See [sources, probe design and commands](hosted-compatibility.md).

Prepared a standalone, inactive protocol helper, shell wrapper and unapplied
workflow patch. The probe requires a fresh workflow-bound receipt, exact image
and run label, normal successful hosted delivery, authenticated bundles and native
provenance tied to the current run/attempt. It retains backups and inventories,
checks image bytes/shared blobs, refuses fallback-index mutation and attempts exact
restoration on failures/interruption. It calls no package REST deletion API and
adds no workflow permission. Even protocol completion leaves hosted F07 unexecuted;
it cannot substitute for a later denial plus restored same-digest L01 control.
The local guard, coordinator, policies, trust and normal results issuance are unchanged.

No fixture publication, GHCR capability request, mutation, dispatch, push or release
was performed. No new hosted evidence package exists. Synthetic regressions are
labelled and retained separately from the earlier local integration observations.
The next bounded task is **`test/f07-ci-verification-l04`**; academic F07's CI barrier
and L04 remain pending. A future protocol trial needs separate publication and
execution authorization, one fresh fixture and an audited package.

Development checks and source hashes are retained under the ignored directory
`evidence/raw/f07-hosted-investigation-20260928/`. The final full suite passed: 6 environment tests, 360 service/unit tests (including
22 probe/wrapper regressions), 15 Python tests, 52 Conftest decisions, 18 + 14
Kyverno cases and real local Cosign cryptographic checks. Bash syntax, relative
documentation links and the unapplied workflow patch check passed. Earlier
sandbox runs failed on existing subprocess restrictions (`spawnSync EPERM`);
the approved run outside the sandbox passed. Logs preserve both outcomes. The probe's HTTP/recovery tests are local
simulations; they do not authenticate hosted evidence or prove GHCR support.

AI assistance: Codex (GPT-6) investigated official documentation, prepared the
probe and regressions, ran local checks and synchronized current EN/ES summaries.
Human review, hosted execution authorization and final acceptance remain pending.

## Local coordinator increment — 2026-09-28

Implemented on `test/f07-local-admission-integration`, working tree based on
`dae6656ca93e2238211ebdb6617069786b7ba2ef`. Local coordination now runs:

```text
F13 → normal results authorization → F07 backup/removal/rejection/restoration
→ L01 same-digest admission and HTTP probes → F07 completion → F11 → L01 replacement
```

`f07.sh` loads after the shared classifier in `f13.sh`. The coordinator calls the
scenario directly, preserving Bash error propagation and its shared cleanup owner.
The existing run-owned zot mutation, authentication and recovery logic is reused.
`F07/result.json` remains an intermediate observation with `sameDigestL01: pending`.
After L01 succeeds, `scenario_f07_complete` checks successful recovery, the original
image reference, Deployment rollout and ready Pods' runtime image IDs through the
shared rollout validator. It writes `F07-completed.json`; later F11/replacement
failures still prevent final PASS. The replacement validator retains its distinct
digest requirement. Hosted coordination records F07 `NOT_EXECUTED`, with GHCR
compatibility pending, and never invokes local mutation.

### Actual local observations

Fresh **`run-xFGRe6X1` passed** with real zot, Cosign 3.1.3 and Kyverno 1.19.1.
No tool versions, admission policies, trust or results issuance were weakened.
The Linux host reported Docker `29.8.0-1`, cgroup v2. This is local integration,
not GitHub OIDC acceptance or campaign measurement.

| Evidence | Observed value |
|---|---|
| Original digest | `sha256:cd3ab8caa3278b46205653994431cd0bca64e2bb2c91d58326993352436ffff7` |
| Replacement digest | `sha256:d739c340e7873fb981565afcaa7401b0556e95a346f3033e44e1666eeaf9f9c5` |
| Source snapshot recorded by the run | `ff97115b53ca59736d6a5cb7fa9d2cd4f14dd59b7234357d028d49a89938987a` |
| F07 rejection | Singleton `tfm-signature` / `autogen-require-image-signature`; pinned bundle absence diagnostic |
| Recovery | `originalStatus: 0`, `restorationStatus: 0`, restoration attempted |
| Positive control | Same original digest admitted; health/version/quote checks passed; ready Pod digest checked |
| Remaining local sequence | F13/F11 attributable rejection and independently verified replacement passed |
| Archive | `evidence/packages/run-xFGRe6X1.tar.gz`, 144 hashed files verified |
| Archive SHA-256 | `f3a356f013f9aa429a961eea7fc5a9f7d75afd5892ca22c52aa6488be0ba3571` |

The run's `production-source-sha256.txt` identifies the unchanged production files
used by this execution; those hashes were checked against the final working tree.
The development evidence directory also retains `final-source-sha256.txt`,
including the unchanged scenario modules and the final regression sources.
Additional package regressions and documentation were completed during/after the
run, so its aggregate source snapshot is distinguished from the final test tree.

Retain the ignored raw directory `evidence/raw/run-xFGRe6X1/`: four F07 inventories
(`before`, `negative`, `after-denial`, `restored`), raw OCI bytes, four authenticated
bundle outputs/statements, effective controller arguments, raw denial, attribution,
recovery, original HTTP observations and `F07/L01-*.json`. Offline inventory audit
confirmed only the independent signature was absent and the original artifact was
restored exactly. Both archive checksum and every member checksum were verified;
private material and run state were excluded. Audit reports and development logs
are in `evidence/raw/f07-local-integration-20260928/`.

Earlier attempts are retained: initial launch stopped at missing `kind`, before a
run; the pinned binary was installed and its checksum verified. `run-wbknqgzL`
then failed building the image because outbound container DNS was blocked. Its
archive remains FAIL/F07 not executed, with all 12 member hashes verified.
Read-only diagnostics found an obsolete legacy `FORWARD DROP` chain conflicting
with Docker's nftables rules. With explicit approval, two temporary legacy rules
allowed traffic from the kind bridge and established return traffic for the retry.
The wrapper removed both rules after the run and exited zero. No host firewall
change is included in this repository increment.

### Checks and assistance

- New coordinator tests first failed for skipped F07 order/failure handling after
  sandbox `spawnSync EPERM` was resolved by approved execution outside the sandbox.
- Focused coordinator/F07 recovery/packaging/rollout run: 63 tests passed before
  the additional completion/package audit cases.
- Final `make -C implementacion test`, with existing pinned tools on PATH: passed;
  6 environment tests, 338 service/unit tests, 15 Python tests, 52 Conftest decisions,
  18 + 14 Kyverno cases and the real local Cosign bundle cryptography checks.
- Actual F07-function regressions preserve unexpected admission, trust/transport/
  inventory failures, primary plus restoration errors and catchable interruption.
  Their archives retain failed observations and verified checksums. Coordinator
  tests use the real entry point with synthetic stages and real report/packaging
  serialization; they establish ordering/failure propagation, not live admission.

Academic F07's early CI barrier and L04 remain pending. GHCR compatibility and
hosted F07 are not executed or covered. No extra catalogue scenario, campaign
measurement, hosted dispatch, merge or release is claimed.

AI contribution: GitHub Copilot (GPT-6) assisted implementation for this PR,
as reported by the contributor. Codex (GPT-6) also implemented coordinator/completion
changes, proposed regressions, ran validation and drafted documentation in this
session using the supplied oracle.
Human review, human acceptance and final decision: **pending**.

## PR #17 baseline and gates (historical)

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
