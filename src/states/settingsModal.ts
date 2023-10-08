import { create } from "zustand";

interface SettingsModalState {
  visible: boolean;
  show: () => void;
  hide: () => void;
}

const useSettingsModal = create<SettingsModalState>()((set) => ({
  visible: false,
  show: () => set(() => ({ visible: true })),
  hide: () => set(() => ({ visible: false })),
}));

export { useSettingsModal };

