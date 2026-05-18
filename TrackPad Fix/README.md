# TrackpadFixSA

A lightweight **`dinput8.dll` proxy** that fixes broken mouse/trackpad camera
input in **GTA San Andreas** running through **Wine / CrossOver / Whisky on
Apple Silicon Macs**.

It targets the bug class every Mac player hits with a MacBook trackpad:

- camera spins endlessly in one direction
- mouse delta values get stuck / latch
- erratic, FPS-dependent sensitivity
- camera direction flips after pause/unpause or alt-tab
- fullscreen ⇄ windowed switching makes it worse

Works with the disc **1.0** build and the **Rockstar Launcher** build, is fully
compatible with **SilentPatch**, and needs no CLEO.

---

## Why this happens

GTA SA reads the mouse through **DirectInput8** in *relative-axis* mode: every
frame it calls `IDirectInputDevice8::GetDeviceState`, reads `lX`/`lY` from a
`DIMOUSESTATE`, and feeds those raw deltas straight into the camera as a
rotation amount.

Wine's DirectInput-to-macOS bridge does not reproduce a real Windows mouse
stack faithfully:

| Symptom | Root cause |
|---|---|
| **Infinite spin** | On input desync the device returns the **same non-zero delta every poll**. A constant delta = constant rotation = endless spin. |
| **Delta spikes** | Focus changes / fullscreen toggles flush a large accumulated delta in one poll. |
| **Pause flip** | `Acquire()` after unpause hands back a stale buffered delta with leftover sign. |
| **FPS-dependent sensitivity** | GTA SA applies mouse gain **per frame**, not per second; high-refresh Macs amplify everything. |
| **Trackpad jitter** | High-DPI Apple trackpads emit noisy 1–2 count deltas even at rest. |

TrackpadFixSA inserts a **delta sanitisation layer** at the DirectInput COM
boundary — before any of that reaches the camera.

---

## Architecture

```
GTA SA (32-bit exe)
   │  imports dinput8.dll  (completely normal — no IAT edit, no code patch)
   ▼
dinput8.dll  ◄── THIS proxy, sitting in the GTA SA folder
   │
   ├─ DllMain (minimal, no CRT file I/O on the loader lock):
   │    • copy real system32\dinput8.dll → dinput8_tpfix.dll (once)
   │    • LoadLibrary dinput8_tpfix.dll  (distinct base name = real DLL,
   │      NOT us — avoids the loader name-collision / infinite recursion)
   │    • config + log are lazy-initialised on first DirectInput8Create
   │
   ├─ exports: DllCanUnloadNow / DllGetClassObject / DllRegisterServer /
   │           DllUnregisterServer / GetdfDIJoystick  → forwarded verbatim
   │
   └─ export: DirectInput8Create  → wrapped
         │  call real DirectInput8Create
         ▼
      PatchDirectInput8()  ─► patch IDirectInput8 vtable slot 3 (CreateDevice)
         │
         ▼
      CreateDevice_Hook  ─► if GUID == GUID_SysMouse:
         │                     patch device vtable slots 7/8/9/10
         ▼
      IDirectInputDevice8 vtable
         ├ 7  Acquire        ─► flush stale delta (pause/alt-tab fix)
         ├ 8  Unacquire
         ├ 9  GetDeviceState ─► DeltaFilter::Process()      (immediate mode)
         └ 10 GetDeviceData  ─► DeltaFilter::ProcessBuffered (buffered mode)
                                    │
                                    ▼
                  raw ─► stuck-detect ─► clamp ─► deadzone
                      ─► fps-scale ─► sensitivity ─► smooth/emu ─► game
```

### Why a `dinput8.dll` proxy (and not an ASI plugin)

The first version of this project was an `.asi` that IAT-hooked the game
executable. **That crashed the Rockstar Launcher build at launch**: the RGL
executable is DRM-wrapped, so its import table is packed/encrypted and its
anti-tamper objects to any IAT modification.

The proxy approach fixes that completely:

- **The game executable is never touched** — no IAT edits, no inline code
  patches, no hard-coded SA addresses. The game simply imports `dinput8.dll`
  as it always did; DRM/anti-tamper sees nothing.
- **Only DirectInput's own COM vtables are patched** — those live inside
  `dinput8.dll`, not the protected game image.
- **Version-independent** — the *same* binary works for disc 1.0 and the
  Rockstar Launcher build.
- **Standalone** — does NOT load or depend on SilentPatch or any `.asi`. The
  fix is entirely self-contained.

#### The loader name-collision bug (why earlier builds crashed at launch)

The Windows/Wine loader keys loaded modules by **base name**. Once our DLL is
loaded as `dinput8.dll`, `LoadLibrary("C:\windows\system32\dinput8.dll")`
returns *our own* handle again — it never loads the real one. The proxy then
called *itself* as the "real" `DirectInput8Create`, recursing until the stack
overflowed → **crash at launch, no window**.

Fix: on first run the real `dinput8.dll` is copied next to the game as
`dinput8_tpfix.dll` (a distinct base name) and *that* is loaded. A self-handle
guard plus a self-pointer check on `DirectInput8Create` make recursion
impossible even if the copy ever fails.

### Source layout

| File | Responsibility |
|---|---|
| `src/proxy.cpp` | `dinput8.dll` `DllMain`, the six exports, real-DLL + ASI loading |
| `src/dinput_hook.*` | DirectInput8 COM vtable interception |
| `src/delta_filter.*` | the sanitisation pipeline |
| `src/iat.*` | `PatchVTable` helper |
| `src/config.*` | `TrackpadFixSA.ini` loader, Wine-aware defaults |
| `src/wine.*` | Wine / CrossOver detection via `ntdll!wine_get_version` |
| `src/log.*` | `TrackpadFixSA.log` writer |

vtable note: a DirectInput vtable lives once in `dinput8.dll` and is shared by
*all* devices of that type, so every hook gates on a registered-mouse-device
check — keyboard/joystick objects pass through untouched.

---

## The delta pipeline

Per polled frame, per axis (`src/delta_filter.cpp`):

1. **Flush guard** — after `Acquire()`, drop the frame entirely for a few frames.
2. **Stuck-detect** — an identical non-zero delta for `StuckFrames` frames is a
   latched/desynced value → forced to `0`. *This is the infinite-spin fix.*
3. **Spike clamp** — `|delta|` capped at `ClampMax`.
4. **Deadzone** — `|delta| < Deadzone` → `0`.
5. **FPS scaling** *(optional)* — multiply by `FpsTarget × frameDt` so the
   per-frame mouse gain stops changing with frame rate.
6. **Sensitivity** — final multiplier.
7. **Output shaping** — EMA low-pass smoothing (trackpad mode) *or* decaying
   velocity integration (controller-emulation mode).

Pseudocode:

```c
process(dx, dy):
    if flushing: return 0, 0
    dx = stuck_detect(dx); dy = stuck_detect(dy)      // spin fix
    dx = clamp(dx, ±ClampMax); dy = clamp(dy, ±ClampMax)
    if |dx| < Deadzone: dx = 0
    if |dy| < Deadzone: dy = 0
    if FpsAwareScaling:
        s = FpsTarget * frameDt
        dx *= s; dy *= s
    dx *= Sensitivity; dy *= Sensitivity
    if ControllerEmulation:
        vel = vel*Decay + delta*(1-Decay); out = vel
    else if TrackpadMode:
        smooth = smooth*S + delta*(1-S);  out = smooth
    return round(out)
```

---

## Build (on macOS)

GTA SA is a **32-bit** process, so the DLL must be a 32-bit PE.

```sh
brew install mingw-w64        # one-time: 32-bit Windows cross-compiler
./scripts/build.sh            # produces dinput8.dll
```

Or directly: `make`. The build links the Universal CRT — supported by
CrossOver 21+, Wine 6+, and Whisky (all modern macOS setups).

## Install

1. Copy **`dinput8.dll`** into the GTA SA folder (next to `gta_sa.exe`).
2. **Remove any other `dinput8.dll`** already there (e.g. an old ASI loader).
3. **Set the DLL override** (mandatory — Wine loads its builtin dinput8 and
   ignores this file otherwise):
   - CrossOver: bottle → *Wine Configuration* → *Libraries* tab → type
     `dinput8` in "New override", *Add*, *Edit* → **Native (Windows)** → *OK*
     → *Apply*.
   - or set the env var `WINEDLLOVERRIDES=dinput8=n,b` for the launch.
4. Optionally copy `TrackpadFixSA.ini` too (defaults are sane without it).
5. Launch through CrossOver / Wine / Whisky.

On first launch it creates `dinput8_tpfix.dll` (a copy of the real system
DirectInput) next to the game — leave it there. Delete it only after a Wine /
CrossOver upgrade so a fresh copy is taken.

Standalone — no SilentPatch, no ASI loader, no other files required. If you also
want SilentPatch, run it through its own loader under a *different* name (e.g.
`vorbisFile.dll`); the two do not interfere.

---

## Configuration

All knobs live in `TrackpadFixSA.ini`; see that file for the annotated list.
Quick-fix recipes:

| Problem | Change |
|---|---|
| Still spinning | lower `StuckFrames` (e.g. `4`), lower `ClampMax` |
| Camera too floaty/laggy | lower `Smoothing` (e.g. `0.2`) |
| Jitter at rest | set `Deadzone = 3` |
| Sensitivity changes with FPS | `FpsAwareScaling = 1` |
| Camera flips on pause/alt-tab | keep `FlushOnAcquire = 1`, raise `FlushFrames` |
| Want gamepad-like camera | `ControllerEmulation = 1` |

When Wine/CrossOver is detected and `AutoDetectWine = 1`, the *defaults* shift to
the trackpad-tuned profile automatically — an explicit INI value always wins.

---

## Debugging trackpad deltas

If it crashes **before** the log is created, the log won't exist yet — use the
`OutputDebugString` breadcrumbs instead. Launch from a terminal with:

```sh
WINEDEBUG=+debugstr <your launch command>
```

and look for the last `TPFIX:` line printed:

| Last `TPFIX:` line | Meaning |
|---|---|
| `DllMain attach` then nothing | crashed in real-DLL setup |
| `CopyFileA FAILED` | can't copy system dinput8 — check the prefix |
| `real == self, refusing` | name-collision guard tripped (report it) |
| `real dinput8 setup FAILED` | game ran but input fix is inactive (no crash) |
| `real dinput8 ready` | proxy fine — any later crash is elsewhere |

Once it gets past launch, the log is the first thing to read.

1. Set `Logging = 1` (and `DebugDeltas = 1` while tuning) in the INI.
2. Reproduce the issue, then open `TrackpadFixSA.log` in the GTA SA folder.
3. Init lines show how far load got: real-DLL resolution, `.asi` count, the
   detected host (`Native` / `Wine` / `CrossOver`), then `armed`.
4. With `DebugDeltas`, each frame logs `raw=(x,y) stuck=(cx,cy) -> out=(x,y)`:
   - `raw` constant non-zero, `out → 0,0` → stuck-detect working.
   - `raw` spiking into the hundreds → lower `ClampMax`.
   - `out` non-zero while the trackpad is still → raise `Deadzone`.
   - `stuck` counter never reaching `StuckFrames` during a spin → lower it.
5. If the log shows `o_GetState=0` or `IDirectInput8 ... o_CreateDevice=0`, a
   vtable patch failed — report it.

Turn `DebugDeltas` back off once tuned; per-frame logging is heavy.

---

## Compatibility / tested targets

- CrossOver (latest), Wine-Staging, Whisky
- Apple Silicon Macs, macOS Sonoma / Sequoia
- fullscreen and windowed, various FPS caps
- GTA SA 1.0 and Rockstar Launcher builds
- SilentPatch installed

## Scope & legal

A clean, independent reimplementation. Contains **no Rockstar source code**. All
interception uses public DirectInput / Win32 COM ABIs; no leaked or copyrighted
material is included or redistributed.
