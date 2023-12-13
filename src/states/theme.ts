import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  ThemeColors,
  darkThemeColors,
  lightThemeColors,
} from "../constants/theme";

interface ThemePersistentState {
  theme: ThemeColors;
  themeType: "light" | "dark";
  setTheme: (theme: "dark" | "light") => void;
}

const useTheme = create<ThemePersistentState>()(
  persist(
    (set) => ({
      theme: darkThemeColors,
      themeType: "dark",
      setTheme: (theme: "dark" | "light") =>
        set({
          themeType: theme,
          theme: theme === "dark" ? darkThemeColors : lightThemeColors,
        }),
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { useTheme };
