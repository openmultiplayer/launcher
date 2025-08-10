import { clipboard } from "@tauri-apps/api";
import { t } from "i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Icon from "../../components/Icon";
import StaticModal from "../../components/StaticModal";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { useAddThirdPartyServerModal } from "../../states/addThirdPartyServerModal";
import { usePersistentServers } from "../../states/servers";
import { useTheme } from "../../states/theme";
import { sc } from "../../utils/sizeScaler";
import { Server } from "../../utils/types";
import { validateServerAddress } from "../../utils/validation";

const AddThirdPartyServerModal = () => {
  const { visible, showAddThirdPartyServer } = useAddThirdPartyServerModal();
  const { height, width } = useWindowDimensions();
  const { theme } = useTheme();
  const [serverAddress, setServerAddress] = useState("");
  const { addToFavorites } = usePersistentServers();

  useEffect(() => {
    if (visible) {
      clipboard.readText().then((text) => {
        if (text) {
          setServerAddress(text);
        }
      });
    }
  }, [visible]);

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
        if (validateServerAddress(serverAddress)) {
          serverInfo.ip = serverAddress;
          serverInfo.port = 7777;
          serverInfo.hostname += ` (${serverInfo.ip}:${serverInfo.port})`;
        }
      }

      addToFavorites(serverInfo);
      showAddThirdPartyServer(false);
    }
  }, [serverAddress, addToFavorites, showAddThirdPartyServer]);

  const dynamicStyles = useMemo(
    () => ({
      container: {
        top: height / 2 - 90 - 25,
        left: width / 2 - 160,
        backgroundColor: theme.secondary,
      },
      textInput: {
        color: theme.textPrimary,
        backgroundColor: theme.textInputBackgroundColor,
      },
      addButton: {
        backgroundColor: theme.primary,
      },
    }),
    [height, width, theme]
  );

  return (
    <StaticModal onDismiss={() => showAddThirdPartyServer(false)}>
      <View style={[styles.container, dynamicStyles.container]}>
        <Icon image={images.icons.favorite} size={30} />
        <View style={styles.descriptionContainer}>
          <Text color={theme.textPrimary} size={2}>
            {t("add_server_modal_description_1")}
          </Text>
          <Text color={theme.textPrimary} size={2}>
            {t("add_server_modal_description_2")}
          </Text>
        </View>
        <TextInput
          placeholder={"IP:Port"}
          placeholderTextColor={theme.textPlaceholder}
          value={serverAddress}
          onSubmitEditing={addServer}
          onChangeText={setServerAddress}
          style={[styles.textInput, dynamicStyles.textInput]}
        />
        <TouchableOpacity
          style={[styles.addButton, dynamicStyles.addButton]}
          onPress={addServer}
        >
          <Text semibold color={"#FFFFFF"} size={2}>
            {t("add")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => showAddThirdPartyServer(false)}
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
    height: 180,
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
  descriptionContainer: {
    width: 300,
    marginTop: sc(10),
  },
  textInput: {
    fontFamily: "Proxima Nova Regular",
    fontSize: sc(17),
    paddingHorizontal: sc(10),
    marginTop: sc(10),
    width: 300,
    height: sc(38),
    borderRadius: sc(5),
    // @ts-ignore
    outlineStyle: "none",
  },
  addButton: {
    width: 300,
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

export default AddThirdPartyServerModal;
