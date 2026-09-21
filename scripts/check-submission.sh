#!/usr/bin/env bash
# Checks that a kmom submission is ready for review.
# Usage: bash scripts/check-submission.sh <kmom>
# Example: bash scripts/check-submission.sh kmom06
#
# Checks:
#   1. report/<kmom>.md exists, has real content, and has no placeholder text
#   2. All mandatory GitHub issues are closed
#   3. Lists optional GitHub issues with a star for each one that's closed
#      (informational only — does not affect pass/fail)
#   4. Own test files exist and contain at least a minimum number of tests
#   5. Reports test counts for optional test-coverage files (kmom10 Krav 2)
#      (informational only — does not affect pass/fail)
#   6. Own Bruno files exist (kmom-specific, e.g. a new .bru added for kmom10)
#
# Requires gh CLI with a valid token (GITHUB_TOKEN in CI, gh auth login locally).

set -euo pipefail

KMOM="${1:-}"
PLACEHOLDER="Här skriver du redovisningstexten för kmomet."
MIN_CHARS=300
PASS=true

ok()   { printf '✅  %s\n' "$*"; }
fail() { printf '❌  %s\n' "$*"; PASS=false; }

# ── Validate ──────────────────────────────────────────────────────────────────
if [ -z "$KMOM" ]; then
  echo "Usage: $0 <kmom>  (e.g. kmom06)"
  exit 1
fi

REPORT_FILE="report/${KMOM}.md"

echo "# Submission check — ${KMOM}"
echo ""

# ── 1. Report file ────────────────────────────────────────────────────────────
echo "## Report"

if [ ! -f "$REPORT_FILE" ]; then
  fail "${REPORT_FILE} saknas"
elif grep -qF "$PLACEHOLDER" "$REPORT_FILE"; then
  fail "${REPORT_FILE} innehåller fortfarande platshållartexten"
else
  CHARS=$(wc -c < "$REPORT_FILE" | tr -d ' ')
  if [ "$CHARS" -lt "$MIN_CHARS" ]; then
    fail "${REPORT_FILE} är för kort — ${CHARS} tecken (minimum ${MIN_CHARS})"
  else
    ok "${REPORT_FILE} — ${CHARS} tecken"
  fi
fi

echo ""

# ── 2. Mandatory issues ───────────────────────────────────────────────────────
echo "## Obligatoriska issues"

if ! gh auth status &>/dev/null; then
  printf '⚠️  Ingen GitHub-token — hoppar över issue-kontrollen\n'
  printf '   Sätt GH_TOKEN eller logga in med: gh auth login\n'
else
  GH_ERR_FILE=$(mktemp)
  if ALL_MANDATORY=$(gh issue list \
    --label mandatory \
    --label "$KMOM" \
    --state all \
    --json number,title,state \
    --limit 100 \
    2>"$GH_ERR_FILE"); then
    COUNT=$(echo "$ALL_MANDATORY" | jq length)

    if [ "$COUNT" -eq 0 ]; then
      printf 'Inga obligatoriska issues för %s\n' "$KMOM"
    else
      while IFS=$'\t' read -r NUMBER TITLE STATE; do
        if [ "$STATE" = "CLOSED" ]; then
          ok "#${NUMBER} ${TITLE}"
        else
          fail "#${NUMBER} ${TITLE}"
        fi
      done < <(echo "$ALL_MANDATORY" | jq -r '.[] | [.number, .title, .state] | @tsv')
    fi
  else
    fail "Kunde inte hämta obligatoriska issues från GitHub: $(cat "$GH_ERR_FILE")"
  fi
  rm -f "$GH_ERR_FILE"
fi

echo ""

# ── 3. Optional issues ────────────────────────────────────────────────────────
echo "## Valfria issues"

if ! gh auth status &>/dev/null; then
  printf '⚠️  Ingen GitHub-token — hoppar över issue-kontrollen\n'
else
  GH_ERR_FILE=$(mktemp)
  if ALL_OPTIONAL=$(gh issue list \
    --label optional \
    --label "$KMOM" \
    --state all \
    --json number,title,state \
    --limit 100 \
    2>"$GH_ERR_FILE"); then
    OPTIONAL_COUNT=$(echo "$ALL_OPTIONAL" | jq length)

    if [ "$OPTIONAL_COUNT" -eq 0 ]; then
      printf 'Inga valfria issues för %s\n' "$KMOM"
    else
      echo "$ALL_OPTIONAL" | jq -r '
        .[] | if .state == "CLOSED" then "✅  #\(.number) \(.title)" else "❌  #\(.number) \(.title)" end
      '
    fi
  else
    printf '⚠️  Kunde inte hämta valfria issues från GitHub: %s\n' "$(cat "$GH_ERR_FILE")"
  fi
  rm -f "$GH_ERR_FILE"
fi

echo ""

# ── 4. Egna tester ────────────────────────────────────────────────────────────
echo "## Egna tester"

case "$KMOM" in
  kmom04)
    OWN_TESTS=(
      "src/routes/health.test.js:1"
      "src/routes/doc.test.js:1"
      "src/routes/users.test.js:3"
    )
    ;;
  kmom05)
    OWN_TESTS=(
      "src/routes/auth.test.js:2"
      "src/routes/dashboard.test.js:1"
    )
    ;;
  kmom06)
    OWN_TESTS=(
      "src/routes/dashboard.test.js:3"
    )
    ;;
  kmom10)
    OWN_TESTS=(
      "src/routes/users.test.js:4"
      "src/routes/dashboard.test.js:4"
    )
    ;;
  *)
    OWN_TESTS=()
    ;;
esac

if [ "${#OWN_TESTS[@]}" -eq 0 ]; then
  printf 'Inga egna tester att kontrollera för %s\n' "$KMOM"
else
  for ENTRY in "${OWN_TESTS[@]}"; do
    FILE="${ENTRY%%:*}"
    MIN="${ENTRY##*:}"

    if [ ! -f "$FILE" ]; then
      fail "${FILE} saknas"
      continue
    fi

    COUNT=$(grep -cE '^\s*(test|it)\(' "$FILE" || true)

    if [ "$COUNT" -lt "$MIN" ]; then
      fail "${FILE} har ${COUNT} test(er) — minimum ${MIN}"
    else
      ok "${FILE} — ${COUNT} test(er)"
    fi
  done
fi

echo ""

# ── 5. Frivilliga tester (krav 2, informationellt) ───────────────────────────
echo "## Frivilliga tester — krav 2 (informationellt, påverkar inte pass/fail)"

case "$KMOM" in
  kmom10)
    OPTIONAL_TESTS=(
      "src/routes/auth.test.js"
      "src/routes/dashboard.test.js"
    )
    ;;
  *)
    OPTIONAL_TESTS=()
    ;;
esac

if [ "${#OPTIONAL_TESTS[@]}" -eq 0 ]; then
  printf 'Inga frivilliga tester att rapportera för %s\n' "$KMOM"
else
  printf 'Krav 2 ber dig lägga till minst 2 nya tester utöver grundkravet — se issues/10c-test-coverage.md.\n'
  for FILE in "${OPTIONAL_TESTS[@]}"; do
    if [ ! -f "$FILE" ]; then
      printf '⚪  %s saknas (behövs bara om du gör krav 2)\n' "$FILE"
      continue
    fi
    COUNT=$(grep -cE '^\s*(test|it)\(' "$FILE" || true)
    printf '⚪  %s — %s test(er)\n' "$FILE" "$COUNT"
  done
fi

echo ""

# ── 6. Egna Bruno-filer ───────────────────────────────────────────────────────
echo "## Egna Bruno-filer"

case "$KMOM" in
  kmom10)
    OWN_FILES=(
      "bruno/users/search-users.bru"
      "bruno/dashboard/patch-me-name.bru"
    )
    ;;
  *)
    OWN_FILES=()
    ;;
esac

if [ "${#OWN_FILES[@]}" -eq 0 ]; then
  printf 'Inga egna Bruno-filer att kontrollera för %s\n' "$KMOM"
else
  for FILE in "${OWN_FILES[@]}"; do
    if [ -f "$FILE" ]; then
      ok "$FILE"
    else
      fail "${FILE} saknas"
    fi
  done
fi

echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo "---"
if [ "$PASS" = true ]; then
  echo "✅ Redo för rättning"
else
  echo "❌ Inte redo — åtgärda ovanstående innan inlämning"
  exit 1
fi
