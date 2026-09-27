#!/usr/bin/env bash
# Trust configuration, cryptographic verification and signed authorization.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

attestations_complete_chain() {
  local status
  [[ "$mode" == github ]] || return 0
  if node scripts/complete-classic-chain.mjs "$image" "$1" "$state_dir/sigstore-trusted-root.json" \
      > "$state_dir/$2-chain.json" 2> "$state_dir/$2-chain.log"; then
    return 0
  else
    status=$?
    cat "$state_dir/$2-chain.log" >&2
    return "$status"
  fi
}

attestations_verify_delivery() {
  record 'Sign and verify the image, SBOM and provenance'
  sign_args=(--yes --new-bundle-format=false --use-signing-config=false)
  verify_args=(--new-bundle-format=false)
  if [[ "$mode" == local ]]; then
    export COSIGN_PASSWORD=''
    # Both L01 images must use the run key already trusted by admission.
    if [[ ! -f "$private/cosign.key" && ! -f "$private/cosign.pub" ]]; then
      cosign generate-key-pair --output-key-prefix "$private/cosign" >/dev/null
    fi
    [[ -f "$private/cosign.key" && -f "$private/cosign.pub" ]] || fail 'Incomplete local signing key pair.'
    cp "$private/cosign.pub" "$state_dir/development-public-key.pem"
    sign_args+=(--key "$private/cosign.key" --tlog-upload=false --allow-insecure-registry)
    verify_args+=(--key "$private/cosign.pub" --insecure-ignore-tlog --allow-insecure-registry)
    node "$contract" provenance "$repository" "$commit" "$(get sourceSnapshot)" "$(basename "$state_dir")" "$state_dir/provenance.json"
  else
    # Cosign authenticates this material through its TUF client. Do not replace
    # it with an unauthenticated CA download or add intermediates as trust roots.
    cosign trusted-root create --with-default-services > "$state_dir/sigstore-trusted-root.json"
    sign_args+=(--trusted-root "$state_dir/sigstore-trusted-root.json")
    verify_args+=(--trusted-root "$state_dir/sigstore-trusted-root.json" --certificate-identity "$(get identity)" --certificate-oidc-issuer https://token.actions.githubusercontent.com)
  fi
  cosign sign "${sign_args[@]}" "$image"
  attestations_complete_chain sig image
  cosign verify "${verify_args[@]}" "$image" > "$state_dir/verified-signature.json"
  cosign attest "${sign_args[@]}" --type cyclonedx --predicate "$state_dir/sbom.cdx.json" "$image"
  attestations_complete_chain att sbom
  cosign verify-attestation "${verify_args[@]}" --type cyclonedx "$image" > "$state_dir/verified-sbom.json"
  node "$contract" verify-statement "$state_dir/verified-sbom.json" "$digest" https://cyclonedx.org/bom "$repository" "$commit"
  if [[ "$mode" == local ]]; then
    cosign attest "${sign_args[@]}" --type slsaprovenance1 --predicate "$state_dir/provenance.json" "$image"
    cosign verify-attestation "${verify_args[@]}" --type slsaprovenance1 "$image" > "$state_dir/verified-provenance.json"
    node "$contract" verify-statement "$state_dir/verified-provenance.json" "$digest" https://slsa.dev/provenance/v1 "$repository" "$commit"
  else
    need gh
    gh --version > "$state_dir/github-cli-version.txt"
    gh attestation verify "oci://$image" --repo "$GITHUB_REPOSITORY" --cert-identity "$(get identity)" \
      --source-digest "$commit" --source-ref "$GITHUB_REF" --deny-self-hosted-runners --bundle-from-oci \
      --predicate-type https://slsa.dev/provenance/v1 --format json > "$state_dir/verified-provenance.json"
    node scripts/github-attestation.mjs "$state_dir/verified-provenance.json" "$image_repo" "$digest" "$repository" "$commit" "$(get identity)" "$GITHUB_REF" > "$state_dir/provenance-contract.json"
  fi
}

attestations_authorize_results() {
  node "$contract" results "$state_dir" "$repository" "$commit" "$state_dir/results-predicate.json"
  cosign attest "${sign_args[@]}" --type "$results_type" --predicate "$state_dir/results-predicate.json" "$image"
  attestations_complete_chain att results
  cosign verify-attestation "${verify_args[@]}" --type "$results_type" "$image" > "$state_dir/verified-results.json"
  node "$contract" verify-statement "$state_dir/verified-results.json" "$digest" "$results_type" "$repository" "$commit"
}
