# F09 / F10 / L05 implementation and validation

Subsequent PR #24 execution/comment review and local corrections are recorded
[separately](pr24_review_EN.md). The original implementation-session observations
below refer to changes subsequently committed as `d337a3c`.

Date: 2026-09-29. Branch: `test/f09-f10-l05-provenance`.
Base: `38631e14a6f44838b32c959f138c13ac06b5cecd` (`main`). Changes remain in the
working tree for review. Human review and final decision: **pending**.
Milestone: Scenario coverage and pilot; no pilot or campaign measurements.

## Acceptance and implementation

The [oracle](../docs/EN/cases/F09-F10-L05/record.md) was written before implementation
from the user's specified expectations. The thesis documentary revision was not
independently established. The [EN](../docs/EN/cases/F09-F10-L05/runbook.md) and
[ES](../docs/ES/cases/F09-F10-L05/runbook.md) runbooks describe the shared procedure.

- F09 removes only mandatory provenance in an owned local replacement inventory.
  CI requires complete retrieval and authentication/content acceptance of all
  unrelated evidence before attributing absence.
- F10 prepares a labelled laboratory provenance fixture with the trusted local
  signer and target digest, altering only the selected repository field. The
  exact prepared and received bundles must authenticate before content evaluation.
  OCI plan validation, unchanged non-target bytes, original inventory restoration
  and fresh verification constrain the trial.
- The gate and admission require explicit repository, exact revision, build type
  and builder. Hosted builder equals configured workflow identity; certificate,
  issuer, source ref/digest, runner and transparency requirements remain intact.
  Wrong subjects/signatures, malformed inputs, duplicate evidence, transport and
  other authorization failures remain integration errors, never F09/F10 success.
- Directed admission follows valid results issuance, checks unchanged policies and
  trust, requires the singleton intended provenance rule and a precise diagnostic,
  then restores, freshly verifies, admits, observes rollout and checks HTTP.
  Both original and recovery failures are retained.
- L05 selects two explicit immutable commits on recorded local `main`, requires
  distinct application trees and exports actual blobs without changing checkout or
  index. Each revision has separate fresh source/control tests, builds, scans,
  signatures, provenance, results, exact revision policy, admission and HTTP checks.
  Exported content is checked against selection hashes before building.
- Existing negative and legitimate cases remain wired. Packaging includes the four
  provenance trial directories and both L05 executions, excluding credentials and
  private keys. Tools and image pins remain unchanged.
- L03's Dockerfile now has a parser default for `BASE_IMAGE`; the delivery command
  still supplies the initial service digest. The contradictory prior attribution
  was corrected using the user's confirmation of GitHub Copilot with GPT-6.

## Observed test-first sequence

Raw development logs are ignored under `evidence/tdd/f09-f10-l05/`.
This is a record of this session, not a reconstructed history for prior changes.

| Observation | Retained evidence | Interpretation |
|---|---|---|
| Initial sandboxed Node runner exited without assertion details | `01-red.log` | Environment failure, not a TDD red result. |
| Before production edits: 32 focused tests, 25 passed and 7 failed | `02-red.log` | Two F09 absence assertions failed with generic missing-attestation errors; repository/revision diagnostics lacked specific codes; wrong build type, wrong builder and unknown predicate were accepted. These are the intended red assertions. |
| Before renderer edits: new builder requirement failed | `03-policy-red.log` | Actual test-first admission-construction regression. |
| After contract and renderer implementation | `04-contract-green.log`, `05-policy-green.log` | The six local content tests and renderer tests passed. |
| New scenario/source test attempts in sandbox | `06-scenario-red.log`, `07-source-red.log`, `08-focused.log` | Subprocess restrictions prevented meaningful scenario/source red evidence. Do not count those failures as demonstrated test-first behavior. |
| Shared suite after initial implementation | `09-suite.log` | 572 service/unit tests plus environment, policy and existing real Cosign probes passed. This also confirms both initially failing F09 assertions. |
| Extended F10/L05 regressions | `11-unit.log` | 605 service/unit checks passed after correcting a newline in the synthetic L05 quote fixture. Later tests are regression coverage, not an invented red-green history. |

An intermediate full-suite output was overwritten during a rerun; no retained
red proof is claimed for that output. Its missing L01 stage stubs were corrected.
The separately retained initial red logs above were not overwritten. Log hashes
and final source-file hashes are retained with the final checks below.

## Actual local integration

Command attempted:

```bash
PATH="$PWD/implementacion/.tools/bin:$PATH" \
GP_L05_FROM_COMMIT=7243334fe4ee7073801a86b25c90986b7d3c5ece \
GP_L05_TO_COMMIT=fc58e220e2d3f38d13216b23e61ffc31271f112f \
make -C implementacion demo
```

Run **`run-CKbpvhof` failed before the initial image could be built**. Preflight,
real Git source selection/export and kind setup completed. BuildKit then timed out
resolving `registry-1.docker.io` through Docker's `127.0.0.11:53`. This is an
infrastructure error, not an intended policy rejection. No host firewall or daemon
configuration was changed to force a pass. Owned containers were cleaned up.

Evidence:

- `evidence/tdd/f09-f10-l05/10-demo.log`.
- `evidence/raw/run-CKbpvhof/`, including `L05-source-authorization.json`.
- `evidence/packages/run-CKbpvhof.tar.gz` and its checksum.
- `evidence/tdd/f09-f10-l05/archive-audit.json`: archive SHA-256 and all **14**
  internal file hashes verified; packaged status **FAIL**.

The run occurred during development; source selection is retained, but it is not
a successful frozen-final-source integration. A new final-source integration is
required after the environment blocker is resolved.

| Boundary | Observation in this increment |
|---|---|
| F09 fresh registry CI and directed Kyverno admission | **NOT_EXECUTED**: initial image build failed first. |
| F10 authentic fixture in registry CI and directed admission | **NOT_EXECUTED** for the same reason. |
| L05 two actual source revisions selected/exported | Completed in the failed run; distinct application trees and files recorded. |
| L05 two legitimate deliveries with rollout/HTTP | **NOT_EXECUTED**: no delivered images in the failed run. |
| Hosted negative F09/F10 | **NOT_EXECUTED**; no remote mutation procedure or dispatch. |
| Hosted L05 | **NOT_EXECUTED**; requires two authorized actual Actions run revisions. |

The user's reported successful hosted run
[36596799569](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36596799569)
at `38631e1` precedes these changes. It is not evidence for this provenance family.
This session could not retrieve that run through the web tool and did not audit
its artifact. Its reported success and duration are not reclassified as a new
independent audit.

## Final checks and review

Final suite output: `evidence/tdd/f09-f10-l05/12-final-suite.log`.
`make -C implementacion test` passed: **6 environment tests, 605 service/unit
tests, 16 Python policy tests, 52 Conftest decisions, 9 Kyverno CLI runtime cases**,
workflow/manifest checks and real local Cosign cryptographic probes. The new
provenance probes signed and authenticated valid provenance, accepted its content,
signed/authenticated the isolated F10 fixture, rejected its unauthorized repository
and rejected that same fixture against another digest. These are offline probes;
they do not establish registry or admission behavior. No tests were skipped.
After that suite, a report-only correction stopped F10 from inheriting an SBOM
field named `bundleBytesUnchanged`: F10 now explicitly records unchanged
non-targets and received bytes matching its prepared fixture. The existing SBOM
check label was preserved. All **57** affected evidence/scenario regressions passed
in `13-report-regression.log`. Bash syntax and `git diff --check` passed. New local
Markdown links were checked.

Final source hashes: `evidence/tdd/f09-f10-l05/source-files.json`.
Raw log hashes: `evidence/tdd/f09-f10-l05/log-hashes.json`.

| Retained observation | SHA-256 |
|---|---|
| `02-red.log` | `ed9a1fdf9e23c95ef480ef91124f347b29496eb67fbe2f472e0b1d2349df60a3` |
| `03-policy-red.log` | `344cdab117b83a1bd1c574054fb3d5b5e12e44887956081f0d157d8e34db5bc1` |
| `04-contract-green.log` | `4cbf916887a25de4c6b0a4f95d776ba04fa7e99b0f85ef45873f891d6e24622b` |
| `05-policy-green.log` | `ff3b1438544d9aa2c552401f0123d54eac06b91b0295f3773671c14161e22544` |
| `12-final-suite.log` | `e9db409666204da515294cf1de990295da834e1208f4e93cfd9467b7949f46d4` |
| `source-files.json` | `4f8a07d77e1c56d75da9c9eae66a464d9fc8a950f1a6bdbff8200ec843b21de7` |
| `13-report-regression.log` | `40c21f806501b6bdb7cf1c8739759ca2b127ad4e81301877f22fe73f720caf31` |

Review remains required for the actual F10 Kyverno diagnostic, full local registry
and admission behavior, two-delivery L05 completion, and hosted normal compatibility
with the strengthened builder contract. Regression and offline cryptographic
checks cannot close these boundaries.

| Activity | Actual assistance | Human review | Decision |
|---|---|---|---|
| Implementation, tests, diagnostics and EN/ES documentation | Codex (GPT-6) | Pending | Pending |
| Correction of previous development attribution | User confirmed GitHub Copilot with GPT-6; Codex edited the contradictory record | Pending | Pending |

No push, PR publication, remote workflow dispatch, repository-setting change or
thesis edit was performed. Existing prompt files were preserved.
