# Paired R/G legitimate delivery measurements

[Español](../ES/paired-rg-measurements.md) · [Architecture](architecture.md) · [Contracts](delivery-contracts.md)

## Status and unit of observation

Instrumentation is implemented. Development RG `36926824792` and GR `36927943550`
passed independent evidence review at `02674a57d290083648a9af44c48fd049808b2d70`;
the earlier cache-preparation failure remains recorded below. The four authorized
pilot pairs GR/GR/RG/RG are now complete and independently reviewed: 4/4 favorable,
no exclusions or retries. The [pilot report](paired-rg-pilot-review.md) records
timings, dispersion, completed-job consumption and the resolved initial dispatch
access failure. The later [ten-pair campaign](paired-rg-campaign-results.md) at `895a3bd`
completed with 10/10 favorable pairs; its source, database and evidence remain separate from this pilot. Human-effort measurement and eligible manual
calibration are deferred; scenario readiness and human acceptance remain pending.
The [readiness matrix](evaluation-readiness.md) separates the four datasets and
final-source requirements. The contributor reports
successful lane A functional suites in run `36885654089`, source
`5ae6f84a01407789933bd36bcdb05250a6d6c4f5`; this increment does not independently
reaudit that package. Existing lane A reviews and unsuccessful attempts remain
in [the validation guide](lane-a-validation.md). They do not establish lane B
OIDC/GHCR measurements.

Campaign support now extends this runner with an explicit draft, final-source
binding, separate human authorization and a checksummed plan artifact. See the
[campaign procedure](paired-rg-campaign.md) for final-source RG/GR development,
freezing, separately authorized execution and partial-campaign analysis. This
support does not approve ten pairs or close the overall pilot.

The unit is one legitimate delivery independently built and published per arm.
The twenty scenario IDs and `make demo`, `reference`, `vulnerabilities` and
`lane-a-validation` commands retain their functional purpose. Faults, recovery,
replacement deliveries and vulnerability fixtures are absent from this runner.

## Controls and shared preparation

| Boundary | R | G |
|---|---|---|
| Current workflow source, service tests, pinned base, linux/amd64 | Required | Required |
| Independent build and GHCR publication | Required | Required |
| Digest manifest, hardened container, restricted actor, Kubernetes validation | Required | Required |
| Fresh Deployment CREATE | `tfm-reference` | Protected `tfm-golden` |
| Rollout, expected digest/Ready Pods, health/version/quote HTTP | Required after endpoint | Required after endpoint |
| Workflow/manifest Conftest, original CycloneDX SBOM, real Trivy analysis | Absent | Required |
| Image/SBOM signatures, native provenance, results, fresh registry verification | Absent | Required |
| Kyverno evidence verification | Absent | Required |

One ephemeral Ubuntu runner, Docker engine, kind cluster, network, registry
repository and admission controller are shared. Both namespaces have the existing
restricted workload actor; administrative cleanup uses `k`. Builders and image
digests are independent. A unique arm label prevents one arm receiving the
other's image digest. This is sequential execution, not security isolation: the
job has `contents: read`, `packages: write`, `id-token: write`,
`attestations: write`, and `actions: read` for both positions. R never invokes
signing or attestation issuance.

The exact authorized workflow is
`tfm-goldenpath/golden-path-lab/.github/workflows/paired-rg.yml@refs/heads/main`.
The existing issuer, native GitHub builder, repository, revision and predicate
checks still apply. The renderer receives this exact identity; no wildcard or
substitution of `golden-path.yml` is used. HEAD, dispatch SHA, expected source and
clean tracked checkout must agree. Run attempts other than 1 are rejected.

Dependencies, full shared laboratory tests, infrastructure, database download,
cache preparation/restoration and readiness are outside both primary timers.
Hosted installation reuses `versions.env`, `tools.lock.json` and the existing
security/platform installer; Node/npm, security tools, kind, kubectl and Buildx
are checked. Docker client/daemon remain supplied by the Ubuntu runner, with
actual versions and CPU/memory recorded. This does not claim the pinned lane A
devcontainer environment. No tool pins or host networking are changed.

Readiness checks policy UIDs/generations/specifications, controller Pods and
endpoints, then requires the precise runtime repository denial of a server
CREATE dry-run for an out-of-repository base digest. No measured candidate yet
exists; signature rules do not match that image. The candidate-specific
missing-results probe remains in the demonstration, not in measured preparation.
Kyverno image verification caching remains disabled.

## Timing and prepared caches

`paired-rg.py` orchestrates persisted phases; `paired-delivery.sh` calls shared
modules; `paired_measurements.py` validates observations and computes statistics.
Policies and evidence interpretation remain in existing production components.
`delivery_preflight` now calls separate service, laboratory, workflow and version
operations; normal demonstrations still call all of them.

The primary monotonic timer starts immediately before service tests. It includes
build/publication, manifest generation, all applicable G operations and the
explicit native Actions provenance step. It ends when the fresh restricted-actor
`kubectl create -o json` returns, before interpreting the response. Python process
startup/recording overhead at the endpoint is included. Workflow step scheduling
gaps within this interval are included too. UTC, monotonic nanoseconds and Linux
boot identity survive prepare/native/finish steps. Clock discontinuity fails.

Actual NotFound is required before CREATE; an unchanged apply is never used.
Raw response and diagnostics are retained. Missing admission has null duration;
a malformed response retains its measured endpoint but cannot be favorable.
Rollout, HTTP, package creation, workload deletion and infrastructure cleanup
have separate records after that endpoint. Controller-generated Pod admission
is observed through rollout/Pod evidence after the Deployment endpoint. Shared
node layer caches may affect that subsequent rollout and are not claimed to be
isolated build caches. A cleanup failure excludes the pair
from the complete favorable dataset without erasing arm observations.

Both build caches are warmed from immutable application/package bytes at
`7243334fe4ee7073801a86b25c90986b7d3c5ece`, using the **current Dockerfile** and
same pinned base/platform. Warmup is not a delivered historical image. The
current source tree must actually differ. Old and new application tree IDs and
diff, cache indexes/full file hashes, build inputs and plain BuildKit logs are
retained. Warm builders are removed; separate empty builders import separate
local exports. Hashes are rechecked before each primary timer. The base-removal
RUN must be CACHED and application COPY must be DONE, not CACHED. BUILD_COMMIT and
arm labels also change; this protocol does not claim only one invalidated layer.
The current workflow SHA, not the warmup revision, is authenticated by native
provenance. Cache exports can be regenerated from the retained immutable recipe;
large build-cache bytes are not uploaded.

One frozen Trivy database is prepared by the first development pair, checked before/after analysis and
preserved as an allowlisted database archive. R records the shared identity but
does not scan. G performs image → original SBOM → real report → production
policy. Database acquisition is separate from measured analysis. A full-pair
retry must restore those same database bytes. Verification caches are distinct
from build caches and scanner data. Subsequent development and pilot pairs restore it using `database_run`. Pilot
requires a preserved successful **development** pair at the same source. Analysis refuses to pool
different database hashes. Do not silently replace a finding or relax the
HIGH/CRITICAL threshold.

## Records, analysis and failure policy

`measurements/protocol-v1.json` defines protocol `paired-rg/v1`.
`pair.json` and arm `measurement.json` use versioned schemas and record plan,
source, run/pair/order/attempt, tools/policies/resources, caches, database, digest,
phase endpoints/statuses and evidence references. All raw arm evidence is in
checksummed packages; no successful G authorization is created for R.

Classifications are:

- **valid-favorable**: complete service/build/control/admission/functional and
  cache observations; pair success additionally requires cleanup and retention.
- **valid-unfavorable**: attributable production policy rejection of the legitimate
  input. Its time is not a faster successful delivery.
- **invalid**: recorded protocol/cache violation or separately reviewed external
  failure evidence. Original attempts remain intact.
- **indeterminate**: incomplete, missing, malformed or otherwise unattributed
  execution. Registry/certificate/evaluator errors do not become policy denials.

There is no automatic pair retry. An operator may request one full-pair retry for
an evidenced registry outage, network outage or runner loss. Provide the original
run and a retained diagnostic path; the normalized path is saved as
`externalFailureReview.evidencePath`, relative to `prior-attempt/`, alongside its
content hash; the requesting actor is recorded as the
reviewer of that cause, not as final human acceptance. The operator must actually
review the diagnostic; selecting a category alone does not establish causality.
Order, source, plan, pair and database must match; builders/caches are recreated
from the same recipe. A second retry, successful-pair retry, control-failure retry
or duration-based retry is prohibited. If the original database was never
preserved, identical starting conditions cannot be restored by this retry path.
Keep that attempt incomplete. Existing bounded tool retries (including OIDC
signing attempts) remain in logs and inside the applicable phase time.

Analysis includes every attempt, including exclusions and the original retry
attempt. It calculates G−R seconds and 100×(G−R)/R per complete favorable pair,
median differences, median absolute deviation and range, with explicit attempt
and included/excluded denominators. Missing or mismatched arm identities/phases
cannot enter the favorable sample. Development and pilot datasets, sources and
plans cannot be pooled. Job elapsed minutes are observed separately after job
completion, including both arms and shared costs. No billed minutes, monetary
expenditure or modelled allocation is inferred; shared preparation is reported
separately.

## Manual development smoke pair (after merge and authorization)

These are instructions, **not dispatched runs**. Review the exact merged source
and workflow before executing. From the repository root:

```bash
git fetch origin main
TARGET=$(git rev-parse origin/main)
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=development -f pair=1 -f order=RG -f expected_source="$TARGET"
gh run list --repo tfm-goldenpath/golden-path-lab --workflow paired-rg.yml --limit 5
# Select the actual resulting ID, never another workflow's successful run.
read -r -p 'Actual resulting run ID: ' RUN
gh run watch "$RUN" --repo tfm-goldenpath/golden-path-lab --exit-status
DEST="implementacion/evidence/measurements/download-$RUN"
gh run download "$RUN" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$RUN" --dir "$DEST"
(cd "$DEST" && sha256sum -c SHA256SUMS.txt)
```

Keep this original directory immutable and copy it outside the ephemeral runner
before 30-day artifact expiry. Verify each `packages/*.tar.gz.sha256`, internal
`SHA256SUMS.txt`, and each separate `databases/*.tar.gz` checksum/internal manifest
and identity. Database archives contain only `db/trivy.db`, `db/metadata.json`,
`identity.json` and hashes. NOT_CREATED differs from missing required bytes.
Do not upload `.tmp`, Docker credentials, private keys or kubeconfigs. Safe raw
preflight logs and failed phase records remain available when no arm package
exists. Force-cancelled jobs may lack finalized records: classify them incomplete.

Audit both independent build digests, native G provenance identity, G gates,
NotFound and actual CREATE responses, rollout/digest and HTTP, cache evidence and
separate cleanup outcomes. Check native Actions logs as well as stored phases.
Then repeat a **development** smoke with `pair=2, order=GR, database_run=$RUN` at the same TARGET to
validate both workflow positions. Neither run is a pilot pair.

Record job time on an **analysis copy**, retaining the immutable original:

```bash
cp -a "$DEST" "$DEST-analysis"
gh api "repos/tfm-goldenpath/golden-path-lab/actions/runs/$RUN/jobs" > "$DEST-analysis/jobs.json"
JOB=$(jq -r '.jobs[] | select(.name=="pair") | .id' "$DEST-analysis/jobs.json")
python3 implementacion/scripts/paired-rg.py job-minutes \
  "$DEST-analysis/pair.json" "$DEST-analysis/jobs.json" --job-id "$JOB"
python3 implementacion/scripts/paired-rg.py analyze \
  "$DEST-analysis/pair.json" --output "$DEST-analysis/analysis-with-consumption.json"
```

These edits deliberately change the analysis copy's hashes, not the original
archive. Raw jobs metadata records setup/action step elapsed times too. Include
all attempt `pair.json` files when calculating total consumption.

A reviewed retry uses the same dispatch inputs plus `-f retry_of="$RUN"`,
`-f external_cause=network-outage` and `-f evidence=G-prepare.log` (use the actual
cause and diagnostic, never copy these blindly). Never use “Re-run jobs”.

## Historical pilot plan and handoff

The provisional recommendation below preceded the separately authorized
[ten-pair campaign](paired-rg-campaign-results.md); it does not supersede its results.

Regenerate without executing:

```bash
make -C implementacion paired-plan
# Default output is ignored evidence/measurements/pilot-plan-v1.json.
diff -u implementacion/measurements/pilot-plan-v1.json \
  implementacion/evidence/measurements/pilot-plan-v1.json
```

The stored seed `paired-rg-pilot-v1-2026-10-01` produces **GR, GR, RG, RG** for
pairs 1–4 by sorting four balanced labelled slots on SHA256(seed:slot).
Pilot dispatch validates pair/order and requires `-f database_run=<reviewed-smoke-run>`. Fix a single source after development review;
execute pilot only with separate authorization. Ten balanced campaign pairs are
provisional. Campaign dispatch now requires the separately frozen and explicitly
authorized plan described in the [campaign guide](paired-rg-campaign.md).
Manual-task calibration, campaign execution and release automation remain
outside this implementation handoff.

## Development verification and contribution

The following records describe the initial implementation and its follow-ups.
The [current review](paired-rg-pilot-review.md) records later executions separately.

Focused regressions cover monotonic endpoints, actual record commands, both arm
orders, failed prepare cleanup, cache drift/rebuilds, exact source identity,
missing phases, classifications, retry bounds and paired calculations. Synthetic
fixtures test orchestration and validators; they do not prove real admission.
The shared environment/unit/policy/offline-cryptographic suite passed locally.
No hosted smoke, real measurement scans, provenance issuance or measured admission
has run. A fresh local doctor check still rejects kubectl 1.37.0 against required 1.35.8.
Focused checks pass: 45 Python measurement tests, 47 Node measurement/readiness/
packaging tests, and nine production workflow policy assertions. The shared suite
passed 877 service/unit tests plus environment, 43 Python policy tests,
Conftest/Kyverno, offline Cosign and static workflow checks. Later packaging and
measurement changes were covered by the focused rerun. Validation logs are stored locally outside Git.

AI assistance: **GitHub Copilot / GPT-6** implemented orchestration, records,
regressions and documentation. Human review and final acceptance: **pending**.


### PR #37 review follow-up

Both code findings were reproduced before correction: retry records omitted the
reviewed diagnostic path, and database reuse accepted pilot artifacts. The runner
now retains the normalized path and requires a successful development source.
Three initialization regressions cover both fixes and permitted development reuse.
The focused suite passes; validation evidence is stored locally outside Git.
GitHub Copilot supplied the review (model not disclosed); Github Copilot / GPT-6
implemented the corrections. Human review and real smoke execution remain pending.

Second PR #37 review: bootstrap and the post-analysis guard now require the
production CycloneDX 1.7 contract. Two regressions reproduced the incompatible
1.6 selection and guard before correction; one invokes the actual renderer.
Historical lane A attribution is restored from main. GitHub Copilot reviewed
(model not disclosed); Github Copilot / GPT-6 implemented the fixes. Validation evidence is stored locally outside Git.
Human review and live smoke remain pending.


## First development attempt: 36924958484

[Run 36924958484](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36924958484),
commit `6fc297929254ba4472d6b3b9f95ebaca667dd508`, passed dependencies, shared
regressions and prepared admission readiness. The first cache warmup failed:
BuildKit could not find `src/` and `package-lock.json`. The historical service
archive was empty because `git archive` ran from the implementation subdirectory.
This is a preparation defect, not a policy rejection or external outage.
Neither arm started its delivery timer or reached native provenance/admission.
Cleanup succeeded; finalization correctly kept the pair incomplete/indeterminate.

The correction exports the unchanged immutable tree from the repository root.
A regression executes the actual preparation commands from `implementacion/`
and checks source/lockfile bytes against that commit plus the current Dockerfile.
It failed before the fix; all 51 measurement tests pass afterward. No live retry
was dispatched, and a successful cache build remains pending.

The downloaded artifact's 20 outer hashes, 42 internal package hashes, and the
allowlisted frozen database archive/checksums/identity were independently verified.
Failure evidence and regression logs are stored locally outside Git. After review
and merge, use a fresh development smoke at the new source; this code defect does
not qualify for an external-failure retry. GitHub Copilot supplied the preceding
PR review; OpenAI Codex / GPT-6 diagnosed and corrected this execution defect.
Human acceptance remains pending.


PR #38 CI run `36926144447` exposed a test setup error: the regression required
a historical project commit absent from CI's depth-1 checkout. It now creates
labelled synthetic Git history and exercises the same production export commands.
All 51 measurement tests pass in a depth-1 clone; restoring the original faulty
export command still fails the regression. CI history requirements and the real
measurement warmup revision remain unchanged. Logs are stored locally outside Git.
OpenAI Codex / GPT-6 corrected the test; human review and live smoke remain pending.
