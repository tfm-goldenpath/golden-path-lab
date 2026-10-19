# Verified recorded demo / Pages preparation — 19 October 2026

## Source and recovery

Branch `chore/demo-github-pages`, fast-forwarded main **7322dae86d6d26d9e8b6c54d7077c100032dfdc9** (PR #56).
The two unrelated root npm files were preserved untracked. No laboratory execution,
cluster, build, scan, signature, attestation, campaign, workflow dispatch, release,
Pages configuration or deployment occurred in this task.

The exact requested package was already present in this Codespace:
`implementacion/evidence/packages/defense-freeze-20261018t205939z/frozen-0002/`.
No remote recovery or replacement regeneration was necessary. On 19 October 2026
it was read in place and copied selectively to the new ignored destination
`implementacion/evidence/packages/demo-site-v1/`. All original evidence, older
exports/freezes, snapshots and videos were retained. Source tree: **81,988,946 bytes**.

The five historical SHA-256 anchors below match the versioned
[freeze record](demo_static_freeze_EN.md); they were not recalculated to authorize
unknown bytes:

| Input | SHA-256 |
|---|---|
| evidence.tar.gz | `d9b6738e275db0f45f78bd28148477701100983ef8a4dd464fa7d2af75fa4178` |
| freeze.json | `81b9ba8d56c007d498c375371dae4db20046f3b1e6908b243dd3c0503e46802d` |
| recorded.html | `0b9722d6700c4efb898e39302cb8d65e1a8d2c054095635d18f586f1140c2f1d` |
| video.mp4 | `664047c847ece87276903ae6ad00d45397cb05c8bed1929e4662166405c6b825` |
| original.webm | `b7840e65fbf8cbfac1dac4384bcd050e7b96a74d5651e53665875197a77f8d72` |

Execution source remains `38e7228f7bd8d4bf7c3415fe856653a62dfa8e91`.
Renderer content remains the pre-commit capture corresponding to `e54eb9117f88d957fdb4caedf653f0065d9dd661`, content hash
`fd5af28bc8f91d3f23be5c644fa2717fbe29c9c531858508d5e878d849c34aaf`.
Nothing rewrites it to the publication revision. Imported lane-A observation remains
`37353632299-fa7f7e2ecb58` with the principal/L01-update digest distinction.

## Implementation and trust boundary

`pages.py` reuses the reviewed repository static verifier, validates all five
anchors, both checksum inventories and the complete authenticated archive inventory.
It safely streams 7,728 regular archive members (7,727 manifest entries plus the
manifest itself), validates each size/hash and compares the exact 536-file portable
set including its own checksum inventory. Freeze, archive, portable and snapshot
must agree on session, selection, execution source and renderer.

A synthetic regression demonstrates that changing portable bytes **and** recalculating
its SHA256SUMS still fails the archive association. Other regressions cover every
anchor, corrupt transport, extras, missing essentials, live snapshots, wrong context,
links/traversal/duplicates/special entries, expansion bounds and reserve refusal.
Tests were added during implementation; no retrospective TDD claim is made.

The initial real verification correctly rejected our overly broad "nonempty"
requirement for two genuinely empty coordinator output.log files. Their attributed
control outputs are separate, nonempty originals. The check now permits an original
of recorded size zero with its exact hash; it still rejects empty excerpts for
nonempty essential originals. Frozen files were not changed.

Staging preserves portable bytes and adds only a landing page, publication manifest
and the three original backups. A credential/private-key/signed-URL scan passed;
no potentially sensitive logical filenames were found among 7,185 artifact entries.
This is a bounded review, not a universal proof that arbitrary text cannot contain
sensitive information. Existing exporter exclusions remain in force.

The full evidence archive and freeze/recording/validation reports remain local.
The unchanged single HTML's archive link needs its original local archive; that
file is explicitly not served by Pages. The landing and guides explain this;
selected full originals remain available in the portable application. No reviewed
HTML, scenario or historical result was rewritten to add publication links.

Publication tools were committed at **abf6dff** before staging; exact script hashes
and the full commit are in publication-manifest.json. Subsequent changes add validation/documentation/lock material and a stricter
Pages runner guard; publication scripts remain unchanged. The lock authenticates the publication
manifest, which authenticates every other file; there is no circular self hash.

## Prepared bytes and transport

| Output | Value |
|---|---|
| Site | `implementacion/evidence/packages/demo-site-v1/` |
| Site files / bytes | **541 / 60,567,916** |
| Transport | `implementacion/evidence/packages/demo-site-v1.tar.gz` |
| Transport bytes | **24,870,638** |
| Transport SHA-256 | `deba74a10eb63503cfbe58b1e447f3d1cbb06a2ed9f404ddd0c2519c4cbf7a92` |
| Publication manifest SHA-256 | `0fa7727601f345415d36b1bd520ab2f740363e246848840fb4f9bbb0ff660b11` |
| Planned dedicated technical release | `demo-site-freeze-20261018-v1` |
| Planned asset | `demo-site-v1.tar.gz` |
| Local extraction roundtrip | `implementacion/evidence/packages/demo-site-restored/`, VERIFIED |

The planned release was queried and returned 404; no release/asset ID exists to
report. No upload occurred. Fetch first checks the named release asset's uniqueness,
size and state, downloads only that asset and checks the locked transport hash
before extraction. Existing destinations are rejected, not overwritten.

Pages API and `https://tfm-goldenpath.github.io/golden-path-lab/` returned **404**.
No existing public site was observed; this does not establish configuration rights.
A person must recheck and select GitHub Actions in Pages settings after merge.
The deployment replaces the whole site; an unrelated site discovered then must
be preserved through a separately agreed plan, not silently replaced.

## Workflow and policy

Manual dispatch only, both jobs guarded to main, validation → deployment via needs,
concurrency, checkout without persisted credentials. Validation has contents:read;
only deployment has pages:write/id-token:write. No PAT, laboratory or downloaded
script execution. Upload points exclusively to verified staging.

Official action SHA resolution via `gh api repos/actions/<action>/commits/<ref>`
and official action documentation on 19 October 2026:

| Action / ref | Resolved SHA |
|---|---|
| checkout v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| configure-pages v5 | `983d7736d9b0ae728b81ab479565c72886d7745b` |
| upload-pages-artifact v4 | `7b1f4a764d45c48632c6b24a0339c27f5614fb0b` |
| deploy-pages v4 | `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` |

Sources: [configure-pages](https://github.com/actions/configure-pages),
[upload-pages-artifact](https://github.com/actions/upload-pages-artifact),
[deploy-pages](https://github.com/actions/deploy-pages),
[checkout](https://github.com/actions/checkout).
The Conftest exception is structural, not job-name-only: exact manual/main guard,
restricted permissions/environment/steps, pinned official actions, no shell,
container, inherited env/defaults or privileged job extras. Existing F01/F02
expectations remain unchanged; sixteen malicious mutations are rejected.

## Actual validation

Logs/screenshots are ignored under `implementacion/evidence/raw/pages-validation/`.

| Check | Result / retained output |
|---|---|
| Historical anchors, root/portable sums, exact archive association | PASS; historical-verification.json, frozen-integrity.json |
| Site verification and extraction roundtrip | PASS; stage.json, transport-roundtrip.json |
| Dashboard suite | PASS; 151 tests before two additional publication regressions; test-defense.log |
| Final focused publication regressions | PASS; 13 tests, pages-unit-final.log |
| Environment / service and contracts | PASS; 6 / 951 tests, shared-no-lab.log |
| Python policies / Conftest decisions / Kyverno engine | PASS; 45 / 62 / 16, shared-no-lab.log |
| Actual workflow policy checks / F01-F02 static family | PASS; same shared log, no remote workflow |
| Real standalone HTML, fresh browser/offline | PASS; browser/result.json, zero HTTP/API requests |
| Real prefixed static site, originals/attribution/inventories/recovery | PASS; browser/result.json, 73 checks/observations including paired geometry/history items |
| Downloaded original F12 hash, corruption/missing detection | PASS; browser/downloaded-f12.json; only temporary test copies altered |
| Historical lane A L01-update distinct digest and original bundle | PASS; browser/portable-l01-history.png |
| 1366×768 / 1920×1080 / 390 px | PASS; browser screenshots, no document overflow, **400 px visible console / 15 px font** |
| Native Chromium zoom 200% and keyboard focus | PASS; zoom.json and zoom-*.png, 683×384 CSS viewport |
| Backup download hashes and original WebM playback | PASS; backups/result.json, backups/webm-playback.png |
| H.264 complete decode | PASS; video-decode.log (FFmpeg, unchanged video) |
| H.264 playback in this Chromium | NOT_EXECUTED: codec unavailable; WebM alternative works |
| Release upload / Actions deployment / public URL acceptance | NOT_EXECUTED: explicit post-merge steps |
| Cryptographic bundle tests / new cryptographic verification | NOT_EXECUTED: no signing authorized in this task; historical reports retained |
| Human narration/review | PENDING; no human measurement or acceptance invented |

The default full `make test` includes real synthetic bundle signing; instead the
applicable non-signing targets were executed explicitly as requested. No `make demo`,
`smoke-env`, new Trivy scan, image build or laboratory workflow ran. Rendering tests
read real frozen evidence; malicious archive/unit fixtures are explicitly synthetic.

## Exact local commands

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
python3 implementacion/scripts/defense-demo/pages.py verify-frozen implementacion/evidence/packages/defense-freeze-20261018t205939z/frozen-0002
# Already performed once; the existing output/lock cannot be overwritten:
python3 implementacion/scripts/defense-demo/pages.py stage implementacion/evidence/packages/defense-freeze-20261018t205939z/frozen-0002 implementacion/evidence/packages/demo-site-v1
python3 implementacion/scripts/defense-demo/pages.py unpack implementacion/evidence/packages/demo-site-v1.tar.gz implementacion/evidence/packages/demo-site-restored
make -C implementacion test-defense
make -C implementacion test-env test-unit test-policies test-workflows
python3 -m unittest discover -s implementacion/tests/defense_demo -p test_pages.py -v
node implementacion/tests/defense_demo/static-export-check.mjs implementacion/evidence/packages/demo-site-v1 implementacion/evidence/raw/pages-validation/browser site
python3 -m http.server 8898 --bind 127.0.0.1 --directory implementacion/evidence/packages/demo-site-v1
node implementacion/tests/defense_demo/zoom-check.mjs http://127.0.0.1:8898/demo implementacion/evidence/raw/pages-validation/zoom
node implementacion/tests/defense_demo/pages-backups-check.mjs http://127.0.0.1:8898/ implementacion/evidence/raw/pages-validation/backups
ffmpeg -v error -i implementacion/evidence/packages/demo-site-v1/video.mp4 -f null -
```

A final browser pass additionally asserts that every automatic request is loopback
and rejects WebSockets (`browser-final/`). Test servers belong only to this task.
The deployment/rollback commands are in [EN](../docs/EN/defense/github-pages.md)
and [ES](../docs/ES/defense/github-pages.md). No guessed asset ID or deployment
run is recorded. The public verifier is ready but not run before publication.

## Resources and contribution

Effective 4 CPUs and 16 GB RAM; workspace capacity 32 GB. Initial `df` showed
8.5 GiB free and 1,689,194 inodes. After staging, restoration and checks:
**8,917,278,720 bytes free** (8.305 GiB), **1,687,993 free inodes** at
2026-10-19T00:30:05Z. `/tmp` is a different device; its capacity was not counted as
workspace/Docker space. No cleanup/prune/deletion of retained evidence occurred.
3 GiB reserve plus growth/inode guards remain enforced. These are observations,
not a newly measured peak or capacity guarantee.

OpenAI Codex implemented scripts/workflow/policy tests and bilingual guidance,
verified the authentic package, ran local checks and inspected rendered screenshots.
Human review and publication approval remain pending. Previous human records,
experimental results and video/narration classifications were not changed.
