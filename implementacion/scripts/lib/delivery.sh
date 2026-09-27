#!/usr/bin/env bash
# Build, early policies, analysis and delivery documents.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

delivery_preflight() {
  local workflow; local -a workflows=()
  record 'Tests and preflight checks'
  node --test services/quotes-node/test/*.test.js tests/unit/*.test.mjs > "$state_dir/unit-tests.log" 2>&1
  python3 -m unittest discover -s tests/policies -p 'test_*.py' > "$state_dir/policy-contracts.log" 2>&1
  python3 tests/policies/run_rego.py > "$state_dir/policy-tests.log" 2>&1
  for workflow in "$root"/../.github/workflows/*.yml "$root"/../.github/workflows/*.yaml; do
    [[ ! -f "$workflow" ]] || workflows+=("$workflow")
  done
  [[ ${#workflows[@]} -gt 0 ]] || fail 'No workflows found in the root .github/workflows directory; preserve the repository structure.'
  conftest test --policy policies/conftest --namespace workflow --output json "${workflows[@]}" > "$state_dir/workflow-policy.json"
  cp versions.env "$state_dir/versions.txt"; cp tools.lock.json "$state_dir/tools-lock.json"
  { node --version; docker version; docker buildx version; kind version; kubectl version --client; conftest --version; cosign version; helm version --short; } > "$state_dir/tool-versions.txt" 2>&1
}

delivery_build() {
  local node_image
  node_image=${GP_NODE_IMAGE:-$SERVICE_NODE_IMAGE}
  [[ "$node_image" =~ @sha256:[a-f0-9]{64}$ ]] || fail 'The base image must be pinned by digest.'
  put nodeImage "$node_image"
  record "Build image $id"
  docker buildx build --builder "$builder" --platform linux/amd64 --provenance=false --sbom=false --push \
    --build-arg "NODE_IMAGE=$node_image" --build-arg "BUILD_COMMIT=$commit" --label "tfm.lab.run=$id" \
    --tag "$image_repo:$id" --metadata-file "$state_dir/build-metadata.json" services/quotes-node
  digest=$(jq -er '."containerimage.digest"' "$state_dir/build-metadata.json")
  [[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Buildx did not return a valid image digest.'
  put digest "$digest"
}

delivery_render_manifests() {
  local ns
  for ns in tfm-reference tfm-golden; do
    node "$contract" manifest "$image_repo@$digest" "$ns" "$state_dir/$ns.json" "$mode"
  done
}

delivery_check_manifest() {
  record 'Early policies and real image analysis'
  conftest test --policy policies/conftest --namespace manifests --output json "$state_dir/tfm-golden.json" > "$state_dir/manifest-policy.json"
}

delivery_analyze() {
  local sbom_version; local -a trivy_args=()
  trivy_args=(--image-src remote --timeout 15m --scanners vuln)
  export TRIVY_CACHE_DIR="${TRIVY_CACHE_DIR:-$root/.tmp/trivy-cache}"
  [[ "$mode" != local ]] || trivy_args+=(--insecure)
  trivy image "${trivy_args[@]}" --format json --output "$state_dir/vulnerabilities.json" "$image"
  trivy --version > "$state_dir/trivy-version.txt"
  [[ ! -f "$TRIVY_CACHE_DIR/db/metadata.json" ]] || cp "$TRIVY_CACHE_DIR/db/metadata.json" "$state_dir/trivy-db.json"
  [[ ! -f "$TRIVY_CACHE_DIR/db/trivy.db" ]] || sha256sum "$TRIVY_CACHE_DIR/db/trivy.db" > "$state_dir/trivy-db-checksum.txt"
  conftest test --policy policies/conftest --namespace trivy --output json "$state_dir/vulnerabilities.json" > "$state_dir/vulnerability-policy.json"
  trivy image "${trivy_args[@]}" --format cyclonedx --output "$state_dir/sbom.cdx.json" "$image"
  sbom_version=$(node "$contract" sbom "$state_dir/sbom.cdx.json"); put sbomVersion "$sbom_version"
}
