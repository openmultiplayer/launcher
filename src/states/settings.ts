import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SettingsPersistentState {
  nickName: string;
  gtasaPath: string;
  setNickName: (name: string) => void;
  setGTASAPath: (path: string) => void;
}

const useSettingsStore = create<SettingsPersistentState>()(
  persist(
    (set) => ({
      nickName: "",
      gtasaPath: "F:/Games/GTA San Andreas BU/GTA San Andreas",
      setNickName: (name) => set({ nickName: name }),
      setGTASAPath: (path) => set({ gtasaPath: path }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { useSettingsStore };
