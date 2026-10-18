# Portable defense and reproducible freeze

[Defense index](README.md) · [Español](../../ES/defense/static-freeze.md)

The main explanation is F11/Conftest → F13/missing results → authorized recovery
→ independent F11/Kyverno. **DEMO_VALID_ACCEPT keeps the same image; it is not
full L01.** `defense-all` retains R privilege exposure/withdrawal and partial L06,
with F02/F12/F03 as separately prepared comparisons. Those extensions are optional
for questions. The map explains fifteen architectural stages; the executed
sequence shows actual recorded order. Filtering never runs an operation.

## Prepare before the talk

Finalize the code first. Use one compatible preparation, 4 CPUs / 16 GB RAM /
32 GB total disk, and the existing 3 GiB custody reserve plus growth guards.
Measure actual free bytes/inodes before preparation, export and recording. `/tmp`
and Docker may have different mounts; do not substitute their reported capacities.

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
nproc
free -h
df -h /workspaces /tmp
df -i /workspaces /tmp
docker system df
ss -ltnp 'sport = :8765'
export DEMO_SESSION="freeze-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf '%s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile defense-all --reserve-gib 3 \
  --enable-actions --port 8765
```

Choose a free port if occupied; never terminate an unrelated process. Forward it
**Private** in Codespaces. In Demostración select the main sequence and **Preparar
laboratorio común**, then wait for confirmed completion. Optional F03 preparation
reuses this profile's builder/registry and frozen database; it does not need another
cluster. Prepare F02/F12 separately. Keep all preparation outside the talk.

Reopen without preparing or executing:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session "$DEMO_SESSION" --enable-actions --port 8765
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
```

After a disconnected browser, inspect the same action identity and final report;
do not submit it again automatically. A reboot, changed source, retired resources
or failed preparation requires compatible preparation, never editing session state.
`up --auto` prepares **and executes**. A consumed sequence is not reset.

## Present and inspect

Choose **Foco → Defensa · F11 / F13 / recuperación** (also `#demo?focus=defense`).
It only filters the overview; all recorded evidence remains accessible. Click
**Iniciar comparación** once for a prepared pending sequence. Open the actual live
console or a blocking log. Red means the request was blocked; a confirmed expected
rejection means the control test succeeded. Infrastructure failure is not detection.
Use **Ver proceso completo**, **Secuencia ejecutada**, and **Volver** to restore context.

For a 160-second route with 20 seconds reserve: 0–20 explain prior preparation,
source and local lane A; 20–50 start the sequence and open F11/Conftest;
50–80 explain F13's missing results and open its Kyverno log; 80–110 show same-image
recovery, rollout and HTTP; 110–135 show the independent F11 admission rejection;
135–160 show provenance and the technical map, then close. If the next result is
not confirmed, identify the failure and explicitly switch to recorded evidence.
The 120-second action budget is not a narrated three-minute guarantee.

For full L01 questions use the **selected historical** lane-A observation in
Workflows → Atestaciones → `L01-update`. Check the run/source and distinct subject
digest against its principal image. This is a different historical context, not
F13 recovery and not hosted OIDC lane B.

## Export a deliberate selection

Export once after the real results. Imports are **opt-in**: no global latest-run or
other-session inventory is included automatically. Choose the exact capture ID
shown by the observation importer. This tested example selects an authentic lane-A
capture, while retaining all recorded attempts of the bound session:

```bash
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION" \
  --export-observation 37353632299-fa7f7e2ecb58
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
```

If that capture is not present locally, omit the flag or import the authentic
observation first using the [existing importer](demo-workspace.md#observed-github-runs-and-attestations).
To narrow attempts, repeat `--export-attempt` with actual recorded IDs; preparation
is retained. Unknown attempt/capture IDs are rejected. Without those flags the
export contains all recorded attempts of this session and no imported observations.

Every export has a new numbered directory; previous exports are immutable.
The deterministic reference map uses the same operation/artifact model as the UI.
Small essential originals (up to 64 KiB each) receive priority within the **2 MiB**
HTML text budget. If these cannot fit, export fails and asks for a narrower selection.
Large files receive at most 12,000 bytes in HTML; optional files may be omitted.
The inventory identifies **FULL**, **EXCERPT**, or **NOT_EMBEDDED**, original size,
logical path, SHA-256 and reason. Empty truncated excerpts are never available logs.
Missing essential references are reported as incomplete. All selected originals
remain in the portable folder/archive; files above 16 MiB are read outside the visor.
Captured redacted copies retain their own hashes and original-copy provenance.
Integrity checks do not reverify historical signatures or authorization.

## Three independent fallback choices

In the reported export directory:

```bash
sha256sum -c SHA256SUMS.txt
python3 portable/verify.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory portable
```

1. **recorded.html**: open directly with `file://` in a fresh browser. Self-contained,
   no APIs/polling/CDN/network required. Essential small logs are complete. Large
   originals may require the portable folder; an excerpt is explicitly labelled.
2. **portable/**: copy the folder, run its verifier, then serve with static HTTP.
   Open `http://127.0.0.1:8000/`. It also works under `/golden-path-lab/demo/` when
   copied there under the server root. Assets/originals use relative paths, no
   `/api` or `/download` backend. Selected originals are hash-checked on opening.
3. **video.mp4** in the frozen package: continuous recorded-evidence navigation,
   without voice or acceleration. It works locally without a server/network in an H.264 player. The installed test
   Chromium lacks H.264 decoding; the retained original WebM is an alternative.

External GitHub links still require network. Local included documents do not.
Do not treat file integrity as a new cryptographic verification. The renderer
revision and evidence-producing source remain separately visible.

## Record and freeze

Use the actual paths printed by export. The tested scripts require existing local
Playwright/Chromium and FFmpeg with H.264 support; they install nothing:

```bash
node implementacion/tests/defense_demo/static-export-check.mjs "$EXPORT_DIR" "$CHECK_DIR"
node implementacion/tests/defense_demo/record-defense.mjs "$EXPORT_DIR/recorded.html" "$VIDEO_DIR"
python3 implementacion/scripts/defense-demo/freeze-demo.py \
  --export "$EXPORT_DIR" --video "$VIDEO_DIR/defense.mp4" \
  --original-video "$VIDEO_DIR/original.webm" --recording "$VIDEO_DIR/recording.json" \
  --validation "$CHECK_DIR/result.json" --output "$FREEZE_DIR"
python3 "$FREEZE_DIR/verify.py"
```

Set the four directory variables to new destinations with sufficient free space;
exact executed paths and measurements are in the [validation record](../../../registros/demo_static_freeze_EN.md).
The freeze verifies associations/hashes and decodes the whole H.264 video, retains
its original WebM and records source, renderer, selection, checks and pending human
narration. It reserves 3 GiB plus estimated copy growth. There is no public tag,
Pages deployment or new remote run. A portable file altered after export fails
verification; checksums are not regenerated to bless corruption.

After the talk, inspect and retire only owned resources:

```bash
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

Preserve raw evidence, attempts, snapshots, keys and exports. No global prune.
Do not claim space was reclaimed until measured. Human worksheet: presenter/date
___; session/source ___; narration start/end ___; total ___; fallback/incidents ___;
decision/reviewer ___. Leave pending until a person actually performs the rehearsal.
