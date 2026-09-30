# Static workflow trials: F01 / F02

Read the [oracle](record.md) and [observed validation](../../../../registros/f01_f02_workflows_EN.md).
From the repository root in the supplied devcontainer/Codespaces:

```bash
# Installed pinned tools are normally on PATH. For the repository-local tools:
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test-workflows
# Choose a NEW directory to retain a named run (existing paths are refused):
make -C implementacion test-workflows WORKFLOW_EVIDENCE=evidence/raw/workflow-review
# Focused software regressions and the shared suite:
python3 -m unittest discover -s implementacion/tests/policies -p test_workflow_scenarios.py
make -C implementacion test
```

Only Python 3, Git and locked Conftest 0.70.1 are required by `test-workflows`.
It checks the Conftest version before evaluating, without calling Docker,
kubectl, registries, signers or OIDC. Do not run the full environment doctor as a
prerequisite for this static command. The shared suite has its usual additional
tools and local HTTP socket requirements.

The command writes a fresh directory under `implementacion/evidence/raw/` and
returns zero only for accepted L01 plus exact isolated F01/F02 denials. The
trusted scenario oracle is separate from candidate data; the shared evaluator
calls the production `workflow.rego`. The pinned YAML parser maps unquoted `on`
to `true`, so the production policy reads both keys. External Action/reusable
workflow SHA rules and local `./` exemption retain their existing scope.

Inspect `result.json`, `*-evaluation.json`, `*-stdout.log`, `*-stderr.log`,
`tool.json`, `hashes.json`, the three `.yaml` inputs, `*-diff.txt`, and the retained
`workflow.rego.txt`. Commands use argv directly; fixture commands and expressions
are never evaluated. No image digest or delivery observation is fabricated.
A failure retains partial evidence; tool, parsing, compilation, timeout,
output-shape, unexpected acceptance and extra-denial failures cannot count as
successful detection. Existing evidence directories are never overwritten.

For a completed run, package its observations with the existing allowlist:

```bash
python3 implementacion/scripts/package-evidence.py \
  implementacion/evidence/raw/workflow-review \
  implementacion/evidence/packages/workflows PASS
# Use FAIL for a failed run; preserve it alongside later attempts.
```

The archive includes `execution-summary.json`, `SHA256SUMS.txt` and an external
archive checksum. Its L01 scope is workflow acceptance, not complete delivery.
Raw evidence and packages remain ignored by Git.

Ordinary PR/push CI runs `make test`, including these trials, and still checks
actual `.github/workflows/` through `check-policies.sh`. It uploads the static
records with the existing pinned upload Action; absent evidence means the stage
was not reached. A candidate's successful expected rejection makes the scenario
test pass; submitting that same invalid workflow to the normal repository check
fails that check. Trusted CI and externally configured repository rulesets own
merge enforcement. Test files do not configure protections or protect their own
checks from proposed edits.

Never copy the fixtures into `.github/workflows/`, dispatch, source or execute
them, in either R or G. F01 is conservative event prohibition, not a general
untrusted-data-flow analysis or a compromise demonstration. F02 neither executes
an external Action nor changes its upstream tag. These are actual static policy
observations, separate from software regressions, live delivery and campaign
measurements. F09/F10/L05 and F13/F14 live gaps remain open.
