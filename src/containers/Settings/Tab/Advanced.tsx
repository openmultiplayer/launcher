import { t } from "i18next";
import { Pressable, StyleSheet, View } from "react-native";
import CheckBox from "../../../components/CheckBox";
import Text from "../../../components/Text";
import { useGenericPersistentState } from "../../../states/genericStates";
import { useTheme } from "../../../states/theme";
import { sc } from "../../../utils/sizeScaler";

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
          disabled={true}
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={async () => {
            return;
            toggleDiscordStatus(!shouldUpdateDiscordStatus);
          }}
        >
          <CheckBox value={true} style={{ marginRight: sc(7) }} />
          <Text semibold color={theme.textPlaceholder} size={2}>
            {`${t("settings_advanced_discord_status")} ${t(
              "settings_advanced_discord_status_moved_to_game_menu"
            )}`}
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
