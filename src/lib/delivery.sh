#!/usr/bin/env bash
# Shared delivery operations. Function definitions only.

delivery_service_tests() {
  if [[ "${execution_profile:-laboratory}" == delivery-v1 ]]; then
    env -u NODE_TEST_CONTEXT node --test --test-reporter=tap services/quotes-node/test/*.test.js > "$state_dir/unit-tests.log" 2>&1
    node "$contract" service-tests "$state_dir/unit-tests.log"
    return
  fi
  node --test services/quotes-node/test/*.test.js > "$state_dir/unit-tests.log" 2>&1
}

delivery_workflow_policy() {
  local workflow; local -a workflows=()
  for workflow in "$root"/../.github/workflows/*.yml "$root"/../.github/workflows/*.yaml; do
    [[ ! -f "$workflow" ]] || workflows+=("$workflow")
  done
  [[ ${#workflows[@]} -gt 0 ]] || fail 'No workflows found in the root .github/workflows directory; preserve the repository structure.'
  conftest test --policy "${policies_root:-${root:-$PWD}/policies}/conftest" --namespace workflow --output json "${workflows[@]}" > "$state_dir/workflow-policy.json"
}

delivery_versions() {
  cp versions.env "$state_dir/versions.txt"; cp tools.lock.json "$state_dir/tools-lock.json"
  { node --version; docker version; docker buildx version; kind version; kubectl version --client; conftest --version; cosign version; helm version --short; } > "$state_dir/tool-versions.txt" 2>&1
}

delivery_build() {
  local -a cache_args=()
  if [[ -n "${DELIVERY_CACHE_FROM:-}" ]]; then
    [[ -d "$DELIVERY_CACHE_FROM" && -f "$DELIVERY_CACHE_FROM/index.json" ]] || fail 'Prepared cache is missing.'
    cache_args+=(--cache-from "type=local,src=$DELIVERY_CACHE_FROM" --progress=plain)
  fi
  local node_image context=${1:-services/quotes-node} base=${2:-}
  node_image=${GP_NODE_IMAGE:-$SERVICE_NODE_IMAGE}
  [[ "$node_image" =~ @sha256:[a-f0-9]{64}$ ]] || fail 'The base image must be pinned by digest.'
  put nodeImage "$node_image"
  delivery_capture_build_inputs "$context" "${base:-$node_image}" "$commit" "${3:-}" "${4:-}" "${5:-laboratory}" > "$state_dir/build-inputs.json"
  record "Build image $id"
  docker buildx build --builder "$builder" --platform linux/amd64 --provenance=false --sbom=false --push \
    --build-arg "BASE_IMAGE=$base" --build-arg "NODE_IMAGE=$node_image" --build-arg "BUILD_COMMIT=$commit" --label "tfm.lab.run=$id" \
    --tag "$image_repo:$id" --metadata-file "$state_dir/build-metadata.json" "${cache_args[@]}" "$context"
  digest=$(jq -er '."containerimage.digest"' "$state_dir/build-metadata.json")
  [[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Buildx did not return a valid image digest.'
  put digest "$digest"
  put buildTag "$image_repo:$id"
}

delivery_render_manifests() {
  local ns; local -a namespaces=("$@")
  [[ ${#namespaces[@]} != 0 ]] || namespaces=(tfm-reference tfm-golden)
  for ns in "${namespaces[@]}"; do
    node "$contract" manifest "$image_repo@$digest" "$ns" "$state_dir/$ns.json" "$mode"
  done
}

delivery_check_manifest() {
  record 'Early policies and real image analysis'
  conftest test --policy "${policies_root:-${root:-$PWD}/policies}/conftest" --namespace manifests --output json "$state_dir/tfm-golden.json" > "$state_dir/manifest-policy.json"
}

# Record the exact external request and failure code without masking the caller.

delivery_analysis_command() {
  local prefix=$1 status=0; shift
  printf '%q ' "$@" > "$state_dir/$prefix-request.txt"
  printf '\n' >> "$state_dir/$prefix-request.txt"
  "$@" > "$state_dir/$prefix.log" 2>&1 || status=$?
  printf '%s\n' "$status" > "$state_dir/$prefix-exit.txt"
  if (( status != 0 )); then
    printf 'ERROR: %s failed (exit %s). Original output: %s\nDiagnostic excerpt (last 16384 bytes):\n' \
      "$prefix" "$status" "$state_dir/$prefix.log" >&2
    tail -c 16384 -- "$state_dir/$prefix.log" >&2 || true
  fi
  return "$status"
}

# One immutable snapshot is shared by all images in a run. Its bytes are retained
# outside Git and the small identity record travels with each image's evidence.

delivery_database_prepare() {
  local cache=${TRIVY_CACHE_DIR:-$root/.tmp/trivy-cache} snapshot
  if jq -e '.vulnerabilityDatabase' "$state_dir/state.json" >/dev/null; then
    snapshot=$(get vulnerabilityDatabase)
  else
    # Optional storage placement changes no database bytes or verification rules.
    # Small Codespaces can retain the large snapshot on a separate filesystem.
    local snapshot_root=${GP_VULNERABILITY_SNAPSHOT_ROOT:-$root/.tmp}
    if [[ -n "${GP_VULNERABILITY_SNAPSHOT_ROOT:-}" ]]; then
      [[ "$snapshot_root" == /* && -d "$snapshot_root" && "$(realpath -- "$snapshot_root")" == "$snapshot_root" ]] || fail 'Database snapshot root must be an existing canonical absolute directory.'
    fi
    snapshot="$snapshot_root/vulnerability-db-$(basename "$state_dir")"
    [[ ! -e "$snapshot" ]] || fail 'Database snapshot already exists; use a fresh run.'
    if [[ -n "${GP_VULNERABILITY_DB:-}" ]]; then
      cache=$(realpath -- "$GP_VULNERABILITY_DB")
    else
      # Fetch from the publisher directly: a mirror layer 404 can abort Trivy
      # before its built-in fallback. Keep explicit operator overrides recorded.
      delivery_analysis_command database-download trivy image --cache-dir "$cache" \
        --db-repository "${TRIVY_DB_REPOSITORY:-ghcr.io/aquasecurity/trivy-db:2}" --download-db-only
    fi
    # Command substitution does not inherit errexit: the adapter explicitly
    # propagates failures and emits only its selected path on stdout.
    snapshot=$(delivery_snapshot_database "$cache" "$snapshot") || return $?
    python3 "${engine_root:-${root:-$PWD}/../src}/vulnerability-database.py" identify "$snapshot" > "$state_dir/database-identity.json"
    put vulnerabilityDatabase "$snapshot"
  fi
  python3 "${engine_root:-${root:-$PWD}/../src}/vulnerability-database.py" check "$snapshot" "$state_dir/database-identity.json"
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
  node "${engine_root:-${root:-$PWD}/../src}/validate-sbom-schema.mjs" "$state_dir/sbom.cdx.json" "$state_dir/sbom-schema-generation.json"
  sbom_version=$(node "$contract" sbom "$state_dir/sbom.cdx.json"); put sbomVersion "$sbom_version"
  delivery_scan_original_sbom
}

# Re-scan an already generated inventory; never rebuild or regenerate it here.

delivery_scan_original_sbom() {
  local snapshot
  delivery_database_prepare
  snapshot=$(get vulnerabilityDatabase)
  trivy --version > "$state_dir/trivy-version.txt"
  cp "$snapshot/db/metadata.json" "$state_dir/trivy-db.json"
  delivery_analysis_command vulnerability-scan trivy sbom --timeout 15m --cache-dir "$snapshot" --skip-db-update --skip-java-db-update \
    --offline-scan --scanners vuln --ignore-unfixed=false --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL \
    --pkg-types os,library --ignorefile /dev/null --format json \
    --output "$state_dir/vulnerabilities.json" "$state_dir/sbom.cdx.json"
  python3 "${engine_root:-${root:-$PWD}/../src}/vulnerability-database.py" check "$snapshot" "$state_dir/database-identity.json"
  node "${engine_root:-${root:-$PWD}/../src}/vulnerability-evidence.mjs" association "$state_dir" "$image" > "$state_dir/analysis-association.json"
}

# Capture only this evaluator's expected nonzero status. Scanner and validation
# failures above always stop the stage. The caller must assert PASS or BLOCKED.

delivery_evaluate_vulnerabilities() {
  local status=0
  conftest test --policy "${policies_root:-${root:-$PWD}/policies}/conftest" --namespace trivy --output json "$state_dir/vulnerabilities.json" \
    > "$state_dir/vulnerability-policy.json" 2> "$state_dir/vulnerability-policy-stderr.log" || status=$?
  printf '%s\n' "$status" > "$state_dir/vulnerability-policy-exit.txt"
  node "${engine_root:-${root:-$PWD}/../src}/vulnerability-evidence.mjs" receipt "$state_dir" "$image" "$status" > "$state_dir/analysis.json"
}

delivery_analyze() {
  delivery_scan
  delivery_evaluate_vulnerabilities
  node "${engine_root:-${root:-$PWD}/../src}/vulnerability-evidence.mjs" authorize "$state_dir" "$image" > "$state_dir/analysis-authorization.json"
}

# CONTEXT BASE COMMIT [AUTHORIZATION_FILE EXECUTION PROFILE]. stdout is the
# capture JSON; delivery_build owns build-inputs.json. Capture validates context
# selection; existing content/provenance validators validate the signed claims.
delivery_capture_build_inputs() { node "${engine_root:-${root:-$PWD}/../src}/capture-build-inputs.mjs" "$@"; }

# SOURCE DESTINATION -> selected path on stdout, diagnostics on stderr.
# The caller owns both paths and retains the original bytes. Never overwrite a
# destination. Identification/checking remains in delivery_database_prepare.
delivery_snapshot_database() {
  delivery_copy_database "$@"
}

delivery_copy_database() {
  [[ $# == 2 && -n "$1" && -n "$2" ]] || { printf 'ERROR: database source and destination required.\n' >&2; return 2; }
  [[ ! -e "$2" && ! -L "$2" ]] || { printf 'ERROR: Database snapshot already exists; use a fresh run.\n' >&2; return 1; }
  mkdir -p -- "${2%/*}" || return $?
  mkdir -- "$2" || return $?
  mkdir -- "$2/db" || return $?
  cp --reflink=auto -- "$1/db/trivy.db" "$1/db/metadata.json" "$2/db/" || return $?
  printf '%s\n' "$2"
}
