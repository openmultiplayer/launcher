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
import { useAppState } from "./states/app";
import WindowTitleBar from "./containers/WindowTitleBar";
import PasswordModal from "./containers/PasswordModal";

const App = () => {
  const [themeType, setTheme] = useState<"light" | "dark">("light");
  const [currentListType, setCurrentListType] = useState<ListType>("favorites");
  const { maximized } = useAppState();

  useEffect(() => {
    fetchServers();
    fetchUpdateInfo();
  }, []);

  return (
    <View style={[styles.app, { padding: maximized ? 0 : 4 }]}>
      <ThemeContext.Provider
        value={{
          themeType,
          theme: themeType === "dark" ? darkThemeColors : lightThemeColors,
          setTheme,
        }}
      >
        <View style={[styles.appView, { borderRadius: maximized ? 0 : 8 }]}>
          <WindowTitleBar />
          <View style={{ height: "100%", width: "100%", paddingBottom: 25 }}>
            <NavBar onListChange={(type) => setCurrentListType(type)} />
            <MainView listType={currentListType} />
            <ContextMenu />
            <PasswordModal />
            <SettingsModal />
          </View>
        </View>
      </ThemeContext.Provider>
    </View>
  );
};

const styles = StyleSheet.create({
  app: {
    // @ts-ignore
    height: "100vh",
    // @ts-ignore
    width: "100vw",
  },
  appView: {
    height: "100%",
    width: "100%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4.65,
  },
});

export default App;
