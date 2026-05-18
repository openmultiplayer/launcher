# open.mp Launcher — macOS

A native **macOS (Apple Silicon)** build of the [open.mp launcher](https://github.com/openmultiplayer/launcher).

Upstream open.mp ships Windows only. This fork adds the changes needed to
compile, sign, and package the launcher as a macOS `.dmg`.

## Download

Get the latest `.dmg` from the
[**Releases**](https://github.com/isiddharthasharma/open.mp-launcher-macOS/releases/latest)
page — `omp-launcher_*_aarch64.dmg` (Apple Silicon Macs).

## Install

1. Open the `.dmg`.
2. Double-click **Install (run me first).command**.
   It copies the app to `/Applications`, clears the macOS quarantine flag, and
   launches it.
   - If macOS blocks the double-click, right-click the file → **Open** → **Open**.

Why the installer: this build is ad-hoc signed, not Apple-notarized. macOS
quarantines every internet download and would otherwise refuse to open the app
with a misleading *"omp-launcher is damaged"* message. The installer strips that
flag so the app just runs.

Manual alternative — drag `omp-launcher.app` to Applications, then run:

```bash
xattr -dr com.apple.quarantine /Applications/omp-launcher.app
```

## Notes

- **Apple Silicon (arm64) only** — does not run on Intel Macs.
- Launcher UI and server browser work on macOS.
- Joining a server (DLL injection into GTA:SA) is Windows-only and is a no-op on
  macOS — GTA:SA and the open.mp client are Windows binaries.

## Building from source

Requirements: [Rust nightly](https://rust-lang.github.io/rustup/concepts/channels.html),
[Node.js](https://nodejs.org) (not v20.6), Xcode command-line tools.

```bash
git clone https://github.com/isiddharthasharma/open.mp-launcher-macOS
cd open.mp-launcher-macOS
yarn
./scripts/build-macos.sh
```

`build-macos.sh` compiles the app, ad-hoc signs it, and writes a ready-to-ship
`omp-launcher_<version>_aarch64.dmg` (app + installer) to the repo root.

For development: `yarn start`.

## Changes vs upstream

| File | Change |
|------|--------|
| `src-tauri/src/commands.rs` | `is_process_alive` used `windows_sys` unconditionally — split into a Windows impl and a cross-platform one backed by `sysinfo`. |
| `src-tauri/src/injector.rs` | non-Windows `run_samp` referenced the `errors::Result` alias whose import was Windows-gated — added a non-Windows import. |
| `src/utils/helpers.ts`, `src/containers/Settings/Tab/General.tsx` | Update check used `!=`, so a build newer than the server's reported version showed a false "update available" prompt — now prompts only when the remote build is strictly newer. |
| `src-tauri/tauri.conf.json` | Added a macOS bundle block (ad-hoc signing identity, minimum system version). |
| `scripts/` | `build-macos.sh` (build + sign + package) and `dmg-install.command` (in-DMG installer). |

## Credit

All launcher functionality is the work of the
[open.mp team](https://github.com/openmultiplayer/launcher). This fork only adds
the macOS build path. Support open.mp: <https://opencollective.com/openmultiplayer>
