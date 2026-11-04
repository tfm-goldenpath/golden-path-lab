#!/usr/bin/env bash
# Supported compatibility entry; arguments, CWD and status belong to bin/deliver.
exec bash "$(dirname -- "${BASH_SOURCE[0]}")/../../bin/deliver" "$@"
