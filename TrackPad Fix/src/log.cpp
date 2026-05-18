// TrackpadFixSA - logging
#include "log.h"

#include <windows.h>
#include <cstdio>
#include <cstdarg>
#include <cstring>

namespace tpfix {

static char  g_logPath[MAX_PATH] = {0};
static bool  g_verbose           = false;
static bool  g_ready             = false;
static bool  g_enabled           = true;

void LogInit(const char* moduleDir) {
    if (!moduleDir || !*moduleDir) return;
    _snprintf(g_logPath, sizeof(g_logPath) - 1, "%s\\TrackpadFixSA.log", moduleDir);
    g_logPath[sizeof(g_logPath) - 1] = 0;
    g_ready = true;

    // Truncate on start so the log reflects a single session.
    FILE* f = fopen(g_logPath, "w");
    if (f) {
        fputs("=== TrackpadFixSA log ===\n", f);
        fclose(f);
    }
}

void LogSetVerbose(bool on) { g_verbose = on; }
bool LogVerbose()           { return g_verbose; }
void LogSetEnabled(bool on) { g_enabled = on; }

void Log(const char* fmt, ...) {
    if (!g_ready || !g_enabled) return;

    char line[1024];
    va_list ap;
    va_start(ap, fmt);
    _vsnprintf(line, sizeof(line) - 2, fmt, ap);
    va_end(ap);
    line[sizeof(line) - 2] = 0;

    size_t n = strlen(line);
    if (n == 0 || line[n - 1] != '\n') { line[n] = '\n'; line[n + 1] = 0; }

    FILE* f = fopen(g_logPath, "a");
    if (f) { fputs(line, f); fclose(f); }
}

} // namespace tpfix
