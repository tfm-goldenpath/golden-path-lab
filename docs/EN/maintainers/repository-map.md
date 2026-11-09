# Repository ownership and migration contract

[Product guide](../README.md) · [Laboratory](../../../lab/README.md) ·
[Current architecture](../../../implementation/docs/EN/architecture.md) ·
[Canonical inventory](repository-inventory.json)

Historical foundation: P01 was documentation and inventory work on `chore/product-foundation`, based on
fetched main **`76f93355ba78f3735b5e864970c63ab4e12b2b33`**. It kept the then-current
runtime paths and behavior. No detailed product roadmap was found in the tracked
checkout; the owner's P01 request supplies the bounded roadmap sequence below.
This is not a reconstruction of another checkout's roadmap. The newer merged
release-freeze work remains intact.

Current navigation: the [module contract](../../../implementation/docs/EN/architecture.md#implemented-modules-and-dependencies)
describes the extracted engine; the [decision index](../../../implementation/TODO.md#current-decisions-and-actions)
separates current owner actions, engineering and pending validation.

## English migration — 5 November 2026

The owner authorizes `implementation/` as the canonical retained implementation
root and `.devcontainer/implementation/` as its Codespaces profile. Only tracked
files move; ignored originals remain under `implementacion/`. Explicit tracked
Linux source aliases fit around directories containing retained ignored files;
Make delegates to the canonical CWD. The inventory records each alias and its
exact canonical target. It accepts no arbitrary symlink source. New captures
record actual paths; historical records and producer identities are unchanged.
See [compatibility/recovery](../legitimate-delivery.md#english-layout-and-legacy-access)
and [validation](delivery-core-validation.md#interface-consolidation-and-english-layout--5-november-2026).

## Reading the inventory

[repository-inventory.json](repository-inventory.json) is the single ownership
inventory. It enumerates every tracked path individually, including every executable
script/helper, tests, docs, policies, schemas, configuration and assets. An entry
combines a named profile with its explicit fields; explicit fields override profile
defaults. Profiles express shared audience, effects and validation boundaries,
not wildcard membership. `classification` is current responsibility, not a claim
that an independently installable product exists. `destination` and `action` are
proposals only. No personal/team ownership is invented: owners are responsibilities.

`references` records textual links/import/call candidates; `callers` records
execution/import sites or documented dynamic/manual interfaces. Tests are separately
identified. Textual search is evidence for investigation, not proof of runtime
reachability. Dynamic shell module loading, Python imports, Make wildcards, Node
and unittest discovery, documentation commands and exported verifier copies were
reviewed too. `unknowns` records remaining ambiguity; no textual caller is never
an unused-script verdict. Resolve it before any deletion/deprecation.

The summary below is generated from that inventory with the read-only validator:

```bash
python3 docs/EN/maintainers/check_inventory.py
python3 -m unittest discover -s docs/EN/maintainers -p 'test_inventory.py'
python3 docs/EN/maintainers/check_inventory.py --summary
```

The check compares exact paths with `git ls-files`, validates profiles, enums,
references and proposed relative paths, and rejects duplicates/missing/untracked
entries. Stage deliberate new files before checking coverage. It does not crawl
ignored evidence, infer ownership from Git authors or execute inventoried code.
Focused synthetic tests exercise missing, duplicate, unsafe and stale paths plus
invalid classifications/profiles. There is no change to the runtime Make/CI targets.

The optional [context retrieval pilot](context-retrieval.md) records a bounded
A/B/C comparison; it does not change these navigation or ownership rules.

<!-- inventory-summary:start -->
853 tracked paths; 501 individually enumerated scripts/helpers/tests.

| Current classification | Paths |
| --- | ---: |
| developer | 417 |
| generated | 1 |
| historical | 63 |
| laboratory | 273 |
| product | 71 |
| shared | 28 |

121 entries carry explicit investigation notes; these are unresolved migration/coverage questions, not missing inventory rows.

<!-- inventory-summary:end -->

Current physical roots include `bin/` (delivery entry), `src/` (shared delivery
engine), `.github/` (automation and contribution instructions), `.devcontainer/`
(workspace configurations) and `implementation/` (selected service, policies,
schemas, pinned tooling, laboratory adapters, tests, demo and measurements).
`templates/node-http/` and `templates/java-http/` contain the independent starters owned by service teams.
`docs/` and `lab/` added by P01 are navigation/maintenance guidance. Historical
`registros/`, release inputs/notes and the Pages lock are retained in place.
There are no tracked composite actions at the base. The unrelated untracked root
`package.json` and `package-lock.json` are excluded and preserved.

## Current bounded P01b separation

The owner explicitly authorizes physical extraction of the single legitimate local
quotes-node path on 4 November 2026, based on fetched main `1f9cc61d267aeeff1df1f7e9fa88d74cbaeb4211`.
This narrower authorization supersedes the physical-move prerequisite for this
increment only; P00/P01 custody and human-review conclusions remain historical
facts and pending decisions.

`bin/deliver` delegates to `src/run-delivery.sh`. Cohesive `src/lib/` modules and
neutral `src/` helpers have no laboratory execution imports. Old script paths
remain adapters; laboratory source selection, readiness probes, reference/trial
workloads, fixture/manual build allowlists and package summaries stay with them.
Policies/schemas/tooling/pins and the selected service retain their explicit
`implementation/` roots. The whole repository is not separated. See the
[operator guide](../legitimate-delivery.md) and [validation](delivery-core-validation.md#p01b-implementation-boundary--4-november-2026).

## Proposed boundaries

The table retains the broader destination plan. P01b implements `bin/` and `src/`
for the local delivery path only; other moves still require a bounded increment.

| Proposed root | Responsibility and dependency boundary |
| --- | --- |
| `bin/` | Small supported product command interface, with explicit arguments, exit codes and CWD contract; no scenario dispatch. |
| `src/` | Cohesive internal context/source, delivery/analysis, trust/evidence and workload modules. Resource lifecycle must distinguish product needs from kind/registry laboratory creation. |
| `policies/` | Enforcement sources, schema/contract references and renderer; generated per-run policies remain evidence. |
| `templates/` | Future consumer starters using the supported interface; no fixture/measurement prerequisites. |
| `tests/` | Product contracts/policies/crypto and representative integration; scenario oracles stay in the lab. Test files mixing these concerns require splitting after extraction. |
| `explorer/` | Future product interface. The current demo is a laboratory presentation coupled to session receipts; moving it here unchanged would not create a product explorer. |
| `docs/` | Product/operator/maintainer guidance, EN primary and synchronized ES entry. Detailed architecture/contracts move only with compatibility links. |
| `lab/` | Synthetic service, scenarios/fixtures, measurement protocols/runners, defense presentation, historical records and custody tooling. References to old evidence remain interpretable. |

The isolated-runtime criterion is demonstrated for the fixed local path on the
[recorded candidate](delivery-core-validation.md#p01b-observed-execution-and-handoff).
Laboratory tooling consumes the engine; product delivery does not require fault
fixtures, measurement plans, scenario summaries or presentation state. This does
not establish a general consumer template or whole-repository separation.

Use the single current [module table and contract](../../../implementation/docs/EN/architecture.md#implemented-modules-and-dependencies)
for `src/lib/` responsibilities and `implementation/scripts/lib/` adapters.
Remaining consolidation must preserve function-only imports, shared-process error
propagation and the distinction between content checks and authentication.

## Migration sequence

| Increment | Required result and acceptance boundary |
| --- | --- |
| P01 — `chore/product-foundation` | Product-first EN/ES journey, separate lab entry, complete tracked inventory and compatibility contract. Documentation/inventory checks; no Kubernetes. Human review and owner decisions remain explicit. |
| P03 — `refactor/delivery-core` | Implemented and merged in #61; [original validation](delivery-core-validation.md) remains revision-specific. Human/custody gates are separate. |
| Refresh A — `chore/dependency-refresh` | Merged #62: bounded AJV/fast-uri correction; [record](dependency-refresh-validation.md). Actions (#70) and updater setup (#71) are also merged; #72 compatibility and #23 disposition remain separate. |
| Refresh B — `chore/devcontainer-refresh` | Merged #63: pinned runtimes/images, three profiles and optional Codex; [exact checks and limits](devcontainer-refresh-validation.md), without claiming a Codespaces UI Full Rebuild. |
| Refresh C — `chore/security-toolchain-refresh` | Merged #64: pinned tools and recorded local/hosted validation; [record](security-toolchain-refresh-validation.md). CEL adoption remains blocked separately. |
| P01b — physical repository separation | Merged in PR #74 at `e0f2f56980ffbb00b926521ecf58eed64c713f1b` with recorded sparse-checkout and lab validation; broader acceptance remains separate. Broader physical moves are not complete. See [validation](delivery-core-validation.md#p01b-observed-execution-and-handoff). |
| P03b — `refactor/delivery-interface-consolidation` (merged PR #75) | Clarify supported interface and adapter results, simplify proven duplication and define compatibility/deprecation; [bounded scope and acceptance](../../../implementation/TODO.md#next-implementation-increment). Merged at `f64dcc0`; historical validation remains revision-specific. |
| P04 — consumer template | Merged PR #77: `templates/node-http/` holds service-owner files; shared `src/` validates the pin and both identities. [Quickstart](../consumer-quickstart.md), [validation](independent-consumer-validation.md). General workload configuration remains later work; [bounded Java trial](java-consumer-validation.md) adds an explicit second profile, with runtime acceptance pending. |

Scope clarification — 4 November 2026: the owner explicitly authorizes the bounded
[use-case intake](../use-case-intake.md) documentation/form increment while P00/P01
human acceptance remains pending. This supersedes the earlier intake prerequisite
for this increment only; the dated P01 validation record retains its original
conclusion. Custody, physical restructuring and broader acceptance remain separate.
The dependency sequence remains physical separation → interface consolidation →
independent consumer template → Java trial. Admission-selection implementation
retains its existing capability and validation blockers.

P15's richer
control/evidence catalogue, new quality/security/runtime controls, dashboard redesign
and a future product release remain later work. This inventory does not authorize
moves, deletions, releases, settings changes or measurement runs.

## Compatibility requirements and risks

| Existing dependency | Migration obligation |
| --- | --- |
| Bash `root` resolves to `implementation/`; state helpers and module globals | Introduce explicit roots/state adapters before relocation; restore cross-step values. Never silently retarget digest, trust or evidence directory. |
| `demo.sh` and paired/defense coordinators source modules and dynamic scenario lists | Inspect all coordinators/importers, not just textual filename calls. Keep imports effect-free and direct calls preserving Bash `errexit`. `f13.sh` imports the neutral admission classifier; historical names remain compatible. |
| Build contexts and fixture allowlists | Update Dockerfile COPY/context, `.dockerignore`, captured input hashes and actual source exports together. Quotes service must remain independent of delivery scripts. |
| Selected source/configuration snapshots | A path move changes snapshot bytes/identity. Preserve old manifests and teach new code the new layout; never rewrite historical source or evidence hashes. |
| Workflow command paths and signing identities | Keep `.github/workflows/golden-path.yml` and `paired-rg.yml` identities unchanged here. A rename can change authorized OIDC identity/builder and requires separate trust review plus hosted verification. |
| Make/package/devcontainer paths and CWD | Preserve current commands while introducing future interfaces deliberately; check invocation from repository and implementation roots. Do not treat untracked root npm files as project configuration. |
| Policy renderer, schemas and consumers | Coordinate producers, authenticated-content validators, admission renderer, fixtures and packaging. Conftest and Kyverno need matching tests, not claims of shared implementation. |
| Evidence archives and relative references | Preserve allowlists, private exclusions, first diagnostics, failed observations, source/run associations and recoverability. New archive layout needs a versioned compatibility decision. |
| Owned resources and cleanup | Keep validated state/immutable resource ownership, one shared trap owner and first failure status. Subshell/scenario cleanup only owns its transient resources; repeatable cleanup cannot overwrite evidence. |
| Public/manual interfaces and exit codes | Inventory parser arguments, outputs and manual callers before consolidation. Preserve policy denial versus operational error and CWD semantics; publish explicit compatibility/deprecation decisions. |
| Existing documentation URLs/anchors | Retain compatibility links for root sections; later moves need redirects/stubs and link/anchor validation. Do not relocate historical evidence merely to tidy navigation. |
| UI coupling | Current renderer uses laboratory session/operation/capture formats. Separate a product read model only with real requirements and tests; P01 does not redesign it. |

## Unknowns and owner decisions

The inventory proposes responsibility-based destinations; no destination is owner
approval. The bounded local extraction now puts canonical contracts, capture and archive
primitives in `src/`, with lab allowlists/adapters retained under `implementation/`.
Remaining dynamic-scope callbacks, CLI/validation coupling and compatibility
policy need interface consolidation; the inventory records broader unknowns. Test wrappers may
combine contract checks with scenario sequencing; do not move all tests wholesale.
The retained classic-chain helper is historical support outside the bundle path;
its manual compatibility use must be investigated before deprecation. A tracked
Kyverno `__pycache__` artifact is generated material to investigate, not a source
module and not deleted here. Detailed unknowns are in the inventory rows.

Repository license selection and a verified private security-reporting route remain
owner decisions. Non-sensitive support can use the enabled repository Issues page;
no maintainer team, address, response SLA or broad reuse grant is declared. Existing
vendored licenses remain unchanged. See [reuse/support](../getting-started.md#reuse-and-support).

## P00 baseline

Assessed on 25 October 2026 against actual main and the existing local receipts.
Release [lab-v2026.10.24](https://github.com/tfm-goldenpath/golden-path-lab/releases/tag/lab-v2026.10.24)
(id `423007376`) is published, not draft; tag resolves to
`76f93355ba78f3735b5e864970c63ab4e12b2b33`, also the current P01 base.
[PR #59](https://github.com/tfm-goldenpath/golden-path-lab/pull/59) is merged at that
SHA. The release API still reports **`immutable=false`**. No settings changed.

Existing private local receipts are under
`implementacion/evidence/raw/lab-release-20261024/merged-76f93355/`.
They are intentionally not copied into Git. This is a new assessment of those
records, not a rewrite of the static release notes or preparation guide.

| Gate | Evidence and current status |
| --- | --- |
| Selected source/checks | `source-checks.json` binds merged PR, source and [successful CI 40136532287](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/40136532287); `final-checks.json` retains local doctor/test results. These are historical checks, not P01 runtime validation. |
| Published release | Current API and local tag agree; `publication-handoff.json` records explicit owner publication authorization. Publication is complete. |
| Independent published bytes | `published-receipt.json`: `PUBLISHED_BYTES_VERIFIED`, 19 assets, `2026-10-24T22:19:09.640066+00:00`. Its source/specification/manifest and asset-name set match the independently retained pre-publication `final-preparation.json` and manifest. No 1.7 GB download repeated for P01. |
| Required custody | Owner confirmation covers downloaded frozen-0002 custody/hash only. Local preservation record retains 547 unchanged files. Complete historical evaluation-dossier custody remains unverified; private recovery details remain with the owner. |
| Human release review | The later publication handoff explicitly does not infer detailed review. No separate closing owner-review/refactor-readiness record was recovered in the retained release records. Remains pending. |
| Product-foundation readiness | Existing handoff remains `LAB_RELEASE_NOT_YET_VERIFIED` / `REPOSITORY_REFACTOR_BLOCKED`. The current owner request authorizes this non-behavioral P01 work, not completion of P00 or physical restructuring. |

Anchors checked locally (SHA-256):

```text
release-manifest.json / independent pre-publication anchor:
78b7b09ed4a851ae26253b1ec5d6ac5f2b45b32335cba0ae0d25a3db43b88559
committed input specification:
6c55292f5deafd9a33d1ce11d78f39b7d24176dd12816897913a65d9044a23fb
published-receipt.json:
2bd8445867a2dc10be0f8f9c9b91f064dfde009ae05f26b8d698e9e1485faa19
publication-handoff.json:
2af37965358a45879515d4ae9db55cf4dce7e218b2b21ff09d0fee0653b96e03
```

The later handoff clarifies generic pending-publication wording carried by the
verifier from the unchanged specification. It establishes publication, not human
review. The mutable release has no claimed GitHub-enforced immutable-release
attestation. The handoff also retains an unresolved latest-release indicator
observation; P01 does not change it. Original silent video bytes stay unchanged;
narration/presentation-computer playback are outside the owner's release scope.
For actual recovery use the [reviewed release procedure](../../../implementacion/docs/EN/lab-release-freeze.md),
with independent anchors and a capacity check preserving 3 GiB plus growth.

### Owner custody follow-up — 25 October 2026

The owner reports the four-pair timing pilot backup as **COPIED** and confirms
verification **COMPLETE**. This records the owner's confirmation; the assistant
has not independently inspected the files or replayed their checksum verification.
No personal identity or storage location is recorded. This confirmation does not
establish complete historical evaluation-dossier custody or close the human
release-review gate.

## P01 validation and review

The [validation record](validation.md) reports actual documentation/inventory
checks, newcomer walkthrough, protected-path comparison and explicit unrun checks.
Human acceptance remains pending. Repository-wide refactoring is not complete.

## P03 functional extraction

Historical scope of P03 only; current physical ownership is described
[above](#current-bounded-p01b-separation). Maintenance branches listed above
are now merged, with their own original validation boundaries.

The owner explicitly authorizes this bounded extraction from main
`b00d57b91536a00d3dc99bd1a99f4a82c5bab1ca`. P00 human review/custody gates stay open.
The [operator guide](../legitimate-delivery.md) and [validation record](delivery-core-validation.md)
state current behavior and observed checks. Context/source selection, build,
authentication, authorization and workload operations are shared; environment
operations remain local adapters. No directory migration, dependency update,
consumer template or measurement campaign is included. The original maintenance plan required separate refreshes with stable supported
releases checked at implementation time, pinned and compatibility-tested;
`latest` is not a pin. Their later records remain separate from P03 evidence.
