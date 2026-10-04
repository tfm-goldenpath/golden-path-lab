# Preparing an automated legitimate-delivery campaign

[Español](../ES/paired-rg-campaign.md) · [Measurement protocol](paired-rg-measurements.md)

## Scope and pending decisions

The [authorized ten-pair campaign](paired-rg-campaign-results.md) at `895a3bd`
completed with 10/10 favorable pairs and automated technical review. Human results
review and overall acceptance remain pending. Its original plan/evidence are
published separately. The procedure below applies to a **new** campaign: count,
seed/order, readiness, source and remote actions require their own authorization;
the recorded ten-pair approval does not preapprove another sample.
This covers one legitimate delivery per R/G arm in lane B, not all twenty
scenarios. R/G means reference/Golden Path; A/B means local/hosted execution.

The completed four-pair pilot and all historical failures are unchanged. The
[guided manual rehearsals](manual-task-rehearsal-review.md) remain ineligible for
calibration. Human-effort measurement, eligible manual calibration and its limits
are deferred under the reduced scope. Scenario readiness, overall acceptance and
campaign authorization remain separate decisions. See the [twenty-scenario
readiness matrix](evaluation-readiness.md).

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
read -r -p 'Proposed even pair count (10 is provisional): ' CAMPAIGN_PAIRS
read -r -p 'Proposed deterministic seed: ' CAMPAIGN_SEED
python3 "$CLI" campaign-draft --seed "$CAMPAIGN_SEED" \
  --pairs "$CAMPAIGN_PAIRS" --output "$CAMPAIGN/draft.json"
python3 "$CLI" campaign-inspect "$CAMPAIGN/draft.json"
```

Expected: `DRAFT`, the proposed number of slots balanced RG/GR, then
`NOT_AUTHORIZED`. Ten is not preselected or approved.
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
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
test -z "$(git status --porcelain)"
git fetch origin main
git switch main
git pull --ff-only origin main
TARGET=$(git rev-parse HEAD)
test "$TARGET" = "$(git rev-parse origin/main)"
test -z "$(git status --porcelain)"
df -h . /var/lib/docker
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
WATCH_STATUS=0
gh run watch "$DEV_RG" --repo tfm-goldenpath/golden-path-lab --exit-status || WATCH_STATUS=$?
printf 'Workflow watch exit: %s\n' "$WATCH_STATUS"
gh run download "$DEV_RG" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$DEV_RG" --dir "$CAMPAIGN/originals/development-RG"
python3 "$CLI" verify-export "$CAMPAIGN/originals/development-RG"
mkdir -p "$CAMPAIGN/logs"
gh run view "$DEV_RG" --repo tfm-goldenpath/golden-path-lab --log > "$CAMPAIGN/logs/$DEV_RG.log"
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
WATCH_STATUS=0
gh run watch "$DEV_GR" --repo tfm-goldenpath/golden-path-lab --exit-status || WATCH_STATUS=$?
printf 'Workflow watch exit: %s\n' "$WATCH_STATUS"
gh run download "$DEV_GR" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$DEV_GR" --dir "$CAMPAIGN/originals/development-GR"
python3 "$CLI" verify-export "$CAMPAIGN/originals/development-GR"
mkdir -p "$CAMPAIGN/logs"
gh run view "$DEV_GR" --repo tfm-goldenpath/golden-path-lab --log > "$CAMPAIGN/logs/$DEV_GR.log"
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
are human declarations, not independently authenticated facts. An assistant may
record an explicitly supplied declaration when instructed, but must never invent
the reviewer, rationale or decision. No overwrite, automatic review or implicit acceptance occurs.
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
WATCH_STATUS=0
gh run watch "$RUN" --repo tfm-goldenpath/golden-path-lab --exit-status || WATCH_STATUS=$?
printf 'Workflow watch exit: %s\n' "$WATCH_STATUS"
gh run download "$RUN" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$RUN" --dir "$CAMPAIGN/originals/campaign/$RUN"
python3 "$CLI" verify-export "$CAMPAIGN/originals/campaign/$RUN"
mkdir -p "$CAMPAIGN/logs"
gh run view "$RUN" --repo tfm-goldenpath/golden-path-lab --log > "$CAMPAIGN/logs/$RUN.log"
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
artifact when a retry exists. The following selects every retained campaign
attempt directory. Compare the inventory with the workflow run list before
interpreting coverage:

```bash
ANALYSIS="$CAMPAIGN/analysis-01"
ARTIFACT_ARGS=()
JOB_ARGS=()
for ORIGINAL in "$CAMPAIGN"/originals/campaign/*; do
  test -d "$ORIGINAL" || continue
  ARTIFACT_ARGS+=(--artifact "$ORIGINAL")
  RUN_ID=$(basename "$ORIGINAL")
  if test -f "$ORIGINAL/pair.json" && test -f "$CAMPAIGN/jobs/$RUN_ID.json"; then
    JOB_ARGS+=(--jobs "$CAMPAIGN/jobs/$RUN_ID.json")
  fi
done
python3 "$CLI" analyze --campaign-plan "$CAMPAIGN/control/frozen.json" \
  "${ARTIFACT_ARGS[@]}" "${JOB_ARGS[@]}" \
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

## Final-source handoff and incomplete archives

These commands are checked against the CLI and workflow inputs, not executed
hosted validation in this increment. Stop on a failed source/environment guard.
`WATCH_STATUS` preserves a failed run's outcome while allowing evidence download;
never proceed to GR or the next position merely because downloading succeeded.
Review successful final-source development RG and GR before binding. Log downloads
are outside immutable original exports; adding files inside them breaks their
manifest. Inspect capacity before each download and retain an external copy;
never prune original evidence to fit the next attempt.

Archive verification now permits an unstarted arm, a failed/incomplete build or
an image whose execution stopped before admission without requiring unreached
image/start/end fields. It still requires identity/configuration/database and
exact archive-to-arm agreement, checks phase consistency, and rejects false
successful completion. Interrupted admission without a recorded response has
unknown primary duration even when the exit trap closed its phase. Analysis
retains classifications and exclusion reasons; missing time stays null.

The analysis loop includes every directory under `originals/campaign/`, including
failed originals and retries. Move none out to improve results. Unfinalized
exports with failure records remain `unfinalizedArtifacts`; if cancellation left
no valid manifest, retain native logs separately and report the missing position.
Job metadata must describe completed jobs; omit unavailable/incomplete metadata
rather than inventing consumption. Analysis exports do not replace original arm
and database archives. Do not combine development, pilot, remediation or functional
scenario data with campaign observations.

See [evaluation readiness](evaluation-readiness.md) for the twenty-row matrix,
review provenance, deferred human-effort scope and thesis alignment follow-up.

Only the finalizer-derived classification may differ from its archived checkpoint,
and only when it equals recomputation from those same facts (for example, cache
validation failing before the timer). A bootstrap package created before arm-init
can be retained as preparation evidence when neither the pair nor archive claims
an arm observation; it supplies no duration or successful arm. All other recorded
fields and presence must match.
