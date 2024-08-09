import { listen } from "@tauri-apps/api/event";
import { t } from "i18next";
import { useEffect, useState } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import Icon from "../../components/Icon";
import StaticModal from "../../components/StaticModal";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { usePersistentServers } from "../../states/servers";
import { useTheme } from "../../states/theme";
import { validateServerAddress } from "../../utils/helpers";
import { sc } from "../../utils/sizeScaler";
import { Server } from "../../utils/types";
import { startGame } from "../../utils/game";
import { useSettings } from "../../states/settings";

const ExternalServerHandler = () => {
  const [visible, showModal] = useState(false);
  const { nickName, gtasaPath } = useSettings();
  const { height, width } = useWindowDimensions();
  const { theme } = useTheme();
  const [serverAddress, setServerAddress] = useState("");
  const { addToFavorites } = usePersistentServers();

  useEffect(() => {
    const unlisten = listen<string>("scheme-request-received", (event) => {
      if (typeof event.payload === "string") {
        if (event.payload.includes("omp://")) {
          const serverAddress = event.payload
            .replace("omp://", "")
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

  const addServer = () => {
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
        if (validateServerAddress(serverAddress)) {
          serverInfo.ip = serverAddress;
          serverInfo.port = 7777;
          serverInfo.hostname += ` (${serverInfo.ip}:${serverInfo.port})`;
        }
      }

      addToFavorites(serverInfo);
      showModal(false);
    }
  };

  const joinServer = () => {
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
        if (validateServerAddress(serverAddress)) {
          serverInfo.ip = serverAddress;
          serverInfo.port = 7777;
          serverInfo.hostname += ` (${serverInfo.ip}:${serverInfo.port})`;
        }
      }

      startGame(serverInfo, nickName, gtasaPath, "");
      showModal(false);
    }
  };

  return (
    <StaticModal onDismiss={() => showModal(false)}>
      <View
        style={{
          position: "absolute",
          top: height / 2 - 90 - 25, // titlebar height is 25
          left: width / 2 - 160,
          height: 135,
          width: 320,
          borderRadius: sc(10),
          backgroundColor: theme.secondary,
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
        }}
      >
        <View style={{ width: 300, marginTop: sc(2) }}>
          <Text color={theme.textPrimary} size={4} bold>
            {t("add_or_play_external_server")}
          </Text>
          <Text color={theme.textPrimary} size={2}></Text>
        </View>
        <Text
          size={3}
          color={theme.textPrimary}
          style={{
            textAlign: "center",
            paddingVertical: sc(10),
            paddingHorizontal: sc(10),
            marginTop: sc(10),
            width: 300,
            backgroundColor: theme.textInputBackgroundColor,
            borderRadius: sc(5),
          }}
        >
          {serverAddress}
        </Text>
        <View
          style={{
            width: 300,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            style={{
              width: 147,
              height: sc(38),
              marginTop: sc(10),
              backgroundColor: theme.primary,
              borderRadius: sc(5),
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => addServer()}
          >
            <Text semibold color={"#FFFFFF"} size={2}>
              {t("add")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              width: 147,
              height: sc(38),
              marginTop: sc(10),
              backgroundColor: theme.primary,
              borderRadius: sc(5),
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => joinServer()}
          >
            <Text semibold color={"#FFFFFF"} size={2}>
              {t("play")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{
            position: "absolute",
            top: sc(15),
            right: sc(15),
            height: sc(20),
            width: sc(20),
          }}
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

export default ExternalServerHandler;
