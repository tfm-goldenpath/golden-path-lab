# Independent consumer validation — 5 November 2026

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
