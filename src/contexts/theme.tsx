import { createContext } from "react";
import { ThemeColors, darkThemeColors } from "../constants/theme";

export const ThemeContext = createContext<{
  theme: ThemeColors;
  themeType: "light" | "dark";
  setTheme: (theme: "dark" | "light") => void;
}>({
  theme: darkThemeColors,
  themeType: "dark",
  // @ts-ignore
  setTheme: (theme: "dark" | "light") => {},
});
