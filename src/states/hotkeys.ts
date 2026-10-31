import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { stateStorage } from "../utils/stateStorage";

export interface HotkeyConfig {
  id: string;
  labelKey: string;
  descriptionKey: string;
  defaultKey: string;
  currentKey: string;
  category: "navigation" | "server" | "general";
}

export const DEFAULT_HOTKEYS: HotkeyConfig[] = [
  {
    id: "search",
    labelKey: "hotkey_search_label",
    descriptionKey: "hotkey_search_desc",
    defaultKey: "Ctrl+F",
    currentKey: "Ctrl+F",
    category: "navigation",
  },
  {
    id: "refresh",
    labelKey: "hotkey_refresh_label",
    descriptionKey: "hotkey_refresh_desc",
    defaultKey: "F5",
    currentKey: "F5",
    category: "server",
  },
  {
    id: "connect",
    labelKey: "hotkey_connect_label",
    descriptionKey: "hotkey_connect_desc",
    defaultKey: "Enter",
    currentKey: "Enter",
    category: "server",
  },
  {
    id: "add_server",
    labelKey: "hotkey_add_server_label",
    descriptionKey: "hotkey_add_server_desc",
    defaultKey: "Ctrl+N",
    currentKey: "Ctrl+N",
    category: "server",
  },
  {
    id: "favorite",
    labelKey: "hotkey_favorite_label",
    descriptionKey: "hotkey_favorite_desc",
    defaultKey: "Ctrl+D",
    currentKey: "Ctrl+D",
    category: "server",
  },
  {
    id: "filter",
    labelKey: "hotkey_filter_label",
    descriptionKey: "hotkey_filter_desc",
    defaultKey: "Ctrl+Shift+F",
    currentKey: "Ctrl+Shift+F",
    category: "navigation",
  },
  {
    id: "settings",
    labelKey: "hotkey_settings_label",
    descriptionKey: "hotkey_settings_desc",
    defaultKey: "Ctrl+,",
    currentKey: "Ctrl+,",
    category: "general",
  },
  {
    id: "theme",
    labelKey: "hotkey_theme_label",
    descriptionKey: "hotkey_theme_desc",
    defaultKey: "Ctrl+T",
    currentKey: "Ctrl+T",
    category: "general",
  },
  {
    id: "close_modal",
    labelKey: "hotkey_close_modal_label",
    descriptionKey: "hotkey_close_modal_desc",
    defaultKey: "Escape",
    currentKey: "Escape",
    category: "general",
  },
];

interface HotkeysState {
  hotkeys: HotkeyConfig[];
  setHotkey: (id: string, key: string) => void;
  resetHotkey: (id: string) => void;
  resetAllHotkeys: () => void;
}

export const useHotkeys = create<HotkeysState>()(
  persist(
    (set) => ({
      hotkeys: DEFAULT_HOTKEYS,
      setHotkey: (id, key) =>
        set((state) => ({
          hotkeys: state.hotkeys.map((hk) =>
            hk.id === id ? { ...hk, currentKey: key } : hk
          ),
        })),
      resetHotkey: (id) =>
        set((state) => ({
          hotkeys: state.hotkeys.map((hk) =>
            hk.id === id ? { ...hk, currentKey: hk.defaultKey } : hk
          ),
        })),
      resetAllHotkeys: () =>
        set(() => ({
          hotkeys: DEFAULT_HOTKEYS,
        })),
    }),
    {
      name: "hotkeys-storage",
      storage: createJSONStorage(() => stateStorage),
    }
  )
);
