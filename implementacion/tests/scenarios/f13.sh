#!/usr/bin/env bash
# F13: missing signed results for the already verified image.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

scenario_f13_prepare() {
  local -a download_args=()
  record 'F13: preflight check that results authorization is missing'
  [[ "$mode" != local ]] || download_args+=(--allow-insecure-registry)
  cosign download attestation "${download_args[@]}" "$image" > "$state_dir/attestation-inventory-before-results.json"
  node scripts/check-missing-results.mjs "$state_dir/attestation-inventory-before-results.json" "$digest" > "$state_dir/F13-early.json"
}

scenario_f13_admission() {
  record 'F13: rejection because the results attestation is missing'
  if actor tfm-golden apply -f "$state_dir/tfm-golden.json" > "$state_dir/F13-admission.log" 2>&1; then fail 'F13 was accepted without results authorization.'; fi
  grep -q 'tfm-results' "$state_dir/F13-admission.log" || { cat "$state_dir/F13-admission.log"; fail 'F13 failed for another reason; this does not count as detection.'; }
  grep -q 'require-results' "$state_dir/F13-admission.log" || fail 'The results rule was not identified in the F13 rejection.'
  if grep -Eq 'tfm-(signature|sbom|provenance|runtime)' "$state_dir/F13-admission.log"; then cat "$state_dir/F13-admission.log"; fail 'F13 contains additional failures; resolve the integration before attributing detection.'; fi
  cat "$state_dir/F13-admission.log"
}
