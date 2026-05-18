import { invoke } from "@tauri-apps/api";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { t } from "i18next";
import Text from "../../components/Text";
import { useGameLaunch } from "../../states/gameLaunch";
import { useTheme } from "../../states/theme";
import { sc } from "../../utils/sizeScaler";

// Full-window overlay shown while a game launch is in progress. The bar is
// indeterminate (the launch has no granular progress events) and loops
// continuously until the launch finishes or is cancelled.
const LaunchOverlay = () => {
  const { launching, setLaunching } = useGameLaunch();
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!launching) return;
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        // Web: the native driver does not loop transforms reliably.
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [launching, anim]);

  if (!launching) return null;

  const trackWidth = sc(260);
  const fillWidth = sc(90);
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-fillWidth, trackWidth],
  });

  const cancel = () => {
    invoke("kill_game").catch(() => {});
    setLaunching(false);
  };

  return (
    <View style={styles.overlay}>
      <View style={[styles.card, { backgroundColor: theme.secondary }]}>
        <Text semibold size={3} color={theme.textPrimary}>
          {t("launching_game")}
        </Text>
        <View
          style={[
            styles.track,
            { width: trackWidth, backgroundColor: theme.itemBackgroundColor },
          ]}
        >
          <Animated.View
            style={[
              styles.fill,
              {
                width: fillWidth,
                backgroundColor: theme.primary,
                transform: [{ translateX }],
              },
            ]}
          />
        </View>
        <Text size={1} color={`${theme.textPrimary}99`}>
          {t("launching_game_hint")}
        </Text>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: `${theme.textPrimary}44` }]}
          onPress={cancel}
        >
          <Text semibold size={1} color={theme.textPrimary}>
            {t("cancel")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  card: {
    paddingVertical: sc(26),
    paddingHorizontal: sc(34),
    borderRadius: sc(10),
    alignItems: "center",
    gap: sc(16),
  },
  track: {
    height: sc(8),
    borderRadius: sc(4),
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: sc(4),
  },
  cancelButton: {
    marginTop: sc(4),
    paddingVertical: sc(7),
    paddingHorizontal: sc(22),
    borderRadius: sc(6),
    borderWidth: 1,
  },
});

export default LaunchOverlay;
