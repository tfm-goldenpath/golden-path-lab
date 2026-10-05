# Lane A database replay compatibility correction — 5 October 2026

[Español](lane_a_python_compatibility_ES.md) · [Original failed attempt](catalogue_campaign_source_895a3bd_EN.md)

The user requested a local correction after both jobs of run `37342413975`
stopped at shared tests. The database-restoration function used
`TarFile.extractall(filter='data')`, unavailable in the jobs' Debian Python
`3.11.2-6+deb12u8`. This record concerns the subsequent working-tree correction,
not another execution of the catalogue or timing campaign.

## Change and source

[restore_database](../scripts/paired-rg.py) now validates the complete archive
inventory before creating its destination, then copies only `db/trivy.db`,
`db/metadata.json`, `identity.json` and `SHA256SUMS.txt` through `extractfile()`.
All four members must be regular files; duplicate, missing, extra and unsafe
members are rejected. The destination must be new, without symlink parents;
its directories are private and its files are created exclusively. Archive
permissions, owners and link metadata are not applied. Outer and internal hashes,
PASS identity, the two database hashes and metadata equality remain mandatory.

The change is local and uncommitted on `test/catalogue-campaign-source`, based on
`c2b403cd436449b1b2818f5fe92983ecf946d072`. Tested file SHA-256 values:

| File | SHA-256 |
|---|---|
| `scripts/paired-rg.py` | `0aece17d67a31927fc3b66e49442a9f330cd11e7bc1048660a4ec3325e2fdc2e` |
| `tests/unit/test_paired_measurements.py` | `5050965104f7e92548f52735b8243d1f1fdd174a9b002e72a37d30a60dbe298f` |

Controls, dependency/tool versions, scanner fixtures and scenario oracles were
not changed. Any future corrected-source execution must record its own commit;
it cannot be attributed to `895a3bd`.

## Checks performed

The focused replay regression failed before implementation and passes afterward.
It forbids both bulk and single-member extraction APIs, so a newer host Python
cannot hide dependence on their filter support. Synthetic fixtures also cover
archive corruption, invalid inventories, link/device/directory members,
symlinked destinations/parents and preservation of an existing destination.

The exact four Debian Python packages from the failed jobs were retrieved from
the repository's `20260921T000000Z` snapshot, checked against package-index sizes
and SHA-256 values, and extracted under `/tmp`. The interpreter reports Python
3.11.2 and no `filter` parameter. These are the same Python packages, **not a
complete reproduction of the devcontainer**: shared libraries and other tools
come from Codespaces. Final checks put this interpreter first in `PATH` for
subprocesses as well. The initial launcher exported `PYTHONHOME`, which broke a
policy test explicitly invoking the host `/usr/bin/python3`; the launcher now
lets Python locate its adjacent standard library. That local setup failure and
the earlier mixed-interpreter diagnostic log are retained, without changing the
policy test or production code to accommodate the launcher.

- PASS: 55 measurement regressions and 37 campaign regressions on that Python.
- PASS: five focused replay tests on the host Python 3.14.2.
- PASS: `make -C implementacion doctor` with the Python 3.11.2 launcher.
- PASS: `make -C implementacion test` with the corrected Python 3.11.2 launcher:
  six environment checks, 930 service/unit cases, 43 Python policy cases,
  Conftest/Kyverno, real local Cosign cryptographic checks with synthetic inputs,
  and the static workflow executor. The latter runs inert F01/F02 inputs on this
  working tree; these observations do not belong to the failed `895a3bd` run.
- PASS: 252 local documentation links, ten Bash blocks, publication-command
  syntax (not executed), source/evidence hashes and four twenty-row matrices.
  Rechecked all 97 retained review files and the original preservation archive;
  the 4 October human declarations are unchanged.

Logs, package identities, source hashes and the final review are separate from
the failed-run originals, under ignored
`evidence/environment/lane-a-python-compatibility-20261005/`. Space and inode
checks retained the 3 GiB/20,000-inode reserve. No global Docker cleanup was used.

## Limits and review

No workflow was dispatched or retried; no commit, push, remote PR, merge, release
or repository-setting change was made. Run `37342413975` remains FAIL in both
suites, with **0/20 executed; all NOT_EXECUTED**, no scenario packages and no scanner databases.
Its originals, preservation package and hash index remain unchanged. Shared
checks do not establish live scenario coverage on the corrected source.

The full-catalogue-on-campaign-source limitation stays open. The ten-pair campaign,
historical functional records and 4 October reduced-scope acceptance retain their
sources and meanings. Human/economic evaluation, unsupported lane B negatives,
human review of the correction and acceptance of new evidence remain pending.
No thesis file was edited.

| Activity | Assistance | Human review | Decision |
|---|---|---|---|
| Reproduce the incompatibility, implement bounded replay and regressions, verify locally, update EN/ES handoff | OpenAI Codex / GPT-6 | Pending | Local regression checks PASS; full live integration on a corrected committed source pending |
