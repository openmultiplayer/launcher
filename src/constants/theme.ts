export interface ThemeColors {
  primary: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  textPlaceholder: string;
  itemBackgroundColor: string;
  textInputBackgroundColor: string;
  serverListItemBackgroundColor: string;
}

export const darkThemeColors: ThemeColors = {
  primary: "#897AF1",
  secondary: "#1A1A1E",
  textPrimary: "#FAFAFA",
  textSecondary: "#FFFFFF40",
  textPlaceholder: "#909090",
  itemBackgroundColor: "#222227",
  textInputBackgroundColor: "#16161A",
  serverListItemBackgroundColor: "#303038",
};

export const lightThemeColors: ThemeColors = {
  primary: "#897AF1",
  secondary: "#FFFFFF",
  textPrimary: "#1A1A1E",
  textSecondary: "#1A1A1E80",
  textPlaceholder: "#6D7071",
  itemBackgroundColor: "#F3F6FC",
  textInputBackgroundColor: "#F3F6FC",
  serverListItemBackgroundColor: "#E9ECF2",
};
