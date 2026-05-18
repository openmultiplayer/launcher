// TrackpadFixSA - Wine / CrossOver environment detection
#include "wine.h"

#include <windows.h>
#include <cstring>

namespace tpfix {

typedef const char* (CDECL *wine_get_version_t)(void);
typedef void        (CDECL *wine_get_host_version_t)(const char**, const char**);
typedef const char* (CDECL *wine_get_build_id_t)(void);

static HostInfo g_host;
static bool     g_probed = false;

const HostInfo& DetectHost() {
    if (g_probed) return g_host;
    g_probed = true;

    HMODULE ntdll = GetModuleHandleA("ntdll.dll");
    if (!ntdll) return g_host;

    // wine_get_version is the canonical Wine marker. CrossOver exports it too.
    auto getVer   = (wine_get_version_t)  GetProcAddress(ntdll, "wine_get_version");
    auto getBuild = (wine_get_build_id_t) GetProcAddress(ntdll, "wine_get_build_id");
    if (!getVer) return g_host;   // genuine native Windows

    g_host.kind        = HostKind::Wine;
    g_host.wineVersion = getVer();
    if (getBuild) g_host.buildId = getBuild();

    // CrossOver ships a customised Wine; its build id / version embeds the name.
    if ((g_host.buildId     && strstr(g_host.buildId,     "CrossOver")) ||
        (g_host.wineVersion && strstr(g_host.wineVersion, "CrossOver"))) {
        g_host.kind = HostKind::CrossOver;
    }
    // Whisky is plain Wine-staging under the hood -> reported as Wine, which is fine.
    return g_host;
}

} // namespace tpfix
