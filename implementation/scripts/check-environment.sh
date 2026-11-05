#!/usr/bin/env bash
set -euo pipefail
entry_file=$(realpath -e -- "${BASH_SOURCE[0]}")
root=$(cd -- "$(dirname -- "$entry_file")/.." && pwd -P)
bash "$root/../src/check-environment.sh" "$@"
if [[ "${1:-}" != --delivery ]]; then
  node --test "$root/tests/environment/probe.test.mjs" "$root/tests/environment/config.test.mjs"
fi
