#!/usr/bin/env bash
# Directed F07; definitions only. Requires f13.sh's strict shared classifier.
# Local coordinator calls this after normal results authorization.

scenario_f07_prepare() {
  local registry_ip registry_owner manifest type
  [[ "$mode" == local ]] || fail 'Hosted F07 pending: safe GHCR mutation/restoration is unproven with the existing authorization scope.'
  [[ "$image" == "$(get imageRepository)@$(get digest)" ]] || fail 'F07 image differs from the current run state.'
  registry_ip=$(docker inspect -f '{{(index .NetworkSettings.Networks "kind").IPAddress}}' "$registry")
  registry_owner=$(docker inspect -f '{{index .Config.Labels "tfm.lab"}}' "$registry")
  [[ -n "$registry_ip" && "$registry_owner" == "$cluster" && "$image_repo" == "$registry_ip:5000/quotes-node-$(basename "$state_dir" | tr '[:upper:]' '[:lower:]')" ]] || fail 'F07 registry is not owned by the current run.'
  # Observe effective controller arguments, not just the requested Helm values.
  k -n kyverno get deployments -o json > "$state_dir/F07/controller.json"
  jq -e '[.items[] | select(.metadata.name == "kyverno-admission-controller") | .spec.template.spec.containers[] | select(.name == "kyverno") | .args | index("--imageVerifyCacheEnabled=false")] | length == 1 and .[0] != null' "$state_dir/F07/controller.json" >/dev/null
  node scripts/f07-signature-evidence.mjs snapshot "$state_dir" "$image" before
  jq -r '.inventory.artifacts[] | select(.kind == "sigstore-bundle-v0.3") | [.manifestDigest[7:], .predicateType] | @tsv' "$state_dir/F07/before.json" > "$state_dir/F07/verification-inputs.txt"
  while IFS=$'\t' read -r manifest type; do
    # Authenticate the exact retrieved bundles (including non-targets); contract
    # fields are accepted only after Cosign verifies the saved bytes and subject.
    attestations_verify_bundle "F07/$manifest.bundle.json" "$type" "F07/$manifest.verify.txt" "F07/$manifest.statement.json"
  done < "$state_dir/F07/verification-inputs.txt"
}

scenario_f07_admission() (
  # This subshell owns only its reversible fault, never the shared lab cleanup.
  set -Eeuo pipefail
  local recovery_required=0 rejection reason rule admission_status=0
  mkdir "$state_dir/F07"
  scenario_f07_recover() {
    local original=$? restore_status=0
    trap - EXIT INT TERM
    if [[ "$recovery_required" == 1 ]]; then
      node scripts/f07-signature-evidence.mjs restore "$state_dir" "$image" > "$state_dir/F07/restore.log" 2>&1 || restore_status=$?
      if [[ "$restore_status" == 0 ]]; then
        node scripts/f07-signature-evidence.mjs snapshot "$state_dir" "$image" restored >> "$state_dir/F07/restore.log" 2>&1 || restore_status=$?
      fi
    fi
    jq -n --argjson original "$original" --argjson restoration "$restore_status" --argjson attempted "$recovery_required" \
      '{originalStatus:$original,restorationStatus:$restoration,restorationAttempted:($attempted==1)}' > "$state_dir/F07/recovery.json" || {
      printf 'ERROR: could not preserve F07 recovery statuses: original=%s restoration=%s\n' "$original" "$restore_status" >&2
      [[ "$original" != 0 ]] || original=1
    }
    if [[ "$original" == 0 && "$restore_status" == 0 ]]; then
      jq -n --arg image "$image" --arg rule "$rule" '{scenario:"F07",image:$image,status:"DIRECTED_REJECTION_AND_RESTORATION",policy:"tfm-signature",rule:$rule,sameDigestL01:"pending",measurement:"functional-integration-only"}' > "$state_dir/F07/result.json" || original=$?
    fi
    [[ "$restore_status" == 0 ]] || printf 'ERROR: F07 restoration failed; retain the backup and restore.log.\n' >&2
    # Keep both statuses in recovery.json; an existing failure wins as exit code.
    [[ "$original" != 0 ]] || original=$restore_status
    exit "$original"
  }
  trap scenario_f07_recover EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  scenario_f07_prepare
  # Set before DELETE: a lost response may still mean the mutation happened.
  recovery_required=1
  node scripts/f07-signature-evidence.mjs remove "$state_dir" "$image" > "$state_dir/F07/remove.log" 2>&1
  node scripts/f07-signature-evidence.mjs snapshot "$state_dir" "$image" negative
  if actor tfm-golden apply -f "$state_dir/tfm-golden.json" > "$state_dir/F07/admission.log" 2>&1; then
    admission_status=0
  else
    admission_status=$?
  fi
  # Preserve an unfavorable observation even if the subsequent retrieval fails.
  jq -n --argjson status "$admission_status" '{exitStatus:$status,observation:(if $status==0 then "UNEXPECTED_ADMISSION" else "REJECTION_REQUIRES_ATTRIBUTION" end)}' > "$state_dir/F07/admission.json"
  node scripts/f07-signature-evidence.mjs snapshot "$state_dir" "$image" after-denial
  [[ "$admission_status" != 0 ]] || fail 'F07 unexpectedly admitted the unsigned image; unfavorable security expectation.'
  rejection=$(scenario_admission_single_reason "$state_dir/F07/admission.log" tfm-signature require-image-signature) || fail 'F07 has an unidentified or additional rejection; this does not count as detection.'
  rule="${rejection%%$'\t'*}"
  reason="${rejection#*$'\t'}"
  [[ "$reason" == 'image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found' ]] || fail 'F07 has an unrelated verification error; this does not count as detection.'
  jq -n --arg rule "$rule" --arg reason "$reason" '{policy:"tfm-signature",rule:$rule,reason:$reason}' > "$state_dir/F07/attribution.json"
)

# Called directly only after scenario_l01_accept returns successfully. Keep the
# intermediate result unchanged; completion is a separate, digest-bound record.
scenario_f07_complete() {
  [[ "$mode" == local && "$image" == "$(get imageRepository)@$(get digest)" ]] || fail 'F07 positive control image differs from run state.'
  jq -e --arg image "$image" '.image == $image and .status == "DIRECTED_REJECTION_AND_RESTORATION" and .sameDigestL01 == "pending"' "$state_dir/F07/result.json" >/dev/null
  jq -e '.originalStatus == 0 and .restorationStatus == 0 and .restorationAttempted == true' "$state_dir/F07/recovery.json" >/dev/null
  k -n tfm-golden get deployment quotes-node -o json > "$state_dir/F07/L01-deployment.json"
  k -n tfm-golden get pods -l app=quotes-node -o json > "$state_dir/F07/L01-pods.json"
  node scripts/check-image-rollout.mjs --same-image "$image" "$state_dir/F07/L01-deployment.json" "$state_dir/F07/L01-pods.json" > "$state_dir/F07/L01-rollout.json"
  jq --slurpfile rollout "$state_dir/F07/L01-rollout.json" \
    '.status="DIRECTED_ACCEPTANCE_COMPLETE" | .sameDigestL01="accepted-and-healthy" | .rollout=$rollout[0]' \
    "$state_dir/F07/result.json" > "$state_dir/F07-completed.json"
}

scenario_f07_pending() {
  record 'F07 hosted: not executed; GHCR mutation compatibility pending'
  jq -n '{scenario:"F07",status:"NOT_EXECUTED",reason:"Hosted GHCR mutation compatibility pending",sameDigestL01:"not-applicable"}' > "$state_dir/F07-completed.json"
}
