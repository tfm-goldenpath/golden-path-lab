#!/usr/bin/env bash
# F11: controlled privileged workload, early and admission UPDATE barriers.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

scenario_f11_early() {
  # Kubernetes rejects privileged=true with allowPrivilegeEscalation=false before
  # policy evaluation. Mutate both consistently so F11 reaches the intended barrier.
  jq '.spec.template.spec.containers[0].securityContext |= (.privileged=true | .allowPrivilegeEscalation=true)' "$state_dir/tfm-golden.json" > "$state_dir/F11-privileged.json"
  jq '.metadata.namespace="tfm-reference"' "$state_dir/F11-privileged.json" > "$state_dir/F11-api-shape.json"
  actor tfm-reference apply --dry-run=server -f "$state_dir/F11-api-shape.json" > "$state_dir/F11-api-shape.log"
  scenario_runtime_early "$state_dir/F11-privileged.json" F11 "$state_dir/F11-early"
}

scenario_f11_admission() {
  local log="$state_dir/F11-admission.log"
  record 'Targeted check of the later enforcement barrier: F11'
  if actor tfm-golden apply -f "$state_dir/F11-privileged.json" > "$log" 2>&1; then fail 'The privileged update was accepted.'; fi
  scenario_f11_attribute "$log"
}

scenario_f11_attribute() {
  local log=$1 name=${2:-quotes-node} rejection rule reason prefix
  rejection="$(scenario_admission_single_reason "$log" tfm-runtime restricted-containers "$name")" || {
    cat "$log"
    fail 'F11 has an unidentified or additional rejection; this does not count as detection.'
  }
  rule="${rejection%%$'\t'*}"
  reason="${rejection#*$'\t'}"
  # The two controlled changes must cause a pattern mismatch in their fields.
  # Kyverno v1.19.1 validate_resource.go distinguishes this from execution errors.
  prefix="validation failure: validation error: RUNTIME: all containers must be unprivileged, without privilege escalation or capabilities. rule $rule failed at path /securityContext"
  if [[ "$reason" != "$prefix/privileged/" && "$reason" != "$prefix/allowPrivilegeEscalation/" ]]; then
    cat "$log"
    fail 'F11 did not identify the controlled privilege violation; resolve the integration before attributing detection.'
  fi
  jq -n --arg rule "$rule" --arg diagnostic "$reason" '{policy:"tfm-runtime",rule:$rule,diagnostic:$diagnostic}' > "$log.attribution.json"
  cat "$log"
}
