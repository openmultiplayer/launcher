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
import { usePasswordModal } from "../../states/passwordModal";
import { useSettings } from "../../states/settings";
import { startGame } from "../../utils/helpers";
import * as Animatable from "react-native-animatable";

const PasswordModal = () => {
  const { visible, server, showPasswordModal } = usePasswordModal();
  const { height, width } = useWindowDimensions();
  const { theme } = useContext(ThemeContext);
  const [password, setPassword] = useState("");
  const { nickName, gtasaPath } = useSettings();

  if (!visible) {
    return null;
  }

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
        onPress={() => showPasswordModal(false)}
      />
      <Animatable.View
        animation={"bounceIn"}
        duration={500}
        style={{
          position: "absolute",
          top: height / 2 - 75 - 25, // titlebar height is 25
          left: width / 2 - 160,
          height: 150,
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
          justifyContent: "space-between",
          alignItems: "center",
          overflow: "hidden",
          paddingVertical: 10,
        }}
      >
        <Icon image={images.icons.locked} size={30} />
        <Text color={theme.textPrimary} size={1}>
          This server is protected, please enter password.
        </Text>
        <TextInput
          value={password}
          onChangeText={(text) => setPassword(text)}
          style={{
            color: theme.textSecondary,
            paddingHorizontal: 5,
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
            backgroundColor: theme.primary,
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
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
          onPress={() => showPasswordModal(false)}
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

// const styles = StyleSheet.create({
//   app: {
//     // @ts-ignore
//     height: "100vh",
//     // @ts-ignore
//     width: "100vw",
//   },
// });

export default PasswordModal;
