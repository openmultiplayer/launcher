import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../../components/Text";
import { HotkeyConfig, useHotkeys } from "../../../states/hotkeys";
import { useTheme } from "../../../states/theme";
import { normalizeKeyFromEvent } from "../../../utils/hotkeyHelper";
import { sc } from "../../../utils/sizeScaler";

const HotkeysTab = () => {
  const { t } = useTranslation();
  const { theme, themeType } = useTheme();
  const { hotkeys, setHotkey, resetHotkey, resetAllHotkeys } = useHotkeys();
  const [recordingId, setRecordingId] = useState<string | null>(null);

  // Global keydown listener when recording a hotkey
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
        setHotkey(recordingId, keyCombo);
        setRecordingId(null);
      }
    };

    window.addEventListener("keydown", handleRecordKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleRecordKey, { capture: true });
    };
  }, [recordingId, setHotkey]);

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
          {hotkeys.map((hk: HotkeyConfig, index: number) => {
            const isRecording = recordingId === hk.id;
            const isModified = hk.currentKey !== hk.defaultKey;

            return (
              <View
                key={hk.id}
                style={[
                  styles.hotkeyRow,
                  {
                    borderBottomColor: `${theme.textSecondary}22`,
                    borderBottomWidth: index === hotkeys.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View style={styles.hotkeyInfo}>
                  <Text semibold color={theme.textPrimary} size={2}>
                    {t(hk.labelKey)}
                  </Text>
                  <Text
                    color={theme.textSecondary}
                    style={styles.descriptionText}
                  >
                    {t(hk.descriptionKey)}
                  </Text>
                </View>

                <View style={styles.actionGroup}>
                  {isModified && (
                    <Pressable
                      style={[
                        styles.resetSingleBtn,
                        { backgroundColor: `${theme.textSecondary}22` },
                      ]}
                      onPress={() => resetHotkey(hk.id)}
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
                    onPress={() => handleStartRecord(hk.id)}
                  >
                    <Text
                      semibold
                      size={2}
                      color={isRecording ? "#FFFFFF" : theme.textPrimary}
                    >
                      {isRecording
                        ? t("hotkeys_press_keys_prompt")
                        : hk.currentKey}
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
            ? t("hotkeys_recording_hint")
            : t("hotkeys_click_to_edit_hint")}
        </Text>

        <Pressable
          style={[
            styles.resetAllBtn,
            { backgroundColor: `${theme.primary}22` },
          ]}
          onPress={resetAllHotkeys}
        >
          <Text semibold size={2} color={theme.primary}>
            {t("hotkeys_reset_all")}
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
  hotkeyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: sc(8),
  },
  hotkeyInfo: {
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

export default HotkeysTab;
