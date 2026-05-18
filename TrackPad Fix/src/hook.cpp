// TrackpadFixSA - minimal x86 inline hook
//
// Just enough 32-bit instruction-length decoding to relocate a typical
// function prologue (GCC/Wine builtin code). Unknown opcode -> abort, never
// guess: a wrong length would corrupt the trampoline and crash.

#include "hook.h"
#include "log.h"

#include <windows.h>
#include <cstring>
#include <cstdint>

namespace tpfix {

// Bytes consumed by a ModRM operand (ModRM + optional SIB + displacement).
static int modrmLen(const uint8_t* m) {
    uint8_t mod = m[0] >> 6, rm = m[0] & 7;
    int len = 1;
    if (mod == 3) return len;                 // register-direct
    if (mod == 0) {
        if (rm == 4) { len += 1; if ((m[1] & 7) == 5) len += 4; }  // SIB
        else if (rm == 5) len += 4;            // disp32
    } else if (mod == 1) {
        len += (rm == 4) ? 2 : 1;              // SIB? + disp8
    } else { /* mod==2 */
        len += (rm == 4) ? 5 : 4;              // SIB? + disp32
    }
    return len;
}

// Length of one instruction at p, or 0 if not in the supported subset.
static int insnLen(const uint8_t* p) {
    const uint8_t* s = p;
    // legacy / segment / operand-size prefixes
    while (*p == 0x66 || *p == 0x67 || *p == 0xF2 || *p == 0xF3 ||
           *p == 0x2E || *p == 0x3E || *p == 0x26 || *p == 0x36 ||
           *p == 0x64 || *p == 0x65)
        ++p;

    uint8_t op = *p++;

    if (op >= 0x50 && op <= 0x5F) {}                       // push/pop reg
    else if (op == 0x90 || op == 0xC9 || op == 0x98 ||
             op == 0x99 || op == 0xF8 || op == 0xFC) {}     // nop/leave/cwde/...
    else if (op == 0x6A) p += 1;                            // push imm8
    else if (op == 0x68) p += 4;                            // push imm32
    else if (op == 0xEB) p += 1;                            // jmp rel8
    else if (op == 0xE8 || op == 0xE9) p += 4;              // call/jmp rel32
    else if (op >= 0xB8 && op <= 0xBF) p += 4;              // mov reg,imm32
    else if (op >= 0xB0 && op <= 0xB7) p += 1;              // mov reg8,imm8
    else if (op == 0x83) { p += modrmLen(p); p += 1; }      // grp1 ev,ib
    else if (op == 0x81) { p += modrmLen(p); p += 4; }      // grp1 ev,id
    else if (op == 0xC6) { p += modrmLen(p); p += 1; }      // mov ev,ib
    else if (op == 0xC7) { p += modrmLen(p); p += 4; }      // mov ev,id
    else if (op == 0x89 || op == 0x8B || op == 0x01 || op == 0x03 ||
             op == 0x29 || op == 0x2B || op == 0x31 || op == 0x33 ||
             op == 0x39 || op == 0x3B || op == 0x09 || op == 0x0B ||
             op == 0x21 || op == 0x23 || op == 0x85 || op == 0x8D ||
             op == 0x87 || op == 0xFF || op == 0x88 || op == 0x8A)
        p += modrmLen(p);                                   // generic ModRM
    else if (op == 0x0F) {
        uint8_t o2 = *p++;
        if (o2 == 0x1E) p += 1;                             // endbr32 (FB)
        else if (o2 == 0x1F) p += modrmLen(p);              // multi-byte NOP
        else return 0;
    }
    else return 0;                                          // unsupported

    return (int)(p - s);
}

bool InstallInlineHook(void* target, void* detour, void** trampoline) {
    if (!target || !detour || !trampoline) return false;
    uint8_t* t = (uint8_t*)target;

    int len = 0;
    while (len < 5) {
        int l = insnLen(t + len);
        if (l <= 0) { Log("hook: undecodable prologue @+%d byte=0x%02X",
                          len, t[len]); return false; }
        len += l;
    }

    uint8_t* tr = (uint8_t*)VirtualAlloc(nullptr, (SIZE_T)len + 5,
                       MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
    if (!tr) { Log("hook: VirtualAlloc failed"); return false; }

    memcpy(tr, t, (size_t)len);
    tr[len] = 0xE9;
    *(int32_t*)(tr + len + 1) = (int32_t)((t + len) - (tr + len + 5));

    DWORD oldProt = 0;
    if (!VirtualProtect(t, 5, PAGE_EXECUTE_READWRITE, &oldProt)) {
        Log("hook: VirtualProtect failed");
        VirtualFree(tr, 0, MEM_RELEASE);
        return false;
    }
    t[0] = 0xE9;
    *(int32_t*)(t + 1) = (int32_t)((uint8_t*)detour - (t + 5));
    VirtualProtect(t, 5, oldProt, &oldProt);
    FlushInstructionCache(GetCurrentProcess(), t, 5);

    *trampoline = tr;
    Log("hook: installed, %d prologue bytes relocated, tramp=%p", len, tr);
    return true;
}

} // namespace tpfix
