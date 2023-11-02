import { useContext, useEffect } from "react";
import { Pressable, View } from "react-native";
import * as Animatable from "react-native-animatable";
import Text from "../../components/Text";
import { ThemeContext } from "../../contexts/theme";
import { useNotification } from "../../states/notification";

const Notification = () => {
  const { theme } = useContext(ThemeContext);
  const {
    visible,
    title,
    description,
    onPress,
    slideDown,
    deleteNotification,
  } = useNotification();

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        slideDown();
        setTimeout(() => deleteNotification(), 1000);
      }, 2000);
    }
  }, [visible]);

  const Wrapper = onPress ? Pressable : View;

  return (
    <Animatable.View
      animation={visible ? "slideInUp" : "slideOutDown"}
      style={{
        opacity: title.length ? 1 : 0,
        position: "absolute",
        bottom: 10,
        right: 6,
        width: 300,
        backgroundColor: theme.primary,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 0,
        },
        shadowOpacity: 0.89,
        shadowRadius: 6.65,
        borderRadius: 5,
        zIndex: 60,
      }}
    >
      <Wrapper
        style={{
          paddingVertical: 7,
          paddingHorizontal: 10,
        }}
        onPress={() => {
          if (onPress) {
            onPress();
          }
        }}
      >
        <Text semibold size={2} color={theme.textPrimary}>
          {title}
        </Text>
        <Text
          semibold
          numberOfLines={5}
          color={theme.textSecondary}
          style={{ marginHorizontal: 2, fontSize: 13 }}
        >
          {description}
        </Text>
      </Wrapper>
    </Animatable.View>
  );
};

export default Notification;
