#!/usr/bin/env bash
# Local lane-A presentation entry point. No workflow dispatch or publication.
set -Eeuo pipefail
entry_file=$(realpath -e -- "${BASH_SOURCE[0]}")
root=$(cd -- "$(dirname -- "$entry_file")/.." && pwd -P)
export PATH="$root/.tools/bin:$PATH"
exec python3 "$root/scripts/defense-demo/coordinator.py" "$@"
