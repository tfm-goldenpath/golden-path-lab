#!/usr/bin/env bash
# F08 owns its reversible fault; demo.sh continues to own infrastructure cleanup.
# Both directed observations share the existing L04 replacement execution.
scenario_f08() (
  set -Eeuo pipefail
  local profile=${1:-before-results} folder=F08-CI prefix=CI-F08 recovery_required=0
  local gate_status=0 admission_status=0 registry_ip registry_owner rejection reason rule
  [[ "$profile" == before-results || "$profile" == authorized ]] || fail 'Invalid F08 profile.'
  if [[ "$profile" == authorized ]]; then folder=F08-admission; prefix=CI-F08-admission; fi
  mkdir "$state_dir/$folder"
  scenario_f08_recover() {
    local original=$? restoration=0
    trap - EXIT INT TERM
    if [[ "$recovery_required" == 1 ]]; then
      node scripts/f08-signature-evidence.mjs restore "$state_dir" "$image" - "$profile" > "$state_dir/$folder/restore.log" 2>&1 || restoration=$?
      if [[ "$restoration" == 0 ]]; then
        node scripts/f08-signature-evidence.mjs snapshot "$state_dir" "$image" restored "$profile" >> "$state_dir/$folder/restore.log" 2>&1 || restoration=$?
      fi
      if [[ "$restoration" == 0 ]]; then
        node scripts/ci-verification-gate.mjs "$state_dir" "$prefix-restored" "$profile" >> "$state_dir/$folder/restore.log" 2>&1 || restoration=$?
      fi
    fi
    jq -n --argjson original "$original" --argjson restoration "$restoration" --argjson attempted "$recovery_required" \
      '{originalStatus:$original,restorationStatus:$restoration,restorationAttempted:($attempted==1)}' > "$state_dir/$folder/recovery.json" || { [[ "$original" != 0 ]] || original=1; }
    if [[ "$original" == 0 && "$restoration" == 0 ]]; then
      jq -n --arg image "$image" --arg phase "$profile" '{scenario:"F08",image:$image,phase:$phase,status:"REJECTION_AND_RECOVERY",L04:"pending"}' > "$state_dir/$folder/result.json" || original=$?
    fi
    [[ "$restoration" == 0 ]] || printf 'ERROR: F08 recovery failed; retain backup and restore.log.\n' >&2
    [[ "$original" != 0 ]] || original=$restoration
    exit "$original"
  }
  trap scenario_f08_recover EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  [[ "$mode" == local && "$(basename "$state_dir")" == L01-update ]] || fail 'F08 requires the local replacement candidate.'
  registry_ip=$(docker inspect -f '{{(index .NetworkSettings.Networks "kind").IPAddress}}' "$registry")
  registry_owner=$(docker inspect -f '{{index .Config.Labels "tfm.lab"}}' "$registry")
  [[ "$registry_owner" == "$cluster" && "$image_repo" == "$registry_ip:5000/quotes-node-$(basename "$(dirname "$state_dir")" | tr '[:upper:]' '[:lower:]')" ]] || fail 'F08 registry ownership mismatch.'
  node scripts/f08-signature-evidence.mjs snapshot "$state_dir" "$image" before "$profile"
  attestations_ci_gate "$prefix-before" "$profile"
  k get clusterpolicies -o json | jq '[.items[] | {name:.metadata.name,spec:.spec}] | sort_by(.name)' > "$state_dir/$folder/policies-before.json"
  if [[ "$profile" == authorized ]]; then
    k -n kyverno get deployments -o json > "$state_dir/$folder/controller.json"
    jq -e '[.items[] | select(.metadata.name == "kyverno-admission-controller") | .spec.template.spec.containers[] | select(.name == "kyverno") | .args | index("--imageVerifyCacheEnabled=false")] | length == 1 and .[0] != null' "$state_dir/$folder/controller.json" >/dev/null
    actor tfm-golden apply --dry-run=server -f "$state_dir/tfm-golden.json" > "$state_dir/$folder/positive-before.log" 2>&1
  fi
  recovery_required=1
  node scripts/f08-signature-evidence.mjs alter "$state_dir" "$image" - "$profile" > "$state_dir/$folder/alter.log" 2>&1
  node scripts/f08-signature-evidence.mjs snapshot "$state_dir" "$image" negative "$profile"
  if node scripts/ci-verification-gate.mjs "$state_dir" "$prefix-negative" "$profile" > "$state_dir/$folder/gate.log" 2>&1; then
    gate_status=0
  else
    gate_status=$?
  fi
  jq -n --argjson status "$gate_status" --arg profile "$profile" '{exitStatus:$status,observation:(if $status==0 then "UNEXPECTED_ACCEPTANCE" else "REJECTION_REQUIRES_ATTRIBUTION" end),phase:$profile}' > "$state_dir/$folder/attempt.json"
  if [[ "$profile" == authorized ]]; then
    if actor tfm-golden apply -f "$state_dir/tfm-golden.json" > "$state_dir/$folder/admission.log" 2>&1; then admission_status=0; else admission_status=$?; fi
    jq -n --argjson status "$admission_status" '{exitStatus:$status,observation:(if $status==0 then "UNEXPECTED_ADMISSION" else "REJECTION_REQUIRES_ATTRIBUTION" end)}' > "$state_dir/$folder/admission.json"
  fi
  node scripts/f08-signature-evidence.mjs snapshot "$state_dir" "$image" after-denial "$profile"
  [[ "$gate_status" == 1 ]] || fail 'F08 did not observe the expected verifier rejection.'
  node scripts/f08-signature-evidence.mjs attribute "$state_dir" "$image" - "$profile"
  k get clusterpolicies -o json | jq '[.items[] | {name:.metadata.name,spec:.spec}] | sort_by(.name)' > "$state_dir/$folder/policies-after.json"
  cmp "$state_dir/$folder/policies-before.json" "$state_dir/$folder/policies-after.json"
  if [[ "$profile" == before-results ]]; then
    [[ ! -e "$state_dir/results.bundle.json" && ! -e "$state_dir/results-predicate.json" && ! -e "$state_dir/L01-update.log" ]] || fail 'F08 reached authorization/deployment before recovery.'
  else
    [[ "$admission_status" != 0 ]] || fail 'F08 unexpectedly admitted the altered signature.'
    rejection=$(scenario_admission_single_reason "$state_dir/$folder/admission.log" tfm-signature require-image-signature) || fail 'F08 has unrelated or additional admission rejection.'
    rule="${rejection%%$'\t'*}"; reason="${rejection#*$'\t'}"
    [[ "$reason" == 'image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found' ]] || fail 'F08 admission diagnostic is unclassified; barrier remains pending.'
    jq -n --arg rule "$rule" --arg reason "$reason" '{policy:"tfm-signature",rule:$rule,reason:$reason,support:"attribution.json and positive-before.log; L04 pending"}' > "$state_dir/$folder/admission-attribution.json"
  fi
)
