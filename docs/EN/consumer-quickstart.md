# Independent Node consumer

[Guide](README.md) · [Español](../ES/consumer-quickstart.md)

The starter is a separate Git repository containing a small HTTP service, tests,
locked dependency-free package, Dockerfile, build exclusions, one CI workflow and
`golden-path.json`. You own those files. The separately pinned engine owns tools,
policies, schemas, verification and temporary infrastructure. No laboratory files
or copied engine implementation belong in the consumer.

## Create and pin

Use the supplied Linux AMD64 Codespaces/devcontainer tooling. Follow the existing
[prerequisites and capacity checks](legitimate-delivery.md#prerequisites-and-invocation):
Docker needs **3 GiB reserve plus 5 GiB cold growth**, with separate evidence and
DB allowances. Inspect `/tmp`, memory and existing containers/volumes/builders.
Run one delivery at a time; never prune unrelated resources or evidence.

Select a reviewed **full 40-character engine commit**, then fetch that exact
revision into a separate checkout. Replace the values below with real absolute
paths, the reviewed SHA and your actual expected HTTPS service repository:

```bash
ENGINE=/absolute/golden-path-engine
CONSUMER=/absolute/my-service
ENGINE_SHA=REPLACE_WITH_REVIEWED_FULL_SHA
SERVICE_REPOSITORY=https://your-source-host.example/your-team/your-service
git clone --no-checkout https://github.com/tfm-goldenpath/golden-path-lab "$ENGINE"
git -C "$ENGINE" fetch origin "$ENGINE_SHA"
git -C "$ENGINE" checkout --detach "$ENGINE_SHA"
export PATH="$ENGINE/implementation/.tools/bin:$PATH"
# Use the pinned devcontainer tools; only install missing locked validation dependencies.
make -C "$ENGINE/implementation" setup-validation
make -C "$ENGINE/implementation" doctor
bash "$ENGINE/bin/deliver" init "$CONSUMER" \
  --repository "$SERVICE_REPOSITORY" --engine-commit "$ENGINE_SHA"
git -C "$CONSUMER" init
git -C "$CONSUMER" add .
git -C "$CONSUMER" commit -m 'Initialize independent Node consumer'
```

Reuse an existing verified engine checkout instead of cloning again. `init`
refuses nonempty destinations and requires its own checkout HEAD, origin string
and selected committed engine bytes to match the pin. It does not copy the
engine. `golden-path.json` is the versioned configuration and engine lock;
unknown fields, mutable pins and arbitrary paths are rejected. Commit consumer
changes before delivery. If a consumer origin exists, it must equal the expected
HTTPS identity. Local verification checks Git bytes and the origin string; it
cannot prove that a remote host owns or serves those bytes. No origin is recorded
as unverified. The maintainer fixture's `example.invalid` identity is explicitly
local test data, never a real hosted repository.

## Check and deliver

These commands work from the consumer root or an unrelated working directory:

```bash
bash "$ENGINE/bin/deliver" check --consumer "$CONSUMER"
npm ci --prefix "$CONSUMER/service" --ignore-scripts --no-audit --no-fund
npm test --prefix "$CONSUMER/service"
bash "$ENGINE/bin/deliver" local --consumer "$CONSUMER"
```

The supported profile is `node-http-consumer/v1`: Node 24 built-ins only, fixed
`service/` context, supplied Dockerfile and `.dockerignore`, Linux AMD64, UID/GID
10001, read-only filesystem and port 3000. Workload/container name `quotes-node`,
namespace `tfm-golden` and restricted actor `deployer` remain fixed. `/healthz`
returns `{"status":"ok"}`; `/version` identifies `independent-node` and the
consumer's `BUILD_COMMIT`; `/` retains the starter greeting as the first profile's
application check. General workload/API configuration and dependencies remain later increments.
The separate [bounded Java trial](java-consumer-quickstart.md) has its own profile
and validation limits. Tests and workflow files are selected exclusively from the
consumer; missing or rejected checks stop delivery. Tests run from `service/`,
so relative fixtures and `./package.json` resolve within the consumer. Selected
inputs are checked against the complete pinned commit tree, independent of staged
index changes; deleting a committed input stops delivery.

The seven required controls remain `unitTests`, `manifestPolicy`, `workflowPolicy`,
`vulnerabilityPolicy`, `signature`, `sbom`, `provenance`. Image signature, SBOM,
provenance and results are independently required. Before build and authorization,
the engine rechecks committed consumer and engine inputs and relevant file modes.
Signed provenance identifies the consumer commit and the explicit consumer
producer. Both provenance and results bind the engine repository, commit, selected
engine-input hash, consumer-input hash and configuration hash. Bundle verification
compares these against execution configuration. Admission repeats these binding
conditions and the existing four evidence/runtime requirements. Local checks
also cover tests, workflow, full SBOM schema, scan association and source snapshots;
admission does not rerun them. See [controls](how-it-works.md) and
[contracts](../../implementation/docs/EN/delivery-contracts.md).

## Evidence and cleanup

The command prints the engine's `implementation/evidence/raw/delivery-XXXXXXXX/`.
Read `finalization.json`, `result.json` and `delivery-steps.json`; policy rejection,
operational errors and unreached stages are different outcomes. Consumer/engine
snapshots, configuration and authenticated statements are retained there. Verify
all archive hashes using the pinned engine. The archive format remains
`delivery-v1` / `legitimate-delivery-package/v1`; its summary identifies the
execution separately as `executionProfile: consumer-v1`:

```bash
python3 "$ENGINE/src/verify_package.py" \
  "$ENGINE/implementation/evidence/packages/delivery-XXXXXXXX.tar.gz"
# Only after an interrupted run needs retirement:
bash "$ENGINE/bin/deliver" cleanup \
  "$ENGINE/implementation/evidence/raw/delivery-XXXXXXXX"
```

Normal exit retires owned resources. Cleanup checks immutable resource receipts,
refuses foreign resources and preserves the first evidence/archive and failure.
Private recovery stays in the engine's `implementation/.tmp/`; do not share raw
state, keys or credentials. Public packages exclude these. See the existing
[evidence semantics](legitimate-delivery.md#evidence-and-retirement).

Local development keys do not establish GitHub OIDC, production readiness, SBOM
completeness or full DORA compliance. Hosted signing, public image publication
and production clusters are **NOT_EXECUTED** for this increment. Repository reuse
terms and private reporting remain owner decisions. Exact integration revisions,
failed attempts and limitations live in the [maintainer receipt](maintainers/independent-consumer-validation.md).
