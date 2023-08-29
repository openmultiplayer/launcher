import { useContext } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Text from "../components/Text";
import { ThemeContext } from "../contexts/theme";

interface IProps {
  visible: boolean;
  onClose?: () => void;
}

const DirectConnetOverlay = (props: IProps) => {
  const { theme } = useContext(ThemeContext);

  if (props.visible) {
    return (
      <View style={styles.overlayContainer}>
        <View style={styles.header}>
          <Text semibold size={1}>
            {" "}
            Direct connect
          </Text>
          <TouchableOpacity
            style={{
              width: 20,
              height: 20,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => {
              if (props.onClose) {
                props.onClose();
              }
            }}
          >
            <Text color={"red"} size={2}>
              ✖
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="IP:Port..."
            placeholderTextColor={theme.textPlaceholder}
            style={[styles.input, { borderColor: theme.primary }]}
          />
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: theme.primary }]}
          >
            <Text style={{ fontSize: 10 }} color={theme.textPrimary} semibold>
              Connect
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else {
    return null;
  }
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: "absolute",
    justifyContent: "space-around",
    marginTop: 52,
    right: 5,
    height: 70,
    width: 210,
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    zIndex: 1000,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  input: {
    width: 143,
    height: 30,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 5,
    fontSize: 12,
    fontWeight: "400",
    outlineStyle: "none",
  },
  connectButton: {
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default DirectConnetOverlay;
