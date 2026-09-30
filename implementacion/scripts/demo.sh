#!/usr/bin/env bash
# Coordinate the ephemeral lab; modules define functions without starting work.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
mode=${1:-local}; phase=${2:-run}
[[ "$mode" == local || "$mode" == github ]] || { echo 'Mode: local or github' >&2; exit 2; }
case "$phase" in run|prepare|finish|reference|cleanup|vulnerabilities) ;; *) echo 'Invalid phase' >&2; exit 2 ;; esac
source versions.env
for module in context lab delivery attestations workload; do
  source "$root/scripts/lib/$module.sh"
done
for scenario in l01 f13 f07 f08 sbom provenance results l05 runtime f11 vulnerabilities; do
  source "$root/tests/scenarios/$scenario.sh"
done
context_init
[[ "$phase" != vulnerabilities || "$mode" == local ]] || fail 'Vulnerability fixtures are local-only.'

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
  if [[ "$phase" != vulnerabilities ]]; then scenario_l05_prepare; fi
  lab_create
  delivery_build
  lab_prepare_namespaces
  delivery_render_manifests
fi
load_delivery_context

if [[ "$phase" == vulnerabilities ]]; then
  scenario_vulnerabilities
  exit 0
fi

if [[ "$phase" != finish ]]; then
  workload_reference
  if [[ "$phase" == reference ]]; then
    jq -n --arg image "$image" '{status:"PASS",scope:"reference-only",image:$image}' > "$state_dir/result.json"
    exit 0
  fi
  delivery_check_manifest
  scenario_f11_early
  scenario_runtime_prepare
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
if [[ "$mode" == local ]]; then
  scenario_f07_admission
else
  scenario_f07_pending
fi
scenario_runtime_create
scenario_l01_accept
if [[ "$mode" == local ]]; then
  scenario_f07_complete
fi
scenario_l06
scenario_l01_update
scenario_l05
jq -n --arg image "$image" --arg mode "$mode" --arg repo "$repository" --arg commit "$commit" \
  --slurpfile f11 "$state_dir/F11-completed.json" \
  --slurpfile f12 "$state_dir/F12-completed.json" \
  --slurpfile l06 "$state_dir/L06-result.json" \
  --slurpfile f07 "$state_dir/F07-completed.json" \
  --slurpfile f05 "$state_dir/F05-completed.json" \
  --slurpfile f06 "$state_dir/F06-completed.json" \
  --slurpfile f09 "$state_dir/F09-completed.json" \
  --slurpfile f13 "$state_dir/F13-completed.json" \
  --slurpfile f14 "$state_dir/F14-completed.json" \
  --slurpfile f10 "$state_dir/F10-completed.json" \
  --slurpfile l05 "$state_dir/L05-result.json" \
  --slurpfile l03 "$state_dir/L03-result.json" \
  --slurpfile f08 "$state_dir/F08-completed.json" \
  --slurpfile ci "$state_dir/F07-CI-completed.json" \
  --slurpfile l04 "$state_dir/L04-result.json" \
  --slurpfile update "$state_dir/L01-image-update.json" \
  '{status:"PASS",mode:$mode,evidenceFormat:"sigstore-bundle-v0.3",image:$image,source:{repository:$repo,commit:$commit},reference:"healthy",L01:"accepted-and-healthy",F13Preissuance:"denied-by-require-results",F13:$f13[0],F14:$f14[0],F07:$f07[0],F07CI:$ci[0],F08:$f08[0],F05:$f05[0],F06:$f06[0],L03:$l03[0],F09:$f09[0],F10:$f10[0],L05:$l05[0],L04:$l04[0],F11:$f11[0],F12:$f12[0],L06:$l06[0],legitimateUpdate:$update[0],measurement:"functional-integration-only"}' > "$state_dir/result.json"
record "PASS: L01 accepted; F13 and F11 rejected; F07 status recorded for the selected lane. Evidence: $state_dir"
