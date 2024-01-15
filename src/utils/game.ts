import { fs, invoke, path, process } from "@tauri-apps/api";
import { message } from "@tauri-apps/api/dialog";
import { exists } from "@tauri-apps/api/fs";
import { t } from "i18next";
import { invoke_rpc } from "../api/rpc";
import { ResourceInfo, validFileChecksums } from "../constants/app";
import { useJoinServerPrompt } from "../states/joinServerPrompt";
import { useMessageBox } from "../states/messageModal";
import { usePersistentServers, useServers } from "../states/servers";
import { useSettings } from "../states/settings";
import { useSettingsModal } from "../states/settingsModal";
import { Server } from "./types";

export const copySharedFilesIntoGameFolder = async () => {
  const { gtasaPath } = useSettings.getState();
  const dir = await path.appLocalDataDir();
  const shared = await path.join(dir, "samp", "shared");
  await invoke_rpc("copy_files_to_gtasa", { src: shared, gtasaDir: gtasaPath })
    .then(() => {})
    .catch((e) => message(e, { title: "Error", type: "error" }));
};

const isFileAvailableinGTASADir = async (file: ResourceInfo) => {
  const { gtasaPath } = useSettings.getState();
  const tempPath = await path.join(
    file.path.replace("samp/shared/", ""),
    file.name
  );

  const check = await fs.exists(await path.join(gtasaPath, tempPath));
  return check;
};

export const checkResourceFilesAvailability = async () => {
  const promises: Promise<boolean>[] = [];
  validFileChecksums.forEach((file) => {
    if (file.requiredInGameDir) {
      promises.push(
        new Promise(async () => await isFileAvailableinGTASADir(file))
      );
    }
  });

  return Promise.all(promises);
};

export const startGame = async (
  server: Server,
  nickname: string,
  gtasaPath: string,
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
  const { sampVersion } = useSettings.getState();
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

  let foundSampInGtaFolder = true;
  const dirValidity = await checkDirectoryValidity(
    gtasaPath,
    async (reason) => {
      if (reason === "samp") {
        foundSampInGtaFolder = false;
      } else {
        showPrompt(true);
        setServer(server);
      }
    }
  );

  if (sampVersion === "custom" && !foundSampInGtaFolder) {
    showMessageBox({
      title: t("gta_path_modal_cant_find_samp_title"),
      description: t("gta_path_modal_cant_find_samp_description", {
        path: gtasaPath,
      }),
      boxWidth: 360,
      buttonWidth: 150,
      buttons: [
        {
          title: t("change_version"),
          onPress: () => {
            hideMessageBox();
            setServer(server);
            showPrompt(true);
          },
        },
      ],
    });
    return;
  }

  if (!dirValidity) {
    return;
  }

  const idealSAMPDllPath = await path.join(gtasaPath, "/samp.dll");
  const file = validFileChecksums.get(
    sampVersion !== "custom" ? sampVersion : "037R1_samp.dll"
  );
  const ourSAMPDllPath = file
    ? await path.join(await path.appLocalDataDir(), file.path, file.name)
    : "";

  let sampDllPath =
    sampVersion === "custom" ? idealSAMPDllPath : ourSAMPDllPath;

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
  onFail?: (reason: "samp" | "gtasa") => void
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
              onFail("gtasa");
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
    if (onFail) {
      onFail("samp");
    }
  }

  return true;
};
