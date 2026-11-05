#!/usr/bin/env bash
# Local-only post-build F03/F04/L02 procedure. Shared build/scan/trust stays in lib.
scenario_vulnerability_assert() {
  node tests/scenarios/vulnerability-evidence.mjs target "$state_dir" "$1" > "$state_dir/target-attribution.json"
}

scenario_vulnerability_prepare() (
  trap - EXIT
  local parent_state="$state_dir" case_name=$1 base_image="$image" file
  case "$case_name" in F03-vulnerable|F03-repaired|F04|L02) ;; *) fail 'Unknown vulnerability fixture' ;; esac
  state_dir="$parent_state/$case_name"
  [[ ! -e "$state_dir" && ! -L "$state_dir" ]] || fail 'Fixture state already exists.'
  mkdir "$state_dir"
  cp "$parent_state/state.json" "$state_dir/state.json"
  for file in unit-tests.log workflow-policy.json versions.txt tools-lock.json database-identity.json; do
    cp "$parent_state/$file" "$state_dir/$file"
  done
  # The copied context contains no valid child digest or image-specific evidence.
  jq 'del(.digest,.buildTag,.sbomVersion)' "$state_dir/state.json" > "$state_dir/state.next"
  mv "$state_dir/state.next" "$state_dir/state.json"
  jq -n --arg case "$case_name" --arg base "$base_image" --arg commit "$commit" \
    '{case:$case,base:$base,commit:$commit,phase:"post-build",protectedDeployment:($case=="F03-repaired" or $case=="L02")}' > "$state_dir/scenario-input.json"
  id="$(basename "$parent_state" | tr '[:upper:]' '[:lower:]')-${case_name,,}"
  delivery_build "tests/fixtures/vulnerabilities/${case_name,,}" "$base_image"
  [[ "$image_repo@$digest" != "$base_image" ]] || fail 'Fixture reused the baseline digest.'
  load_delivery_context
  delivery_render_manifests
  delivery_check_manifest
  delivery_scan
  delivery_evaluate_vulnerabilities
  scenario_vulnerability_assert "$case_name"
)

scenario_vulnerability_reference() (
  trap 'code=$?; trap - EXIT; if [[ -n "${port_pid:-}" ]]; then kill "$port_pid" 2>/dev/null || true; wait "$port_pid" 2>/dev/null || true; fi; exit "$code"' EXIT
  local parent_state="$state_dir" case_name=$1
  state_dir="$parent_state/$case_name"
  load_delivery_context
  # Negative F03 runs only on the explicit unprotected reference path R.
  workload_reference > "$state_dir/reference-request-rollout.log" 2>&1
  k -n tfm-reference get deployment quotes-node -o json > "$state_dir/reference-deployment.json"
  k -n tfm-reference get pods -l app=quotes-node -o json > "$state_dir/reference-pods.json"
  node scripts/check-image-rollout.mjs --same-image "$image" "$state_dir/reference-deployment.json" "$state_dir/reference-pods.json" tfm-reference > "$state_dir/reference-rollout.json"
  k -n tfm-reference logs deployment/quotes-node > "$state_dir/dependency-behavior.log"
  node tests/scenarios/vulnerability-evidence.mjs compatibility "$state_dir" > "$state_dir/dependency-behavior.json"
)

scenario_vulnerability_accept() (
  trap 'code=$?; trap - EXIT; if [[ -n "${port_pid:-}" ]]; then kill "$port_pid" 2>/dev/null || true; wait "$port_pid" 2>/dev/null || true; fi; exit "$code"' EXIT
  local parent_state="$state_dir" case_name=$1 lifecycle=$2
  [[ "$case_name" == F03-repaired || "$case_name" == L02 ]] || fail 'Negative fixture cannot be authorized or deployed.'
  state_dir="$parent_state/$case_name"
  load_delivery_context
  scenario_vulnerability_assert "$case_name"
  node scripts/vulnerability-evidence.mjs authorize "$state_dir" "$image" > "$state_dir/analysis-authorization.json"
  attestations_verify_delivery
  if [[ "$lifecycle" == initial ]]; then lab_install_admission; fi
  attestations_authorize_results
  actor tfm-golden apply -f "$state_dir/tfm-golden.json" > "$state_dir/admission-response.log" 2>&1
  probe tfm-golden > "$state_dir/protected-rollout.log" 2>&1
  cmp "$state_dir/tfm-reference-quote.json" "$state_dir/tfm-golden-quote.json"
  k -n tfm-golden get deployment quotes-node -o json > "$state_dir/deployment.json"
  k -n tfm-golden get pods -l app=quotes-node -o json > "$state_dir/pods.json"
  node scripts/check-image-rollout.mjs --same-image "$image" "$state_dir/deployment.json" "$state_dir/pods.json" > "$state_dir/rollout.json"
  jq -n --arg case "$case_name" --arg image "$image" '{case:$case,status:"PASS",image:$image,authorization:"fresh-image-specific-evidence",admission:"accepted",functionality:"PASS"}' > "$state_dir/acceptance.json"
)

scenario_vulnerabilities() {
  [[ "$mode" == local ]] || fail 'Vulnerability fixtures are supported only in the owned local registry.'
  local case_name
  cp docs/EN/cases/F03-F04-L02/oracles.json "$state_dir/vulnerability-oracles.json"
  for case_name in F03 F04 L02; do
    local suffix=completed; [[ "$case_name" != L02 ]] || suffix=result
    jq -n --arg scenario "$case_name" '{scenario:$scenario,status:"INCOMPLETE",phase:"post-build",hosted:"NOT_EXECUTED"}' > "$state_dir/$case_name-$suffix.json"
  done
  delivery_database_prepare
  for case_name in F03-vulnerable F03-repaired F04 L02; do scenario_vulnerability_prepare "$case_name"; done
  scenario_vulnerability_reference F03-vulnerable
  scenario_vulnerability_reference F03-repaired
  node tests/scenarios/vulnerability-evidence.mjs remediation "$state_dir/F03-vulnerable" "$state_dir/F03-repaired" > "$state_dir/remediation-comparison.json"
  scenario_vulnerability_accept F03-repaired initial
  jq --slurpfile acceptance "$state_dir/F03-repaired/acceptance.json" '. + {acceptance:$acceptance[0],hosted:"NOT_EXECUTED"}' "$state_dir/remediation-comparison.json" > "$state_dir/F03-completed.json"
  jq '. + {scenario:"F04",status:"PASS",resultsAuthorization:"NOT_EXECUTED",protectedDeployment:"NOT_EXECUTED",hosted:"NOT_EXECUTED"}' "$state_dir/F04/target-attribution.json" > "$state_dir/F04-completed.json"
  scenario_vulnerability_reference L02
  scenario_vulnerability_accept L02 update
  jq '. + {scenario:"L02",mediumBoundary:"observed",hosted:"NOT_EXECUTED"}' "$state_dir/L02/acceptance.json" > "$state_dir/L02-result.json"
  jq -n --slurpfile f03 "$state_dir/F03-completed.json" --slurpfile f04 "$state_dir/F04-completed.json" --slurpfile l02 "$state_dir/L02-result.json" \
    '{status:"PASS",scope:"local real vulnerability integration; not campaign measurements",F03:$f03[0],F04:$f04[0],L02:$l02[0]}' > "$state_dir/result.json"
}
