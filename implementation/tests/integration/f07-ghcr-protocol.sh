#!/usr/bin/env bash
# Opt-in protocol experiment after a fresh normal hosted finish. Never wired into
# demo.sh or a workflow. Publication and execution need separate authorization.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"
[[ $# == 1 && "${GP_F07_PROTOCOL:-}" == authorized ]] || { echo 'Usage after authorization: GP_F07_PROTOCOL=authorized bash tests/integration/f07-ghcr-protocol.sh RECEIPT' >&2; exit 2; }
# Validate mode before login, filesystem mutation or any network request.
node --input-type=module -e 'import {workflowContext} from "./tests/helpers/f07-ghcr-protocol.mjs"; workflowContext(process.env)'
: "${GP_STATE_DIR:?}" "${GP_F07_IMAGE:?}" "${GH_TOKEN:?}" "${GITHUB_ACTOR:?}"
mkdir -p evidence/raw evidence/packages .tmp
probe_private=$(mktemp -d "$root/.tmp/private-XXXXXXXX")
probe_dir="$root/evidence/raw/run-f07ghcr-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
[[ ! -e "$probe_dir" && ! -L "$probe_dir" ]] || { rmdir "$probe_private"; echo 'Probe evidence already exists; do not overwrite or repeat.' >&2; exit 1; }
export DOCKER_CONFIG="$probe_private/docker"
finish_probe() {
  local status=$? package_status=INTEGRATION_FAILURE
  trap - EXIT
  rm -rf -- "$probe_private"
  if [[ -d "$probe_dir" ]]; then
    [[ "$status" != 0 ]] || package_status=PROTOCOL_ONLY_COMPLETE
    python3 scripts/package-evidence.py "$probe_dir" "$root/evidence/packages" "$package_status" || { [[ "$status" != 0 ]] || status=1; }
  fi
  exit "$status"
}
trap finish_probe EXIT
probe_pid=''
interrupt_probe() {
  local signal=$1 status=$2
  trap '' INT TERM
  if [[ -n "$probe_pid" ]]; then
    kill -"$signal" "$probe_pid" 2>/dev/null || true
    wait "$probe_pid" || true
  fi
  exit "$status"
}
trap 'interrupt_probe INT 130' INT
trap 'interrupt_probe TERM 143' TERM
printf '%s' "$GH_TOKEN" | docker login ghcr.io --username "$GITHUB_ACTOR" --password-stdin >/dev/null
node tests/helpers/f07-ghcr-protocol.mjs probe "$1" "$GP_STATE_DIR" "$probe_dir" & probe_pid=$!
wait "$probe_pid"
probe_pid=''
printf 'Protocol observation retained: %s; hosted F07 remains NOT_EXECUTED\n' "$probe_dir"
