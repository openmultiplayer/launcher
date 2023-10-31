import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SettingsPersistentState {
  nickName: string;
  gtasaPath: string;
  setNickName: (name: string) => void;
  setGTASAPath: (path: string) => void;
}

const useSettings = create<SettingsPersistentState>()(
  persist(
    (set) => ({
      nickName: "",
      gtasaPath: "",
      setNickName: (name) => set({ nickName: name }),
      setGTASAPath: (path) => set({ gtasaPath: path }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { useSettings };

