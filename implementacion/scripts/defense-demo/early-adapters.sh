#!/usr/bin/env bash
# Scanner preparation/re-evaluation using shared operations. No Kubernetes requests.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"
source versions.env
for module in context lab delivery; do source "scripts/lib/$module.sh"; done
source tests/scenarios/runtime.sh
source tests/scenarios/vulnerabilities.sh
mode=local; phase=early; context_init
operation=${1:?}; session=${2:?}; output=${3:?}
[[ "$session" =~ ^[a-z0-9][a-z0-9-]{0,63}$ && "$output" == "$root/evidence/raw/defense-$session/operations/early-"* && "$(realpath "$output")" == "$output" ]] || fail 'Invalid early operation identity'
session_dir="$root/.tmp/defense-demo/$session"
case "$operation" in
 early-f12-negative|early-f12-positive)
  expected=F12; [[ "$operation" != early-f12-positive ]] || expected=L06
  scenario_runtime_early "$output/input.json" "$expected" "$output/control"
  cat "$output/control.json"
  ;;
 early-f03-prepare)
  if [[ "$(jq -r .profile "$session_dir/session.json")" == defense-all ]]; then
    # Restore the sealed owner; never replace its lab pointer or baseline digest.
    export GP_STATE_DIR
    GP_STATE_DIR=$(cat "$session_dir/lab-path.txt")
    load_state
    load_delivery_context
    python3 scripts/defense-demo/ownership.py "$session" check
    [[ -f "$state_dir/database-identity.json" ]] || fail 'Prepared database missing'
  else
    create_state
    printf '%s\n' "$state_dir" > "$session_dir/lab-path.txt"
    capture_source_context
    python3 scripts/defense-demo/ownership.py "$session" claim
    trap 'code=$?; trap - EXIT; set +e; python3 scripts/defense-demo/ownership.py "$session" checkpoint; checked=$?; (( code != 0 )) || code=$checked; exit "$code"' EXIT
    # Default Docker bridge requires neither kind nor a Kubernetes node.
    lab_create_registry_builder bridge
    python3 scripts/defense-demo/ownership.py "$session" checkpoint
    delivery_service_tests
    delivery_workflow_policy
    cp versions.env "$state_dir/versions.txt"; cp tools.lock.json "$state_dir/tools-lock.json"
    delivery_build
    load_delivery_context
    export TRIVY_CACHE_DIR="/tmp/golden-path-defense-$session/trivy-cache"
    export GP_VULNERABILITY_SNAPSHOT_ROOT="/tmp/golden-path-defense-$session/snapshots"
    mkdir -p "$GP_VULNERABILITY_SNAPSHOT_ROOT"
    delivery_database_prepare
  fi
  scenario_vulnerability_prepare F03-vulnerable
  scenario_vulnerability_prepare F03-repaired
  if [[ "$(jq -r .profile "$session_dir/session.json")" == defense-all ]]; then
    python3 scripts/defense-demo/ownership.py "$session" check
  fi
  ;;
 early-f03-negative|early-f03-positive)
  state_dir="$output"; image=$(jq -r .image "$output/image.json")
  # Original prepared SBOM copied unchanged; only the report is newly generated.
  delivery_scan_original_sbom
  delivery_evaluate_vulnerabilities
  fixture=F03-vulnerable; [[ "$operation" != early-f03-positive ]] || fixture=F03-repaired
  scenario_vulnerability_assert "$fixture"
  cat "$state_dir/vulnerability-policy.json"
  ;;
 *) fail 'Unknown early adapter' ;;
esac
