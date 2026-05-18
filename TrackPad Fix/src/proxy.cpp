// TrackpadFixSA - dinput8.dll proxy entry point
//
// Dropped into the GTA SA folder AS dinput8.dll. The game imports dinput8.dll
// normally, so the executable (and DRM/anti-tamper on the Rockstar Launcher
// build) sees nothing unusual -- no IAT edits, no code patches.
//
// IMPORTANT (Wine/CrossOver): Wine loads its *builtin* dinput8 first by
// default and ignores this file. A DLL override `dinput8 = native,builtin`
// must be set or the proxy never loads. See README / boot log.
//
// Name-collision fix: the loader keys modules by base name, so
// LoadLibrary("system32\\dinput8.dll") would just return us again and the
// proxy would call itself (stack overflow). We copy the real DLL to a distinct
// name (dinput8_tpfix.dll) and load that.
//
// Standalone: no SilentPatch, no .asi, nothing else required.
//
// Boot diagnostics: every step is appended to TrackpadFixSA.boot.log next to
// the DLL using ONLY kernel32/user32 (no CRT) -- safe even inside DllMain and
// readable without a terminal.

#include "dinput_hook.h"
#include "delta_filter.h"
#include "config.h"
#include "wine.h"
#include "log.h"

#include <windows.h>
#define DIRECTINPUT_VERSION 0x0800
#include <dinput.h>
#include <cstdarg>
#include <cstring>
#include <cstdio>

using namespace tpfix;

// ---- real dinput8 exports ---------------------------------------------------

typedef HRESULT         (WINAPI *DI8Create_t)(HINSTANCE, DWORD, REFIID, LPVOID*, LPUNKNOWN);
typedef HRESULT         (WINAPI *CanUnload_t)(void);
typedef HRESULT         (WINAPI *GetClass_t)(REFCLSID, REFIID, LPVOID*);
typedef HRESULT         (WINAPI *RegSrv_t)(void);
typedef LPCDIDATAFORMAT (WINAPI *GetDf_t)(void);

static HMODULE     g_self      = nullptr;
static HMODULE     g_realDI8   = nullptr;
static DI8Create_t r_DI8Create = nullptr;
static CanUnload_t r_CanUnload = nullptr;
static GetClass_t  r_GetClass  = nullptr;
static RegSrv_t    r_RegSrv    = nullptr;
static RegSrv_t    r_UnregSrv  = nullptr;
static GetDf_t     r_GetDf     = nullptr;

static char          g_moduleDir[MAX_PATH] = {0};
static char          g_bootLog[MAX_PATH]   = {0};
static volatile LONG g_initDone = 0;

// ---- CRT-free boot logger (kernel32 + user32 only) -------------------------
// Appends one line. Safe in DllMain / under the loader lock. Survives a crash.

static void bootRaw(const char* s, DWORD len) {
    if (!g_bootLog[0]) { OutputDebugStringA(s); return; }
    HANDLE h = CreateFileA(g_bootLog, FILE_APPEND_DATA,
                           FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr,
                           OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (h != INVALID_HANDLE_VALUE) {
        SetFilePointer(h, 0, nullptr, FILE_END);
        DWORD w = 0;
        WriteFile(h, s, len, &w, nullptr);
        CloseHandle(h);
    }
    OutputDebugStringA(s);
}

// wvsprintfA is user32 (no CRT). Supports %s %d %u %x %X %c %ld %lx, NOT %p/%f.
static void boot(const char* fmt, ...) {
    char buf[512];
    va_list ap;
    va_start(ap, fmt);
    int n = wvsprintfA(buf, fmt, ap);
    va_end(ap);
    if (n < 0) n = 0;
    if (n > 500) n = 500;
    buf[n] = '\n';
    buf[n + 1] = 0;
    bootRaw(buf, (DWORD)n + 1);
}

// ---- bring-up (DllMain, minimal, CRT-free path until the real DLL is up) ---

static bool SetupRealDInput8() {
    char realPath[MAX_PATH];
    wsprintfA(realPath, "%s\\dinput8_tpfix.dll", g_moduleDir);

    char sysDir[MAX_PATH] = {0};
    UINT n = GetSystemDirectoryA(sysDir, sizeof(sysDir));
    if (n == 0 || n >= sizeof(sysDir)) { boot("TPFIX: GetSystemDirectory FAIL"); return false; }
    char sysDll[MAX_PATH];
    wsprintfA(sysDll, "%s\\dinput8.dll", sysDir);
    boot("TPFIX: sys=%s", sysDll);
    boot("TPFIX: copy=%s", realPath);

    if (GetFileAttributesA(realPath) == INVALID_FILE_ATTRIBUTES) {
        if (!CopyFileA(sysDll, realPath, FALSE)) {
            boot("TPFIX: CopyFileA FAILED gle=%lu", GetLastError());
            return false;
        }
        boot("TPFIX: copied real dinput8");
    } else {
        boot("TPFIX: dinput8_tpfix.dll already present");
    }

    g_realDI8 = LoadLibraryA(realPath);
    if (!g_realDI8) {
        boot("TPFIX: LoadLibrary(real) FAILED gle=%lu", GetLastError());
        return false;
    }
    if (g_realDI8 == g_self) {
        boot("TPFIX: real==self, refusing (would recurse)");
        g_realDI8 = nullptr;
        return false;
    }
    boot("TPFIX: real dinput8 handle=%lx self=%lx",
         (unsigned long)(ULONG_PTR)g_realDI8, (unsigned long)(ULONG_PTR)g_self);

    r_DI8Create = (DI8Create_t)GetProcAddress(g_realDI8, "DirectInput8Create");
    r_CanUnload = (CanUnload_t)GetProcAddress(g_realDI8, "DllCanUnloadNow");
    r_GetClass  = (GetClass_t) GetProcAddress(g_realDI8, "DllGetClassObject");
    r_RegSrv    = (RegSrv_t)   GetProcAddress(g_realDI8, "DllRegisterServer");
    r_UnregSrv  = (RegSrv_t)   GetProcAddress(g_realDI8, "DllUnregisterServer");
    r_GetDf     = (GetDf_t)    GetProcAddress(g_realDI8, "GetdfDIJoystick");
    boot("TPFIX: r_DI8Create=%lx", (unsigned long)(ULONG_PTR)r_DI8Create);
    return r_DI8Create != nullptr;
}

// Config + logging. Idempotent; lazy on the first DirectInput8Create call,
// which is game-runtime (NOT the loader lock) so CRT file I/O is safe.
static void EnsureInit() {
    if (InterlockedCompareExchange(&g_initDone, 1, 0) != 0) return;
    boot("TPFIX: EnsureInit");

    LogInit(g_moduleDir);
    const HostInfo& host = DetectHost();
    Log("TrackpadFixSA (standalone dinput8 proxy) | host=%s wine=%s build=%s",
        host.kind == HostKind::Native    ? "Native"
      : host.kind == HostKind::CrossOver ? "CrossOver" : "Wine",
        host.wineVersion[0] ? host.wineVersion : "-",
        host.buildId[0]     ? host.buildId     : "-");

    Config cfg;
    LoadConfig(g_moduleDir, cfg);
    Filter().Init();
    Log("TrackpadFixSA armed (enabled=%d)", (int)cfg.enabled);
}

// ---- exported dinput8 surface ----------------------------------------------

extern "C" {

__declspec(dllexport)
HRESULT WINAPI DirectInput8Create(HINSTANCE hinst, DWORD ver, REFIID riid,
                                  LPVOID* out, LPUNKNOWN unkOuter) {
    boot("TPFIX: DirectInput8Create called");
    EnsureInit();
    if (!r_DI8Create || (void*)r_DI8Create == (void*)DirectInput8Create) {
        boot("TPFIX: no real DirectInput8Create -- abort (no recursion)");
        return E_FAIL;
    }
    HRESULT hr = r_DI8Create(hinst, ver, riid, out, unkOuter);
    boot("TPFIX: real DI8Create hr=%lx", (unsigned long)hr);
    if (SUCCEEDED(hr) && out && *out && Cfg().enabled) {
        PatchDirectInput8(*out);
        boot("TPFIX: PatchDirectInput8 done");
    }
    return hr;
}

__declspec(dllexport)
HRESULT WINAPI DllCanUnloadNow(void) {
    return r_CanUnload ? r_CanUnload() : S_FALSE;
}

__declspec(dllexport)
HRESULT WINAPI DllGetClassObject(REFCLSID rclsid, REFIID riid, LPVOID* ppv) {
    return r_GetClass ? r_GetClass(rclsid, riid, ppv) : E_NOINTERFACE;
}

__declspec(dllexport)
HRESULT WINAPI DllRegisterServer(void) {
    return r_RegSrv ? r_RegSrv() : E_FAIL;
}

__declspec(dllexport)
HRESULT WINAPI DllUnregisterServer(void) {
    return r_UnregSrv ? r_UnregSrv() : E_FAIL;
}

__declspec(dllexport)
LPCDIDATAFORMAT WINAPI GetdfDIJoystick(void) {
    return r_GetDf ? r_GetDf() : nullptr;
}

} // extern "C"

// ---- DllMain ----------------------------------------------------------------

BOOL WINAPI DllMain(HINSTANCE hInst, DWORD reason, LPVOID) {
    if (reason == DLL_PROCESS_ATTACH) {
        g_self = hInst;
        DisableThreadLibraryCalls(hInst);

        // Derive folder + boot-log path with kernel32 only, then fresh-start it.
        char selfPath[MAX_PATH] = {0};
        if (GetModuleFileNameA(hInst, selfPath, sizeof(selfPath) - 1)) {
            lstrcpynA(g_moduleDir, selfPath, sizeof(g_moduleDir));
            char* slash = strrchr(g_moduleDir, '\\');
            if (slash) {
                *slash = 0;                       // g_moduleDir = folder
                wsprintfA(g_bootLog, "%s\\TrackpadFixSA.boot.log", g_moduleDir);
                DeleteFileA(g_bootLog);           // truncate per session
            }
        }

        boot("TPFIX: DllMain attach, self=%s", selfPath);
        if (SetupRealDInput8())
            boot("TPFIX: real dinput8 ready");
        else
            boot("TPFIX: real dinput8 setup FAILED -- input fix inactive");
    }
    return TRUE;
}
