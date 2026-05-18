// TrackpadFixSA - logging
#pragma once

namespace tpfix {

// Initialise log file next to the .asi module. Safe to call once.
void LogInit(const char* moduleDir);

// printf-style line logger. No-op if logging disabled in config.
void Log(const char* fmt, ...);

// Toggle verbose per-frame delta tracing (debug builds / INI DebugDeltas=1).
void LogSetVerbose(bool on);
bool LogVerbose();

// Master enable (INI Logging=0 silences everything after init).
void LogSetEnabled(bool on);

} // namespace tpfix
