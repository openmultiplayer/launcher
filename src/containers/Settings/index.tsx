import { invoke, shell } from "@tauri-apps/api";
import { open } from "@tauri-apps/api/dialog";
import { useContext } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import * as Animatable from "react-native-animatable";
import Icon from "../../components/Icon";
import StaticModal from "../../components/StaticModal";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { ThemeContext } from "../../contexts/theme";
import { useAppState } from "../../states/app";
import { useSettings } from "../../states/settings";
import { useSettingsModal } from "../../states/settingsModal";
import { checkDirectoryValidity } from "../../utils/helpers";
import { usePersistentServers } from "../../states/servers";
import { Server } from "../../utils/types";

const MODAL_WIDTH = 500;
const MODAL_HEIGHT = 270;

const SettingsModal = () => {
  const { height, width } = useWindowDimensions();
  const { nativeAppVersion, version, updateInfo, hostOS } = useAppState();
  const { theme } = useContext(ThemeContext);
  const { gtasaPath, setGTASAPath, setNickName } = useSettings();
  const { hide, visible } = useSettingsModal();

  if (!visible) {
    return null;
  }

  const selectPath = async () => {
    const selected: string = (await open({
      defaultPath:
        hostOS === "Windows_NT" ? gtasaPath.replace(/\//g, "\\") : gtasaPath,
      directory: true,
    })) as string;

    const newPath = selected.replace(/\\/g, "/");

    const isDirValid = await checkDirectoryValidity(newPath);
    if (isDirValid) setGTASAPath(newPath);
  };

  const importDataFromSAMP = async () => {
    try {
      const path: string = await invoke("get_gtasa_path_from_samp");
      if (path.length) {
        const newPath = path.replace(/\\/g, "/");
        const isDirValid = await checkDirectoryValidity(newPath);
        if (isDirValid) setGTASAPath(newPath);
      }

      const name: string = await invoke("get_nickname_from_samp");
      if (name.length) {
        setNickName(name);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const importFavListFromSAMP = async () => {
    await invoke("get_samp_favorite_list").then((a) => {
      const userData: {
        file_id: string;
        file_version: number;
        server_count: number;
        favorite_servers: {
          ip: string;
          port: number;
          name: string;
          password: string;
          rcon: string;
        }[];
      } = JSON.parse(a as string);

      if (userData.file_id === "SAMP") {
        const { addToFavorites } = usePersistentServers.getState();
        userData.favorite_servers.forEach((server) => {
          const serverInfo: Server = {
            ip: "",
            port: 0,
            hostname: "No information",
            playerCount: 0,
            maxPlayers: 0,
            gameMode: "-",
            language: "-",
            hasPassword: false,
            version: "-",
            usingOmp: false,
            partner: false,
            ping: 0,
            password: "",
            players: [],
            rules: {} as Server["rules"],
          };

          if (server.ip.length) {
            serverInfo.ip = server.ip;
            serverInfo.port = server.port;
            if (server.name.includes("(Retrieving info...)")) {
              serverInfo.hostname += ` (${serverInfo.ip}:${serverInfo.port})`;
            } else {
              serverInfo.hostname = server.name;
            }

            if (server.password.length) {
              serverInfo.password = server.password;
            }

            addToFavorites(serverInfo);
          }
        });
      }
    });
  };

  return (
    <StaticModal onDismiss={() => hide()}>
      <Animatable.View
        animation={"zoomInUp"}
        duration={700}
        style={[
          styles.container,
          {
            top: height / 2 - MODAL_HEIGHT / 2 - 25, // titlebar height is 25
            left: width / 2 - MODAL_WIDTH / 2,
            height: MODAL_HEIGHT,
            width: MODAL_WIDTH,
            backgroundColor: theme.listHeaderBackgroundColor,
          },
        ]}
      >
        <Text size={1} color={theme.textPrimary}>
          GTA: San Andreas path (where SA-MP is also installed):
        </Text>
        <View style={styles.pathInputContainer}>
          <TextInput
            value={gtasaPath}
            onChangeText={(text) => setGTASAPath(text)}
            style={[
              styles.pathInput,
              {
                color: theme.textSecondary,
                borderColor: theme.primary,
              },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.browseButton,
              {
                backgroundColor: theme.primary,
                borderColor: theme.textSecondary,
              },
            ]}
            onPress={() => selectPath()}
          >
            <Text
              semibold
              color={theme.textPrimary}
              size={1}
              style={{
                top: -1,
              }}
            >
              Browse
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.importButton,
            {
              backgroundColor: theme.primary,
              borderColor: theme.textSecondary,
            },
          ]}
          onPress={() => importDataFromSAMP()}
        >
          <Text
            semibold
            color={theme.textPrimary}
            size={1}
            style={{
              top: -1,
            }}
          >
            Import nickname and gtasa path from SA-MP settings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.importButton,
            {
              marginTop: 5,
              backgroundColor: theme.primary,
              borderColor: theme.textSecondary,
            },
          ]}
          onPress={() => importFavListFromSAMP()}
        >
          <Text
            semibold
            color={theme.textPrimary}
            size={1}
            style={{
              top: -1,
            }}
          >
            Import favorite list from SA-MP data
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.resetButton,
            {
              backgroundColor: "red",
              borderColor: theme.textSecondary,
            },
          ]}
          onPress={() => {
            localStorage.clear();
            window.location.reload();
          }}
        >
          <Text
            semibold
            color={theme.textPrimary}
            size={1}
            style={{
              top: -1,
            }}
          >
            Reset application data (clears settings and lists)
          </Text>
        </TouchableOpacity>
        <View style={styles.appInfoContainer}>
          {updateInfo && updateInfo.version != version && (
            <Text
              style={{ marginBottom: 10 }}
              semibold
              size={1}
              onPress={() => shell.open(updateInfo?.download)}
              color={theme.primary}
            >
              ⚠ New Update Available. Click to Download! ⚠
            </Text>
          )}
          <Text color={theme.textPrimary}>
            Made with ❤️ by{" "}
            <Text
              onPress={() => shell.open("https://open.mp/")}
              color={theme.primary}
            >
              open.mp
            </Text>{" "}
            |{" "}
            <Text
              onPress={() =>
                shell.open("https://github.com/openmultiplayer/launcher/")
              }
              color={theme.primary}
            >
              View source code on GitHub
            </Text>{" "}
            | v{nativeAppVersion} Build {version}
          </Text>
        </View>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            height: 25,
            width: 25,
          }}
          onPress={() => hide()}
        >
          <Icon
            image={images.icons.close}
            size={25}
            color={theme.primary}
            style={{ opacity: 0.5 }}
          />
        </TouchableOpacity>
      </Animatable.View>
    </StaticModal>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4.65,
    paddingHorizontal: 10,
    overflow: "hidden",
    paddingVertical: 15,
  },
  pathInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 7,
  },
  pathInput: {
    paddingHorizontal: 5,
    flex: 1,
    backgroundColor: "white",
    height: 29,
    borderRadius: 8,
    borderWidth: 2,
    outlineStyle: "none",
  },
  browseButton: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  importButton: {
    marginTop: 10,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  resetButton: {
    marginTop: 5,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  appInfoContainer: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
    alignItems: "center",
  },
});

export default SettingsModal;
