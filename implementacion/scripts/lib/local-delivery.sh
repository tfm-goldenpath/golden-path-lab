#!/usr/bin/env bash
# P03 local environment adapter. Uses kind/zot/buildx operations in lab.sh.
# Function definitions only; the coordinator owns the EXIT trap.

environment_check() {
  local active
  lab_check_environment
  bash "$root/scripts/check-environment.sh" --delivery
  environment_capacity before-infrastructure
  active=$(docker ps -q --filter label=io.x-k8s.kind.cluster)
  [[ -z "$active" ]] || fail 'Another kind laboratory is active on this Docker endpoint; preserve it and resolve ownership before starting.'
}

environment_capacity() {
  local checkpoint=$1 docker_root
  [[ ! -f "$state_dir/.evidence-packaged" || "$checkpoint" != after-cleanup ]] || return 0
  docker_root=$(docker info --format '{{.DockerRootDir}}') || return
  { nproc || return; free -h || return; df -h "$root" /tmp "$docker_root" || return; df -i "$root" /tmp "$docker_root" || return; docker system df || return; } > "$state_dir/storage-$checkpoint.log"
  # Cold-start planning allowance, not a universal guarantee. Evidence needs a
  # separate 512 MiB allowance in addition to the 3 GiB reserve.
  python3 - "$root" "$docker_root" "$checkpoint" "${GP_VULNERABILITY_SNAPSHOT_ROOT:-$root/.tmp}" "${TRIVY_CACHE_DIR:-$root/.tmp}" <<'PY'
import shutil, sys
from pathlib import Path
for path, growth in ((sys.argv[1], 0.5), (sys.argv[2], 5 if sys.argv[3]=='before-infrastructure' else 0),
                     (sys.argv[4], 2 if sys.argv[3] in ('before-infrastructure','after-build') else 0),
                     (sys.argv[5], 2 if sys.argv[3] in ('before-infrastructure','after-build') else 0)):
    path=Path(path)
    while not path.exists(): path=path.parent
    free=shutil.disk_usage(path).free
    if free < (3+growth)*1024**3:
        raise SystemExit('Insufficient capacity at '+path+': preserve 3 GiB plus planned growth; see storage log')
PY
}

# Called immediately after creation by the existing environment operations.
# Record immutable container IDs; cleanup will not rely on similar names.
environment_record_container() {
  local name=$1 container_id mounts
  [[ "$name" == "$registry" || "$name" == "$cluster-control-plane" || "$name" == "buildx_buildkit_${builder}0" ]] || fail 'Unexpected created resource.'
  container_id=$(docker inspect --format '{{.Id}}' "$name")
  [[ "$container_id" =~ ^[a-f0-9]{64}$ ]] || fail 'Invalid owned container identity.'
  jq --arg name "$name" --arg id "$container_id" '.ownedContainers[$name]=$id' "$state_dir/state.json" > "$state_dir/state.next"
  mv "$state_dir/state.next" "$state_dir/state.json"
  # Retain exact volume metadata while it is attached to its creating container.
  mounts=$(docker inspect --format '{{json .Mounts}}' "$container_id")
  local volume metadata
  while IFS= read -r volume; do
    metadata=$(docker volume inspect "$volume")
    jq --arg name "$volume" --argjson metadata "$metadata" '.ownedVolumes[$name]=$metadata[0]' "$state_dir/state.json" > "$state_dir/state.next"
    mv "$state_dir/state.next" "$state_dir/state.json"
  done < <(jq -r '.[] | select(.Type=="volume") | .Name' <<< "$mounts")
}

environment_create() {
  local name existing status=0
  existing=$(docker volume ls -q --filter "name=^buildx_buildkit_${builder}0_state$")
  [[ -z "$existing" ]] || fail 'Builder state already exists.'
  for name in "$registry" "$cluster-control-plane" "buildx_buildkit_${builder}0"; do
    existing=$(docker ps -aq --filter "name=^/$name$")
    [[ -z "$existing" ]] || fail 'Requested resource already exists.'
  done
  lab_create
  docker buildx inspect "$builder" --bootstrap > "$state_dir/builder-bootstrap.log" 2>&1 || status=$?
  existing=$(docker ps -aq --filter "name=^/buildx_buildkit_${builder}0$")
  if [[ -n "$existing" ]]; then
    environment_record_container "buildx_buildkit_${builder}0"
  fi
  return "$status"
}

environment_namespaces() { lab_prepare_namespaces tfm-golden; }
environment_admission() { lab_install_admission authorized; }

environment_cleanup() {
  local code=0 name expected actual volume
  [[ -z "${port_pid:-}" ]] || { kill "$port_pid" 2>/dev/null || true; wait "$port_pid" 2>/dev/null || true; port_pid=''; }
  [[ -n "${state_dir:-}" && -f "$state_dir/state.json" ]] || return 0
  [[ ! -L "$state_dir/.resources-retired" && ! -L "$state_dir/.diagnostics-retained" ]] || return 1
  [[ ! -f "$state_dir/.resources-retired" ]] || return 0
  [[ ! -L "$state_dir/state.json" ]] || return 1
  jq -e --arg registry "$registry" --arg node "${cluster:-}-control-plane" --arg builder "buildx_buildkit_${builder:-}0" '
    (.ownedContainers | type=="object" and all(to_entries[];
      (.key==$registry or .key==$node or .key==$builder) and (.value|test("^[a-f0-9]{64}$")))) and
    (.ownedVolumes // {} | type=="object" and all(to_entries[];
      (.key==($builder+"_state") or (.key|test("^[a-f0-9]{64}$"))) and .value.Name==.key))
  ' "$state_dir/state.json" >/dev/null || return 1
  # Retain private recovery material. Do not delete keys/kubeconfigs on failure.
  if [[ ! -f "$state_dir/.diagnostics-retained" ]]; then
    if [[ -f "$private/kubeconfig" ]]; then
      environment_diagnostic "$state_dir/cluster-pods.txt" k get pods -A -o wide || code=1
      environment_diagnostic "$state_dir/cluster-events.txt" k get events -A --sort-by=.lastTimestamp || code=1
      if [[ ! -f "$state_dir/admission-failure-pods.json" ]]; then lab_capture_admission_diagnostics || code=1; fi
    fi
    environment_diagnostic "$state_dir/registry.log" docker logs --tail 100 "$registry" || code=1
    if [[ "$code" == 0 ]]; then touch "$state_dir/.diagnostics-retained" || code=1; fi
  fi
  # No broad kind/buildx deletion: remove only containers with captured IDs.
  while IFS=$'\t' read -r name expected; do
    if ! actual=$(docker inspect --format '{{.Id}}' "$name" 2>/dev/null); then
      # Distinguish confirmed absence from daemon/transport failure.
      local remaining
      remaining=$(docker ps -aq --filter "name=^/$name$") || { code=1; continue; }
      [[ -z "$remaining" ]] || code=1
      continue
    fi
    if [[ "$actual" != "$expected" ]]; then
      printf 'ERROR: resource identity changed: %s\n' "$name" >&2; code=1; continue
    fi
    docker rm -f "$expected" > "$state_dir/cleanup-$name.log" 2>&1 || code=1
  done < <(jq -r '.ownedContainers // {} | to_entries[] | [.key,.value] | @tsv' "$state_dir/state.json")
  while IFS= read -r volume; do
    local metadata users
    if ! metadata=$(docker volume inspect "$volume" 2>/dev/null); then
      local remaining
      remaining=$(docker volume ls -q --filter "name=^$volume$") || { code=1; continue; }
      [[ -z "$remaining" ]] || code=1
      continue
    fi
    if ! jq -e --arg name "$volume" --argjson metadata "$metadata" '.ownedVolumes[$name]==$metadata[0]' "$state_dir/state.json" >/dev/null; then
      printf 'ERROR: volume identity changed: %s\n' "$volume" >&2; code=1; continue
    fi
    users=$(docker ps -aq --filter "volume=$volume") || { code=1; continue; }
    [[ -z "$users" ]] || { printf 'ERROR: volume still has consumers: %s\n' "$volume" >&2; code=1; continue; }
    docker volume rm "$volume" > "$state_dir/cleanup-volume-$volume.log" 2>&1 || code=1
  done < <(jq -r '.ownedVolumes // {} | keys[]' "$state_dir/state.json")
  if [[ "$code" == 0 ]]; then
    touch "$state_dir/.resources-retired" || code=1
  fi
  return "$code"
}

# Preserve each first diagnostic even if another diagnostic failed.
environment_diagnostic() {
  [[ ! -L "$1" ]] || return 1
  if [[ -f "$1" ]]; then return 0; fi
  capture_diagnostic "$@"
}
