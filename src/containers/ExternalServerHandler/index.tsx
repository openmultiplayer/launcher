import { invoke } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import { t } from "i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Icon from "../../components/Icon";
import StaticModal from "../../components/StaticModal";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { usePersistentServers } from "../../states/servers";
import { useSettings } from "../../states/settings";
import { useTheme } from "../../states/theme";
import { startGame } from "../../utils/game";
import { Log } from "../../utils/logger";
import { sc } from "../../utils/sizeScaler";
import { Server } from "../../utils/types";
import {
  isValidDomain,
  validateServerAddressIPv4,
} from "../../utils/validation";

const ExternalServerHandler = () => {
  const [visible, showModal] = useState(false);
  const { nickName, gtasaPath } = useSettings();
  const { height, width } = useWindowDimensions();
  const { theme } = useTheme();
  const [serverAddress, setServerAddress] = useState("");
  const { addToFavorites } = usePersistentServers();

  useEffect(() => {
    try {
      (async () => {
        const value = await invoke<string>("get_uri_scheme_value");
        if (
          value.length &&
          (value.includes("omp://") || value.includes("samp://"))
        ) {
          const serverAddress = value
            .replace("omp://", "")
            .replace("samp://", "")
            .replace("/", "");

          showModal(true);
          setServerAddress(serverAddress);
        }
      })();
    } catch (e) {
      Log.error(e);
    }

    const unlisten = listen<string>("scheme-request-received", (event) => {
      if (typeof event.payload === "string") {
        if (
          event.payload.includes("omp://") ||
          event.payload.includes("samp://")
        ) {
          const serverAddress = event.payload
            .replace("omp://", "")
            .replace("samp://", "")
            .replace("/", "");

          showModal(true);
          setServerAddress(serverAddress);
        }
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  if (!visible) {
    return null;
  }

  const addServer = useCallback(() => {
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
      players: [],
      password: "",
      rules: {} as Server["rules"],
    };

    if (serverAddress.length) {
      if (serverAddress.includes(":")) {
        const data = serverAddress.split(":");
        serverInfo.ip = data[0];
        serverInfo.port = parseInt(data[1]);
        serverInfo.hostname += ` (${serverInfo.ip}:${serverInfo.port})`;
      } else {
        if (
          validateServerAddressIPv4(serverAddress) ||
          isValidDomain(serverAddress)
        ) {
          serverInfo.ip = serverAddress;
          serverInfo.port = 7777;
          serverInfo.hostname += ` (${serverInfo.ip}:${serverInfo.port})`;
        }
      }

      addToFavorites(serverInfo);
      showModal(false);
    }
  }, [serverAddress, addToFavorites]);

  const joinServer = useCallback(() => {
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
      players: [],
      password: "",
      rules: {} as Server["rules"],
    };

    if (serverAddress.length) {
      if (serverAddress.includes(":")) {
        const data = serverAddress.split(":");
        serverInfo.ip = data[0];
        serverInfo.port = parseInt(data[1]);
        serverInfo.hostname += ` (${serverInfo.ip}:${serverInfo.port})`;
      } else {
        if (
          validateServerAddressIPv4(serverAddress) ||
          isValidDomain(serverAddress)
        ) {
          serverInfo.ip = serverAddress;
          serverInfo.port = 7777;
          serverInfo.hostname += ` (${serverInfo.ip}:${serverInfo.port})`;
        }
      }

      startGame(serverInfo, nickName, gtasaPath, "");
      showModal(false);
    }
  }, [serverAddress, nickName, gtasaPath]);

  const dynamicStyles = useMemo(
    () => ({
      container: {
        top: height / 2 - 90 - 25,
        left: width / 2 - 160,
        backgroundColor: theme.secondary,
      },
      serverAddressText: {
        backgroundColor: theme.textInputBackgroundColor,
      },
      button: {
        backgroundColor: theme.primary,
      },
    }),
    [height, width, theme]
  );

  return (
    <StaticModal onDismiss={() => showModal(false)}>
      <View style={[styles.container, dynamicStyles.container]}>
        <View style={styles.titleContainer}>
          <Text color={theme.textPrimary} size={4} bold>
            {t("add_or_play_external_server")}
          </Text>
          <Text color={theme.textPrimary} size={2}></Text>
        </View>
        <Text
          size={3}
          color={theme.textPrimary}
          style={[styles.serverAddressText, dynamicStyles.serverAddressText]}
        >
          {serverAddress}
        </Text>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, dynamicStyles.button]}
            onPress={addServer}
          >
            <Text semibold color={"#FFFFFF"} size={2}>
              {t("add")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, dynamicStyles.button]}
            onPress={joinServer}
          >
            <Text semibold color={"#FFFFFF"} size={2}>
              {t("play")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => showModal(false)}
        >
          <Icon
            image={images.icons.close}
            size={sc(20)}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </StaticModal>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    height: 135,
    width: 320,
    borderRadius: sc(10),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    alignItems: "center",
    overflow: "hidden",
    paddingVertical: sc(11),
  },
  titleContainer: {
    width: 300,
    marginTop: sc(2),
  },
  serverAddressText: {
    textAlign: "center",
    paddingVertical: sc(10),
    paddingHorizontal: sc(10),
    marginTop: sc(10),
    width: 300,
    borderRadius: sc(5),
  },
  buttonsContainer: {
    width: 300,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    width: 147,
    height: sc(38),
    marginTop: sc(10),
    borderRadius: sc(5),
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: sc(15),
    right: sc(15),
    height: sc(20),
    width: sc(20),
  },
});

export default ExternalServerHandler;
