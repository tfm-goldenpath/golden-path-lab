# Context retrieval pilot — 2 November 2026

**Decision: insufficient evidence; keep current navigation.** Sixteen of eighteen
independent model runs completed; two timed out before emitting a command or
answer. All completed answers met the frozen rubric in a **Codex-assisted review,
not human acceptance**. The same assistant prepared and scored the rubric;
the review was not blinded. B did not consistently reduce input or elapsed time.
None of the C sessions queried the optional graph. A post-run sandbox probe
found its original venv launcher unusable (an interpreter symlink outside the
readable roots). **All six C trials are configuration-invalid for the graph
comparison**, although five produced source-grounded answers. The launcher and
preflight were repaired after measurement; no model trial was repeated. No
causal improvement can be attributed to Graphify, and no monetary or productivity
saving is established. No mandatory follow-up benchmark is proposed.

[Español](../../ES/maintainers/context-retrieval.md) ·
[Protocol and rubrics](../../../implementacion/tests/fixtures/context-retrieval/protocol.json) ·
[Runner/analyzer](../../../implementacion/tests/integration/context-retrieval.py) ·
[Synthetic tests](../../../implementacion/tests/policies/test_context_retrieval.py) ·
[Roadmap](../../../implementacion/TODO.md#g-context-retrieval-pilot-perfcodex-context-retrieval)

A contributor keeps the existing instructions and tools. This change adds an
explicit research command, not a service, default index, new security decision or
normal CI model call. `AGENTS.md`, product/laboratory behavior and global pins are
unchanged. The admission investigation remains **INCONCLUSIVE**; merged PR #68
is not approval of its adoption or human review.

## Frozen comparison

Source: `a6cda3203f0ab39ac5d37569d851ae35f9d4068c` (updated main, PR #68 merge).
All modes read the same 464 tracked files exported from Git blobs. Historical
`implementacion/registros/`, `releases/` and `evidence/` were excluded explicitly;
ignored data, dependencies and personal files were never copied. Workflows,
policies, tests and source documentation stayed in scope. New rubrics, answers,
results, tools and graph output live outside that corpus. Each file has a SHA-256
receipt; source and index hashes are checked between sessions. Original npm files
unrelated to this work stayed untracked and untouched.

- **A:** existing repository instructions and available tools, including rg/jq.
  No forced full-file reads or deliberately poor baseline. The current repository
  map already describes selective inventory consultation; A chose its own reads.
- **B:** A plus the short discipline in the protocol: paths first, scoped searches,
  selective jq ownership/caller/test queries, source confirmation, relevant
  excerpts, explicit `.github`, tests/policies retained and generated data avoided.
- **C:** exactly B plus a short optional `graphify explain/path` recipe. The graph
  only suggests locations; original code/tests are authoritative. No answers or
  extra skill are supplied. No trial used it; a later probe found its launcher inaccessible in the sandbox.

Three source-checked questions cover results authorization, F11's two privilege
controls and delivery-v1 resource ownership/retirement. Each rubric freezes
essential facts, paths/symbols, relations, tests, invalidating confusions and
execution limits. Alternate correct references/wording are accepted. Accuracy,
coverage and traceability are each scored 0–2; file mentions alone earn no fact
credit. The same approximately 250–350-word English answer request applies to all
modes (actual answers sometimes exceed that soft target).

Explicit configuration: **Codex CLI 0.166.0, `gpt-6-astra`, reasoning `high`**;
existing ChatGPT authentication, no provider/key/model change. rg 15.2.0, jq 1.7,
Python 3.14.2. The actual backend routing/model identifier is not independently
exposed by these events. Sessions use `exec --json --ephemeral --ignore-user-config
--ignore-rules`, no daemon, no delegation/hooks/plugins/apps/web, and a custom
read-only filesystem profile with network disabled for commands. Minimal runtime
paths, the corpus and graph are readable; result/rubric/history directories are
not mounted into command access. Personal configuration/authentication is not
copied or modified. The common task explicitly forbids external sources. This is
an observed trace audit plus sandbox restriction, not a syscall-complete read log.

The excluded smoke run verified capture and attempted an outside read: an
existing host `../protocol.json` returned no content (ENOENT in the restricted
filesystem, not an EACCES assertion). It also exposed a Codespaces login-shell
PATH issue. All 18 measured sessions instead used `allow_login_shell=false`;
this difference is recorded, with the original smoke retained. The frozen order
is in `protocol.json`: ABC/BCA/CAB for repetition 1, CBA/ACB/BAC for repetition 2.
One measured session ran at a time, timeout 180 seconds, without retries or competing
builds/model sessions. Both timeouts contain only `thread.started`/`turn.started`;
their cause is unresolved, and is not attributed to retrieval or Graphify.

## Observed results

The table reports input tokens for completed runs and **elapsed time for all
attempts**, including timeouts. **C rows are descriptive records of invalid
configurations, excluded by the analyzer from valid comparisons.** Medians and
ranges are shown; n=2 per cell except
where one timed out. Raw records retain every attempt and the excluded smoke.

| Question/mode | Completed | Input median [range] | Seconds median [range], all attempts |
| --- | ---: | ---: | ---: |
| Q1-A | 2/2 | 219,868.5 [219,108–220,629] | 108.5 [106.7–110.2] |
| Q1-B | 2/2 | 237,989.0 [200,588–275,390] | 115.6 [93.9–137.3] |
| Q1-C | 1/2 | 249,801.0 [249,801–249,801] | 137.6 [95.2–180.0] |
| Q2-A | 2/2 | 218,003.0 [206,921–229,085] | 73.9 [61.4–86.5] |
| Q2-B | 2/2 | 237,295.5 [192,608–281,983] | 105.8 [97.9–113.7] |
| Q2-C | 2/2 | 190,011.5 [181,592–198,431] | 71.2 [65.3–77.1] |
| Q3-A | 2/2 | 216,340.0 [193,010–239,670] | 60.4 [58.1–62.7] |
| Q3-B | 1/2 | 152,653.0 [152,653–152,653] | 127.5 [75.0–180.0] |
| Q3-C | 2/2 | 163,785.5 [162,732–164,839] | 78.2 [76.6–79.9] |

Q1 = results; Q2 = F11; Q3 = cleanup. Q1-2-C and Q3-2-B timed out.
All 16 completed answers scored 2/2 on each dimension; review notes identify
correct relationships, test boundaries and limitations, not just matched paths.
Notably, F11 answers distinguished the active `scenario_runtime_negative` route
from the retained `scenario_f11_admission` helper. Cleanup answers identified
uncovered volume/transport branches and the diagnostic command-status limitation.
No contaminated reads, network tools or delegation were observed. Exact file
access is not exhaustively exposed; literal paths in commands are retained as
candidates, not proof that every mentioned file was read.

Known totals for **16 completed measured runs only**: 3,369,040 input tokens,
2,745,728 cached input tokens, 25,447 output tokens, 949 reasoning output tokens.
The two timeouts' usage is **null/NOT_AVAILABLE**, not zero; these are not totals
for all consumption. The smoke is excluded (78,344 / 55,040 / 619 / 53 respectively).
`turn.completed.usage` supplies one turn aggregate; the analyzer never sums
cumulative snapshots, deduplicates identical terminal events and rejects
ambiguous multiple terminals. Cached input is a subset of input and is not added.
Reasoning is reported separately, not added to output. A fresh session does not
guarantee an uncached provider request. Separate token counts for added
instructions, tool metadata or source output are not exposed: **null**; all are
included in observed session usage. Graph query results read by C: none.

B has no stable advantage in this small sample; C's smaller counts on some
questions cannot demonstrate a graph benefit without a usable launcher or a graph
query. Eleven completed A/B runs remain eligible for comparison; the C answers
and both timeouts remain visible with their exclusions. Do not rank
modes by pooling unlike questions or discard the two timeouts to claim savings.
Retain the concise B variant as a reproducible experiment, without adding it to
mandatory navigation instructions. Graphify is not added to the default image.


## Quality validation correction — 3 November 2026

The original analyzer treated any non-null `quality`, even `{}` or a partial
review, as sufficient. It now requires integer scores **0–2**, excluding booleans,
for `accuracy`, `coverage` and `traceability`, plus an explicit
`invalidating_confusions` list. An empty list declares none of the question's
protocol-defined confusions; a nonempty list names the observed confusions using
the protocol labels. Missing declarations, malformed lists or unknown labels
make the review incomplete/invalid. Original review data is never filled in.

Each row separates `technical_complete`, `configuration_valid`, `isolation_valid`
and `quality_review_complete`. `quality_satisfied` conservatively denotes full
rubric satisfaction: **2 in all three dimensions and no declared invalidating
confusion**. It is unknown for an incomplete review, except that an explicit
invalidating error rules out satisfaction. `answer_acceptable` additionally
requires a technically complete execution and valid configuration/isolation.
This mechanical classification is not a new review, human approval or adoption.

`valid` / `n_valid` mean comparison eligibility, **not an acceptable answer**.
A complete unfavorable review remains eligible and its tokens/time stay in the
statistics; `n_acceptable` and `n_unfavorable` separate those outcomes. A comparison
can be complete while containing incorrect answers. Invalid/incomplete reviews
prevent comparison completeness, with `quality_review_errors`,
`quality_rejection_reasons` and `exclusion_reasons` retained alongside every
attempt. Timeouts and invalid C configurations cannot be rescued by good scores.

Offline reanalysis of all 18 existing attempts found **no changes to existing
aggregates or eligibility**: 16 technical completions, 12 valid configurations,
18 valid isolation audits, 16 complete reviews and 11 eligible/acceptable answers
(A: 6, B: 5, C: 0); no eligible unfavorable answer in these historical records.
Both timeouts have incomplete quality scores and all six C configurations remain
excluded. `comparability` remains **INCOMPLETE**. No reviews were invented or
repeated; the existing sixteen reviews already contain three 2s and explicit
empty confusion lists. The original 274 file hashes and historical archive hash
were verified unchanged before and after reanalysis.

New derived files only:
`implementacion/evidence/raw/context-quality-reanalysis-20261103/analysis.json`
and `comparison.json`, with validation logs and hashes in that separate directory.
Derived analysis SHA-256:
`d8081810eebfa6ce34d8fe66a75c5bd83fa07d4c94f1d443f2a898b97c58d9af`.
Reproduce without model/tool execution, choosing a fresh output filename:

```bash
python3 implementacion/tests/integration/context-retrieval.py analyze \
  --output implementacion/evidence/raw/context-retrieval-20261102 \
  --analysis-output /tmp/context-quality-review-NEW.json
```

`--analysis-output` uses exclusive creation and refuses an existing file; the
historical `analysis.json`, raw records and package stay intact. Without this
option the original initial-analysis behavior remains. The 22 focused synthetic
tests include empty/partial/invalid reviews, favorable and unfavorable complete
reviews, explicit invalidating errors, all score types/ranges, independent status
axes and preservation of inputs/new outputs. Doctor and the shared suite pass;
ownership validation (530 paths), its 10 tests, local links and diff checks pass.
No new model sessions, installs,
index builds or Kubernetes were performed. The decision stays **insufficient
evidence**, without Graphify adoption or AGENTS changes. Corrected C model
measurements remain **NOT_EXECUTED**; a local launcher test is not a model trial.

## Runner robustness corrections — 3 November 2026

Two further review findings on `21cbd04c292f3b9da8eb02cbeec092276d9558c1`
are corrected in the same PR. These are runner corrections, **not new retrieval
performance evidence**, and do not change the earlier quality-review rules.

- **Interruption after process creation:** `capture()` now finalizes from a
  successful `Popen()` through stdin handling and polling. It signals only its
  newly created process group, retains the direct child unreaped until signaling
  to avoid PID reuse, then reaps it and checks group absence with a bounded wait.
  An already-absent group still requires reaping/reporting. Partial stdout/stderr
  and the process receipt survive; cleanup records reaping, group absence and
  errors separately. Unestablished cleanup is `INCOMPLETE`, never claimed as
  success. Unavailable exit status/RSS stay null. The original interruption or
  execution exception propagates after finalization; secondary cleanup/receipt
  errors do not replace it. `run()` retains an `INTERRUPTED` attempt `result.json`
  when storage is writable, and does not start another attempt after Ctrl+C.
- **Malformed nested events:** the parser checks event/item objects, nonempty
  string IDs/types and string agent-message text before consuming them. Optional
  fields remain optional; unknown string item types remain visible to the
  isolation audit. Malformed entries retain their original line numbers, including
  repeated malformed entries, while later valid events preserve diagnostics and
  observed usage. Original JSONL is unchanged. A normally exited malformed stream
  becomes `INVALID_STREAM`; interruption, timeout and execution error retain
  precedence, with malformed lines and invalid usage recorded independently.
  The coordinator writes the attempted result and preserves authentication/quota
  stop behavior. Terminal deduplication and unknown-token accounting are unchanged.

The 32 focused synthetic tests pass, including isolated wrapper/child/grandchild
SIGINT tests during polling and blocked stdin, partial-output and both-receipt
checks, no subsequent attempt, owned-worker absence, the child-exit race, cleanup
failures preserving the original exception, malformed nested values and batch
result persistence. Test-only Linux subreaping removes adopted grandchildren;
the runner reports residual group members (including unreaped zombies) as
incomplete cleanup rather than asserting their absence. Cleanup is limited to
members remaining in the created group; it is not a general process supervisor.
It cannot preserve receipts on unwritable storage or finalize after SIGKILL.

Offline reanalysis is retained separately under
`implementacion/evidence/raw/context-runner-robustness-20261103/`:
`analysis.json`, `parser-replay.json`, `comparison.json`, reproduction code and
validation logs. All **19 original streams** (18 attempts plus excluded smoke)
have unchanged classifications, observed usage, answers and diagnostics. The new
analysis is byte-identical to the preceding quality reanalysis: SHA-256
`d8081810eebfa6ce34d8fe66a75c5bd83fa07d4c94f1d443f2a898b97c58d9af`.
All 274 original files and their archive members verify against the historical
manifest; the original package/hash remain unchanged. An initial offline archive
check used ambiguous suffix matching; its failed check is preserved, followed by
successful exact-member verification. No historical execution is attributed to
these changed runner bytes; the new receipts record their own source hashes.

Validation: 32 focused tests, `doctor`, the shared `make test` suite, exact
ownership inventory, 10 inventory tests, affected local links and `git diff
--check` pass. Doctor/shared tests use
`PATH="$PWD/implementacion/.tools/bin:$PATH"`. Effective capacity remains 4 CPUs,
15 GiB RAM and approximately 8.6 GiB workspace free, above the 3 GiB reserve.
The interruption regressions create and retire only their own temporary Python
processes.
No model session, Graphify/index build, installation or Kubernetes execution
occurred. Comparison remains `INCOMPLETE`: 11 eligible/acceptable A/B answers,
two retained timeouts and six excluded C configurations. Complete unfavorable
reviews still remain observations; incomplete reviews cannot complete a comparison.
**Insufficient evidence to change navigation; no Graphify adoption or AGENTS
change; corrected C model measurements remain NOT_EXECUTED.** A local launcher
check is not a model measurement. Codex assisted these corrections; human review
remains pending.

## Stdin deadline and fatal cleanup corrections — 3 November 2026

The two review findings on `2123f515ecd9affe97ed3cf3b6f0fe0fb9b2ad54`
are corrected in the same PR. `capture()` encodes the prompt as exact UTF-8 bytes
into a context-managed temporary file, flushes/rewinds it before starting the
child, and supplies that descriptor as stdin. No input still uses DEVNULL.
There is no parent pipe write waiting for the child to read; a non-reading child
cannot prevent the deadline loop from running. EOF, Unicode and byte content are
preserved, and the file closes on success or exception. Prompt preparation occurs
before the execution deadline; reported elapsed time still includes preparation.
The execution timeout permits up to 0.1 seconds of polling delay, followed by at
most 2 seconds of cleanup waiting, apart from OS scheduling and I/O delays.

Unconfirmed cleanup is now fatal to **every capture caller**, even when the child
exited zero: save the truthful process receipt, then raise `CleanupIncomplete`
carrying `capture_result`. An earlier interruption/execution exception remains
primary, with cleanup diagnostics retained separately. The coordinator records
an ineligible failed attempt before propagating; index and preflight callers also
stop rather than advancing. Signaling still precedes reaping the direct child,
preserving protection against process-group ID reuse.

All 37 focused synthetic tests pass, including a 2 MiB unread prompt with a short
timeout and no operator interrupt, exact large Unicode/EOF delivery, descriptor
closure, and fatal incomplete-cleanup receipts and caller stopping. Simulations
first actually retire the real owned process, then alter its cleanup receipt;
no worker is deliberately left alive. Previous interruption, malformed-stream,
exit-race and unfavorable-quality regressions remain covered. Doctor, the shared
suite, inventory/its 10 tests, 10 affected local links and diff checks pass.
Validation and any derived analysis are separate from the immutable pilot under
`implementacion/evidence/raw/context-stdin-cleanup-20261103/`.

No model sessions, Graphify installation/index build or Kubernetes execution
occurred. These corrections do not establish retrieval performance: **insufficient
evidence to change navigation**, no AGENTS change or Graphify adoption; corrected
C measurements remain **NOT_EXECUTED**. The earlier cleanup scope/storage/SIGKILL
limitations still apply. Human review remains pending.

## Token-counter validation — 3 November 2026

The review against `2444cf8de096767ed10c56d27e2aad7e2f1b8da8` found that
invalid supplied counters could become null while the stream remained COMPLETE.
`parse_events()` now validates every non-null value in all four `TOKEN_FIELDS`
as an actual nonnegative integer. Booleans, negative integers, strings, floats
(including integral-looking floats), lists and objects are rejected without
coercion. `usage_errors` records the original line, field and reason. Invalid
usage prevents completion as `INVALID_USAGE`, except when interruption, timeout,
execution error or `INVALID_STREAM` has higher priority. The cached-input bound
and terminal deduplication remain; distinct terminal snapshots are never summed
or selected, but invalid counters in them still receive diagnostics.

Absent/null usage or counters remain unknown; valid zero remains a measurement.
`usage_complete` continues to describe successful stream completion, not the
availability of every counter. Metric sample counts exclude unknown values and
include zero. A malformed-usage attempt stays visible but is excluded from eligible
token/time comparisons even with valid configuration, isolation and a complete
favorable review. Descriptive all-attempt timing retains it. Fully reviewed
unfavorable answers with valid measurements remain eligible observations.

All 42 focused tests pass, including every field/type/range, unknown/container
cases, precedence/deduplication and the parser → record → analyzer path. The
previous fatal-cleanup implementation was **verified unchanged**, including
receipt persistence, caller stopping and original-exception precedence; its
still-open review thread does not require another cleanup rewrite. Doctor, the
shared suite, exact inventory/10 tests, 10 affected local links and diff checks
pass. No model, Graphify/index or Kubernetes execution was performed.

Historical impact was checked from **all 19 original JSONL streams**, not merely
old normalized results. Fresh results retain original configurations, reviews and
exclusions in `implementacion/evidence/raw/context-token-validation-20261103/`.
`replay.py`, `stream-comparison.json`, `comparison.json`, `replayed/` and
`replay-analysis.json` preserve reproduction and diagnostics. No malformed usage
was found; classifications, usage, eligibility and aggregates are unchanged.
Derived analysis SHA-256 remains
`d8081810eebfa6ce34d8fe66a75c5bd83fa07d4c94f1d443f2a898b97c58d9af`:
A=6, B=5, C=0 eligible; both timeouts and all six invalid C configurations remain.
The 274 original file hashes/archive members and package hash verify unchanged;
replay source hashes are separate from historical execution identities.
**Insufficient evidence to change navigation** remains the conclusion, with no
Graphify adoption or AGENTS changes; corrected C measurements remain
**NOT_EXECUTED**. This is parser hardening and offline replay, not new performance
evidence. Human review and durable evidence custody remain pending.

## Graphify provenance, coverage and cost

Official sources consulted on **2026-11-02**:
[repository/release](https://github.com/Graphify-Labs/graphify/releases/tag/v0.9.100),
[PyPI metadata](https://pypi.org/pypi/graphifyy/0.9.100/json),
[Codex non-interactive execution](https://learn.chatgpt.com/docs/non-interactive-mode),
[permissions](https://learn.chatgpt.com/docs/permissions),
[configuration](https://learn.chatgpt.com/docs/config-file/config-reference).
Local CLI help and observed events were checked, not merely copied from docs.

Pinned package `graphifyy==0.9.100`, official annotated tag object
`cb103fb4356d0a9deaaf61dfc4530e4106a8c0a9`, commit
`f5155badddaa3286c78a51653791131e9e2e4d29`. The PyPI wheel SHA-256 was verified
**before execution**:
`64c5ed6f2dcc8c28b6a96c87023851c1644c16f55a87f45dbc9127119eb6e769`.
This records tag/package provenance, not a bit-reproducible build from the tag.
The isolated venv used only wheels and no extras; `install.json` records resolved
transitives, versions, download origins and archive hashes. No integration
installer, skill, hook, personal configuration or default image was changed.

Inspection of the downloaded package confirms `GRAPHIFY_BACKEND=none` disables
LLM work, `GRAPHIFY_QUERY_LOG_DISABLE=1` overrides query logging, `--code-only`
skips semantic/document extraction, `--no-cluster` skips communities and
`--max-workers 2` bounds AST workers. These settings were used for extraction,
query and update outside the model sessions. No embeddings, local model, cloud, MCP or watcher was used.
`--out` is a root: this version writes `graphify-out/graph.json` beneath it.
An initial receipt lookup at the wrong output path failed after a successful
build; the failure was retained and corrected without repeating extraction.

| Operation | Observed wall time | Memory / storage |
| --- | ---: | --- |
| Wheel/dependency installation (venv creation separate) | 8.64 s | 128,216 KiB child high-water; venv 204 MiB |
| Initial extraction | 9.11 s | 164,728 KiB max RSS; output 9.4 MiB including caches |
| Independent `explain environment_cleanup` query | 0.50 s | 56,912 KiB max RSS |
| Update probe's independent baseline | 8.92 s | 164,628 KiB max RSS |
| One-file incremental extraction | 2.90 s | 71,852 KiB max RSS |

The wheel download's separate elapsed time was not captured (**null**).
Installation memory is a child high-water upper bound including preceding venv
creation; it is not claimed as isolated install RSS. `/usr/bin/time` was absent;
that failed invocation is retained. Extraction/query/update used Python `wait4`
for process RSS. Venv creation took a separate 3.96 s (75,164 KiB child high-water). Tool
preparation is separate from Codex time/usage. Session elapsed includes CLI
startup, model latency and commands; pure search time and per-command duration
are not exposed by these events and remain null.

The graph contains 2,704 nodes/7,346 edges. Extraction classified 275 code files,
skipped 151 non-code files and reported 30 unclassified files; nodes reference
253 unique source files. Ten classified code files explicitly yielded no symbols.
The detector's counts are not a claim of full 464-file coverage. Nodes cover
Python, JS/MJS/CJS, shell and some JSON/YAML; no Rego nodes were observed. Makefile
and Dockerfile were explicitly unclassified. Dynamic shell relationships are
incomplete: the independent cleanup query returned its definition and one call
edge, not the full ownership/retirement behavior. rg/jq and source inspection
remain necessary.

Update used a separate copy of tracked source only, with its own fresh index:
append `contextRetrievalUpdateProbe` in `quote.js`, then repeat extraction. Logs
report **1 changed, 274 unchanged**, and the new symbol is present. This is an
observed incremental update, not a full rebuild claim. The main corpus/index
remained unchanged. No evidence, databases or complete caches were copied.

## Reproduction and conservation

A post-measurement check with `codex sandbox` and the exact measured filesystem/
network rules returned **127** for the original Graphify launcher. Its Python
symlink targeted `/home/codespace/.python/current/bin/python3`, which was not
visible there. This was not an observed reason for the model choosing not to
query the graph. Recreating only the owned venv interpreter with canonical
Python and `--copies` made the same query succeed. Original failure, interpreter
metadata and successful repair receipts are retained; no measured observation
was replaced. The final runner now performs this local sandbox preflight **before
any model call** and fails closed. Its passing local preflight is distinct from
the still-invalid historical C comparison. A mistaken `sandbox linux --help`
probe (this CLI uses `sandbox` directly) is also recorded; it ran no model.

The runner's `prepare`, `index`, `smoke`, `run`, `analyze` operations are explicit.
Ordinary unittest discovery never calls Codex, downloads tools or builds a graph.
Use a new output directory; existing observations are never overwritten/retried.
Keep at least 3 GiB free on both workspace and temporary storage. Check CPU,
memory, space and inodes before/after installation, indexing and measurement;
stop other model sessions/heavy workloads during measurement. Do not alter the
CLI, model or provider midway. This task requires no Docker resources.

Install the pinned wheel in a new isolated environment, after verification:

```bash
set -euo pipefail
PILOT_TOOLS=$(mktemp -d /tmp/context-tools-XXXXXXXX)
export PILOT_TOOLS
"$(readlink -f "$(command -v python3)")" -m venv --copies "$PILOT_TOOLS/venv"
python3 - <<'PY'
import hashlib, json, os, pathlib, urllib.request
root = pathlib.Path(os.environ['PILOT_TOOLS'])
metadata = urllib.request.urlopen('https://pypi.org/pypi/graphifyy/0.9.100/json').read()
(root / 'pypi.json').write_bytes(metadata)
asset = next(a for a in json.loads(metadata)['urls'] if a['filename'].endswith('.whl'))
data = urllib.request.urlopen(asset['url']).read()
expected = '64c5ed6f2dcc8c28b6a96c87023851c1644c16f55a87f45dbc9127119eb6e769'
assert hashlib.sha256(data).hexdigest() == expected == asset['digests']['sha256']
(root / asset['filename']).write_bytes(data)
PY
"$PILOT_TOOLS/venv/bin/pip" install --no-cache-dir --only-binary=:all: \
  --report "$PILOT_TOOLS/install.json" "$PILOT_TOOLS/graphifyy-0.9.100-py3-none-any.whl"
export PILOT_OUTPUT="$PWD/.context-retrieval/pilot-$(date -u +%Y%m%dT%H%M%SZ)"
python3 implementacion/tests/integration/context-retrieval.py prepare --output "$PILOT_OUTPUT"
python3 implementacion/tests/integration/context-retrieval.py index --output "$PILOT_OUTPUT" \
  --graphify "$PILOT_TOOLS/venv/bin/graphify"
python3 implementacion/tests/integration/context-retrieval.py smoke --output "$PILOT_OUTPUT" \
  --graphify "$PILOT_TOOLS/venv/bin/graphify" --allow-model
```

Review the smoke trace and record the actual isolation audit in its `result.json`
(`audit.status=VALID` only after inspection, with reason/reviewer). Then:

```bash
python3 implementacion/tests/integration/context-retrieval.py run --output "$PILOT_OUTPUT" \
  --graphify "$PILOT_TOOLS/venv/bin/graphify" --allow-model
python3 implementacion/tests/integration/context-retrieval.py analyze --output "$PILOT_OUTPUT"
```

After all runs, review each trace and answer against the frozen rubric; record
`audit` and `quality` explicitly before a final analysis. A COMPLETE event alone
is not quality approval. The analyzer initially excludes pending/contaminated
reviews and retains their rows. Missing runs, errors, timeouts, malformed streams,
changed configuration and stale indexes cannot become successes. No provider
credentials are copied. Future independent reproduction may resolve different
transitive wheel versions. For an exact wheel replay on this platform, install
with `pip install --require-hashes --only-binary=:all: -r
receipts/graphify-requirements.txt` from the verified package. Otherwise compare
its install receipt and do not silently pool changed configurations.

Evidence: `implementacion/evidence/raw/context-retrieval-20261102/` and
`implementacion/evidence/packages/context-retrieval-20261102.tar.gz` (ignored).
Package SHA-256: **b6c62a1ffd9896057c0fbd00b606ac8f6451f3f1504f86398665b3a4796932df**.
It preserves protocol, source manifest, original JSONL/stderr, prompts/answers,
capture records, derived reviews/metrics, official-source receipts, public graph,
failed preparation attempts, executed uncommitted code/hashes and validation/
cleanup receipts. No binaries, venv, private credentials, provider cache, personal
Codex directories or laboratory evidence are included. Regenerating a graph/run
from Git is not recovery of these historical observations; retain the package
outside the Codespace for durable custody. No external evidence upload was made.

The original measured runner's hash is preserved in `executed-source.json` and
per-run configuration, separately from later analyzer/index-command hardening.
No model run is attributed to the eventual commit. Final code validation hashes
and original code snapshots are retained. EN/ES documentation and inventory
checks accompany the focused/shared suites. No Kubernetes or hosted integration
was executed; neither is relevant to validating this navigation tool.

Capacity stayed above the reserve: workspace/Docker started at approximately
8.7 GiB free and ended at 8.6 GiB; temporary storage went from approximately
109 GiB to 108 GiB free. The environment exposed 4 CPUs and 15 GiB memory. Docker had no containers; its three existing images
and three volumes were preserved. Optional Graphify tools/index/update copies
are retired only after package verification, using the task's creation receipt.
There is no runtime adoption to revert: remove the experimental files/links if
retiring the runner, preserve historical evidence, and leave product paths alone.
Human review and any future adoption remain pending.
