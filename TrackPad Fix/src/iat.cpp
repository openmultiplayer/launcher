// TrackpadFixSA - COM vtable patching
#include "iat.h"
#include "log.h"

namespace tpfix {

void* PatchVTable(void* obj, unsigned index, void* replacement) {
    if (!obj || IsBadReadPtr(obj, sizeof(void*))) return nullptr;
    void** vtbl = *(void***)obj;          // first member of a COM object is its vtable
    if (IsBadReadPtr(vtbl, (index + 1) * sizeof(void*))) return nullptr;

    void** slot = &vtbl[index];
    void*  prev = *slot;
    if (prev == replacement) {            // already patched (shared vtable)
        Log("vtable: slot %u already patched", index);
        return prev;                      // caller guards against re-install
    }

    DWORD oldProt = 0;
    if (!VirtualProtect(slot, sizeof(void*), PAGE_READWRITE, &oldProt)) {
        Log("vtable: VirtualProtect failed for slot %u", index);
        return nullptr;
    }
    *slot = replacement;
    VirtualProtect(slot, sizeof(void*), oldProt, &oldProt);
    Log("vtable: patched slot %u  %p -> %p", index, prev, replacement);
    return prev;
}

} // namespace tpfix
