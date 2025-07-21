import { invoke } from "@tauri-apps/api";
import {
  LogicalSize,
  appWindow,
  type PhysicalSize,
} from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { DEBUG_MODE, IN_GAME, IN_GAME_PROCESS_ID } from "./constants/app";
import AddThirdPartyServerModal from "./containers/AddThirdPartyServer";
import ExternalServerHandler from "./containers/ExternalServerHandler";
import JoinServerPrompt from "./containers/JoinServerPrompt";
import LoadingScreen from "./containers/LoadingScreen";
import MainView from "./containers/MainBody";
import MessageBox from "./containers/MessageBox";
import NavBar from "./containers/NavBar";
import Notification from "./containers/Notification";
import ContextMenu from "./containers/ServerContextMenu";
import SettingsModal from "./containers/Settings";
import WindowTitleBar from "./containers/WindowTitleBar";
import i18n from "./locales";
import { useGenericPersistentState } from "./states/genericStates";
import { useTheme } from "./states/theme";
import { debounce } from "./utils/debounce";
import {
  checkIfProcessAlive,
  fetchServers,
  fetchUpdateInfo,
  generateLanguageFilters,
} from "./utils/helpers";
import { sc } from "./utils/sizeScaler";
// import MouseFollower from "./components/MouseFollower";

const App = () => {
  const [loading, setLoading] = useState(!IN_GAME);
  const [maximized, setMaximized] = useState(false);
  const { theme } = useTheme();
  const { language } = useGenericPersistentState();
  const windowSize = useRef<PhysicalSize>();
  const mainWindowSize = useRef<LogicalSize>();

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

  const initializeApp = async () => {
    fetchServers();
    fetchUpdateInfo();
    generateLanguageFilters();

    mainWindowSize.current = (await appWindow.innerSize()).toLogical(
      await appWindow.scaleFactor()
    );
    // Set window attributes for loading screen
    appWindow.setResizable(false);
    appWindow.setSize(new LogicalSize(250, 300));
    appWindow.center();
  };

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    let killResizeListener: (() => void) | null = null;

    const setupListeners = async () => {
      document.addEventListener("contextmenu", (event) => {
        try {
          if (DEBUG_MODE == false) {
            event.preventDefault();
          }
        } catch (e) {}
      });

      killResizeListener = await appWindow.onResized(windowResizeListener);
    };

    setupListeners();
    initializeApp();

    if (IN_GAME) {
      setInterval(async () => {
        if ((await checkIfProcessAlive(IN_GAME_PROCESS_ID)) == false) {
          invoke("send_message_to_game", {
            id: IN_GAME_PROCESS_ID,
            message: "close_overlay",
          });
          setTimeout(() => {
            appWindow.close();
          }, 300);
        }
      }, 200);
    }

    return () => {
      if (killResizeListener) killResizeListener();
    };
  }, []);

  if (loading) {
    return (
      <LoadingScreen
        onEnd={async () => {
          await appWindow.setResizable(true);
          await appWindow.setSize(
            mainWindowSize.current
              ? mainWindowSize.current
              : new LogicalSize(1000, 700)
          );
          await appWindow.center();
          setLoading(false);
        }}
      />
    );
  }

  return (
    <View
      style={[styles.app, { padding: maximized || IN_GAME ? 0 : 4 }]}
      key={language}
    >
      <View
        style={[
          styles.appView,
          {
            borderRadius: maximized || IN_GAME ? 0 : sc(10),
            backgroundColor: theme.secondary,
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
          <ExternalServerHandler />
          <Notification />
          <MessageBox />
        </View>
      </View>
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
