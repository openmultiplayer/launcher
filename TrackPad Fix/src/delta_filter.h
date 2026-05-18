// TrackpadFixSA - mouse delta sanitisation
#pragma once

namespace tpfix {

// Stateful per-axis filter. One instance shared by the mouse device hooks.
// Not thread-safe by itself; DirectInput polling on GTA SA is single-threaded
// (the main loop), so all calls arrive on one thread.
class DeltaFilter {
public:
    void Init();                 // pulls live values from Cfg()
    void Reset();                // clears history; call on Acquire / focus change

    // Sanitise one immediate-mode sample in place. Call once per polled frame.
    void Process(long& dx, long& dy);

    // Sanitise one buffered event value (clamp + deadzone only, stateless-ish).
    long ProcessBuffered(long d) const;

    void NotifyAcquire();        // arms the post-acquire flush window
    void NotifyCursorWarp();     // arms a one-frame discard (cursor recentre)

private:
    long  clampStuck(long raw, long& last, int& stuckCount);
    double now() const;

    // history
    long   m_lastRawX = 0, m_lastRawY = 0;
    int    m_stuckX   = 0, m_stuckY   = 0;
    float  m_smoothX  = 0.f, m_smoothY = 0.f;   // EMA accumulators
    float  m_velX     = 0.f, m_velY    = 0.f;   // controller-emu velocity
    double m_lastTime = 0.0;
    int    m_flushLeft   = 0;                   // frames still to discard after acquire
    bool   m_warpPending = false;               // discard next frame (cursor warp)
    bool   m_haveTime    = false;
};

} // namespace tpfix
