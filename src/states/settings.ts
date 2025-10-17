import { emit, listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { stateStorage } from "../utils/stateStorage";
import { SAMPDLLVersions } from "../utils/types";

interface SettingsPersistentState {
  nickName: string;
  gtasaPath: string;
  sampVersion: SAMPDLLVersions;
  dataMerged: boolean;
  setNickName: (name: string) => void;
  setGTASAPath: (path: string) => void;
  setSampVersion: (version: SAMPDLLVersions) => void;
}

const emitWithDelay = (event: string, payload: any) =>
  setTimeout(() => emit(event, payload), 200);

const useSettings = create<SettingsPersistentState>()(
  persist(
    (set) => ({
      nickName: "",
      gtasaPath: "",
      sampVersion: "custom",
      dataMerged: false,
      setNickName: (name) =>
        set(() => {
          emitWithDelay("setNickName", name);
          return { nickName: name };
        }),
      setGTASAPath: (path) => set({ gtasaPath: path }),
      setSampVersion: (version) => set({ sampVersion: version }),
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

