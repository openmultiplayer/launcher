import { create } from "zustand";
import {
  CacheDeleteRequest,
  CacheDeleteResult,
  CacheScanResult,
  cacheErrorCode,
  deleteCache,
  scanCache,
} from "../utils/cache";
import { Log } from "../utils/logger";
import { useSettings } from "./settings";

interface CacheManagerState {
  visible: boolean;
  busy: "idle" | "scanning" | "deleting";
  data: CacheScanResult | null;
  selected: string[];
  error: string | null;
  report: CacheDeleteResult | null;
  reportAddresses: Record<string, string>;
  open: () => void;
  close: () => void;
  refresh: () => Promise<void>;
  toggle: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  remove: (
    request: CacheDeleteRequest,
    addresses?: Record<string, string>
  ) => Promise<void>;
}

let scanGeneration = 0;

export const useCacheManager = create<CacheManagerState>()((set, get) => ({
  visible: false,
  busy: "idle",
  data: null,
  selected: [],
  error: null,
  report: null,
  reportAddresses: {},
  open: () => {
    if (get().busy === "deleting") return;
    set({ visible: true, data: null, selected: [], error: null, report: null });
    void get().refresh();
  },
  close: () => {
    if (get().busy !== "deleting") {
      scanGeneration += 1;
      set({ visible: false, data: null, selected: [], busy: "idle" });
    }
  },
  refresh: async () => {
    if (!get().visible || get().busy === "deleting") return;
    const generation = ++scanGeneration;
    const isCurrentScan = () =>
      generation === scanGeneration &&
      get().visible &&
      get().busy === "scanning";
    set({ busy: "scanning", error: null, selected: [] });
    try {
      const data = await scanCache(useSettings.getState().customGameExe);
      if (!isCurrentScan()) return;
      set({ data, selected: [], busy: "idle" });
    } catch (error) {
      if (!isCurrentScan()) return;
      Log.warn("Cache scan failed", error);
      set({ error: cacheErrorCode(error), data: null, busy: "idle" });
    }
  },
  toggle: (id) => {
    if (get().busy !== "idle") return;
    if (
      !get().data?.entries.some((entry) => entry.id === id && entry.canDelete)
    )
      return;
    set((state) => ({
      selected: state.selected.includes(id)
        ? state.selected.filter((selected) => selected !== id)
        : [...state.selected, id],
    }));
  },
  selectAll: () => {
    if (get().busy === "idle") {
      set({
        selected:
          get()
            .data?.entries.filter((entry) => entry.canDelete)
            .map((entry) => entry.id) || [],
      });
    }
  },
  clearSelection: () => {
    if (get().busy === "idle") set({ selected: [] });
  },
  remove: async (request, confirmedAddresses) => {
    if (get().busy !== "idle") return;
    scanGeneration += 1;
    const addresses = confirmedAddresses
      ? { ...confirmedAddresses }
      : Object.fromEntries(
          (get().data?.entries || []).map((entry) => [
            entry.id,
            entry.serverAddress,
          ])
        );
    set({
      busy: "deleting",
      error: null,
      report: null,
      reportAddresses: addresses,
    });
    try {
      const report = await deleteCache(request);
      set({ report });
    } catch (error) {
      Log.warn("Cache deletion failed", error);
      set({ error: cacheErrorCode(error) });
    } finally {
      set({ busy: "idle", selected: [] });
      const deletionError = get().error;
      const refresh = get().refresh();
      const generation = scanGeneration;
      await refresh;
      if (
        generation === scanGeneration &&
        get().visible &&
        deletionError &&
        !get().error
      )
        set({ error: deletionError });
    }
  },
}));
