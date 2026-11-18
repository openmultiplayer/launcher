import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { stateStorage } from "../utils/stateStorage";

export interface ShortcutConfig {
  id: string;
  labelKey: string;
  descriptionKey: string;
  defaultKey: string;
  currentKey: string;
  category: "navigation" | "server" | "general";
}

export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  {
    id: "search",
    labelKey: "shortcut_search_label",
    descriptionKey: "shortcut_search_desc",
    defaultKey: "Ctrl+F",
    currentKey: "Ctrl+F",
    category: "navigation",
  },
  {
    id: "refresh",
    labelKey: "shortcut_refresh_label",
    descriptionKey: "shortcut_refresh_desc",
    defaultKey: "F5",
    currentKey: "F5",
    category: "server",
  },
  {
    id: "connect",
    labelKey: "shortcut_connect_label",
    descriptionKey: "shortcut_connect_desc",
    defaultKey: "Enter",
    currentKey: "Enter",
    category: "server",
  },
  {
    id: "add_server",
    labelKey: "shortcut_add_server_label",
    descriptionKey: "shortcut_add_server_desc",
    defaultKey: "Ctrl+N",
    currentKey: "Ctrl+N",
    category: "server",
  },
  {
    id: "favorite",
    labelKey: "shortcut_favorite_label",
    descriptionKey: "shortcut_favorite_desc",
    defaultKey: "Ctrl+D",
    currentKey: "Ctrl+D",
    category: "server",
  },
  {
    id: "filter",
    labelKey: "shortcut_filter_label",
    descriptionKey: "shortcut_filter_desc",
    defaultKey: "Ctrl+Shift+F",
    currentKey: "Ctrl+Shift+F",
    category: "navigation",
  },
  {
    id: "settings",
    labelKey: "shortcut_settings_label",
    descriptionKey: "shortcut_settings_desc",
    defaultKey: "Ctrl+,",
    currentKey: "Ctrl+,",
    category: "general",
  },
  {
    id: "theme",
    labelKey: "shortcut_theme_label",
    descriptionKey: "shortcut_theme_desc",
    defaultKey: "Ctrl+T",
    currentKey: "Ctrl+T",
    category: "general",
  },
  {
    id: "close_modal",
    labelKey: "shortcut_close_modal_label",
    descriptionKey: "shortcut_close_modal_desc",
    defaultKey: "Escape",
    currentKey: "Escape",
    category: "general",
  },
];

interface ShortcutsState {
  shortcuts: ShortcutConfig[];
  setShortcut: (id: string, key: string) => void;
  resetShortcut: (id: string) => void;
  resetAllShortcuts: () => void;
}

export const useShortcuts = create<ShortcutsState>()(
  persist(
    (set) => ({
      shortcuts: DEFAULT_SHORTCUTS,
      setShortcut: (id, key) =>
        set((state) => ({
          shortcuts: state.shortcuts.map((sc) =>
            sc.id === id ? { ...sc, currentKey: key } : sc
          ),
        })),
      resetShortcut: (id) =>
        set((state) => ({
          shortcuts: state.shortcuts.map((sc) =>
            sc.id === id ? { ...sc, currentKey: sc.defaultKey } : sc
          ),
        })),
      resetAllShortcuts: () =>
        set(() => ({
          shortcuts: DEFAULT_SHORTCUTS,
        })),
    }),
    {
      name: "shortcuts-storage",
      storage: createJSONStorage(() => stateStorage),
    }
  )
);
