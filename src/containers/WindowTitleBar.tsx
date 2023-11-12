import { shell } from "@tauri-apps/api";
import { appWindow } from "@tauri-apps/api/window";
import { t } from "i18next";
import { useContext } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "../components/Icon";
import Text from "../components/Text";
import { images } from "../constants/images";
import { ThemeContext } from "../contexts/theme";
import { useAppState } from "../states/app";
import { useSettingsModal } from "../states/settingsModal";

const WindowTitleBarButtons = ({
  size = 25,
  image,
  onPress,
  iconSize = 15,
  title = "",
}: {
  size?: number;
  iconSize?: number;
  image: string;
  title?: string;
  onPress: () => void;
}) => {
  const { theme } = useContext(ThemeContext);
  return (
    <div className="titlebar-button" style={{ height: size, width: size + 5 }}>
      <Pressable
        style={{
          height: "100%",
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onPress}
      >
        <Icon
          title={title}
          image={image}
          size={iconSize}
          color={theme.textPrimary}
        />
      </Pressable>
    </div>
  );
};

const WindowTitleBar = () => {
  const { theme } = useContext(ThemeContext);
  const { toggleMaximized } = useAppState();
  const { show: showSettings } = useSettingsModal();

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 25,
        width: "100%",
        backgroundColor: theme.secondary,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <TouchableOpacity
        style={{ height: "100%" }}
        onPress={() => shell.open("https://open.mp/")}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: "100%",
            width: 130,
            paddingLeft: 4,
            top: 2,
          }}
        >
          <View style={styles.logoContainer}>
            <Icon image={images.icons.omp} size={20} />
          </View>
          <Text color={theme.textPrimary} style={{ top: -1, marginLeft: 3 }}>
            Open Multiplayer
          </Text>
        </View>
      </TouchableOpacity>
      <View
        style={{ flexDirection: "row", alignItems: "center", height: "100%" }}
      >
        <WindowTitleBarButtons
          title={t("settings")}
          iconSize={17}
          image={images.icons.settings}
          onPress={() => showSettings()}
        />
        <WindowTitleBarButtons
          title={t("minimize")}
          image={images.icons.windowMinimize}
          onPress={() => appWindow.minimize()}
        />
        <WindowTitleBarButtons
          title={t("maximize")}
          image={images.icons.windowMaximize}
          onPress={async () => {
            await appWindow.toggleMaximize();
            toggleMaximized(await appWindow.isMaximized());
          }}
        />
        <WindowTitleBarButtons
          title={t("close")}
          image={images.icons.windowClose}
          onPress={() => appWindow.close()}
        />
      </View>
    </div>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    height: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default WindowTitleBar;
