#!/usr/bin/env bash
# Administration is limited to resources named in validated, owned run state.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
source scripts/lib/context.sh
source scripts/lib/lab.sh
mode=github; context_init
export GP_STATE_DIR=${2:?}
load_state
code=0
keep_failure() { if [[ "$code" == 0 ]]; then code=$1; fi; }
if [[ "$1" == arm ]]; then
  ns=${3:?}; [[ "$ns" == tfm-reference || "$ns" == tfm-golden ]]
  k -n "$ns" delete deployment quotes-node --ignore-not-found --wait=true --timeout=90s || code=$?
  observed=0
  k -n "$ns" get deployment quotes-node -o json > "$state_dir/cleanup-object.json" 2> "$state_dir/cleanup-observation.log" || observed=$?
  if [[ "$observed" != 1 || "$(cat "$state_dir/cleanup-observation.log")" != 'Error from server (NotFound): deployments.apps "quotes-node" not found' ]]; then code=1; fi
else
  [[ "$1" == infrastructure ]]
  # Capture diagnostics before destroying resources; packaging happens afterward.
  lab_capture_admission_diagnostics || keep_failure "$?"
  k get pods -A -o json > "$state_dir/final-pods.json" || keep_failure "$?"
  while IFS= read -r state; do
    builder=$(jq -er .builder "$state/state.json")
    [[ "$builder" =~ ^tfm-build-run-[a-z0-9]+$ ]] || exit 1
    docker buildx rm "$builder" || keep_failure "$?"
  done < <(jq -r '.[]' "$PAIR_DIR/paths.json")
  kind delete cluster --name "$cluster" || keep_failure "$?"
  [[ "$private" == "$root"/.tmp/private-* ]] || exit 1
  rm -rf -- "$private" || keep_failure "$?"
fi
exit "$code"
