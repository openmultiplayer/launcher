// TrackpadFixSA - mouse delta sanitisation
//
// Pipeline per polled frame, per axis:
//   raw -> stuck-detect -> spike-clamp -> deadzone -> fps-scale
//       -> sensitivity -> smooth | controller-emu -> output
//
// Rationale for the bug class this addresses:
//  * Infinite spin  : under Wine a relative-axis device can return the *same*
//                     non-zero delta every poll once input desyncs. A constant
//                     non-zero delta fed to GTA SA's camera = endless rotation.
//                     -> stuck-detect zeroes a delta repeated N identical frames.
//  * Delta spikes   : focus changes / fullscreen toggles flush a huge accumulated
//                     delta in a single poll. -> hard clamp.
//  * Pause flip     : Acquire() after unpause hands back a stale buffered delta.
//                     -> flush window discards the first few post-acquire frames.
//  * High-FPS drift : GTA SA applies mouse gain per frame, not per second.
//                     -> optional dt-scaling renormalises to FpsTarget.
//  * Trackpad jitter: high-DPI trackpads emit noisy 1-2 count deltas.
//                     -> deadzone + EMA smoothing.

#include "delta_filter.h"
#include "config.h"
#include "log.h"

#include <windows.h>
#include <cmath>
#include <cstdlib>

namespace tpfix {

static long clampl(long v, long lo, long hi) {
    return v < lo ? lo : (v > hi ? hi : v);
}

double DeltaFilter::now() const {
    LARGE_INTEGER f, c;
    QueryPerformanceFrequency(&f);
    QueryPerformanceCounter(&c);
    return (double)c.QuadPart / (double)f.QuadPart;
}

void DeltaFilter::Init() {
    Reset();
    Log("filter: clampMax=%d deadzone=%d stuckFrames=%d smoothing=%.2f "
        "fpsScale=%d emu=%d sens=%.2f",
        Cfg().clampMax, Cfg().deadzone, Cfg().stuckFrames, Cfg().smoothing,
        (int)Cfg().fpsAwareScale, (int)Cfg().controllerEmu, Cfg().sensitivity);
}

void DeltaFilter::Reset() {
    m_lastRawX = m_lastRawY = 0;
    m_stuckX   = m_stuckY   = 0;
    m_smoothX  = m_smoothY  = 0.f;
    m_velX     = m_velY     = 0.f;
    m_haveTime = false;
    m_flushLeft   = 0;
    m_warpPending = false;
}

void DeltaFilter::NotifyAcquire() {
    Reset();
    if (Cfg().flushOnAcquire) m_flushLeft = Cfg().flushFrames;
}

void DeltaFilter::NotifyCursorWarp() {
    if (Cfg().guardCursorWarp) m_warpPending = true;
}

// Returns the raw value, or 0 if it has repeated identically for too long.
// A genuine continuous drag varies frame to frame; a desynced device latches.
long DeltaFilter::clampStuck(long raw, long& last, int& stuckCount) {
    if (raw != 0 && raw == last) {
        if (++stuckCount >= Cfg().stuckFrames) {
            return 0;   // stale latched delta -> kill it
        }
    } else {
        stuckCount = 0;
    }
    last = raw;
    return raw;
}

long DeltaFilter::ProcessBuffered(long d) const {
    d = clampl(d, -Cfg().clampMax, Cfg().clampMax);
    if (std::labs(d) < Cfg().deadzone) d = 0;
    return (long)lround(d * Cfg().sensitivity);
}

void DeltaFilter::Process(long& dx, long& dy) {
    if (!Cfg().enabled) return;

    const long rawX = dx, rawY = dy;

    // Discard whole frames when flushing or right after a cursor warp.
    if (m_flushLeft > 0) {
        --m_flushLeft;
        dx = dy = 0;
        if (LogVerbose()) Log("delta: flush raw=(%ld,%ld) -> 0,0", rawX, rawY);
        return;
    }
    if (m_warpPending) {
        m_warpPending = false;
        dx = dy = 0;
        if (LogVerbose()) Log("delta: warp-guard raw=(%ld,%ld) -> 0,0", rawX, rawY);
        return;
    }

    // 1. stuck / latched delta detection (the infinite-spin fix)
    long x = clampStuck(rawX, m_lastRawX, m_stuckX);
    long y = clampStuck(rawY, m_lastRawY, m_stuckY);

    // 2. spike clamp
    x = clampl(x, -Cfg().clampMax, Cfg().clampMax);
    y = clampl(y, -Cfg().clampMax, Cfg().clampMax);

    // 3. deadzone
    if (std::labs(x) < Cfg().deadzone) x = 0;
    if (std::labs(y) < Cfg().deadzone) y = 0;

    float fx = (float)x, fy = (float)y;

    // 4. frame-rate aware scaling: renormalise per-frame gain to FpsTarget.
    if (Cfg().fpsAwareScale) {
        double t = now();
        if (m_haveTime) {
            double dt = t - m_lastTime;
            if (dt > 0.0 && dt < 0.5) {           // ignore stalls / first frame
                float scale = (float)(Cfg().fpsTarget * dt);
                fx *= scale;
                fy *= scale;
            }
        }
        m_lastTime = t;
        m_haveTime = true;
    }

    // 5. sensitivity
    fx *= Cfg().sensitivity;
    fy *= Cfg().sensitivity;

    // 6. output shaping
    if (Cfg().controllerEmu) {
        // Integrate into a decaying velocity -> analogue-stick feel, no snap.
        m_velX = m_velX * Cfg().emuDecay + fx * (1.f - Cfg().emuDecay);
        m_velY = m_velY * Cfg().emuDecay + fy * (1.f - Cfg().emuDecay);
        fx = m_velX;
        fy = m_velY;
    } else if (Cfg().trackpadMode) {
        // EMA low-pass to kill high-DPI trackpad jitter.
        const float a = Cfg().smoothing;
        m_smoothX = m_smoothX * a + fx * (1.f - a);
        m_smoothY = m_smoothY * a + fy * (1.f - a);
        fx = m_smoothX;
        fy = m_smoothY;
    }

    dx = (long)lroundf(fx);
    dy = (long)lroundf(fy);

    if (LogVerbose() && (rawX || rawY || dx || dy)) {
        Log("delta: raw=(%ld,%ld) stuck=(%d,%d) -> out=(%ld,%ld)",
            rawX, rawY, m_stuckX, m_stuckY, dx, dy);
    }
}

} // namespace tpfix
