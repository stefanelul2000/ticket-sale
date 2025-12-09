#!/usr/bin/env bash
# Pre-commit hook wrapper: check staged files for sensitive content
set -euo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel)
"$ROOT_DIR/scripts/check-sensitive-files.sh"

exit 0
