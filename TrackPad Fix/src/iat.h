// TrackpadFixSA - COM vtable patching
#pragma once
#include <windows.h>

namespace tpfix {

// Patches a single COM vtable slot. Returns the previous pointer (call it to
// chain to the original), or nullptr on failure / if already patched.
// `obj` is any COM interface pointer; `index` is the method slot.
//
// Only DirectInput's vtables (inside dinput8.dll) are ever patched here -- the
// game executable is never modified, so no DRM/anti-tamper is involved.
void* PatchVTable(void* obj, unsigned index, void* replacement);

} // namespace tpfix
