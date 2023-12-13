import { t } from "i18next";
import { useContext, useEffect, useState } from "react";
import {
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Icon from "../../components/Icon";
import StaticModal from "../../components/StaticModal";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { ThemeContext } from "../../contexts/theme";
import { useJoinServerPrompt } from "../../states/joinServerPrompt";
import { useSettings } from "../../states/settings";
import { startGame } from "../../utils/helpers";

const JoinServerPrompt = () => {
  const { visible, server, showPrompt } = useJoinServerPrompt();
  const { height, width } = useWindowDimensions();
  const { theme } = useContext(ThemeContext);
  const [password, setPassword] = useState("");
  const { nickName, gtasaPath, setNickName } = useSettings();

  useEffect(() => {
    setPassword(server && server.password ? server.password : "");
  }, [server]);

  if (!visible) {
    return null;
  }

  const HEIGHT = server?.hasPassword ? 285 : 227;
  const WIDTH = 320;

  return (
    <StaticModal onDismiss={() => showPrompt(false)}>
      <View
        style={{
          position: "absolute",
          top: height / 2 - HEIGHT / 2 - 25, // titlebar height is 25
          left: width / 2 - WIDTH / 2,
          height: HEIGHT,
          width: WIDTH,
          borderRadius: 4,
          backgroundColor: theme.secondary,
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
        <Icon
          image={server?.hasPassword ? images.icons.locked : images.icons.play}
          size={30}
          color={server?.hasPassword ? undefined : theme.primary}
        />
        <View
          style={{
            width: "100%",
            paddingHorizontal: 15,
            marginTop: 10,
          }}
        >
          <Text semibold color={theme.textPrimary} size={1}>
            {t("server")}:{" "}
            <Text medium color={theme.textPrimary} size={1}>
              {server?.hostname}
            </Text>
          </Text>
          <Text semibold color={theme.textPrimary} size={1}>
            {t("address")}:{" "}
            <Text medium color={theme.textPrimary} size={1}>
              {server?.ip}:{server?.port}
            </Text>
          </Text>
          <Text semibold color={theme.textPrimary} size={1}>
            {t("players")}:{" "}
            <Text medium color={theme.textPrimary} size={1}>
              {server?.playerCount}/{server?.maxPlayers}
            </Text>
          </Text>
        </View>
        {server?.hasPassword && (
          <View style={{ marginTop: 15 }}>
            <Text color={theme.textPrimary} size={1}>
              {t("server_join_prompt_enter_password")}
            </Text>
            <TextInput
              placeholderTextColor={theme.textPlaceholder}
              placeholder={t(
                "server_join_prompt_enter_password_input_placeholder"
              )}
              value={password}
              onChangeText={(text) => setPassword(text)}
              style={{
                color: theme.textSecondary,
                paddingHorizontal: 5,
                marginTop: 4,
                width: 300,
                backgroundColor: "#FFFFFF",
                borderColor: theme.primary,
                height: 30,
                borderRadius: 8,
                borderWidth: 2,
                // @ts-ignore
                outlineStyle: "none",
              }}
            />
          </View>
        )}
        <View style={{ marginTop: server?.hasPassword ? 5 : 15 }}>
          <Text color={theme.textPrimary} size={1}>
            {t("nickname")}:
          </Text>
          <TextInput
            placeholderTextColor={theme.textPlaceholder}
            placeholder={t("server_join_prompt_nickname_input_placeholder")}
            value={nickName}
            onChangeText={(text) => setNickName(text)}
            style={{
              color: theme.textSecondary,
              paddingHorizontal: 5,
              marginTop: 4,
              width: 300,
              backgroundColor: "#FFFFFF",
              borderColor: theme.primary,
              height: 30,
              borderRadius: 8,
              borderWidth: 2,
              // @ts-ignore
              outlineStyle: "none",
            }}
          />
        </View>
        <TouchableOpacity
          style={{
            width: 300,
            height: 30,
            backgroundColor: theme.primary,
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 10,
          }}
          onPress={() => {
            if (server) {
              startGame(
                server,
                nickName,
                gtasaPath,
                `${gtasaPath}/samp.dll`,
                password
              );
              showPrompt(false);
            }
          }}
        >
          <Text color={theme.textPrimary} size={1}>
            {t("connect")}
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
          onPress={() => showPrompt(false)}
        >
          <Icon
            image={images.icons.close}
            size={25}
            color={theme.primary}
            style={{ opacity: 0.5 }}
          />
        </TouchableOpacity>
      </View>
    </StaticModal>
  );
};

export default JoinServerPrompt;
