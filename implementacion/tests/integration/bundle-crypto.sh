#!/usr/bin/env bash
# Real offline Cosign checks with synthetic attest-blob predicates.
# This does not exercise the cosign sign image producer, OCI publication or admission.
set -euo pipefail
umask 077

[[ "$#" == 0 ]] || { printf 'Usage: bash tests/integration/bundle-crypto.sh\n' >&2; exit 2; }
command -v cosign >/dev/null
command -v node >/dev/null
cosign version --json | node -e '
  let text = "";
  process.stdin.on("data", chunk => text += chunk);
  process.stdin.on("end", () => {
    if (JSON.parse(text).gitVersion !== "v3.1.3") {
      throw new Error("These compatibility checks require pinned Cosign v3.1.3");
    }
  });
'

tmp_root="$(cd -- "${TMPDIR:-/tmp}" && pwd -P)"
probe_dir="$(mktemp -d "$tmp_root/gp-bundle-crypto.XXXXXXXX")"
cleanup() {
  local status=$?
  trap - EXIT
  if [[ -n "$probe_dir" && "$probe_dir" == "$tmp_root"/gp-bundle-crypto.* && -d "$probe_dir" && ! -L "$probe_dir" ]]; then
    rm -rf -- "$probe_dir"
  fi
  exit "$status"
}
trap cleanup EXIT
export COSIGN_PASSWORD=''

run() {
  local label=$1
  shift
  if "$@" > "$probe_dir/command.log" 2>&1; then
    printf 'PASS: %s\n' "$label"
  else
    cat "$probe_dir/command.log" >&2
    printf 'FAIL: %s\n' "$label" >&2
    exit 1
  fi
}

reject() {
  local label=$1 expected=$2
  shift 2
  if "$@" > "$probe_dir/command.log" 2>&1; then
    printf 'FAIL: %s was accepted\n' "$label" >&2
    exit 1
  fi
  if [[ "$(< "$probe_dir/command.log")" != *"$expected"* ]]; then
    cat "$probe_dir/command.log" >&2
    printf 'FAIL: %s failed for an unexpected reason\n' "$label" >&2
    exit 1
  fi
  printf 'PASS: %s rejected for its expected reason\n' "$label"
}

# Both explicit files are needed: otherwise signing still attempts TUF bootstrap.
run 'empty local signing services' cosign signing-config create --out "$probe_dir/signing-config.json"
run 'empty local public-service roots' cosign trusted-root create --out "$probe_dir/trusted-root.json"
run 'development signing key' cosign generate-key-pair --output-key-prefix "$probe_dir/local"
run 'untrusted comparison key' cosign generate-key-pair --output-key-prefix "$probe_dir/other"
printf 'Golden Path isolated bundle cryptography probe\n' > "$probe_dir/artifact.bin"
printf '{}\n' > "$probe_dir/signature-predicate.json"
printf '{"bomFormat":"CycloneDX","specVersion":"1.6","version":1,"components":[{"type":"application","name":"bundle-probe"}]}\n' > "$probe_dir/sbom-predicate.json"
# This signed contract fixture is synthetic; it does not authorize a lab delivery.
cat > "$probe_dir/results-predicate.json" <<'JSON'
{
  "policyVersion": "golden-path-v1",
  "source": {"repository": "https://github.com/example/bundle-probe", "commit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
  "result": "PASS",
  "checks": {"unitTests": "PASS", "manifestPolicy": "PASS", "workflowPolicy": "PASS", "vulnerabilityPolicy": "PASS", "signature": "PASS", "sbom": "PASS", "provenance": "PASS"}
}
JSON
digest="$(node -e 'const fs=require("node:fs"),c=require("node:crypto"); process.stdout.write(c.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"));' "$probe_dir/artifact.bin")"
signature_type='https://sigstore.dev/cosign/sign/v1'
sbom_type='https://cyclonedx.org/bom'
results_type='https://tfm-goldenpath.dev/attestations/verification-results/v1'
sign_args=(--yes --key "$probe_dir/local.key" --signing-config "$probe_dir/signing-config.json" --trusted-root "$probe_dir/trusted-root.json")
verify_args=(--key "$probe_dir/local.pub" --insecure-ignore-tlog --digest "$digest" --digestAlg sha256)

run 'signed synthetic image-signature predicate' cosign attest-blob "${sign_args[@]}" --type "$signature_type" \
  --predicate "$probe_dir/signature-predicate.json" --bundle "$probe_dir/signature.json" "$probe_dir/artifact.bin"
run 'signed SBOM predicate' cosign attest-blob "${sign_args[@]}" --type "$sbom_type" \
  --predicate "$probe_dir/sbom-predicate.json" --bundle "$probe_dir/sbom.json" "$probe_dir/artifact.bin"
run 'signed results predicate' cosign attest-blob "${sign_args[@]}" --type "$results_type" \
  --predicate "$probe_dir/results-predicate.json" --bundle "$probe_dir/results.json" "$probe_dir/artifact.bin"
run 'synthetic image-signature bundle cryptography, predicate and subject' cosign verify-blob-attestation \
  "${verify_args[@]}" --type "$signature_type" --bundle "$probe_dir/signature.json"
run 'SBOM bundle cryptography, predicate and subject' cosign verify-blob-attestation \
  "${verify_args[@]}" --type "$sbom_type" --bundle "$probe_dir/sbom.json"
run 'results bundle cryptography, predicate and subject' cosign verify-blob-attestation \
  "${verify_args[@]}" --type "$results_type" --bundle "$probe_dir/results.json"
reject 'F07 predicate distinction: SBOM cannot satisfy image signature' "invalid predicate type, expected $signature_type got $sbom_type" \
  cosign verify-blob-attestation "${verify_args[@]}" --type "$signature_type" --bundle "$probe_dir/sbom.json"
reject 'F07 predicate distinction: results cannot satisfy image signature' "invalid predicate type, expected $signature_type got $results_type" \
  cosign verify-blob-attestation "${verify_args[@]}" --type "$signature_type" --bundle "$probe_dir/results.json"

wrong_digest="${digest:1}${digest:0:1}"
[[ "$wrong_digest" != "$digest" ]] || { printf 'Unexpected degenerate probe digest\n' >&2; exit 1; }
reject 'wrong subject digest' 'provided artifact digest does not match any digest in statement' \
  cosign verify-blob-attestation --key "$probe_dir/local.pub" --insecure-ignore-tlog \
  --digest "$wrong_digest" --digestAlg sha256 --type "$signature_type" --bundle "$probe_dir/signature.json"
reject 'unauthorized development public key' 'accepted signatures do not match threshold' \
  cosign verify-blob-attestation --key "$probe_dir/other.pub" --insecure-ignore-tlog \
  --digest "$digest" --digestAlg sha256 --type "$signature_type" --bundle "$probe_dir/signature.json"

node - "$probe_dir/signature.json" "$probe_dir/tampered.json" <<'NODE'
const fs = require('node:fs');
const bundle = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (bundle.mediaType !== 'application/vnd.dev.sigstore.bundle.v0.3+json'
    || bundle.verificationMaterial?.tlogEntries?.length
    || bundle.verificationMaterial?.timestampVerificationData
    || !bundle.verificationMaterial?.publicKey
    || bundle.dsseEnvelope?.signatures?.length !== 1) {
  throw new Error('The probe did not produce the intended local-key/no-log bundle');
}
const signature = Buffer.from(bundle.dsseEnvelope.signatures[0].sig, 'base64');
if (!signature.length) throw new Error('Missing signature bytes');
signature[signature.length - 1] ^= 1;
bundle.dsseEnvelope.signatures[0].sig = signature.toString('base64');
fs.writeFileSync(process.argv[3], JSON.stringify(bundle) + '\n');
NODE
reject 'F08 controlled signature-byte alteration' 'accepted signatures do not match threshold' \
  cosign verify-blob-attestation "${verify_args[@]}" --type "$signature_type" --bundle "$probe_dir/tampered.json"
printf 'PASS: synthetic attest-blob cryptography checks; cosign sign, OCI registry, OIDC and admission are separate integration checks.\n'
