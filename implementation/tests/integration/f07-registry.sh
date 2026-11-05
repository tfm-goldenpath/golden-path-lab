#!/usr/bin/env bash
# Registry protocol proof using explicitly synthetic unit fixtures. No delivery
# authorization, signature authentication, Kubernetes or campaign claim.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"
docker info >/dev/null
mkdir -p evidence/raw .tmp
state_dir=$(mktemp -d "$root/evidence/raw/run-XXXXXXXX")
probe_private=$(mktemp -d "$root/.tmp/private-XXXXXXXX")
run=$(basename "$state_dir")
registry="tfm-zot-${run,,}"
cleanup_probe() {
  local status=$?
  trap - EXIT
  docker logs "$registry" > "$state_dir/registry.log" 2>&1 || true
  docker rm -f "$registry" >/dev/null 2>&1 || true
  rm -f "$probe_private/zot.json"
  rmdir "$probe_private"
  printf 'F07 registry protocol proof status=%s evidence=%s\n' "$status" "$state_dir"
  exit "$status"
}
trap cleanup_probe EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf '{"distSpecVersion":"1.1.1","storage":{"rootDirectory":"/var/lib/registry"},"http":{"address":"0.0.0.0","port":"5000"},"log":{"level":"warn"}}\n' > "$probe_private/zot.json"
docker create --name "$registry" --label "tfm.lab=tfm-demo-${run,,}" "$(jq -r '.images.zot.reference' tools.lock.json)" serve /etc/zot/config.json >/dev/null
docker cp "$probe_private/zot.json" "$registry:/etc/zot/config.json"
docker start "$registry" >/dev/null
host="$(docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' "$registry"):5000"
for attempt in {1..60}; do
  if curl -fsS --max-time 2 "http://$host/v2/" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS --max-time 2 "http://$host/v2/" >/dev/null
node tests/helpers/f07-registry-proof.mjs "$state_dir" "$host" > "$state_dir/protocol.log" 2>&1
