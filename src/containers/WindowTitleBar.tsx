import { appWindow } from "@tauri-apps/api/window";
import { t } from "i18next";
import { ColorValue, Pressable, StyleSheet, View } from "react-native";
import Icon from "../components/Icon";
import Text from "../components/Text";
import { images } from "../constants/images";
import { useSettingsModal } from "../states/settingsModal";
import { useTheme } from "../states/theme";
import { sc } from "../utils/sizeScaler";
import { IN_GAME } from "../constants/app";

const NativeWindowTitleBarButtons = ({
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
  const { theme } = useTheme();
  return (
    <div
      className="titlebar-button"
      style={{ height: size, width: size, borderRadius: sc(3) }}
    >
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

const CustomWindowTitleBarButtons = ({
  size = sc(30),
  image,
  onPress,
  iconSize = sc(20),
  title = "",
  className,
  marginRight = 0,
  color,
  backgroundColor,
}: {
  size?: number;
  iconSize?: number;
  image: string;
  title?: string;
  onPress: () => void;
  marginRight?: number;
  className?: string;
  color?: ColorValue;
  backgroundColor?: string;
}) => {
  const isSvg = image.includes(".svg");
  return (
    <div
      className={className}
      style={{
        height: size,
        width: size,
        borderRadius: sc(3),
        marginRight: marginRight,
        backgroundColor: backgroundColor,
      }}
    >
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
          svg={isSvg}
          title={title}
          image={image}
          size={iconSize}
          color={color}
        />
      </Pressable>
    </div>
  );
};

const WindowTitleBar = () => {
  const { theme, themeType, setTheme } = useTheme();
  const { show: showSettings } = useSettingsModal();

  return (
    <View
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: sc(15),
        paddingHorizontal: sc(15),
        paddingBottom: sc(8),
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
          size={3}
          color={theme.textPrimary}
          style={{ marginLeft: sc(12) }}
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
        <CustomWindowTitleBarButtons
          title={""}
          iconSize={sc(30)}
          image={
            themeType === "dark"
              ? images.icons.lightTheme
              : images.icons.darkTheme
          }
          marginRight={sc(10)}
          onPress={() => {
            if (themeType === "dark") {
              setTheme("light");
            } else {
              setTheme("dark");
            }
          }}
        />
        {!IN_GAME && (
          <>
            <CustomWindowTitleBarButtons
              title={t("settings")}
              image={images.icons.settings}
              marginRight={sc(16)}
              color={theme.textSecondary}
              backgroundColor={theme.itemBackgroundColor}
              onPress={() => showSettings()}
            />
            <NativeWindowTitleBarButtons
              title={t("minimize")}
              image={images.icons.windowMinimize}
              onPress={() => appWindow.minimize()}
            />
            <NativeWindowTitleBarButtons
              title={t("maximize")}
              image={images.icons.windowMaximize}
              onPress={() => appWindow.toggleMaximize()}
            />
          </>
        )}
        <NativeWindowTitleBarButtons
          title={t("close")}
          image={images.icons.windowClose}
          onPress={() => {
            if (IN_GAME) {
              invoke("send_message_to_game", {
                id: IN_GAME_PROCESS_ID,
                message: "close_overlay",
              });
            }

            setTimeout(
              () => {
                appWindow.close();
              },
              IN_GAME ? 300 : 0
            );
          }}
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
