import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SearchData } from "../utils/types";

interface GenericTempStates {
  filterMenu: boolean;
  searchData: SearchData;
  showFilterMenu: (show: boolean) => void;
  setSearchData: (key: keyof SearchData, value: any) => void;
}

const useGenericTempState = create<GenericTempStates>()((set, get) => ({
  filterMenu: false,
  searchData: {
    query: "",
    nonEmpty: false,
    ompOnly: false,
    sortPing: "none",
    sortPlayer: "none",
  },
  showFilterMenu: (show) => set(() => ({ filterMenu: show })),
  setSearchData: (key, value) =>
    set(() => {
      const data = { ...get().searchData };
      // @ts-ignore
      data[key] = value;
      return { searchData: { ...data } };
    }),
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

export { useGenericPersistentState, useGenericTempState };
