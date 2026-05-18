// TrackpadFixSA - INI-backed configuration
#include "config.h"
#include "wine.h"
#include "log.h"

#include <windows.h>
#include <cstdio>
#include <cstdlib>

namespace tpfix {

static Config g_cfg;
const Config& Cfg() { return g_cfg; }

static int   GetI(const char* path, const char* k, int def) {
    return (int)GetPrivateProfileIntA("TrackpadFix", k, def, path);
}
static bool  GetB(const char* path, const char* k, bool def) {
    return GetPrivateProfileIntA("TrackpadFix", k, def ? 1 : 0, path) != 0;
}
static float GetF(const char* path, const char* k, float def) {
    char buf[64], dbuf[64];
    _snprintf(dbuf, sizeof(dbuf), "%g", def);
    GetPrivateProfileStringA("TrackpadFix", k, dbuf, buf, sizeof(buf), path);
    return (float)atof(buf);
}

void LoadConfig(const char* moduleDir, Config& cfg) {
    char path[MAX_PATH];
    _snprintf(path, sizeof(path) - 1, "%s\\TrackpadFixSA.ini", moduleDir);
    path[sizeof(path) - 1] = 0;

    // Stage 1: when running under Wine, shift the *defaults* toward the known-good
    // trackpad profile before the INI is read, so a user with no INI still benefits.
    if (cfg.autoDetectWine && IsWine()) {
        cfg.trackpadMode    = true;
        cfg.smoothing       = 0.45f;
        cfg.stuckFrames     = 5;
        cfg.clampMax        = 200;
        cfg.flushOnAcquire  = true;
        cfg.guardCursorWarp = true;
    }

    // Stage 2: explicit INI values always win over defaults.
    if (GetFileAttributesA(path) == INVALID_FILE_ATTRIBUTES) {
        Log("config: no INI at %s, using %s defaults",
            path, IsWine() ? "Wine-tuned" : "native");
    } else {
        cfg.enabled         = GetB(path, "Enabled",            cfg.enabled);
        cfg.clampMax        = GetI(path, "ClampMax",           cfg.clampMax);
        cfg.deadzone        = GetI(path, "Deadzone",           cfg.deadzone);
        cfg.stuckFrames     = GetI(path, "StuckFrames",        cfg.stuckFrames);
        cfg.sensitivity     = GetF(path, "Sensitivity",        cfg.sensitivity);
        cfg.trackpadMode    = GetB(path, "TrackpadMode",       cfg.trackpadMode);
        cfg.smoothing       = GetF(path, "Smoothing",          cfg.smoothing);
        cfg.fpsAwareScale   = GetB(path, "FpsAwareScaling",    cfg.fpsAwareScale);
        cfg.fpsTarget       = GetF(path, "FpsTarget",          cfg.fpsTarget);
        cfg.controllerEmu   = GetB(path, "ControllerEmulation",cfg.controllerEmu);
        cfg.emuDecay        = GetF(path, "EmulationDecay",     cfg.emuDecay);
        cfg.flushOnAcquire  = GetB(path, "FlushOnAcquire",     cfg.flushOnAcquire);
        cfg.flushFrames     = GetI(path, "FlushFrames",        cfg.flushFrames);
        cfg.guardCursorWarp = GetB(path, "GuardCursorWarp",    cfg.guardCursorWarp);
        cfg.rawInputGuard   = GetB(path, "RawInputGuard",      cfg.rawInputGuard);
        cfg.autoDetectWine  = GetB(path, "AutoDetectWine",     cfg.autoDetectWine);
        cfg.logging         = GetB(path, "Logging",            cfg.logging);
        cfg.debugDeltas     = GetB(path, "DebugDeltas",        cfg.debugDeltas);
    }

    // Clamp ranges so a bad INI cannot make things worse.
    if (cfg.clampMax    < 8)     cfg.clampMax    = 8;
    if (cfg.clampMax    > 5000)  cfg.clampMax    = 5000;
    if (cfg.deadzone    < 0)     cfg.deadzone    = 0;
    if (cfg.stuckFrames < 2)     cfg.stuckFrames = 2;
    if (cfg.smoothing   < 0.f)   cfg.smoothing   = 0.f;
    if (cfg.smoothing   > 0.95f) cfg.smoothing   = 0.95f;
    if (cfg.emuDecay    < 0.f)   cfg.emuDecay    = 0.f;
    if (cfg.emuDecay    > 0.98f) cfg.emuDecay    = 0.98f;
    if (cfg.fpsTarget   < 15.f)  cfg.fpsTarget   = 15.f;
    if (cfg.sensitivity < 0.05f) cfg.sensitivity = 0.05f;

    g_cfg = cfg;
    LogSetVerbose(cfg.debugDeltas);
    LogSetEnabled(cfg.logging);
}

} // namespace tpfix
