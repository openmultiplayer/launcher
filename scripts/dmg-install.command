#!/bin/bash
#
# omp-launcher — macOS installer.
#
# macOS quarantines every app downloaded from the internet. Because this build
# is ad-hoc signed (not Apple-notarized), that quarantine makes macOS refuse to
# open it with a misleading "omp-launcher is damaged" message.
#
# This script installs the app and clears the quarantine flag, so it just runs.
# Double-click it from the mounted disk image. If macOS blocks the double-click,
# right-click it -> Open -> Open.
#
set -e

APP="omp-launcher.app"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/$APP"
DEST="/Applications/$APP"

echo "=== omp-launcher installer ==="

if [ ! -d "$SRC" ]; then
  echo "Error: $APP not found next to this script."
  echo "Run this from inside the mounted disk image."
  read -r -p "Press Return to close." _
  exit 1
fi

echo "Copying to /Applications ..."
rm -rf "$DEST"
cp -R "$SRC" "$DEST"

echo "Clearing quarantine flag ..."
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

echo "Re-signing (ad-hoc) ..."
codesign --force --deep --sign - "$DEST" 2>/dev/null || true

echo "Launching omp-launcher ..."
open "$DEST"

echo
echo "Done. omp-launcher is installed in /Applications."
echo "You can close this window."
