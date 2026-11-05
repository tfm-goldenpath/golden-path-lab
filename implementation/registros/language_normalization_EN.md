# Validation of English implementation and Spanish documentation support

## Scope

The repository now uses English for implementation comments, project-generated messages, workflow labels, test descriptions, policy diagnostics, the incremental plan and primary technical guides. The root Spanish README and the existing Spanish guides provide supporting explanations. Scenario IDs, command arguments, API fields, rule names, image references and pinned tool versions remain stable.

The choice supports international contribution and consistency with cloud-native terminology. It is a repository convention, not a claim that an industry standard requires English. The rationale and maintenance policy are in the [root README](../../README.md#language-and-documentation).

English and Spanish explanations refer to one executable implementation per scenario. Historical observations remain in their original language; translation does not claim that any previously pending integration has been completed. Source-text changes produce a new source snapshot, so a subsequent evaluation must identify its own revision and evidence rather than reuse an earlier snapshot as proof of the changed files.

## Checks performed

| Check | Result and scope |
|---|---|
| Node service, helper and environment tests | All 78 tests passed, with no skipped or failed tests, on the Windows host. |
| Python policy renderer tests | All seven tests passed. |
| Shell syntax | All 14 shell scripts passed `bash -n` using Git Bash. This checks parsing, not execution of the complete delivery flow. |
| Kyverno CLI | All nine positive/negative runtime-policy checks passed with the local Windows CLI. This does not exercise live admission or cryptographic image verification in a cluster. |
| Conftest on Windows | 20 of 35 decisions were verified; the other 15 invocations failed with Go runtime errors (`unexpected return pc` / `unknown caller pc`). This is a partial result, not a successful policy suite. |
| Conftest source comparison | Compared with the imported source, only 26 human-readable denial strings changed across the three Rego files. Error-code prefixes and the remaining Rego source are unchanged. This check complements but does not replace execution in the target environment. |
| Incremental plan | All 71 checkboxes retain their original status and order: 17 checked and 54 pending. The previous run identifier is unchanged. |
| Historical records | SHA-256 checks confirm that the three pre-existing validation records are unchanged. |
| Documentation links | All 157 active local Markdown file links checked resolve within the repository; historical records and the contextual external-proposal review are excluded from this count. |
| Tool lock and configuration | Only the two explanatory `note`/`reason` strings changed in `tools.lock.json`; versions, references and checksums are unchanged. Devcontainer JSON files parse successfully. |

The Conftest runtime failure had already been recorded during the import. Docker's local Linux engine was unavailable during this revision, so a full Linux `make test` was not repeated. The passing Linux observations in the import record apply to that earlier source revision. Rerun `make test` inside the devcontainer before accepting the translated revision for integration; keep any remaining failures visible.

No full demo, Codespaces startup, hosted workflow or evaluation campaign was executed as part of this language revision. No commit, merge, push or remote configuration change was performed.

## Historical record integrity

These hashes refer to the existing files, which were left unchanged:

| File | SHA-256 |
|---|---|
| `validacion_entorno.md` | `f6d93cce46206f85199555393d235dc1c0b506088029c299f23bedb578d809d8` |
| `validacion_importacion_ES.md` | `de9181deab3667e34afec0238f834f741333ed018e21483b9f380500bc8f5f2a` |
| `validacion_integracion.md` | `458144ccca87edebdb9be0d87983fb7319f03a5dc74fbedc24a61dc7028607a5` |

## Current visible names

- Hosted workflow: `Golden Path GitHub integration`.
- CI workflow: `Golden Path tests`.
- Repository devcontainer: `Golden Path - implementation`.
- Expected successful demo summary: `PASS: L01 accepted; F13 and F11 rejected. Evidence: ...`.

The workflow paths, job identifiers and Fxx/Lxx case identifiers have not been renamed. Existing Spanish filenames and the `implementacion/` directory are retained to avoid breaking established references.
