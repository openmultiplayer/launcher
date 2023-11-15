import { invoke } from "@tauri-apps/api";
import { open } from "@tauri-apps/api/dialog";
import { t } from "i18next";
import { useContext } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Text from "../../../components/Text";
import { ThemeContext } from "../../../contexts/theme";
import { useAppState } from "../../../states/app";
import { usePersistentServers } from "../../../states/servers";
import { useSettings } from "../../../states/settings";
import { checkDirectoryValidity } from "../../../utils/helpers";
import { Server } from "../../../utils/types";
import { Log } from "../../../utils/logger";

const General = () => {
  const { hostOS } = useAppState();
  const { theme } = useContext(ThemeContext);
  const { gtasaPath, setGTASAPath, setNickName } = useSettings();

  const selectPath = async () => {
    const selected: string = (await open({
      defaultPath:
        hostOS === "Windows_NT" ? gtasaPath.replace(/\//g, "\\") : gtasaPath,
      directory: true,
    })) as string;

    if (selected) {
      const newPath = selected.replace(/\\/g, "/");

      const isDirValid = await checkDirectoryValidity(newPath);
      if (isDirValid) setGTASAPath(newPath);
    }
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
      Log.debug(e);
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
    <View
      style={{
        paddingHorizontal: 12,
        overflow: "hidden",
        paddingVertical: 10,
        flex: 1,
      }}
    >
      <Text size={1} color={theme.textPrimary}>
        {t("settings_gta_path_input_label")}:
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
            {t("browse")}
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
          {t("settings_import_nickname_gta_path_from_samp")}
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
          {t("settings_import_samp_favorite_list")}
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
          {t("settings_reset_application_data")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default General;
