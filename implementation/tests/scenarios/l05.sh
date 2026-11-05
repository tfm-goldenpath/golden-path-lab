#!/usr/bin/env bash
# Explicit source authorization precedes both deliveries. No checkout mutation.
scenario_l05_prepare() {
  if [[ -z "${GP_L05_FROM_COMMIT:-}" && -z "${GP_L05_TO_COMMIT:-}" ]]; then return; fi
  [[ "$mode" == local && "$phase" == run ]] || fail 'L05 commit selection is supported only in a complete local run.'
  [[ -n "${GP_L05_FROM_COMMIT:-}" && -n "${GP_L05_TO_COMMIT:-}" ]] || fail 'Supply both immutable L05 commit IDs.'
  node scripts/l05-source.mjs "$root/.." "$GP_L05_FROM_COMMIT" "$GP_L05_TO_COMMIT" "$private/L05-source" > "$state_dir/L05-source-authorization.json"
}

scenario_l05() (
  trap 'code=$?; trap - EXIT; if [[ -n "${port_pid:-}" ]]; then kill "$port_pid" 2>/dev/null || true; wait "$port_pid" 2>/dev/null || true; fi; exit "$code"' EXIT
  local parent_state="$state_dir" previous_image revision source name file
  if [[ "$mode" != local || ! -f "$parent_state/L05-source-authorization.json" ]]; then
    jq -n '{scenario:"L05",status:"NOT_EXECUTED",reason:"Requires an explicit local immutable commit pair, or two separate authorized hosted runs"}' > "$parent_state/L05-result.json"
    exit 0
  fi
  # L01 ran in a subshell: the parent's image still identifies the initial delivery.
  previous_image=$(jq -er 'select(.scenario == "L04" and .status == "PASS" and .functionality == "healthy" and .image == .toImage) | .toImage | select(type == "string" and test("^[^@]+@sha256:[a-f0-9]{64}$"))' "$parent_state/L04-result.json")
  for name in from to; do
    state_dir="$parent_state/L05-$name"
    mkdir "$state_dir"
    cp "$parent_state/state.json" "$state_dir/state.json"
    cp "$parent_state/database-identity.json" "$state_dir/database-identity.json"
    revision=$(jq -er --arg name "$name" '.[$name].commit' "$parent_state/L05-source-authorization.json")
    source=$(jq -er --arg name "$name" '.[$name].directory' "$parent_state/L05-source-authorization.json")
    [[ "$source" == "$private/L05-source/$name" && -d "$source" && ! -L "$source" ]] || fail 'L05 source export is outside owned private storage.'
    put controlSnapshot "$(jq -er .sourceSnapshot "$parent_state/state.json")"
    put sourceCommit "$revision"
    put sourceSnapshot "$(jq -er --arg name "$name" '.[$name].snapshotSha256' "$parent_state/L05-source-authorization.json")"
    commit="$revision"; id="$(basename "$parent_state" | tr '[:upper:]' '[:lower:]')-l05-$name"
    # Current delivery-control checks and fresh tests of this revision's source.
    delivery_preflight
    node --test "$source"/test/*.test.js > "$state_dir/source-unit-tests.log" 2>&1
    cat "$state_dir/source-unit-tests.log" >> "$state_dir/unit-tests.log"
    delivery_build "$source" "" "$parent_state/L05-source-authorization.json" "$name"
    load_delivery_context
    [[ "$image" != "$previous_image" ]] || fail 'L05 requires distinct delivered image digests.'
    delivery_render_manifests
    delivery_check_manifest
    delivery_analyze
    attestations_verify_delivery
    attestations_authorize_results
    # Authorize exactly this trusted revision before requesting admission.
    lab_apply_admission_policies
    k get clusterpolicies -o json > "$state_dir/policies-installed.json"
    actor tfm-golden apply -f "$state_dir/tfm-golden.json" > "$state_dir/admission.log" 2>&1
    probe tfm-golden
    cmp "$parent_state/tfm-reference-quote.json" "$state_dir/tfm-golden-quote.json"
    k -n tfm-golden get deployment quotes-node -o json > "$state_dir/deployment.json"
    k -n tfm-golden get pods -l app=quotes-node -o json > "$state_dir/pods.json"
    node scripts/check-image-rollout.mjs "$previous_image" "$image" "$state_dir/deployment.json" "$state_dir/pods.json" > "$state_dir/rollout.json"
    jq -n --arg commit "$commit" --arg image "$image" --arg name "$name" '{scenario:"L05",execution:$name,commit:$commit,image:$image,status:"ACCEPTED_AND_HEALTHY",freshEvidence:true}' > "$state_dir/result.json"
    previous_image="$image"
  done
  jq -n --slurpfile from "$parent_state/L05-from/result.json" --slurpfile to "$parent_state/L05-to/result.json" \
    '{scenario:"L05",status:"ACCEPTED_TWO_SOURCE_REVISIONS",from:$from[0],to:$to[0],measurement:"functional-integration-only"}' > "$parent_state/L05-result.json"
)
