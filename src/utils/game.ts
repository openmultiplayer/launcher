import { fs, invoke, path, process, shell } from "@tauri-apps/api";
import { open, save } from "@tauri-apps/api/dialog";
import { exists, readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import { t } from "i18next";
import {
  IN_GAME,
  IN_GAME_PROCESS_ID,
  ResourceInfo,
  validFileChecksums,
} from "../constants/app";
import { useJoinServerPrompt } from "../states/joinServerPrompt";
import { useMessageBox } from "../states/messageModal";
import { useNotification } from "../states/notification";
import { usePersistentServers, useServers } from "../states/servers";
import { useSettings } from "../states/settings";
import { useSettingsModal } from "../states/settingsModal";
import { fetchServers, getIpAddress } from "../utils/helpers";
import { Log } from "./logger";
import { sc } from "./sizeScaler";
import { Server } from "./types";

const showOkModal = (title: string, description: string) => {
  const { showMessageBox, hideMessageBox } = useMessageBox.getState();
  showMessageBox({
    title,
    description,
    buttons: [{ title: "OK", onPress: hideMessageBox }],
  });
};

const getLocalPath = async (...segments: string[]) =>
  path.join(await path.appLocalDataDir(), ...segments);

export const copySharedFilesIntoGameFolder = async () => {
  const { gtasaPath } = useSettings.getState();
  const shared = await getLocalPath("samp", "shared");
  await invoke("copy_files_to_gtasa", {
    src: shared,
    gtasaDir: gtasaPath,
  }).then((e) => {
    throw e;
  });
};

const isFileAvailableInGTASADir = async (file: ResourceInfo) => {
  const { gtasaPath } = useSettings.getState();
  const tempPath = await path.join(
    file.path.replace("samp/shared/", ""),
    file.name
  );
  return fs.exists(await path.join(gtasaPath, tempPath));
};

export const checkResourceFilesAvailability = async () => {
  const checks = Array.from(validFileChecksums.values())
    .filter((file) => file.requiredInGameDir)
    .map((file) => isFileAvailableInGTASADir(file));

  return Promise.all(checks);
};

export const startGame = async (
  server: Server,
  nickname: string,
  gtasaPath: string,
  password: string
) => {
  const { addToRecentlyJoined } = usePersistentServers.getState();
  const { showMessageBox, hideMessageBox } = useMessageBox.getState();
  const { show: showSettings } = useSettingsModal.getState();
  const { sampVersion, customGameExe } = useSettings.getState();
  const { showPrompt, setServer } = useJoinServerPrompt.getState();
  const { setSelected } = useServers.getState();

  if (IN_GAME) {
    invoke("send_message_to_game", {
      id: IN_GAME_PROCESS_ID,
      message: password.length
        ? `connect:${await getIpAddress(server.ip)}:${
            server.port
          }:${nickname}:${password}`
        : `connect:${await getIpAddress(server.ip)}:${server.port}:${nickname}`,
    });
    return;
  }

  if (!gtasaPath) {
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

  if (!nickname) {
    showOkModal(
      t("nickname_modal_name_not_set_title"),
      t("nickname_modal_name_not_set_description")
    );
    showPrompt(true);
    setServer(server);
    return;
  }

  let foundSampInGtaFolder = true;
  const dirValidity = await checkDirectoryValidity(gtasaPath, (reason) => {
    if (reason === "samp") foundSampInGtaFolder = false;
    else {
      showPrompt(true);
      setServer(server);
    }
  });

  if (sampVersion !== "custom") {
    try {
      const checks = await checkResourceFilesAvailability();
      if (checks.includes(false)) {
        Log.debug("Missing files, copying into GTASA directory...");
        await copySharedFilesIntoGameFolder();
      }
    } catch (e) {
      if (e === "need_admin") {
        showMessageBox({
          title: t("admin_permissions_required_modal_title"),
          description: t("admin_permissions_required_modal_description"),
          boxWidth: sc(500),
          buttons: [
            {
              title: t("run_as_admin"),
              onPress: () =>
                shell
                  .open("https://assets.open.mp/run_as_admin.gif")
                  .then(() => process.exit()),
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
    }
  }

  if (sampVersion === "custom" && !foundSampInGtaFolder) {
    showMessageBox({
      title: t("gta_path_modal_cant_find_samp_title"),
      description: `${t("gta_path_modal_cant_find_samp_description", {
        path: gtasaPath,
      })}\n${t("gta_path_modal_cant_find_samp_description_2")}`,
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
        {
          title: t("download"),
          onPress: () =>
            shell.open(
              "https://uifserver.net/download/sa-mp-0.3.7-R5-1-MP-install.exe"
            ),
        },
      ],
    });
    return;
  }

  if (!dirValidity) return;

  const idealSAMPDllPath = await path.join(gtasaPath, "samp.dll");
  const file = validFileChecksums.get(
    sampVersion !== "custom" ? sampVersion : "037R1_samp.dll"
  );
  const ourSAMPDllPath =
    sampVersion === "custom"
      ? idealSAMPDllPath
      : file
      ? await getLocalPath(file.path, file.name)
      : idealSAMPDllPath;

  invoke("inject", {
    name: nickname,
    ip: await getIpAddress(server.ip),
    port: server.port,
    exe: gtasaPath,
    dll: ourSAMPDllPath,
    ompFile: await getLocalPath("omp", "omp-client.dll"),
    password,
    customGameExe,
  })
    .then(() => {
      addToRecentlyJoined(server);
      setSelected(undefined);
    })
    .catch((e) => {
      if (e === "need_admin") {
        showMessageBox({
          title: t("admin_permissions_required_modal_title"),
          description: t("admin_permissions_required_modal_description"),
          buttons: [
            {
              title: t("run_as_admin"),
              onPress: () =>
                shell
                  .open("https://assets.open.mp/run_as_admin.gif")
                  .then(() => process.exit()),
            },
            { title: t("cancel"), onPress: hideMessageBox },
          ],
        });
      }
    });
};

export const checkDirectoryValidity = async (
  dirPath: string,
  onFail?: (reason: "samp" | "gtasa") => void
) => {
  const { showMessageBox, hideMessageBox } = useMessageBox.getState();
  const { show: showSettings } = useSettingsModal.getState();
  const { showPrompt } = useJoinServerPrompt.getState();

  if (!(await exists(`${dirPath}/gta_sa.exe`))) {
    showMessageBox({
      title: t("gta_path_modal_cant_find_game_title"),
      description: t("gta_path_modal_cant_find_game_description", {
        path: dirPath,
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
            onFail?.("gtasa");
            hideMessageBox();
          },
        },
      ],
    });
    return false;
  }

  if (!(await exists(`${dirPath}/samp.dll`))) {
    onFail?.("samp");
  }
  return true;
};

export const exportFavoriteListFile = async () => {
  const { favorites } = usePersistentServers.getState();
  if (!favorites.length) {
    showOkModal(t("export_failed_title"), t("export_no_servers_description"));
    return;
  }

  try {
    const exportData = {
      version: 1,
      servers: favorites.map(({ ip, port, hostname, password }) => ({
        ip,
        port,
        name: hostname,
        password: password || "",
      })),
    };

    const savePath = await save({
      filters: [{ name: "JSON", extensions: ["json"] }],
      defaultPath: "omp_servers.json",
    });

    if (!savePath) return;
    await writeTextFile(savePath, JSON.stringify(exportData, null, 2));

    useNotification
      .getState()
      .showNotification(
        t("export_successful_title"),
        t("export_successful_description")
      );
  } catch (error) {
    Log.debug("Error exporting servers:", error);
    showOkModal(t("export_failed_title"), t("export_failed_description"));
  }
};

export const importFavoriteListFile = async () => {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!selected) return;

    const fileContent = await readTextFile(selected as string);
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data.servers)) {
      throw new Error("Invalid file format: missing servers array");
    }

    const { addToFavorites } = usePersistentServers.getState();

    data.servers.forEach((srv: any) => {
      if (srv.ip && srv.port) {
        addToFavorites({
          ip: srv.ip,
          port: Number(srv.port),
          hostname: srv.name || `${srv.ip}:${srv.port}`,
          playerCount: 0,
          maxPlayers: 0,
          gameMode: "-",
          language: "-",
          hasPassword: !!srv.password,
          version: "-",
          usingOmp: false,
          partner: false,
          ping: 9999,
          players: [],
          password: srv.password || "",
          rules: {} as Server["rules"],
        });
      }
    });

    fetchServers(true);
    useNotification
      .getState()
      .showNotification(
        t("import_successful_title"),
        t("import_successful_description")
      );
  } catch (error) {
    Log.debug("Error importing servers:", error);
    showOkModal(t("import_failed_title"), t("import_failed_description"));
  }
};
