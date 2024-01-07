import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SAMPDLLVersions } from "../utils/types";

interface SettingsPersistentState {
  nickName: string;
  gtasaPath: string;
  sampVersion: SAMPDLLVersions;
  setNickName: (name: string) => void;
  setGTASAPath: (path: string) => void;
  setSampVersion: (version: SAMPDLLVersions) => void;
}

const useSettings = create<SettingsPersistentState>()(
  persist(
    (set) => ({
      nickName: "",
      gtasaPath: "",
      sampVersion: "custom",
      setNickName: (name) => set({ nickName: name }),
      setGTASAPath: (path) => set({ gtasaPath: path }),
      setSampVersion: (version) => set({ sampVersion: version }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { useSettings };

