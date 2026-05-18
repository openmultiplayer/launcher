#!/usr/bin/env bash
#
# Build the open.mp launcher for macOS.
#
# Compiles the Tauri app, ad-hoc signs it, and packages a .dmg that bundles an
# Install command. The installer clears the macOS quarantine flag so the app
# opens without the misleading "damaged" error (this build is not notarized).
#
# Usage: ./scripts/build-macos.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

APP_NAME="omp-launcher"
VERSION="$(node -p "require('./package.json').version")"
case "$(uname -m)" in
  x86_64) DMG_ARCH="x64" ;;
  *)      DMG_ARCH="aarch64" ;;
esac

APP_PATH="$ROOT/src-tauri/target/release/bundle/macos/$APP_NAME.app"
OUT_DMG="$ROOT/${APP_NAME}_${VERSION}_${DMG_ARCH}.dmg"

echo "==> Building $APP_NAME $VERSION ($DMG_ARCH)"
# Build only the .app bundle; the .dmg is assembled below with hdiutil.
yarn tauri build --bundles app

echo "==> Ad-hoc signing $APP_NAME.app"
codesign --force --deep --sign - "$APP_PATH"
codesign --verify --verbose=2 "$APP_PATH"

echo "==> Staging disk image contents"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -R "$APP_PATH" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
cp "$ROOT/scripts/dmg-install.command" "$STAGE/Install (run me first).command"
chmod +x "$STAGE/Install (run me first).command"

echo "==> Creating $OUT_DMG"
rm -f "$OUT_DMG"
hdiutil create \
  -volname "$APP_NAME $VERSION" \
  -srcfolder "$STAGE" \
  -ov -format UDZO \
  "$OUT_DMG"

echo
echo "==> Done: $OUT_DMG"
