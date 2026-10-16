#!/usr/bin/env bash
# Allowlisted local adapters. The coordinator owns lifecycle and cancellation.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"
mode=local; phase=defense
source versions.env
for module in context lab delivery attestations workload; do source "$root/scripts/lib/$module.sh"; done
for scenario in l01 f13 runtime f11; do source "$root/tests/scenarios/$scenario.sh"; done
context_init
operation=${1:?}; session=${2:?}
[[ "$session" =~ ^[a-z0-9][a-z0-9-]{0,63}$ ]] || fail 'Invalid session'
session_dir="$root/.tmp/defense-demo/$session"
[[ -d "$session_dir" && ! -L "$session_dir" ]] || fail 'Missing session'
# Keep both the download cache and the independently identified snapshot on the
# temporary filesystem. Snapshots survive cleanup and must be retained for replay.
export TRIVY_CACHE_DIR=${TRIVY_CACHE_DIR:-/tmp/golden-path-defense-$session/trivy-cache}
trap 'code=$?; trap - EXIT; if [[ -n "${port_pid:-}" ]]; then kill "$port_pid" 2>/dev/null || true; wait "$port_pid" 2>/dev/null || true; fi; exit "$code"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

gp_observe() {
  python3 scripts/defense-demo/observer.py "$session" "$operation" "$1" "$2" "$state_dir"
}

# Observe the concrete external request; expected nonzero statuses are retained.
# The scenario functions themselves are still invoked directly under errexit.
actor() {
  local ns=$1 started code=0; shift
  started=$(python3 -c 'import time; print(time.monotonic())')
  kubectl --request-timeout=60s --kubeconfig "$private/kubeconfig" --context "kind-$cluster" \
    --as="system:serviceaccount:$ns:deployer" "$@" || code=$?
  python3 scripts/defense-demo/command-receipt.py "$state_dir" "$operation" "$ns" "$started" "$code" "$@" || { printf 'Actor command receipt failed\n' >&2; return 125; }
  return "$code"
}

restore() {
  export GP_STATE_DIR
  GP_STATE_DIR=$(cat "$session_dir/lab-path.txt")
  load_state
  id=$(basename "$state_dir" | tr '[:upper:]' '[:lower:]')
  if [[ -f "$state_dir/build-metadata.json" ]]; then load_delivery_context; fi
  # Restoring arguments must never issue, generate a key, or contact trust services.
  export COSIGN_PASSWORD=''
  sign_args=(--yes --key "$private/cosign.key" --signing-config "$state_dir/local-signing-config.json" --trusted-root "$state_dir/local-trusted-root.json" --allow-insecure-registry)
  verify_args=(--key "$private/cosign.pub" --trusted-root "$state_dir/local-trusted-root.json" --insecure-ignore-tlog --allow-insecure-registry)
}

resource_snapshot() {
  local prefix=$1
  # Retain only resource identity, never Docker environment/credentials.
  docker inspect "$registry" "$cluster-control-plane" | jq '[.[] | {id:.Id,name:.Name,running:.State.Running,labels:.Config.Labels,networks:(.NetworkSettings.Networks | with_entries(.value |= {IPAddress}))}]' > "$state_dir/$prefix-resources.json"
  k get namespace kube-system -o json > "$state_dir/$prefix-cluster.json"
  if [[ "$prefix" != prepared ]]; then
    jq -e --slurpfile prepared "$state_dir/prepared-cluster.json" '.metadata.uid | type=="string" and length>0 and .==$prepared[0].metadata.uid' "$state_dir/$prefix-cluster.json" > "$state_dir/$prefix-cluster-identity-check.json"
  fi
  k get clusterpolicy tfm-runtime tfm-signature tfm-sbom tfm-provenance tfm-results -o json > "$state_dir/$prefix-policies.json"
  jq -S '[.items[] | {name:.metadata.name,uid:.metadata.uid,generation:.metadata.generation,spec}] | sort_by(.name)' "$state_dir/$prefix-policies.json" > "$state_dir/$prefix-policy-identity.json"
  jq -e '.items | length==5 and all(.[]; any(.status.conditions[]?; .type=="Ready" and .status=="True"))' "$state_dir/$prefix-policies.json"
  [[ "$(actor tfm-golden auth can-i create deployments.apps -n tfm-golden)" == yes ]]
  [[ "$(actor tfm-golden auth can-i update deployments.apps -n tfm-golden)" == yes ]]
  local code=0 permission
  permission=$(actor tfm-golden auth can-i update clusterpolicies.kyverno.io 2> "$state_dir/$prefix-actor-error.log") || code=$?
  [[ "$code" == 1 && "$permission" == no ]] || fail 'Cannot establish restricted actor'
  case "$(cat "$state_dir/$prefix-actor-error.log")" in
    ''|"Warning: resource 'clusterpolicies' is not namespace scoped in group 'kyverno.io'") ;;
    *) fail 'Actor permission observation has an unexpected diagnostic' ;;
  esac
  docker buildx inspect "$builder" > "$state_dir/$prefix-builder.txt"
}

check_owned() {
  python3 scripts/defense-demo/ownership.py "$session" "$1"
}

case "$operation" in
  environment) lab_check_environment; make doctor; python3 scripts/check-tool-versions.py ;;
  initialize)
    [[ ! -e "$session_dir/lab-path.txt" ]] || fail 'Initialization cannot repeat'
    create_state
    printf '%s\n' "$state_dir" > "$session_dir/lab-path.txt"
    capture_source_context
    ;;
  *) restore ;;
esac

case "$operation" in
  environment|initialize) ;;
  ci)
    GP_BUNDLE_PROBE_EVIDENCE_DIR="$state_dir/bundle-probe" make test WORKFLOW_EVIDENCE="$state_dir/workflow-static"
    ;;
  preflight) delivery_preflight ;;
  infrastructure) lab_create ;;
  build) repository=$(get sourceRepository); commit=$(get sourceCommit); image_repo=$(get imageRepository); delivery_build ;;
  namespaces) lab_prepare_namespaces ;;
  manifests) delivery_render_manifests ;;
  reference) workload_reference ;;
  manifest-policy) delivery_check_manifest ;;
  analysis)
    export GP_VULNERABILITY_SNAPSHOT_ROOT="/tmp/golden-path-defense-$session/snapshots"
    [[ "$(realpath -m -- "$GP_VULNERABILITY_SNAPSHOT_ROOT")" == "$GP_VULNERABILITY_SNAPSHOT_ROOT" ]] || fail 'Unsafe snapshot root'
    mkdir -p -m 700 "$GP_VULNERABILITY_SNAPSHOT_ROOT"
    delivery_analyze
    ;;
  delivery-evidence) attestations_verify_delivery ;;
  missing-results) scenario_f13_prepare ;;
  admission-install) lab_install_admission ;;
  seal)
    resource_snapshot prepared
    check_owned seal
    ;;
  resume)
    check_owned check
    resource_snapshot resume
    cmp "$state_dir/prepared-policy-identity.json" "$state_dir/resume-policy-identity.json"
    lab_wait_admission_controller
    node tests/scenarios/runtime-evidence.mjs resolve local "$(get buildTag)" "$image" "$state_dir/resume-tag.json" > "$state_dir/resume-tag-check.json"
    ;;
  f11-early)
    scenario_f11_early
    python3 - "$state_dir" <<'PY'
import difflib,json,sys
from pathlib import Path
p=Path(sys.argv[1]); context=lambda name: json.dumps(json.loads((p/name).read_text())['spec']['template']['spec']['containers'][0]['securityContext'],indent=2).splitlines(True)
(p/'F11-security-diff.txt').write_text(''.join(difflib.unified_diff(context('tfm-golden.json'),context('F11-privileged.json'),fromfile='valid/securityContext',tofile='F11/securityContext')))
PY
    ;;
  f13)
    scenario_runtime_absent Deployment quotes-node "$state_dir/F13-before"
    scenario_f13_prepare
    gp_observe begin f13-admission
    scenario_f13_admission
    gp_observe end f13-admission
    scenario_runtime_absent Deployment quotes-node "$state_dir/F13-after"
    rejection=$(scenario_admission_single_reason "$state_dir/F13-admission.log" tfm-results require-results)
    jq -n --arg diagnostic "$rejection" --arg image "$image" '{policy:"tfm-results",operation:"CREATE",diagnostic:$diagnostic,image:$image,recovery:"pending"}' > "$state_dir/F13-attribution.json"
    ;;
  authorize) attestations_authorize_results ;;
  accept)
    scenario_l01_accept
    k -n tfm-golden get deployment quotes-node -o json > "$state_dir/deployment.json"
    k -n tfm-golden get pods -l app=quotes-node -o json > "$state_dir/pods.json"
    node scripts/check-image-rollout.mjs --same-image "$image" "$state_dir/deployment.json" "$state_dir/pods.json" > "$state_dir/DEMO_VALID_ACCEPT.json"
    resource_snapshot accepted
    cmp "$state_dir/prepared-policy-identity.json" "$state_dir/accepted-policy-identity.json"
    ;;
  f11-admission)
    k -n tfm-golden get deployment quotes-node -o json > "$state_dir/F11-before.json"
    scenario_f11_admission
    k -n tfm-golden get deployment quotes-node -o json > "$state_dir/F11-after.json"
    node tests/scenarios/runtime-evidence.mjs unchanged "$state_dir/F11-before.json" "$state_dir/F11-after.json" > "$state_dir/F11-unchanged.json"
    probe tfm-golden
    cmp "$state_dir/tfm-reference-quote.json" "$state_dir/tfm-golden-quote.json"
    resource_snapshot final
    cmp "$state_dir/prepared-policy-identity.json" "$state_dir/final-policy-identity.json"
    ;;
  cleanup)
    check_owned cleanup-check
    # Python has already packaged and verified both the lab and session evidence.
    # The shared helper retains diagnostics, removes only validated run resources.
    check_owned package-check
    [[ -e "$state_dir/.evidence-packaged" ]] || touch "$state_dir/.evidence-packaged"
    cleanup
    check_owned absent
    ;;
  *) fail 'Unknown adapter' ;;
esac
