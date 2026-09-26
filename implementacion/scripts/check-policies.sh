#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
shopt -s nullglob
workflows=(../.github/workflows/*.yml ../.github/workflows/*.yaml)
[[ ${#workflows[@]} -gt 0 ]] || { echo 'No workflows found in the root .github/workflows directory.' >&2; exit 1; }
conftest test --policy policies/conftest --namespace workflow "${workflows[@]}"
# Before an image exists, exercise the generated manifest with a declared test digest.
temporary=$(mktemp)
trap 'rm -f -- "$temporary"' EXIT
node scripts/lab-contracts.mjs manifest "registry.example/quotes-node@sha256:$(printf '%064d' 0)" tfm-golden "$temporary"
conftest test --parser json --policy policies/conftest --namespace manifests "$temporary"
