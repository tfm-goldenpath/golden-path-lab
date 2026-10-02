# Paired R G pilot execution review

[Español](../ES/paired-rg-pilot-review.md) · [Protocol](paired-rg-measurements.md) · [Current status](../../TODO.md)

## Outcome and fixed conditions

The **automated lane B timing pilot is complete**: four sequential pairs ran on
2026-10-02 in the stored GR, GR, RG, RG order. Each artifact was reviewed before the next dispatch. All four attempts are
**valid-favorable**: 4/4 included, 0 excluded/incomplete/retried. No instrumentation
problem prevented interpretation. Human acceptance is pending.

Remote `main` matched `02674a57d290083648a9af44c48fd049808b2d70` before each dispatch
and after the series. Every run used `dataset=pilot`, that exact `expected_source`
and `database_run=36926824792`. Guards, controls, tool pins, acceptance criteria and the plan were unchanged.
All eight independently built images had distinct digests; tool locks and policy
hashes matched across arms. Runners had four CPUs, about 16.8 GB RAM and Docker
28.0.4; effective versions are retained.

## Individual observations and consumption

The primary interval runs from before service tests to the fresh restricted-actor
Deployment CREATE response. It includes G's native provenance and intervening
Actions scheduling gaps. Rollout, HTTP, packaging and cleanup follow that endpoint.
Relative overhead is `100 × (G−R) / R`. Values below are rounded; JSON/CSV retain
full precision.

| Pair | Run | Order | R seconds | G seconds | G−R seconds | Overhead % | Job minutes |
|---|---|---|---:|---:|---:|---:|---:|
| 1 | [36964061878](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36964061878) | GR | 6.618 | 68.689 | 62.072 | 937.986 | 5.833 |
| 2 | [36964593732](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36964593732) | GR | 5.211 | 53.818 | 48.607 | 932.807 | 5.250 |
| 3 | [36965104583](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36965104583) | RG | 7.034 | 69.158 | 62.124 | 883.240 | 5.550 |
| 4 | [36965606734](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36965606734) | RG | 5.910 | 50.405 | 44.494 | 752.805 | 5.417 |

| Measure | Median | Median absolute deviation | Range |
|---|---:|---:|---:|
| R seconds | 6.264 | 0.562 | 5.211–7.034 |
| G seconds | 61.254 | 7.670 | 50.405–69.158 |
| Paired G−R seconds | 55.339 | 6.759 | 44.494–62.124 |
| Paired overhead % | 908.023 | 27.373 percentage points | 752.805–937.986 |

Completed Actions jobs consumed **22.050 observed minutes** in total, with a median
of 5.483 and range 5.250–5.833 minutes. These use each job's `started_at` and
`completed_at`, including setup and both arms. Recorded dependencies, shared
regressions and infrastructure/cache/readiness preparation took 171.297, 167.104,
165.479 and 176.303 seconds in pair order, outside the primary timers. Shared
costs are not allocated to R or G. **Billed minutes and monetary expenditure are
unknown.**

## G phase breakdown and optimization priorities

The four original `pair.json` files provide the phase durations below: **4/4
pairs included, none excluded**. Arithmetic means make the contributions additive;
each share is the sum of that phase divided by the sum of G's primary intervals.
These describe elapsed time, not billed consumption or CPU time.

| G phase | Mean seconds | Range seconds | Share of primary time |
|---|---:|---:|---:|
| Results authorization (`authorize-results`) | 19.08 | 15.40–22.64 | 31.5% |
| Delivery signing and verification (`verify-delivery`) | 16.29 | 13.77–18.55 | 26.9% |
| Deployment admission | 7.87 | 6.01–10.48 | 13.0% |
| SBOM generation and vulnerability analysis | 5.51 | 4.94–6.14 | 9.1% |
| Image build and publication | 5.22 | 4.19–6.53 | 8.6% |
| Native GitHub provenance issuance | 5.19 | 3.69–5.88 | 8.6% |
| Service tests, initial policies, manifest and remaining intervals | 1.36 | — | 2.2% |
| **Primary total** | **60.52** | **50.40–69.16** | **100%** |

The last component includes the residual between the primary timer and recorded
phase durations. Rollout and HTTP average **12.35 s** and **1.16 s** respectively,
after the primary endpoint; neither is included in the table.

**Delivery verification and results authorization account for 58.4% of G's
primary time.** Their names cover several operations: `verify-delivery` signs
and verifies image/SBOM bundles and performs the fresh delivery gate;
`authorize-results` performs another fresh gate before issuance, signs/verifies
results, retrieves the authorized inventory and performs the final gate. See
the [implementation](../../scripts/lib/attestations.sh). Current logs do not time
those operations separately, so they cannot attribute this cost to GHCR, signing
services or individual cryptographic verifiers.

Kyverno logs allow a narrower reconstruction within Deployment admission:

| Evidence verification | Mean seconds | Range seconds |
|---|---:|---:|
| Image signature | 2.01 | 1.39–2.93 |
| Provenance | 1.95 | 1.37–2.53 |
| SBOM | 1.92 | 1.42–2.49 |
| Results | 1.86 | 1.43–2.41 |

For each of the four runs, match `verifying image signatures` to `image
attestations verification succeeded` for each policy, the exact G image and
`Deployment/quotes-node` in `tfm-golden`, inside its recorded admission interval.
Each policy has one start/success pair; these intervals do not overlap. Pod
admission after the endpoint is excluded. These log-derived intervals include
retrieval and verification; they do not separate network and CPU costs. No one
evidence requirement clearly dominates these four observations.

Recommended follow-up, subject to a separate reviewed revision:

1. Add operation timings inside `authorize-results` and `verify-delivery` for
   inventory retrieval, signing/publication and each evidence verifier.
2. Evaluate bounded parallel verification of independent bundles within each
   fresh gate. The [current verifier](../../scripts/ci-verification-gate.mjs)
   processes them sequentially. Preserve fresh retrieval, exact bundle binding,
   error classification and the requirement that every mandatory check passes
   before authorization. Potential savings remain unmeasured.
3. Give the initial workflow/manifest policies lower priority: together they
   average only **0.18 s**. Retain this pilot as the baseline for any future
   optimization comparison; no control or instrumentation change was tested here.

## Evidence review

The review verified four original GitHub ZIP digests, **140 outer hashes, 808
internal package hashes**, and four database archives with their outer checksums,
strict allowlists and **12 internal hashes**. All retained database identities
match the development source: Trivy DB SHA256
`04da019ee567fb7389ec7d4ca9c534ea25feae3b377c4579870b30fd98357120`; metadata SHA256
`193b640a2e0642bb28e900e6e3f64ad83e0382b1b729866caa9c3ec0ca8cd6c3`.

Independent checks covered build digests, isolated builders/cache imports, fixed
application trees, cache manifests and base reuse/application rebuild logs. The
runner checked full cache hashes before each timer; large cache bytes are omitted
from archives, with the immutable recipe retained.

**16 unique image/SBOM/native-provenance/results bundles** were cryptographically
reauthenticated and their digest/content contracts checked, including exact
hosted identity and source. All three fresh G registry gates, SBOM schema, analysis
receipts, report associations and signed evidence hashes passed. All twelve
image/SBOM/results signing operations succeeded on their first attempt.

Readiness and its attributable repository-denial probe, raw NotFound, fresh
CREATE UID/generation/fields, rollout/Ready Pod digests, health/version/quote HTTP,
monotonic endpoints and workload/credential/infrastructure cleanup also passed.
Scans were not repeated during review. These legitimate deliveries do not
establish execution of the twenty-scenario catalogue.

## Development review and preserved failures

In [development GR 36927943550, job 110589806005](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36927943550/job/110589806005),
**Native provenance for first arm G succeeded**. The second-position step was
correctly skipped because that arm was R. Pilot pairs 1–2 show the same behavior;
pairs 3–4 successfully issue native provenance in the second position.

Development [RG 36926824792](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36926824792)
and GR 36927943550 passed review: 70 outer/407 internal package hashes, database
identities and eight authenticated bundles. Their jobs used 5.650/5.983 minutes.
Both remain outside every pilot denominator and total.

[Development failure 36924958484](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36924958484)
remains indeterminate at its original source: cache preparation failed before
both timers. Its original ZIP/logs and 20 outer/42 internal hash review remain
preserved. The initial pilot launch request received HTTP 403 before creating a
job; saved-user authentication resolved that access limitation. It was not a
workflow execution or a full-pair retry. No slow observation was discarded.

## Campaign recommendation and remaining acceptance

**Keep ten balanced campaign pairs provisional.** They remain reasonable for an
exploratory timing comparison: the median paired difference is 55.339 seconds,
but its 44.494–62.124-second spread supports collecting more observations.
G's recorded verification, results-authorization and admission durations varied;
the evidence does not establish a specific external cause. Two observations per
order cannot settle an order effect or the precision of a future estimate.

Extrapolating the observed job range gives roughly **52.5–58.3 job minutes for ten
equivalent timing runs**. This is a planning estimate with no guarantee for future
runs and excludes manual calibration, scenario work and review effort. The final
sample count and required precision need a human decision. No campaign was run.

Completion of this automated timing series **does not close the overall pilot**.
Manual-task calibration, scenario readiness review and human acceptance remain
separate, pending requirements.

## Preservation and contribution

The ignored `implementacion/evidence/measurements/pilot-review/` folder contains
seven original ZIPs, extracted originals, metadata/logs and separate `analysis/`
copies. Combined results: `pilot-analysis.json`, `pilot-observations.csv` and
`series-review.json`. `README.txt` and `DOWNLOAD-SHA256SUMS.txt` support the handoff.
**Preservation outside Codespaces awaits the user’s download.** Development
artifacts expire on 2026-10-31; pilot artifacts on 2026-11-01.

| Activity | Assistance | Human review | Decision | Evidence |
|---|---|---|---|---|
| Development audit, four authorized sequential launches, evidence review, phase breakdown and EN/ES report | OpenAI Codex / GPT-6 | Pending | Automated timing complete; overall pilot and campaign count pending | Linked runs; local review JSON, dispatch records and combined analysis |

The documentation branch is `docs/paired-rg-pilot-review`. Changes to production
controls, tool versions, database contents or measurement instrumentation require
a separate reviewed revision and appropriate verification.
