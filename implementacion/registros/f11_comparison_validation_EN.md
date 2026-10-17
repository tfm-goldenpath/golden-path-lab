# F11 comparison: local implementation and validation — 17 October 2026

Status: **bounded local comparison CONFIRMED; baseline review/acceptance confirmed
by the user; subsequent usability changes pending review**.
The successful later session and its exact source are recorded below; the original
failed and interrupted attempts retain their outcomes.
Human review and final decision are pending. This record is not a campaign sample,
human calibration or evidence of a full F11/L06 catalogue execution.

## First handoff: source and preserved work

`git fetch origin` succeeded. Remote `main` remained
`1ec4cb9e89fce412df90510b7f3b3f3ca03bb50f` and did not contain the defense demo.
The local branch `feat/demo-f11-comparison` was created from
`73b3a65302a352fc0e131e420da50a18dbb62be2` (`feat/defense-demo-visual`). At that first handoff, changes remained uncommitted. No push, merge, release,
workflow dispatch, GHCR/Pages publication or remote setting change had been performed.
The later Docker-alignment and PR request is recorded separately below.

The pre-existing modification to `.devcontainer/implementacion/devcontainer.json`
and untracked root `package.json` / `package-lock.json` were preserved. They are not
part of this contribution. The optional defense profile has its own configuration
and Features lock, with validated relative build paths and 4 CPU / 16 GB / 32 GB
minimums. No machine or daemon restart was performed.

The first actual preparation attempt is `f11-20261017t190351z`, with source content
hash `0d163b94c1b9b89af29a7b09a99504aed84b43896de2bd3e36c55436abedcb8e`, dirty
checkout at the commit above. Its original `source.json`, command output, resource
samples and events remain under:

- `implementacion/evidence/raw/defense-f11-20261017t190351z/`
- `implementacion/.tmp/defense-demo/f11-20261017t190351z/`
- Development/test evidence: `implementacion/evidence/raw/f11-comparison-development/`

Later browser/layout, cancellation and custody refinements were tested separately.
`handoff-source.json` in the development evidence records the final content hashes;
the first attempt is not relabelled as execution of those later changes. No second
live preparation was launched to chase a passing result while the same prerequisite
remained unsatisfied.

## Actual environment and blocker

The machine reports 4 CPUs, 16,770,494,464 bytes physical RAM (15.62 GiB), and a
32 GB workspace filesystem. Cgroups report `cpu.max=max 100000` and
`memory.max=max`; no hidden two-CPU quota was found. Docker reports the same four
CPUs and memory.

Initially `doctor` stopped because kind was absent. The repository's pinned installer
subsequently installed Trivy 0.74.0, Conftest 0.70.1, Cosign 3.1.3, Helm 4.3.0,
act 0.2.89, Kyverno 1.19.1, kind 0.33.0, kubectl 1.35.8 and Buildx 0.37.1 with
SHA-256 verification. Locked npm tooling was installed using `npm ci`. Node
24.21.0 and npm 11.19.0 were already correct.

The remaining mandatory mismatch is **Docker CLI/daemon 29.8.2-1 versus pinned
29.8.0**. `doctor` and the real preparation reject it. No pin, control, timeout or
trust requirement was relaxed. The browser inspection used development-only
Playwright 1.56.1/Chromium and required OS libraries; no dashboard dependency was
added. These installs and their logs are outside presentation. Installation wall
time was not instrumented, so no full environment-setup duration is claimed.

## Measured outcomes

| Observation | Actual result / duration |
| --- | --- |
| First `prepare --profile f11-comparison --serve --enable-actions` | ERROR at environment; preparation interval **0.733 s**. This is time to reject prerequisites, not successful preparation time. |
| Environment operation | Exit 2; **0.604 s**, including resource evidence closure. |
| `present --auto --budget-seconds 120` | Refused an unprepared session, exit 1; CLI wall time 0.149 s. **Live duration remains null / NOT_EXECUTED**. |
| First explicit export | Exit 0; 0.205 s; recorded failed attempt only. |
| Archive verification | Exit 0; 0.125 s; integrity, not fresh cryptographic reauthentication. |
| Cleanup plan | Empty: no laboratory initialized. |
| Cleanup and verified viewer stop | Exit 0; 0.137 s; prior ERROR retained. No Docker resource existed to delete. |
| Explicit post-cleanup export | Exit 0; 0.191 s; second immutable export, including closed state. |

No image, cluster, registry, builder, vulnerability snapshot, signing key or live
privilege request was created in this attempt. All four observations are
NOT_REACHED. F11/L06 remain partial in the profile's intended scope and wholly
unexecuted in this local attempt. There is no measured achievement of 90/160/180
seconds. The [Spanish narration](../docs/ES/f11-comparison.md#guion-orientativo-160-segundos)
is provisional until a valid real rehearsal.

The verified recorded fallback is
`implementacion/evidence/packages/defense-f11-20261017t190351z/export-0002/`.
It contains `recorded.html`, `evidence.tar.gz`, `manifest.json` and `SHA256SUMS.txt`.
It displays the failed prerequisite and unreached comparisons, never a successful
live demonstration. The static fallback ran real Conftest on a labelled synthetic
manifest and obtained exactly ESCALATION and PRIVILEGED; it establishes no admission,
image-trust, R-runtime or L06 result.

## Checks actually run

- `make -C implementacion doctor`: FAIL, missing kind initially; after pinned
  installation FAIL on Docker CLI version. Logs retained separately.
- `make -C implementacion test`: FAIL at `test-env`. The existing configuration
  test expects base minimums 2 CPU / 8 GB, while the pre-existing user edit declares
  4 CPU / 16 GB. That user change and the existing oracle were both preserved.
- The remaining Make targets were run **sequentially** to retain independent
  results: `test-unit` **948 PASS** (83.56 s), `test-policies` PASS (21.14 s),
  `test-bundles` PASS (3.97 s, real offline Cosign cryptography), `test-workflows`
  PASS (0.29 s) and `test-defense` PASS. This does not make the full target green.
- Final focused defense regressions: **51 PASS**. Fixtures exercise F11 preparation
  versus F13, no live build/scan/issuance, no replay, failed R expectations,
  incremental evidence, ENOSPC, inodes/device deduplication, cancellation, immutable
  owned cleanup, archive-independent low-space recovery, auth/origin/CSRF/duplicate
  launch, bounded downloads, symlinks, optional profile paths and snapshot drift.
- Actual Bash scenario functions exercised with explicitly synthetic Kubernetes
  responses: directed F11 skips early policy; unchanged state is checked; isolated
  L06 does not run F12/direct Pod or mark catalogue completion; R requires observed
  Pods/digest/privileges/HTTP and successful withdrawal. The initial cleanup test
  caught a lost `return` status inside EXIT handling; the retained failing run and
  corrected run are separate. These are unit tests, not admission observations.
- Real-browser review at **1366×768**: the first layout exceeded the viewport;
  its screenshot is preserved. The corrected four-card view and console entry fit.
  Attempt selection also filters technical receipts. A separate, visibly named
  synthetic display fixture covers completed-card colors/scope labels; it is not
  persisted as a defense execution.
- Recorded HTML opened offline: zero HTTP requests, execution controls hidden,
  original Docker diagnostic visible and console content retained across views.
- Bash/Python/JavaScript syntax and `git diff --check`: checked. EN/ES links and
  command entry points reviewed. No lint/format target was invented.

Remaining at the first handoff: correct pinned Docker environment and reconcile the user's base-profile
edit before running a fresh full suite/preparation; real R/Kyverno/L06 execution,
real cancellation/cleanup under Kubernetes and a successful timed rehearsal on
final reviewed source. Large real-database export/low-disk recovery is covered by
synthetic regressions here, not a real resource-exhaustion trial. Human review is
pending. Tests written during this work are not a claim of historical TDD.

## Storage, memory and retained resources

`findmnt` resolves `/var/lib/docker` to the same `/dev/loop4` filesystem as
`/workspaces`. `/tmp` is on a distinct `/dev/sda1` filesystem. Their capacities
were not added together or attributed to Docker without checking the mount.
Initially `/workspaces` had about 18 GB available; the final precise observation
has **16,315,809,792 bytes = 15.20 GiB available**, about **12.20 GiB above the
3 GiB reserve**, with **1,800,470 free inodes**. `/tmp` has 116,401,188,864 bytes
available. Docker remains empty: zero images, containers, volumes and build cache.

The short environment attempt recorded three boundary samples; its minimum free
space was 16,318,857,216 bytes and its minimum available RAM was 12,796,572 KiB
(12.20 GiB). The configured periodic frequency is 10 seconds, but this subsecond
failure never reached a periodic tick. These are sampled bounds, not exact peaks
or full-laboratory memory/storage requirements. Separate shared-test runs did not
record a continuous resource peak, and no such peak is claimed.

Final `du` observations: `.tools` 831 MB, `.tmp` 938 MB (including browser test
assets and session metadata), evidence about 1.9 MB and npm tooling 6.5 MB. Final
available RAM was about 12.29 GiB. These observations include environment/test
setup cost; no build/scan cache exists. Original failures, receipts, exports,
static-test files and session metadata were retained. No evidence was deleted,
and no global prune or cache eviction was used. Synthetic test directories are
owned disposable fixtures, not defense evidence.

## Assistance and review

| Activity | Assistance | Human review | Decision |
| --- | --- | --- | --- |
| Implementation, diagnostics, tests and EN/ES documentation | OpenAI Codex; deterministic tooling performs decisions | Pending | Local review only; live acceptance blocked |

The initial local PR draft was `implementacion/.tmp/f11-comparison-pr.md`.
Its original blockers are preserved above as historical observations.


## Docker alignment and new PR request

The user subsequently authorized fixing Docker, reconciling the base profile and
creating a new PR. The base Codespaces profile is restored to its tracked
2 CPU / 8 GB / 32 GB configuration. Defense-specific settings remain in
`.devcontainer/defense/`, with 4 CPU / 16 GB / 32 GB, identical Features pins/lock
and the same Dockerfile/context. The original edited configuration is retained
in ignored development evidence. Root `package.json` and `package-lock.json`
remain untouched and excluded from the contribution.

The running Codespace initially used Microsoft's Moby 29.8.2 packages. Docker was
empty before migration. Docker CE CLI and engine were installed from Docker's
signed Ubuntu repository at package version `5:29.8.0-1~ubuntu.24.04~noble`;
both report **29.8.0**. The installed packages are held locally against accidental
upgrades. Buildx **0.37.1** uses the previously checksum-verified laboratory binary.
No laboratory version or version-check oracle was relaxed.

The migration replaced conflicting Moby packages, including `moby-tini` after
its file-ownership conflict was observed, and retained the existing containerd
configuration. The Docker CE dependency installed containerd.io 2.4.2. Docker was
restarted using the environment's `/usr/local/share/docker-init.sh`; the Codespace
was not rebuilt or resized. This took place outside any presentation. Original
APT failures and recovery logs are retained. No image, volume, cache or evidence
was pruned. `make -C implementacion doctor` now passes.

Alignment evidence: `implementacion/evidence/raw/docker-alignment-20261017/`.
The new preparation session is `f11-20261017t193424z`; the earlier failed session
remains unchanged. Shared tests run inside preparation, before infrastructure.


The complete shared `make test` target passed in session `f11-20261017t193424z`
(122.128 s): 948 service/unit tests, policy checks, real offline Cosign checks,
workflow checks and 51 defense regressions. Browser rendering at 1366×768 also
passed; its separate synthetic display fixture is never a delivery observation.
During the subsequent contract preflight, the command channel returned exit 143
and both recorded controller/worker disappeared without a terminal receipt. The
cause is unknown. Preparation/live duration stays unknown; this is not PASS.
No Docker resources had been created.

A recovery check now requires the session lock and verifies that both process
identities are absent before marking the abandoned attempt ABORTED. It preserves
original partial logs, records unknown exit/duration explicitly and refuses to
recover a live owner. Two focused regressions were added: **53 defense tests pass**.
Cleanup and export of the interrupted session succeeded; original evidence remains
under `defense-f11-20261017t193424z`, with a verified archive in `export-0001`.
A fresh session, `f11-20261017t193938z`, was launched with a detached, logged
controller to separate its lifecycle from the command channel. It performs new
checks and has no inherited PASS from either previous attempt.


## Successful bounded comparison and closure

Session **`f11-20261017t193938z`**, laboratory `run-5TtRnUQw`, completed preparation
and a single continuous live comparison on the observed 4 CPU / 16 GB machine.
It used dirty HEAD `73b3a65302a352fc0e131e420da50a18dbb62be2`, with execution-source
content hash `2ba228e58602554d580552986a9db3350df64879d25e3fc9843637c508094dcf`.
Its original full source inventory, dirty state and operation receipts are retained
under `implementacion/evidence/raw/defense-f11-20261017t193938z/`; original laboratory
reports are under `implementacion/evidence/raw/run-5TtRnUQw/`.

Image: `172.18.0.3:5000/quotes-node-run-5ttrnuqw@sha256:3e5b88be7c00cbaac51ae178925d5df54d604dd9d1f2f8f782fced5019289d87`.
The build, real vulnerability snapshot/analysis, signature, SBOM, provenance,
results authorization, trust verification, five ready policies, restricted actor
and warm valid workload all completed before presentation.

| Interval or observation | Actual result | Seconds |
| --- | --- | ---: |
| Preparation, including shared checks | PREPARED | 423.017 |
| Shared `make test` within preparation | PASS; 948 service/unit tests and 53 defense regressions, plus all policy/crypto/workflow targets | 120.287 |
| Contract preflight | PASS; required delivery evidence producers | 102.934 |
| Final live readiness | PASS; fresh verification and HTTP | 4.682 |
| R privilege UPDATE | Ready Pods with both fields true, same digest, HTTP; workload withdrawn and absence observed | 6.103 |
| G early | Exactly ESCALATION and PRIVILEGED; no API submission in that request | 0.371 |
| G directed admission UPDATE | Exclusive tfm-runtime / autogen-restricted-containers rejection; UID, generation 1 and spec unchanged | 2.974 |
| Legitimate L06 template UPDATE | Accepted; same UID/image, generation 1 → 2, annotated ready Pods, rollout and HTTP | 4.621 |
| **Continuous live interval** | **CONFIRMED**, includes readiness, waits, evidence closure and R withdrawal | **19.006** |
| Export | Success, including the identified frozen database snapshot | 67.113 |
| Independent export verification | VERIFIED, 2,652 files; archive integrity | 7.348 |
| Cleanup inventory | Three recorded owned containers; evidence/private state excluded | 0.383 |
| General cleanup and viewer stop | Success, original comparison outcome retained | 1.912 |

The export is `implementacion/evidence/packages/defense-f11-20261017t193938z/export-0001/`.
It includes `recorded.html`, the lab archive, `evidence.tar.gz`, manifest and hashes.
It is an explicitly recorded fallback, not a new live execution. It was checked
offline: zero network requests, no execution controls, all four recorded
expectations visible. Its renderer predates the CSS color correction below; its
text and observations are intact. The first probe incorrectly expected the
Spanish word `confirmado` instead of the canonical value `confirmed`; that probe
failure and the corrected assertion are retained. General cleanup
occurred afterward: its additional receipts remain in the original evidence tree;
`cleanupExportPending=true` records that this post-cleanup state has not been
repackaged into a second large archive. No evidence was deleted.

F11 demonstrates Deployment UPDATE rejection; CREATE and direct Pod are not covered
by this presentation. L06 demonstrates the legitimate template UPDATE only. R ran
the synthetic service with the two risk settings, with no exploitation or host
access. R retains Kubernetes/RBAC. This is local lane A, not GitHub OIDC or lane B.
The measured automation meets the 90-second target in this single observation;
the complete human-narrated 160-second rehearsal remains pending and there is no
performance guarantee, independent catalogue sample or new economic/human claim.

A post-run browser inspection caught CSS specificity overriding the intended
red/green decision text. Only `demo/style.css` and its optional
`tests/defense_demo/browser-check.mjs` assertions changed after the live source
snapshot, in addition to documentation. Browser checks at 1366×768 pass after
that correction, including computed colors. Delivery/coordinator/policy code is
unchanged from the successful run. The handoff content hash is
`718fd1d8bad68dba749c505806c55e9fec67ce88e0040081f252160f553da68a`;
the execution is not relabelled as a new run of that rendering revision.

## Successful-session resource observations

There are 102 boundary/periodic samples, with configured periodic interval 10 s.
Minimum sampled workspace/Docker free space was **11.219 GiB**, a sampled reduction
of **3.672 GiB** from the first preparation sample. Minimum available memory was
**11.095 GiB** and minimum free inodes **1,767,275**. These describe sampled bounds,
not exact peaks; archive compression was separately timed and did not have the
same periodic sampler. No measured full installation duration is claimed.

After export and cleanup, workspace free space was **11.165 GiB**, about **8.165 GiB**
above the 3 GiB custody reserve. Docker reports zero containers, three retained
images (1.973 GB) and two retained volumes (1.801 GB). The snapshots/download cache
under `/tmp/golden-path-defense-f11-20261017t193938z` occupy 3.1 GB on the separate
`/tmp` filesystem. Own folders: tools 831 MB, `.tmp` 941 MB, evidence 170 MB.
Images, volumes, snapshots, keys/kubeconfigs, receipts and earlier observations were
retained. Only the three identity-checked owned containers were retired. The final
measurement JSON and cleanup inventory/receipts are in the alignment evidence folder.

## User review and usability follow-up

On 17 October 2026, Xylons explicitly confirmed in the conversation that the PR
was reviewed and accepted. This records human acceptance of the bounded delivery
at `e675325`; it does not infer a timed spoken rehearsal, full F11/L06 catalogue
coverage or a new campaign sample. The subsequent viewer/port changes requested
in the same message are a follow-up for review, not retroactively accepted work.
Historical session metadata and earlier pending-review observations are preserved.

The supplied screenshot and local session `rehearsal-01` establish execution of
profile **defense**, not `f11-comparison`. Local receipts report 338.281 s preparation
and 23.105 s automation, with F11 early, F13, authorization, valid acceptance and
F11 admission completed. Those intervals do not include measured human speech.
The attempted `defense-01` is PENDING/unprepared: its viewer could not bind to
8765, already owned by the completed rehearsal's viewer. No receipt was converted
into a successful preparation and no old session was overwritten.

The follow-up adds `stop-server --session NAME`, using the existing PID/start/boot
and command identity validation. It leaves the laboratory and evidence intact.
`up` and `prepare --serve` now check port availability before creating a session;
recognized owners produce exact reopen/stop commands, and unknown listeners are
never killed. A real conflict with the existing 8765 viewer was rejected without
creating a new session. An independently opened test viewer on 8766 was stopped
through the new command, and rebinding verified that the port was released. The
user's 8765 viewer and workload resources were left running.

Technical detail now filters operations by profile and selected attempt, highlights
scenario titles and presents separate outcome/expectation labels. Red means blocked,
green allowed/checked, amber risk/error/not reached, and gray unexecuted. A not-reached
operation explicitly states that its control was not observed. Dependency and file
information is collapsed; stages use two columns when space permits. The historical
`defense` profile no longer shows unrelated comparison/L06 operations as failures.
Older offline exports retain a compatible profile filter when rendered by the new UI.

Validation: **56 defense regressions PASS**, real-browser checks at 1366×768 for both
profiles, computed title/color assertions, and labelled browser-only fixtures for
an upstream failure versus an unexecuted step. The first browser assertion tried
to read a collapsed row; the corrected check opens its containing stage. Both logs
are preserved under `implementacion/evidence/raw/pr49-usability/`. These checks
exercise rendering and viewer lifecycle, not a new Kubernetes scenario. No new
cluster, build, scan or delivery was launched for this follow-up.
