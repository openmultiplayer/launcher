#!/usr/bin/env bash
#
# Build the open.mp launcher for macOS.
#
# Compiles the Tauri app, ad-hoc signs it, and packages a .dmg (app +
# Applications shortcut + install instructions) branded with the open.mp icon.
# The build is ad-hoc signed, not notarized; see the bundled HOW TO INSTALL file.
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
ICON="$ROOT/src-tauri/icons/icon.icns"
VOL_NAME="$APP_NAME $VERSION"
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
cp "$ROOT/scripts/dmg-readme.txt" "$STAGE/HOW TO INSTALL - read me.txt"
cp "$ROOT/scripts/dmg-uninstall.command" "$STAGE/Uninstall omp-launcher.command"
chmod +x "$STAGE/Uninstall omp-launcher.command"
# Volume icon: shown on the mounted disk in Finder.
cp "$ICON" "$STAGE/.VolumeIcon.icns"

echo "==> Creating disk image"
rm -f "$OUT_DMG"
RW_DMG="$(mktemp -u).dmg"
hdiutil create -volname "$VOL_NAME" -srcfolder "$STAGE" -ov -format UDRW "$RW_DMG" >/dev/null

# Mount read-write to flag the volume as having a custom icon.
# Let hdiutil pick a free mountpoint and report the device, so an
# already-mounted copy of this .dmg (same volume name) does not
# collide with /Volumes/$VOL_NAME.
ATTACH="$(hdiutil attach "$RW_DMG" -nobrowse -readwrite)"
DEV="$(echo "$ATTACH" | grep -oE '^/dev/disk[0-9]+' | head -1)"
MNT="$(echo "$ATTACH" | grep -oE '/Volumes/.*$' | tail -1)"
xcrun SetFile -a C "$MNT" || true
hdiutil detach "$DEV" -quiet

# Compress to the final image.
hdiutil convert "$RW_DMG" -format UDZO -o "$OUT_DMG" >/dev/null
rm -f "$RW_DMG"

echo "==> Branding the .dmg file with the open.mp icon"
# Copy the icns into the .dmg file's resource fork and flag it custom.
# Modern .icns are data-fork files; `sips -i` adds the icon resource
# DeRez needs. Branding is cosmetic, so never fail the build over it.
ICNS_RSRC="$STAGE/icon.rsrc"
ICON_TMP="$STAGE/volicon.icns"
if cp "$ICON" "$ICON_TMP" \
   && sips -i "$ICON_TMP" >/dev/null 2>&1 \
   && xcrun DeRez -only icns "$ICON_TMP" > "$ICNS_RSRC" 2>/dev/null \
   && xcrun Rez -append "$ICNS_RSRC" -o "$OUT_DMG" 2>/dev/null; then
  xcrun SetFile -a C "$OUT_DMG" || true
else
  echo "    (icon branding skipped — .dmg still valid)"
fi

echo
echo "==> Done: $OUT_DMG"
