import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../../components/Text";
import { ShortcutConfig, useShortcuts } from "../../../states/shortcuts";
import { useTheme } from "../../../states/theme";
import { normalizeKeyFromEvent } from "../../../utils/shortcutHelper";
import { sc } from "../../../utils/sizeScaler";

const ShortcutsTab = () => {
  const { t } = useTranslation();
  const { theme, themeType } = useTheme();
  const { shortcuts, setShortcut, resetShortcut, resetAllShortcuts } =
    useShortcuts();
  const [recordingId, setRecordingId] = useState<string | null>(null);

  // Global keydown listener when recording a shortcut
  useEffect(() => {
    if (!recordingId) return;

    const handleRecordKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels recording
      if (e.key === "Escape") {
        setRecordingId(null);
        return;
      }

      const keyCombo = normalizeKeyFromEvent(e);
      if (keyCombo) {
        setShortcut(recordingId, keyCombo);
        setRecordingId(null);
      }
    };

    window.addEventListener("keydown", handleRecordKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleRecordKey, { capture: true });
    };
  }, [recordingId, setShortcut]);

  const handleStartRecord = useCallback(
    (id: string) => {
      setRecordingId(id === recordingId ? null : id);
    },
    [recordingId]
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.listCard,
          { backgroundColor: theme.itemBackgroundColor },
        ]}
      >
        <ScrollView id={themeType === "dark" ? "scroll" : "scroll-light"}>
          {shortcuts.map((item: ShortcutConfig, index: number) => {
            const isRecording = recordingId === item.id;
            const isModified = item.currentKey !== item.defaultKey;

            return (
              <View
                key={item.id}
                style={[
                  styles.shortcutRow,
                  {
                    borderBottomColor: `${theme.textSecondary}22`,
                    borderBottomWidth: index === shortcuts.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View style={styles.shortcutInfo}>
                  <Text semibold color={theme.textPrimary} size={2}>
                    {t(item.labelKey)}
                  </Text>
                  <Text
                    color={theme.textSecondary}
                    style={styles.descriptionText}
                  >
                    {t(item.descriptionKey)}
                  </Text>
                </View>

                <View style={styles.actionGroup}>
                  {isModified && (
                    <Pressable
                      style={[
                        styles.resetSingleBtn,
                        { backgroundColor: `${theme.textSecondary}22` },
                      ]}
                      onPress={() => resetShortcut(item.id)}
                    >
                      <Text
                        size={2}
                        color={theme.textSecondary}
                        style={{ lineHeight: sc(14) }}
                      >
                        ↺
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={[
                      styles.keyBadge,
                      {
                        backgroundColor: isRecording
                          ? theme.primary
                          : `${theme.secondary}`,
                        borderColor: isRecording
                          ? theme.primary
                          : `${theme.textSecondary}55`,
                      },
                    ]}
                    onPress={() => handleStartRecord(item.id)}
                  >
                    <Text
                      semibold
                      size={2}
                      color={isRecording ? "#FFFFFF" : theme.textPrimary}
                    >
                      {isRecording
                        ? t("shortcuts_press_keys_prompt")
                        : item.currentKey}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.bottomBar}>
        <Text color={theme.textSecondary} style={styles.helperTip}>
          {recordingId
            ? t("shortcuts_recording_hint")
            : t("shortcuts_click_to_edit_hint")}
        </Text>

        <Pressable
          style={[
            styles.resetAllBtn,
            { backgroundColor: `${theme.primary}22` },
          ]}
          onPress={resetAllShortcuts}
        >
          <Text semibold size={2} color={theme.primary}>
            {t("shortcuts_reset_all")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: sc(12),
    paddingTop: sc(6),
    paddingBottom: sc(6),
    flex: 1,
    overflow: "hidden",
  },
  listCard: {
    flex: 1,
    width: "100%",
    borderRadius: sc(8),
    paddingHorizontal: sc(12),
    paddingVertical: sc(4),
  },
  shortcutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: sc(8),
  },
  shortcutInfo: {
    flex: 1,
    paddingRight: sc(10),
  },
  descriptionText: {
    fontSize: sc(12),
    marginTop: sc(2),
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  keyBadge: {
    paddingHorizontal: sc(12),
    paddingVertical: sc(6),
    borderRadius: sc(6),
    borderWidth: 1,
    minWidth: sc(90),
    alignItems: "center",
    justifyContent: "center",
  },
  resetSingleBtn: {
    width: sc(26),
    height: sc(26),
    borderRadius: sc(13),
    alignItems: "center",
    justifyContent: "center",
    marginRight: sc(6),
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: sc(8),
    paddingHorizontal: sc(4),
  },
  helperTip: {
    fontSize: sc(12),
    flex: 1,
  },
  resetAllBtn: {
    paddingHorizontal: sc(10),
    paddingVertical: sc(5),
    borderRadius: sc(5),
    marginLeft: sc(10),
  },
});

export default ShortcutsTab;
