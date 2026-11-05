# Laboratory release freeze (P00)

[Documentation](README.md) · [Español](../ES/lab-release-freeze.md) ·
[Input specification](../../releases/lab-freeze.inputs.json) ·
[Validation record](../../registros/lab_release_freeze_EN.md) ·
[Proposed release notes](../../releases/lab-release-notes.md)

Prepare a custody release before repository restructuring. This branch implements
no refactor, experiment, database refresh, recording, Pages change or publication.
Current gates: **LAB_RELEASE_NOT_YET_VERIFIED**, **REPOSITORY_REFACTOR_BLOCKED**.
A merged implementation PR does not complete P00 or authorize publication.

## Selection and meaning

| Material | Classification and reason | Recovery / boundary |
|---|---|---|
| Explicit merged source, tooling, locks, canonical acceptance and guides | Required public source asset `lab-source.tar.gz`, generated with `git archive` from the selected full SHA | New source transport, not new experimental evidence. Includes the specification; no self-referential commit field. Four explicit historical source snapshots accompany it: runtime 38e7228, renderer e54eb91, campaign 895a3bd and corrected A 91a33e9. |
| `demo-site-v1.tar.gz` | Required public copy of the existing selected derivative, including original HTML, MP4, WebM and portable logs | Release 416806306 / asset 654877193; exact reviewed Pages lock, 541 files. Public URL: https://tfm-goldenpath.github.io/golden-path-lab/demo/ . Neither the site nor its lock is changed. |
| Exact `freeze-20261018t205939z/frozen-0002` | Required **private custody**, not an upload | Existing Codespace folder `implementacion/evidence/packages/defense-freeze-20261018t205939z/frozen-0002`; five historical anchors, full `SHA256SUMS`, export manifest and portable inventory. Full evidence, recording/validation metadata remain private under the existing publication contract. Owner confirmed custody/hash of the downloaded frozen-0002 copy on 24 October; private destination undisclosed, no independent inspection of that copy claimed. |
| `campaign-evidence-895a3bd-20261004.tar.gz` | Required public original | Release 403052949 / asset 609973571; 1,412,065,509 bytes, committed campaign index and API digest. Verify `FILES.sha256` by streaming all 3,424 members. Preserves development, ten pairs, DB archives, failed review assertion and correction. |
| Campaign `report.json`, `analysis.json`, both publication READMEs and both checksum files | Required public restoration metadata | Exact IDs/sizes/hashes in specification. v2 corrects the missing `originals/` parent instruction; original README and failed observation remain unchanged. |
| `lane-a-catalogue-37342413975-fix-b0d330e.zip` | Required public failed observation | Asset 613292923; source 895a3bd, attempt 1, shared-tests failure, zero scenarios executed. |
| `lane-a-37353632299-91a33e9-evidence-v2.zip` | Required public corrected-source observation | Asset 613384625; source 91a33e9, attempt 1, local-key A even on GitHub. v2 fixes F04 documentation; its predecessor remains unchanged at asset 613379813. |
| v0.1.0, v0.2.0; lane-A v1; frozen-0001, earlier exports/recordings | Historical references | Preserve existing releases/files; do not duplicate them as current experimental proof. Academic releases have no attached assets. |
| A1/A2/B1 functional records, six scripted repairs (AR), four-pair pilot (P) | Historical references, committed with source | Read the readiness matrix. A2 original is not retained here; P local downloads were removed historically and its external copy is unverified. No fresh recovery/re-audit claimed. AR is not human-effort evidence. |
| `economic-evaluation-resources-20261005.zip` | Optional supplement, retained in original release | Asset 613456873, identity in specification; not selected for the new upload. Resource assessment is not productivity evidence. |
| Credentials, keys, kubeconfigs, other sessions, unselected ignored material | Private/excluded | No automatic public copy. Omitted historical build-cache blobs cannot be restored from published packages. |

The specification records exact original locations, release/asset IDs, sizes,
SHA-256 and anchor sources. Required public assets total approximately 1.69 GB.
The private full freeze is 81,988,946 bytes. The Pages subset cannot reconstruct
that full original. On 24 October 2026 the owner confirmed custody and hash
verification of the downloaded frozen-0002 copy. This is an owner declaration,
separate from our local byte checks; its private destination is not disclosed.
It does not establish custody of the complete historical evaluation dossier.
The specification records this scoped confirmation without changing historical bytes.

The [canonical 4 October declaration](../../registros/evaluation_acceptance_20261004_ES.md)
closes evaluation in its reduced scope. Historical campaign notes saying acceptance
was pending remain unchanged; this is a dated distinction, not an inconsistency
resolved by rewriting originals. Later A3/A4 human review remains pending.

Keep A/local-key versus B/OIDC, R/reference versus G/controls, functional trials,
scripted repairs, four-pair pilot and ten-pair campaign separate. Shared positive
checks are not additional samples. Policy rejection differs from registry,
transport or verification failure. Unsupported hosted negatives stay
NOT_EXECUTED; human-effort measurement remains deferred.

The demo executed at `38e7228f7bd8d4bf7c3415fe856653a62dfa8e91`, with original
untracked-file dirty status retained. Renderer content corresponds to e54eb91,
captured before that commit as 38e7228 plus dirty changes. **DEMO_VALID_ACCEPT is
same-image F13 recovery**, not full L01. Historical L01 belongs to run 37353632299,
with its own source and distinct principal/replacement digests. Image identities,
policy/evidence profiles, original DB snapshots and technical outcomes stay in
original manifests and indexes. The release SHA is never substituted for them.

## Recover and verify without regeneration

Use trusted repository code, never scripts inside recovered packages. Inspect
`nproc`, `free -h`, `df -h`, `df -i` for the **actual destination**, and
`docker system df` if accessible. The helper requires 3 GiB plus projected growth,
10,000 spare inodes plus projected files. Large public inputs/candidate/download
copies need about 1.7 GB each; each demo verification temporarily adds at most
512 MiB. `/tmp` was a separate 108-GiB-free filesystem during this preparation;
recheck it. Full historical campaign re-analysis has its own larger requirements
and is not part of this procedure.

```bash
set -euo pipefail
export GH_REPO=tfm-goldenpath/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
nproc
free -h
df -h /workspaces /tmp
df -i /workspaces /tmp
docker system df
WORK=$(mktemp -d /tmp/lab-release-custody.XXXXXX)
CLI="$PWD/implementacion/scripts/lab-release.py"
python3 "$CLI" recover "$WORK/inputs" --receipt "$WORK/recovery.json"
python3 "$CLI" inventory "$WORK/inputs" > "$WORK/inventory.json"
FROZEN="$PWD/implementacion/evidence/packages/defense-freeze-20261018t205939z/frozen-0002"
python3 implementacion/scripts/defense-demo/pages.py verify-frozen "$FROZEN"
python3 implementacion/scripts/defense-demo/pages.py unpack \
  "$WORK/inputs/demo-site-v1.tar.gz" "$WORK/site"
python3 implementacion/scripts/defense-demo/pages.py verify-site "$WORK/site"
node implementacion/tests/defense_demo/static-export-check.mjs \
  "$WORK/site" "$WORK/browser" site
```

Open `$WORK/site/recorded.html` with `file://`, or serve `$WORK/site` with
`python3 -m http.server 8000 --bind 127.0.0.1 --directory "$WORK/site"` and open
`http://127.0.0.1:8000/demo/`. The browser harness checks the repository prefix,
F11/F13 and early logs, attribution, F13 inventories, original downloads, console
geometry, historical L01, disabled actions and explicit missing/corrupt originals.
Reports and temporary corruption copies stay outside the recovered original.
The original silent video remains included without audio or narration. Presentation
playback and decoder/narration checks are outside this task by owner request;
historical bytes remain untouched. The included
HTML's full-archive download link still requires the private `evidence.tar.gz`;
the public portable selection is self-contained for its selected originals.

Recovery refuses an existing destination, changed API identity or trusted hash.
Interruption leaves partial files for diagnosis: do not reuse that directory or
call a partial download verified. Retry into a fresh destination. No cleanup,
prune, original deletion or regeneration is needed. Only task-owned temporary
verification directories are automatically removed; failure inputs remain.

The release reader rejects absolute/traversing paths, links/specials, duplicate
or colliding entries, overlarge members, count/expanded-size excess and incorrect
exact checksum inventories. It hashes streams without extracting the campaign
or scenario packages. Their nested original archives are authenticated as opaque
members; this does **not** repeat their historical signature/DB validations.
Selected plaintext members receive a bounded credential scan; previously published
nested content retains its recorded publication audits and known original paths.
This is not a universal sensitive-data guarantee. Do not publish new private
material to resolve a custody gap; any sanitized derivative needs separate review.

## Post-merge checklist and exact-source preparation

These commands are **pending**, not authorized by the implementation PR. First
complete human review, record any remaining dossier-custody limits, and obtain explicit authorization
for release creation/publication. Use the actual publication date; provisional
name on 24 October is `lab-v2026.10.24`. Do not reuse a colliding name.

- [ ] Preparation/tooling reviewed.
- [ ] Required public originals and private custody verified; external location and recovery owner recorded privately without credentials.
- [ ] Candidate byte checks and offline checks accepted with stated limits.
- [ ] Exact merged source selected, main ancestry and required checks verified.
- [ ] Final manifest hash and explicit upload list reviewed independently.
- [ ] Draft created, all assets attached, independently downloaded/verified.
- [ ] Explicit publication authorization obtained; publish once.
- [ ] Published tag and all bytes independently re-downloaded/verified; release attestations checked when available.
- [ ] Human/custody gaps recorded and refactor readiness decided separately.

```bash
set -euo pipefail
export GH_REPO=tfm-goldenpath/golden-path-lab
PR_NUMBER=$(gh pr view chore/lab-release-freeze --repo "$GH_REPO" --json number --jq .number)
gh pr view "$PR_NUMBER" --repo "$GH_REPO" --json state,mergeCommit,url > "$WORK/merged-pr.json"
jq -e '.state == "MERGED" and .mergeCommit.oid != null' "$WORK/merged-pr.json"
RELEASE_SHA=$(jq -r .mergeCommit.oid "$WORK/merged-pr.json")
git fetch origin main
git merge-base --is-ancestor "$RELEASE_SHA" origin/main
git show "$RELEASE_SHA:implementacion/releases/lab-freeze.inputs.json" > "$WORK/merged-spec.json"
git show "$RELEASE_SHA:implementacion/scripts/lab-release.py" > "$WORK/merged-tool.py"
# Compare the merged tool/specification and merge diff with the reviewed PR.
gh api "repos/$GH_REPO/commits/$RELEASE_SHA/check-runs" --paginate > "$WORK/merged-checks.json"
gh run list --repo "$GH_REPO" --commit "$RELEASE_SHA" --workflow ci.yml \
  --json databaseId,headSha,status,conclusion,url > "$WORK/merged-ci.json"
jq -e --arg sha "$RELEASE_SHA" 'any(.[]; .headSha == $sha and .status == "completed" and .conclusion == "success")' "$WORK/merged-ci.json"
# Use stored user authentication; the Codespace integration token lacks admin reads.
if env -u GH_TOKEN -u GITHUB_TOKEN gh api \
  "repos/$GH_REPO/branches/main/protection/required_status_checks" \
  > "$WORK/required-checks.json" 2> "$WORK/required-checks.stderr"; then
  jq -e 'has("contexts") or has("checks")' "$WORK/required-checks.json"
else
  # Only this exact response establishes absence of classic protection.
  jq -e '.status == "404" and .message == "Branch not protected"' "$WORK/required-checks.json"
fi
# Also inspect applicable active rulesets; confirm EVERY required check, not only ci.yml.
env -u GH_TOKEN -u GITHUB_TOKEN gh api "repos/$GH_REPO/rules/branches/main" --paginate > "$WORK/main-rules.json"
# A 403 or any other unexpected error stops the procedure. A classic 404 is not a CI pass.
VERIFY_TREE="$WORK/merged-source"
git worktree add --detach "$VERIFY_TREE" "$RELEASE_SHA"
# Reuse the pinned installed CLI PATH, install only the locked validation dependencies.
npm ci --prefix "$VERIFY_TREE/implementacion/tooling" --ignore-scripts --no-audit --no-fund
make -C "$VERIFY_TREE/implementacion" doctor > "$WORK/final-doctor.log" 2>&1
make -C "$VERIFY_TREE/implementacion" test > "$WORK/final-test.log" 2>&1
CLI="$VERIFY_TREE/implementacion/scripts/lab-release.py"
python3 "$CLI" prepare "$WORK/inputs" "$WORK/final" \
  --frozen "$FROZEN" --source "$RELEASE_SHA" > "$WORK/final-preparation.json"
MANIFEST_SHA=$(jq -r .manifestSha256 "$WORK/final-preparation.json")
python3 "$CLI" verify "$WORK/final" --source "$RELEASE_SHA" \
  --manifest-sha256 "$MANIFEST_SHA" --receipt "$WORK/final-verification.json"
```

Keep the independently reviewed `MANIFEST_SHA`, source SHA, specification hash,
CI URLs and asset list in the approval record. Do not derive trust from a downloaded
manifest and its downloaded checksum alone. The attached source archive is deliberate;
GitHub-generated source archives are not supported by `verify-asset`. The manifest
hashes assets; `RELEASE-SHA256SUMS.txt` hashes those assets plus the manifest and does
not hash itself. Verification receipts remain outside the immutable release.

## Authorized draft, publication and independent receipt

The installed `gh 2.102.0` supports these commands. Recheck help/version and access
at publication. The initial integration-token HTTP 403 was resolved on 24 October
using stored GitHub CLI user authentication with GH_TOKEN/GITHUB_TOKEN omitted.
The read-only response confirms `enabled=false`, `enforced_by_owner=false`.
Classic protection returns 404 `Branch not protected`; active main ruleset 24047874
has deletion/non-fast-forward/PR rules, zero required approvals and no required
status-check rule returned. No setting changed. Recheck before publication;
choosing to enable immutability remains a separate decision. Immutability, if enabled,
protects assets/tag only **after publication**, so attach everything first.

```bash
LAB_TAG="lab-v$(date -u +%Y.%m.%d)"
RELEASE_TITLE='Golden Path Lab — frozen research and demonstration baseline'
RELEASE_NOTES="$VERIFY_TREE/implementacion/releases/lab-release-notes.md"
gh --version
gh release create --help
gh release verify --help
gh release verify-asset --help
env -u GH_TOKEN -u GITHUB_TOKEN gh api "repos/$GH_REPO/immutable-releases" > "$WORK/immutability-setting.json"
gh api "repos/$GH_REPO" --jq .permissions
# Inspect both lists: network/access failure is not proof of absence.
gh api "repos/$GH_REPO/releases" --paginate > "$WORK/existing-releases.json"
git ls-remote origin "refs/tags/$LAB_TAG" "refs/tags/$LAB_TAG^{}" > "$WORK/tag-collision.txt"
test ! -s "$WORK/tag-collision.txt"
jq -se --arg tag "$LAB_TAG" 'all(.[][]; .tag_name != $tag)' "$WORK/existing-releases.json"
# Stop on any existing draft/tag. Inspect its identity deliberately; never replace assets.
mapfile -t UPLOAD_NAMES < <(jq -r '.assets[].name' "$WORK/final/release-manifest.json")
UPLOAD_NAMES+=(release-manifest.json RELEASE-SHA256SUMS.txt)
UPLOAD_PATHS=()
for name in "${UPLOAD_NAMES[@]}"; do UPLOAD_PATHS+=("$WORK/final/$name"); done
# Requires the separate explicit remote authorization.
gh release create "$LAB_TAG" --repo "$GH_REPO" --target "$RELEASE_SHA" \
  --draft --latest=false --title "$RELEASE_TITLE" --notes-file "$RELEASE_NOTES"
gh release upload "$LAB_TAG" --repo "$GH_REPO" "${UPLOAD_PATHS[@]}"
python3 "$CLI" download-verify "$WORK/draft-download" --draft --tag "$LAB_TAG" \
  --source "$RELEASE_SHA" --manifest-sha256 "$MANIFEST_SHA" --receipt "$WORK/draft-receipt.json"
# STOP: inspect the draft receipt, custody and limits; explicit publication approval required.
gh release edit "$LAB_TAG" --repo "$GH_REPO" --draft=false --latest=false
python3 "$CLI" download-verify "$WORK/published-download" --tag "$LAB_TAG" \
  --source "$RELEASE_SHA" --manifest-sha256 "$MANIFEST_SHA" --receipt "$WORK/published-receipt.json"
```

`download-verify` checks the actual tag object (including annotated tags), exact
remote inventory, every downloaded byte and the source archive against the explicit
Git commit. It rechecks remote identity after downloading. If `immutable=true`, it
runs `gh release verify "$LAB_TAG" --repo "$GH_REPO"` and
`gh release verify-asset "$LAB_TAG" "$DOWNLOADED_ASSET" --repo "$GH_REPO"` for
**every attached asset**; any failure stops receipt issuance. For `immutable=false`
it records cryptographic release verification unavailable and still requires the
independent manifest/specification anchors. This weaker protection cannot prevent
later mutable-release replacement; preserve the receipt/anchors externally.

A receipt of `PUBLISHED_BYTES_VERIFIED` alone is not human acceptance or durable
private custody. Only after all checklist gates are actually met may a **separate**
reviewed receipt state `LAB_RELEASE_VERIFIED` and `READY_FOR_PRODUCT_FOUNDATION`.
Until then preserve `LAB_RELEASE_NOT_YET_VERIFIED` / `REPOSITORY_REFACTOR_BLOCKED`.
Neither status starts product work automatically.
