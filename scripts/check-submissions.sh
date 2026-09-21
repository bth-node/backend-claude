#!/usr/bin/env bash
# Runs check-submission.sh for one or more kmom and prints a combined summary.
# Usage: bash scripts/check-submissions.sh <kmom> [<kmom> ...]
# Example: bash scripts/check-submissions.sh kmom04 kmom05 kmom06
#
# Each kmom is checked independently (see check-submission.sh) — this just
# aggregates their output and shows a per-kmom pass/fail summary at the end.

set -uo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <kmom> [<kmom> ...]  (e.g. kmom04 kmom05 kmom06)"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

OVERALL_PASS=true
STATUS_LINES=()

for KMOM in "$@"; do
  OUTPUT=$(bash "$SCRIPT_DIR/check-submission.sh" "$KMOM" 2>&1)
  STATUS=$?

  echo "$OUTPUT"
  echo ""

  if [ "$STATUS" -eq 0 ]; then
    STATUS_LINES+=("✅  ${KMOM}")
  else
    STATUS_LINES+=("❌  ${KMOM}")
    OVERALL_PASS=false
  fi
done

echo "---"
echo "## Sammanfattning"
for line in "${STATUS_LINES[@]}"; do
  echo "$line"
done

echo ""
if [ "$OVERALL_PASS" = true ]; then
  echo "✅ Alla kmom redo för rättning"
else
  echo "❌ Inte alla kmom redo — se detaljer ovan"
  exit 1
fi
