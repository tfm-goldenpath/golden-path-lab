# Economic evaluation: observed resource consumption

[Español](../ES/economic-evaluation.md) · [Identity and calculation index](../../registros/economic-evaluation-20261005.json) · [Readiness](evaluation-readiness.md)

**5 October 2026.** This assessment adds a resource-based economic interpretation
of the retained experiments. At the user's request, it includes **no monetary
amounts, tariffs or assumed costs**. Its evidence is elapsed job time, the existing
paired timing measurements and preserved artifact sizes. It establishes the
resources used within those boundaries, without establishing profitability,
productivity or total project expenditure. Human review of this supplement is pending.

[Download the calculation supplement](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/economic-evaluation-resources-20261005.zip)
and its [SHA-256 file](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/economic-evaluation-resources-20261005.zip.sha256).
It contains the small original inputs, calculations, CSV and EN/ES report; the
large original [campaign](paired-rg-campaign-results.md) and [catalogue packages](../../registros/lane_a_corrected_91a33e9_EN.md)
remain in their existing publications.

## Boundaries and method

The campaign, its preparation and the two catalogue attempts retain separate
sources and outcomes. The campaign uses `895a3bde79089b7544c1dad76a6cd8f48eede0a8`;
the successful catalogue uses `91a33e910ee2ba9ded5391393b06ca70005de4d4`. The latter's
different source and databases do not become additional R/G timing samples.
The documentation base for this analysis is `ba56ca91552ac2d508882b191410a578f05d632c`.

For each allocated job, observed seconds equal `completed_at − started_at` in the
retained Actions metadata. Sum these seconds and divide by 60 for job minutes.
Failed allocated jobs remain included; skipped jobs with no runner are listed
separately. Job time is neither CPU time nor active human effort. For parallel
jobs, elapsed execution window means earliest job start to latest job completion;
it excludes the initial queue and differs from the sum of job durations.

The original campaign analyzer supplies the R/G intervals and paired differences.
No new workload, timing pair or manual task was executed. Prior scenario,
cryptographic and database reviews are reused under their original scope; the new
checks concern input integrity, identity and arithmetic.

## Observed execution resources

| Dataset / activity | Source | Runs / allocated jobs | Summed job seconds | Summed job minutes |
|---|---|---:|---:|---:|
| Ten campaign pairs | `895a3bd` | 10 / 10 | 3,343 | 55.717 |
| Development RG and GR | `895a3bd` | 2 / 2 | 698 | 11.633 |
| Plan publication | `895a3bd` | 1 / 1 | 24 | 0.400 |
| Failed catalogue, `37342413975` | `895a3bd` | 1 / 2 | 321 | 5.350 |
| Corrected catalogue, `37353632299` | `91a33e9` | 1 / 2 | 1,294 | 21.567 |

These are distinct inventories, not a pooled experimental sample or a complete
project resource total. They exclude the earlier pilot, scripted repairs, other
development/CI runs, Codespaces, review work and human effort. The index and CSV
identify every included run and job, including the thirteen skipped jobs separately.

The successful catalogue's demo job lasts **834 s** and vulnerabilities **460 s**.
They overlap: the execution window is **835 s (13.917 min)**, while their summed
allocation is **1,294 s (21.567 min)**. The failed catalogue consumed **321 s** of
allocation despite executing zero scenarios; its window was **164 s**. Failure
consumption is retained rather than removed from the record.

## Increment associated with Golden Path controls

The ten original paired observations give a median G−R primary-interval increase
of **55.090 s**, mean **54.939 s**, and range **44.120–67.265 s**. The median relative
increase is **831.650%**, bounded to this synthetic service and short R interval.
These descriptive results provide no precision guarantee or production forecast.

Across the ten pairs, R primary intervals sum to **64.621 s** and G to **614.011 s**.
Their combined **678.632 s** occupy only part of the **3,343 s** of whole jobs.
The remaining **2,664.368 s** fall outside the primary intervals, which omit shared
preparation, readiness, rollout/HTTP, cleanup and packaging. The G primary interval
includes native provenance and scheduling gaps; it is not pure control CPU time.
Shared work is not allocated to R or G. Thus the paired difference is an elapsed
delivery increment, not a complete per-arm resource comparison.

The technical counterpart is the separately demonstrated protection and evidence
coverage: the corrected lane A catalogue passes its twenty scenarios, including
attributable rejections and legitimate recoveries. That evidence does not quantify
incident frequency, losses avoided or human time saved. Shared L01/L03/L04 deliveries
and recoveries remain linked observations rather than independent benefits.

## Preservation resources

Sizes below are the original ZIP payload sizes recorded by Actions, not an account
storage meter or a history of occupied byte-hours. One MiB is 2²⁰ bytes.

| Dataset with artifact metadata | Original artifacts | Bytes | MiB |
|---|---:|---:|---:|
| Campaign | 10 | 1,169,988,488 | 1,115.788 |
| Development RG/GR | 2 | 234,028,888 | 223.187 |
| Failed catalogue | 4 | 77,486 | 0.074 |
| Corrected catalogue | 4 | 246,160,930 | 234.757 |

Plan-artifact size is not included in this bounded inventory. Its absence here is
not a zero-byte observation. For the corrected catalogue, the two separate database
ZIPs account for **241,344,951 bytes**, or **98.044%** of its artifact payload.
The two database tar inventories expand to **2,972,215,852 bytes (2.768 GiB)**.
The suite metadata retains different download times even though the database bytes
match each other; both differ from the campaign database. Preserve both identities.

The recorded retention periods are 30 days for campaign/development artifacts and
14 days for catalogue artifacts. Permanent download supplements also contain
reviews, logs and documentation; their size is a different measurement. Expanded
working copies, images, caches and all other repository storage are outside this
inventory. The concentration of payload in databases identifies the main observed
preservation demand, without authorizing deletion or a change in retention.

## Integrity, interpretation and remaining work

The calculation consumes **46 small preserved files**. The campaign analysis hash
matches its published index; all ten campaign jobs files match the analyzer's
recorded hashes, and catalogue metadata matches its earlier preservation manifests.
Source, run, attempt, runner label and outcome are checked before use. The new
Python calculation agrees with an independent Node computation: **17 allocated
jobs**, thirteen skipped jobs and every group total, including failed-job seconds.
The original analyzer's **55.71666666666667** campaign minutes are reproduced.
Original experiment files and the 4 October human declaration remain unchanged.

This updates the limitation from “no economic analysis” to **a documented resource
assessment without monetary valuation**. The available evidence supports reporting
the observed delivery increment and preservation demand. It does not establish a
financial return, total project expenditure, a human productivity improvement or
the resources a production adoption would require. Those conclusions would need
additional measurements and context; the current instruction excludes costing.
Human evaluation and unsupported hosted negatives remain open. No thesis was edited.

To reproduce the arithmetic after verifying the download checksum and extracting
the supplement into a new directory, run from its root:

```bash
sha256sum -c SHA256SUMS.txt
python3 derived/analyze_resources.py --input-root originals --output-dir recalculated
```

The output directory must not already exist, so earlier observations are preserved.
No credentials or billing data are included in the supplement.

| Activity | Assistance | Human review | Decision |
|---|---|---|---|
| Derive observed resource inventory, check arithmetic, write EN/ES interpretation and preservation supplement | OpenAI Codex / GPT-6 | Pending | Technical calculation PASS; monetary valuation excluded by user instruction |
