#!/usr/bin/env bash
# Provenance scenario owns its reversible fault; demo.sh continues to own infrastructure cleanup.
# F09/F10 use the L01 replacement candidate; each directed trial checks recovery.
scenario_provenance_fault() (
  set -Eeuo pipefail
  local scenario=$1 profile=${2:-before-results} folder prefix recovery_required=0
  [[ "$scenario" == F09 || "$scenario" == F10 ]] || fail 'Invalid provenance scenario.'
  folder=$scenario-CI; prefix=CI-$folder
  local gate_status=0 admission_status=0 registry_ip registry_owner rejection reason rule admission_name
  [[ "$profile" == before-results || "$profile" == authorized ]] || fail 'Invalid provenance scenario profile.'
  if [[ "$profile" == authorized ]]; then folder=$scenario-admission; prefix=CI-$folder; fi
  admission_name="admission-${scenario,,}"
  mkdir "$state_dir/$folder"
  scenario_provenance_recover() {
    local original=$? restoration=0 cleanup=0 response
    trap - EXIT INT TERM
    if [[ "$recovery_required" == 1 && "$profile" == authorized ]]; then
      workload_admission_cleanup "$state_dir/$folder" negative || cleanup=$?
    fi
    if [[ "$recovery_required" == 1 ]]; then
      node scripts/provenance-scenario-evidence.mjs restore "$state_dir" "$image" "$scenario" "$profile" > "$state_dir/$folder/restore.log" 2>&1 || restoration=$?
      if [[ "$restoration" == 0 ]]; then
        node scripts/provenance-scenario-evidence.mjs snapshot "$state_dir" "$image" "$scenario" "$profile" restored >> "$state_dir/$folder/restore.log" 2>&1 || restoration=$?
      fi
      if [[ "$restoration" == 0 ]]; then
        node scripts/ci-verification-gate.mjs "$state_dir" "$prefix-restored" "$profile" >> "$state_dir/$folder/restore.log" 2>&1 || restoration=$?
      fi
    fi
    [[ "$restoration" != 0 ]] || restoration=$cleanup
    if [[ "$recovery_required" == 1 && "$restoration" == 0 && "$profile" == authorized ]]; then
      set +e
      (
        set -Eeuo pipefail
        trap 'code=$?; if [[ -n "${port_pid:-}" ]]; then kill "$port_pid" 2>/dev/null || true; wait "$port_pid" 2>/dev/null || true; fi; exit "$code"' EXIT
        workload_admission_recovery "$state_dir/$folder"
        actor tfm-golden apply -f "$state_dir/tfm-golden.json" > "$state_dir/$folder/recovery-admission.log" 2>&1
        probe tfm-golden
        for response in health version quote; do
          cp "$state_dir/tfm-golden-$response.json" "$state_dir/$folder/recovery-$response.json"
        done
        k -n tfm-golden get deployment quotes-node -o json > "$state_dir/$folder/recovery-deployment.json"
        k -n tfm-golden get pods -l app=quotes-node -o json > "$state_dir/$folder/recovery-pods.json"
        node scripts/check-image-rollout.mjs --same-image "$image" "$state_dir/$folder/recovery-deployment.json" "$state_dir/$folder/recovery-pods.json" > "$state_dir/$folder/recovery-rollout.json"
      )
      restoration=$?
      set -e
    fi
    if [[ "$recovery_required" == 1 && "$restoration" == 0 ]]; then
      k get clusterpolicies -o json | jq '[.items[] | {name:.metadata.name,spec:.spec}] | sort_by(.name)' > "$state_dir/$folder/policies-restored.json" || restoration=$?
      cmp "$state_dir/$folder/policies-before.json" "$state_dir/$folder/policies-restored.json" || restoration=$?
    fi
    if [[ "$recovery_required" == 1 && "$profile" == authorized ]]; then
      workload_admission_cleanup "$state_dir/$folder" recovery || { cleanup=$?; [[ "$restoration" != 0 ]] || restoration=$cleanup; }
    fi
    jq -n --argjson original "$original" --argjson restoration "$restoration" --argjson attempted "$recovery_required" \
      '{originalStatus:$original,restorationStatus:$restoration,restorationAttempted:($attempted==1)}' > "$state_dir/$folder/recovery.json" || { [[ "$original" != 0 ]] || original=1; }
    if [[ "$original" == 0 && "$restoration" == 0 ]]; then
      jq -n --arg image "$image" --arg phase "$profile" --arg scenario "$scenario" '{scenario:$scenario,image:$image,phase:$phase,status:"REJECTION_AND_RECOVERY",legitimateRecovery:(if $phase=="authorized" then "accepted-and-healthy" else "pending" end)}' > "$state_dir/$folder/result.json" || original=$?
    fi
    [[ "$restoration" == 0 ]] || printf 'ERROR: provenance scenario recovery failed; retain backup and restore.log.\n' >&2
    [[ "$original" != 0 ]] || original=$restoration
    exit "$original"
  }
  trap scenario_provenance_recover EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  [[ "$mode" == local && "$(basename "$state_dir")" == L01-update ]] || fail 'provenance scenario requires the local replacement candidate.'
  registry_ip=$(docker inspect -f '{{(index .NetworkSettings.Networks "kind").IPAddress}}' "$registry")
  registry_owner=$(docker inspect -f '{{index .Config.Labels "tfm.lab"}}' "$registry")
  [[ "$registry_owner" == "$cluster" && "$image_repo" == "$registry_ip:5000/quotes-node-$(basename "$(dirname "$state_dir")" | tr '[:upper:]' '[:lower:]')" ]] || fail 'provenance scenario registry ownership mismatch.'
  node scripts/provenance-scenario-evidence.mjs prepare "$state_dir" "$image" "$scenario" "$profile"
  attestations_ci_gate "$prefix-before" "$profile"
  if [[ "$scenario" == F10 ]]; then
    # Deliberately labelled lab fixture. No registry publication during issuance.
    cosign attest "${sign_args[@]}" --no-upload --bundle "$state_dir/$folder/fixture.bundle.json" --type slsaprovenance1 \
      --predicate "$state_dir/$folder/fixture-predicate.json" "$image" > "$state_dir/$folder/fixture-signing.log" 2>&1
  fi
  node scripts/provenance-scenario-evidence.mjs plan "$state_dir" "$image" "$scenario" "$profile"
  k get clusterpolicies -o json | jq '[.items[] | {name:.metadata.name,spec:.spec}] | sort_by(.name)' > "$state_dir/$folder/policies-before.json"
  if [[ "$profile" == authorized ]]; then
    k -n kyverno get deployments -o json > "$state_dir/$folder/controller.json"
    jq -e '[.items[] | select(.metadata.name == "kyverno-admission-controller") | .spec.template.spec.containers[] | select(.name == "kyverno") | .args | index("--imageVerifyCacheEnabled=false")] | length == 1 and .[0] != null' "$state_dir/$folder/controller.json" >/dev/null
    workload_admission_prepare "$state_dir/$folder" "$scenario"
    actor tfm-golden create --dry-run=server -f "$state_dir/$folder/admission-request.json" > "$state_dir/$folder/positive-before.log" 2>&1
  fi
  recovery_required=1
  node scripts/provenance-scenario-evidence.mjs alter "$state_dir" "$image" "$scenario" "$profile" > "$state_dir/$folder/alter.log" 2>&1
  node scripts/provenance-scenario-evidence.mjs snapshot "$state_dir" "$image" "$scenario" "$profile" negative
  if node scripts/ci-verification-gate.mjs "$state_dir" "$prefix-negative" "$profile" > "$state_dir/$folder/gate.log" 2>&1; then
    gate_status=0
  else
    gate_status=$?
  fi
  jq -n --argjson status "$gate_status" --arg profile "$profile" '{exitStatus:$status,observation:(if $status==0 then "UNEXPECTED_ACCEPTANCE" else "REJECTION_REQUIRES_ATTRIBUTION" end),phase:$profile}' > "$state_dir/$folder/attempt.json"
  if [[ "$profile" == authorized ]]; then
    if actor tfm-golden create -f "$state_dir/$folder/admission-request.json" -o json > "$state_dir/$folder/admission.log" 2>&1; then admission_status=0; else admission_status=$?; fi
    jq -n --argjson status "$admission_status" '{exitStatus:$status,observation:(if $status==0 then "UNEXPECTED_ADMISSION" else "REJECTION_REQUIRES_ATTRIBUTION" end)}' > "$state_dir/$folder/admission.json"
    if [[ "$admission_status" != 0 ]]; then workload_admission_absent "$state_dir/$folder" rejected; fi
  fi
  node scripts/provenance-scenario-evidence.mjs snapshot "$state_dir" "$image" "$scenario" "$profile" after-denial
  [[ "$gate_status" == 42 ]] || fail 'provenance scenario did not observe the expected verifier rejection.'
  node scripts/provenance-scenario-evidence.mjs attribute "$state_dir" "$image" "$scenario" "$profile"
  k get clusterpolicies -o json | jq '[.items[] | {name:.metadata.name,spec:.spec}] | sort_by(.name)' > "$state_dir/$folder/policies-after.json"
  cmp "$state_dir/$folder/policies-before.json" "$state_dir/$folder/policies-after.json"
  if [[ "$profile" == before-results ]]; then
    [[ ! -e "$state_dir/results.bundle.json" && ! -e "$state_dir/results-predicate.json" && ! -e "$state_dir/L01-update.log" ]] || fail 'provenance scenario reached authorization/deployment before recovery.'
  else
    [[ "$admission_status" != 0 ]] || fail 'provenance scenario unexpectedly admitted the provenance fault.'
    rejection=$(scenario_admission_single_reason "$state_dir/$folder/admission.log" tfm-provenance require-provenance "$admission_name") || fail 'provenance scenario has unrelated or additional admission rejection.'
    rule="${rejection%%$'\t'*}"; reason="${rejection#*$'\t'}"
    if [[ "$scenario" == F09 ]]; then
      [[ "$reason" == 'image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found' ]] || fail 'F09 admission diagnostic is unclassified; barrier remains pending.'
    else
      [[ "$reason" == "image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: .attestations[0].attestors[0].entries[0].keys: attestation checks failed for $image and predicate https://slsa.dev/provenance/v1: PROVENANCE_REPOSITORY" ]] || fail 'F10 admission diagnostic is unclassified; barrier remains pending.'
    fi
    jq -n --arg rule "$rule" --arg reason "$reason" '{policy:"tfm-provenance",rule:$rule,reason:$reason,support:"attribution.json and positive-before.log; L04 pending"}' > "$state_dir/$folder/admission-attribution.json"
  fi
)
