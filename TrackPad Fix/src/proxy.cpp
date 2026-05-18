// TrackpadFixSA - version.dll proxy entry point
//
// Why version.dll (after dinput8.dll and vorbisFile.dll both failed):
//
//   * vorbisFile.dll is a GAME-shipped file -> the Rockstar Games Launcher
//     integrity check repairs/restores it on launch (our DLL never even loaded
//     -> "no logs"). Unusable when the game must run through RGL.
//   * dinput8.dll is a SYSTEM file -> RGL ignores it (it loaded fine), but the
//     only way to get real DirectInput under that name is to copy the Wine
//     BUILTIN dinput8 and load it native, which cannot bind input
//     (Acquire -> E_ACCESSDENIED -> crash, proven by the Enabled=0 test).
//
//   version.dll threads the needle:
//     - SYSTEM file  -> RGL never repairs it (no manifest entry, and it does
//       not normally exist in the game folder, so no rename either).
//     - Trivially copy-safe -> the Wine builtin version.dll is pure PE
//       version-resource parsing: no devices, no threads, no subsystem
//       binding. A copied+native instance behaves identically.
//     - The DRM-wrapped executable imports it (anti-tamper / CRT version
//       checks), so our DLL is loaded.
//
//   From there we LoadLibrary the REAL Wine-builtin dinput8 (loaded normally
//   under its own name, behaves exactly like vanilla, never copied) and
//   inline-hook DirectInput8Create in its code. The game executable is never
//   touched.
//
// Install: just drop version.dll into the GTA SA folder. No rename, no DLL
// override, no other files. Standalone (no SilentPatch / .asi).

#include "dinput_hook.h"
#include "delta_filter.h"
#include "hook.h"
#include "config.h"
#include "wine.h"
#include "log.h"

#include <windows.h>
#define DIRECTINPUT_VERSION 0x0800
#include <dinput.h>
#include <cstdarg>
#include <cstring>

using namespace tpfix;

// ---- version.dll export forwarding -----------------------------------------
// Full, stable version.dll surface. Naked thunks jump straight to the real
// (copied) version.dll -- transparent for the WINAPI/stdcall signatures since
// we never touch the stack: a jmp (not call) lets the real function return
// directly to the game and clean the stack itself.

#define VERSION_EXPORTS(X) \
    X(GetFileVersionInfoA) X(GetFileVersionInfoW) \
    X(GetFileVersionInfoSizeA) X(GetFileVersionInfoSizeW) \
    X(GetFileVersionInfoExA) X(GetFileVersionInfoExW) \
    X(GetFileVersionInfoSizeExA) X(GetFileVersionInfoSizeExW) \
    X(GetFileVersionInfoByHandle) \
    X(VerQueryValueA) X(VerQueryValueW) \
    X(VerLanguageNameA) X(VerLanguageNameW) \
    X(VerFindFileA) X(VerFindFileW) \
    X(VerInstallFileA) X(VerInstallFileW)

// Internal thunk symbols (tp_*) exported under the real undecorated names via
// version.def -- avoids clashing with the prototypes in <winver.h>.
#define DECL_PTR(n)  static FARPROC p_##n = nullptr;
VERSION_EXPORTS(DECL_PTR)

#define MAKE_THUNK(n)                                                  \
    extern "C" __attribute__((naked)) void tp_##n(void) {              \
        __asm__ __volatile__("jmp *%0" :: "m"(p_##n));                 \
    }
VERSION_EXPORTS(MAKE_THUNK)

// ---- state ------------------------------------------------------------------

typedef HRESULT (WINAPI *DI8Create_t)(HINSTANCE, DWORD, REFIID, LPVOID*, LPUNKNOWN);

static HMODULE       g_self     = nullptr;
static HMODULE       g_realVer  = nullptr;   // version_tpfix.dll (copied builtin)
static HMODULE       g_dinput8  = nullptr;   // real Wine builtin
static DI8Create_t   g_trampDI8 = nullptr;   // -> original DirectInput8Create
static char          g_moduleDir[MAX_PATH] = {0};
static char          g_bootLog[MAX_PATH]   = {0};
static volatile LONG g_initDone = 0;

// ---- CRT-free boot logger (kernel32 + user32) ------------------------------

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
    if (g_bootLog[0]) {
        HANDLE h = CreateFileA(g_bootLog, FILE_APPEND_DATA,
                               FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr,
                               OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
        if (h != INVALID_HANDLE_VALUE) {
            SetFilePointer(h, 0, nullptr, FILE_END);
            DWORD w = 0;
            WriteFile(h, buf, (DWORD)n + 1, &w, nullptr);
            CloseHandle(h);
        }
    }
    OutputDebugStringA(buf);
}

// ---- lazy config/log init (game-runtime, not under loader lock) ------------

static void EnsureInit() {
    if (InterlockedCompareExchange(&g_initDone, 1, 0) != 0) return;
    boot("TPFIX: EnsureInit");
    LogInit(g_moduleDir);
    const HostInfo& host = DetectHost();
    Log("TrackpadFixSA (version.dll proxy) | host=%s wine=%s build=%s",
        host.kind == HostKind::Native    ? "Native"
      : host.kind == HostKind::CrossOver ? "CrossOver" : "Wine",
        host.wineVersion[0] ? host.wineVersion : "-",
        host.buildId[0]     ? host.buildId     : "-");
    Config cfg;
    LoadConfig(g_moduleDir, cfg);
    Filter().Init();
    Log("TrackpadFixSA armed (enabled=%d)", (int)cfg.enabled);
}

// ---- DirectInput8Create detour ---------------------------------------------

static HRESULT WINAPI Detour_DI8(HINSTANCE hinst, DWORD ver, REFIID riid,
                                 LPVOID* out, LPUNKNOWN unkOuter) {
    boot("TPFIX: DirectInput8Create (detour)");
    EnsureInit();
    if (!g_trampDI8) return E_FAIL;
    HRESULT hr = g_trampDI8(hinst, ver, riid, out, unkOuter);
    boot("TPFIX: real DI8Create hr=%lx", (unsigned long)hr);
    if (SUCCEEDED(hr) && out && *out && Cfg().enabled) {
        PatchDirectInput8(*out);
        boot("TPFIX: PatchDirectInput8 done");
    }
    return hr;
}

// ---- bring-up ---------------------------------------------------------------

static void Setup() {
    char sysDir[MAX_PATH] = {0};
    UINT n = GetSystemDirectoryA(sysDir, sizeof(sysDir));
    if (n == 0 || n >= sizeof(sysDir)) { boot("TPFIX: GetSystemDirectory FAIL"); return; }

    // Copy-safe: version.dll is pure resource parsing, no subsystem binding.
    char srcVer[MAX_PATH], cpyVer[MAX_PATH];
    wsprintfA(srcVer, "%s\\version.dll", sysDir);
    wsprintfA(cpyVer, "%s\\version_tpfix.dll", g_moduleDir);
    if (GetFileAttributesA(cpyVer) == INVALID_FILE_ATTRIBUTES &&
        !CopyFileA(srcVer, cpyVer, FALSE)) {
        boot("TPFIX: copy version.dll FAILED gle=%lu", GetLastError());
    }
    g_realVer = LoadLibraryA(cpyVer);
    if (!g_realVer) {
        boot("TPFIX: load version_tpfix.dll FAILED gle=%lu", GetLastError());
    } else {
        int ok = 0, miss = 0;
        #define RES_PTR(n) p_##n = GetProcAddress(g_realVer, #n); \
                           if (p_##n) ++ok; else ++miss;
        VERSION_EXPORTS(RES_PTR)
        boot("TPFIX: version_tpfix.dll loaded, %d exports ok, %d missing",
             ok, miss);
    }

    // Real Wine-builtin dinput8 -- we are version.dll, so NO name collision,
    // NO copy. This is the genuine, fully functional implementation.
    g_dinput8 = LoadLibraryA("dinput8.dll");
    if (!g_dinput8) { boot("TPFIX: LoadLibrary(dinput8) FAILED gle=%lu",
                           GetLastError()); return; }
    FARPROC di8 = GetProcAddress(g_dinput8, "DirectInput8Create");
    boot("TPFIX: builtin dinput8=%lx DirectInput8Create=%lx",
         (unsigned long)(ULONG_PTR)g_dinput8, (unsigned long)(ULONG_PTR)di8);
    if (!di8) return;

    void* tramp = nullptr;
    if (InstallInlineHook((void*)di8, (void*)Detour_DI8, &tramp)) {
        g_trampDI8 = (DI8Create_t)tramp;
        boot("TPFIX: DirectInput8Create inline-hooked");
    } else {
        boot("TPFIX: inline hook FAILED -- input fix inactive (game still runs)");
    }
}

BOOL WINAPI DllMain(HINSTANCE hInst, DWORD reason, LPVOID) {
    if (reason == DLL_PROCESS_ATTACH) {
        g_self = hInst;
        DisableThreadLibraryCalls(hInst);

        char selfPath[MAX_PATH] = {0};
        if (GetModuleFileNameA(hInst, selfPath, sizeof(selfPath) - 1)) {
            lstrcpynA(g_moduleDir, selfPath, sizeof(g_moduleDir));
            char* slash = strrchr(g_moduleDir, '\\');
            if (slash) {
                *slash = 0;
                wsprintfA(g_bootLog, "%s\\TrackpadFixSA.boot.log", g_moduleDir);
                DeleteFileA(g_bootLog);
            }
        }
        boot("TPFIX: DllMain attach (version.dll proxy), self=%s", selfPath);
        Setup();
    }
    return TRUE;
}
