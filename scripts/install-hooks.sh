#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel)
HOOKS_DIR="$ROOT_DIR/.githooks"

echo "Installing git hooks to $HOOKS_DIR"
mkdir -p "$HOOKS_DIR"

# Copy our pre-commit script to hooks dir (and make executable)
cp "$ROOT_DIR/.githooks/pre-commit" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"

# Ensure the scripts directory has the main script too (not required, just safety)
if [ -f "$ROOT_DIR/scripts/prevent-commit-sensitive.sh" ]; then
  chmod +x "$ROOT_DIR/scripts/prevent-commit-sensitive.sh"
fi
if [ -f "$ROOT_DIR/scripts/check-sensitive-files.sh" ]; then
  chmod +x "$ROOT_DIR/scripts/check-sensitive-files.sh"
fi

# Configure git to use the hooks directory in this repo
git config core.hooksPath ".githooks"

echo "Git hooks installed. To undo, run: git config --unset core.hooksPath or remove .githooks directory."
