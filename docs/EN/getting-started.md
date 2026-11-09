# Getting started

[Guide index](README.md) · [Español](../ES/getting-started.md)

## Find the implementation

Read [the stages and controls](how-it-works.md), then use the
[architecture module table](../../implementation/docs/EN/architecture.md#implemented-modules-and-dependencies)
to follow one digest through the engine. These read-only commands locate the
canonical implementation and its retained inputs:

```bash
git ls-files bin src implementation/services/quotes-node implementation/policies implementation/schemas implementation/tooling
# Compatibility and laboratory adapters:
git ls-files implementation/scripts/lib
```

`bin/deliver` is the entry; `src/run-delivery.sh` sequences the shared engine and
owns cleanup. `implementation/scripts/lib/` contains compatibility imports and
laboratory behavior, not a second engine. Policies, schemas, selected service and
pinned tooling still live under `implementation/`.

## Run the available local delivery

Follow [the operator guide](legitimate-delivery.md) for prerequisites, capacity,
`bash bin/deliver local`, results and cleanup. Linux AMD64, pinned tools, Docker,
network access and committed source are required. The devcontainer requests
4 cores / 16 GB RAM / 32 GB disk; actual free capacity determines whether a run fits.
See [current scope](legitimate-delivery.md#current-scope) for limitations.

<a id="read-and-inspect-without-a-cluster"></a>
<a id="deliberately-run-the-laboratory"></a>

## Explore existing research

The [laboratory route](../../lab/README.md) owns demo/reference execution,
scenario runbooks, measurements and presentation procedures. For reading without
a cluster, follow its [recorded observations](../../lab/README.md) and the
[readiness matrix](../../implementation/docs/EN/evaluation-readiness.md).
Record source SHA, lane, run ID and boundary before interpreting a result.
A code path, green CI or merge is not a new scenario execution or human acceptance.
Reading an archive hash does not reauthenticate signatures; use reviewed tools,
not code recovered from the archive.

<a id="consumer-template-planned"></a>

## Next implementation step

The [independent Node quickstart](consumer-quickstart.md) uses the shared engine
from a separate service repository. The next dependent [bounded increment](../../implementation/TODO.md#next-implementation-increment)
is the Java consumer trial; general workload support remains separate.

## Reuse and support

No root `LICENSE`, repository `SECURITY.md`, `SUPPORT.md` or declared support SLA
is present in the reviewed checkout. Public visibility is not a grant of unrestricted reuse.
Owner selection of repository reuse terms remains pending. The vendored
[CycloneDX notices](../../implementation/schemas/cyclonedx-1.7/LICENSE) and
[is-number license](../../implementation/tests/fixtures/l03/is-number/LICENSE)
apply to those materials; dependency locks do not replace dependency terms.

Use [repository issues](https://github.com/tfm-goldenpath/golden-path-lab/issues)
for non-sensitive questions and reproducible defects, with source revision and
sanitized diagnostics. Do not put secrets or private evidence there. No verified
private security-reporting contact is declared; an owner must choose that route.
This branch does not invent an address or change licenses/settings. Contribution
and human review follow [CONTRIBUTING](../../CONTRIBUTING.md).

Have an improvement in mind? [Propose a use case](use-case-intake.md).
