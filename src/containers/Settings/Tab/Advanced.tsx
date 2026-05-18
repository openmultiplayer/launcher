import { invoke } from "@tauri-apps/api";
import { t } from "i18next";
import { useEffect, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Text from "../../../components/Text";
import { IN_GAME } from "../../../constants/app";
import { useSettings } from "../../../states/settings";
import { useTheme } from "../../../states/theme";
import {
  exportFavoriteListFile,
  importFavoriteListFile,
} from "../../../utils/game";
import { sc } from "../../../utils/sizeScaler";

const Advanced = () => {
  const { theme } = useTheme();
  const { customGameExe, setCustomGameExe, bottleName, setBottleName } =
    useSettings();
  const [bottles, setBottles] = useState<string[]>([]);
  const [autoBottle, setAutoBottle] = useState("");

  useEffect(() => {
    invoke<string[]>("list_bottles")
      .then(setBottles)
      .catch(() => setBottles([]));
    invoke<{ bottle: string }>("get_macos_health", { bottleName: "" })
      .then((h) => setAutoBottle(h.bottle))
      .catch(() => setAutoBottle(""));
  }, []);

  const autoLabel = autoBottle
    ? `${t("settings_bottle_auto_detect")} — ${autoBottle}`
    : t("settings_bottle_auto_detect");

  return (
    <View
      style={{
        paddingHorizontal: 12,
        overflow: "hidden",
        paddingVertical: 10,
        flex: 1,
      }}
    >
      {!IN_GAME && (
        <View>
          <Text semibold color={theme.textPrimary} size={2}>
            {t("settings_custom_game_exe_label")}:
          </Text>
          <View style={styles.pathInputContainer}>
            <TextInput
              value={customGameExe}
              onChangeText={(text) => setCustomGameExe(text)}
              style={[
                styles.pathInput,
                {
                  color: theme.textPrimary,
                  backgroundColor: theme.textInputBackgroundColor,
                },
              ]}
            />
          </View>

          <View style={{ marginTop: sc(12) }}>
            <Text semibold color={theme.textPrimary} size={2}>
              {t("settings_bottle_name_label")}:
            </Text>
            {/* Native select — reliable, unlike the overlay dropdown. */}
            <select
              value={bottleName}
              onChange={(e) => setBottleName(e.target.value)}
              style={{
                marginTop: 7,
                width: "100%",
                height: sc(38),
                borderRadius: sc(5),
                border: "none",
                outline: "none",
                paddingLeft: sc(8),
                paddingRight: sc(8),
                color: theme.textPrimary as string,
                backgroundColor: theme.textInputBackgroundColor as string,
                fontFamily: "Proxima Nova Regular",
                fontSize: sc(15),
              }}
            >
              <option value="">{autoLabel}</option>
              {bottles.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </View>
        </View>
      )}
      <View style={{ flex: 1 }} />
      <View style={{ width: "100%", marginTop: sc(10) }}>
        <TouchableOpacity
          style={[
            styles.importButton,
            { backgroundColor: `${theme.primary}BB`, borderColor: theme.primary },
          ]}
          onPress={() => exportFavoriteListFile()}
        >
          <Text semibold color={"#FFFFFF"} size={2}>
            {t("settings_export_favorite_list_file")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.importButton,
            { backgroundColor: `${theme.primary}BB`, borderColor: theme.primary },
          ]}
          onPress={() => importFavoriteListFile()}
        >
          <Text semibold color={"#FFFFFF"} size={2}>
            {t("settings_import_favorite_list_file")}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: sc(10),
    flex: 1,
    height: sc(38),
    borderRadius: sc(5),
    // @ts-ignore
    outlineStyle: "none",
    fontFamily: "Proxima Nova Regular",
    fontSize: sc(17),
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
});

export default Advanced;
