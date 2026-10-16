# Defense demonstration implementation and local validation

The final-source lane-A rehearsal confirmed the directed sequence in **27.376 s**.
The independent `defense-01` session was left **PREPARED**, without results, with
the read-only viewer on `127.0.0.1:8765`. Human review and browser layout review
remain pending; no remote workflow or campaign execution occurred.

Source base: `1ec4cb9e89fce412df90510b7f3b3f3ca03bb50f`; uncommitted branch `feat/defense-demo`.
The pre-existing untracked `illustrations/` directory is outside this change.

Acceptance boundary: directed lane-A F11 Conftest, preissuance F13 admission,
results authorization and same-digest DEMO_VALID_ACCEPT, then F11 admission with
unchanged Deployment and healthy HTTP. This does not execute full L01, the whole
catalogue, lane B or a measurement campaign. No historical result is modified.

## Actual validation, 16 October 2026 UTC

This is local engineering validation, not another campaign sample or human-effort
measurement. The initial source matches the supplied reference SHA; the new demo
layer uses those module interfaces. Changes to shared behavior are limited to an
optional attestation observer (inactive for ordinary callers), accurate directed-demo
package scope, bounded observation of Docker diagnostic-container removal, and
optional placement of retained vulnerability DB snapshots. Tool versions, trust,
policy thresholds and scenario oracles are unchanged.

The initial six-test unit invocation failed at import because `core.py` did not
exist. Later lifecycle/security tests are regression tests, not a reconstructed
earlier TDD history. The 159 focused shared classifier/orchestration/packaging
checks passed with the optional observer inactive. Initial sandboxed doctor failed
to access Docker; doctor subsequently passed with local Docker access and the
existing pinned tools. No tool version or policy was changed.

The later gate regression demonstrated exit 42 being masked when a caller captured
the function status; the concrete Node invocation now preserves it. Cleanup and
interruption regressions exposed and fixed recreation of private Buildx metadata,
replacement of a completed work status by a rejected replay, and interrupted
evidence closure. These are actual regression histories, not retroactive TDD claims.
Logs are under `implementacion/evidence/raw/defense-validation/`.

Focused current checks: 30 demo lifecycle/security tests and 45 vulnerability tests
passed. The latter includes synthetic DB placement/default/drift tests; these do not
substitute for real scanning. The real static fallback returned exactly PRIVILEGED
and ESCALATION against its labelled synthetic manifest. Bash/Python/JavaScript syntax
and `git diff --check` also passed. Shared full-suite executions are retained in each
session's CI operation; preflight is separately identified and timed.

### Preserved unsuccessful preparations

| Session | Source content SHA-256 | Preparation | Stop and disposition |
|---|---|---:|---|
| rehearsal-01 | `88378ce9e31a7fa893906a946fe32b7e3a626294e0b8f3934543f2ca91563773` | 484.817 s | DNS diagnostic timed out; Docker removal was still in progress at the immediate absence query. No live attempt. ERROR/exit 1 retained; owned resources subsequently removed and absence checked. |
| rehearsal-02 | `32b77c31615d71a3d7a915b5143877784a18d845cb194ec02aefe745e8f60cc9` | 764.620 s | Build, manifest, real SBOM/Trivy and delivery signatures passed; workspace reserve failed before Kyverno installation. No live attempt. ERROR/exit 1 retained; export and cleanup succeeded. |
| rehearsal-03 | `65255a57d4d1cbf6e24b344e60ed257dc81361e2b2430e9c5564c79979a545ab` | 215.300 s | CI caught a regression: a newly added directory-existence check also affected the old scripted DB-reuse mode. 931/932 Node tests passed; work exit 2 retained. No infrastructure was created. |

First run originals: `evidence/raw/run-FWDZ1wWA`; final package
`evidence/packages/defense-rehearsal-01/export-0004/evidence.tar.gz`, SHA-256
`aadab2ec5464f522044ac07270175960889a289b584b97f6a94a5a58d3b5e1d0`.
Second run originals: `evidence/raw/run-aqwfL3F7`; final package
`evidence/packages/defense-rehearsal-02/export-0002/evidence.tar.gz`, SHA-256
`ae8cf711d542a61b1ea94f23ea4b4c6fe792802d15a20207ccb3bb5d6aecd023`.
Each directory also contains its standalone `recorded.html` and manifest. These
exports remain failed observations, never a successful F13 backup.
Third run originals: `evidence/raw/run-vqhmioGd`; final package
`evidence/packages/defense-rehearsal-03/export-0002/evidence.tar.gz`, SHA-256
`30f380b41099d5d441316f62d54bf5e48fb0d13a94fb592cb9e462dac641fbca`.
The regression was corrected by validating only the explicitly supplied new storage
option; existing default creation/reuse behavior remains intact. All 46 targeted
vulnerability/scripted-remediation tests then passed. The real failed-session viewer
was checked over HTTP: all 1,487 registered artifact hashes/sizes and both export
downloads matched; live attempts remained NOT_REACHED. The DOM harness verified
15 stages, 20 cases, 4 attempts and zero offline network calls. It does not assess
browser layout.

The existing network helper subsequently reported RESTORED in
`evidence/raw/defense-validation/network-check.json`: only the documented scoped
kind-bridge forwarding recovery, followed by real DNS/HTTPS checks. Its shared
environment rules are distinct from per-session owned resources and delivery policy.

The real Trivy DB was 1,628,446,720 bytes. Reclaiming zero-filled physical extents
preserved its hash but freed insufficient space. The failed second run's snapshot
was copied and hash-verified at
`/tmp/golden-path-defense-rehearsal-02/preserved-from-workspace/vulnerability-db-run-aqwfL3F7`,
then its original location became a locator symlink. `storage-relocation.json` in
that run records both locations/hashes; the original DB identity record was not
rewritten. No run was resumed after relocation. The DB digest remains
`bf1f1b29d76cae9ff085d418cb4bfdb3906b6069f837abdef06558b8102dd1db`.
New demo sessions use a separate canonical snapshot directory in `/tmp`, check
4 GiB headroom there, and preserve snapshots after cleanup. Other laboratory callers
keep the original snapshot destination. Exact replay requires retaining these DB
bytes outside Git and outside the Codespace before deleting it.

### Final directed execution

The fourth session used content snapshot
`442e48c1f5762945e82c1a2c00bd2d8944c355c3947f0c5ed73c131513413226`.
It completed the real directed sequence with exit 0, F13 recovery confirmed, in
**23.627 s live**, after **711.284 s preparation**. Its original files are in
`evidence/raw/run-yDjc0eGP`, with immutable per-operation copies in
`evidence/raw/defense-rehearsal-04`. The image digest was
`sha256:af55347be676676c92dd4bf445cea8604cbb5503ac17a84d8f7ab739f766906a`.

The original classifiers confirmed both exact F11 Conftest messages, named
Deployment NotFound before/after F13, three unchanged registry referrers, results
authorization and same-image Ready Pod acceptance. The late F11 denial retained
Deployment UID `5a24fe36-52e1-4a77-a3a9-065aed3d9af4`, generation 1 and spec.
HTTP returned `{"status":"ok"}` and the same EUR/1000/demo-v1 quote as reference.
An independent post-presentation read confirmed the five policies still Ready
with identical UIDs/generations/specs; this extra read is excluded from that live
interval and is explicitly labelled in `final-policy-audit-check.json`.

All **3,984** registered artifact sizes/hashes were checked through the real HTTP
API, as were both downloads. The actual exported HTML ran in a labelled synthetic
DOM with no network/polling calls: 15 stages, 20 cases, 4 attempts. Browser layout
remains unreviewed because no browser or browser tool is installed. The final
post-cleanup package is
`evidence/packages/defense-rehearsal-04/export-0003/evidence.tar.gz`, SHA-256
`7c04f7d9fefcd002ce89bf8348be9e4d372589524676e512a3d36028fc43d9e6`.
The successful work status/exit survived cleanup. Docker listed no remaining
containers or volumes afterwards; shared cached images/network preparation remain.

Final hardening then added three genuine regressions: failed work exit on a budget
overrun at final evidence closure, a preparation precondition failure after a prior
successful operation, and interruption between preparation operations. The red
run failed/interrupted; all **33** demo tests passed after correction. Policy and
cluster identity reads now also run inside acceptance and the final live barrier.
The narration target label and actual workflow/module correspondence were clarified.
No scenario oracle, tool pin or trust setting changed.

The fifth rehearsal and fresh defense preparation use final content snapshot
`7b4401d0eb8a8ecb7559e05d40829e22bfe8af02f34afb03dcbc73aae8195fa3`.
The completed observations follow.

### Final-source rehearsal: confirmed

`rehearsal-05` completed with work exit **0**, **713.803 s preparation** and
**27.376 s continuous live execution**, including availability, immutable evidence
capture and final policy comparisons. The measured live interval is not a sum of
nested observer durations. No explanation time or human effort was measured.

| Live operation | Adapter interval | Decision |
|---|---:|---|
| Availability / original context | 2.863 s | allow |
| F11 Conftest | 2.413 s | deny, expected diagnostics confirmed |
| F13 preissuance admission | 4.222 s | deny, results rule only |
| Results authorization | 5.273 s | allow, fresh gates and signed verification |
| DEMO_VALID_ACCEPT | 5.868 s | allow, same digest, Ready Pod and HTTP |
| F11 admission / availability | 3.019 s | deny, unchanged Deployment and policies |

Concrete restricted admission commands returned **1 / 0 / 1** for F13 / acceptance /
late F11. The adapter exit is separately 0 because the expected outcome was
confirmed. F13 recovery is confirmed. The digest remained
`sha256:74a375644dbe61681a7ab847b0e429865fe2a1f708ba3a09b36ac9575f386aed`.
The preserved Deployment UID is `e81bcc2a-d22d-4232-aa69-2f6195c10088`, generation 1.
Prepared/resumed/accepted/final policy identities are identical; all five are Ready.
No L01 replacement, full-catalogue execution, lane B, GitHub PR approval or campaign
acceptance is claimed.

Originals: `evidence/raw/run-fL1E6K9d`. Closed copies and event receipts:
`evidence/raw/defense-rehearsal-05`. Final controller record:
`.tmp/defense-demo/rehearsal-05/session.json`. All paths here are relative to
`implementacion/`. The retained database is
`/tmp/golden-path-defense-rehearsal-05/snapshots/vulnerability-db-run-fL1E6K9d`;
DB SHA-256 `bf1f1b29d76cae9ff085d418cb4bfdb3906b6069f837abdef06558b8102dd1db`,
UpdatedAt `2026-10-16T01:13:54.947090392Z`. The original schema/scan reports and
identity metadata preserve the remaining details; HIGH/CRITICAL thresholds stayed
unchanged.

The final export **after cleanup** is
`evidence/packages/defense-rehearsal-05/export-0003/`:

- `recorded.html` SHA-256 `76d4224764905770fa62d82e0bf5c3ad336b776d7a929f20473a673cc49852d2`.
- `evidence.tar.gz` SHA-256 `7e2de0ffcd797769bfd44faa3830e0c8c3142c51dc9d26a89e777c56f53f632f`.
- `manifest.json` and `SHA256SUMS.txt` accompany both files.

All 4,028 initially registered artifacts passed canonical-path, size and hash checks;
41 representative original-evidence links and both downloads passed real HTTP
verification. The exported HTML executed without network in the DOM harness.
The final archive's **4,276 manifest files** were independently rehashed, its nested
laboratory package excluded state/private keys/kubeconfig, and its cleanup receipt
was present. Work exit/status survived cleanup. Docker confirmed no containers or
volumes remained before the new defense preparation. A separate idempotence check
cleaned rehearsal-04 again while rehearsal-05 was active and retained all three
unrelated container IDs unchanged.

The current full shared suite passed: 6 environment tests, 932 Node tests, 43 Python
policy tests, 62 Conftest decisions, 16 Kyverno engine checks, policy validation,
real local Cosign bundle cryptography, static F01/F02, and 33 demo tests. Original
CI and distinct preflight logs are linked by the session's receipts. Final source
checks also include Bash/Python/JavaScript syntax, guide links and whitespace.

Recommendation: use the full `defense` profile on the prepared lab. The observed
27.376 s technical interval leaves about 132 s within the 160 s rehearsal target
for explanation and navigation, plus the planned 20 s margin to 180. This is a
local observation, not a latency guarantee or human timing result. Keep the actual
saved HTML/package available if infrastructure or a live operation stalls.

### Prepared defense session

`defense-01` completed preparation with exit **0** in **714.033 s**, using the same
final content snapshot. Its separate original run is `evidence/raw/run-Btqi4P62`;
closed preparation records are `evidence/raw/defense-defense-01`; controller state
is `.tmp/defense-demo/defense-01/session.json`. Its new image digest is
`sha256:e68de798464ec3b0d3c2b7f29ebab71cb1bd303254e98bf638ab3a755940401c`, distinct
from the authorized rehearsal image.

The read-only handoff at **2026-10-16T20:13:25Z** rechecked source/boot identity,
sealed resources/trust, current registry inventories with exactly the required
pre-results profile, absence of results, unchanged Ready policies, viewer data and
all **1,522** registered preparation artifact hashes. No live attempt was executed.
Evidence: `evidence/raw/defense-validation/defense-01-handoff/handoff.json` and its
original inventories/policy observation. The full `make test` and distinct preflight
also passed in this new preparation. Listening was verified at **127.0.0.1:8765**;
reissuing `serve` reused the same owned process. Ports forwarding must remain Private.

At handoff the workspace had about **1.7 GiB free**, and `/tmp` about **25 GiB**.
The lab, local signing key and its DB snapshot remain available for presentation.
Do not clean this prepared session until the presentation is finished or deliberately
abandoned. Its next action is:

```bash
bash implementacion/scripts/defense-demo.sh present --session defense-01 --auto --budget-seconds 180
```

Use `evidence/packages/defense-rehearsal-05/export-0003/recorded.html` and the adjacent
archive as the clearly labelled saved backup. The final local session state remains
the controller JSON; an export contains the closed snapshot at its creation, with
the archive's own hash recorded alongside it rather than recursively inside itself.

| Activity | Assistance | Human review | Decision | Evidence |
|---|---|---|---|---|
| Local demo implementation, tests, documentation and validation | OpenAI Codex / GPT-6 | Pending | Pending human review; no campaign acceptance | Session receipts, source hashes and local validation outputs |
| Execution and machine-change preservation guides, 16 October 2026 | OpenAI Codex | Pending | Pending human review; documentation only | EN/ES `defense-demo-operations.md`, local command/link checks and official GitHub documentation |

No commit, push, release, GitHub configuration change or remote workflow dispatch
is part of this work. The session records contain the exact content snapshot used.

## Documentation follow-up — 16 October 2026

Added matching EN/ES execution and machine-change guides, linked from the root
and language indexes. They distinguish current prepared execution, fresh sessions,
private controller/key material, shareable exports, unpublished source and retained
Trivy snapshots. Corrected the operational warning using GitHub's documented
behavior: `/tmp` survives a rebuild but is cleared when the Codespace stops.

Documentation validation: 20 Bash blocks pass `bash -n`; 143 local links/anchors
across eight guides/indexes resolve; `git diff --check` passes. A read-only tar pass
over 398 tracked/new non-ignored source files succeeds. CLI help agrees with the
documented options. All four demo sessions with database identities still have
their referenced snapshot files, including the relocated rehearsal-02 target;
this existence check is not a new database hash verification.

The viewer returned HTTP 200; defense-01 remains PREPARED with zero live events.
Its executable/configuration content hash remains
`7b4401d0eb8a8ecb7559e05d40829e22bfe8af02f34afb03dcbc73aae8195fa3`.
No backup, external transfer, machine change, cleanup or new delivery was executed
for this documentation follow-up. The shared suite was not rerun for prose edits.

## Download permission follow-up — 16 October 2026

Reproduced permission denial on the zero-byte, root-owned mode-0640
`implementacion/.tmp/doctor-alignment-4qhIRRLp/docker-packages/lists/lock`.
The adjacent `partial/` is also restricted. Preserved original permissions and
excluded this regenerable APT index cache from a private download copy. Kept
repair reports and other readable temporary records; excluded active `private-*`
material. Recorded symbolic links in the manifest instead of creating absolute
links in the archive, and separately retained the referenced external demo DBs.

Download directory: `.tmp/golden-path-download-m3mg6zjj/` at repository root,
linked to `/tmp/golden-path-download-m3mg6zjj/download/`. Download before stopping
the Codespace; this is a local copy, not evidence of an external transfer.

- `implementacion-tmp-private.tar.gz`: 157,971,770 bytes, 156 file entries.
- `defense-database-snapshots.tar.gz`: 683,355,364 bytes, 12 file entries covering
  defense-01 and rehearsals 02, 04 and 05, with original database identities.
- `manifest.json`, `README.txt` and `SHA256SUMS.txt` describe members, hashes,
  exclusions and scope. Source code and `implementacion/evidence/` remain separate.

Every archived member was read back and matched to its original size/hash; DB
bytes matched all four original session identities. Session records remained
unchanged throughout the 261.213-second copy. The viewer returned HTTP 200 and
defense-01 remained PREPARED. Executable/configuration source hash was unchanged.
Updated EN/ES troubleshooting: 22 Bash blocks pass syntax checking, the documented
tar exclusions pass an actual read to `/dev/null`, and `git diff --check` passes.
Assistance: OpenAI Codex; human review pending. No cleanup, new delivery, remote
publication or change to original ownership/permissions occurred.

## Authorized branch publication handoff

The user subsequently requested removal of the untracked `illustrations/`
directory, creation of branch `feat/defense-demo-visual`, and then a push of the
changes. This later instruction authorizes committing and publishing the source;
the earlier no-publication statements retain their historical scope. Generated
evidence, private material and download archives remain ignored and excluded.

The executable/configuration snapshot still matches the real rehearsal's
`7b4401d0eb8a8ecb7559e05d40829e22bfe8af02f34afb03dcbc73aae8195fa3`.
The local shared suite and real execution above remain the validation evidence;
this publication does not claim another integration run on the new commit.
Creating that commit changes the SHA and therefore invalidates resuming the old
defense-01 preparation from the published revision. Preserve its original records
and prepare a new session for a later live presentation; do not rewrite identity.

The publication commit uses `[skip ci]` to preserve the user's remaining
restriction on remote workflow execution. Only `ci.yml` has a push trigger; the
other three workflows require explicit dispatch. No workflow configuration was
changed. Human review and acceptance of this implementation remain pending.
