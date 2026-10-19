# Publish the verified recorded defense

[Defense index](README.md) · [Español](../../ES/defense/github-pages.md)

The site is the **existing frozen portable output**, not `implementacion/demo/`
and not a new laboratory run. Publishing preserves the original execution source,
renderer, local trust lane A and selected historical GitHub observation. F13 recovery
uses the same digest (DEMO_VALID_ACCEPT); historical L01 replacement is separate.
Integrity verification here does not repeat cryptographic verification. Human timed
narration remains pending. No publication occurs from a pull request.

## Recovery and trust

The reviewed copy exists in this Codespace at:

```bash
export FROZEN_DIR="$PWD/implementacion/evidence/packages/defense-freeze-20261018t205939z/frozen-0002"
python3 implementacion/scripts/defense-demo/pages.py verify-frozen "$FROZEN_DIR"
```

Use the **repository** verifier, never execute code from an untrusted download.
`pages.py` pins the five historical hashes recorded in
[the freeze record](../../../registros/demo_static_freeze_EN.md). It checks the
root and portable checksum inventories, safely streams the authenticated archive,
checks every member against its manifest and compares the exact portable file set,
bytes, sizes and hashes (including portable/SHA256SUMS). Recomputed checksums cannot
legitimize changed portable bytes. Session, source, renderer and selection must match.
The original package and its manifests are never rewritten.

A clone does not restore ignored evidence. If absent, identify the original
Codespace with `gh codespace list`, consult `gh codespace cp --help`, and copy the
explicit frozen-0002 path to a **new** destination. Record origin, date, size and
destination and rerun the trusted verification. Never substitute another session,
frozen-0001, a Windows screenshot montage, or newly generated evidence.

## Reviewed publication selection

The versioned lock is `implementacion/demo/pages-source.lock.json`.
The generated site is `implementacion/evidence/packages/demo-site-v1/` and transport
is the adjacent `demo-site-v1.tar.gz`. `demo/` matches portable byte for byte.
The only additional public files are a small landing page, a publication manifest,
and the unchanged recorded HTML, MP4 and WebM backups. Originals selected by the
frozen portable export are content addressed, with their logical provenance retained.

The full `evidence.tar.gz`, freeze/validation/recording reports, private keys,
credentials, databases, other sessions and snapshots are **not** published.
The downloaded single HTML retains its original package link: that link needs the
private local `evidence.tar.gz` beside it; it is explicitly unavailable on Pages.
Use the portable demo for complete selected originals, or the original frozen
folder offline. The HTML remains useful for its complete essential small logs.
The landing page explains this limit rather than altering the reviewed HTML.

The separate publication manifest inventories every other site file; its own hash
is fixed by the lock (avoiding a circular self hash). It records tool commit and
exact tool hashes, historical identities, selection, exclusions and validation scope.

Local reproducible verification of the **already prepared bytes**:

```bash
python3 implementacion/scripts/defense-demo/pages.py verify-site implementacion/evidence/packages/demo-site-v1
# Use a NEW destination; extraction never overwrites an existing directory.
python3 implementacion/scripts/defense-demo/pages.py unpack \
  implementacion/evidence/packages/demo-site-v1.tar.gz \
  implementacion/evidence/packages/demo-site-restored
python3 -m http.server 8000 --bind 127.0.0.1 \
  --directory implementacion/evidence/packages/demo-site-restored
```

Open `http://127.0.0.1:8000/demo/#demo?focus=defense` using a private Codespaces port.
The application also works under `/golden-path-lab/demo/`. Archive reads/extraction
are bounded (12,000 regular files, 64 MiB/file, 512 MiB total); links, traversal,
duplicates, extra/missing files and hash changes fail. Before copies/downloads,
3 GiB plus growth and 10,000 plus projected inodes must remain available.

`stage` was used once to create a new immutable staging/transport and lock, after
historical verification. Ordinary publication must **not** rerun staging, export,
freeze or the laboratory. A changed selection requires a separately reviewed lock
and new technical asset identity; never overwrite one.

## After merge: explicit remote steps

Run only after the PR is reviewed and merged, from updated main. These steps have
**not** been executed by this PR. No academic v0.x release is modified.

```bash
export GH_REPO=tfm-goldenpath/golden-path-lab
export SITE_ARCHIVE="$PWD/implementacion/evidence/packages/demo-site-v1.tar.gz"
python3 implementacion/scripts/defense-demo/pages.py verify-site implementacion/evidence/packages/demo-site-v1
# Dedicated technical transport; fail if the tag/release already exists.
# --latest=false keeps this separate from academic release selection.
gh release create demo-site-freeze-20261018-v1 "$SITE_ARCHIVE" \
  --repo "$GH_REPO" --target main --latest=false \
  --title 'Recorded demo transport: freeze-20261018t205939z v1' \
  --notes 'Technical transport only. Historical evidence; no new laboratory run. See pages-source.lock.json and publication-manifest.json.'
# NEW directory; fetch checks explicit tag, unique asset, size and SHA-256.
python3 implementacion/scripts/defense-demo/pages.py fetch implementacion/evidence/packages/pages-redownload-v1
python3 implementacion/scripts/defense-demo/pages.py unpack \
  implementacion/evidence/packages/pages-redownload-v1/demo-site-v1.tar.gz \
  implementacion/evidence/packages/pages-verified-v1
```

Before `release create`, inspect `gh release view demo-site-freeze-20261018-v1`
and stop if it exists; never use `--clobber`. The transport hash, not a mutable tag
alone, authorizes the bytes. The asset is not uploaded by the implementation task.
The download prints actual release/asset IDs; retain that output.

A repository administrator must check **Settings → Pages → Build and deployment →
Source: GitHub Actions** and the `github-pages` environment's main-only rules.
API and public URL returned 404 during local inspection; this is not proof of
permission to configure Pages. Preserve any existing site found at deployment time:
a Pages artifact replaces the whole site, not only `/demo/`. Do not deploy over
unrelated content. No organization permission changes or PAT fallback are needed.

```bash
gh workflow run demo-pages.yml --repo "$GH_REPO" --ref main
gh run list --repo "$GH_REPO" --workflow demo-pages.yml --event workflow_dispatch --limit 5
# Copy the actual ID from that invocation (check actor, SHA and time).
read -r -p 'Confirmed deployment run ID: ' PAGES_RUN_ID
gh run watch "$PAGES_RUN_ID" --repo "$GH_REPO" --exit-status
gh run view "$PAGES_RUN_ID" --repo "$GH_REPO" --json url,headSha,status,conclusion
gh api repos/tfm-goldenpath/golden-path-lab/pages --jq .html_url
```

Intended URL: `https://tfm-goldenpath.github.io/golden-path-lab/demo/`; use the
actual Pages API/action output after deployment, not a presumed success URL.
Manual dispatch requires main. Validation fetches the fixed transport, verifies
hash before safe extraction and checks the exact site inventory before uploading.
Deployment depends on validation; only it receives pages/id-token write. Official
SHA-pinned actions: [configure-pages](https://github.com/actions/configure-pages),
[upload-pages-artifact](https://github.com/actions/upload-pages-artifact),
[deploy-pages](https://github.com/actions/deploy-pages). Their revisions are recorded
in the workflow and validation record, resolved from official repositories.

## Public acceptance and rollback

After a successful run, download `publication-manifest.json` and compare its SHA-256
with `manifestSha256` in the reviewed lock. Download each inventoried file and
compare its size/hash (including backups). Open the actual prefixed URL in a fresh
browser: confirm recorded identity, F11/F13/early logs and F13 inventories/recovery,
L01 historical run/digest separation, original downloads, map/navigation/reload,
and no /api, localhost, websocket or execution actions. Test WebM or MP4 playback;
the available testing Chromium lacks H.264, so MP4 needs a compatible player.
These public checks remain NOT_EXECUTED until deployment; local tests are not Pages.

Rollback is a new reviewed commit restoring the previous lock and its exact
verified technical package, followed by manual dispatch from main. Do not rebuild
or replace evidence or overwrite assets. Keep the prior site lock and transport.

For live controls use the [browser preparation procedure](README.md), with a new
source-compatible session and explicit `--enable-actions`; Pages cannot grant that
capability. If internet fails use the verified original `recorded.html` via file://,
portable folder via static HTTP, or 159.92-second silent video. See the
[static runbook](static-freeze.md). Opening/publishing adds no experimental sample.

Post-deployment byte verification (new local destination):

```bash
python3 implementacion/scripts/defense-demo/pages.py verify-public implementacion/evidence/packages/pages-public-v1
```

If a prior lock refers to another frozen source, restore its matching reviewed validator as well; do not bypass the current historical anchors. This first publication has no previous Pages deployment to claim as tested rollback.
