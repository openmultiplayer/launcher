import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { darkThemeColors, lightThemeColors } from "./constants/theme";
import AddThirdPartyServerModal from "./containers/AddThirdPartyServer";
import MainView from "./containers/MainBody";
import NavBar from "./containers/NavBar";
import JoinServerPrompt from "./containers/JoinServerPrompt";
import ContextMenu from "./containers/ServerContextMenu";
import SettingsModal from "./containers/Settings";
import WindowTitleBar from "./containers/WindowTitleBar";
import { ThemeContext } from "./contexts/theme";
import { useAppState } from "./states/app";
import { fetchServers, fetchUpdateInfo } from "./utils/helpers";
import { ListType } from "./utils/types";

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
          <View style={{ flex: 1, width: "100%" }}>
            <NavBar onListChange={(type) => setCurrentListType(type)} />
            <MainView listType={currentListType} />
            <ContextMenu />
            <JoinServerPrompt />
            <SettingsModal />
            <AddThirdPartyServerModal />
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
