#!/usr/bin/env bash
# Run context, persisted state and source identity.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null || fail "Missing $1; rebuild the devcontainer or install the tools."; }
get() { jq -er --arg key "$1" '.[$key]' "$state_dir/state.json"; }
put() { jq --arg key "$1" --arg value "$2" '.[$key]=$value' "$state_dir/state.json" > "$state_dir/state.next"; mv "$state_dir/state.next" "$state_dir/state.json"; }
record() { printf '\n== %s ==\n' "$1"; }
load_state() {
  [[ -n "${GP_STATE_DIR:-}" ]] || fail 'GP_STATE_DIR is required to resume or clean up.'
  state_dir=$(realpath -- "$GP_STATE_DIR")
  [[ "$(dirname "$state_dir")" == "$root/evidence/raw" && "$(basename "$state_dir")" =~ ^run-[A-Za-z0-9]+$ && -f "$state_dir/state.json" ]] || fail 'State is outside the lab.'
  [[ "$(get mode)" == "$mode" ]] || fail 'Mode does not match the saved state.'
  private=$(get private); cluster=$(get cluster); registry=$(get registry); builder=$(get builder)
  private=$(realpath -m -- "$private")
  [[ "$(dirname "$private")" == "$root/.tmp" && "$(basename "$private")" =~ ^private-[A-Za-z0-9]+$ && "$cluster" =~ ^tfm-demo-run-[a-z0-9]+$ && "$registry" =~ ^tfm-zot-run-[a-z0-9]+$ && "$builder" =~ ^tfm-build-run-[a-z0-9]+$ ]] || fail 'Invalid state resources.'
  export DOCKER_CONFIG="$private/docker"
}
context_init() {
  lock="$root/tools.lock.json"
  contract="$root/scripts/lab-contracts.mjs"
  results_type=https://tfm-goldenpath.dev/attestations/verification-results/v1
  state_dir=''; private=''; cluster=''; registry=''; builder=''; port_pid=''
  preserve=0
}

create_state() {
  mkdir -p "$root/evidence/raw" "$root/evidence/packages" "$root/.tmp"
  state_dir=$(mktemp -d "$root/evidence/raw/run-XXXXXXXX")
  private=$(mktemp -d "$root/.tmp/private-XXXXXXXX")
  chmod 700 "$private"
  id=$(basename "$state_dir" | tr '[:upper:]' '[:lower:]')
  cluster="tfm-demo-$id"; registry="tfm-zot-$id"; builder="tfm-build-$id"
  jq -n --arg mode "$mode" --arg private "$private" --arg cluster "$cluster" --arg registry "$registry" --arg builder "$builder" \
    '{mode:$mode,private:$private,cluster:$cluster,registry:$registry,builder:$builder}' > "$state_dir/state.json"
  [[ -z "${GITHUB_OUTPUT:-}" ]] || printf 'state_dir=%s\n' "$state_dir" >> "$GITHUB_OUTPUT"
  export DOCKER_CONFIG="$private/docker"; mkdir -p "$DOCKER_CONFIG"
  [[ -z "${GITHUB_OUTPUT:-}" ]] || printf 'docker_config=%s\n' "$DOCKER_CONFIG" >> "$GITHUB_OUTPUT"
}

capture_source_context() {
  local snapshot
  commit=$(git -C "$root" rev-parse HEAD 2>/dev/null || printf '%040d' 0)
  repository=${GP_SOURCE_REPOSITORY:-https://example.invalid/tfm/local}
  snapshot=$(find services/quotes-node policies scripts tests schemas tooling/package.json tooling/package-lock.json versions.env tools.lock.json ../.github/workflows -type f ! -path '*/__pycache__/*' ! -path '*/node_modules/*' ! -path '*/.tools/*' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d ' ' -f 1)
  if [[ "$mode" == github ]]; then
    [[ "${GITHUB_ACTIONS:-}" == true && "${GITHUB_EVENT_NAME:-}" == workflow_dispatch && -n "${GH_TOKEN:-}" ]] || fail 'Lane B requires a real workflow_dispatch run with the GitHub token.'
    repository="https://github.com/$GITHUB_REPOSITORY"; commit=$GITHUB_SHA
    put identity "https://github.com/$GITHUB_WORKFLOW_REF"
    printf '%s' "$GH_TOKEN" | docker login ghcr.io --username "$GITHUB_ACTOR" --password-stdin >/dev/null
    image_repo="ghcr.io/${GITHUB_REPOSITORY,,}-quotes-node"
  else
    put identity local-development-key
  fi
  [[ "$commit" =~ ^[a-f0-9]{40}$ ]] || fail 'Invalid commit.'
  put sourceRepository "$repository"; put sourceCommit "$commit"; put sourceSnapshot "$snapshot"
}

load_delivery_context() {
  image_repo=$(get imageRepository); digest=$(get digest); image="$image_repo@$digest"
  repository=$(get sourceRepository); commit=$(get sourceCommit)
}
