#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Priority and Load Balance tests ==="

echo "[1/3] instance-scoped key candidate selection + priority"
cargo test pool::pool::tests::test_candidate_selection_with_priority_for_instance_scoped_key -- --nocapture

echo "[2/3] priority retry excludes failed provider"
cargo test pool::pool::tests::test_priority_retry_selects_next_candidate_when_excluded -- --nocapture

echo "[3/3] round-robin distribution within candidate set"
cargo test pool::pool::tests::test_round_robin_stays_within_candidate_set -- --nocapture

echo "All priority and load-balance checks passed."
