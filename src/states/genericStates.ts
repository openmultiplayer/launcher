import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface GenericTempStates {
  filterMenu: boolean;
  showFilterMenu: (show: boolean) => void;
}

const useGenericTempState = create<GenericTempStates>()((set) => ({
  filterMenu: false,
  showFilterMenu: (show: boolean) => set(() => ({ filterMenu: show })),
}));

interface GenericPersistentStates {
  sideLists: boolean;
  showSideLists: (show: boolean) => void;
}

const useGenericPersistentState = create<GenericPersistentStates>()(
  persist(
    (set) => ({
      sideLists: true,
      showSideLists: (show: boolean) => set(() => ({ sideLists: show })),
    }),
    {
      name: "generic-state-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { useGenericTempState, useGenericPersistentState };
