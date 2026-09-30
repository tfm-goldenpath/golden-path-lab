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
  local node_image context=${1:-services/quotes-node} base=${2:-}
  node_image=${GP_NODE_IMAGE:-$SERVICE_NODE_IMAGE}
  [[ "$node_image" =~ @sha256:[a-f0-9]{64}$ ]] || fail 'The base image must be pinned by digest.'
  put nodeImage "$node_image"
  node scripts/capture-build-inputs.mjs "$context" "${base:-$node_image}" "$commit" "${3:-}" "${4:-}" > "$state_dir/build-inputs.json"
  record "Build image $id"
  docker buildx build --builder "$builder" --platform linux/amd64 --provenance=false --sbom=false --push \
    --build-arg "BASE_IMAGE=$base" --build-arg "NODE_IMAGE=$node_image" --build-arg "BUILD_COMMIT=$commit" --label "tfm.lab.run=$id" \
    --tag "$image_repo:$id" --metadata-file "$state_dir/build-metadata.json" "$context"
  digest=$(jq -er '."containerimage.digest"' "$state_dir/build-metadata.json")
  [[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Buildx did not return a valid image digest.'
  put digest "$digest"
  put buildTag "$image_repo:$id"
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

# Record the exact external request and failure code without masking the caller.
delivery_analysis_command() {
  local prefix=$1 status=0; shift
  printf '%q ' "$@" > "$state_dir/$prefix-request.txt"
  printf '\n' >> "$state_dir/$prefix-request.txt"
  "$@" > "$state_dir/$prefix.log" 2>&1 || status=$?
  printf '%s\n' "$status" > "$state_dir/$prefix-exit.txt"
  return "$status"
}

# One immutable snapshot is shared by all images in a run. Its bytes are retained
# outside Git and the small identity record travels with each image's evidence.
delivery_database_prepare() {
  local cache=${TRIVY_CACHE_DIR:-$root/.tmp/trivy-cache} snapshot
  if jq -e '.vulnerabilityDatabase' "$state_dir/state.json" >/dev/null; then
    snapshot=$(get vulnerabilityDatabase)
  else
    snapshot="$root/.tmp/vulnerability-db-$(basename "$state_dir")"
    [[ ! -e "$snapshot" ]] || fail 'Database snapshot already exists; use a fresh run.'
    if [[ -n "${GP_VULNERABILITY_DB:-}" ]]; then
      cache=$(realpath -- "$GP_VULNERABILITY_DB")
    else
      delivery_analysis_command database-download trivy image --cache-dir "$cache" --download-db-only
    fi
    mkdir -p "$snapshot/db"
    cp --reflink=auto "$cache/db/trivy.db" "$cache/db/metadata.json" "$snapshot/db/"
    python3 scripts/vulnerability-database.py identify "$snapshot" > "$state_dir/database-identity.json"
    put vulnerabilityDatabase "$snapshot"
  fi
  python3 scripts/vulnerability-database.py check "$snapshot" "$state_dir/database-identity.json"
}

delivery_scan() {
  local snapshot sbom_version; local -a args=(--image-src remote --timeout 15m)
  delivery_database_prepare
  snapshot=$(get vulnerabilityDatabase)
  [[ "$mode" != local ]] || args+=(--insecure)
  trivy --version > "$state_dir/trivy-version.txt"
  cp "$snapshot/db/metadata.json" "$state_dir/trivy-db.json"
  # Original inventory first. Do not request vulnerability enrichment here.
  delivery_analysis_command sbom-generation trivy image "${args[@]}" --cache-dir "$snapshot" --skip-db-update --skip-java-db-update \
    --format cyclonedx --output "$state_dir/sbom.cdx.json" "$image"
  node scripts/validate-sbom-schema.mjs "$state_dir/sbom.cdx.json" "$state_dir/sbom-schema-generation.json"
  sbom_version=$(node "$contract" sbom "$state_dir/sbom.cdx.json"); put sbomVersion "$sbom_version"
  delivery_analysis_command vulnerability-scan trivy sbom --timeout 15m --cache-dir "$snapshot" --skip-db-update --skip-java-db-update \
    --offline-scan --scanners vuln --ignore-unfixed=false --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL \
    --pkg-types os,library --ignorefile /dev/null --format json \
    --output "$state_dir/vulnerabilities.json" "$state_dir/sbom.cdx.json"
  python3 scripts/vulnerability-database.py check "$snapshot" "$state_dir/database-identity.json"
  node scripts/vulnerability-evidence.mjs association "$state_dir" "$image" > "$state_dir/analysis-association.json"
}

# Capture only this evaluator's expected nonzero status. Scanner and validation
# failures above always stop the stage. The caller must assert PASS or BLOCKED.
delivery_evaluate_vulnerabilities() {
  local status=0
  conftest test --policy policies/conftest --namespace trivy --output json "$state_dir/vulnerabilities.json" \
    > "$state_dir/vulnerability-policy.json" 2> "$state_dir/vulnerability-policy-stderr.log" || status=$?
  printf '%s\n' "$status" > "$state_dir/vulnerability-policy-exit.txt"
  node scripts/vulnerability-evidence.mjs receipt "$state_dir" "$image" "$status" > "$state_dir/analysis.json"
}

delivery_analyze() {
  delivery_scan
  delivery_evaluate_vulnerabilities
  node scripts/vulnerability-evidence.mjs authorize "$state_dir" "$image" > "$state_dir/analysis-authorization.json"
}
