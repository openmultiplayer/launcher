import { useContext, useState } from "react";
import {
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import * as Animatable from "react-native-animatable";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { ThemeContext } from "../../contexts/theme";
import { useAddThirdPartyServerModal } from "../../states/addThirdPartyServerModal";

const AddThirdPartyServerModal = () => {
  const { visible, showAddThirdPartyServer } = useAddThirdPartyServerModal();
  const { height, width } = useWindowDimensions();
  const { theme } = useContext(ThemeContext);
  const [serverAddress, setServerAddress] = useState("");

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
        onPress={() => showAddThirdPartyServer(false)}
      />
      <Animatable.View
        animation={"bounceIn"}
        duration={500}
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
            Add your server manually to favorite list.
          </Text>
          <Text color={theme.textPrimary} size={1}>
            Example: 127.0.0.1:7777
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
          onPress={() => {}}
        >
          <Text color={theme.textPrimary} size={1}>
            Add
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

export default AddThirdPartyServerModal;
