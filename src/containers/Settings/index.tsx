import { useContext } from "react";
import { Modal, Pressable, View } from "react-native";
import { ThemeContext } from "../../contexts/theme";
import { useSettingsModal } from "../../states/settingsModal";

const SettingsModal = () => {
  const { theme } = useContext(ThemeContext);
  const { visible, hide } = useSettingsModal();
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onDismiss={() => hide()}
      onRequestClose={() => hide()}
    >
      <View
        style={{
          width: "100%",
          height: "100%",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "100%",
            backgroundColor: "rgba(50, 50, 50, 0.3)",
            // @ts-ignore
            cursor: "default",
          }}
          onPress={() => hide()}
        />
        <View
          style={{
            width: "100%",
            height: "50%",
            backgroundColor: theme.listHeaderBackgroundColor,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: -8,
            },
            shadowOpacity: 0.6,
            shadowRadius: 11.14,
            borderRadius: 10,
          }}
        ></View>
      </View>
    </Modal>
  );
};

// const styles = StyleSheet.create({});

export default SettingsModal;
