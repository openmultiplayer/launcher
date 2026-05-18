// TrackpadFixSA - INI-backed configuration
#pragma once

namespace tpfix {

struct Config {
    // --- master ---
    bool  enabled        = true;   // whole plugin on/off

    // --- delta sanitisation ---
    int   clampMax       = 220;    // hard cap on |delta| per axis (raw counts)
    int   deadzone       = 0;      // |delta| below this -> 0
    int   stuckFrames    = 6;      // identical non-zero delta N frames -> treat as stale -> 0
    float sensitivity    = 1.0f;   // post-filter multiplier

    // --- trackpad smoothing ---
    bool  trackpadMode   = true;   // enable EMA smoothing path
    float smoothing      = 0.35f;  // EMA weight of previous frame, 0..0.95

    // --- frame-rate independence ---
    bool  fpsAwareScale  = false;  // scale delta by (fpsTarget * frameDt)
    float fpsTarget      = 60.0f;

    // --- controller-style camera ---
    bool  controllerEmu  = false;  // integrate delta into a decaying velocity
    float emuDecay       = 0.82f;  // velocity retained per frame in emu mode

    // --- robustness toggles ---
    bool  flushOnAcquire = true;   // drop stale delta for a few frames after (re)Acquire
    int   flushFrames    = 3;
    bool  guardCursorWarp= true;   // discard the delta frame following a SetCursorPos warp
    bool  rawInputGuard  = false;  // also sanitise GetRawInputData (rarely needed)

    // --- environment ---
    bool  autoDetectWine = true;   // auto-tune defaults when running under Wine/CrossOver

    // --- diagnostics ---
    bool  logging        = true;
    bool  debugDeltas    = false;  // log every sanitised frame (noisy)
};

// Loads <moduleDir>\TrackpadFixSA.ini into cfg. Missing keys keep their defaults.
// Applies Wine-tuned defaults first when autoDetectWine and host is Wine/CrossOver.
void LoadConfig(const char* moduleDir, Config& cfg);

const Config& Cfg();

} // namespace tpfix
