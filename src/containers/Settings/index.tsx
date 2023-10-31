import { shell } from "@tauri-apps/api";
import { useContext } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { open } from "@tauri-apps/api/dialog";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { ThemeContext } from "../../contexts/theme";
import { useAppState } from "../../states/app";
import { useSettings } from "../../states/settings";
import { useSettingsModal } from "../../states/settingsModal";

const MODAL_WIDTH = 500;
const MODAL_HEIGHT = 200;

const SettingsModal = () => {
  const { height, width } = useWindowDimensions();
  const { nativeAppVersion, version, updateInfo } = useAppState();
  const { theme } = useContext(ThemeContext);
  const { gtasaPath, setGTASAPath } = useSettings();
  const { hide, visible } = useSettingsModal();

  if (!visible) {
    return null;
  }

  const selectPath = async () => {
    const selected = await open({
      defaultPath: gtasaPath,
      directory: true,
    });
    if (Array.isArray(selected)) {
      // user selected multiple files
    } else if (selected === null) {
      // user cancelled the selection
    } else {
      // user selected a single file
    }
  };

  return (
    <View
      style={{
        position: "absolute",
        height: height,
        width: width,
        top: 0,
        left: 0,
      }}
    >
      <Pressable
        style={{
          height: "100%",
          width: "100%", // @ts-ignore
          cursor: "default",
        }}
        onPress={() => hide()}
      />
      <Animatable.View
        animation={"bounceIn"}
        duration={500}
        style={[
          styles.container,
          {
            top: height / 2 - MODAL_HEIGHT / 2,
            left: width / 2 - MODAL_WIDTH / 2,
            height: MODAL_HEIGHT,
            width: MODAL_WIDTH,
            backgroundColor: theme.listHeaderBackgroundColor,
          },
        ]}
      >
        <Text size={1} color={theme.textPrimary}>
          GTA: San Andreas path (where also SA-MP is installed):
        </Text>
        <View style={styles.pathInputContainer}>
          <TextInput
            value={gtasaPath}
            onChangeText={(text) => setGTASAPath(text)}
            style={[
              styles.pathInput,
              {
                color: theme.textSecondary,
                borderColor: theme.primary,
              },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.browseButton,
              {
                backgroundColor: theme.primary,
                borderColor: theme.textSecondary,
              },
            ]}
            onPress={() => selectPath()}
          >
            <Text
              semibold
              color={theme.textPrimary}
              size={1}
              style={{
                top: -1,
              }}
            >
              Browse
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.importButton,
            {
              backgroundColor: theme.primary,
              borderColor: theme.textSecondary,
            },
          ]}
        >
          <Text
            semibold
            color={theme.textPrimary}
            size={1}
            style={{
              top: -1,
            }}
          >
            Import nickname and gtasa path from SA-MP settings
          </Text>
        </TouchableOpacity>
        <View style={styles.appInfoContainer}>
          {updateInfo && updateInfo.version != version && (
            <Text
              style={{ marginBottom: 10 }}
              semibold
              size={1}
              onPress={() => shell.open(updateInfo?.download)}
              color={theme.primary}
            >
              ⚠ New Update Available. Click to Download! ⚠
            </Text>
          )}
          <Text color={theme.textPrimary}>
            Made with ❤️ by{" "}
            <Text
              onPress={() => shell.open("https://open.mp/")}
              color={theme.primary}
            >
              open.mp
            </Text>{" "}
            |{" "}
            <Text
              onPress={() =>
                shell.open("https://github.com/openmultiplayer/launcher/")
              }
              color={theme.primary}
            >
              View source code on GitHub
            </Text>{" "}
            | v{nativeAppVersion} Build {version}
          </Text>
        </View>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            height: 25,
            width: 25,
          }}
          onPress={() => hide()}
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

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4.65,
    paddingHorizontal: 10,
    overflow: "hidden",
    paddingVertical: 15,
  },
  pathInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 7,
  },
  pathInput: {
    paddingHorizontal: 5,
    flex: 1,
    backgroundColor: "white",
    height: 29,
    borderRadius: 8,
    borderWidth: 2,
    outlineStyle: "none",
  },
  browseButton: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  importButton: {
    marginTop: 10,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  appInfoContainer: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
    alignItems: "center",
  },
});

export default SettingsModal;
