// TrackpadFixSA - DirectInput8 interception layer
//
// We never patch GTA SA's own code, never touch its IAT, and use no hard-coded
// game addresses -- so the plugin is identical for the disc 1.0 build and the
// DRM-wrapped Rockstar Launcher build, and anti-tamper has nothing to detect.
//
// Interception happens purely at DirectInput's own COM vtables:
//
//   IDirectInputDevice8 vtable (x86 __stdcall, IUnknown occupies slots 0-2):
//     3 GetCapabilities   7 Acquire          11 SetDataFormat
//     4 EnumObjects       8 Unacquire        ...
//     5 GetProperty       9 GetDeviceState
//     6 SetProperty      10 GetDeviceData
//
//   IDirectInput8 vtable: slot 3 = CreateDevice.
//
// COM vtables live once in dinput8.dll and are shared by every instance of a
// type, so a patched slot also fires for keyboard/joystick objects -> every
// hook is gated on a registered-mouse-device check.

#include "dinput_hook.h"
#include "delta_filter.h"
#include "iat.h"
#include "config.h"
#include "log.h"

#define DIRECTINPUT_VERSION 0x0800
#include <dinput.h>
#include <cstring>

namespace tpfix {

// ---- shared state -----------------------------------------------------------

static DeltaFilter g_filter;
DeltaFilter& Filter() { return g_filter; }

// Registered system-mouse device pointers (tiny fixed set; GTA SA makes one).
static void* g_mouseDevs[8] = {0};
static int   g_mouseDevCount = 0;

static bool isMouseDev(void* p) {
    for (int i = 0; i < g_mouseDevCount; ++i)
        if (g_mouseDevs[i] == p) return true;
    return false;
}
static void registerMouseDev(void* p) {
    if (isMouseDev(p)) return;
    if (g_mouseDevCount < 8) g_mouseDevs[g_mouseDevCount++] = p;
}

// ---- original function pointers --------------------------------------------

typedef HRESULT (STDMETHODCALLTYPE *CreateDevice_t)(void*, const GUID*, void**, void*);
typedef HRESULT (STDMETHODCALLTYPE *GetState_t)(void*, DWORD, void*);
typedef HRESULT (STDMETHODCALLTYPE *GetData_t)(void*, DWORD, DIDEVICEOBJECTDATA*, DWORD*, DWORD);
typedef HRESULT (STDMETHODCALLTYPE *Acquire_t)(void*);

static CreateDevice_t o_CreateDevice = nullptr;
static GetState_t     o_GetState     = nullptr;
static GetData_t      o_GetData      = nullptr;
static Acquire_t      o_Acquire      = nullptr;
static Acquire_t      o_Unacquire    = nullptr;

// "Done" (not "succeeded") so a partially failed patch is never retried:
// retrying would feed an already-installed hook back into o_* and recurse.
static bool g_diPatchDone  = false;
static bool g_devPatchDone = false;

// ---- device vtable hooks ----------------------------------------------------

static int  g_gsCalls = 0, g_gdCalls = 0, g_acqCalls = 0;
static bool g_loggedGD = false;

static HRESULT STDMETHODCALLTYPE GetDeviceState_Hook(void* self, DWORD cb, void* data) {
    const bool trace = (g_gsCalls < 3);
    if (trace) Log("GS#%d: enter self=%p cb=%lu data=%p o_GetState=%p",
                    g_gsCalls, self, cb, data, (void*)o_GetState);
    if (!o_GetState) return E_FAIL;
    HRESULT hr = o_GetState(self, cb, data);
    if (trace) Log("GS#%d: orig hr=0x%08lX", g_gsCalls, hr);

    if (SUCCEEDED(hr) && data && isMouseDev(self) && cb >= sizeof(DIMOUSESTATE)) {
        LONG* axes = (LONG*)data;          // DIMOUSESTATE/2 start with LONG lX,lY
        long dx = axes[0], dy = axes[1];
        if (trace) Log("GS#%d: mouse raw=%ld,%ld -> Process", g_gsCalls, dx, dy);
        g_filter.Process(dx, dy);
        axes[0] = dx; axes[1] = dy;
        if (trace) Log("GS#%d: out=%ld,%ld", g_gsCalls, dx, dy);
    } else if (trace) {
        Log("GS#%d: skip (mouseDev=%d cb=%lu)", g_gsCalls,
            (int)isMouseDev(self), cb);
    }
    ++g_gsCalls;
    return hr;
}

static HRESULT STDMETHODCALLTYPE GetDeviceData_Hook(void* self, DWORD cbObj,
        DIDEVICEOBJECTDATA* rgdod, DWORD* inout, DWORD flags) {
    const bool trace = (g_gdCalls < 3);
    if (trace) Log("GD#%d: enter cbObj=%lu rgdod=%p inout=%p flags=0x%lX",
                    g_gdCalls, cbObj, rgdod, inout, flags);
    if (!o_GetData) return E_FAIL;
    HRESULT hr = o_GetData(self, cbObj, rgdod, inout, flags);
    ++g_gdCalls;

    // Stride by the caller's cbObj, never by our struct size. Only touch the
    // x/y fields if the layout we expect actually fits in the caller's record.
    if (SUCCEEDED(hr) && rgdod && inout && isMouseDev(self) &&
        !(flags & DIGDD_PEEK) && cbObj >= sizeof(DIDEVICEOBJECTDATA)) {
        if (!g_loggedGD) {
            g_loggedGD = true;
            Log("dinput: BUFFERED mouse path active (GetDeviceData cbObj=%lu, "
                "%lu events)", cbObj, *inout);
        }
        BYTE* base = (BYTE*)rgdod;
        for (DWORD i = 0; i < *inout; ++i) {
            DIDEVICEOBJECTDATA* e = (DIDEVICEOBJECTDATA*)(base + (size_t)i * cbObj);
            if (e->dwOfs == DIMOFS_X || e->dwOfs == DIMOFS_Y) {
                long d = (long)(LONG)e->dwData;
                e->dwData = (DWORD)g_filter.ProcessBuffered(d);
            }
        }
    }
    return hr;
}

static HRESULT STDMETHODCALLTYPE Acquire_Hook(void* self) {
    const bool trace = (g_acqCalls < 3);
    if (trace) Log("ACQ#%d: enter self=%p o_Acquire=%p", g_acqCalls, self,
                    (void*)o_Acquire);
    if (!o_Acquire) return E_FAIL;
    HRESULT hr = o_Acquire(self);
    ++g_acqCalls;
    if (trace) Log("ACQ#%d: orig hr=0x%08lX mouseDev=%d", g_acqCalls - 1, hr,
                    (int)isMouseDev(self));
    if (isMouseDev(self)) {
        g_filter.NotifyAcquire();      // arms post-acquire flush -> kills pause flip
        if (LogVerbose()) Log("dinput: mouse Acquire (hr=0x%08lX)", hr);
    }
    return hr;
}

static HRESULT STDMETHODCALLTYPE Unacquire_Hook(void* self) {
    if (!o_Unacquire) return E_FAIL;
    if (isMouseDev(self) && LogVerbose()) Log("dinput: mouse Unacquire");
    return o_Unacquire(self);
}

// ---- IDirectInput8::CreateDevice hook --------------------------------------

static HRESULT STDMETHODCALLTYPE CreateDevice_Hook(void* self, const GUID* rguid,
        void** out, void* unkOuter) {
    if (!o_CreateDevice) return E_FAIL;
    HRESULT hr = o_CreateDevice(self, rguid, out, unkOuter);
    if (FAILED(hr) || !out || !*out) return hr;

    const bool isMouse = rguid &&
        (IsEqualGUID(*rguid, GUID_SysMouse)   ||
         IsEqualGUID(*rguid, GUID_SysMouseEm) ||
         IsEqualGUID(*rguid, GUID_SysMouseEm2));
    if (!isMouse) return hr;

    void* dev = *out;
    registerMouseDev(dev);
    Log("dinput: system mouse device created (%p)", dev);

    if (!g_devPatchDone) {
        g_devPatchDone = true;   // exactly one attempt -- never re-patch
        o_Acquire   = (Acquire_t) PatchVTable(dev, 7,  (void*)Acquire_Hook);
        o_Unacquire = (Acquire_t) PatchVTable(dev, 8,  (void*)Unacquire_Hook);
        o_GetState  = (GetState_t)PatchVTable(dev, 9,  (void*)GetDeviceState_Hook);
        o_GetData   = (GetData_t) PatchVTable(dev, 10, (void*)GetDeviceData_Hook);
        Log("dinput: device vtable o_Acquire=%p o_Unacq=%p o_GetState=%p o_GetData=%p",
            (void*)o_Acquire, (void*)o_Unacquire, (void*)o_GetState, (void*)o_GetData);
    }
    return hr;
}

// ---- public entry -----------------------------------------------------------

void PatchDirectInput8(void* idi8) {
    if (!idi8) return;
    if (g_diPatchDone) return;
    g_diPatchDone = true;        // exactly one attempt
    o_CreateDevice = (CreateDevice_t)PatchVTable(idi8, 3, (void*)CreateDevice_Hook);
    Log("dinput: IDirectInput8 %p obtained, o_CreateDevice=%p",
        idi8, (void*)o_CreateDevice);
}

} // namespace tpfix
