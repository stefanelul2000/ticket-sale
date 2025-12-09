#!/usr/bin/env bash
set -euo pipefail

# Usage:
# - No args: check staged files (pre-commit scenario)
# - --diff base_ref: use git diff --name-only origin/base_ref...HEAD (CI scenario)
# - file list args: check these files

cd "$(git rev-parse --show-toplevel)"

SENSITIVE_PATTERNS=(
  '^\.env$'
  '^(.+/)?\.env$'
  '\.pem$'
  '\.key$'
  '\.crt$'
  '\.p12$'
  '\.pfx$'
  '^config/app.env$'
  '^docker/.env$'
  '^app/backend/.env$'
)

# Helper to check a single filename against patterns
is_sensitive() {
  local f="$1"
  for p in "${SENSITIVE_PATTERNS[@]}"; do
    if [[ "$f" =~ $p ]]; then
      # allow examples: .env.example should not be blocked
      if [[ "$f" =~ \.env\.example$ ]]; then
        return 1
      fi
      return 0
    fi
  done
  return 1
}

# Determine files to check
FILES_TO_CHECK=()
if [ "$#" -eq 0 ]; then
  # No args - check staged files
  mapfile -t FILES_TO_CHECK < <(git diff --cached --name-only --diff-filter=ACMR)
elif [ "$1" == "--diff" ]; then
  BASE_REF="$2"
  # Ensure we have the base ref available
  git fetch --depth=1 origin "$BASE_REF" || true
  mapfile -t FILES_TO_CHECK < <(git diff --name-only "origin/$BASE_REF"...HEAD)
else
  # treat args as file names
  FILES_TO_CHECK=("$@")
fi

# Evaluate
BLOCKED=()
for f in "${FILES_TO_CHECK[@]:-}"; do
  if [ -z "$f" ]; then
    continue
  fi
  if is_sensitive "$f"; then
    BLOCKED+=("$f")
  fi
done

if [ ${#BLOCKED[@]} -gt 0 ]; then
  echo "\n🚫 Commit blocked: the following files are considered sensitive and must not be committed:" >&2
  for b in "${BLOCKED[@]}"; do echo " - $b" >&2; done
  echo "\nIf you need to commit a template, use a file with the .example extension (e.g. .env.example)." >&2
  echo "To bypass locally (not recommended), use: git commit --no-verify but do not push secrets to the repo." >&2
  exit 1
fi

exit 0
