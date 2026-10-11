import { t } from "i18next";
import { type } from "@tauri-apps/api/os";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Text from "../../../components/Text";
import { IN_GAME } from "../../../constants/app";
import { useSettings } from "../../../states/settings";
import { useTheme } from "../../../states/theme";
import { useCacheManager } from "../../../states/cacheManager";
import {
  exportFavoriteListFile,
  importFavoriteListFile,
} from "../../../utils/game";
import { sc } from "../../../utils/sizeScaler";

const Advanced = () => {
  const { theme } = useTheme();
  const { customGameExe, setCustomGameExe } = useSettings();
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    let active = true;
    void type()
      .then((os) => {
        if (active) setSupported(os === "Windows_NT");
      })
      .catch(() => {
        if (active) setSupported(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <ScrollView
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
        </View>
      )}
      <View style={{ flex: 1 }} />
      {!IN_GAME && supported && (
        <TouchableOpacity
          style={[
            styles.importButton,
            { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
          onPress={() => useCacheManager.getState().open()}
        >
          <Text semibold color="#FFFFFF" size={2}>
            {t("cache_manager_title")}
          </Text>
        </TouchableOpacity>
      )}
      <View
        style={{
          width: "100%",
          marginTop: sc(10),
        }}
      >
        <TouchableOpacity
          style={[
            styles.importButton,
            {
              backgroundColor: `${theme.primary}BB`,
              borderColor: theme.primary,
            },
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
            {
              backgroundColor: `${theme.primary}BB`,
              borderColor: theme.primary,
            },
          ]}
          onPress={() => importFavoriteListFile()}
        >
          <Text semibold color={"#FFFFFF"} size={2}>
            {t("settings_import_favorite_list_file")}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.pathInputContainer}></View>
    </ScrollView>
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
