==========================================================
  omp-launcher for macOS  —  HOW TO INSTALL
==========================================================

This build is ad-hoc signed, not Apple-notarized. macOS
blocks it and shows a misleading message:

  "omp-launcher is damaged and can't be opened."

The app is NOT damaged. Apple just refuses to run apps
that are not notarized with a paid Developer account.

IMPORTANT: Because this build is ad-hoc signed, the
"Open Anyway" button in System Settings > Privacy &
Security does NOT appear for it. That button only works
for Developer-ID-signed apps. Use one of the two methods
below instead. Each is one-time.


----------------------------------------------------------
  METHOD 1 - Terminal launch  (SAFE, recommended)
----------------------------------------------------------

Does NOT touch your Mac's security settings.

STEP 1  Drag  omp-launcher.app  onto the  Applications
        shortcut in this window.

STEP 2  Open Terminal
        (Command + Space, type Terminal, press Return).

STEP 3  Paste these two lines, press Return:

   xattr -dr com.apple.quarantine /Applications/omp-launcher.app
   /Applications/omp-launcher.app/Contents/MacOS/omp-launcher &

The app opens. To launch it again later, run only the
second line (or see METHOD 2 for normal double-click).

Optional - make a double-click shortcut:
   In Terminal paste:

   printf '#!/bin/bash\n/Applications/omp-launcher.app/Contents/MacOS/omp-launcher &\n' > ~/Desktop/omp-launcher.command && chmod +x ~/Desktop/omp-launcher.command

   Now double-click  omp-launcher.command  on your Desktop
   to start the launcher.


----------------------------------------------------------
  METHOD 2 - Allow double-click  (toggles Gatekeeper)
----------------------------------------------------------

Use this if you want to open the app by double-clicking
its icon like a normal app.

This briefly disables Gatekeeper SYSTEM-WIDE. While
disabled, any unsigned app on your Mac can run without
a security check. Re-enable it right after (STEP 4).

STEP 1  Drag  omp-launcher.app  onto  Applications .

STEP 2  In Terminal, paste (it asks for your password):

   sudo spctl --master-disable
   xattr -dr com.apple.quarantine /Applications/omp-launcher.app

STEP 3  Open omp-launcher from Applications / Launchpad.
        It now launches.

STEP 4  Re-enable Gatekeeper (recommended):

   sudo spctl --master-enable

   The launcher keeps working after re-enabling, because
   macOS now remembers you trusted it. Double-click works
   from now on.


----------------------------------------------------------
  WHY THIS HASSLE
----------------------------------------------------------

A clean, no-Terminal, double-click install requires Apple
notarization, which needs a paid Apple Developer account
($99/yr). This is a free build, so one of the manual
methods above is required - once per downloaded version.

If you download a NEW version later, repeat your chosen
method for that new copy.


----------------------------------------------------------
  NOTES
----------------------------------------------------------

- Apple Silicon (arm64) Macs only. Does not run on Intel.
- To remove the app: double-click  Uninstall omp-launcher.command
  in this disk image. (If blocked: right-click it > Open > Open.)
  It deletes the app and asks before touching your data.
- Source and updates:
  https://github.com/isiddharthasharma/open.mp-launcher-macOS
