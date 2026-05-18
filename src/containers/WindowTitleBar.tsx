import { invoke } from "@tauri-apps/api";
import { appWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";
import { memo, useCallback, useMemo } from "react";
import { ColorValue, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "../components/Icon";
import Text from "../components/Text";
import { IN_GAME, IN_GAME_PROCESS_ID } from "../constants/app";
import { images } from "../constants/images";
import { useSettingsModal } from "../states/settingsModal";
import { useTheme } from "../states/theme";
import { sc } from "../utils/sizeScaler";

// macOS-style traffic lights (close / minimize / zoom), top-left.
const TRAFFIC_LIGHTS = [
  { key: "close", color: "#FF5F57" },
  { key: "minimize", color: "#FEBC2E" },
  { key: "maximize", color: "#28C840" },
] as const;

interface TrafficLightsProps {
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

const TrafficLights = memo<TrafficLightsProps>(
  ({ onClose, onMinimize, onMaximize }) => {
    const handlers: Record<string, () => void> = {
      close: onClose,
      minimize: onMinimize,
      maximize: onMaximize,
    };
    return (
      // @ts-ignore — zIndex keeps the lights above the drag region.
      <View style={styles.trafficLights}>
        {TRAFFIC_LIGHTS.map((light) => (
          <Pressable
            key={light.key}
            onPress={handlers[light.key]}
            style={({ pressed, hovered }: any) => [
              styles.light,
              { backgroundColor: light.color, opacity: pressed ? 0.6 : hovered ? 0.85 : 1 },
            ]}
          />
        ))}
      </View>
    );
  }
);

interface CustomButtonProps {
  size?: number;
  iconSize?: number;
  image: string;
  title?: string;
  onPress: () => void;
  marginRight?: number;
  className?: string;
  color?: ColorValue;
  backgroundColor?: string;
}

const CustomWindowTitleBarButtons = memo<CustomButtonProps>(
  ({
    size = sc(30),
    image,
    onPress,
    iconSize = sc(20),
    title = "",
    className,
    marginRight = 0,
    color,
    backgroundColor,
  }) => {
    const isSvg = useMemo(() => image.includes(".svg"), [image]);

    const containerStyle = useMemo(
      () => ({
        height: size,
        width: size,
        borderRadius: sc(3),
        marginRight,
        backgroundColor,
      }),
      [size, marginRight, backgroundColor]
    );

    const pressableStyle = useMemo(
      () => ({
        height: "100%",
        width: "100%",
        justifyContent: "center" as const,
        alignItems: "center" as const,
      }),
      []
    );

    return (
      <div className={className} style={containerStyle}>
        {/* @ts-ignore */}
        <Pressable style={pressableStyle} onPress={onPress}>
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
  }
);

const WindowTitleBar = memo(() => {
  const { t, i18n } = useTranslation();
  const { theme, themeType, setTheme } = useTheme();
  const { show: showSettings } = useSettingsModal();

  const containerStyles = useMemo(
    () => ({
      main: {
        width: "100%",
        display: "flex",
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        paddingTop: sc(15),
        paddingHorizontal: sc(15),
        paddingBottom: sc(12),
        borderBottomWidth: 1,
        borderBottomColor: `${theme.textPrimary}1F`,
      },
      leftSection: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
      },
      logoContainer: [
        styles.logoContainer,
        { backgroundColor: theme.itemBackgroundColor },
      ],
      titleText: {
        marginLeft: sc(12),
      },
      dragRegion: {
        position: "absolute" as const,
        top: 0,
        left: 0,
        height: sc(32),
        width: "100%",
        display: "flex",
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        padding: sc(15),
      },
      rightSection: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        height: "100%",
      },
      inputs: {
        height: "100%",
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginRight: sc(10),
      },
      reconnectButton: {
        height: sc(35),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: sc(20),
        borderRadius: sc(5),
        backgroundColor: theme.primary,
        // @ts-ignore
        filter: `drop-shadow(0 0 20px ${theme.primary}44)`,
      },
    }),
    [theme.itemBackgroundColor, theme.textPrimary]
  );

  const handleReconnect = useCallback(() => {
    invoke("send_message_to_game", {
      id: IN_GAME_PROCESS_ID,
      message: "reconnect",
    });
  }, []);

  const handleThemeToggle = useCallback(() => {
    setTheme(themeType === "dark" ? "light" : "dark");
  }, [themeType, setTheme]);

  const handleMinimize = useCallback(() => {
    appWindow.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    appWindow.toggleMaximize();
  }, []);

  const handleClose = useCallback(() => {
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
  }, []);

  const themeIcon = useMemo(
    () =>
      themeType === "dark" ? images.icons.lightTheme : images.icons.darkTheme,
    [themeType]
  );

  const buttonTitles = useMemo(() => {
    return {
      reconnect: t("reconnect"),
      settings: t("settings"),
    };
  }, [t, i18n.language]);

  return (
    // @ts-ignore
    <View style={containerStyles.main}>
      {/* Drag region first so the buttons rendered after it stay clickable. */}
      {!IN_GAME && (
        <div data-tauri-drag-region style={containerStyles.dragRegion} />
      )}
      <View style={containerStyles.leftSection}>
        <TrafficLights
          onClose={handleClose}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
        />
        <View style={containerStyles.logoContainer}>
          <Icon image={images.icons.omp} size={sc(22)} />
        </View>
        <Text
          semibold
          size={3}
          color={theme.textPrimary}
          style={containerStyles.titleText}
        >
          Open Multiplayer
        </Text>
      </View>
      {/* @ts-ignore */}
      <View style={containerStyles.rightSection}>
        {IN_GAME && (
          // @ts-ignore
          <View style={containerStyles.inputs}>
            <TouchableOpacity
              onPress={handleReconnect}
              // @ts-ignore
              style={containerStyles.reconnectButton}
            >
              <Text style={{ fontSize: sc(18) }} color="white" semibold>
                {buttonTitles.reconnect}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <CustomWindowTitleBarButtons
          title=""
          iconSize={sc(30)}
          image={themeIcon}
          marginRight={!IN_GAME ? sc(10) : 0}
          onPress={handleThemeToggle}
        />
        {!IN_GAME && (
          <CustomWindowTitleBarButtons
            title={buttonTitles.settings}
            image={images.icons.settings}
            color={theme.textSecondary}
            backgroundColor={theme.itemBackgroundColor}
            onPress={showSettings}
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  logoContainer: {
    height: sc(32),
    width: sc(32),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: sc(5),
  },
  trafficLights: {
    flexDirection: "row",
    alignItems: "center",
    gap: sc(8),
    marginRight: sc(14),
    // @ts-ignore — sit above the absolute drag region so clicks land.
    zIndex: 20,
  },
  light: {
    height: sc(13),
    width: sc(13),
    borderRadius: sc(7),
  },
});

TrafficLights.displayName = "TrafficLights";
CustomWindowTitleBarButtons.displayName = "CustomWindowTitleBarButtons";
WindowTitleBar.displayName = "WindowTitleBar";

export default WindowTitleBar;
