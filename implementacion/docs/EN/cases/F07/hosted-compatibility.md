# F07 hosted compatibility investigation

[Versión en español](../../../ES/cases/F07/hosted-compatibility.md).

## Decision at the bounded stopping point

**Unproven; hosted F07 stays `NOT_EXECUTED`.** This session inspected documentation,
prepared an opt-in protocol experiment and ran local regressions. It did not
publish a fixture, request a GHCR token, delete an artifact or dispatch a workflow.
There is no hosted protocol or admission observation to accept. The next bounded
implementation task is **`test/f07-ci-verification-l04`**.

Local directed F07 remains covered by `run-xFGRe6X1` in the [operational
record](record.md). Academic F07's early CI barrier and L04 remain pending.

## What the sources establish

Official sources consulted on 2026-09-28:

| Source | Documented behavior | What remains unproven here |
|---|---|---|
| [GitHub Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-to-the-container-registry) | A workflow token can publish. REST deletion/restoration needs package-admin access; publishing/linked repositories may receive that access automatically. | `packages: write` does not by itself establish OCI manifest DELETE support. No extra permissions or administrator PAT are proposed. |
| [GitHub package-version REST endpoints](https://docs.github.com/en/rest/packages/packages#delete-package-version-for-an-organization) | Package versions have numeric IDs and separate deletion/restoration endpoints. Restoration has time and namespace conditions. | A version operation is not proven equivalent to deleting one OCI signature referrer while preserving its subject and shared blobs. The probe never calls these endpoints. |
| [OCI Distribution 1.1.1](https://github.com/opencontainers/distribution-spec/blob/v1.1.1/spec.md#deleting-manifests) | Manifest deletion addresses a digest, but registries may disable deletion. Referrers using a fallback tag need index maintenance. | General OCI format support does not demonstrate GHCR's deletion or exact-byte PUT restoration. Editing a fallback index is outside this experiment. |
| [GitHub CLI verification](https://cli.github.com/manual/gh_attestation_verify), [authenticated certificate extensions](https://github.com/sigstore/sigstore-go/blob/v1.3.0/pkg/fulcio/certificate/extensions.go) | Verification can use a saved bundle; certificate output includes the run invocation URI. | The probe's stricter run/attempt check and all protocol operations still need execution on the selected hosted revision. |

The existing workflow requests `contents: read`, `packages: write`, `id-token:
write` and `attestations: write`. Source inspection is not an observation of the
token's effective package permissions. Neither HTTP 403 nor 405 has been observed
from GHCR in this investigation. Local synthetic responses establish failure
handling only. The local zot proof establishes a different registry's behavior.

## Prepared experiment and isolation

Files:

- `tests/helpers/f07-ghcr-protocol.mjs`: context/target checks, saved-bundle
  authentication, strict inventories and bounded OCI operations.
- `tests/integration/f07-ghcr-protocol.sh`: temporary login, interruption forwarding
  and evidence packaging. It never creates authorization reports or signatures.
- `tests/integration/f07-ghcr-workflow.patch`: unapplied additions to the existing
  workflow, with no permission changes. It does not connect F07 to `demo.sh`.
- `tests/unit/f07-ghcr-protocol.test.mjs`: labelled synthetic protocol regressions.

The patch arms a single-use receipt **before** the normal preparation creates its
fresh image. It runs the protocol experiment **after** normal hosted finish has
passed, including normal results issuance. The image must match the current
prepare outputs, source, workflow identity, exact GHCR repository, fresh local run
state and `tfm.lab.run` image label. Native provenance must authenticate the current
GitHub run and attempt. An old release or a different run fails these checks.

This post-delivery experiment establishes only registry compatibility; the earlier
L01 acceptance is **not** a restored positive control. It does not attempt admission
while the signature is absent. If protocol compatibility is later demonstrated,
a separate reviewed integration must retain the required sequence:

```text
F13 → normal results authorization → F07 rejection/exact restoration
→ same-digest L01 admission/HTTP probes → F11 → independently verified replacement
```

The probe authenticates the exact four required bundles before DELETE. Cosign keeps
the hosted trust root, exact workflow identity/issuer and normal log/timestamp/SCT
verification. Native provenance keeps GitHub CLI verification plus the existing
content validator and exact run/attempt check. It never uses a local key or ignores
hosted trust checks. The active admission configuration still disables caching.
A future hosted admission integration must also observe that effective setting.

The only mutation target is the unambiguous independent signature manifest from
the hash-checked backup. The client asks the fixed GHCR token endpoint for this
repository's `pull,push,delete` capabilities using **only the existing job token**.
That request cannot grant missing privileges. Denial ends the experiment; there
is no alternate credential, scope escalation or package REST fallback. Mutation
redirects are rejected; allowed blob redirects never receive registry credentials.

Four inventories bracket the operation: `before.json`, `pre-delete.json`,
`negative.json`, `restored.json`. Image manifest/config bytes and all layer hashes
are checked before removal, while absent and after recovery. Shared config and
signature-layer bytes must still match before exact manifest PUT; the probe never
deletes or republishes blobs, changes tags, edits indices or issues a new signature.
Recovery is attempted even after a lost DELETE response. Catchable interruptions
wait for recovery before packaging. SIGKILL, runner loss or token expiry can prevent
recovery: retain the backup and both errors for a separately authorized response.

## Commands prepared for a separately authorized hosted trial

These commands are a reviewable proposal, **not authorization to execute them**.
The branch guard deliberately accepts only
`refs/heads/test/f07-hosted-admission-compatibility` in `golden-path.yml` on a
GitHub-hosted manual run. Use a fresh run, one publisher and the existing job token.
Do not copy state from earlier executions or supply a PAT.

From the repository root, first review and check the inactive patch:

```bash
git apply --check implementacion/tests/integration/f07-ghcr-workflow.patch
cat implementacion/tests/integration/f07-ghcr-workflow.patch
```

Only after authorization for publication and one hosted protocol trial:

```bash
git apply implementacion/tests/integration/f07-ghcr-workflow.patch
git add .github/workflows/golden-path.yml implementacion
# Inspect the staged diff, then commit the reviewed probe and workflow change.
git diff --cached --check
git diff --cached --stat
git commit -m "test: prepare authorized F07 GHCR protocol trial"
git push -u origin test/f07-hosted-admission-compatibility
gh workflow run golden-path.yml --repo tfm-goldenpath/golden-path-lab \
  --ref test/f07-hosted-admission-compatibility
gh run list --repo tfm-goldenpath/golden-path-lab --workflow golden-path.yml \
  --branch test/f07-hosted-admission-compatibility --event workflow_dispatch \
  --limit 5 --json databaseId,headSha,status,conclusion,url
# Confirm the new run's headSha is the committed revision; substitute its ID.
gh run watch RUN_ID --repo tfm-goldenpath/golden-path-lab --exit-status
gh run download RUN_ID --repo tfm-goldenpath/golden-path-lab \
  --dir implementacion/evidence/raw/hosted-f07-RUN_ID
```

The two prepared job commands (the patch supplies the exact environment) are:

```bash
# Before normal prepare, from implementacion/:
node tests/helpers/f07-ghcr-protocol.mjs arm "$RUNNER_TEMP/f07-ghcr-receipt.json"
# After normal finish; GP_STATE_DIR and GP_F07_IMAGE come from prepare outputs:
GP_F07_PROTOCOL=authorized bash tests/integration/f07-ghcr-protocol.sh \
  "$RUNNER_TEMP/f07-ghcr-receipt.json"
```

The normal delivery archive is preserved. A separate
`run-f07ghcr-<GitHub run ID>-<attempt>.tar.gz` retains backup, authenticated bundle
outputs, image witnesses, inventories, HTTP status observations and recovery.
Verify its `.sha256` file and every `SHA256SUMS.txt` member before interpretation.
Only `PROTOCOL_ONLY_COMPLETE` may indicate successful deletion/restoration;
`hostedF07` remains `NOT_EXECUTED`, and no denial or restored L01 acceptance is
claimed. Registry/trust/transport/inventory/restoration errors yield a nonzero
exit and `INTEGRATION_FAILURE`. Inspect both error fields, even when only one
caused the original failure. No remote cleanup is automatic.

Stop after one authorized trial if the operation is denied, uses fallback indexing,
fails recovery or remains ambiguous. Retain unfavorable evidence; do not broaden
privileges or substitute package/version deletion. Continue with
`test/f07-ci-verification-l04` while hosted compatibility remains pending.

## Assistance and review

Codex (GPT-6) assisted the bounded documentation investigation, probe preparation,
regressions and documentation. Human review, execution authorization and final
acceptance remain pending. No earlier contribution record is relabelled.
