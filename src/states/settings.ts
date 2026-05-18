import { emit, listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { stateStorage } from "../utils/stateStorage";
import { SAMPDLLVersions } from "../utils/types";

interface SettingsPersistentState {
  nickName: string;
  gtasaPath: string;
  customGameExe: string;
  sampVersion: SAMPDLLVersions;
  dataMerged: boolean;
  // macOS: override the CrossOver bottle name if it is not the default
  // "Rockstar Games Launcher".
  bottleName: string;
  setNickName: (name: string) => void;
  setGTASAPath: (path: string) => void;
  setCustomGameExe: (fileName: string) => void;
  setSampVersion: (version: SAMPDLLVersions) => void;
  setBottleName: (name: string) => void;
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
      bottleName: "",
      setNickName: (name) =>
        set(() => {
          emitWithDelay("setNickName", name);
          return { nickName: name };
        }),
      setGTASAPath: (path) => set({ gtasaPath: path }),
      setCustomGameExe: (fileName) => set({ customGameExe: fileName }),
      setSampVersion: (version) => set({ sampVersion: version }),
      setBottleName: (name) => set({ bottleName: name }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => stateStorage),
    }
  )
);

["setNickName"].forEach((event) =>
  listen(event, (ev) => {
    if (ev.windowLabel !== appWindow.label) {
      useSettings.persist.rehydrate();
    }
  })
);

export { useSettings };
