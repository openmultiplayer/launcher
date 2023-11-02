import { useContext, useState } from "react";
import {
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { ThemeContext } from "../../contexts/theme";
import { useJoinServerPrompt } from "../../states/joinServerPrompt";
import { useSettings } from "../../states/settings";
import { startGame } from "../../utils/helpers";
import * as Animatable from "react-native-animatable";

const JoinServerPrompt = () => {
  const { visible, server, showPrompt } = useJoinServerPrompt();
  const { height, width } = useWindowDimensions();
  const { theme } = useContext(ThemeContext);
  const [password, setPassword] = useState("");
  const { nickName, gtasaPath, setNickName } = useSettings();

  if (!visible) {
    return null;
  }

  const HEIGHT = server?.hasPassword ? 285 : 227;
  const WIDTH = 320;

  return (
    <View
      style={{
        position: "absolute",
        height: height,
        width: width,
        top: 0,
        left: 0,
        zIndex: 61,
      }}
    >
      <Pressable
        style={{
          height: "100%",
          width: "100%", // @ts-ignore
          cursor: "default",
        }}
        onPress={() => showPrompt(false)}
      />
      <Animatable.View
        animation={"bounceIn"}
        duration={500}
        style={{
          position: "absolute",
          top: height / 2 - HEIGHT / 2 - 25, // titlebar height is 25
          left: width / 2 - WIDTH / 2,
          height: HEIGHT,
          width: WIDTH,
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
            Server:{" "}
            <Text medium color={theme.textPrimary} size={1}>
              {server?.hostname}
            </Text>
          </Text>
          <Text semibold color={theme.textPrimary} size={1}>
            Address:{" "}
            <Text medium color={theme.textPrimary} size={1}>
              {server?.ip}:{server?.port}
            </Text>
          </Text>
          <Text semibold color={theme.textPrimary} size={1}>
            Players:{" "}
            <Text medium color={theme.textPrimary} size={1}>
              {server?.playerCount}/{server?.maxPlayers}
            </Text>
          </Text>
        </View>
        {server?.hasPassword && (
          <View style={{ marginTop: 15 }}>
            <Text color={theme.textPrimary} size={1}>
              This server is protected, please enter password.
            </Text>
            <TextInput
              placeholderTextColor={theme.textPlaceholder}
              placeholder={"Enter password..."}
              value={password}
              onChangeText={(text) => setPassword(text)}
              style={{
                color: theme.textSecondary,
                paddingHorizontal: 5,
                marginTop: 4,
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
          </View>
        )}
        <View style={{ marginTop: server?.hasPassword ? 5 : 15 }}>
          <Text color={theme.textPrimary} size={1}>
            Nickname:
          </Text>
          <TextInput
            placeholderTextColor={theme.textPlaceholder}
            placeholder={"Enter Nickname..."}
            value={nickName}
            onChangeText={(text) => setNickName(text)}
            style={{
              color: theme.textSecondary,
              paddingHorizontal: 5,
              marginTop: 4,
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
            Connect
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
      </Animatable.View>
    </View>
  );
};

export default JoinServerPrompt;
