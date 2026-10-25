#!/usr/bin/env bash
# Workload deployment and HTTP checks.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

workload_deploy() {
  if [[ "${execution_profile:-laboratory}" == delivery-v1 ]]; then
    local status=0
    actor tfm-golden apply -f "$state_dir/tfm-golden.json" > "${1:-$state_dir/admission.log}" 2>&1 || status=$?
    if [[ "$status" != 0 ]]; then admission_record_failure "${1:-$state_dir/admission.log}" "$state_dir/admission-failure.json" "$status"; fi
    return "$status"
  fi
  actor tfm-golden apply -f "$state_dir/tfm-golden.json" | tee "${1:-$state_dir/admission.log}"
}
workload_rollout() {
  k -n "$1" rollout status deployment/quotes-node --timeout=300s
}
workload_image() {
  local ns=$1
  k -n "$ns" get deployment quotes-node -o json > "$state_dir/deployment.json"
  k -n "$ns" get pods -l app=quotes-node -o json > "$state_dir/pods.json"
  node "$root/scripts/check-image-rollout.mjs" --same-image "$image" "$state_dir/deployment.json" "$state_dir/pods.json" "$ns" > "$state_dir/deployed-image.json"
}

probe() {
  workload_rollout "$1"
  workload_http "$1"
}

workload_http() {
  local ns=$1 attempt
  : > "$state_dir/$ns-port.log"
  kubectl --kubeconfig "$private/kubeconfig" --context "kind-$cluster" -n "$ns" \
    port-forward deployment/quotes-node :3000 > "$state_dir/$ns-port.log" 2>&1 & port_pid=$!
  local port=''
  for attempt in {1..30}; do
    port=$(sed -n 's/.*127.0.0.1:\([0-9]*\) -> 3000.*/\1/p' "$state_dir/$ns-port.log" | head -1)
    [[ -z "$port" ]] || break
    kill -0 "$port_pid" 2>/dev/null || fail 'Port forwarding stopped before becoming ready.'
    sleep 1
  done
  [[ -n "$port" ]] || fail 'Could not obtain a port to test the service.'
  curl -fsS "http://127.0.0.1:$port/healthz" > "$state_dir/$ns-health.json"
  curl -fsS "http://127.0.0.1:$port/version" > "$state_dir/$ns-version.json"
  curl -fsS -H 'Content-Type: application/json' -d '{"insuredAmountCents":100000,"coverage":"basic"}' "http://127.0.0.1:$port/quotes" > "$state_dir/$ns-quote.json"
  node "$contract" response "$state_dir/$ns-health.json" "$state_dir/$ns-quote.json" "$state_dir/$ns-version.json" "$commit"
  kill "$port_pid"; wait "$port_pid" 2>/dev/null || true; port_pid=''
}
workload_reference() {
  record 'Reference path R: deploy without requiring integrity evidence'
  actor tfm-reference apply -f "$state_dir/tfm-reference.json"
  probe tfm-reference
}

# Directed evidence trials need a fresh object. An unchanged apply can be local,
# and Kyverno can reuse verification from an UPDATE's old resource even when its
# registry cache is disabled. Keep these zero-replica Deployments off the service
# selector and submit all creates through the restricted actor.
workload_admission_prepare() {
  local directory=$1 scenario=$2 name
  [[ "$scenario" =~ ^F(05|06|08|09|10|13|14)$ ]] || return 1
  name="admission-${scenario,,}"
  jq -e --arg image "$image" '.kind=="Deployment" and .metadata.name=="quotes-node" and .metadata.namespace=="tfm-golden" and .spec.template.spec.containers[0].image==$image' "$state_dir/tfm-golden.json" >/dev/null || return
  jq --arg name "$name" --arg owner "$cluster" '
    .metadata={name:$name,namespace:"tfm-golden",labels:{"tfm.goldenpath/trial":$owner}} |
    .spec.replicas=0 |
    .spec.selector={matchLabels:{app:$name}} |
    .spec.template.metadata={labels:{app:$name}} |
    del(.status)' "$state_dir/tfm-golden.json" > "$directory/admission-request.json" || return
  jq -n --arg name "$name" --arg image "$image" '{operation:"CREATE",kind:"Deployment",namespace:"tfm-golden",name:$name,image:$image,replicas:0}' > "$directory/admission-operation.json" || return
  workload_admission_absent "$directory" before
}

workload_admission_absent() {
  local directory=$1 stage=$2 name code=0
  name=$(jq -er '.name' "$directory/admission-operation.json") || return
  if k -n tfm-golden get deployment "$name" -o json > "$directory/$stage-object.json" 2> "$directory/$stage-observation.log"; then
    printf 'Expected absent directed admission object: %s\n' "$name" >&2
    return 1
  else code=$?; fi
  [[ "$code" == 1 && "$(cat "$directory/$stage-observation.log")" == "Error from server (NotFound): deployments.apps \"$name\" not found" ]] || return 1
  jq -n '{status:"PASS",observation:"NotFound"}' > "$directory/$stage-absence.json"
}

workload_admission_cleanup() {
  local directory=$1 stage=$2 name code=0
  [[ -f "$directory/admission-operation.json" ]] || return 0
  # A completed cleanup is repeatable without replacing its first observations.
  [[ ! -f "$directory/$stage-cleanup.json" ]] || return 0
  name=$(jq -er '.name' "$directory/admission-operation.json") || return
  [[ "$name" =~ ^admission-f(05|06|08|09|10|13|14)$ ]] || return 1
  if k -n tfm-golden get deployment "$name" -o json > "$directory/$stage-object.json" 2> "$directory/$stage-observation.log"; then
    # Only an object absent at preparation and carrying this run's identity is owned.
    jq -e '.status=="PASS" and .observation=="NotFound"' "$directory/before-absence.json" >/dev/null || return
    jq -e --arg name "$name" --arg owner "$cluster" --arg image "$image" '
      .metadata.name==$name and .metadata.namespace=="tfm-golden" and
      .metadata.labels["tfm.goldenpath/trial"]==$owner and
      (.metadata.uid | type=="string" and length>0) and
      .spec.replicas==0 and .spec.selector.matchLabels.app==$name and
      .spec.template.metadata.labels.app==$name and .spec.template.spec.containers[0].image==$image
    ' "$directory/$stage-object.json" >/dev/null || return
    k -n tfm-golden delete deployment "$name" --wait=true --timeout=60s > "$directory/$stage-cleanup.log" 2>&1 || return
    workload_admission_absent "$directory" "$stage-after-cleanup" || return
  else
    code=$?
    [[ "$code" == 1 && "$(cat "$directory/$stage-observation.log")" == "Error from server (NotFound): deployments.apps \"$name\" not found" ]] || return 1
  fi
  jq -n '{status:"PASS"}' > "$directory/$stage-cleanup.json"
}

workload_admission_recovery() {
  local directory=$1
  actor tfm-golden create -f "$directory/admission-request.json" -o json > "$directory/recovery-create.json" 2> "$directory/recovery-create.log" || return
  workload_admission_cleanup "$directory" recovery
}
