import { invoke, process, shell } from "@tauri-apps/api";
import { exists } from "@tauri-apps/api/fs";
import { t } from "i18next";
import { useJoinServerPrompt } from "../states/joinServerPrompt";
import { useMessageBox } from "../states/messageModal";
import { usePersistentServers, useServers } from "../states/servers";
import { useSettingsModal } from "../states/settingsModal";
import { Server } from "./types";

export const startGame = async (
  server: Server,
  nickname: string,
  gtasaPath: string,
  sampDllPath: string,
  password: string
) => {
  const {
    addToRecentlyJoined,
    updateInFavoritesList,
    updateInRecentlyJoinedList,
  } = usePersistentServers.getState();
  const { updateServer } = useServers.getState();
  const { showMessageBox, hideMessageBox } = useMessageBox.getState();
  const { show: showSettings } = useSettingsModal.getState();
  const { showPrompt, setServer } = useJoinServerPrompt.getState();

  if (password.length) {
    const srvCpy = { ...server };
    srvCpy.password = password;

    updateServer(srvCpy);
    updateInFavoritesList(srvCpy);
    updateInRecentlyJoinedList(srvCpy);
  }

  if (!gtasaPath || gtasaPath.length < 1) {
    showMessageBox({
      title: t("gta_path_modal_path_not_set_title"),
      description: t("gta_path_modal_path_not_set_description"),
      buttons: [
        {
          title: t("open_settings"),
          onPress: () => {
            showPrompt(false);
            showSettings();
            hideMessageBox();
          },
        },
        {
          title: t("cancel"),
          onPress: () => {
            showPrompt(true);
            setServer(server);
            hideMessageBox();
          },
        },
      ],
    });
    return;
  }

  if (!nickname || nickname.length < 1) {
    showMessageBox({
      title: t("nickname_modal_name_not_set_title"),
      description: t("nickname_modal_name_not_set_description"),
      buttons: [
        {
          title: "Okay",
          onPress: () => {
            showPrompt(true);
            setServer(server);
            hideMessageBox();
          },
        },
      ],
    });
    return;
  }

  const dirValidity = await checkDirectoryValidity(gtasaPath, () => {
    showPrompt(true);
    setServer(server);
  });

  if (!dirValidity) {
    return;
  }

  invoke("inject", {
    name: nickname,
    ip: server.ip,
    port: server.port,
    exe: gtasaPath,
    dll: sampDllPath,
    password: password,
  })
    .then(() => {
      addToRecentlyJoined(server);
    })
    .catch(async (e) => {
      if (e == "need_admin") {
        showMessageBox({
          title: t("admin_permissions_required_modal_title"),
          description: t("admin_permissions_required_modal_description"),
          buttons: [
            {
              title: t("run_as_admin"),
              onPress: async () => {
                await invoke("rerun_as_admin").then(() => {
                  process.exit();
                });
              },
            },
            {
              title: t("cancel"),
              onPress: () => hideMessageBox(),
            },
          ],
        });
      }
    });
};

export const checkDirectoryValidity = async (
  path: string,
  onFail?: () => void
) => {
  const { showMessageBox, hideMessageBox } = useMessageBox.getState();
  const { show: showSettings } = useSettingsModal.getState();
  const { showPrompt } = useJoinServerPrompt.getState();

  const gtasaExists = await exists(path + "/gta_sa.exe");
  if (!gtasaExists) {
    showMessageBox({
      title: t("gta_path_modal_cant_find_game_title"),
      description: t("gta_path_modal_cant_find_game_description", {
        path: path,
      }),
      boxWidth: 360,
      buttonWidth: 150,
      buttons: [
        {
          title: t("open_settings"),
          onPress: () => {
            showPrompt(false);
            showSettings();
            hideMessageBox();
          },
        },
        {
          title: t("cancel"),
          onPress: () => {
            if (onFail) {
              onFail();
            }
            hideMessageBox();
          },
        },
      ],
    });
    return false;
  }

  const sampExists = await exists(path + "/samp.dll");
  if (!sampExists) {
    showMessageBox({
      title: t("gta_path_modal_cant_find_samp_title"),
      description: t("gta_path_modal_cant_find_samp_description", {
        path: path,
      }),
      boxWidth: 360,
      buttonWidth: 150,
      buttons: [
        {
          title: t("download"),
          onPress: () => {
            shell.open("https://sa-mp.mp/downloads/");
          },
        },
        {
          title: t("cancel"),
          onPress: () => {
            if (onFail) {
              onFail();
            }
            hideMessageBox();
          },
        },
      ],
    });
    return false;
  }

  return true;
};
