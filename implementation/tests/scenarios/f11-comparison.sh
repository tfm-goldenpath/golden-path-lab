# F11 comparison operations, sourced by the defense adapter in initialized local context.
comparison_inputs() {
  mkdir -p "$state_dir/comparison" "$state_dir/runtime/F11" "$state_dir/runtime/L06"
  jq '.spec.template.spec.containers[0].securityContext |= (.privileged=true | .allowPrivilegeEscalation=true)' "$state_dir/tfm-golden.json" > "$state_dir/F11-privileged.json"
  jq '.metadata.namespace="tfm-reference"' "$state_dir/F11-privileged.json" > "$state_dir/comparison/reference.json"
  jq -n '{identityChanges:[{path:"/metadata/namespace",from:"tfm-golden",to:"tfm-reference"}],faultChanges:[{path:"/spec/template/spec/containers/0/securityContext/privileged",from:false,to:true},{path:"/spec/template/spec/containers/0/securityContext/allowPrivilegeEscalation",from:false,to:true}],scope:"F11 Deployment UPDATE only; L06 template UPDATE only; both partial"}' > "$state_dir/comparison/diff.json"
  # Preload the existing authorized digest without another build or scan.
  # Both prepared workloads already pulled and ran this digest. Inspect node cache.
  docker exec "$cluster-control-plane" crictl images --digests -o json > "$state_dir/comparison/node-images.json"
  jq -e --arg image "$image" 'any(.images[]; any(.repoDigests[]?; .==$image))' "$state_dir/comparison/node-images.json" > "$state_dir/comparison/node-image-check.json"
  attestations_ci_gate comparison-authorized authorized
  probe tfm-golden
  cp "$state_dir/tfm-golden-quote.json" "$state_dir/runtime/L06/create-quote.json"
}

comparison_reference_cleanup() {
  local folder="$state_dir/comparison/reference"
  # tfm-reference and quotes-node were created by this run; confirm observed UID
  # before deleting the altered workload. Do not delete evidence or private state.
  k -n tfm-reference get deployment quotes-node -o json > "$folder/cleanup-before.json" || return $?
  jq -e --slurpfile before "$folder/before.json" --arg image "$image" '.metadata.uid==$before[0].metadata.uid and .metadata.namespace=="tfm-reference" and .spec.template.spec.containers[0].image==$image' "$folder/cleanup-before.json" > "$folder/cleanup-owner.json" || return $?
  k -n tfm-reference delete deployment quotes-node --wait=true --timeout=60s > "$folder/cleanup.log" 2>&1 || return $?
  k -n tfm-reference wait --for=delete pods -l app=quotes-node --timeout=60s > "$folder/cleanup-pods.log" 2>&1 || return $?
  local code=0
  k -n tfm-reference get deployment quotes-node -o json > "$folder/cleaned.json" 2> "$folder/cleaned.log" || code=$?
  node tests/scenarios/runtime-evidence.mjs absent "$code" "$folder/cleaned.log" Deployment quotes-node > "$folder/cleaned-check.json"
}

comparison_reference() (
  local folder="$state_dir/comparison/reference"
  mkdir "$folder"
  k get namespace tfm-reference -o json > "$folder/namespace.json"
  k -n tfm-reference get deployment quotes-node -o json > "$folder/before.json"
  # The reference namespace belongs exclusively to this session's kind cluster.
  jq --arg owner "$session" 'del(.status,.metadata.managedFields) |
    .metadata.labels["tfm.goldenpath/comparison"]=$owner |
    .spec.template.metadata.labels["tfm.goldenpath/comparison"]=$owner |
    .spec.template.spec.containers[0].securityContext |= (.privileged=true | .allowPrivilegeEscalation=true)' "$folder/before.json" > "$folder/request.json"
  node tests/scenarios/runtime-evidence.mjs privilege-diff "$folder/before.json" "$folder/request.json" "$session" > "$folder/diff.json"
  # Always withdraw the altered workload, including after a failed observation.
  trap 'comparison_code=$?; trap - EXIT; set +e; if [[ -n "${port_pid:-}" ]]; then kill "$port_pid" 2>/dev/null; wait "$port_pid" 2>/dev/null; fi; comparison_reference_cleanup; cleanup_code=$?; if (( comparison_code == 0 )); then comparison_code=$cleanup_code; fi; exit "$comparison_code"' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  actor tfm-reference replace -f "$folder/request.json" > "$folder/response.log" 2>&1
  probe tfm-reference > "$folder/probe.log" 2>&1
  k -n tfm-reference get deployment quotes-node -o json > "$folder/deployment.json"
  k -n tfm-reference get pods -l app=quotes-node -o json > "$folder/pods.json"
  node scripts/check-image-rollout.mjs --same-image "$image" "$folder/deployment.json" "$folder/pods.json" tfm-reference > "$folder/rollout.json"
  jq -e '[.items[] | select(.metadata.deletionTimestamp==null)] | length>0 and all(.[]; .spec.containers[0].securityContext.privileged==true and .spec.containers[0].securityContext.allowPrivilegeEscalation==true)' "$folder/pods.json" > "$folder/privileges.json"
  for file in health version quote; do cp "$state_dir/tfm-reference-$file.json" "$folder/$file.json"; done
  cmp "$state_dir/runtime/L06/create-quote.json" "$folder/quote.json"
)

comparison_admission() {
  scenario_runtime_negative F11 Deployment UPDATE directed
  probe tfm-golden
  resource_snapshot comparison
  cmp "$state_dir/prepared-policy-identity.json" "$state_dir/comparison-policy-identity.json"
}

comparison_legitimate() {
  scenario_l06_update "$state_dir/runtime/L06" "$session-l06"
  resource_snapshot comparison-final
  cmp "$state_dir/prepared-policy-identity.json" "$state_dir/comparison-final-policy-identity.json"
  jq -n --arg image "$image" '{image:$image,F11:"Deployment UPDATE rejection only; partial",L06:"Legitimate template UPDATE, generation, rollout, Pods and HTTP; partial",lane:"A",humanReview:"pending"}' > "$state_dir/comparison/scope.json"
}
