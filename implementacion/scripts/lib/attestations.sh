#!/usr/bin/env bash
# Trust configuration, cryptographic verification and signed authorization.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

attestations_verify_bundle() {
  local file=$1 type=$2 report=$3 content=$4 arg status
  local -a bundle_args=()
  for arg in "${verify_args[@]}"; do
    [[ "$arg" == --allow-insecure-registry ]] || bundle_args+=("$arg")
  done
  # Unlike image verification, this command cannot fall back to classic OCI
  # evidence. It authenticates the saved bundle and binds its subject and type.
  if cosign verify-blob-attestation "${bundle_args[@]}" --bundle "$state_dir/$file" \
      --digest "${digest#sha256:}" --digestAlg sha256 --type "$type" > "$state_dir/$report" 2>&1; then
    # Validate and retain the payload from the same authenticated file. OCI
    # verify-attestation can fall back to classic evidence on retrieval errors.
    node scripts/verified-bundle-statement.mjs "$state_dir/$file" "$digest" "$type" "$repository" "$commit" > "$state_dir/$content"
  else
    status=$?; cat "$state_dir/$report" >&2; return "$status"
  fi
}

# Cosign 3.1.3 retries GitHub OIDC transport errors, but not malformed JSON
# responses. Retry only that observed error before signing has begun. Never
# retry a possibly published artifact, verification, or a policy rejection.
attestations_sign_bundle() {
  local file=$1 attempt status log outcome
  shift
  if [[ "$mode" == local ]]; then
    cosign "$@" --bundle "$state_dir/$file" "$image"
    return
  fi
  [[ "$mode" == github && ( "$file" == image.bundle.json || "$file" == sbom.bundle.json || "$file" == results.bundle.json ) ]] || return 2
  [[ ! -e "$state_dir/$file" && ! -L "$state_dir/$file" && ! -e "$state_dir/$file.signing.json" ]] || {
    printf 'ERROR: refusing to overwrite existing signing evidence: %s\n' "$file" >&2
    return 1
  }
  for attempt in 1 2 3; do
    log="$state_dir/$file.signing-attempt-$attempt.log"
    [[ ! -e "$log" && ! -L "$log" ]] || return 1
    if cosign "$@" --bundle "$state_dir/$file" "$image" > "$log" 2>&1; then status=0; else status=$?; fi
    cat "$log" >&2
    outcome=FAILED
    [[ "$status" != 0 ]] || outcome=COMMAND_SUCCEEDED
    jq -n --arg image "$image" --arg status "$outcome" --argjson attempts "$attempt" --argjson exitStatus "$status" \
      '{image:$image,status:$status,attempts:$attempts,exitStatus:$exitStatus,verification:"separate-required-step"}' > "$state_dir/$file.signing.json"
    [[ "$status" != 0 ]] || return 0
    if [[ "$status" != 1 || "$attempt" == 3 || -e "$state_dir/$file" || -L "$state_dir/$file" ]] \
        || ! grep -Fxq 'Generating ephemeral keys...' "$log" \
        || ! grep -Fq 'fetching ambient OIDC credentials: invalid character ' "$log" \
        || grep -Eq 'Signing artifact|Wrote bundle|Pushing signature' "$log"; then
      return "$status"
    fi
    printf 'GitHub OIDC response was not JSON before signing; retrying attempt %s of 3.\n' "$((attempt + 1))" >&2
    sleep "$((attempt * 2))"
  done
}

attestations_issue_delivery() {
  record 'Issue the image signature, SBOM and provenance'
  sign_args=(--yes)
  verify_args=()
  if [[ "$mode" == local ]]; then
    export COSIGN_PASSWORD=''
    # Both L01 images must use the run key already trusted by admission.
    if [[ ! -f "$private/cosign.key" && ! -f "$private/cosign.pub" ]]; then
      cosign generate-key-pair --output-key-prefix "$private/cosign" >/dev/null
    fi
    [[ -f "$private/cosign.key" && -f "$private/cosign.pub" ]] || fail 'Incomplete local signing key pair.'
    cp "$private/cosign.pub" "$state_dir/development-public-key.pem"
    # Local keys are the trust anchor. Empty service/root configurations prevent
    # public signing services and implicit TUF bootstrap in this development lane.
    cosign signing-config create > "$state_dir/local-signing-config.json"
    cosign trusted-root create > "$state_dir/local-trusted-root.json"
    sign_args+=(--key "$private/cosign.key" --signing-config "$state_dir/local-signing-config.json" --trusted-root "$state_dir/local-trusted-root.json" --allow-insecure-registry)
    verify_args+=(--key "$private/cosign.pub" --trusted-root "$state_dir/local-trusted-root.json" --insecure-ignore-tlog --allow-insecure-registry)
    node "$contract" provenance "$repository" "$commit" "$(get sourceSnapshot)" "$(basename "$state_dir")" "$state_dir/provenance.json"
  else
    # Cosign authenticates this material through its TUF client. Do not replace
    # it with an unauthenticated CA download or add intermediates as trust roots.
    cosign trusted-root create --with-default-services > "$state_dir/sigstore-trusted-root.json"
    sign_args+=(--trusted-root "$state_dir/sigstore-trusted-root.json")
    verify_args+=(--trusted-root "$state_dir/sigstore-trusted-root.json" --certificate-identity "$(get identity)" --certificate-oidc-issuer https://token.actions.githubusercontent.com)
  fi
  # Pinned Cosign 3.1.3 image signing emits a DSSE cosign/sign/v1 statement
  # in bundle mode; sign-blob's messageSignature is a different operation.
  # https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/sign/sign.go
  attestations_sign_bundle image.bundle.json sign "${sign_args[@]}"
  attestations_verify_bundle image.bundle.json https://sigstore.dev/cosign/sign/v1 verified-image-bundle.txt verified-signature.json
  node scripts/validate-sbom-schema.mjs "$state_dir/sbom.cdx.json" "$state_dir/sbom-schema-presigning.json"
  attestations_sign_bundle sbom.bundle.json attest "${sign_args[@]}" --type cyclonedx --predicate "$state_dir/sbom.cdx.json"
  attestations_verify_bundle sbom.bundle.json https://cyclonedx.org/bom verified-sbom-bundle.txt verified-sbom.json
  if [[ "$mode" == local ]]; then
    cosign attest "${sign_args[@]}" --bundle "$state_dir/provenance.bundle.json" --type slsaprovenance1 --predicate "$state_dir/provenance.json" "$image"
    attestations_verify_bundle provenance.bundle.json https://slsa.dev/provenance/v1 verified-provenance-bundle.txt verified-provenance.json
  fi
}

attestations_ci_gate() {
  node scripts/ci-verification-gate.mjs "$state_dir" "$1" "${2:-before-results}"
}

attestations_verify_delivery() {
  attestations_issue_delivery
  attestations_ci_gate CI-delivery
}

attestations_authorize_results() {
  # Re-read the registry immediately before issuance; no saved report grants it.
  attestations_ci_gate CI-authorization
  node "$contract" results "$state_dir" "$repository" "$commit" "$state_dir/results-predicate.json"
  attestations_sign_bundle results.bundle.json attest "${sign_args[@]}" --type "$results_type" --predicate "$state_dir/results-predicate.json"
  attestations_verify_bundle results.bundle.json "$results_type" verified-results-bundle.txt verified-results.json
  node scripts/download-bundle-inventory.mjs "$mode" "$image" "$state_dir/registry-inventory-authorized.json" > "$state_dir/bundle-inventory-authorized.json"
  node scripts/check-bundle-profile.mjs "$state_dir/bundle-inventory-authorized.json" "$digest" authorized > "$state_dir/evidence-profile.json"
  attestations_ci_gate CI-authorized authorized
}
