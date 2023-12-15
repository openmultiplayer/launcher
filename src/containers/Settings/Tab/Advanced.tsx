import { Pressable, StyleSheet, View } from "react-native";
import CheckBox from "../../../components/CheckBox";
import Text from "../../../components/Text";
import { useGenericPersistentState } from "../../../states/genericStates";
import { useTheme } from "../../../states/theme";
import { sc } from "../../../utils/sizeScaler";
import { t } from "i18next";
import { invoke } from "@tauri-apps/api";

const Advanced = () => {
  const { theme } = useTheme();
  const { shouldUpdateDiscordStatus, toggleDiscordStatus } =
    useGenericPersistentState();

  return (
    <View
      style={{
        paddingHorizontal: 12,
        overflow: "hidden",
        paddingTop: sc(6),
        paddingBottom: sc(12),
        flex: 1,
      }}
    >
      <View
        style={{
          height: "100%",
          width: "100%",
          marginTop: sc(10),
        }}
      >
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={async () => {
            await invoke("toggle_drpc", {
              toggle: !shouldUpdateDiscordStatus,
            });
            toggleDiscordStatus(!shouldUpdateDiscordStatus);
          }}
        >
          <CheckBox
            value={shouldUpdateDiscordStatus}
            style={{ marginRight: sc(7) }}
          />
          <Text semibold color={theme.textPrimary} size={2}>
            {t("settings_advanced_discord_status")}
          </Text>
        </Pressable>
      </View>
      <View style={styles.pathInputContainer}></View>
    </View>
  );
};

const styles = StyleSheet.create({
  pathInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 7,
  },
  pathInput: {
    paddingHorizontal: 5,
    flex: 1,
    backgroundColor: "#FFFFFF",
    height: 29,
    borderRadius: 8,
    borderWidth: 2,
    outlineStyle: "none",
  },
  browseButton: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  importButton: {
    marginTop: 10,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  resetButton: {
    marginTop: 5,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  appInfoContainer: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
    alignItems: "center",
  },
});

export default Advanced;
