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

## Optional test and coverage gate

`quality` runs the existing `node --test test/*.test.js` profile once with native
Node **24.22.1** coverage. It needs Linux, Python 3 and Git, but no Docker, npm
install, coverage dependency or external service. It checks executed production
lines, functions and branches against reviewed thresholds. Coverage does not prove
assertion quality, absence of vulnerabilities or regulatory compliance.

To activate it, use a reviewed engine revision that contains this command and
update the full engine pin in `golden-path.json`. Add this complete configuration
and integrate the updated starter workflow in the same reviewed Git change:

```bash
cat > "$CONSUMER/service/quality-gate.json" <<'JSON'
{
  "schema": "node-quality-gate/v1",
  "include": ["src/"],
  "exclude": ["src/index.js"],
  "thresholds": {"lines": 80, "functions": 80, "branches": 70},
  "limits": {"timeoutSeconds": 120, "maxOutputBytes": 4194304, "workers": 2}
}
JSON
# For an unchanged starter; reconcile existing custom workflows before committing.
cp "$ENGINE/templates/node-http/.github/workflows/ci.yml" "$CONSUMER/.github/workflows/ci.yml"
git -C "$CONSUMER" diff
git -C "$CONSUMER" add golden-path.json service/quality-gate.json .github/workflows/ci.yml
git -C "$CONSUMER" commit -m 'Enable reviewed Node test and coverage gate'
bash "$ENGINE/bin/deliver" quality --consumer "$CONSUMER"
# Optional: parent must exist; each output directory must be new and outside the consumer.
QUALITY_OUTPUT=/absolute/evidence/new-quality-run
bash "$ENGINE/bin/deliver" quality --consumer "$CONSUMER" --output "$QUALITY_OUTPUT"
bash "$ENGINE/bin/deliver" quality --verify "$QUALITY_OUTPUT"
```

Run either invocation from any working directory. The two examples above create
two separate runs; normally choose one. The config is captured automatically with
all committed `service/` inputs and contributes to consumer identity. Uncommitted
changes, untracked additions, missing inputs and links remain errors. No field
accepts commands. `include` and `exclude` contain literal `.js`/`.mjs`/`.cjs` files
or directory prefixes ending in `/`, under `src/`; there are no glob expressions.
Every entry must match committed production code; an empty final scope is invalid.
The explicit `src/index.js` exclusion leaves the starter's socket-listening entry
point outside this measurement. Review that exclusion for your application.

80/80/70 is a practical starter example, not an industry standard or a quality
guarantee. Change thresholds (0–100), scope or exclusions through a reviewed commit;
the engine never lowers them automatically. The maximum timeout is 300 seconds,
output is 4 KiB–16 MiB, and workers are 1–2. The bounded runner caps Node heaps at
256 MiB per process, copies at most 16 MiB/1,000 source files, checks aggregate work
growth (16 MiB plus the output limit), and requires a 3 GiB disk reserve plus 64 MiB
anticipated growth on evidence and work storage. These cooperative local limits
are not a sandbox for hostile code or an OS memory quota. Tests run as the caller;
review them and run CI without secrets. One heavy task at a time.

| Outcome | Exit | Meaning |
| --- | ---: | --- |
| PASS | 0 | Actual tests succeed and all applicable metrics meet thresholds. |
| FAIL | 1 | Test failure or a specific unmet coverage threshold. |
| ERROR | 2 | Invalid inputs/configuration, interrupted execution, invalid evidence or failed collection/cleanup. |
| NOT_EXECUTED | 0 | Node control absent; no coverage acceptance and no tests run by `quality`. |
| NOT_APPLICABLE | 0 | Java profile; Java coverage is outside this increment. |

The [versioned Node documentation](https://nodejs.org/download/release/v24.22.1/docs/api/test.html#collecting-code-coverage)
describes the experimental collector. It reports loaded files. This gate derives
expected files from the committed inventory: an unimported expected file produces
ERROR, never apparently complete coverage. It does not import application code
just to increase coverage. Missing/truncated reports, zero actual tests, skipped
or TODO tests, inline coverage suppression and invalid/unknown metrics cannot pass.
Zero denominators are not 100%: they are not applicable, and an aggregate metric
with a configured but unevaluable threshold causes ERROR. Comparisons use original
counts; only display is rounded.

The command prints its fresh `implementation/evidence/raw/quality-*/` directory.
Read `summary.txt`, `result.json`, `tests.log`, original `coverage.ndjson`,
`quality-gate.json`, `effective-config.json`, `inputs.json`, `scope.json`, versions,
command and execution receipts. `checksums.json` covers retained bytes; `--verify`
checks the inventory and hashes. An output-path/preflight error may only reach the
console; sealing failures emit ERROR and best-effort `finalization-error.json`.
Preserve the first failure. A `recoveryWork` path means work was retained rather
than assuming safe retirement. Local hashes are not signed attestations and are
not delivery authorization. Tests, report binding, copied-source checks and original
input rechecks/watch events establish this run's association; a report's claimed
commit alone is insufficient. Keep the checksum manifest's own hash separately
when transferring evidence.

The updated starter CI checks out the configured full engine SHA, verifies its
origin/HEAD/committed bytes through the same command and executes tests once.
FAIL and ERROR fail the job; the summary contains metrics, thresholds and reasons,
and evidence uploads run even on rejection. Without the config, CI retains
ordinary npm tests and labels coverage NOT_EXECUTED. Existing consumer workflows
must adopt the updated integration explicitly. A failing job is distinct from an
organization choosing a required merge check; no protection rules are changed.
Local generated-starter validation is not a hosted consumer-repository run.

`check`, `local`, `cleanup`, Java, the seven mandatory result checks and four
independent authenticated evidence types are unchanged. This gate is not a
Kubernetes admission condition. [Validation and limits](maintainers/consumer-quality-validation.md)
record the exact source and observed cases.

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
