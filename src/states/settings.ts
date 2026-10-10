import { emit, listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { stateStorage } from "../utils/stateStorage";
import { SAMPDLLVersions } from "../utils/types";

const MAX_RECENT_NICKNAMES = 5;

interface SettingsPersistentState {
  nickName: string;
  gtasaPath: string;
  customGameExe: string;
  sampVersion: SAMPDLLVersions;
  dataMerged: boolean;
  recentNicknames: string[];
  setNickName: (name: string) => void;
  addRecentNickname: (name: string) => void;
  setGTASAPath: (path: string) => void;
  setCustomGameExe: (fileName: string) => void;
  setSampVersion: (version: SAMPDLLVersions) => void;
}

const emitWithDelay = (event: string, payload: any) =>
  setTimeout(() => emit(event, payload), 200);

const useSettings = create<SettingsPersistentState>()(
  persist(
    (set) => ({
      nickName: "",
      gtasaPath: "",
      customGameExe: "",
      sampVersion: "custom",
      dataMerged: false,
      recentNicknames: [],
      setNickName: (name) =>
        set(() => {
          emitWithDelay("setNickName", name);
          return { nickName: name };
        }),
      addRecentNickname: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          emitWithDelay("setRecentNickname", trimmed);
          const rest = state.recentNicknames.filter(
            (n) => n.toLowerCase() !== trimmed.toLowerCase()
          );
          return {
            recentNicknames: [trimmed, ...rest].slice(0, MAX_RECENT_NICKNAMES),
          };
        }),
      setGTASAPath: (path) => set({ gtasaPath: path }),
      setCustomGameExe: (fileName) => set({ customGameExe: fileName }),
      setSampVersion: (version) => set({ sampVersion: version }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => stateStorage),
    }
  )
);

["setNickName", "setRecentNickname"].forEach((event) =>
  listen(event, (ev) => {
    if (ev.windowLabel !== appWindow.label) {
      useSettings.persist.rehydrate();
    }
  })
);

export { useSettings };
