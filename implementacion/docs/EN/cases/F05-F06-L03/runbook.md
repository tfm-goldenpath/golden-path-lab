# SBOM family: F05 / F06 / L03

Run from the repository root in Linux/Codespaces:

```bash
make -C implementacion setup-validation
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test
make -C implementacion demo
```

`demo` requires Docker and creates run-owned kind/zot/Kyverno resources. It builds
the initial service and an explicit L03 fixture adding the real, unused
`is-number@7.0.0` package. The fixture source, MIT license and checksums are in
`tests/fixtures/l03/`. Service source and behavior are unchanged. Each image gets
separate real Trivy vulnerability and CycloneDX output; HIGH/CRITICAL still block.
The known package must be absent before and present in the replacement inventory.
Build inputs are retained in each image's `build-inputs.json`.

## Meaning of the checks

- **Schema validity:** offline official CycloneDX 1.7 draft-07 validation with
  pinned Ajv and formats, unmodified vendored schemas and local references.
  No document-supplied URL is fetched. Reports identify schema revision, validator,
  document hash and outcome. Authenticated reports also identify the bundle hash.
- **Laboratory content:** nonempty components and a named main component are
  additional requirements, separate from the official schema.
- **Authenticity:** Cosign checks the exact bundle under the lane's trusted key
  or issuer. Decoding an inventory is not signature verification.
- **Digest binding:** the statement must name the consumed image. F06 preserves
  the unchanged received donor bytes at the downloader's early rejection point,
  then independently authenticates them against the donor's original digest.
- **Known change:** L03 checks `pkg:npm/is-number@7.0.0`, fresh validation/binding,
  admission, rollout and unchanged HTTP response. It does not prove completeness.

CI validates original output before signing and the predicate extracted from the
exact authenticated bundle before content acceptance. Kyverno checks signatures,
subjects and selected fields; it does **not** perform full JSON Schema validation.
The successful results attestation follows mandatory CI checks.

## Local ordering and attribution

The initial F13/F07/L01/F11 flow remains. The replacement has scheduled signing,
F07/F08 early checks, F05 and F06 early checks, exact recovery with fresh CI, normal
results issuance, directed F08/F05/F06 admission, then shared L01/L03/L04 acceptance.
The fault actor never re-signs. F05 removes the sole SBOM artifact; F06 substitutes
an authentic donor SBOM by changing only unsigned OCI association metadata.
Duplicate target evidence, non-target changes, registry errors or stale success
cannot establish the intended fault. F05 needs complete stable retrieval and
non-target authentication. F06 never labels its early rejected inventory complete
or claims target Cosign was reached. Independent diagnostics authenticate
non-targets and compare exact OCI bytes and descriptor sets across observations.

Directed admission occurs after results issuance, uses the restricted workload
actor, observes disabled image-verification caching, compares policy specs,
requires a positive server dry-run and attributes a singleton SBOM-rule denial.
Generic denial or trust/registry failure is insufficient. These bounded snapshots
assume one controlled publisher; they are not atomic registry observations.

Recovery is installed before mutation. Original and recovery failures remain
separate. Restoring the exact original artifact set and fresh successful CI are
mandatory before proceeding. INT/TERM triggers recovery; SIGKILL/host loss cannot.
The parent coordinator retains ownership of infrastructure cleanup.

## Evidence and limits

Each run retains `L01-update/F05-CI`, `F06-CI`, `F05-admission`, `F06-admission`,
CI reports, raw bundles, structured mismatches, donor authentication, recovery,
`L03-components.json`, schema reports and `L03-result.json`. Packaging includes
those directories, original SBOMs, public trust material and internal hashes.
Keep private state/credentials out of Git. Audit both the archive checksum and
all internal hashes, then independently verify the relevant signed bundles.

L01/L03/L04 share an execution and are not independent observations. Hosted normal
delivery uses the same schema and replacement controls; hosted negative F05/F06
remain **NOT_EXECUTED**. No GHCR mutation probe, new permissions, hosted dispatch,
measurement campaign, merge or release is part of this increment.

See the [F05](../F05/record.md), [F06](../F06/record.md) and
[L03](../L03/record.md) operational records for actual acceptance and limitations.

## Observed integration and host networking

Local `run-nWpDa9ZN` passed the complete flow; see the
[validation record](../../../../registros/f05_f06_l03_validation_EN.md).
On this host, stale legacy FORWARD DROP rules blocked the kind bridge while Docker
used nftables. An explicitly approved temporary wrapper allowed outbound bridge
traffic and established replies for the run, then restored the original chain.
The repository does not change host firewall policy. Future runs need working
bridge forwarding or equivalent explicit host approval. The prior DNS failure
remains preserved; it is no longer the latest integration result.

[Detailed firewall explanation, recovery and long-term proposal](../../kind-network-firewall.md).

Directed admission now uses a fresh zero-replica Deployment CREATE with an isolated name/selector, positive CREATE after restoration, and owned cleanup. The normal same-digest workload probes remain separate. See [run 36830599263 and the operation matrix](../../lane-a-validation.md#run-36830599263-f14-unchanged-request); unchanged apply or previously verified UPDATE cannot establish fresh evidence verification. The corrected live demo remains pending.
