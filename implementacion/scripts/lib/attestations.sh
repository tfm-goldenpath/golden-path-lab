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

attestations_verify_delivery() {
  record 'Sign and verify the image, SBOM and provenance'
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
  cosign sign "${sign_args[@]}" --bundle "$state_dir/image.bundle.json" "$image"
  attestations_verify_bundle image.bundle.json https://sigstore.dev/cosign/sign/v1 verified-image-bundle.txt verified-signature.json
  cosign attest "${sign_args[@]}" --bundle "$state_dir/sbom.bundle.json" --type cyclonedx --predicate "$state_dir/sbom.cdx.json" "$image"
  attestations_verify_bundle sbom.bundle.json https://cyclonedx.org/bom verified-sbom-bundle.txt verified-sbom.json
  if [[ "$mode" == local ]]; then
    cosign attest "${sign_args[@]}" --bundle "$state_dir/provenance.bundle.json" --type slsaprovenance1 --predicate "$state_dir/provenance.json" "$image"
    attestations_verify_bundle provenance.bundle.json https://slsa.dev/provenance/v1 verified-provenance-bundle.txt verified-provenance.json
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
  cosign attest "${sign_args[@]}" --bundle "$state_dir/results.bundle.json" --type "$results_type" --predicate "$state_dir/results-predicate.json" "$image"
  attestations_verify_bundle results.bundle.json "$results_type" verified-results-bundle.txt verified-results.json
  node scripts/download-bundle-inventory.mjs "$mode" "$image" "$state_dir/registry-inventory-authorized.json" > "$state_dir/bundle-inventory-authorized.json"
  node scripts/check-bundle-profile.mjs "$state_dir/bundle-inventory-authorized.json" "$digest" authorized > "$state_dir/evidence-profile.json"
}
