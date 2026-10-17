# Run the demo and preserve it when changing machines

The current interface uses [internal navigation and full-height evidence detail](demo-workspace.md); see its controls, original log links and proposed narration route.

For the bounded four-attempt F11/L06 local profile, use [F11 comparison](f11-comparison.md). Historical runs below retain their original scope and resources.

[Español](../ES/defense-demo-operations.md) · [Full guide and presentation script](defense-demo.md) · [Real validation](../../registros/defense_demo_validation_EN.md)

Run all commands from `/workspaces/golden-path-lab`. This is **lane A**, using kind, zot and local trust, including in Codespaces. This guide requires no publication or remote workflow execution.

## 1. Present the already prepared session

On 16 October 2026, `defense-01` was left prepared, without signed results, with the viewer on port 8765, bound to revision `1ec4cb9e89fce412df90510b7f3b3f3ca03bb50f` and the documented snapshot. Creating the publication commit changes the SHA: prepare a new session using section 2 to execute from the published branch. These commands describe the original laboratory and revision; the viewer can still display its records afterwards:

```bash
cd /workspaces/golden-path-lab
bash implementacion/scripts/defense-demo.sh status --session defense-01
# Only while the original revision and preparation still match:
bash implementacion/scripts/defense-demo.sh present \
  --session defense-01 --auto --budget-seconds 180
```

In VS Code, open **Ports → 8765 → Open in Browser**, keeping visibility **Private**. In a local devcontainer, open `http://127.0.0.1:8765`. If only the viewer is missing, start it without rebuilding the laboratory:

```bash
bash implementacion/scripts/defense-demo.sh serve --session defense-01 --port 8765
```

The panel shows F11 blocked by Conftest, F13 blocked by missing results, authorization and acceptance of the same digest, and a new F11 request rejected by Kyverno with the Deployment unchanged. Initial acceptance is `DEMO_VALID_ACCEPT`, not complete L01. The final rehearsal measured **27.38 s live** and **713.80 s preparation**; these are observations on that machine, not timing guarantees.

`status` reads the record; `present` also checks current availability and identity. After a restart or migration, a `PREPARED` record alone does not permit continuation. Do not repeat `present` on a session that issued results or rebuild its image to recreate F13: prepare another session.

## 2. Start in a new environment

Select branch `feat/defense-demo-visual` when creating the Codespace, or retrieve that branch from `origin` after publication. A checkout of the base revision does not contain the new files. Also preserve any later local changes using the backup instructions. Use the **Golden Path - implementation** devcontainer, defined in [`.devcontainer/implementacion/devcontainer.json`](../../../.devcontainer/implementacion/devcontainer.json).

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
df -h "$PWD" /tmp
df -i "$PWD" /tmp
docker system df
make -C implementacion doctor
make -C implementacion setup-validation
```

If `doctor` reports missing tools, inspect its diagnostics and use the pinned installer, then repeat `doctor` and `setup-validation`. Node/npm/Docker come from the devcontainer. Do not substitute `latest` versions.

```bash
PREFIX="$PWD/implementacion/.tools" \
  bash implementacion/scripts/install-security-tools.sh --with-platform-tools
```

The following names are unused at the 16 October handoff. Check `list` and change them after use. Run one laboratory at a time; port 8765 must be free. To retire the previous preparation, first follow preservation in sections 4–5, then cleanup in section 3.

**Automatic full rehearsal**, including long preparation:

```bash
bash implementacion/scripts/defense-demo.sh list
bash implementacion/scripts/defense-demo.sh up \
  --session rehearsal-06 --profile defense --auto --port 8765
```

After this rehearsal, preserve and clean its resources before preparing the presentation:

```bash
bash implementacion/scripts/defense-demo.sh export --session rehearsal-06
bash implementacion/scripts/defense-demo.sh cleanup --session rehearsal-06 --stop-server
```

**Preparation and presentation**, at separate times:

```bash
# Before presenting: leave image, evidence, policies and viewer prepared.
bash implementacion/scripts/defense-demo.sh prepare \
  --session defense-02 --profile defense --serve --port 8765

# During the presentation: requires that intact preparation.
bash implementacion/scripts/defense-demo.sh present \
  --session defense-02 --auto --budget-seconds 180
```

To pause between stages, replace the last command with `present --session defense-02 --interactive --budget-seconds 180`. Pauses count. Alternatively, `step --session defense-02` advances one operation per invocation. These are alternative ways to consume a fresh preparation, not instructions to repeat issuance. Ctrl+C preserves the interruption; it does not become a successful rejection or authorize retrying a signature. The [three-minute script](defense-demo.md#terminal-control-time-and-failure) explains when to switch to the saved backup.

## 3. Export and remove resources

```bash
bash implementacion/scripts/defense-demo.sh export --session defense-01
# Only after finishing with, or deciding to retire, this preparation:
bash implementacion/scripts/defense-demo.sh cleanup --session defense-01 --stop-server
```

Cleanup exports before removing owned resources and produces another export after checking their absence. Keep the **latest** `implementacion/evidence/packages/defense-SESSION/export-NNNN/`, containing `recorded.html`, `evidence.tar.gz`, `manifest.json` and `SHA256SUMS.txt`. Packaging or cleanup failure leaves a diagnostic, not proof that the laboratory is clean. Do not use `docker system prune -a --volumes`.

A complete, verified backup of `rehearsal-05` already exists at `implementacion/evidence/packages/defense-rehearsal-05/export-0003/`. Download that entire directory. `recorded.html` works offline and displays **“Ejecución guardada; no en directo”**; the adjacent package contains complete evidence. No video was recorded. An export of `defense-01` before live execution shows only its preparation, never results from another rehearsal.

## 4. What to keep from `.tmp`, and what lives elsewhere

**Running the demo again requires the current source and a newly prepared environment. Preserving its observations additionally requires evidence; exact scan replay also requires the original Trivy database.** Copying only `.tmp` does not cover these three purposes.

| Path from the repository root, except `/tmp` | What to preserve and why |
|---|---|
| Modified source and new files | Retrieve published source from `feat/defense-demo-visual` and preserve any later local changes. A clone cannot recover unpublished files; `git diff` alone omits new untracked files. The backup includes scripts, demo assets, tests, documentation, pins and configuration. |
| `.tmp/defense-kit/` | Keep `README.md` and `f11-static.sh` as original context. The implemented static fallback now lives in `implementacion/scripts/defense-demo/f11-static.sh`. |
| `implementacion/.tmp/defense-demo/` | Preserve session records, ownership and original-evidence pointers. These are private coordinator data, not a portable laboratory. Copying them cannot restore old PIDs, boot identity or resource identities. |
| `implementacion/.tmp/private-*` | Sensitive active-preparation material: local key, kubeconfig and Docker configuration. Do not publish it or add it to the shareable package. Abandoning this preparation and starting another generates new material. Authorized cleanup removes its session's material. |
| `implementacion/.tmp/vulnerability-db-*` | Preserve real snapshots referenced by evidence you want to replay, including symbolic-link targets. An old `.tmp` directory is not automatically disposable. |
| `/tmp/golden-path-defense-*/snapshots/` and the relocated `rehearsal-02` snapshot | These contain recent execution databases. Keep **`db/trivy.db` and its own `db/metadata.json`**, together with the laboratory's original `database-identity.json`. Evidence packages exclude database bytes. |
| `implementacion/evidence/` | Originals, immutable copies, reports and packages, including other work. These are outside `.tmp`. Use the sanitized demo export for sharing; treat a general copy as a private backup. |
| Other `.md`, `.patch` and personal material under `.tmp` | Review and preserve anything absent from Git; there are older drafts and patches unrelated to this demo. This guide does not declare them disposable. |
| `implementacion/.tmp/doctor-alignment-*/docker-packages/lists/` | APT index cache from an earlier repair. `lock` and `partial/` may belong to `root` and block downloading the entire `.tmp` directory. Exclude this cache from backups; preserve repair reports, including `implementacion/evidence/environment/doctor-alignment-*/`. |
| `.tools`, `node_modules`, download caches and `/tmp/golden-path-defense-*/trivy-cache` | Regenerate using pins. A Trivy cache does not replace the identified, retained snapshot. Docker images can also be rebuilt; this creates another session, not a continuation of the old one. |

Examples checked at this handoff:

- `defense-01`: originals `implementacion/evidence/raw/run-Btqi4P62`; snapshot `/tmp/golden-path-defense-defense-01/snapshots/vulnerability-db-run-Btqi4P62`.
- `rehearsal-05`: originals `implementacion/evidence/raw/run-fL1E6K9d`; snapshot `/tmp/golden-path-defense-rehearsal-05/snapshots/vulnerability-db-run-fL1E6K9d`.
- `implementacion/.tmp/vulnerability-db-run-aqwfL3F7` is a **link** to `/tmp/golden-path-defense-rehearsal-02/preserved-from-workspace/vulnerability-db-run-aqwfL3F7`. Saving the link alone loses its bytes when `/tmp` is cleared.

## 5. Copy before stopping or changing the Codespace

First export the session you want to retain. If retiring the laboratory, run cleanup and wait for its final export **before** copying records. Do not back up while preparation/presentation is writing. The following commands create files; they neither publish nor delete anything. They are a backup recipe, not a claim that an external copy already exists.

This environment had 1.7 GiB free in `/workspaces` and about 25 GiB in `/tmp`; evidence and `.tmp` occupied approximately 4.2 GiB and 1.4 GiB respectively. Check `df` first. Use `/tmp` only to stage archives and **download them to your computer before stopping the Codespace**. If you already have a mounted external persistent destination, use it instead of `/tmp`.

Run the blocks in the same terminal. Each block's subshell stops on errors; if a block fails, do not continue or change machines.

```bash
cd /workspaces/golden-path-lab
backup_dir="$(mktemp -d /tmp/golden-path-handoff-XXXXXXXX)"
chmod 700 "$backup_dir"
(
  set -euo pipefail
  git rev-parse HEAD > "$backup_dir/source-revision.txt"
  git status --short --branch > "$backup_dir/source-status.txt"
  git diff --binary HEAD > "$backup_dir/working-tree.patch"
  git ls-files --cached --others --exclude-standard -z > "$backup_dir/source-files.list"
  tar -czf "$backup_dir/source-working-tree.tar.gz" \
    --null --verbatim-files-from -T "$backup_dir/source-files.list"
  tar -czf "$backup_dir/records-private.tar.gz" \
    .tmp/defense-kit implementacion/.tmp/defense-demo implementacion/evidence
)
```

The first copy includes new non-ignored files and all tracked content of the current tree; it excludes `.git` and ignored files. If there are local deletions, `tar` will fail when including them: review the list and preserve the deletion in the patch before continuing. The second copy contains originals and history, **not** keys from `private-*`. Separately keep any ignored drafts/patches you need and older snapshots unrelated to these sessions.

This block preserves **demo-session** snapshots from their original identities, resolves the relocated link and checks both hashes before packaging. It distinguishes a session that never produced a database from a missing referenced database:

```bash
(
  set -euo pipefail
  : "${backup_dir:?Run the preceding block first}"
  for record in implementacion/.tmp/defense-demo/*/session.json; do
    demo_session="$(basename "$(dirname "$record")")"
    lab_relative="$(jq -r '.labEvidenceRoot // empty' "$record")"
    if [ -z "$lab_relative" ]; then
      printf '%s: no laboratory recorded\n' "$demo_session"
      continue
    fi
    identity="implementacion/$lab_relative/database-identity.json"
    if [ ! -f "$identity" ]; then
      printf '%s: no database identity issued; review its receipts\n' "$demo_session"
      continue
    fi
    snapshot="$(realpath -e -- "$(jq -er '.retrieval.directory' "$identity")")"
    cp -- "$identity" "$backup_dir/$demo_session-database-identity.json"
    printf '%s\n' "$snapshot" > "$backup_dir/$demo_session-database-original-path.txt"
    jq -r '.sha256 | to_entries[] | "\(.value)  db/\(.key)"' "$identity" \
      > "$backup_dir/$demo_session-database-files.sha256"
    (cd "$snapshot"; sha256sum -c "$backup_dir/$demo_session-database-files.sha256")
    tar -C "$snapshot" -czf "$backup_dir/$demo_session-database.tar.gz" db
  done
  (cd "$backup_dir"; sha256sum -- *.tar.gz > SHA256SUMS.txt)
  (cd "$backup_dir"; sha256sum -c SHA256SUMS.txt)
)
printf 'Download this entire directory before stopping the Codespace: %s\n' "$backup_dir"
```

An identity referencing a missing path or different bytes fails the copy. Also review any “no identity” message against its session receipt. Download the indicated directory using VS Code's explorer; verify downloaded files by running `sha256sum -c SHA256SUMS.txt` inside it. On macOS, use `shasum -a 256 -c SHA256SUMS.txt`. A copy still held only in the same Codespace is not external preservation.

When restoring, retain historical packages separately and restore source onto a clean checkout of the saved SHA, reviewing status and patch. Database bytes can be relocated, but their identity records an absolute path: keep the original and a receipt containing the new path and hashes; do not rewrite the original to simulate continuation. Prepare a **new session**. Copied source and records do not automatically recreate the old cluster, registry or key.

### If downloading all of `.tmp` fails with “permission denied”

The observed `doctor-alignment-4qhIRRLp/docker-packages/lists/lock` is an empty APT lock owned by `root`; its `partial/` directory also restricts access. Those indexes are not needed to restore the demo. Do not recursively change `.tmp` permissions: it contains private keys and active laboratory records.

For an additional copy of `.tmp` files, use a fresh download directory and exclude only private material and that cache:

```bash
(
  set -euo pipefail
  tmp_download="$(mktemp -d /tmp/golden-path-tmp-download-XXXXXXXX)"
  tar -czf "$tmp_download/implementacion-tmp-private.tar.gz" \
    --exclude='implementacion/.tmp/private-*' \
    --exclude='implementacion/.tmp/doctor-alignment-*/docker-packages/lists' \
    implementacion/.tmp
  (cd "$tmp_download"; sha256sum implementacion-tmp-private.tar.gz > SHA256SUMS.txt)
  printf 'Download the files from %s before stopping the Codespace\n' "$tmp_download"
)
```

This command preserves links as links: their targets and external snapshots still need the preceding snapshot backup block. It excludes source code and `implementacion/evidence/`. Download the packaged files rather than having the explorer traverse the original directory containing the APT lock.

## 6. Choose more resources

More cores help builds and tests; solving disk pressure requires **more storage**, as well as enough RAM. Check the specific option's cores, memory and disk. In Codespaces, use VS Code's command palette → **Codespaces: Change Machine Type**, or `github.com/codespaces` → `…` menu → **Change machine type**. A disk-capacity change stops the Codespace; otherwise the change takes effect on restart. Available options depend on the account/organization. [Official GitHub procedure](https://docs.github.com/en/codespaces/customizing-your-codespace/changing-the-machine-type-for-your-codespace).

The current configuration declares minimums of **2 CPUs, 8 GB RAM and 32 GB storage**. `hostRequirements` selects compatible machines; editing it and rebuilding a container does not itself expand an existing machine's disk. For this laboratory with multiple retained evidence sets, I would choose an option with at least **64 GB storage** and more RAM/CPU than the current one, if available; this is a headroom recommendation, not a validated project minimum. Configuration has not been changed. [GitHub machine minimums](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/configuring-dev-containers/setting-a-minimum-specification-for-codespace-machines).

Within the same Codespace, `/workspaces` survives stop/start and rebuilding. **`/tmp` survives a rebuild but is cleared when the Codespace stops, including idle timeout**; download databases before the change. Creating another Codespace or deleting this one requires recovering files from an external copy; a clone only brings published content. [GitHub's documented persistence](https://docs.github.com/en/codespaces/developing-in-a-codespace/persisting-environment-variables-and-temporary-files).

With Docker/devcontainers on your computer, resources come from the host or Docker VM: increasing CPU does not expand the host disk. After changing resources, recheck `df -h`, `df -i`, `docker system df`, `doctor` and `setup-validation`, then use the new-session commands in section 2. Do not copy an old `session.json` to bypass preparation validation.

## Occupied port: reopen the viewer without repeating delivery

`up` prepares **and presents**, then leaves its viewer running. Closing the browser
does not release the port. In the reported case, `rehearsal-01` still owned 8765;
`defense-01` never prepared, so its `present` request was correctly refused.
`defense` includes F13; select `f11-comparison` for the four R/F11/L06 cards.

Identify the listener and session before presenting:

```bash
cd /workspaces/golden-path-lab
ss -ltnp '( sport = :8765 )'
curl -fsS http://127.0.0.1:8765/api/health | jq -r '.session'
bash implementacion/scripts/defense-demo.sh status --session rehearsal-01
```

The filter prints only the session, not the server identity token. If the listener
is not a recognized viewer, identify its owner or select another port; do not kill
an unrelated process. Reopen the existing session with web controls:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session rehearsal-01 --stop-server --enable-actions --port 8765
```

`serve --stop-server` restarts only the verified viewer to apply the requested
port/mode. It does not rebuild, recreate the cluster or present. To release the
port without retiring the laboratory, or move that same viewer:

```bash
bash implementacion/scripts/defense-demo.sh stop-server --session rehearsal-01
bash implementacion/scripts/defense-demo.sh serve \
  --session rehearsal-01 --enable-actions --port 8766
```

Open the selected port as **Private**. Do not use `killall`, `pkill` or `fuser -k`.
The stop command verifies process identity and preserves session state/evidence.
It does not alter preparation or authorize replay of a consumed presentation.

For a **new rehearsal**, do all preparation before the live interval. Inspect and
retire the previous session's owned infrastructure first, retaining its evidence:

```bash
bash implementacion/scripts/defense-demo.sh cleanup-plan --session rehearsal-01
bash implementacion/scripts/defense-demo.sh cleanup --session rehearsal-01 --stop-server
export DEMO_SESSION="f11-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
bash implementacion/scripts/defense-demo.sh prepare \
  --profile f11-comparison --session "$DEMO_SESSION" \
  --reserve-gib 3 --serve --enable-actions --port 8765
# Only after PREPARED:
bash implementacion/scripts/defense-demo.sh present \
  --session "$DEMO_SESSION" --auto --budget-seconds 120
```

Preparation may take minutes; do not prepare to resolve a viewer-port conflict
mid-presentation. Preserve the old unprepared `defense-01` attempt: do not edit its
JSON or mark it prepared. After a source change, use a new session name. `up` and
`prepare --serve` now check the port before creating a session, so a conflict does
not leave another pending session. A later bind race can still fail with its
original diagnostic retained.

## Run the demo again on the same port

If `present --session defense-01` reports `A complete, unfailed prepared session
is required`, inspect its status instead of repeating `present`. In the observed
case, `defense-01` has `operational=PENDING` and `prepared=false`: it never
completed preparation. `rehearsal-01` has `demoResult=CONFIRMED`: it already
completed presentation even though its viewer remains open. Neither permits a
new presentation using `present` on the same session.

**To run the `defense` profile again on 8765**, inspect the inventory and use this
block from the repository root. Cleanup retires only `rehearsal-01` infrastructure,
retains evidence and stops its viewer. The command chain stops on cleanup failure;
it does not start another laboratory over the previous one.

```bash
bash implementacion/scripts/defense-demo.sh cleanup-plan --session rehearsal-01
```

```bash
bash implementacion/scripts/defense-demo.sh cleanup \
  --session rehearsal-01 --stop-server &&
export DEMO_SESSION="defense-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')" &&
printf 'New session: %s\n' "$DEMO_SESSION" &&
bash implementacion/scripts/defense-demo.sh up \
  --session "$DEMO_SESSION" --profile defense --auto \
  --enable-actions --port 8765 --budget-seconds 180
```

`up` prepares again **and automatically presents**. It is not an instant restart:
it includes tests, cluster creation, build, analysis and signing. The 180-second
budget covers presentation, not all preparation. Do this outside the presentation;
retain the printed session name and open/refresh 8765 as **Private**. For a later
rehearsal, replace `rehearsal-01` in the cleanup commands with the session being
retired. Do not delete or reuse `defense-01`.

**To prepare now and present later**, replace `up` with `prepare` and replace
`--auto --budget-seconds 180` with `--serve`. After preparation succeeds:

```bash
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh present \
  --session "$DEMO_SESSION" --auto --budget-seconds 180
```

**To view existing results without new requests**, use only:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session rehearsal-01 --stop-server --enable-actions --port 8765
```

This restarts the viewer on the same port, not the demo, and cannot turn a pending
session into a prepared one. For the four R/F11/L06 cards, use the preceding
preparation block with `--profile f11-comparison`; `defense` is the F11/F13/valid
delivery sequence. A prepared session whose source/environment changed requires
new preparation, never internal state edits.

## Reading the visual results

Scenario/control titles are prominent. Green means allowed or successfully checked;
red means delivery blocked; amber means admitted risk in R, an integration issue,
or a step not reached. A separate expected-detection label distinguishes a correct
block from a failed trial. Gray means unexecuted. Not reached means the sequence
stopped earlier, not that this control rejected delivery. Technical detail includes
only the selected profile/attempt; dependencies and filenames remain collapsed.


Blocked attempt badges now identify the arm and boundary: “G · Entrega bloqueada
en Conftest” or “G · Entrega bloqueada en Kyverno”. R has a separate reference
strip in `defense`: this is the valid service observed during preparation, not
a privileged R trial. The `f11-comparison` profile retains its dedicated live R
card and its recorded scope.

Folded technical phase headings show red F11/F13 markers only at the observed
blocking control, including the rejected property. The F13 results prerequisite
is not presented as a separate rejection, nor is an admission rejection copied
to deployment. Attempt selection also filters these markers. Integration errors
remain distinct from gray unreached controls; they do not become confirmed detections.

Use the short evidence links under each scenario or the linked filenames in
“Entrada” / “Salida” to open the full-height attempt detail within the same application. For example, F11 exposes the original Conftest JSON, attribution JSON and
security diff. The detail shows the selected attempt, UTC, operation exit status
(the control exit remains in its receipt), file hash and redaction status. It
uses bounded inert text, with the full-file link for a live viewer; recorded
exports use retained excerpts and identify the complete package. A reference
without a matching closed artifact remains plain text; another attempt's file
cannot fill the gap. No new laboratory requests are made by opening these links.

Refresh the viewer to load these presentation changes. Existing receipts retain
their original source identity; a UI refresh is not a new rehearsal.
