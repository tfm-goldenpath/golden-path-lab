# Official CycloneDX 1.7 schema

Unmodified files from [CycloneDX specification tag 1.7](https://github.com/CycloneDX/specification/tree/4b3f59453366e27c8073fd24e98bf21ef8892c8e/schema),
commit `4b3f59453366e27c8073fd24e98bf21ef8892c8e`. Apache-2.0 license is retained.
`lock.json` records SHA-256 of every upstream file. SPDX here is the official
license-enumeration reference, not a second supported SBOM document format.

The supported producer version is exactly CycloneDX 1.7, observed in pinned Trivy
output from `run-IIWR8RLL` and checked again on every generation. Validation uses
JSON Schema draft-07, Ajv 8.17.1, ajv-formats 3.0.1 (full mode), and
ajv-formats-draft2019 1.6.1 for internationalized URI/email formats. Despite the
extension package name, the schema dialect remains draft-07. npm dependencies
and transitive integrity are locked in `../../tooling/package-lock.json`.

All references resolve from these files; no network loader is configured.
Document `$schema` is ordinary data subject to the official schema, never a
loader URL. Formats are assertions, including international formats. Unknown
formats, unresolved references, incorrect dialect or hash mismatches fail closed.
Official annotation extensions are allowed; no schema content is rewritten.
Schema validity does not establish lab content requirements, authenticity,
image binding or inventory completeness. CI validates before signing and after
authentication of the exact retained bundle; Kyverno checks selected fields only.

Setup: `make -C implementacion setup-validation`. Both devcontainer entry points
and both CI workflows install the same lockfile with scripts disabled. These
dependencies are outside the service's Docker context and runtime manifest.
