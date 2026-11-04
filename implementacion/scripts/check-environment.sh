#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
bash "$root/../src/check-environment.sh" "$@"
if [[ "${1:-}" != --delivery ]]; then
  node --test "$root/tests/environment/probe.test.mjs" "$root/tests/environment/config.test.mjs"
fi
