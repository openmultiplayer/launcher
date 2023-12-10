import { process } from "@tauri-apps/api";
import { appWindow, type PhysicalSize } from "@tauri-apps/api/window";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { darkThemeColors, lightThemeColors } from "./constants/theme";
import AddThirdPartyServerModal from "./containers/AddThirdPartyServer";
import JoinServerPrompt from "./containers/JoinServerPrompt";
import MainView from "./containers/MainBody";
import MessageBox from "./containers/MessageBox";
import NavBar from "./containers/NavBar";
import Notification from "./containers/Notification";
import ContextMenu from "./containers/ServerContextMenu";
import SettingsModal from "./containers/Settings";
import WindowTitleBar from "./containers/WindowTitleBar";
import { ThemeContext } from "./contexts/theme";
import i18n from "./locales";
import { useGenericPersistentState } from "./states/genericStates";
import { debounce } from "./utils/debounce";
import { fetchServers, fetchUpdateInfo } from "./utils/helpers";
import { sc } from "./utils/sizeScaler";

const App = () => {
  const [themeType, setTheme] = useState<"light" | "dark">("dark");
  const [maximized, setMaximized] = useState<boolean>(false);
  const { theme } = useContext(ThemeContext);
  const { language } = useGenericPersistentState();
  const windowSize = useRef<PhysicalSize>();

  const windowResizeListener = useCallback(
    debounce(async ({ payload }: { payload: PhysicalSize }) => {
      if (
        payload.width !== windowSize.current?.width ||
        payload.height !== windowSize.current?.height
      )
        setMaximized(await appWindow.isMaximized());

      windowSize.current = payload;
    }, 50),
    []
  );

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    let killResizeListener: (() => void) | null = null;

    const setupListeners = async () => {
      document.addEventListener("contextmenu", (event) => {
        try {
          // @ts-ignore
          if (process && process.env.NODE_DEV !== "development") {
            event.preventDefault();
          }
        } catch (e) {}
      });

      killResizeListener = await appWindow.onResized(windowResizeListener);
    };

    fetchServers();
    fetchUpdateInfo();
    setupListeners();

    return () => {
      if (killResizeListener) killResizeListener();
    };
  }, []);

  useEffect(() => {
    console.log("ya aliiii", theme);
  }, []);

  return (
    <View style={[styles.app, { padding: maximized ? 0 : 4 }]} key={language}>
      <ThemeContext.Provider
        value={{
          themeType,
          theme: themeType === "dark" ? darkThemeColors : lightThemeColors,
          setTheme,
        }}
      >
        <View
          style={[
            styles.appView,
            {
              borderRadius: maximized ? 0 : 8,
              backgroundColor: theme.appBackgroundColor,
            },
          ]}
        >
          <WindowTitleBar />
          <View style={styles.appBody}>
            <NavBar />
            <MainView />
            <ContextMenu />
            <JoinServerPrompt />
            <SettingsModal />
            <AddThirdPartyServerModal />
            <Notification />
            <MessageBox />
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
  appBody: {
    flex: 1,
    width: "100%",
    paddingHorizontal: sc(15),
    paddingBottom: sc(15),
  },
});

export default App;
