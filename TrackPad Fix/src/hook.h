// TrackpadFixSA - minimal x86 inline hook
#pragma once

namespace tpfix {

// Detours `target` to `detour` by overwriting its prologue with a 5-byte
// E9 jmp. The displaced (whole) instructions plus a jmp-back are copied into a
// freshly allocated executable trampoline, returned via `trampoline` -- call
// that to reach the original.
//
// Fails open: if the prologue cannot be safely length-decoded (unknown opcode)
// nothing is patched and false is returned, so the game keeps running.
//
// Used ONLY on the real Wine-builtin dinput8 (its code, in its own module) --
// never on the DRM-wrapped game executable.
bool InstallInlineHook(void* target, void* detour, void** trampoline);

} // namespace tpfix
