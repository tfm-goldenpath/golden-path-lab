# Lane A shared-test parser repair — 19 October 2026

## Observation and cause

[Run 39310363244](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/39310363244)
used main `1d2d71ea0dfd647973d051b444f1ae675542cb80`. Both demo and
vulnerabilities failed in attempts 1 and 2 at `shared-tests`. Their retained
`result.json` records FAIL and `scenarioExecution: NOT_EXECUTED`.
Container construction/startup and doctor passed. The earlier devcontainers
image-name parsing warning did not terminate the build.

The decisive traceback is `ModuleNotFoundError: No module named 'yaml'` in
`tests/policies/test_pages_workflow.py:setUpClass`. The Pages contribution
introduced an undeclared PyYAML dependency; the pinned devcontainer uses
stdlib Python, while the development Codespace has that package installed.
This is a prerequisite-test defect, not evidence of a failed scenario or a
Docker permission problem. Finalization preserved the original exit code 2;
it did not create the failure.

Read-only downloads and diagnostic logs are retained under the ignored path
`implementacion/evidence/raw/lane-a-39310363244-diagnosis/`:

| Attempt | Suite | Artifact ID | ZIP SHA-256 (attempt 1 matched Actions upload log) |
| --- | --- | --- | --- |
| 1 | demo | 12215278396 | `6d3da538955860e6762ecbfe1b0c1a1a6cc17d92e09f8b718cbb7ae9c8ed144c` |
| 1 | vulnerabilities | 12215357177 | `f8a9aa3b221a3f17e31a12f1752a7f76fe359a0aeb648bf11a65f697da32a617` |
| 2 | demo | 12215444552 | Retained separately as `demo-attempt-2.zip` |
| 2 | vulnerabilities | 12216221274 | Retained separately as `vulnerabilities-attempt-2.zip` |

Each attempt-1 ZIP contains 27 files verified against its checksum manifest,
plus that manifest. The manifest also lists `databases/index.json`, which the
workflow uploads separately; that separate artifact was not downloaded in
this diagnosis. Attempt-2 result and shared-test logs were checked against
their included manifests and confirm the same missing-module failure. No
database identity, scenario execution or cryptographic verification is inferred.

## Bounded correction

`test_pages_workflow.py` parses the existing workflow using `conftest parse`
and stdlib JSON. The positive test evaluates the real YAML file directly;
the 16 negative permission/trigger mutations remain covered. The normal
`make test-policies` Python discovery uses `-I -S`, excluding ambient Python
packages and environment paths. No policy, tool pin, workflow permission,
scenario expectation or retained evidence was changed.

## Validation

Tested source: `fix/lane-a-pages-test-parser`, based on the SHA above, with
the tracked changes in this contribution. Logs use the diagnostic path above.

| Check | Result and scope |
| --- | --- |
| Before-fix isolated Pages tests | FAIL with the exact missing `yaml` exception; `reproduction.log` |
| After-fix isolated Pages tests | PASS, 2 tests including the 16 negative mutations; `focused-fixed.log` |
| `make -C implementacion test-policies test-workflows` | PASS, 45 Python tests, Conftest rules/workflows and 16 Kyverno checks; `policies-fixed.log` |
| Lane A runner/audit regressions | PASS, 46 synthetic orchestration/evidence tests; `lane-a-regressions.log` |
| `make -C implementacion doctor` | PASS in the current Codespace; `doctor-local.log` |
| `make -C implementacion test` | PASS: 6 environment, 951 service/unit, 45 Python policy and 153 defense tests, Conftest/Kyverno, offline Cosign fixture checks and static workflow scenarios; `shared-fixed.log` |

Reproduce from the repository root:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
python3 -I -S -m unittest discover -s implementacion/tests/policies -p test_pages_workflow.py -v
make -C implementacion test-policies test-workflows
node --test implementacion/tests/unit/lane-a-validation.test.mjs implementacion/tests/unit/lane-a-audit.test.mjs
make -C implementacion doctor
make -C implementacion test
```

No laboratory, cluster, image build or remote workflow was launched for this
repair. The shared suite signs labelled offline test fixtures only. Final
workspace free space was approximately 8 GiB with over 1.68 million free
inodes; no cleanup was performed. A new integration on the corrected source is **NOT_EXECUTED**. These
tests do not establish new Fxx/Lxx observations or human acceptance.

Assistance: OpenAI Codex diagnosed the retained artifacts, implemented the
test dependency fix, ran local checks and wrote this record. Human review and
final decision remain pending.
