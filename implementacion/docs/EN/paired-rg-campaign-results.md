# Ten-pair R/G campaign results — 2026-10-04

[Español](../ES/paired-rg-campaign-results.md) · [Protocol](paired-rg-measurements.md) · [Scenario readiness](evaluation-readiness.md)

All **10/10 authorized positions** completed sequentially, with automated technical review before each subsequent dispatch. The existing analyzer reports **OBSERVED_ALL_POSITIONS**, ten favorable pairs and zero excluded attempts, retries, interruptions or missing positions. Technical assessment and archive integrity are **PASS**; **human acceptance and overall evaluation acceptance remain pending**.

## Source, authorization and evidence

The measured source is [`895a3bde79089b7544c1dad76a6cd8f48eede0a8`](https://github.com/tfm-goldenpath/golden-path-lab/tree/895a3bde79089b7544c1dad76a6cd8f48eede0a8), merged PR #45. This later documentation change does not relabel the measurements. Development [RG 37199309814](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37199309814) and [GR 37200632844](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37200632844) passed technical review on that source and contribute **zero campaign samples**.

Francisco supplied explicit authorization for ten exploratory pairs, seed `final-campaign-895a3bd-v1`, order **RG, RG, RG, RG, GR, GR, GR, RG, GR, GR**, plan publication and sequential execution with automated review and stop conditions. The preserved declaration is not an independently authenticated identity or acceptance of the results. The [plan-only publication 37202322661](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37202322661) matches the frozen control and skipped delivery.

- Bound plan: `16de58e45504e333d810d9f891ef740c91d997ed7300927628da8d79f21f73fc`.
- Frozen control: `15c7508d96b05751e9a0913674c03f1ee63f8ca80d989ae5b0a29c2ddb79dc26`.
- Database from RG `37199309814`, restored by development GR and every campaign pair: `trivy.db` SHA256 `f684c51b045908383ef92b1ad55b1723e6f9db6cad7479602f3f51dae6b3c179`; `metadata.json` SHA256 `b13d003bf452cc52343ca98360433ae64e8657e258cf88c332b4ef551e9ca3d8`.

The dedicated [evidence prerelease](https://github.com/tfm-goldenpath/golden-path-lab/releases/tag/evidence-campaign-895a3bd-20261004) at the measured source preserves original development/campaign ZIPs, database archives, frozen authorization, logs, technical reviews, the correction below and combined analysis beyond Actions retention (original artifacts expire 2026-11-03). It is an evidence publication, not a software release or acceptance decision. The authored [evidence index](../../registros/paired-rg-campaign-895a3bd.json) binds run IDs, original ZIP hashes and published asset hashes. Raw evidence remains outside Git.

## Observations

Seconds below are rounded for readability; the [original analysis JSON](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/analysis.json) retains full precision and every exclusion field. All runs are original attempt 1, GitHub conclusion `success`, with technical review and cleanup PASS.

| Position | Order | Run | R primary s | G primary s | G−R s |
|---|---|---|---:|---:|---:|
| 1 | RG | [37202413477](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37202413477) | 5.548 | 52.255 | 46.707 |
| 2 | RG | [37202927807](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37202927807) | 5.523 | 49.643 | 44.120 |
| 3 | RG | [37203375745](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37203375745) | 6.443 | 68.885 | 62.442 |
| 4 | RG | [37203826554](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37203826554) | 6.178 | 57.804 | 51.627 |
| 5 | GR | [37204323164](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37204323164) | 6.127 | 56.830 | 50.703 |
| 6 | GR | [37204709536](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37204709536) | 5.859 | 53.308 | 47.449 |
| 7 | GR | [37205158171](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37205158171) | 6.005 | 67.881 | 61.876 |
| 8 | RG | [37205613639](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37205613639) | 7.941 | 66.495 | 58.554 |
| 9 | GR | [37206042810](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37206042810) | 7.953 | 66.600 | 58.647 |
| 10 | GR | [37206506779](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37206506779) | 7.045 | 74.310 | 67.265 |

Median paired G−R: **55.090 s**; median relative increase: **831.650%**. Median absolute deviation of differences: **7.069 s**; range **44.120–67.265 s**. Observed pair-job time totals **55.717 minutes**. Billed minutes and expenditure are unknown. No outlier was removed.

Primary timing starts immediately before each arm's service tests and ends when its fresh restricted Deployment CREATE returns, before interpreting that response. G includes the native-provenance step and its scheduling gaps. Shared preparation, rollout/HTTP, cleanup and packaging are outside primary time. Functional success after the endpoint is mandatory and checked separately. Whole pair-job time includes both arms and shared work; it is not a billed cost apportioned to R/G. Development and the 24-second plan-publication job are preparation.

## Verification and preserved correction

At the measured source, local `make -C implementacion doctor` and `make -C implementacion test` exited 0 with original logs and actual timestamps. The shared suite covered six environment checks, 930 service/unit cases, 43 Python policy cases, 62 Conftest decisions, Kyverno groups of 36 and 14, and real offline Cosign checks. Each hosted attempt also ran the shared regressions.

Reviews checked workflow/source/dataset/order/attempt, archived arm associations, pinned configuration and actual database bytes; twenty distinct images/builders and cache reuse/rebuild; actual R/G controls; authenticated image/SBOM/native provenance/results and native placement; loaded admission policies, fresh CREATE, rollout/HTTP, monotonic endpoints and owned cleanup. Totals: 360 outer artifact hashes, 2020 internal package hashes, 30 database hashes, **920 recorded technical checks including 110 existing-validator invocations**, 40 distinct bundles reauthenticated and 2657 review-file hashes. These counts describe checks, not independent samples. Existing `paired-rg.py analyze` reverified all ten exports and restored each archived DB; exit 0. Temporary restored databases were removed.

Cleanup snapshots precede cluster destruction. Positions 3/5/6/8 retain completed exit-0 Pods; position 4 retains a running Pod with a deletion timestamp during its grace period. Later strict cleanup receipts and exact owned-node/builder deletion logs pass; no post-destruction Kubernetes query is claimed. An extra review assertion incorrectly required position 4's earlier Pod snapshot to be completed. Its failure and reconciliation with unchanged `paired-cleanup.sh` are retained in `logs/campaign-operations-20261004T122234Z-syFRKt/position-04-cleanup-supplement.json`. No original, timer or control changed; no workflow retry occurred.

Storage checks accompanied preparation, downloads, DB restoration and each review. Cleanup removed only a verified redundant 1,472,086,016-byte historical restored DB whose identical canonical archive remains retained. Workspace free space after analysis was 6.555 GiB; no global Docker prune ran. Publication used the separate `/tmp` filesystem to preserve the workspace reserve.

## Download and review

```bash
# Run from the repository root; use a new directory on a filesystem with space.
df -h . /tmp
df -i . /tmp
EXPORT=$(mktemp -d /tmp/campaign-evidence-895a3bd.XXXXXX)
gh release download evidence-campaign-895a3bd-20261004 \
  --repo tfm-goldenpath/golden-path-lab --dir "$EXPORT"
(cd "$EXPORT" && sha256sum -c SHA256SUMS.txt)
# Follow PUBLICATION-README.md to extract, restore exports and re-analyze.
```

The package contains unchanged originals and separate derived reviews. Only duplicate expanded exports are omitted after byte comparison with the included ZIPs; the publication README gives exact restoration and existing-validator commands. Check capacity before extraction or analysis: allow roughly 6 GiB for download/expansion/one restored DB **in addition to** a 6 GiB reserve. Preserve original hashes and write any new analysis to a new directory. Some original logs contain their original absolute Codespaces paths; restoration does not rewrite them. Earlier handoffs saying publication was pending remain historical snapshots.

## Limits and remaining decisions

- Ten balanced pairs were approved as exploratory, without a precision guarantee. The seeded order begins with four RG pairs and is not alternating.
- The campaign measures legitimate hosted delivery. It does not execute all twenty scenarios, replacements or negative fixtures; unsupported hosted negatives remain **NOT_EXECUTED**. Shared positive checks are not extra L01/L03/L04 samples.
- Omitted large cache blobs cannot be independently restored from these packages. Reviews checked retained manifests, runner hash receipts and build logs. Bundle/content/policy/response validation was repeated; workloads were not replayed or all images rescanned afterward.
- Functional trials, six known scripted repairs, the historical four-pair pilot and this campaign retain separate datasets and sources. Human-effort measurement, eligible manual calibration and limits remain deferred. Scripted records cannot become productivity or human-calibration evidence.
- Human results review and overall acceptance remain pending. A later campaign, source change or retry needs its own decision. Publication and this documentation PR do not supply that decision.

Later thesis alignment must state the exact source/sample/order and timer boundary, separate exploratory delivery overhead from developer productivity and twenty-scenario coverage, and preserve historical failures, unsupported cases and pending acceptance. No thesis files were edited. OpenAI Codex assisted execution, technical review, packaging and documentation; Francisco supplied campaign/publication authorization. Human review of these results is pending.
