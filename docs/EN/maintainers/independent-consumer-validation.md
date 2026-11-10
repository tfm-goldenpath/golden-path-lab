# Independent consumer validation — 5 November 2026

Latest: [PR #77 review fixes — 8 November](#pr-77-review-fixes--8-november-2026).
The dated observations below remain historical; the review-fix receipt supersedes
the supported runtime attribution.

Baseline: fetched `origin/main` **`f64dcc0fb283b7fd2c904858b716150484704b5d`**,
PR #75 merged. Branch: `feat/independent-consumer-template`. The two unrelated
root npm files, historical evidence/private recovery and three existing Docker
volumes remain untouched. No remote consumer repository was created. No hosted
delivery/signing workflow, public image publication, Pages deployment, release or
merge was performed. Human review remains pending.

## Contract and source attribution

The [quickstart](../consumer-quickstart.md) defines the fixed Node HTTP profile.
`templates/node-http/` contains only service-owner files. `src/consumer.mjs`
validates versioned configuration, exact engine checkout, committed files/modes,
separate repositories and the fixed Docker COPY/ignore boundary. Consumer tests
and workflows never fall back to engine files. Existing delivery modules own the
single pipeline and lifecycle. Compatibility aliases and laboratory authorization
retain their semantics.

Both signed provenance and results contain engine repository/commit, engine-input
hash, consumer-input hash, configuration hash and the explicit consumer
profile/producer. Fresh bundle verification and consumer-specific Kyverno
conditions compare these to execution configuration. The old producer allowlist
is unchanged outside that explicit profile. Local admission passed with all four
evidence types and the additional conditions. The pending admission-selection
and CEL decision is unchanged; existing deprecation warnings were retained.

The final runtime candidate is **`4d743fa1ebf66c194734fce41c97b3d7abbbe836`**.
Its independent consumer commit is **`a13a3c9c2dd32ef59e37eb2f8519959f1a9acee3`**.
The consumer has no origin; `https://example.invalid/golden-path-consumer-validation`
is an explicitly declared **local test identity**, not a source-host claim.
Neither GitHub authentication nor hosted OIDC occurred. Engine origin is the
expected HTTPS repository; exact committed input bytes and executable modes were
checked. This is local checkout verification, not an independent remote signature.

The first candidate **`714af3389efa0c7ea475cd65b68733f2b553419d`** also passed real
consumer delivery with consumer **`a122238bb1f63eee9593b3810cc2a7f102865629`**.
A later regression found that generated Python caches could block initialization
from a normal engine checkout. `4d743fa` excludes engine-generated caches while
still capturing everything Docker can copy from consumer `src/`. The independent
integration was repeated on that new committed candidate; the first run is not
relabelled. Subsequent changes refine tests, inventory and documentation only.

## Commands and real observations

Original exports and separate consumer repositories remain under
`/tmp/gp-independent-consumer-20261105-7l9k4yhz/attempt-01/` and `attempt-02/`.
The integration helper exports a genuine committed engine checkout with no
laboratory execution modules, initializes a separate Git consumer with its own
commit history and exact engine pin, runs `check` from the consumer root and
`local --consumer` from `/tmp`. It then checks finalization, both authenticated
bindings, archive checksums and retirement.

From the repository root, after inspecting capacity, tools and existing resources:

```bash
export PATH="$PWD/implementation/.tools/bin:$PATH"
export GP_VULNERABILITY_DB="$PWD/implementacion/.tmp/security-refresh-db"
export GP_VULNERABILITY_SNAPSHOT_ROOT=/tmp/gp-independent-consumer-20261105-7l9k4yhz/snapshots
export TRIVY_CACHE_DIR="$GP_VULNERABILITY_SNAPSHOT_ROOT/cache"
# Each output must be fresh; these exact destinations are already retained.
python3 implementation/tests/integration/independent-consumer.py \
  --output /tmp/gp-independent-consumer-20261105-7l9k4yhz/attempt-02 --run
make -C implementation reference
bash /tmp/gp-independent-consumer-20261105-7l9k4yhz/attempt-02/engine/bin/deliver local
```

| Check | Revision and result |
| --- | --- |
| First independent consumer, `delivery-B2mOuzhN` | `714af33` / `a122238`: PASS, all 21 stages, finalization, archive and retirement. |
| Final independent consumer, `delivery-NzUoy7bn` | `4d743fa` / `a13a3c9`: PASS, real service tests and consumer workflow policy, build, scan, signature, SBOM, provenance, results, admission, rollout, ready-Pod digest and HTTP observations. |
| Existing laboratory reference command, `run-aJriPlBm` | `4d743fa`: PASS, laboratory preflight, source capture, build, R deployment and HTTP response. Its recorded source snapshot exactly matches committed candidate inputs. A later test-only refinement did not alter runtime; `reference-source-continuity.json` records the comparison. |
| Existing fixed local profile, `delivery-J1gwAjYh` | `4d743fa`: PASS, all 21 stages, legacy `implementacion/scripts/deliver.sh` producer, seven checks, four evidence types, live admission and HTTP. Used the same verified sparse engine checkout. |
| Original consumer bundles under changed expected authorization | 12 real Cosign authentications followed by expected rejection for wrong consumer repository/commit or engine/configuration/consumer snapshot. No predicates modified or re-signed; `actual-negatives/receipt.json`. |
| Repeated consumer and fixed cleanup from `/tmp` | PASS; all 171/167 raw files respectively and both archive hashes unchanged. Foreign-resource refusal and packaging/finalization failure classification remain covered by the shared regressions. |

The reference-only laboratory command was chosen because the owner excluded the
demo. Its result establishes R adapter compatibility, not protected laboratory
scenario acceptance. The fixed local integration separately covers the legacy
protected profile. No complete demo, twenty-scenario catalogue, campaign or manual
task ran. Directed scenario execution and optional L05 remain **NOT_EXECUTED**.
Negative consumer binding checks used real offline cryptography; admission was
exercised positively in both consumer runs, with renderer contract regressions
for every required binding. No separate negative admission trial is claimed.

Final consumer image:
`sha256:300ac6a5a421ede64c95d7623cf50c94d7755ffa5de998d05ea6796c69a73dfe`.
The actual `/version` reports `independent-node` and consumer commit `a13a3c9…`;
`/` returns the generated starter greeting. This is a new service repository,
not a sparse copy of the laboratory. The engine capture contains 55 inputs:

| Authenticated field | SHA-256 |
| --- | --- |
| Engine snapshot | `adae164bd4d52c87bb7359c071fc590eb35e33c842458b16e1d74130acc68478` |
| Consumer snapshot | `3762f9f953ce127a422e9dfd3928d7485152b8d5d4338d5fad1d58a1e69e9d83` |
| Consumer configuration | `48603949dd6efe3cf4a71f1a45ed419d093f0949b3c96a7442c03ff97ae44820` |

## Checks, tools and retained evidence

Development and final outputs are under
`implementation/evidence/raw/independent-consumer-template/`. `consumer-01/`,
`consumer-02/` and `fixed-01/` retain raw evidence and copies of verified packages.
Reference originals remain in `implementation/evidence/raw/run-aJriPlBm/` and
`implementation/evidence/packages/`. Each exported engine retains its originals.

| Archive | Verified outer SHA-256 | Internal hashes |
| --- | --- | ---: |
| `delivery-B2mOuzhN.tar.gz` | `baeb8fe4649079b4a4af5bb9bee98a41a30ac64d7a116a8ed22c24d6d1b95295` | 164 |
| `delivery-NzUoy7bn.tar.gz` | `a6e1729af74d1b4fe5b41db5e376eadfcfb68547f91b3596028a988ad55a15fe` | 164 |
| `run-aJriPlBm.tar.gz` | `1f122d45989f50194e9045183a181cccf9d44808226f48893a6afbd15e4d87de` | 25 |
| `delivery-J1gwAjYh.tar.gz` | `893c04760930abad239956641d56df4739b693004f4b2e95c74bc2f36ed9bdc7` | 160 |

The existing `src/verify_package.py` verified outer and all internal checksums.
Archives exclude `state.json`, Docker credentials, kubeconfig and private keys.
Private recovery copies remain under
`implementation/.tmp/independent-consumer-template/`; the reference observer
copied recovery files before the existing laboratory cleanup removed its original
private directory. These are local retained copies, not external custody claims.

Pinned tools reused: Node 24.22.1, npm 11.19.1, Docker 29.9.2, Buildx 0.38.1,
kind 0.33.0, Kubernetes 1.35.8, Trivy 0.76.1, Conftest 0.71.1, Cosign 3.1.4,
Helm 4.3.1 and Kyverno 1.19.2/chart 3.9.2. Sparse checkouts install only the existing
locked schema dependencies. `tools.lock.json` SHA-256:
`68c6f710e2038095038cc577050fe0e22bdf6c5f0749c96b196a050e260731fa`;
`versions.env`: `d08d37ed2168d6643a56af7c28248a938b85d033fdce64b417b820d9749531f9`.

Scans use preserved real Trivy DB bytes, updated 28 October 2026, with a fresh
immutable copy per delivery under the retained `/tmp/.../snapshots/` directory.
DB hash: `faa015429c6ebd9c9a672be99cfbd5aecec2eade21d1d6e59d4dc091dc752ff3`;
metadata hash: `75ccefb55d36ea911801b1cdb555f4d022f0fc8a813e061b0d491fe9752dc706`.
The original is still in `implementacion/.tmp/security-refresh-db/`. PASS applies
to these DB bytes; no current vulnerability freshness claim is made. Records
retain metadata, scanner versions, original SBOM/report and their association.

Initial capacity: workspace/Docker 8.5 GiB free, separate `/tmp` 110 GiB free,
approximately 12 GiB available RAM. Integrations ran sequentially with one owned
cluster/registry/builder set at a time and unchanged reserve/growth checks.
Capacity/memory/container/volume/builder logs precede installation and each run;
product checkpoints cover build/analysis and retirement. After integration,
workspace/Docker have **8.4 GiB free**, `/tmp` **101 GiB**. All 12 observed containers
and eight owned volumes are retired; only the three pre-existing volumes remain.
No prune, historical evidence deletion or source-tag substitution occurred.

Initial regression `initial-red.log` had an incorrect test CWD; `initial-red-02.log`
then failed on the intended missing initializer. `consumer-02.log` retained an
initializer copy error. `focused-01.log` found a direct-call service-path fallback
regression. `generated-cache-red.log` exposed the engine cache issue above.
All were fixed with focused checks; no failed real delivery was replaced or hidden.
No earlier TDD history is claimed.

The shared suite, doctor, inventory and link checks are recorded in `shared-*.log`,
`doctor-*.log`, `inventory-*.log` and `links-*.log`. Both complete shared runs PASS: 9 environment, 1,049 service/unit, 131 Python
policy, Conftest, 16 Kyverno engine checks, offline Cosign, static workflow,
153 defense and 22 release tests. The final `make -C implementation test` also
includes the new real offline consumer cryptographic checks. Final doctor PASS.
Inventory: 833 tracked paths with exact ownership coverage; 11 inventory
regressions PASS. Existing documentation procedure: 529 relative links/anchors
in 18 affected guides PASS. `git diff --check` PASS. The final local run uses
committed runtime `4d743fa` plus the final test-only refinement; exact-head
push/PR CI status is recorded separately in the PR handoff.

## Limits and review

Hosted OIDC, public registry publication and production clusters are
**NOT_EXECUTED**. General workload configuration, external runtime dependencies,
Java, human measurement, SBOM completeness and full DORA compliance are not
established. The next dependent increment is the bounded Java consumer trial.
License, private reporting, custody and human acceptance remain separate decisions.

| Activity | Assistant contribution | Human review | Final decision |
| --- | --- | --- | --- |
| Implementation, tests, documentation and local validation | OpenAI Codex / GPT-6 | Pending | Draft for owner review; no human acceptance inferred |

## PR #77 review fixes — 8 November 2026

Reviewed head `ba153f6884e0d5e204cec79b7a706d6790b98dc6` was still current after
fetch. Both required defects reproduced in disposable repositories before editing
runtime: `required-red.log` records three intended failures (staged consumer and
engine deletions, and tests reading the conflicting engine package). The two
unstaged-deletion cases already rejected correctly. No developer checkout file
was removed or staged for reproduction; unrelated root npm files remain intact.

| Finding | Correction and observed coverage |
| --- | --- |
| **Required: complete committed inventory** | NUL-delimited `ls-tree` at the explicitly resolved commit defines inventory, blob IDs and executable modes. Index removal cannot hide files; HEAD drift fails. Staged/unstaged deletions, unusual literal paths, content/modes, unexpected files, nonregular inputs, parent symlinks and clean sparse engines are covered. Only the existing precise cache exclusions remain. |
| **Required: consumer test CWD** | The actual shared stage runs Node tests in a service-directory subshell. Relative package/fixture reads, conflicting engine files, unrelated CWD, spaces, failing tests, TAP validation and unchanged caller CWD are covered. The fresh integration consumer contains a committed CWD-sensitive test and fixture. |
| **Small metadata improvement** | Result and package descriptions distinguish independent Node consumers from fixed quotes-node delivery. Archive format remains `delivery-v1` / `legitimate-delivery-package/v1`; `executionProfile` identifies the execution. Both profiles pass focused assertions and archive verification. Old archives are unchanged. |
| **Validation gap: negative live admission** | Now observed for one required results binding: wrong expected engine commit produces the singleton `CONSUMER_BINDING_engineCommit` rejection; restoring the correct expectation accepts the same authentic image. This is a directed check, not a previously demonstrated bypass or all-binding live coverage. |

The committed integrated engine is **`0f949b40e6bb8c3b5164b091aebe299560a81e55`**.
The final independent consumer is **`2d23884c7f1a703cf9d5f4b55b13d0b05ceae799`**.
Each attempt generated a new repository and pinned that exact engine revision;
none reused the November 5 lock. Consumers have no origin. Their declared
`https://example.invalid/golden-path-consumer-validation` identity remains local
test data, without hosted source or OIDC authentication.

### Executions, including failures

All four attempts retain their original records under
`/tmp/gp-pr77-20261108/attempt-01/` through `attempt-04/`. Workspace copies of
raw evidence, packages, installation/check/delivery logs and acceptance receipts
are in `implementation/evidence/raw/pr77-review-fixes-20261108/attempt-XX/`.
Every archive below passed outer and internal checksum verification, including
the failed delivery's archive. No earlier record was relabelled or replaced.

| Attempt / run | Consumer commit | Delivery | Verified archive SHA-256 |
| --- | --- | --- | --- |
| 01: `delivery-dxAj3XA2` | `74a59a510f74a5d198e39175807d48a0f1e34627` | FAILED | `96747e1142fabc6c9068e50dd7bad5d175d440ae4903b2ed9d5175daa338e698` (34 internal hashes) |
| 02: `delivery-uFQOT8FA` | `398d44ddd74c7e6ccb02b190756a7dd14f50017c` | PASS | `9f8110602c3e7ee0669517a3681ff90b0361ac4bd52954a4038e8694bad6c71f` (164 internal hashes) |
| 03: `delivery-LiJASbLw` | `cb6f358758e8ead4e2f3a56d4211ce846b6d83bb` | PASS | `37d7e77adb16ca63d015a1d4ca8d8cd036c15b15d6292474b67d91de91c3cf70` (164 internal hashes) |
| 04: `delivery-agCCHOTy` | `2d23884c7f1a703cf9d5f4b55b13d0b05ceae799` | PASS | `3dc8c6a65fd2676caa755295a094649022ea34982f7959cbc35def8aa76f1c88` (164 internal hashes) |

Attempt 01 stopped at vulnerability analysis because the operator had not created
the configured snapshot directory. This was **ERROR**, not policy rejection;
signing and admission remained unreached. Creating that directory resolved the
setup error without runtime changes. Attempts 02–04 passed all 21 stages: source
capture/rechecks, consumer tests/workflow, manifest policy, build/scan, four
independent evidence types, authorization, admission, rollout, running digest,
HTTP, finalization and retirement. `/version` in attempt 04 reports
`independent-node` and consumer commit `2d23884…`; the application check observed
the starter greeting. The sparse engine had no laboratory execution modules.

The separate observer failures remain under `attempt-01-admission*`,
`attempt-02-admission` and `attempt-03-admission`. The first observer initially
matched the wrapper path rather than its exec'd coordinator; no admission was
reached in that delivery. The next observer combined a Kyverno stderr deprecation
warning with JSON and failed before policy changes. Attempt 03 accepted the
correct image, but its negative request encountered a webhook connection refusal
after restart. That is an **integration error**, not condition rejection;
restored acceptance was unreached. No failed request was silently retried.

`directed-admission-05.py`, retained with the evidence, uses the existing product
endpoint-convergence checker after controller restarts. For attempt 04 it paused
only its own coordinator descendant after authorized admission setup, copied all
five policies into an isolated namespace, and submitted server-side dry-run
Deployments as the restricted actor. It changed only the copied results policy's
expected engine commit to forty zeros. The same signed evidence first passed,
then failed with the sole `autogen-require-results` /
`CONSUMER_BINDING_engineCommit` diagnostic, then passed after restoration.
Original delivery policy UIDs, generations and specs were unchanged. Probe
policies and namespace were retired using captured UIDs; the coordinator resumed
and completed normally. Raw diagnostics, loaded policies, convergence observations,
restoration, cleanup and per-file checksums are in `attempt-04-admission/`.
No production renderer, validator, global policy or coordinator hook was changed.

Both authenticated statements bind engine snapshot
`79682ed130f03b2c3ecb4002f192e6d8a82e3e0d876ef62737368579ee67d506`,
consumer snapshot `db56c4fb2524fb1cdb985a5f3e74d15b71c2fccb75738608470493eaeb02b977`
and configuration `207a82908cc83b33e527d065e2a54b40791594420de9e276ab6cf8d026209dc1`.
Final image: `sha256:611bfd443011028f57cbd9a78906c9b0c0c8c7eb11ae8ce1817b69f5c12685be`.
Twelve additional offline negative checks authenticated original attempt-02
bundles before rejecting wrong source/engine/configuration expectations;
`actual-negatives/receipt.json` records their exact revisions and outcomes.

### Commands, checks and preservation

The committed `implementation/tests/integration/independent-consumer.py --run`
remains the normal integration entry point. The final directed trial used the
retained observer below to invoke that same helper, with no substituted stages.
These destinations already exist and must be preserved; another run needs a fresh
output path. The snapshot root must exist before delivery:

```bash
export PATH="$PWD/implementation/.tools/bin:$PATH"
export GP_VULNERABILITY_DB="$PWD/implementacion/.tmp/security-refresh-db"
export GP_VULNERABILITY_SNAPSHOT_ROOT=/tmp/gp-pr77-20261108/snapshots
mkdir -p "$GP_VULNERABILITY_SNAPSHOT_ROOT"
export TRIVY_CACHE_DIR="$GP_VULNERABILITY_SNAPSHOT_ROOT/cache"
python3 implementation/evidence/raw/pr77-review-fixes-20261108/directed-admission-05.py \
  /tmp/gp-pr77-20261108/attempt-04
```

`make -C implementation doctor` and `make -C implementation test` PASS: 9 environment,
1,059 service/unit, 131 Python policy, Conftest, 16 Kyverno checks, both real offline
Cosign suites, workflows, 153 defense and 22 release tests. Focused source/test-stage/
lifecycle/packaging run: 53 PASS; final source regressions: 14 PASS. Both actual
fixed and laboratory shared test-stage invocations passed 43 service tests and
preserved caller CWD. This compatibility scope follows the changed paths: consumer
capture is profile-specific, existing fixed/laboratory test branches are unchanged,
and package descriptions are covered for both profiles. No historical campaign
or full laboratory scenario catalogue was rerun. Inventory covers 833 tracked
paths, all 11 inventory regressions pass, and documentation links plus
`git diff --check` pass. Logs are beside the attempt copies.

Pinned tools and their lock/versions hashes match the November 5 identities above.
The preserved real Trivy database still hashes to
`faa015429c6ebd9c9a672be99cfbd5aecec2eade21d1d6e59d4dc091dc752ff3`; its metadata hash
is `75ccefb55d36ea911801b1cdb555f4d022f0fc8a813e061b0d491fe9752dc706`.
All three fresh snapshots remain under `/tmp/gp-pr77-20261108/snapshots/`; the
workspace original remains untouched. Scan PASS is specific to those bytes,
not a current vulnerability-freshness claim.

Capacity logs precede installation and each attempt. Workspace/Docker share the
32 GiB `/dev/loop4` filesystem; `/tmp` uses a separate `/dev/sda1` filesystem.
Every run met the 3 GiB reserve plus existing operation growth allowances; the
isolated probe additionally required 256 MiB for bounded logs/metadata. Runs were
sequential. Twelve owned containers and eight owned volumes were retired; only
three pre-existing volumes remain. Probe namespace/policy cleanup also passed.
After preservation, workspace/Docker have **8.0 GiB free**, `/tmp` **101 GiB**.
Repeated final cleanup preserved all 171 raw files and the archive hash.
Private recovery and consumer Git repositories were copied to
`implementation/.tmp/pr77-review-fixes-20261108/`; originals and old evidence,
archives, snapshots and legacy directories remain untouched. No pruning occurred.

The following receipt commit changes documentation only; `runtime-continuity.json`
records matching selected runtime bytes and Git modes. Final-head push/PR CI is
reported in PR #77. Hosted OIDC, public publication and production-cluster checks
remain **NOT_EXECUTED**. All other earlier scope limits and owner decisions remain;
the bounded Java trial is outside this PR. OpenAI Codex / GPT-6 implemented and
validated these corrections; human review and acceptance remain pending.

### Pinned-tool downloads — follow-up on 8 November 2026

The remote remained at `63b2db053846a3ed954b70fad60b9cbb6971163c`. Repeated
[push failure](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/42464765012/job/128700110395)
(run `42464765012`, attempt 2, job `128700110395`) and
[PR failure](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/42464767726/job/128700458429)
(run `42464767726`, attempt 3, job `128700458429`) stopped before tests. Node's
GitHub download returned 504 but setup-node succeeded through nodejs.org;
the security installer then failed on its first pinned Trivy download.
Full attempt logs, job/run metadata and source IDs are retained under
`implementation/evidence/raw/pr77-download-reliability-20261108/`.

Codespaces reproduced HTTP 504 / curl exit 22 on the pinned Trivy URL.
The official release metadata and asset API both returned HTTP 200. The downloaded
asset matched the existing SHA-256
`c7cbe3137fb8a48a17574bede3dd6beb16742d1e9772929940fc90082c39d9c0`.
This establishes that the alternate official route worked during this observation,
not that both routes will always be available.

Installer candidate **`ed0a51421926b3b9dba705d7fa0f920856b08fba`** adds bounded
retrieval inside the existing developer installer. Each route has at most two
transfer attempts, each allowing at most five HTTPS redirects. Transfer time caps
are 20 seconds for primary, 15 for metadata and 45 for
asset retrieval, clamped to 120 seconds per tool and a 300-second total budget.
Specified transient HTTP/transport failures may use the
[official asset API](https://docs.github.com/en/rest/releases/assets#get-a-release-asset).
The exact locked repository, tag and filename must identify one uploaded asset;
metadata cannot replace the checked-in checksum. Both binary responses and HTTPS
redirects use `Accept: application/octet-stream`. Requests are anonymous, ignore
ambient curl configuration/netrc, send no tokens and never use location-trusted.
Diagnostics record tool/version, route, HTTP status, curl exit and elapsed time;
raw error bodies and signed redirect URLs are not printed. Certificate/configuration
errors, malformed metadata and checksum failures remain distinct failures. A
checksum mismatch never switches routes. Non-GitHub URLs retain their primary
route, and existing extraction/regular-file checks remain enforced.

One real installation into `/tmp/pr77-real-tool-install-83gxuffr/prefix` passed
at that committed candidate. Trivy, Conftest, Cosign, act and Kyverno recovered
through the API after primary 504s; Helm succeeded on its existing non-GitHub
route. All six archives passed the unchanged checked-in checksums; the existing
version checker selected all six fresh binaries and passed. `installation-receipt.json`,
`real-install.log`, `installed-versions.log` and `installed-binaries.json` record
source, routes, executable hashes and outcomes. Commands used:

```bash
PREFIX=/tmp/pr77-real-tool-install-83gxuffr/prefix \
TMPDIR=/tmp/pr77-real-tool-install-83gxuffr/scratch \
  bash implementation/scripts/install-security-tools.sh
export PATH="/tmp/pr77-real-tool-install-83gxuffr/prefix/bin:$PWD/implementation/.tools/bin:$PATH"
python3 implementation/scripts/check-tool-versions.py
make -C implementation doctor
make -C implementation test
```

The prefix/scratch directories were freshly created before these commands and
are now retired; reproduction requires a new task-owned directory. Capacity was
checked before downloads and installation with a 3 GiB reserve plus a 2 GiB working
allowance. Installation and heavy suites ran sequentially. Only eight verified
files in the task-owned install/probe directories were removed after recording
their hashes. No Docker resources or historical evidence were removed. Remaining
capacity: workspace/Docker **7.9 GiB**, separate `/tmp` **108 GiB**.

Deterministic downloader regressions: **28 PASS**; combined installer/legacy
compatibility checks: **63 PASS**. The retained initial red test failed because
the old installer exited on the primary 504 without fallback. The first shared
run exposed a test harness that sliced the newly scoped main function into
incomplete Bash; its canonical-root oracle was preserved while adapting the
startup fragment. `shared-test.log` retains that failure. `shared-test-02.log`
records the passing full suite: 9 environment, 1,087 service/unit, 131 Python policy,
Conftest, 16 Kyverno, both real offline Cosign suites, workflows, 153 defense and
22 release tests. Doctor, the 834-path inventory, 11 inventory regressions,
documentation links and `git diff --check` pass. The final compatibility fixture
and receipt changes do not alter the installed candidate's script bytes or mode.

`tools.lock.json` and `versions.env` retain the hashes recorded above. All 56
selected consumer-engine Git entries (55 captured inputs) match the previously
integrated `0f949b4` runtime; `src/`, `bin/`, templates, policies, schemas, versions
and checksums are unchanged. No Kubernetes/consumer delivery was rerun for this
bootstrap-only change. Earlier delivery receipts remain attributed to their
original engine and consumer commits. Availability of both official routes,
including anonymous API limits, remains external; failed bootstrap still stops CI.

Final-head [push CI](https://github.com/tfm-goldenpath/golden-path-lab/actions/workflows/ci.yml?query=branch%3Afeat%2Findependent-consumer-template+event%3Apush)
and [PR checks](https://github.com/tfm-goldenpath/golden-path-lab/pull/77/checks)
are checked after the final push; immutable run/job IDs, source SHA and conclusions
are recorded in the [PR description](https://github.com/tfm-goldenpath/golden-path-lab/pull/77)
and the retained CI receipts. The PR stays draft and unmerged; human review remains pending.

PR #78 compatibility: fresh Node `delivery-wZNLxGVu` PASS on engine `e083164`,
with separate consumer history and evidence after the Java trial. See the
[Java acceptance record](java-consumer-validation.md) for exact identities, archive
hashes and limits. Earlier receipts above keep their original attribution.
