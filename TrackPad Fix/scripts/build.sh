#!/usr/bin/env bash
# Builds TrackpadFixSA.asi on macOS (Apple Silicon or Intel).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CXX="${CXX:-i686-w64-mingw32-g++}"

if ! command -v "$CXX" >/dev/null 2>&1; then
  echo "error: '$CXX' not found."
  echo "install the 32-bit Windows cross-compiler with:"
  echo "    brew install mingw-w64"
  exit 1
fi

echo "==> toolchain: $($CXX -dumpmachine) ($($CXX -dumpversion))"
make -C "$ROOT" CXX="$CXX" clean all

echo
echo "==> done. install into the GTA SA folder:"
echo "      cp '$ROOT/dinput8.dll'        <GTASA>/"
echo "      cp '$ROOT/TrackpadFixSA.ini'  <GTASA>/   # optional, has sane defaults"
echo
echo "    remove any OTHER dinput8.dll (e.g. an existing ASI loader) first --"
echo "    this dinput8.dll already loads *.asi itself, SilentPatchSA.asi included."
