import { useContext } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import * as Animatable from "react-native-animatable";
import Icon from "../../components/Icon";
import StaticModal from "../../components/StaticModal";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { ThemeContext } from "../../contexts/theme";
import { useMessageBox } from "../../states/messageModal";
import { sc } from "../../utils/sizeScaler";

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
          left: width / 2 - Number(args.boxWidth) / 2,
          width: args.boxWidth,
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
          paddingVertical: sc(15),
        }}
      >
        <Text
          semibold
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
          <Text color={theme.textPrimary} size={2} numberOfLines={10}>
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
                  paddingHorizontal: sc(10),
                  height: sc(36),
                  width: args.buttonWidth,
                  marginTop: sc(5),
                  backgroundColor: theme.primary,
                  borderRadius: sc(5),
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => button.onPress()}
              >
                <Text semibold color={theme.textPrimary} size={2}>
                  {button.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: sc(15),
            right: sc(15),
            height: sc(20),
            width: sc(20),
          }}
          onPress={() => hideMessageBox()}
        >
          <Icon
            image={images.icons.close}
            size={sc(20)}
            color={theme.textSecondary}
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
