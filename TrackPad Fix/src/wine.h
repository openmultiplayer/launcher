// TrackpadFixSA - Wine / CrossOver environment detection
#pragma once

namespace tpfix {

enum class HostKind { Native, Wine, CrossOver };

struct HostInfo {
    HostKind    kind        = HostKind::Native;
    const char* wineVersion = "";   // e.g. "9.0" or "" on native Windows
    const char* buildId     = "";   // wine build id string, may name CrossOver
};

// Probes ntdll for wine_get_version / wine_get_build_id. Cheap; cache result.
const HostInfo& DetectHost();

inline bool IsWine() { return DetectHost().kind != HostKind::Native; }

} // namespace tpfix
