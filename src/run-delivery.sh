#!/usr/bin/env bash
# One legitimate quotes-node delivery; no scenario dispatch or measurements.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../implementation" && pwd -P)
engine_root="$root/../src"
if [[ "${1:-}" == init ]]; then
  shift
  exec node "$engine_root/consumer.mjs" init "$root/.." "$@"
fi
consumer_root=''
if [[ ( "${1:-}" == local || "${1:-}" == check ) && $# == 3 && "$2" == --consumer ]]; then
  consumer_root=$(realpath -e -- "$3")
  [[ "$(realpath -m -s -- "$3")" == "$consumer_root" ]] || { echo 'Symlinked consumer root' >&2; exit 2; }
  if [[ "$1" == check ]]; then
    node "$engine_root/consumer.mjs" capture "$root/.." "$consumer_root"
    exec bash "$engine_root/check-environment.sh" --delivery
  fi
  set -- local
fi
cd "$root"
if [[ "${1:-}" == --help ]]; then
  printf 'Usage: bash bin/deliver local | cleanup ABSOLUTE_DELIVERY_DIRECTORY\ninit DEST --repository HTTPS_URL --engine-commit FULL_SHA\ncheck | local --consumer PATH\nLocal delivery only. Fresh state required; resume is unsupported.\n'
  exit 0
fi
[[ $# == 1 && "$1" == local || $# == 2 && "$1" == cleanup ]] || { echo 'Use --help for supported invocation.' >&2; exit 2; }
mode=local; phase=$1; execution_profile=delivery-v1
[[ -z "$consumer_root" ]] || execution_profile=consumer-v1
source "$root/versions.env"
for module in context admission local-environment delivery attestations workload local-delivery; do
  source "$engine_root/lib/$module.sh"
done
context_init
build_context=services/quotes-node
if [[ -n "$consumer_root" ]]; then service_root="$consumer_root/service"; build_context="$service_root"; fi
if [[ "$phase" == cleanup ]]; then
  load_delivery_state "$2"
  cleanup_code=0
  environment_cleanup || cleanup_code=$?
  environment_capacity after-cleanup || { [[ "$cleanup_code" != 0 ]] || cleanup_code=1; }
  # An abrupt interruption may precede the EXIT report. Retain it as failure,
  # never resume the unfinished stages or replace an existing result/package.
  if [[ ! -f "$state_dir/result.json" ]]; then delivery_result 1 "$cleanup_code"; fi
  delivery_package || { [[ "$cleanup_code" != 0 ]] || cleanup_code=1; }
  exit "$cleanup_code"
fi
[[ -z "${GP_STATE_DIR:-}" ]] || fail 'Delivery resume is unsupported; GP_STATE_DIR cannot select prior state.'
[[ -z "${DELIVERY_CACHE_FROM:-}" && -z "${GP_REUSE_VULNERABILITY_DB:-}" ]] || fail 'Measurement/manual cache controls are not delivery configuration.'
[[ "${GP_NODE_IMAGE:-$SERVICE_NODE_IMAGE}" == "$SERVICE_NODE_IMAGE" ]] || fail 'This profile uses the pinned quotes-node base.'
create_delivery_state
exec 3>&1 4>&2
log_pid=
on_exit() {
  local code=$? cleanup_code=0 package_code=0
  trap - EXIT
  # These routines explicitly propagate every failure; protected stages above
  # are never called from a conditional that suppresses Bash errexit.
  environment_cleanup || cleanup_code=$?
  environment_capacity after-cleanup || { [[ "$cleanup_code" != 0 ]] || cleanup_code=1; }
  [[ "$code" != 0 || "$cleanup_code" == 0 ]] || code=$cleanup_code
  delivery_result "$code" "$cleanup_code" || { [[ "$code" != 0 ]] || code=1; }
  # Close and reap tee before hashing run.log; packaging cannot mutate its input.
  exec 1>&3 2>&4
  [[ -z "$log_pid" ]] || wait "$log_pid" || { [[ "$code" != 0 ]] || code=1; }
  delivery_package || package_code=$?
  if [[ "$package_code" != 0 ]]; then
    [[ "$code" != 0 ]] || code=$package_code
    jq -n --argjson exitStatus "$package_code" '{status:"ERROR",phase:"packaging",exitStatus:$exitStatus}' > "$state_dir/package-failure.json" || true
    printf 'ERROR: evidence packaging failed. Originals: %s\n' "$state_dir" >&2
  fi
  if ! environment_capacity after-package; then
    [[ "$code" != 0 ]] || code=1
    printf 'ERROR: post-package capacity check failed; archive remains unchanged.\n' >&2
  fi
  jq -n --argjson exitStatus "$code" --argjson packagingExitStatus "$package_code" \
    '{schema:"legitimate-delivery-finalization/v1",status:(if $exitStatus==0 then "PASS" else "ERROR" end),exitStatus:$exitStatus,packagingExitStatus:$packagingExitStatus}' > "$state_dir/finalization.json" || { [[ "$code" != 0 ]] || code=1; }
  printf 'Delivery exit %s. Evidence: %s\n' "$code" "$state_dir"
  exit "$code"
}
trap on_exit EXIT
exec > >(tee "$state_dir/run.log") 2>&1
log_pid=$!
# Direct stage calls preserve fail-stop behavior within all shared operations.
delivery_step source capture_delivery_source
delivery_step environment environment_check
delivery_step unitTests delivery_service_tests
delivery_step workflowPolicy delivery_workflow_policy
delivery_step versions delivery_versions
delivery_step environmentCreate environment_create
delivery_step buildSource delivery_source_recheck
delivery_step build delivery_build "$build_context" '' '' '' "$execution_profile"
load_delivery_context
delivery_step storageAfterBuild environment_capacity after-build
delivery_step namespaces environment_namespaces
delivery_step manifest delivery_render_manifests tfm-golden
delivery_step manifestPolicy delivery_check_manifest
delivery_step vulnerabilityPolicy delivery_analyze
delivery_step sourceRecheck delivery_source_recheck
delivery_step evidence attestations_verify_delivery
delivery_step authorization attestations_authorize_results
delivery_step admission environment_admission
delivery_step deploy workload_deploy "$state_dir/admission.log"
delivery_step rollout workload_rollout tfm-golden
delivery_step deployedDigest workload_image tfm-golden
delivery_step http workload_http tfm-golden
