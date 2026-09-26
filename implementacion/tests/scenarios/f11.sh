#!/usr/bin/env bash
# F11: controlled privileged workload, early and admission UPDATE barriers.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

scenario_f11_early() {
  # Kubernetes rejects privileged=true with allowPrivilegeEscalation=false before
  # policy evaluation. Mutate both consistently so F11 reaches the intended barrier.
  jq '.spec.template.spec.containers[0].securityContext |= (.privileged=true | .allowPrivilegeEscalation=true)' "$state_dir/tfm-golden.json" > "$state_dir/F11-privileged.json"
  jq '.metadata.namespace="tfm-reference"' "$state_dir/F11-privileged.json" > "$state_dir/F11-api-shape.json"
  actor tfm-reference apply --dry-run=server -f "$state_dir/F11-api-shape.json" > "$state_dir/F11-api-shape.log"
  if conftest test --policy policies/conftest --namespace manifests --output json "$state_dir/F11-privileged.json" > "$state_dir/F11-early.json"; then fail 'F11 was not rejected by the early policy.'; fi
  grep -q PRIVILEGED "$state_dir/F11-early.json" || fail 'F11 failed for a reason unrelated to privileged mode.'
}

scenario_f11_admission() {
  record 'Targeted check of the later enforcement barrier: F11'
  if actor tfm-golden apply -f "$state_dir/F11-privileged.json" > "$state_dir/F11-admission.log" 2>&1; then fail 'The privileged update was accepted.'; fi
  grep -q tfm-runtime "$state_dir/F11-admission.log" || fail 'The later F11 check failed for a reason other than the runtime policy.'
}
