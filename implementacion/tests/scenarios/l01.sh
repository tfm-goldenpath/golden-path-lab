#!/usr/bin/env bash
# L01: authorized delivery and legitimate update with equivalent HTTP output.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

scenario_l01_accept() {
  actor tfm-golden apply -f "$state_dir/tfm-golden.json" | tee "$state_dir/L01-admission.log"
  probe tfm-golden
  cmp "$state_dir/tfm-reference-quote.json" "$state_dir/tfm-golden-quote.json"
}

# The same source is rebuilt with a different run label, producing a distinct
# immutable image without changing the quote contract. Each image has its own
# scan, SBOM, provenance and authorization; none are copied from the first image.
scenario_l01_prepare_update() (
  trap - EXIT
  local parent_state="$state_dir" initial_digest="$digest" file
  state_dir="$parent_state/L01-update"
  [[ ! -e "$state_dir" && ! -L "$state_dir" ]] || fail 'Replacement state already exists.'
  mkdir "$state_dir"
  cp "$parent_state/state.json" "$state_dir/state.json"
  # Source/workflow tests describe the same source; image-specific checks below
  # are performed again against the replacement digest.
  for file in unit-tests.log workflow-policy.json versions.txt tools-lock.json; do
    cp "$parent_state/$file" "$state_dir/$file"
  done
  id="$(basename "$parent_state" | tr '[:upper:]' '[:lower:]')-update"
  record 'L01: build and check the replacement image'
  delivery_build
  [[ "$digest" != "$initial_digest" ]] || fail 'L01 requires a different replacement digest.'
  load_delivery_context
  delivery_render_manifests
  delivery_check_manifest
  delivery_analyze
  [[ "$(get sbomVersion)" == "$(jq -er '.sbomVersion' "$parent_state/state.json")" ]] || fail 'Replacement SBOM schema differs from the installed admission contract.'
  if [[ "$mode" == github ]]; then
    printf 'update_image=%s\nupdate_digest=%s\n' "$image_repo" "$digest" >> "$GITHUB_OUTPUT"
  fi
)

scenario_l01_update() (
  # This subshell owns only its port-forward; infrastructure cleanup stays with
  # demo.sh. Preserve failures while ensuring a failed probe leaves no process.
  trap 'code=$?; trap - EXIT; if [[ -n "${port_pid:-}" ]]; then kill "$port_pid" 2>/dev/null || true; wait "$port_pid" 2>/dev/null || true; fi; exit "$code"' EXIT
  local parent_state="$state_dir" previous_image="$image"
  state_dir="$parent_state/L01-update"
  [[ -d "$state_dir" && ! -L "$state_dir" && -f "$state_dir/state.json" ]] || fail 'Replacement image was not prepared.'
  load_delivery_context
  [[ "$image" != "$previous_image" ]] || fail 'L01 requires a different replacement digest.'
  record 'L01: verify and authorize the replacement image'
  attestations_verify_delivery
  attestations_authorize_results
  record 'L01: replace the deployed image and verify the new Pods'
  actor tfm-golden apply -f "$state_dir/tfm-golden.json" > "$state_dir/L01-update.log"
  probe tfm-golden
  cmp "$parent_state/tfm-reference-quote.json" "$state_dir/tfm-golden-quote.json"
  k -n tfm-golden get deployment quotes-node -o json > "$state_dir/deployment.json"
  k -n tfm-golden get pods -l app=quotes-node -o json > "$state_dir/pods.json"
  node scripts/check-image-rollout.mjs "$previous_image" "$image" "$state_dir/deployment.json" "$state_dir/pods.json" > "$parent_state/L01-image-update.json"
)
