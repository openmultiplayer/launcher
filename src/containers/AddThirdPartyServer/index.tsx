import { t } from "i18next";
import { useContext, useState } from "react";
import {
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
import { useAddThirdPartyServerModal } from "../../states/addThirdPartyServerModal";
import { usePersistentServers } from "../../states/servers";
import { validateServerAddress } from "../../utils/helpers";
import { Server } from "../../utils/types";

const AddThirdPartyServerModal = () => {
  const { visible, showAddThirdPartyServer } = useAddThirdPartyServerModal();
  const { height, width } = useWindowDimensions();
  const { theme } = useContext(ThemeContext);
  const [serverAddress, setServerAddress] = useState("");
  const { addToFavorites } = usePersistentServers();

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
      showAddThirdPartyServer(false);
    }
  };

  return (
    <StaticModal onDismiss={() => showAddThirdPartyServer(false)}>
      <Animatable.View
        animation={"zoomInUp"}
        duration={700}
        style={{
          position: "absolute",
          top: height / 2 - 90 - 25, // titlebar height is 25
          left: width / 2 - 160,
          height: 180,
          width: 320,
          borderRadius: 4,
          backgroundColor: theme.listHeaderBackgroundColor,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.8,
          shadowRadius: 4.65,
          alignItems: "center",
          overflow: "hidden",
          paddingVertical: 10,
        }}
      >
        <Icon image={images.icons.favorite} size={30} />
        <View style={{ width: 300, marginTop: 10 }}>
          <Text color={theme.textPrimary} size={1}>
            {t("add_server_modal_description_1")}
          </Text>
          <Text color={theme.textPrimary} size={1}>
            {t("add_server_modal_description_2")}
          </Text>
        </View>
        <TextInput
          placeholder={"IP:Port"}
          value={serverAddress}
          onChangeText={(text) => setServerAddress(text)}
          style={{
            color: theme.textSecondary,
            paddingHorizontal: 5,
            marginTop: 10,
            width: 300,
            backgroundColor: "white",
            borderColor: theme.primary,
            height: 30,
            borderRadius: 8,
            borderWidth: 2,
            // @ts-ignore
            outlineStyle: "none",
          }}
        />
        <TouchableOpacity
          style={{
            width: 300,
            height: 30,
            marginTop: 5,
            backgroundColor: theme.primary,
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => addServer()}
        >
          <Text color={theme.textPrimary} size={1}>
            {t("add")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            height: 25,
            width: 25,
          }}
          onPress={() => showAddThirdPartyServer(false)}
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

// const styles = StyleSheet.create({
//   app: {
//     // @ts-ignore
//     height: "100vh",
//     // @ts-ignore
//     width: "100vw",
//   },
// });

export default AddThirdPartyServerModal;
