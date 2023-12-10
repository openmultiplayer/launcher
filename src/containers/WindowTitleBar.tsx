import { appWindow } from "@tauri-apps/api/window";
import { t } from "i18next";
import { useContext, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Icon from "../components/Icon";
import Text from "../components/Text";
import { images } from "../constants/images";
import { ThemeContext } from "../contexts/theme";
import { useSettingsModal } from "../states/settingsModal";
import { sc } from "../utils/sizeScaler";

const WindowTitleBarButtons = ({
  size = sc(30),
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
    <div className="titlebar-button" style={{ height: size, width: size }}>
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
  const { show: showSettings } = useSettingsModal();

  useEffect(() => {
    console.log("ya heseeeeein", theme);
  }, []);

  return (
    <View
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: sc(15),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
        }}
      >
        <View
          style={[
            styles.logoContainer,
            { backgroundColor: theme.itemBackgroundColor },
          ]}
        >
          <Icon image={images.icons.omp} size={sc(22)} />
        </View>
        <Text
          semibold
          color={theme.textPrimary}
          style={{ marginLeft: sc(12), fontSize: sc(18) }}
        >
          Open Multiplayer
        </Text>
      </View>
      <div
        data-tauri-drag-region
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: sc(32),
          width: "100%",
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: sc(15),
        }}
      />
      <View
        style={{ flexDirection: "row", alignItems: "center", height: "100%" }}
      >
        <div
          className="titlebar-button-colored"
          style={{
            height: sc(30),
            width: sc(30),
            borderRadius: sc(3),
            marginRight: sc(12),
          }}
        >
          <Pressable
            style={{
              height: "100%",
              width: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => showSettings()}
          >
            <Icon
              title={t("settings")}
              image={images.icons.settings}
              size={sc(20)}
              color={theme.textPrimary}
            />
          </Pressable>
        </div>
        <WindowTitleBarButtons
          title={t("minimize")}
          image={images.icons.windowMinimize}
          onPress={() => appWindow.minimize()}
        />
        <WindowTitleBarButtons
          title={t("maximize")}
          image={images.icons.windowMaximize}
          onPress={() => appWindow.toggleMaximize()}
        />
        <WindowTitleBarButtons
          title={t("close")}
          image={images.icons.windowClose}
          onPress={() => appWindow.close()}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    height: sc(32),
    width: sc(32),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: sc(5),
  },
});

export default WindowTitleBar;
