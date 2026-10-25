#!/usr/bin/env bash
# Neutral strict singleton admission diagnostic parser. Definitions only.
admission_single_reason() {
  local expected_name=${4:-quotes-node}
  [[ "$expected_name" =~ ^[a-z0-9][a-z0-9-]*$ ]] || return 1
  awk -v expected_name="$expected_name" -v expected_policy="$2" -v expected_rule="$3" '
    $0 ~ "^resource (Deployment|Pod)/tfm-golden/" expected_name " was blocked due to the following policies[[:space:]]*$" {
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

# Compatibility name for laboratory, review and exported audit callers.
scenario_admission_single_reason() { admission_single_reason "$@"; }

# Attribute only unambiguous policy-condition diagnostics. Signature verifier,
# registry and transport failures are errors even when Kyverno denies access.
admission_record_failure() {
  local log=$1 output=$2 status=$3 policy rule rejection reason classification=ERROR
  local entry
  for entry in 'tfm-runtime restricted-containers' 'tfm-runtime authorized-image-repository' 'tfm-results require-results' 'tfm-provenance require-provenance'; do
    read -r policy rule <<< "$entry"
    if rejection=$(admission_single_reason "$log" "$policy" "$rule"); then
      reason=${rejection#*$'\t'}
      if [[ "$reason" == 'validation failure: '* || "$reason" == *'RESULTS_POLICY_VERSION'* || "$reason" == *'PROVENANCE_REPOSITORY'* ]]; then
        classification=POLICY_REJECTED
        break
      fi
    fi
  done
  jq -n --arg status "$classification" --arg policy "${policy:-}" --arg rule "${rule:-}" --arg reason "${reason:-}" --argjson exitStatus "$status" \
    '{status:$status,exitStatus:$exitStatus,diagnostic:$reason,policy:(if $status=="POLICY_REJECTED" then $policy else null end),rule:(if $status=="POLICY_REJECTED" then $rule else null end)}' > "$output"
}
