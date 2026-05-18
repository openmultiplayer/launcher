import { invoke } from "@tauri-apps/api";
import { t } from "i18next";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "../../../components/Text";
import { useSettings } from "../../../states/settings";
import { useTheme } from "../../../states/theme";
import { sc } from "../../../utils/sizeScaler";

interface MacosHealth {
  crossover: boolean;
  game_exe: boolean;
  rockstar_launcher: boolean;
  game_path: string;
  bottle: string;
}

const GREEN = "#3FB950";
const RED = "#E5534B";

// Settings > Status: macOS prerequisites, each Linked / Not linked. Tap the
// (?) on a row to see what to do.
const Health = () => {
  const { theme } = useTheme();
  const { bottleName } = useSettings();
  const [health, setHealth] = useState<MacosHealth | undefined>(undefined);
  const [expanded, setExpanded] = useState<string>("");

  const refresh = useCallback(() => {
    invoke<MacosHealth>("get_macos_health", { bottleName })
      .then(setHealth)
      .catch(() => setHealth(undefined));
  }, [bottleName]);

  useEffect(() => refresh(), [refresh]);

  const crossover = !!health?.crossover;
  const bottleOk = !!health?.bottle;
  const gameOk = !!health?.game_exe;

  const rows = [
    {
      key: "crossover",
      label: t("settings_health_crossover_app"),
      sub: crossover ? "/Applications/CrossOver.app" : "",
      ok: crossover,
      help: crossover
        ? t("settings_health_help_crossover_ok")
        : t("settings_health_help_crossover_bad"),
    },
    {
      key: "bottle",
      label: t("settings_health_crossover_bottle"),
      sub: health?.bottle || t("settings_health_no_bottle"),
      ok: bottleOk,
      help: bottleOk
        ? t("settings_health_help_bottle_ok")
        : t("settings_health_help_bottle_bad"),
    },
    {
      key: "game",
      label: t("settings_health_game_file"),
      sub: gameOk ? health?.game_path || "" : "",
      ok: gameOk,
      help: gameOk
        ? t("settings_health_help_game_ok")
        : t("settings_health_help_game_bad"),
    },
  ];

  return (
    <View style={styles.container}>
      {rows.map((row) => {
        const color = health ? (row.ok ? GREEN : RED) : "#888";
        const isOpen = expanded === row.key;
        return (
          <View
            key={row.key}
            style={[styles.card, { backgroundColor: theme.itemBackgroundColor }]}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardText}>
                <Text semibold size={2} color={theme.textPrimary}>
                  {row.label}
                </Text>
                {row.sub.length > 0 && (
                  <Text
                    size={1}
                    color={`${theme.textPrimary}88`}
                    style={styles.sub}
                    selectable
                  >
                    {row.sub}
                  </Text>
                )}
              </View>
              <View style={styles.statusArea}>
                <View style={[styles.chip, { backgroundColor: `${color}1F` }]}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text size={1} semibold color={color}>
                    {health
                      ? row.ok
                        ? t("settings_health_linked")
                        : t("settings_health_not_linked")
                      : "…"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setExpanded(isOpen ? "" : row.key)}
                  style={[
                    styles.help,
                    {
                      borderColor: isOpen
                        ? theme.primary
                        : `${theme.textPrimary}55`,
                    },
                  ]}
                >
                  <Text
                    size={1}
                    semibold
                    color={isOpen ? theme.primary : `${theme.textPrimary}AA`}
                  >
                    ?
                  </Text>
                </Pressable>
              </View>
            </View>
            {isOpen && (
              <Text
                size={1}
                color={`${theme.textPrimary}AA`}
                numberOfLines={0}
                style={styles.help_text}
              >
                {row.help}
              </Text>
            )}
          </View>
        );
      })}

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
    gap: sc(8),
  },
  card: {
    paddingVertical: sc(10),
    paddingHorizontal: sc(12),
    borderRadius: sc(8),
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardText: {
    flex: 1,
    marginRight: sc(10),
  },
  sub: {
    marginTop: sc(2),
  },
  statusArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: sc(8),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: sc(5),
    paddingVertical: sc(4),
    paddingHorizontal: sc(9),
    borderRadius: sc(20),
  },
  dot: {
    width: sc(8),
    height: sc(8),
    borderRadius: sc(4),
  },
  help: {
    width: sc(20),
    height: sc(20),
    borderRadius: sc(10),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    // @ts-ignore
    cursor: "pointer",
  },
  help_text: {
    marginTop: sc(8),
    lineHeight: sc(18),
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
