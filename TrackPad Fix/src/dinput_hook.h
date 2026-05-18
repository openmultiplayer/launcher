// TrackpadFixSA - DirectInput8 interception
#pragma once

namespace tpfix {

class DeltaFilter;

// Patches IDirectInput8::CreateDevice (slot 3) exactly once, so every system
// mouse device the game creates afterwards gets its GetDeviceState /
// GetDeviceData / Acquire / Unacquire slots redirected through the filter.
//
// Called by the dinput8 proxy right after the real DirectInput8Create returns.
// No game-executable code or IAT is touched -- only DirectInput's own COM
// vtables (which live in dinput8.dll) are patched, so DRM/anti-tamper on the
// Rockstar Launcher build is never tripped.
void PatchDirectInput8(void* iDirectInput8);

// Shared delta filter; the proxy calls Filter().Init() once config is loaded.
DeltaFilter& Filter();

} // namespace tpfix
