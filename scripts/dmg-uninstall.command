#!/bin/bash
#
# omp-launcher uninstaller (staged into the .dmg).
#
# Removes /Applications/omp-launcher.app and, after an explicit
# confirmation, the user data the launcher downloads/caches.
#
# If macOS blocks this on double-click ("unidentified developer"),
# right-click the file -> Open -> Open.

set -u

APP="/Applications/omp-launcher.app"
BUNDLE_ID="mp.open.launcher"

DATA_DIRS=(
  "$HOME/Library/Application Support/$BUNDLE_ID"
  "$HOME/Library/Caches/$BUNDLE_ID"
  "$HOME/Library/Logs/$BUNDLE_ID"
  "$HOME/Library/WebKit/$BUNDLE_ID"
  "$HOME/Library/HTTPStorages/$BUNDLE_ID"
  "$HOME/Library/Saved Application State/$BUNDLE_ID.savedState"
)
DATA_FILES=(
  "$HOME/Library/Preferences/$BUNDLE_ID.plist"
)

echo "=========================================="
echo "  omp-launcher  —  Uninstaller"
echo "=========================================="
echo

# 1. Quit a running instance so the bundle is not in use.
if pgrep -x "omp-launcher" >/dev/null 2>&1; then
  echo "Quitting running omp-launcher..."
  pkill -x "omp-launcher" 2>/dev/null
  sleep 1
fi

# 2. Remove the app bundle.
if [ -d "$APP" ]; then
  echo "Removing $APP ..."
  if rm -rf "$APP" 2>/dev/null; then
    echo "  done."
  else
    echo "  needs admin rights — you'll be asked for your password:"
    sudo rm -rf "$APP" && echo "  done." || { echo "  FAILED to remove app."; }
  fi
else
  echo "App not found at $APP (already removed?)."
fi

# 3. Optionally remove user data.
echo
echo "User data = your server favorites, settings, and the"
echo "downloaded SA-MP/open.mp clients (can be 15+ MB)."
echo
printf "Also DELETE all omp-launcher user data? [y/N] "
read -r ANS

case "$ANS" in
  y|Y|yes|YES)
    echo "Deleting user data..."
    for d in "${DATA_DIRS[@]}"; do
      [ -e "$d" ] && rm -rf "$d" && echo "  removed: $d"
    done
    for f in "${DATA_FILES[@]}"; do
      [ -e "$f" ] && rm -f "$f" && echo "  removed: $f"
    done
    # Flush the cached preferences daemon copy.
    defaults delete "$BUNDLE_ID" >/dev/null 2>&1 || true
    echo "User data deleted."
    ;;
  *)
    echo "Kept user data. (Reinstalling later restores your favorites.)"
    ;;
esac

echo
echo "Uninstall complete."
echo "You can close this window."
echo
