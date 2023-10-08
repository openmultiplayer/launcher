import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import NavBar from "./containers/NavBar";
import MainView from "./containers/MainBody";
import { ThemeContext } from "./contexts/theme";
import { darkThemeColors, lightThemeColors } from "./constants/theme";
import { ListType } from "./utils/types";
import { fetchServers, fetchUpdateInfo } from "./utils/helpers";
import ContextMenu from "./containers/ServerContextMenu";
import SettingsModal from "./containers/Settings";

const App = () => {
  const [themeType, setTheme] = useState<"light" | "dark">("light");
  const [currentListType, setCurrentListType] = useState<ListType>("favorites");

  useEffect(() => {
    fetchServers();
    fetchUpdateInfo();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeType,
        theme: themeType === "dark" ? darkThemeColors : lightThemeColors,
        setTheme,
      }}
    >
      <View style={styles.app}>
        <NavBar onListChange={(type) => setCurrentListType(type)} />
        <MainView listType={currentListType} />
      </View>
      <ContextMenu />
      <SettingsModal />
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  app: {
    // @ts-ignore
    height: "100vh",
    // @ts-ignore
    width: "100vw",
  },
});

export default App;
