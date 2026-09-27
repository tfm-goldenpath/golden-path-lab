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
  record 'F13: preflight check that results authorization is missing'
  # Cosign's downloader can silently skip unreadable referrers. Retrieve every
  # advertised bundle strictly before concluding that a predicate is absent.
  node scripts/download-bundle-inventory.mjs "$mode" "$image" "$state_dir/registry-inventory-before-results.json" > "$state_dir/attestation-inventory-before-results.json"
  node scripts/check-bundle-profile.mjs "$state_dir/attestation-inventory-before-results.json" "$digest" before-results > "$state_dir/bundle-profile-before-results.json"
  node scripts/check-missing-results.mjs "$state_dir/attestation-inventory-before-results.json" "$digest" > "$state_dir/F13-early.json"
}

scenario_f13_admission() {
  local rejection reason
  record 'F13: rejection because the results attestation is missing'
  # Re-read the original inventory, not just a cached success report. Both
  # helpers fail closed for malformed data, wrong digests or present results.
  node scripts/check-bundle-profile.mjs "$state_dir/attestation-inventory-before-results.json" "$digest" before-results > "$state_dir/bundle-profile-before-results.json" || fail 'F13 has no valid bundle preflight inventory.'
  node scripts/check-missing-results.mjs "$state_dir/attestation-inventory-before-results.json" "$digest" > "$state_dir/F13-early.json" || fail 'F13 has no valid missing-results preflight.'
  if actor tfm-golden apply -f "$state_dir/tfm-golden.json" > "$state_dir/F13-admission.log" 2>&1; then fail 'F13 was accepted without results authorization.'; fi
  rejection="$(scenario_admission_single_reason "$state_dir/F13-admission.log" tfm-results require-results)" || {
    cat "$state_dir/F13-admission.log"
    fail 'F13 has an unidentified or additional rejection; this does not count as detection.'
  }
  reason="${rejection#*$'\t'}"
  # Kyverno 1.19.1's bundle verifier shares this error between an absent
  # predicate and failed trust. The exact singleton results-rule rejection is
  # attributable only with complete inventories bracketing the denial: results
  # absent, image-signature/SBOM/provenance present for this same image digest.
  if [[ "$reason" != 'image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found' ]]; then
    cat "$state_dir/F13-admission.log"
    fail 'F13 did not identify the expected bundle rejection; resolve the integration before attributing detection.'
  fi
  node scripts/download-bundle-inventory.mjs "$mode" "$image" "$state_dir/registry-inventory-after-denial.json" > "$state_dir/attestation-inventory-after-denial.json" || fail 'F13 could not retrieve the inventory after denial.'
  node scripts/check-bundle-profile.mjs "$state_dir/attestation-inventory-after-denial.json" "$digest" before-results > "$state_dir/bundle-profile-after-denial.json" || fail 'F13 has no valid bundle inventory after denial.'
  node scripts/check-missing-results.mjs "$state_dir/attestation-inventory-after-denial.json" "$digest" > "$state_dir/F13-after-denial.json" || fail 'F13 results absence was not confirmed after denial.'
  # Inventory parsing is not signature verification. The other three admission
  # policies must pass, and L01 must subsequently accept this digest with valid
  # results before the overall execution can be reported as PASS.
  cat "$state_dir/F13-admission.log"
}
