import { invoke } from "@tauri-apps/api";
import { t } from "i18next";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "../../../components/Text";
import { useTheme } from "../../../states/theme";
import { sc } from "../../../utils/sizeScaler";

interface MacosHealth {
  crossover: boolean;
  game_exe: boolean;
  rockstar_launcher: boolean;
  game_path: string;
}

const GREEN = "#3FB950";
const RED = "#E5534B";

// Settings > Health: shows whether the macOS game prerequisites are in place.
const Health = () => {
  const { theme } = useTheme();
  const [health, setHealth] = useState<MacosHealth | undefined>(undefined);

  const refresh = useCallback(() => {
    invoke<MacosHealth>("get_macos_health")
      .then(setHealth)
      .catch(() => setHealth(undefined));
  }, []);

  useEffect(() => refresh(), [refresh]);

  const rows: { label: string; ok: boolean }[] = [
    { label: t("settings_health_crossover"), ok: !!health?.crossover },
    { label: t("settings_health_game_exe"), ok: !!health?.game_exe },
    {
      label: t("settings_health_rockstar"),
      ok: !!health?.rockstar_launcher,
    },
  ];

  return (
    <View style={styles.container}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View
            style={[
              styles.dot,
              { backgroundColor: health ? (row.ok ? GREEN : RED) : "#888" },
            ]}
          />
          <Text semibold size={2} color={theme.textPrimary}>
            {row.label}
          </Text>
          <Text size={1} color={`${theme.textPrimary}99`} style={styles.state}>
            {health ? (row.ok ? t("settings_health_ok") : t("settings_health_missing")) : "…"}
          </Text>
        </View>
      ))}

      {health?.game_exe && health.game_path.length > 0 && (
        <Text
          size={1}
          color={`${theme.textPrimary}88`}
          style={styles.path}
          selectable
        >
          {health.game_path}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.refresh, { backgroundColor: theme.primary }]}
        onPress={refresh}
      >
        <Text semibold size={1} color={"#FFFFFF"}>
          {t("settings_health_recheck")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: sc(12),
    paddingVertical: sc(10),
    flex: 1,
    gap: sc(10),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sc(10),
  },
  dot: {
    width: sc(12),
    height: sc(12),
    borderRadius: sc(6),
  },
  state: {
    marginLeft: "auto",
  },
  path: {
    marginTop: sc(2),
  },
  refresh: {
    marginTop: "auto",
    alignSelf: "flex-start",
    paddingVertical: sc(7),
    paddingHorizontal: sc(20),
    borderRadius: sc(6),
  },
});

export default Health;
