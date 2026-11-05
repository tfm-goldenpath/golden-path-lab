#!/usr/bin/env bash
# Compatibility import; canonical shared implementation. Definitions only.
source "${BASH_SOURCE[0]%${BASH_SOURCE[0]##*/}}../../../src/lib/delivery.sh"

delivery_lab_tests() {
  node --test tests/unit/*.test.mjs > "$state_dir/laboratory-unit-tests.log" 2>&1
  python3 -m unittest discover -s tests/policies -p 'test_*.py' > "$state_dir/policy-contracts.log" 2>&1
  python3 tests/policies/run_rego.py > "$state_dir/policy-tests.log" 2>&1
}

delivery_preflight() {
  record 'Tests and preflight checks'
  delivery_service_tests
  delivery_lab_tests
  cat "$state_dir/laboratory-unit-tests.log" >> "$state_dir/unit-tests.log"
  delivery_workflow_policy
  delivery_versions
}

# Explicit laboratory source/measurement adapters; product never loads these.
delivery_capture_build_inputs() { node "$root/scripts/capture-build-inputs.mjs" "$@"; }
delivery_snapshot_database() {
  [[ $# == 2 && -n "$1" && -n "$2" ]] || { printf 'ERROR: database source and destination required.\n' >&2; return 2; }
  [[ ! -e "$2" && ! -L "$2" ]] || { printf 'ERROR: Database snapshot already exists; use a fresh run.\n' >&2; return 1; }
  if [[ "${manual_execution_mode:-manual}" == scripted && "${GP_REUSE_VULNERABILITY_DB:-}" == 1 && -n "${GP_VULNERABILITY_DB:-}" ]]; then
    # Only scripted lab runs may borrow the explicitly selected input. The
    # caller still identifies/checks it and owns preservation; no fallback.
    printf '%s\n' "$1"
  else
    delivery_copy_database "$@"
  fi
}
