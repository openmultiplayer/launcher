import { t } from "i18next";
import { useEffect, useState } from "react";
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
import { useJoinServerPrompt } from "../../states/joinServerPrompt";
import { useSettings } from "../../states/settings";
import { useTheme } from "../../states/theme";
import { startGame } from "../../utils/game";
import { sc } from "../../utils/sizeScaler";

const JoinServerPrompt = () => {
  const { visible, server, showPrompt } = useJoinServerPrompt();
  const { height, width } = useWindowDimensions();
  const { theme } = useTheme();
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
        <Icon
          svg
          image={server?.hasPassword ? images.icons.locked : images.icons.play}
          size={sc(30)}
          color={server?.hasPassword ? "#36363F" : theme.primary}
        />
        <View
          style={{
            width: "100%",
            paddingHorizontal: 15,
            marginTop: 10,
          }}
        >
          <Text semibold color={theme.textPrimary} size={2}>
            {t("server")}:{" "}
            <Text medium color={theme.textPrimary} size={2}>
              {server?.hostname}
            </Text>
          </Text>
          <Text semibold color={theme.textPrimary} size={2}>
            {t("address")}:{" "}
            <Text medium color={theme.textPrimary} size={2}>
              {server?.ip}:{server?.port}
            </Text>
          </Text>
          <Text semibold color={theme.textPrimary} size={2}>
            {t("players")}:{" "}
            <Text medium color={theme.textPrimary} size={2}>
              {server?.playerCount}/{server?.maxPlayers}
            </Text>
          </Text>
        </View>
        {server?.hasPassword && (
          <View style={{ marginTop: sc(15), width: 300, alignSelf: "center" }}>
            <Text semibold color={theme.textPrimary} size={2} numberOfLines={2}>
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
                fontFamily: "Proxima Nova Regular",
                fontSize: sc(17),
                color: theme.textPrimary,
                paddingHorizontal: sc(10),
                width: 300,
                marginTop: sc(5),
                backgroundColor: theme.textInputBackgroundColor,
                height: sc(38),
                borderRadius: sc(5),
                // @ts-ignore
                outlineStyle: "none",
              }}
            />
          </View>
        )}
        <View style={{ marginTop: sc(10) }}>
          <Text semibold color={theme.textPrimary} size={2}>
            {t("nickname")}:
          </Text>
          <TextInput
            placeholderTextColor={theme.textPlaceholder}
            placeholder={t("server_join_prompt_nickname_input_placeholder")}
            value={nickName}
            onChangeText={(text) => setNickName(text)}
            style={{
              fontFamily: "Proxima Nova Regular",
              fontSize: sc(17),
              color: theme.textPrimary,
              paddingHorizontal: sc(10),
              width: 300,
              marginTop: sc(5),
              backgroundColor: theme.textInputBackgroundColor,
              height: sc(38),
              borderRadius: sc(5),
              // @ts-ignore
              outlineStyle: "none",
            }}
          />
        </View>
        <TouchableOpacity
          style={{
            width: 300,
            height: sc(38),
            backgroundColor: theme.primary,
            borderRadius: sc(5),
            justifyContent: "center",
            alignItems: "center",
            marginTop: sc(10),
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
          <Text semibold color={"#FFFFFF"} size={2}>
            {t("connect")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: sc(15),
            right: sc(15),
            height: sc(20),
            width: sc(20),
          }}
          onPress={() => showPrompt(false)}
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

export default JoinServerPrompt;
