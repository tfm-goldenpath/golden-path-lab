# PR #27 hosted failure: OIDC token response before replacement signing

## Observed run

[Run 36741081776, job 109975343289](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36741081776/job/109975343289)
executed merge commit `d39086cf0330801130d2c4beedd0c143c4b0ef3c`.
Laboratory run: `run-NcTHN0Rh`. Overall outcome: **FAIL**.

The failure at `2026-09-30T16:05:12Z` was in replacement image signing:

```text
fetching ambient OIDC credentials: invalid character 'u' looking for beginning of value
```

Cosign failed while retrieving its GitHub identity token, before its
`Signing artifact...` stage. The log does not retain the HTTP status or original
response body. It cannot establish whether this was a temporary service error,
an authorization error, or another non-JSON response. No network root cause is
claimed, and the local BuildKit DNS observation does not explain this hosted error.

Earlier observations in the same run:

| Boundary | Observed result |
|---|---|
| Initial signature, SBOM and native provenance verification | CI-delivery VERIFIED |
| Preissuance F13 | Singleton tfm-results/autogen-require-results denial and unchanged three-referrer inventory |
| Initial P1 results | CI-authorized VERIFIED with all four authenticated predicates |
| Initial L01 | Deployment admitted, rollout completed, health/version/quote responses retained |
| Directed F11 | Singleton tfm-runtime/autogen-restricted-containers denial; coordinator continued |
| Replacement image signature | OIDC response parsing failed; no image bundle was produced |
| Replacement authorization/rollout and F13/F14 post-issuance trials | Not reached; hosted negative trials remain NOT_EXECUTED |

The initial image digest is
`sha256:371a278ea23e845d8c3180b17380cf68bf5e3203a2c58542d670e79419495697`;
the attempted replacement is
`sha256:566e5d40e76b36febf4c966d58d367c6d92425397b3d2588e19d3a9d63e3a4b7`.
Earlier successful boundaries do not turn the overall run into PASS.

## Bounded local fix

Cosign 3.1.3's [GitHub provider](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/providers/github/github.go)
retries transport failures but returns immediately when decoding the response as
JSON fails. Its code does not report the response HTTP status at that point.

`scripts/lib/attestations.sh` now wraps hosted image/SBOM/results issuance with at
most three identical attempts, waiting two and then four seconds. A retry requires
exit 1, the exact ambient-OIDC JSON parse error category, the key-generation
marker, no signing/publication marker and no output bundle. Existing bundles or
attempt evidence cannot be overwritten. Every attempt keeps its output log and a
final command-status record. Package allow-lists already retain these `.log` and
`.json` files for both the initial image and `L01-update/`.

Local signing, trust configuration, digest binding, native GitHub provenance,
certificate/transparency checks, fresh CI gates and admission requirements retain
their existing behavior. Other errors stop immediately. A successful retry only
completes the signing command; exact-bundle verification and authorization remain
mandatory. The retry is a robustness change for the observed failure category;
it does not establish that GitHub's underlying issue is transient or resolved.

## Evidence and verification

Ignored directory: `implementacion/evidence/raw/pr27-hosted-failure/`.

- `job.log`: complete downloaded job log.
- `artifact.zip`, `download/run-NcTHN0Rh.tar.gz` and its checksum: artifact
  `11109768266`. The archive checksum and all **153** internal hashes were verified.
  This integrity audit is not a fresh cryptographic verification of its attestations.
- `01-red.log`: new actual-helper regression fails before implementation.
- `02-focused.log`: **46/46** signing/gate tests passed before adding two further
  tests of the real results-issuance function.
- `03-suite.log`: shared suite for the final local fix; outcome recorded below.
- `audit.json`: archive integrity and observed failure boundary.

Regression inputs simulate Cosign process output. They test argument preservation,
retry limits, existing/partial bundles, non-OIDC errors, signing/upload markers,
interruption exit codes, local behavior and mandatory results verification. They
cannot establish actual GitHub OIDC recovery. No remote workflow was dispatched;
no new hosted success is claimed. F09/F10/L05 gaps and hosted F13/F14 negative
limitations remain open.

| Activity | AI contribution | Human review | Final decision |
|---|---|---|---|
| Hosted log/package audit, bounded signing retry, regression tests and EN/ES record | OpenAI Codex, GPT-6 | Pending | Pending |

## Final local verification

`PATH="$PWD/implementacion/.tools/bin:$PATH" make -C implementacion test` exited 0:
**732/732** service/unit tests, **6/6** environment tests, **33** Python policy
checks, **52/52** Conftest decisions, **9/9** Kyverno runtime checks, real-file
policy checks **18/18** and **14/14**, and all offline Cosign probes passed.
The Python count includes renderer tests rediscovered by the existing condition
adapter. These remain software-check counts, not scenario or campaign counts.

The fix is on `fix/hosted-oidc-token-response`; human review and hosted workflow
validation remain pending. No workflow rerun was performed. Archive SHA-256:
`59e6b9d1f08e63aa3c1bc9f78887272bd4d18a1350dc7ee48f4b0e84ccdf660d`.
