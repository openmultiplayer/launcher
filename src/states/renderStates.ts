import { create } from "zustand";

interface RenderState {
  filterMenu: boolean;
  sideLists: boolean;
  showFilterMenu: (show: boolean) => void;
  showSideLists: (show: boolean) => void;
}

const useRenderState = create<RenderState>()((set) => ({
  filterMenu: false,
  sideLists: false,
  showFilterMenu: (show: boolean) => set(() => ({ filterMenu: show })),
  showSideLists: (show: boolean) => set(() => ({ sideLists: show })),
}));

export { useRenderState };
