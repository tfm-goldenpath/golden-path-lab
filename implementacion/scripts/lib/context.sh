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
  if [[ "${1:-laboratory}" == delivery-v1 ]]; then capture_delivery_source; return; fi
  [[ "${1:-laboratory}" == laboratory ]] || fail 'Unknown source selection.'
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

# Separate fresh-only P03 context. No laboratory/measurement state is accepted.
create_delivery_state() {
  repository_root=$(git -C "$root" rev-parse --show-toplevel)
  [[ "$root" == "$repository_root/implementacion" ]] || fail 'Unexpected implementation root.'
  mkdir -p "$root/evidence/raw" "$root/evidence/packages" "$root/.tmp"
  state_dir=$(mktemp -d "$root/evidence/raw/delivery-XXXXXXXX")
  private=$(mktemp -d "$root/.tmp/private-XXXXXXXX")
  chmod 700 "$private"
  id=$(basename "$state_dir" | tr '[:upper:]' '[:lower:]')
  cluster="tfm-$id"; registry="tfm-zot-$id"; builder="tfm-build-$id"
  jq -n --arg profile delivery-v1 --arg mode "$mode" --arg private "$private" --arg cluster "$cluster" --arg registry "$registry" --arg builder "$builder" \
    '{profile:$profile,mode:$mode,private:$private,cluster:$cluster,registry:$registry,builder:$builder,ownedContainers:{}}' > "$state_dir/state.json"
  export DOCKER_CONFIG="$private/docker"; mkdir -p "$DOCKER_CONFIG"
  node "$contract" delivery-init "$state_dir"
}

load_delivery_state() {
  [[ "$1" == /* ]] || fail 'Cleanup requires an absolute delivery directory.'
  state_dir=$(realpath -e -- "$1")
  [[ "$(dirname "$state_dir")" == "$root/evidence/raw" && "$(basename "$state_dir")" =~ ^delivery-[A-Za-z0-9]+$ && -f "$state_dir/state.json" && ! -L "$state_dir/state.json" ]] || fail 'Not an owned delivery directory.'
  [[ "$(get profile)" == delivery-v1 && "$(get mode)" == local ]] || fail 'Not a local legitimate delivery.'
  id=$(basename "$state_dir" | tr '[:upper:]' '[:lower:]')
  private=$(get private); cluster=$(get cluster); registry=$(get registry); builder=$(get builder)
  [[ "$cluster" == "tfm-$id" && "$registry" == "tfm-zot-$id" && "$builder" == "tfm-build-$id" ]] || fail 'Delivery resource identity mismatch.'
  [[ "$(realpath -m "$private")" == "$private" && "$(dirname "$private")" == "$root/.tmp" && "$(basename "$private")" =~ ^private-[A-Za-z0-9]+$ ]] || fail 'Invalid private recovery directory.'
  jq -e --arg node "$cluster-control-plane" --arg registry "$registry" --arg builder "buildx_buildkit_${builder}0" \
    '.ownedContainers | type=="object" and all(to_entries[]; (.key==$node or .key==$registry or .key==$builder) and (.value|test("^[a-f0-9]{64}$")))' "$state_dir/state.json" >/dev/null
  jq -e --arg builder "buildx_buildkit_${builder}0_state" '.ownedVolumes // {} | type=="object" and all(to_entries[]; (.key==$builder or (.key|test("^[a-f0-9]{64}$"))) and .value.Name==.key)' "$state_dir/state.json" >/dev/null
  export DOCKER_CONFIG="$private/docker"
}

capture_delivery_source() {
  repository_root=$(git -C "$root" rev-parse --show-toplevel)
  git -C "$repository_root" diff --quiet HEAD -- . || fail 'Commit tracked changes before a legitimate delivery.'
  commit=$(git -C "$root" rev-parse HEAD)
  repository=${GP_SOURCE_REPOSITORY:-https://github.com/tfm-goldenpath/golden-path-lab}
  [[ "$repository" =~ ^https://[A-Za-z0-9.-]+/[A-Za-z0-9_./-]+$ && "$commit" =~ ^[a-f0-9]{40}$ ]] || fail 'Invalid source identity.'
  node "$root/scripts/delivery-source.mjs" "$root" > "$state_dir/source-inputs.json"
  put sourceRepository "$repository"; put sourceCommit "$commit"
  put sourceSnapshot "$(jq -er .sha256 "$state_dir/source-inputs.json")"
  put identity local-development-key
  delivery_producer=implementacion/scripts/deliver.sh
  put producer "$delivery_producer"
  jq -n --arg repositoryRoot "$repository_root" --arg implementationRoot "$root" --arg stateDirectory "$state_dir" \
    --arg repository "$repository" --arg commit "$commit" --arg snapshot "$(get sourceSnapshot)" \
    --arg base "$SERVICE_NODE_IMAGE" --arg database "${GP_VULNERABILITY_DB:-publisher-download}" \
    '{schema:"legitimate-delivery/v1",profile:"delivery-v1",mode:"local",repositoryRoot:$repositoryRoot,implementationRoot:$implementationRoot,
      service:"quotes-node",buildContext:"services/quotes-node",stateDirectory:$stateDirectory,
      namespace:"tfm-golden",actor:"system:serviceaccount:tfm-golden:deployer",producer:"implementacion/scripts/deliver.sh",
      source:{repository:$repository,commit:$commit,snapshot:$snapshot},nodeImage:$base,
      trust:{identity:"local-development-key",publicKey:"development-public-key.pem"},databaseInput:$database,
      cleanupOwner:"deliver.sh",resume:false}' > "$state_dir/delivery-config.json"
  put configurationSha256 "$(sha256sum "$state_dir/delivery-config.json" | cut -d ' ' -f 1)"
}

delivery_source_recheck() {
  [[ "$(git -C "$root" rev-parse HEAD)" == "$(get sourceCommit)" ]] || fail 'Source revision changed.'
  node "$root/scripts/delivery-source.mjs" "$root" "$(get sourceSnapshot)" > /dev/null
  [[ "$(sha256sum "$state_dir/delivery-config.json" | cut -d ' ' -f 1)" == "$(get configurationSha256)" ]] || fail 'Delivery configuration changed.'
}

delivery_step() {
  local step=$1; shift
  node "$contract" delivery-step "$state_dir" "$step" RUNNING
  "$@"
  node "$contract" delivery-step "$state_dir" "$step" PASS
}

delivery_result() { node "$contract" delivery-result "$state_dir" "$1" "$2"; }

delivery_package() {
  local marker="$state_dir/.evidence-packaged" status
  [[ ! -L "$marker" ]] || return 1
  if [[ -f "$marker" ]]; then return 0; fi
  [[ ! -e "$marker" ]] || return 1
  status=$(jq -er .status "$state_dir/result.json") || return
  python3 "$root/scripts/package-evidence.py" "$state_dir" "$root/evidence/packages" "$status" delivery-v1 || return
  touch "$marker"
}
