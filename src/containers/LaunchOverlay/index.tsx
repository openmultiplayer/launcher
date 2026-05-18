import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { t } from "i18next";
import Text from "../../components/Text";
import { useGameLaunch } from "../../states/gameLaunch";
import { useTheme } from "../../states/theme";
import { sc } from "../../utils/sizeScaler";

// Full-window overlay shown while a game launch is in progress. The bar is
// indeterminate (the launch has no granular progress events).
const LaunchOverlay = () => {
  const { launching } = useGameLaunch();
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!launching) return;
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      anim.setValue(0);
    };
  }, [launching, anim]);

  if (!launching) return null;

  const trackWidth = sc(260);
  const fillWidth = sc(90);
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-fillWidth, trackWidth],
  });

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
});

export default LaunchOverlay;
