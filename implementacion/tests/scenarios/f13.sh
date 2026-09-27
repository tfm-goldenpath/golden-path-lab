#!/usr/bin/env bash
# F13: missing signed results for the already verified image.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

# Shared with F11, sourced after this file by demo.sh. Only one identified
# policy/rule rejection may be attributed to a scenario. Preserve the original
# log separately; normalize only YAML string quoting and continuation whitespace.
# kubectl UPDATE errors include a patch and a "to:" preamble. Start reading
# policies only at the complete Kyverno denial marker for the protected workload.
scenario_admission_single_reason() {
  awk -v expected_policy="$2" -v expected_rule="$3" '
    /^resource (Deployment|Pod)\/tfm-golden\/quotes-node was blocked due to the following policies[[:space:]]*$/ {
      blocked++
      next
    }
    !blocked { next }
    /^[[:alnum:]_.-]+:[[:space:]]*$/ {
      policies++
      policy = $0
      sub(/:[[:space:]]*$/, "", policy)
      if (policy != expected_policy) invalid = 1
      next
    }
    /^  [[:alnum:]_.-]+:/ {
      rules++
      rule = $0
      sub(/^  /, "", rule)
      sub(/:.*/, "", rule)
      if (policy != expected_policy || (rule != expected_rule && rule != "autogen-" expected_rule)) invalid = 1
      reason = $0
      sub(/^  [[:alnum:]_.-]+:[[:space:]]*/, "", reason)
      next
    }
    rules { reason = reason " " $0 }
    END {
      if (blocked != 1 || invalid || policies != 1 || rules != 1) exit 1
      gsub(/[[:space:]]+/, " ", reason)
      sub(/^ /, "", reason)
      sub(/ $/, "", reason)
      quote = substr(reason, 1, 1)
      if ((quote == sprintf("%c", 39) || quote == "\"") && substr(reason, length(reason), 1) == quote) {
        reason = substr(reason, 2, length(reason) - 2)
      }
      printf "%s\t%s\n", rule, reason
    }
  ' "$1"
}

scenario_f13_prepare() {
  local -a download_args=()
  record 'F13: preflight check that results authorization is missing'
  [[ "$mode" != local ]] || download_args+=(--allow-insecure-registry)
  cosign download attestation "${download_args[@]}" "$image" > "$state_dir/attestation-inventory-before-results.json"
  node scripts/check-missing-results.mjs "$state_dir/attestation-inventory-before-results.json" "$digest" > "$state_dir/F13-early.json"
}

scenario_f13_admission() {
  local rejection reason prefix
  record 'F13: rejection because the results attestation is missing'
  if actor tfm-golden apply -f "$state_dir/tfm-golden.json" > "$state_dir/F13-admission.log" 2>&1; then fail 'F13 was accepted without results authorization.'; fi
  rejection="$(scenario_admission_single_reason "$state_dir/F13-admission.log" tfm-results require-results)" || {
    cat "$state_dir/F13-admission.log"
    fail 'F13 has an unidentified or additional rejection; this does not count as detection.'
  }
  reason="${rejection#*$'\t'}"
  # Kyverno v1.19.1 pkg/engine/internal/imageverifier.go verifyAttestation:
  # "attestions" is the upstream spelling. A generic "no matching attestations"
  # can wrap certificate/registry errors and is not proof of a missing predicate.
  prefix='image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: .attestations[0].attestors[0].entries[0]'
  if [[ "$reason" != "$prefix.keyless: attestions not found for predicate type $results_type" &&
        "$reason" != "$prefix.keys: attestions not found for predicate type $results_type" ]]; then
    cat "$state_dir/F13-admission.log"
    fail 'F13 did not identify the missing results predicate; resolve the integration before attributing detection.'
  fi
  cat "$state_dir/F13-admission.log"
}
