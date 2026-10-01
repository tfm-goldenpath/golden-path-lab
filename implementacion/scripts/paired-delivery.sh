#!/usr/bin/env bash
# One legitimate arm. No demo/scenario sequence is invoked.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
source versions.env
for module in context lab delivery attestations workload; do source "$root/scripts/lib/$module.sh"; done
source "$root/tests/scenarios/f13.sh" # strict preflight diagnostic classifier only
mode=github; phase=${1:?}; context_init
pair_dir=${PAIR_DIR:?}
clock() { python3 scripts/paired-rg.py mark "$state_dir/measurement.json" "$@"; }
step() {
  local name=$1; shift
  clock "$name" start
  "$@" > "$state_dir/$name.log" 2>&1
  clock "$name" end 0
}
on_exit() {
  local status=$? record_status=0
  trap - EXIT
  if [[ -n "${port_pid:-}" ]]; then
    kill "$port_pid" 2>/dev/null || { [[ "$status" != 0 ]] || status=1; }
    wait "$port_pid" 2>/dev/null || true
  fi
  if [[ -n "$state_dir" && -f "$state_dir/measurement.json" ]]; then
    python3 scripts/paired-rg.py interrupted "$state_dir/measurement.json" "$status" || record_status=$?
    if [[ "$status" == 0 && "$record_status" != 0 ]]; then status=$record_status; fi
  fi
  exit "$status"
}
trap on_exit EXIT
if [[ "$phase" == bootstrap ]]; then
  lab_check_environment
  create_state
  infra=$state_dir
  cp "$pair_dir/pair.json" "$state_dir/measurement-preparation.json"
  python3 scripts/paired-rg.py pointer "$pair_dir" infrastructure "$state_dir"
  capture_source_context
  # Separate repository from demonstration artifacts; R/G share this namespace.
  image_repo="${image_repo}-measurements"; put imageRepository "$image_repo"
  lab_create
  lab_prepare_namespaces
  repository=$(get sourceRepository); commit=$(get sourceCommit)
  put sbomVersion 1.6
  lab_install_admission prepared
  delivery_database_prepare
  python3 scripts/paired-rg.py freeze-db "$state_dir/database-identity.json"
  delivery_versions
  { npm --version; python3 --version; trivy --version; gh --version; uname -a; } >> "$state_dir/tool-versions.txt" 2>&1
  docker info --format '{{json .}}' | jq '{NCPU,MemTotal,ServerVersion,Driver,CgroupVersion,OSType,Architecture}' > "$state_dir/resources.json"
  k get nodes -o json > "$state_dir/nodes.json"
  warmup=$(jq -er .warmupSource "$pair_dir/pair.json")
  git diff "$warmup" "$commit" -- services/quotes-node/src > "$state_dir/application-change.txt"
  git rev-parse "$warmup:implementacion/services/quotes-node/src" "$commit:implementacion/services/quotes-node/src" > "$state_dir/application-trees.txt"
  mkdir "$private/warmup"
  git archive "$warmup:implementacion/services/quotes-node" | tar -x -C "$private/warmup"
  # Use the measured Dockerfile and pinned base for both cache preparations;
  # application/package bytes come from the immutable warmup revision.
  cp services/quotes-node/Dockerfile "$private/warmup/Dockerfile"
  shared_private=$private; shared_cluster=$cluster; shared_repo=$image_repo
  for arm in R G; do
    create_state
    empty_private=$private
    private=$shared_private; cluster=$shared_cluster; image_repo=$shared_repo
    rmdir "$empty_private/docker" "$empty_private"
    export DOCKER_CONFIG="$private/docker"
    put private "$private"; put cluster "$cluster"; put imageRepository "$image_repo"
    for key in sourceRepository sourceCommit sourceSnapshot identity vulnerabilityDatabase sbomVersion; do
      put "$key" "$(jq -er --arg key "$key" '.[$key]' "$infra/state.json")"
    done
    cp "$infra/database-identity.json" "$state_dir/database-identity.json"
    cp "$infra/application-change.txt" "$infra/application-trees.txt" "$state_dir/"
    cp "$infra/admission-policies.json" "$infra/resources.json" "$state_dir/"
    cp "$infra/versions.txt" "$infra/tools-lock.json" "$infra/tool-versions.txt" "$state_dir/"
    python3 scripts/paired-rg.py pointer "$pair_dir" "$arm" "$state_dir"
    cache="$private/cache-$arm"
    docker buildx create --name "$builder" --driver docker-container --driver-opt "image=$(jq -r '.images.buildkit.reference' "$lock")"
    docker buildx build --builder "$builder" --platform linux/amd64 --provenance=false --sbom=false \
      --build-arg "NODE_IMAGE=$SERVICE_NODE_IMAGE" --build-arg "BUILD_COMMIT=$warmup" \
      --cache-to "type=local,dest=$cache,mode=max" --output type=cacheonly --progress=plain \
      "$private/warmup" > "$state_dir/cache-warmup.log" 2>&1
    cp "$cache/index.json" "$state_dir/cache-index.json"
    put measurementCache "$cache"
    # Discard warm builder's internal state. Each measured build imports only
    # its own frozen local export; neither arm can inherit the other's build.
    docker buildx rm "$builder"
    docker buildx create --name "$builder" --driver docker-container --driver-opt "image=$(jq -r '.images.buildkit.reference' "$lock")"
    docker buildx inspect --bootstrap "$builder" > "$state_dir/builder-restored.log" 2>&1
    python3 scripts/paired-rg.py arm-init "$pair_dir" "$arm" "$state_dir"
  done
  exit 0
fi
load_state
export DOCKER_CONFIG="$private/docker"
repository=$(get sourceRepository); commit=$(get sourceCommit); image_repo=$(get imageRepository)
arm=${MEASUREMENT_ARM:?}
namespace=tfm-reference; [[ "$arm" != G ]] || namespace=tfm-golden
if [[ "$phase" == prepare ]]; then
  id="$(basename "$state_dir" | tr '[:upper:]' '[:lower:]')-measurement-${arm,,}"
  export DELIVERY_CACHE_FROM
  DELIVERY_CACHE_FROM=$(get measurementCache)
  python3 scripts/paired-rg.py begin "$state_dir/measurement.json"
  step service-tests delivery_service_tests
  if [[ "$arm" == G ]]; then step workflow-policy delivery_workflow_policy; fi
  step build delivery_build
  load_delivery_context
  python3 scripts/paired-rg.py bind-image "$state_dir/measurement.json"
  step manifest delivery_render_manifests
  if [[ "$arm" == G ]]; then
    step manifest-policy delivery_check_manifest
    step analysis delivery_analyze
    [[ "$(get sbomVersion)" == 1.6 ]] || fail 'Prepared SBOM contract differs from generated version.'
    clock native-provenance start
  fi
  printf 'image=%s\ndigest=%s\n' "$image_repo" "$digest" >> "$GITHUB_OUTPUT"
elif [[ "$phase" == finish ]]; then
  load_delivery_context
  if [[ "$arm" == G ]]; then
    clock native-provenance end "${NATIVE_EXIT_CODE:?}"
    [[ "$NATIVE_EXIT_CODE" == 0 ]] || exit "$NATIVE_EXIT_CODE"
    step verify-delivery attestations_verify_delivery
    step authorize-results attestations_authorize_results
  fi
  # Require actual absence. Retrieval failure never counts as absence.
  status=0
  k -n "$namespace" get deployment quotes-node -o json > "$state_dir/before-object.json" 2> "$state_dir/before-observation.log" || status=$?
  [[ "$status" == 1 && "$(cat "$state_dir/before-observation.log")" == 'Error from server (NotFound): deployments.apps "quotes-node" not found' ]] || fail 'Measured deployment is not demonstrably absent.'
  clock admission start
  status=0
  actor "$namespace" create -f "$state_dir/$namespace.json" -o json > "$state_dir/admission-response.json" 2> "$state_dir/admission-response.log" || status=$?
  # Stop immediately after the command's response, before parsing, rollout or HTTP.
  python3 scripts/paired-rg.py admission "$state_dir/measurement.json" "$status" "$state_dir/admission-response.json" "$state_dir/admission-response.log"
  [[ "$status" == 0 ]] || exit "$status"
  step rollout k -n "$namespace" rollout status deployment/quotes-node --timeout=300s
  step http workload_http "$namespace"
  k -n "$namespace" get deployment quotes-node -o json > "$state_dir/deployment.json"
  k -n "$namespace" get pods -l app=quotes-node -o json > "$state_dir/pods.json"
  node scripts/check-image-rollout.mjs --same-image "$image" "$state_dir/deployment.json" "$state_dir/pods.json" "$namespace" > "$state_dir/rollout-check.json"
  python3 scripts/paired-rg.py functional "$state_dir/measurement.json"
else
  fail 'Unknown single-delivery phase'
fi
