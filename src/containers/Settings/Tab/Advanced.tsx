import CheckBox from "../../../components/CheckBox";
import Text from "../../../components/Text";
import { t } from "i18next";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { useGenericPersistentState } from "../../../states/genericStates";
import { useTheme } from "../../../states/theme";
import { sc } from "../../../utils/sizeScaler";
import { stateStorage } from "../../../utils/stateStorage";

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
          gap: 8,
        }}
      >
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={async () => {
            toggleDiscordStatus(!shouldUpdateDiscordStatus);
          }}
        >
          <CheckBox
            value={shouldUpdateDiscordStatus}
            style={{ marginRight: sc(7) }}
          />
          <Text semibold color={theme.textPrimary} size={2}>
            {`${t("settings_advanced_discord_status")} ${t(
              "settings_advanced_discord_status_requires_restart"
            )}`}
          </Text>
        </Pressable>
        <TouchableOpacity
          style={[
            styles.resetButton,
            {
              backgroundColor: "red",
            },
          ]}
          onPress={() => {
            stateStorage.clear();
            localStorage.clear();
            window.location.reload();
          }}
        >
          <Text semibold color={"#FFFFFF"} size={2}>
            {t("settings_reset_application_data")}
          </Text>
        </TouchableOpacity>
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
    // @ts-ignore
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
