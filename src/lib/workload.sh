#!/usr/bin/env bash
# Ordinary workload observations; definitions only.

workload_deploy() {
  if [[ "${execution_profile:-laboratory}" == delivery-v1 || "${execution_profile:-laboratory}" == consumer-v1 ]]; then
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
  node "${engine_root:-$root/../src}/check-image-rollout.mjs" --same-image "$image" "$state_dir/deployment.json" "$state_dir/pods.json" "$ns" > "$state_dir/deployed-image.json"
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
  if [[ "${execution_profile:-}" == consumer-v1 ]]; then
    curl -fsS "http://127.0.0.1:$port/" > "$state_dir/consumer-response.json"
    node "$contract" consumer-response "$state_dir/$ns-health.json" "$state_dir/$ns-version.json" "$state_dir/consumer-response.json" "$commit" "${consumer_profile:-node-http-consumer/v1}"
  else
  curl -fsS -H 'Content-Type: application/json' -d '{"insuredAmountCents":100000,"coverage":"basic"}' "http://127.0.0.1:$port/quotes" > "$state_dir/$ns-quote.json"
  node "$contract" response "$state_dir/$ns-health.json" "$state_dir/$ns-quote.json" "$state_dir/$ns-version.json" "$commit"
  fi
  kill "$port_pid"; wait "$port_pid" 2>/dev/null || true; port_pid=''
}
