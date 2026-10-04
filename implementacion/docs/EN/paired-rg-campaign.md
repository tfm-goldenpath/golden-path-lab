# Preparing an automated legitimate-delivery campaign

[Español](../ES/paired-rg-campaign.md) · [Measurement protocol](paired-rg-measurements.md)

## Scope and pending decisions

Campaign support is implemented; **campaign execution and human acceptance remain
NOT_EXECUTED/pending**. Ten balanced pairs are a draft example and the pilot's
provisional recommendation, not an approved sample size. A person must decide the
count, seed/order, readiness, final source and permission to publish/execute.
This covers one legitimate delivery per R/G arm in lane B, not all twenty
scenarios. R/G means reference/Golden Path; A/B means local/hosted execution.

The completed four-pair pilot and all historical failures are unchanged. The
[guided manual rehearsals](manual-task-rehearsal-review.md) remain ineligible for
calibration. Manual calibration, its three limits, scenario readiness and overall
pilot acceptance are separate; this increment does not complete them.

`paired-rg.py` remains the coordinator over the same shell modules and explicit
native-provenance steps. `paired_campaign.py` validates plan/authorization
contracts; `paired_measurements.py` retains timing/statistics. No timer, cache
recipe, tool pin, signing/trust check or admission rule changes. The protocol's
`campaign.enabled` indicates implemented support, not authorization.

## 1. Prepare an unapproved draft

From the repository root, choose a new ignored directory:

```bash
CAMPAIGN="$PWD/implementacion/evidence/measurements/campaign-draft-01"
CLI="$PWD/implementacion/scripts/paired-rg.py"
python3 "$CLI" campaign-draft --seed example-unapproved-campaign-v1 \
  --pairs 10 --output "$CAMPAIGN/draft.json"
python3 "$CLI" campaign-inspect "$CAMPAIGN/draft.json"
```

Expected: `DRAFT`, ten numbered slots with five RG/five GR, then `NOT_AUTHORIZED`.
The explicit even count must be 2–1000; a separate 60,000-byte frozen-control limit
keeps the workflow input bounded. Neither bound is a statistical recommendation.
The algorithm sorts equally many labelled RG/GR slots by SHA256(seed:slot),
ascending. Seed, algorithm, count and sequence are retained and revalidated.
Changing count/order requires another draft; existing files are not overwritten.

## 2. Validate the final merged source and retain fresh development evidence

Wait until **all preparation PRs are merged**. A clean final source is needed;
do not edit a tracked file to insert its own SHA. Fetch/check out the final main,
then perform these local checks:

```bash
git fetch origin main
git switch main
git pull --ff-only origin main
TARGET=$(git rev-parse HEAD)
test "$TARGET" = "$(git rev-parse origin/main)"
test -z "$(git status --porcelain --untracked-files=no)"
make -C implementacion doctor
make -C implementacion test
```

The next commands require **separate authorization for hosted development**.
First RG acquires/exports the database. Watch, download and audit it before GR:

```bash
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=development -f pair=1 -f order=RG -f expected_source="$TARGET"
gh run list --repo tfm-goldenpath/golden-path-lab --workflow paired-rg.yml --limit 5
read -r -p 'Actual development RG run ID: ' DEV_RG
gh run watch "$DEV_RG" --repo tfm-goldenpath/golden-path-lab --exit-status
gh run download "$DEV_RG" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$DEV_RG" --dir "$CAMPAIGN/originals/development-RG"
python3 "$CLI" verify-export "$CAMPAIGN/originals/development-RG"
```

Review original outer/internal archive checksums, DB bytes/identity, independent
images, cache reuse/rebuild, native provenance/signatures, fresh admission,
rollout/HTTP, endpoints and cleanup. A green job or checksum check alone is not
that review. Preserve originals outside Codespaces before artifact expiry.
After that review and with the same source:

```bash
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=development -f pair=2 -f order=GR -f expected_source="$TARGET" \
  -f database_run="$DEV_RG"
gh run list --repo tfm-goldenpath/golden-path-lab --workflow paired-rg.yml --limit 5
read -r -p 'Actual development GR run ID: ' DEV_GR
gh run watch "$DEV_GR" --repo tfm-goldenpath/golden-path-lab --exit-status
gh run download "$DEV_GR" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$DEV_GR" --dir "$CAMPAIGN/originals/development-GR"
python3 "$CLI" verify-export "$CAMPAIGN/originals/development-GR"
```

Review GR equally, including native provenance in its first position. Neither
development run counts as a campaign pair. Historical pilot DB run `36926824792`
belongs to a different source and cannot replace these checks. If instrumentation
prevents interpretation, stop, preserve the failure, fix/merge and bind a new
plan at the resulting source. Never retry a code defect as an external outage.

## 3. Bind, inspect and freeze with a person's explicit declaration

Binding verifies fresh successful development RG and GR at the current clean
source, arm archive associations/checksums, independent images and the same
preserved database. GR must identify RG as its database source.

```bash
python3 "$CLI" campaign-bind --draft "$CAMPAIGN/draft.json" \
  --expected-source "$TARGET" \
  --development-rg "$CAMPAIGN/originals/development-RG" \
  --development-gr "$CAMPAIGN/originals/development-GR" \
  --output "$CAMPAIGN/bound.json"
python3 "$CLI" campaign-inspect "$CAMPAIGN/bound.json"
```

Expected: `BOUND_PENDING_HUMAN_AUTHORIZATION`, then `NOT_AUTHORIZED` on inspection.
The binding retains source SHA, implementation tree, exact workflow, protocol,
versions/tool-lock hashes, warmup source, database hashes and both development
run/record/manifest identities. Automated validation is not human approval.

Only after personally reviewing this concrete plan and deciding to authorize its
count/order/source/database, a person may run:

```bash
read -r -p 'Your reviewer name: ' CAMPAIGN_REVIEWER
read -r -p 'Your authorization rationale, count decision and limitations: ' CAMPAIGN_REASON
python3 "$CLI" campaign-freeze --plan "$CAMPAIGN/bound.json" \
  --reviewer "$CAMPAIGN_REVIEWER" --rationale "$CAMPAIGN_REASON" \
  --authorize --output "$CAMPAIGN/control"
python3 "$CLI" campaign-inspect "$CAMPAIGN/control/frozen.json"
PLAN_ID=$(python3 "$CLI" campaign-inspect "$CAMPAIGN/control/frozen.json" --identity-only)
```

This writes a separate timestamped `authorization.json`, exact `plan.json`,
`frozen.json` and checksums. Expected: `FROZEN_CONTROL_ID` and
`HUMAN_DECLARATION_RECORDED; no workflow dispatched`. Reviewer and authorization
are human declarations, not independently authenticated facts. An assistant must
not supply them. No overwrite, automatic review or implicit acceptance occurs.
The control identity is SHA256 of canonical JSON; use the printed identity,
not the byte checksum of a pretty-printed file. Source/configuration changes
invalidate the binding and require a fresh plan and development checks.

## 4. Publish the reviewed plan without a delivery

With authorization for this remote evidence operation, use the **same workflow**:

```bash
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=campaign -f pair=1 -f order=RG -f expected_source="$TARGET" \
  -F publish_plan=@"$CAMPAIGN/control/frozen.json" -f plan_identity="$PLAN_ID"
gh run list --repo tfm-goldenpath/golden-path-lab --workflow paired-rg.yml --limit 5
read -r -p 'Actual plan publication run ID: ' PLAN_RUN
gh run watch "$PLAN_RUN" --repo tfm-goldenpath/golden-path-lab --exit-status
gh run download "$PLAN_RUN" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-plan-$PLAN_RUN" --dir "$CAMPAIGN/published-plan"
python3 "$CLI" verify-export "$CAMPAIGN/published-plan"
```

Nonempty `publish_plan` selects a separate job with only contents/actions read
permissions. The delivery job is skipped; required pair/order UI fields are unused
in this publication mode. The job checks native main/source identity, the human
declaration, both original successful development runs via GitHub metadata and
their downloaded exports, then uploads the exact plan/control and a distinct
automated publication receipt. It does not build, sign or deploy an image.

GitHub CLI supports [reading dispatch inputs from a file](https://cli.github.com/manual/gh_workflow_run)
and [downloading a named artifact from a specific run](https://cli.github.com/manual/gh_run_download).
This workflow retains artifacts for 30 days: retain an external copy promptly.
Publication job time is separate preparation effort, not a delivery measurement.

## 5. Execute one separately authorized pair, review, then continue

Do not automate a ten-run loop. Select the next reviewed position and derive its
order from the frozen plan. For the first attempt of a position:

```bash
read -r -p 'Next authorized pair position: ' PAIR
ORDER=$(jq -er --argjson pair "$PAIR" '.pairs[] | select(.pair == $pair) | .order' "$CAMPAIGN/control/plan.json")
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=campaign -f pair="$PAIR" -f order="$ORDER" -f expected_source="$TARGET" \
  -f database_run="$DEV_RG" -f plan_run="$PLAN_RUN" -f plan_identity="$PLAN_ID"
gh run list --repo tfm-goldenpath/golden-path-lab --workflow paired-rg.yml --limit 5
read -r -p 'Actual pair run ID: ' RUN
gh run watch "$RUN" --repo tfm-goldenpath/golden-path-lab --exit-status
gh run download "$RUN" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$RUN" --dir "$CAMPAIGN/originals/$RUN"
python3 "$CLI" verify-export "$CAMPAIGN/originals/$RUN"
mkdir -p "$CAMPAIGN/jobs"
gh api "repos/tfm-goldenpath/golden-path-lab/actions/runs/$RUN/jobs" > "$CAMPAIGN/jobs/$RUN.json"
```

Even after a failed watch, retain/download the actual attempt and diagnose it;
do not skip it in analysis. Review the same evidence boundaries as development
before the next position. The workflow validates plan publication/source/order,
authorization and database binding before infrastructure. It does not implement
a central cross-run position reservation service: an accidental duplicate remains
visible and excluded from timing statistics, never silently selected by speed.

One full-pair retry requires the existing explicit external-failure review. Use
the same plan/source/order, `retry_of=<original-run>`, actual `external_cause` and
retained `evidence` path; **omit `database_run`**, because retry restores the
original database. Preserve both artifacts and the review ticket. Never use
“Re-run jobs”, retry slow/unfavorable controls, or retry again. If identical DB
bytes or interpretable instrumentation are missing, stop rather than bypass guards.

Only after the external cause has been reviewed and the one retry authorized:

```bash
read -r -p 'Original failed run ID: ' RETRY_OF
read -r -p 'Reviewed external cause (registry-outage/network-outage/runner-loss): ' CAUSE
read -r -p 'Relative retained diagnostic path: ' DIAGNOSTIC
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=campaign -f pair="$PAIR" -f order="$ORDER" -f expected_source="$TARGET" \
  -f plan_run="$PLAN_RUN" -f plan_identity="$PLAN_ID" \
  -f retry_of="$RETRY_OF" -f external_cause="$CAUSE" -f evidence="$DIAGNOSTIC"
```

Watch, download and inspect the new run with the preceding commands before
continuing. Keep the original run ID and its job consumption in the analysis.

## 6. Analyze originals without pooling or rewriting them

For each observed run, include its original artifact, plus the original failed
artifact when a retry exists. List every attempt explicitly. Example for one
observed run (repeat `--artifact`/`--jobs` for all the others):

```bash
ANALYSIS="$CAMPAIGN/analysis-01"
python3 "$CLI" analyze --campaign-plan "$CAMPAIGN/control/frozen.json" \
  --artifact "$CAMPAIGN/originals/$RUN" --jobs "$CAMPAIGN/jobs/$RUN.json" \
  --evidence-output "$ANALYSIS" --output "$ANALYSIS/analysis.json"
(cd "$ANALYSIS" && sha256sum -c SHA256SUMS.txt)
tar -czf "$CAMPAIGN/analysis-01.tar.gz" -C "$CAMPAIGN" analysis-01
(cd "$CAMPAIGN" && sha256sum analysis-01.tar.gz > analysis-01.tar.gz.sha256)
```

With no `--artifact`, this produces an empty, visibly partial report. With fewer
positions than planned it reports `PARTIAL`; observing every position is not
human acceptance or all-favorable completion. It reports missing, duplicated,
retry and unresolved positions, all R/G times, classifications/exclusion reasons,
included/excluded attempt denominators, G−R and relative overhead, medians, MAD
and range. Duplicate position/attempt observations remain rows and are excluded;
legacy development/pilot duplicate rejection remains unchanged. Invalid plan,
order, source, authorization or DB combinations fail instead of being pooled.

Analysis verifies outer/internal package hashes, archived arm observations and
the retained database bytes. Artifacts with no pair identity but retained failure records appear separately
under `unfinalizedArtifacts`; no pair or duration is invented. Hard-cancelled
exports without a complete checksum manifest cannot enter verified analysis:
retain their logs outside the verified inputs and keep the position missing until
reviewed. No cleanup or success is inferred from absent data.

Completed pair-job metadata yields observed Actions job minutes; absent job
metadata leaves the total unknown. Repeated input of one run cannot double its
job consumption. Publication/preparation jobs must be reported separately; billed
minutes and monetary expenditure remain null. This does not allocate shared
preparation to either primary timer.

The analysis export contains the exact frozen control, byte-preserved original
pair/failure records and input manifests, retry diagnostics, jobs metadata and
derived observations/analysis, all checksummed. Keep original arm/DB archives
beside it: the analysis is not a replacement for delivery evidence. No historical
task, human review sidecar or frozen manual-task limit is modified.

## Contribution and handoff

Local checks: 26 synthetic campaign regressions and 51 existing measurement
regressions pass. `doctor` and shared `make test` pass (six environment, 929
service/unit cases including Python wrappers, 43 Python policy cases,
Conftest/Kyverno, offline Cosign and workflow checks). A final focused rerun covers
the last analysis guard changes. The 20 new EN/ES Bash blocks pass syntax checks;
168 local links across eight affected guides resolve. No hosted plan publication,
fresh final-source development RG/GR, Kubernetes campaign delivery or campaign
execution was performed. The publication/download API calls are mocked in the
labelled unit tests; remote behavior still requires separately authorized checks.

OpenAI Codex implemented campaign contracts, runner/workflow integration,
explicitly synthetic regressions and EN/ES instructions. Human review and final
acceptance are pending. Local verification is recorded in TODO and
`evidence/environment/paired-rg-campaign/`; synthetic results do not establish
hosted plan publication, final-source development or campaign execution.
