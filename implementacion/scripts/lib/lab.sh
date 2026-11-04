#!/usr/bin/env bash
# Compatibility import; canonical shared implementation. Definitions only.
source "${BASH_SOURCE[0]%${BASH_SOURCE[0]##*/}}../../../src/lib/local-environment.sh"

cleanup() {
  local package_status=0 marker temporary_marker
  marker="$state_dir/.evidence-packaged"
  [[ -z "$port_pid" ]] || { kill "$port_pid" 2>/dev/null || true; wait "$port_pid" 2>/dev/null || true; }
  if [[ -n "$state_dir" && -d "$state_dir" ]] && [[ -L "$marker" || ( -e "$marker" && ! -f "$marker" ) ]]; then
    printf 'ERROR: refusing unsafe evidence marker: %s\n' "$marker" >&2
    package_status=1
  elif [[ -n "$state_dir" && -d "$state_dir" && ! -e "$marker" ]]; then
    if [[ "$mode" == local && -n "$registry" ]]; then
      capture_diagnostic "$state_dir/registry.log" docker logs --tail 100 "$registry" || package_status=1
    fi
    if [[ -n "$private" && -f "$private/kubeconfig" ]]; then
      capture_diagnostic "$state_dir/cluster-pods.txt" k get pods -A -o wide || package_status=1
      capture_diagnostic "$state_dir/cluster-events.txt" k get events -A --sort-by=.lastTimestamp || package_status=1
      lab_capture_admission_diagnostics || package_status=1
    fi
    local status=FAIL
    [[ -f "$state_dir/result.json" ]] && status=$(jq -r '.status' "$state_dir/result.json")
    if [[ "$package_status" == 0 ]] && python3 scripts/package-evidence.py "$state_dir" "$root/evidence/packages" "$status"; then
      if temporary_marker=$(mktemp "$state_dir/.evidence-marker-XXXXXXXX"); then
        ln -T -- "$temporary_marker" "$marker" || package_status=1
        rm -f -- "$temporary_marker" || package_status=1
      else
        package_status=1
      fi
    else
      package_status=1
    fi
  fi
  [[ -z "$builder" ]] || docker buildx rm "$builder" >/dev/null 2>&1 || true
  [[ -z "$cluster" ]] || kind delete cluster --name "$cluster" >/dev/null 2>&1 || true
  [[ "$mode" != local || -z "$registry" ]] || docker rm -f "$registry" >/dev/null 2>&1 || true
  if [[ -n "$private" && "$(dirname "$private")" == "$root/.tmp" && "$(basename "$private")" =~ ^private-[A-Za-z0-9]+$ && -d "$private" ]]; then
    rm -rf -- "$private"
  fi
  [[ "$package_status" == 0 ]] || printf 'ERROR: could not retain the evidence package.\n' >&2
  return "$package_status"
}

lab_check_environment() { local_check_environment "$@"; }
lab_create_registry_builder() { local_create_registry_builder "$@"; }
lab_create() { local_create "$@"; }
lab_prepare_namespaces() { local_prepare_namespaces "$@"; }
lab_kyverno_values() { local_kyverno_values "$@"; }
lab_install_admission() { local_install_admission "$@"; }
lab_apply_admission_policies() { local_apply_admission_policies "$@"; }
lab_wait_admission_controller() { local_wait_admission_controller "$@"; }
lab_capture_admission_diagnostics() { local_capture_admission_diagnostics "$@"; }

environment_readiness_probe() {
  local lifecycle=$1 rejection reason
  if [[ "$lifecycle" == prepared ]]; then
    # No candidate image exists yet. An out-of-repository digest cannot match
    # verifyImages. Require the runtime repository denial through the real API.
    node "$contract" manifest "$SERVICE_NODE_IMAGE" tfm-golden "$state_dir/readiness.json" github
    jq '.metadata.name="measurement-readiness" | .spec.replicas=0' "$state_dir/readiness.json" > "$state_dir/readiness-request.json"
    if actor tfm-golden create --dry-run=server -f "$state_dir/readiness-request.json" > "$state_dir/admission-readiness-probe.log" 2>&1; then
      fail 'Prepared admission unexpectedly accepted an unauthorized repository.'
    fi
    rejection=$(scenario_admission_single_reason "$state_dir/admission-readiness-probe.log" tfm-runtime authorized-image-repository measurement-readiness) || fail 'Prepared readiness has no attributable runtime denial.'
    [[ "${rejection#*$'\t'}" == 'validation failure: IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest' ]] || fail 'Unexpected prepared readiness diagnostic.'
    return
  fi
  # Exercise the actual API-server -> webhook path without persisting a workload.
  # At initial install results are deliberately absent. Reuse the strict shared
  # classifier from lib/admission.sh; this preflight does not count as an F13 trial.
  if actor tfm-golden apply --dry-run=server -f "$state_dir/tfm-golden.json" > "$state_dir/admission-readiness-probe.log" 2>&1; then
    [[ "$lifecycle" == update ]] || fail 'Admission readiness probe unexpectedly accepted missing results.'
  else
    [[ "$lifecycle" == initial ]] || fail 'Legitimate admission readiness probe failed.'
    rejection=$(scenario_admission_single_reason "$state_dir/admission-readiness-probe.log" tfm-results require-results) || fail 'Admission readiness probe has no attributable results denial.'
    reason="${rejection#*$'\t'}"
    [[ "$reason" == 'image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found' ]] || fail 'Admission readiness probe failed for an unexpected reason.'
  fi
}
