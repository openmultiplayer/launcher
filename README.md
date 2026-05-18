# open.mp Launcher — macOS

A native **macOS (Apple Silicon)** build of the [open.mp launcher](https://github.com/openmultiplayer/launcher).

Upstream open.mp ships Windows only. This fork adds the changes needed to
compile, sign, and package the launcher as a macOS `.dmg`.

## Download

Get the latest `.dmg` from the
[**Releases**](https://github.com/isiddharthasharma/open.mp-launcher-macOS/releases/latest)
page — `omp-launcher_*_aarch64.dmg` (Apple Silicon Macs).

## Install

1. Open the `.dmg` and drag **omp-launcher.app** onto the **Applications** shortcut.
2. Open **Terminal** (`Cmd+Space` → type `Terminal`) and run:

   ```bash
   xattr -dr com.apple.quarantine /Applications/omp-launcher.app
   ```

3. Open **omp-launcher** from Applications.

This build is ad-hoc signed, not Apple-notarized. macOS quarantines every
internet download and refuses to open the app until that flag is cleared,
showing a misleading *"omp-launcher is damaged"* message. Step 2 removes it.

> The DMG includes a `HOW TO INSTALL` text file with these same steps. A true
> no-Terminal install requires Apple notarization (paid Apple Developer
> account), which this free build does not have.

### Opening it without Terminal every time

Step 2 only clears the quarantine flag on the *current* copy — re-downloading
or rebuilding the app brings it back, and macOS still gatekeeps ad-hoc-signed
apps on launch. To make the app (and any future rebuild) just double-click
open, run this **once**:

```bash
sudo spctl --master-disable
```

This turns off Gatekeeper assessment globally and unlocks
**System Settings → Privacy & Security → "Allow applications from: Anywhere"**.
After it, omp-launcher opens by double-click forever — no quarantine step, no
Terminal.

> **Trade-off:** while disabled, *any* unsigned app runs without a Gatekeeper
> check. Re-enable anytime with `sudo spctl --master-enable`. Ad-hoc and
> self-signed builds fail Gatekeeper identically — only this or notarization
> avoids the per-launch block.

## Playing on macOS

The launcher installs in one step, but **GTA: San Andreas itself must already
be set up** — the launcher cannot install the game or Windows for you. One-time
prerequisites:

1. **Install [CrossOver](https://www.codeweavers.com/crossover)** (Apple Silicon).
   It runs the Windows game on macOS.
2. **Install GTA: San Andreas into a CrossOver bottle**, and **downgrade it to
   v1.0**. SA-MP / open.mp only work with the **1.0** executable — the Steam /
   Rockstar Games Launcher re-release will not connect until downgraded.

That is the only manual setup. Everything else is automatic — when you connect
to a server the launcher:

- finds the game inside your CrossOver bottle (or use **Settings → Browse** to
  point at `gta-sa.exe` yourself);
- copies the SA-MP client files into the game folder;
- installs a `vorbisFile.dll` loader proxy so SA-MP loads under Wine (the real
  DLL is preserved as `vorbisFile_o.dll`);
- applies a Wine audio workaround that otherwise crashes the game on load;
- launches the game through CrossOver and connects you to the server.

Set a **nickname** (top-right) before connecting — servers reject blank names.

## Notes

- **Apple Silicon (arm64) only** — does not run on Intel Macs.
- Joining servers works on macOS via CrossOver — see *Playing on macOS* above.
- Requires CrossOver; a free Wine/Whisky setup is not officially supported.

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
| `src-tauri/src/injector.rs` | non-Windows `run_samp` was a no-op — now detects the CrossOver bottle, installs the SA-MP loader proxy, applies the Wine audio workaround, kills any prior game, and launches + connects via CrossOver `cxstart`. |
| `src-tauri/src/samp.rs`, `helpers.rs`, `commands.rs` | macOS GTA SA auto-detection (scans CrossOver bottles), `kill_game` command, single-instance enforcement. |
| `tools/samp-loader/` | 32-bit `vorbisFile.dll` proxy that loads `samp.dll` into the game under Wine (forwards all exports to the real DLL). |
| `src/utils/helpers.ts`, `src/containers/Settings/Tab/General.tsx` | Update check used `!=`, so a build newer than the server's reported version showed a false "update available" prompt — now prompts only when the remote build is strictly newer. |
| `src-tauri/tauri.conf.json` | Added a macOS bundle block (ad-hoc signing identity, minimum system version). |
| `scripts/` | `build-macos.sh` (build + sign + package) and `dmg-uninstall.command` (in-DMG uninstaller). |

## Credit

All launcher functionality is the work of the
[open.mp team](https://github.com/openmultiplayer/launcher). This fork only adds
the macOS build path. Support open.mp: <https://opencollective.com/openmultiplayer>
