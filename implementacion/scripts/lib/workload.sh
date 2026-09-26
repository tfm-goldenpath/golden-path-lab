#!/usr/bin/env bash
# Workload deployment and HTTP checks.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

probe() {
  local ns=$1 attempt
  k -n "$ns" rollout status deployment/quotes-node --timeout=300s
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
