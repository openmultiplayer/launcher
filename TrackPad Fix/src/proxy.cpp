// TrackpadFixSA - vorbisFile.dll proxy entry point
//
// Why vorbisFile.dll (not dinput8.dll):
//   GTA SA imports vorbisFile.dll (real libvorbisfile shipped BY THE GAME, not
//   a Wine builtin). Replacing/forwarding it is safe -- it is an ordinary PE.
//   Wine has no vorbisFile builtin, so it loads our app-dir file with no DLL
//   override needed.
//
//   The earlier dinput8.dll proxy failed because the only way to obtain the
//   real DirectInput under that name was to COPY the Wine builtin dinput8 and
//   load it as native -- a copied builtin cannot bind input (Acquire returns
//   E_ACCESSDENIED) and crashes. Proven by the Enabled=0 isolation test.
//
// What this does instead:
//   1. forward every vorbisFile export to the user-renamed original
//      (vorbisFile_o.dll) via naked jmp thunks (calling-convention agnostic),
//   2. LoadLibrary the REAL Wine-builtin dinput8 (loaded normally, behaves
//      exactly like vanilla -- never copied),
//   3. inline-hook dinput8!DirectInput8Create in memory (its code, not the
//      DRM-wrapped game executable) and install the delta filter on the COM
//      vtables from there.
//
// Standalone: no SilentPatch, no .asi.

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

// ---- vorbisFile export forwarding ------------------------------------------
// Full standard libvorbisfile surface. Each export is a naked thunk that jumps
// straight to the resolved real function -- transparent for any signature /
// calling convention since we never touch args, stack or registers.

#define VORBIS_EXPORTS(X) \
    X(ov_clear) X(ov_open) X(ov_open_callbacks) X(ov_test) \
    X(ov_test_callbacks) X(ov_test_open) X(ov_bitrate) X(ov_bitrate_instant) \
    X(ov_streams) X(ov_seekable) X(ov_serialnumber) X(ov_raw_total) \
    X(ov_pcm_total) X(ov_time_total) X(ov_raw_seek) X(ov_pcm_seek) \
    X(ov_pcm_seek_page) X(ov_time_seek) X(ov_time_seek_page) X(ov_raw_tell) \
    X(ov_pcm_tell) X(ov_time_tell) X(ov_info) X(ov_comment) X(ov_read) \
    X(ov_read_float) X(ov_crosslap) X(ov_halfrate) X(ov_halfrate_p) \
    X(ov_fopen) X(ov_raw_seek_lap) X(ov_pcm_seek_lap) X(ov_pcm_seek_page_lap) \
    X(ov_time_seek_lap) X(ov_time_seek_page_lap) X(ov_read_filter)

#define DECL_PTR(n)  static FARPROC p_##n = nullptr;
VORBIS_EXPORTS(DECL_PTR)

#define MAKE_THUNK(n)                                                       \
    extern "C" __declspec(dllexport) __attribute__((naked)) void n(void) {  \
        __asm__ __volatile__("jmp *%0" :: "m"(p_##n));                      \
    }
VORBIS_EXPORTS(MAKE_THUNK)

// ---- state ------------------------------------------------------------------

typedef HRESULT (WINAPI *DI8Create_t)(HINSTANCE, DWORD, REFIID, LPVOID*, LPUNKNOWN);

static HMODULE       g_self     = nullptr;
static HMODULE       g_orig     = nullptr;   // vorbisFile_o.dll
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
    Log("TrackpadFixSA (vorbisFile proxy) | host=%s wine=%s build=%s",
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

// ---- DllMain ----------------------------------------------------------------

static void Setup() {
    // Forward target: the original audio DLL the user renamed.
    char orig[MAX_PATH];
    wsprintfA(orig, "%s\\vorbisFile_o.dll", g_moduleDir);
    g_orig = LoadLibraryA(orig);
    if (!g_orig) {
        boot("TPFIX: vorbisFile_o.dll MISSING gle=%lu -- rename the original!",
             GetLastError());
    } else {
        int ok = 0, miss = 0;
        #define RES_PTR(n) p_##n = GetProcAddress(g_orig, #n); \
                           if (p_##n) ++ok; else ++miss;
        VORBIS_EXPORTS(RES_PTR)
        boot("TPFIX: vorbisFile_o.dll loaded, %d exports resolved, %d missing",
             ok, miss);
    }

    // Real Wine-builtin dinput8 (we are vorbisFile, so no name collision and
    // no copy -- this is the genuine, fully functional implementation).
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
        boot("TPFIX: DllMain attach (vorbisFile proxy), self=%s", selfPath);
        Setup();
    }
    return TRUE;
}
