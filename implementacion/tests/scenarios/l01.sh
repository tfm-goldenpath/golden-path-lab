#!/usr/bin/env bash
# L01: authorized delivery and legitimate update with equivalent HTTP output.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

scenario_l01_accept() {
  actor tfm-golden apply -f "$state_dir/tfm-golden.json" | tee "$state_dir/L01-admission.log"
  probe tfm-golden
  cmp "$state_dir/tfm-reference-quote.json" "$state_dir/tfm-golden-quote.json"
}

scenario_l01_update() {
  record 'L01 legitimate update'
  actor tfm-golden annotate deployment/quotes-node -n tfm-golden tfm.lab/verified-update=true --overwrite > "$state_dir/L01-update.log"
  probe tfm-golden
}
