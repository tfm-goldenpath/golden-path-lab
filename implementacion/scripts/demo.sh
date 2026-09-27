#!/usr/bin/env bash
# Coordinate the ephemeral lab; modules define functions without starting work.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
mode=${1:-local}; phase=${2:-run}
[[ "$mode" == local || "$mode" == github ]] || { echo 'Mode: local or github' >&2; exit 2; }
case "$phase" in run|prepare|finish|reference|cleanup) ;; *) echo 'Invalid phase' >&2; exit 2 ;; esac
source versions.env
for module in context lab delivery attestations workload; do
  source "$root/scripts/lib/$module.sh"
done
for scenario in l01 f13 f11; do
  source "$root/tests/scenarios/$scenario.sh"
done
context_init

on_exit() {
  local code=$?
  trap - EXIT
  if [[ "$preserve" != 1 ]]; then
    if ! cleanup; then [[ "$code" != 0 ]] || code=1; fi
  fi
  if [[ "$code" != 0 ]]; then printf '\nDelivery stopped. Evidence: %s\n' "$state_dir" >&2; fi
  exit "$code"
}

if [[ "$phase" == cleanup ]]; then load_state; cleanup; exit 0; fi
lab_check_environment
trap on_exit EXIT
if [[ "$phase" == finish ]]; then
  load_state
  exec > >(tee -a "$state_dir/run.log") 2>&1
else
  [[ "$phase" != prepare || "$mode" == github ]] || fail 'prepare is reserved for the GitHub workflow.'
  create_state
  exec > >(tee -a "$state_dir/run.log") 2>&1
  delivery_preflight
  capture_source_context
  lab_create
  delivery_build
  lab_prepare_namespaces
  delivery_render_manifests
fi
load_delivery_context

if [[ "$phase" != finish ]]; then
  workload_reference
  if [[ "$phase" == reference ]]; then
    jq -n --arg image "$image" '{status:"PASS",scope:"reference-only",image:$image}' > "$state_dir/result.json"
    exit 0
  fi
  delivery_check_manifest
  scenario_f11_early
  delivery_analyze
  scenario_l01_prepare_update
  if [[ "$phase" == prepare ]]; then
    printf 'image=%s\ndigest=%s\n' "$image_repo" "$digest" >> "$GITHUB_OUTPUT"
    preserve=1
    record 'Image prepared; the workflow will issue native GitHub provenance'
    exit 0
  fi
fi

attestations_verify_delivery
scenario_f13_prepare
lab_install_admission
scenario_f13_admission
record 'Authorize results and check L01 against the same digest'
attestations_authorize_results
scenario_l01_accept
scenario_f11_admission
scenario_l01_update
jq -n --arg image "$image" --arg mode "$mode" --arg repo "$repository" --arg commit "$commit" \
  --slurpfile update "$state_dir/L01-image-update.json" \
  '{status:"PASS",mode:$mode,evidenceFormat:"sigstore-bundle-v0.3",image:$image,source:{repository:$repo,commit:$commit},reference:"healthy",L01:"accepted-and-healthy",F13:"denied-by-require-results",F11:{early:"denied",admissionUpdate:"denied"},legitimateUpdate:$update[0],measurement:"functional-integration-only"}' > "$state_dir/result.json"
record "PASS: L01 accepted; F13 and F11 rejected. Evidence: $state_dir"
