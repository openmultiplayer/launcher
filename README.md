# open.mp launcher — macOS

Made with Tauri + React-Native ❤️

> **macOS fork.** This is a fork of [openmultiplayer/launcher](https://github.com/openmultiplayer/launcher)
> with the changes needed to build and run natively on macOS (Apple Silicon).
> Upstream officially targets Windows.

## Download (macOS)

Grab the latest `.dmg` from the [Releases](https://github.com/isiddharthasharma/open.mp-launcher-macOS/releases/latest) page.

- `omp-launcher_*_aarch64.dmg` — Apple Silicon (arm64) Macs.

### Install

1. Open the `.dmg` and drag **omp-launcher.app** into Applications.
2. The app is not Apple-notarized, so the first launch is blocked by Gatekeeper.
   Right-click the app → **Open** → **Open**, or run:

   ```bash
   xattr -dr com.apple.quarantine /Applications/omp-launcher.app
   ```

### macOS notes

- Build is **arm64 only** — it does not run on Intel Macs.
- The launcher UI and server browser work on macOS.
- Joining a server (DLL injection into GTA:SA) is Windows-only and is a no-op
  on macOS, since GTA:SA and the open.mp client are Windows binaries.

## Usage

Use the open.mp launcher to enjoy a live, reliable, and populated server list to
find any server you want to play on!

## Development

### For all OSes

- Install the [nightly version](https://rust-lang.github.io/rustup/concepts/channels.html) of the Rust toolchain
- Install [NodeJS](https://nodejs.org/en/download) and `npm` (or `yarn` or anything else)
  **Note**: Please make sure you are not using node v20.6, anything else, lower or higher, should work fine.
- Clone the repository:

```bash
git clone https://github.com/isiddharthasharma/open.mp-launcher-macOS
```

- Prepare for running:

```bash
cd open.mp-launcher-macOS
yarn # or any other way you use to install dependencies using your installed package manager
yarn start
```

- For building a release version, you can use:

```bash
yarn tauri build
```

  On macOS this produces `omp-launcher.app` and a `.dmg` under
  `src-tauri/target/release/bundle/`.

## What this fork changes

The launcher build broke on macOS at three Windows-only spots. Fixed in 3 files
(+17 lines, no deletions, no behavior change on Windows):

- `src-tauri/src/commands.rs` — `is_process_alive` used `windows_sys`
  unconditionally; split into a Windows impl and a cross-platform one backed by
  the `sysinfo` crate (already a dependency).
- `src-tauri/src/injector.rs` — the non-Windows `run_samp` referenced the
  `errors::Result` alias whose import was gated behind `cfg(windows)`; added a
  non-Windows import.
- `.gitignore` — ignore `*.dmg` build artifacts.

## Donations

While open.mp is a totally free project and everyone in the team dedicates their
time on this project to provide the best for the community, we can still use
whatever contribution by anyone, to cover our costs or motivate developers.
Here is the donation link you can use to show your generosity!

- **https://opencollective.com/openmultiplayer**
