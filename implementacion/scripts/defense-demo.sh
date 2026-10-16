#!/usr/bin/env bash
# Local lane-A presentation entry point. No workflow dispatch or publication.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
export PATH="$root/.tools/bin:$PATH"
exec python3 "$root/scripts/defense-demo/coordinator.py" "$@"
