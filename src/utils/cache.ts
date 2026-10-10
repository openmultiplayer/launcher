import { invoke } from "@tauri-apps/api";

export type GameState = "stopped" | "running" | "unknown";

export interface CacheEntry {
  id: string;
  folderName: string;
  ip: string;
  port: number;
  serverAddress: string;
  sizeBytes: string;
  fileCount: number;
  complete: boolean;
  canDelete: boolean;
  issueCode: string | null;
}

export interface CacheScanResult {
  scanId: string | null;
  rootPath: string | null;
  rootStatus: "present" | "missing" | "unsupported";
  gameState: GameState;
  entries: CacheEntry[];
  totalKnownSizeBytes: string;
  totalKnownFileCount: number;
  complete: boolean;
}

export interface CacheDeleteRequest {
  scanId: string;
  entryIds: string[];
  customGameExe?: string;
}

export interface CacheDeleteResult {
  items: {
    id: string;
    status: "deleted" | "already_missing" | "failed" | "partial" | "skipped";
    removedResourceBytes: string;
    errorCode: string | null;
  }[];
  stoppedReason: string | null;
}

export const scanCache = (customGameExe?: string) =>
  invoke<CacheScanResult>("scan_samp_cache", { customGameExe });

export const deleteCache = (request: CacheDeleteRequest) =>
  invoke<CacheDeleteResult>("delete_samp_cache", { request });

export const formatCacheBytes = (value: string): string => {
  const bytes = BigInt(value);
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
  let divisor = 1n;
  let unit = 0;
  while (bytes >= divisor * 1024n && unit < units.length - 1) {
    divisor *= 1024n;
    unit++;
  }
  if (unit === 0) return `${bytes} B`;
  const hundredths = (bytes * 100n) / divisor;
  return `${hundredths / 100n}.${String(hundredths % 100n).padStart(2, "0")} ${units[unit]}`;
};

const ERROR_CODES = new Set([
  "unsupported_platform",
  "documents_unavailable",
  "invalid_cache_root",
  "access_denied",
  "invalid_selection",
  "stale_scan",
  "unsafe_path",
  "reparse_point",
  "game_running",
  "process_check_failed",
  "operation_in_progress",
  "cache_changed",
  "delete_failed",
  "scan_failed",
  "scan_limit",
  "size_overflow",
  "already_missing",
]);

export const cacheErrorCode = (error: unknown): string => {
  const value = String(error);
  return ERROR_CODES.has(value) ? value : "scan_failed";
};
