import { useContext } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import * as Animatable from "react-native-animatable";
import Icon from "../../components/Icon";
import StaticModal from "../../components/StaticModal";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { ThemeContext } from "../../contexts/theme";
import { useMessageBox } from "../../states/messageModal";

const MessageBox = () => {
  const { args, visible, hideMessageBox } = useMessageBox();
  const { height, width } = useWindowDimensions();
  const { theme } = useContext(ThemeContext);

  if (!visible) {
    return null;
  }

  return (
    <StaticModal onDismiss={() => hideMessageBox()}>
      <Animatable.View
        animation={"zoomInUp"}
        duration={700}
        style={{
          position: "absolute",
          top: height / 2 - 90 - 25, // titlebar height is 25
          left: width / 2 - 160,
          width: args.boxWidth,
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
          paddingTop: 10,
          paddingBottom: 15,
        }}
      >
        <Text
          bold
          size={3}
          color={theme.primary}
          style={{
            width: args.boxWidth ? args.boxWidth - 70 : 250,
            textAlign: "center",
          }}
        >
          {args.title}
        </Text>
        <View
          style={{
            width: args.boxWidth ? args.boxWidth - 30 : 300,
            marginTop: 5,
          }}
        >
          <Text color={theme.textPrimary} size={1} numberOfLines={10}>
            {args.description}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-evenly",
            alignItems: "center",
            flexWrap: "wrap",
            height: 30,
            width: args.boxWidth,
            marginTop: 10,
          }}
        >
          {args.buttons.map((button, index) => {
            return (
              <TouchableOpacity
                key={"message-box-button-" + index}
                style={{
                  paddingHorizontal: 10,
                  height: 30,
                  marginTop: 5,
                  backgroundColor: theme.primary,
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => button.onPress()}
              >
                <Text color={theme.textPrimary} size={1}>
                  {button.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            height: 25,
            width: 25,
          }}
          onPress={() => hideMessageBox()}
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

export default MessageBox;
