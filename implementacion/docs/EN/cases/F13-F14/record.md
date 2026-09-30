# F13 / F14 results authorization — operational oracle

Prepared from main `d758ef50bdeee57574c8b18330aef8d07a35abfe` and this task's
explicit F13/F14 requirements. Academic IDs are unchanged; this is an operational
record, not a new academic catalogue. Human review remains pending.

| Property | F13 | F14 |
|---|---|---|
| Starting delivery | Complete, freshly verified P1 authorization | Same complete P1 delivery; laboratory prepares authentic successful P0 separately |
| Actor capability | Delete only results manifest in run-owned local registry | Replay unchanged pre-issued P0 bundle; remove P1 manifest; no signing capability required for replay |
| Injection | After successful results issuance, before authorized CI and directed admission | Same point; P0 preparation and authentication finish before replay begins |
| First consumer | Fresh authorized CI gate | Fresh authorized CI gate authenticates exact bundle before policy comparison |
| Blocking boundary | Before protected deployment | Before protected deployment |
| Expected cause | MISSING_RESULTS; only tfm-results/require-results denial | RESULTS_POLICY_VERSION_MISMATCH; only tfm-results/require-results with RESULTS_POLICY_VERSION diagnostic |
| Unrelated requirements | Complete retrieval and authentic, valid image signature, SBOM and provenance | Same, plus source, digest, signer, successful checks and other results fields valid |
| Legitimate counterpart | L01 same digest after exact restoration, fresh verification, admission, rollout and HTTP | Same |

P1 is trusted configuration `golden-path-v1`. P0 is
`laboratory-results-p0-fixture`, an explicitly identified laboratory fixture
policy with identical mandatory successful checks. It is neither an earlier
production release nor a regulatory version. The authorized laboratory producer
signs P0 without publication; the registry actor later replays those bytes.
P1 remaining alongside P0 invalidates isolation even if a consumer accepts P1.

Retain original OCI bytes, P0 predicate/bundle/authentication, complete before,
negative, after-denial and restored inventories, exact consumed bundles and
verifier diagnostics, trust hashes, policy specs, cache arguments, both gate and
admission observations, restoration statuses, Deployment/Pods and HTTP responses.
Trust and policies remain unchanged throughout each trial. Interruption must
attempt recovery and retain both original and restoration failures.

The original preissuance F13 preparation/admission and readiness classifier
remain a separate observation named F13Preissuance. Directed trials are not
additional catalogue scenarios or campaign measurements. Full VSA conformance is
outside scope. Local registry/admission/recovery and hosted negatives initially
remain **NOT_EXECUTED**. PR #26 preserved blocked F09/F10/L05 prerequisites; it did
not establish their successful execution.
