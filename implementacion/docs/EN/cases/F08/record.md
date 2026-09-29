# F08 controlled image-signature alteration

## Oracle fixed before implementation

Branch: `test/f08-altered-signature`; actual clean base:
`1369a0c322cf5f5f0f68747f168d630ae7f0bb22` (merged PR #20).
Milestone: **Scenario coverage and pilot**.
Read-only academic source: `implementacion/evidence/raw/A_evaluacion.md`,
F08 lines 343–363 and L04 lines 583–601; SHA-256
`efa0b0f2024ed2800217de3099d86dd137acb4dcd91861bc72ad02235a774e45`.

| Field | Approved expectation |
|---|---|
| Preparation | Independently built L01-update candidate, scheduled signing and fresh successful registry verification; separate image-specific SBOM/provenance. |
| Actor | Operator of the run-owned local zot registry can replace one referrer, without a signing key or permission to change verifier/trust policy. Protected requests use the restricted workload actor. |
| Alteration | Change only one cryptographic signature value, preserving readable bundle/base64/DER encoding, payload, predicate, subject, verification material and all non-target evidence. Recalculate OCI sizes/digests; remove the original referrer during the negative check. Refuse ambiguous additional signatures. |
| Expected barrier | Next fresh CI verification, before results authorization and protected deployment. A nonzero exit or threshold message alone is insufficient. |
| Attribution | Original acceptance, unchanged public trust inputs, exact mutation isolation, independently authenticated non-targets, direct cryptographic original/variant comparison and actual Cosign rejection of the retrieved variant. Registry, transport, format and wrong-trust errors are integration failures. |
| Recovery | Install EXIT/INT/TERM recovery before mutation; remove the injected referrer, restore exact original bytes/artifact set and require fresh successful registry verification. Preserve primary and recovery errors. SIGKILL/host loss require retained backups for manual recovery. |
| Directed admission | After normal results authorization, repeat the isolated mutation with cache disabled, then require a singleton image-signature policy rejection and positive controls. Unattributable admission remains pending. |
| Counterpart | Reuse L04's L01 replacement admission, rollout, actual ready Pod digest and HTTP checks. Linked observations of one execution; no additional independent experimental observation. |
| Evidence | Original/altered raw OCI bytes, bracketed strict inventories, image bytes, trust hashes, fresh gate outputs, non-target authentication, cryptographic comparison, denial and recovery, linked L04 result and audited package hashes. Retain failures. |

Hosted F08 and negative F07: **NOT_EXECUTED**. Hosted normal gate/L04 acceptance
remains pending a separately authorized successful run and audited package.
No hosted mutation, dispatch, publication or campaign is authorized here.

Initial execution status: pending. AI assistance in this session: Codex (GPT-6).
The supplied oracle is the implementation requirement; human review and final
acceptance remain pending. Development and actual test observations follow below;
no retrospective TDD history or unobserved Copilot contribution is claimed.

## Implementation and checks — 2026-09-29

The replacement runs scheduled issuance, F07 CI removal/recovery, then F08 before
results. `f08-signature-evidence.mjs` reuses F07's ownership, replacement and raw
backup validators. It requires one image-signature artifact and one DSSE signature,
flips the final ECDSA value byte while retaining canonical base64/DER, uploads a
new bundle blob and manifest, then deletes the original signature referrer.
It never changes bytes under an existing digest or reads a private signing key.

The read-only gate keeps `INTEGRATION_FAILURE` for verification failures and now
retains predicate, exit status and verifier rejection versus execution error.
F08 independently checks the original and variant with ECDSA-P256/SHA-256 over
DSSE PAE, reauthenticates the original with Cosign and authenticates every non-target
bundle even if the gate stopped at the target. Only the combination of current
inventory, unchanged trust, isolated change and actual verifier rejection supports
`CRYPTOGRAPHIC_ALTERATION`; the gate itself never attributes F08 or authorizes it.

Each phase installs recovery before publication. Recovery attempts both injected
referrer removal and original restoration, retains both failures, checks exact
inventory/bytes and invokes a fresh gate. Before-results recovery must finish
before normal results issuance. After authorization, a separate phase requires
positive server dry-run, effective cache-disabled controller arguments, unchanged
policy specs and a restricted-actor singleton signature rejection. Final L04
admission, ready Pod digest and HTTP checks complete the shared observation.
Intermediate phase files intentionally retain `L04: pending`; `F08-completed.json`
links them to the later successful L04 result without rewriting observations.

### Fresh local observation

**`run-IIWR8RLL`: PASS**, real zot, Cosign 3.1.3 and Kyverno 1.19.1 in Linux
Codespaces. Tool versions, policies and trust requirements were preserved.

| Evidence | Observed value |
|---|---|
| Base / source commit | `1369a0c322cf5f5f0f68747f168d630ae7f0bb22`, modified working tree |
| Run source snapshot | `6ed8687d604fc2e79f47f2ac7e5b21f11ad9e25a12fa29b3f3c3d49f4ade6917` |
| Initial digest | `sha256:9d173bde16bb95567d77d64d0ae9bc65a7d6ba3b4f90b5a6b4ca107a7775a442` |
| Replacement / L04 digest | `sha256:6e0627f3320d1da184758ff98bc60ca848ae65285471ebf182adb29be850ea67` |
| Original signature manifest | `sha256:f9d8c9a8c586868ae9a650e321a551d72e4cbf437603974e6f010881419797bd` |
| Altered signature manifest | `sha256:f3308311e1cd982d6887f2453c1289e835b196e117cab3012e8226db8edd03be` |
| CI rejection | Fresh gate exit 1, image-signature `VERIFIER_REJECTION`; scenario attribution `CRYPTOGRAPHIC_ALTERATION`, original verified, altered value rejected |
| Directed admission | Singleton `tfm-signature` / `autogen-require-image-signature`; positive server dry-run, isolated mutation, authenticated non-targets and later real L04 acceptance support attribution |
| Recovery, both phases | Primary 0, restoration 0, restoration attempted; exact original set and fresh successful gate |
| Preserved behavior | F13, directed and early CI F07, initial L01, F11 and shared L01/L04 replacement passed |
| Package | `evidence/packages/run-IIWR8RLL.tar.gz`, 452 internal hashes verified |
| Archive SHA-256 | `79e7d71fcd1bbc32ce181d84d2fe1b8c4ecc29126ba2e5b467d5785f08e1ea7f` |

The independent audit reverified 44 retained gate bundles and confirmed rejection
of both retrieved F08 variants. It checked raw signature-only differences, complete
inventories before/after each fault, unchanged image bytes and trust hashes, exact
restoration, unchanged policy specs and the linked final rollout. All audit inputs
match the archived bytes. Raw `run.log` appends the cleanup/archive message after
packaging; the archived log and its hash remain unchanged. Private keys and run
state are excluded. The archive contains `production-source-sha256.txt`; all listed
production/scenario/policy files match the final tree. Four diagnostic regressions
and tighter non-target test assertions were finalized after the run's snapshot;
the final suite below therefore has 443 tests versus the live preflight's 439.
The final source snapshot is
`6c52e431c816473c4ccad02cf25818738155acd3b50f40b9f8c8f38952941930`
(`final-source-sha256.txt` in the development evidence directory).

Raw evidence: `evidence/raw/run-IIWR8RLL/`. Development logs, audit scripts/results
and source hashes: `evidence/raw/f08-development/`. These paths and packages remain
ignored by Git. Preserve the local package outside an ephemeral Codespace before
discarding its storage; no remote upload was performed.

### Failed attempt retained

`run-lnUGtdTB` stopped during base-image retrieval, before F08 or admission.
BuildKit logged DNS timeouts to Docker Hub. Inspection found legacy `FORWARD DROP`
rules conflicting with Docker's newer forwarding rules. The run-owned stalled
BuildKit container was stopped and normal cleanup retained FAIL evidence.
Archive SHA-256:
`c58a2d2e486c461e0c616ce2c7d397a99eeb724816fd6099c28f7f49b883b1d8`;
all 12 internal hashes were audited. This is an infrastructure incident.

With explicit execution approval, the retry wrapper temporarily allowed outbound
kind-bridge traffic and established replies in the legacy chain. Its EXIT trap
removed both rules; `forwarding-after.txt` confirms removal. No host firewall
change is part of the repository increment.

### Verification and development sequence

- The operational oracle was written first. The first signature-isolation tests
  failed because the F08 module did not exist; implementation then passed them.
  Later scenario/registry/recovery tests are regression coverage, not a reconstructed
  test-first history. Logs retain the missing-module failure, sandbox `EPERM`, a
  corrected synthetic admission marker and an incorrect fixture-order assumption.
- Focused mutation/recovery/replacement/coordinator run: 86 tests passed before
  the additional admission and diagnostic cases. Actual scenario functions exercise
  success, attribution errors, registry failures, unexpected acceptance, recovery
  failures, interruption and prevention of downstream authorization/deployment.
  Their controlled external responses are synthetic and do not prove admission.
- Final `make -C implementacion test`: PASS outside the subprocess-restricted
  sandbox, with pinned tools on PATH. 6 environment tests, 443 service/unit tests,
  15 Python tests, 52 Conftest decisions, 9 Kyverno engine fixtures, 18 + 14 policy
  checks and real offline Cosign cryptographic checks.
- Fresh local integration, package/internal hashes, independent cryptographic audit,
  production-source hashes, Bash/Node syntax, relative documentation links and
  `git diff --check`: passed at their stated scopes.

### Remaining boundaries and review

The helper deliberately supports the current local P-256/DSSE profile. Unsupported
encoding, wrong trust or unrelated failures stop the scenario. Snapshots assume one
controlled publisher and are not an atomic view of every admission registry read.
SIGKILL/host loss cannot run recovery traps. This functional run supplies no campaign
measurements, malware-detection claim or authentic-signature-for-another-image test.
Hosted F08 and negative F07 remain **NOT_EXECUTED**. Hosted normal gate/L04 acceptance
still requires a separately authorized successful run and audited evidence.

AI assistance: **Codex (GPT-6)** implemented, tested and documented this increment.
The user supplied the requirements and oracle; implementation review, acceptance
and final decision remain **pending human review**. No push, PR creation, workflow dispatch, thesis edit or campaign
execution was performed.

## Publication handoff

After local validation, the contributor authorized committing and opening the PR
and identified **GitHub Copilot (GPT-6)** as the main AI development tool. This is
contributor-reported attribution; the Codex (GPT-6) session contribution above is
retained. Human review and final acceptance remain pending.
