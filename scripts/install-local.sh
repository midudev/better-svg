#!/usr/bin/env bash
#
# Builds the extension into a local .vsix, installs it into every detected
# VS Code-like editor (VS Code, Cursor) and reloads all of their windows so the
# new build is picked up immediately.
#
# Usage:
#   ./scripts/install-local.sh            # build, install, reload everything
#   EDITORS="code" ./scripts/install-local.sh   # restrict to a single editor CLI
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
PUBLISHER=$(node -p "require('./package.json').publisher")
VSIX="${NAME}-${VERSION}.vsix"
EXT_ID="${PUBLISHER}.${NAME}"

# Editors to target. Override with EDITORS="code cursor".
EDITORS="${EDITORS:-code cursor}"

# Map an editor CLI to its macOS application name (used to restart it).
app_name_for() {
  case "$1" in
    code) echo "Visual Studio Code" ;;
    code-insiders) echo "Visual Studio Code - Insiders" ;;
    cursor) echo "Cursor" ;;
    codium) echo "VSCodium" ;;
    *) echo "" ;;
  esac
}

echo "📦 Packaging ${VSIX}..."
npx --yes @vscode/vsce package --no-dependencies -o "$VSIX"

found_any=false
for cli in $EDITORS; do
  if ! command -v "$cli" >/dev/null 2>&1; then
    continue
  fi
  found_any=true

  echo "⬇️  Installing into '${cli}'..."
  # --force replaces the currently installed version even if equal/older.
  "$cli" --install-extension "$VSIX" --force

  app="$(app_name_for "$cli")"
  if [[ "$(uname)" == "Darwin" && -n "$app" ]]; then
    # Only restart the app if it is actually running, so we don't spawn editors
    # the user did not have open.
    if pgrep -f "/Applications/${app}.app" >/dev/null 2>&1; then
      echo "🔄 Reloading all '${app}' windows..."
      osascript -e "tell application \"${app}\" to quit" >/dev/null 2>&1 || true
      # Give it a moment to flush state (hot exit) before relaunching.
      for _ in 1 2 3 4 5 6 7 8 9 10; do
        pgrep -f "/Applications/${app}.app" >/dev/null 2>&1 || break
        sleep 0.5
      done
      open -a "$app"
    fi
  else
    echo "ℹ️  Installed. Reload your '${cli}' windows manually (Cmd/Ctrl+Shift+P → 'Reload Window')."
  fi
done

if [[ "$found_any" == false ]]; then
  echo "❌ No editor CLI found in PATH (tried: ${EDITORS})."
  echo "   In VS Code run 'Shell Command: Install \"code\" command in PATH'."
  exit 1
fi

echo "✅ Done. Installed ${EXT_ID} ${VERSION}."
