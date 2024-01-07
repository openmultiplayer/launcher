import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SAMPDLLVersions =
  | "037R1_samp.dll"
  | "037R2_samp.dll"
  | "037R3_samp.dll"
  | "037R31_samp.dll"
  | "037R4_samp.dll"
  | "037R5_samp.dll"
  | "03DL_samp.dll"
  | "custom";

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
