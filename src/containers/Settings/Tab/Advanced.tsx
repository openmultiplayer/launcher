import { invoke } from "@tauri-apps/api";
import { open } from "@tauri-apps/api/dialog";
import { t } from "i18next";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Text from "../../../components/Text";
import { IN_GAME } from "../../../constants/app";
import { useNotification } from "../../../states/notification";
import { useSettings } from "../../../states/settings";
import { useTheme } from "../../../states/theme";
import {
  exportFavoriteListFile,
  importFavoriteListFile,
} from "../../../utils/game";
import { sc } from "../../../utils/sizeScaler";

const Advanced = () => {
  const { theme } = useTheme();
  const { customGameExe, setCustomGameExe } = useSettings();
  const { showNotification } = useNotification();
  const [modelCacheFolder, setModelCacheFolder] = useState("");
  const modelCacheDraft = useRef("");
  const modelCacheEdited = useRef(false);
  const savedModelCacheFolder = useRef("");
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (IN_GAME) return;

    let active = true;
    invoke<string>("get_model_cache_folder")
      .then((folder) => {
        if (!active) return;
        if (modelCacheEdited.current) return;
        savedModelCacheFolder.current = folder;
        modelCacheDraft.current = folder;
        setModelCacheFolder(folder);
      })
      .catch((error) => {
        if (active) {
          showNotification(
            t("settings_model_cache_folder_error"),
            String(error)
          );
        }
      });
    return () => {
      active = false;
    };
  }, [showNotification]);

  const changeModelCacheFolder = (folder: string) => {
    modelCacheEdited.current = true;
    modelCacheDraft.current = folder;
    setModelCacheFolder(folder);
  };

  const saveModelCacheFolder = (folder: string) => {
    saveQueue.current = saveQueue.current.then(async () => {
      if (folder === savedModelCacheFolder.current) return;
      try {
        const saved = await invoke<string>("set_model_cache_folder", {
          folder,
        });
        savedModelCacheFolder.current = saved;
        if (modelCacheDraft.current === folder) {
          changeModelCacheFolder(saved);
        }
      } catch (error) {
        if (modelCacheDraft.current === folder) {
          changeModelCacheFolder(savedModelCacheFolder.current);
          showNotification(
            t("settings_model_cache_folder_error"),
            String(error)
          );
        }
      }
    });
  };

  const selectModelCacheFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        defaultPath: modelCacheFolder || undefined,
      });
      if (typeof selected === "string") {
        changeModelCacheFolder(selected);
        saveModelCacheFolder(selected);
      }
    } catch (error) {
      showNotification(t("settings_model_cache_folder_error"), String(error));
    }
  };

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
          <Text
            semibold
            color={theme.textPrimary}
            size={2}
            style={styles.modelCacheLabel}
          >
            {t("settings_model_cache_folder_label")}:
          </Text>
          <View style={styles.pathInputContainer}>
            <TextInput
              value={modelCacheFolder}
              onChangeText={changeModelCacheFolder}
              onBlur={() => saveModelCacheFolder(modelCacheFolder)}
              onSubmitEditing={() => saveModelCacheFolder(modelCacheFolder)}
              style={[
                styles.pathInput,
                {
                  color: theme.textPrimary,
                  backgroundColor: theme.textInputBackgroundColor,
                },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.browseButton,
                {
                  backgroundColor: `${theme.primary}BB`,
                  borderColor: theme.textSecondary,
                },
              ]}
              onPress={selectModelCacheFolder}
            >
              <Text semibold color="#FFFFFF" size={2}>
                {t("browse")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={{ flex: 1 }} />
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
    </View>
  );
};
const styles = StyleSheet.create({
  modelCacheLabel: {
    marginTop: sc(12),
  },
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
    height: sc(36),
    paddingHorizontal: sc(15),
    borderRadius: sc(5),
    marginLeft: sc(10),
    justifyContent: "center",
    alignItems: "center",
  },
  importButton: {
    marginTop: sc(8),
    height: sc(36),
    paddingHorizontal: sc(10),
    borderRadius: sc(5),
    justifyContent: "center",
    alignItems: "center",
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
