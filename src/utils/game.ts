import { fs, invoke, path, process, shell } from "@tauri-apps/api";
import { exists, writeTextFile, readTextFile } from "@tauri-apps/api/fs";
import { t } from "i18next";
import { invoke_rpc } from "../api/rpc";
import { ResourceInfo, validFileChecksums } from "../constants/app";
import { useJoinServerPrompt } from "../states/joinServerPrompt";
import { useMessageBox } from "../states/messageModal";
import { usePersistentServers, useServers } from "../states/servers";
import { useSettings } from "../states/settings";
import { useSettingsModal } from "../states/settingsModal";
import { Log } from "./logger";
import { sc } from "./sizeScaler";
import { Server } from "./types";
import { useGenericPersistentState } from "../states/genericStates";
import { save, open } from '@tauri-apps/api/dialog';
import { useNotification } from "../states/notification";
import { fetchServers } from "../utils/helpers";

export const copySharedFilesIntoGameFolder = async () => {
  const { gtasaPath } = useSettings.getState();
  const dir = await path.appLocalDataDir();
  const shared = await path.join(dir, "samp", "shared");
  await invoke_rpc("copy_files_to_gtasa", {
    src: shared,
    gtasa_dir: gtasaPath,
  }).then((e) => {
    throw e;
  });
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
        new Promise(async (resolve, reject) => {
          try {
            resolve(await isFileAvailableinGTASADir(file));
          } catch (e) {
            reject(e);
          }
        })
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
  const { addToRecentlyJoined } = usePersistentServers.getState();
  const { showMessageBox, hideMessageBox } = useMessageBox.getState();
  const { show: showSettings } = useSettingsModal.getState();
  const { sampVersion } = useSettings.getState();
  const { showPrompt, setServer } = useJoinServerPrompt.getState();
  const { setSelected } = useServers.getState();
  const { shouldUpdateDiscordStatus } = useGenericPersistentState.getState();

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

  if (sampVersion !== "custom") {
    let failExecution = false;
    try {
      const checks = await checkResourceFilesAvailability();
      if (checks.includes(false)) {
        Log.debug(
          "Failed file validation, let's copy files into GTASA directory"
        );
        await copySharedFilesIntoGameFolder();
      }
    } catch (e) {
      if (e === "need_admin") {
        const { showMessageBox, hideMessageBox } = useMessageBox.getState();
        showMessageBox({
          title: t("admin_permissions_required_modal_title"),
          description: t("admin_permissions_required_modal_description"),
          boxWidth: sc(500),
          buttons: [
            {
              title: t("run_as_admin"),
              onPress: async () => {
                shell
                  .open("https://assets.open.mp/run_as_admin.gif")
                  .then(() => process.exit());
                // await invoke("rerun_as_admin").then(() => {
                //   process.exit();
                // });
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
      }
      failExecution = true;
    }

    if (failExecution) {
      return;
    }
  }

  if (sampVersion === "custom" && !foundSampInGtaFolder) {
    showMessageBox({
      title: t("gta_path_modal_cant_find_samp_title"),
      description:
        t("gta_path_modal_cant_find_samp_description", {
          path: gtasaPath,
        }) +
        `\n` +
        t("gta_path_modal_cant_find_samp_description_2"),
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
          onPress: () => {
            shell.open(
              "https://uifserver.net/download/sa-mp-0.3.7-R5-1-MP-install.exe"
            );
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

  const dir = await path.appLocalDataDir();
  const ompFile = await path.join(dir, "omp/omp-client.dll");

  invoke("inject", {
    name: nickname,
    ip: server.ip,
    port: server.port,
    exe: gtasaPath,
    dll: sampDllPath,
    ompFile: ompFile,
    password: password,
    discord: shouldUpdateDiscordStatus,
  })
    .then(() => {
      addToRecentlyJoined(server);
      setSelected(undefined);
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
                shell
                  .open("https://assets.open.mp/run_as_admin.gif")
                  .then(() => process.exit());
                // await invoke("rerun_as_admin").then(() => {
                //   process.exit();
                // });
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

export const exportFavoriteListFile = async () => {
  const { favorites } = usePersistentServers.getState();
  const { showMessageBox, hideMessageBox } = useMessageBox.getState();
 
  if (!favorites.length) {
    showMessageBox({
      title: t("export_failed_title"),
      description: t("export_no_servers_description"),
      buttons: [
        {
          title: "OK",
          onPress: () => hideMessageBox(),
        },
      ],
    });
    return;
  }
 
  try {
    const exportData = {
      version: 1,
      servers: favorites.map(server => ({
        ip: server.ip,
        port: server.port,
        password: server.password || ""
      }))
    };
   
    const jsonString = JSON.stringify(exportData, null, 2);
   
    const savePath = await save({
      filters: [{
        name: 'JSON',
        extensions: ['json']
      }],
      defaultPath: 'omp_servers.json'
    });
   
    if (savePath) {
      await writeTextFile(savePath, jsonString);
     
      const { showNotification } = useNotification.getState();
      showNotification(
        t("export_successful_title"),
        t("export_successful_description")
      );
    }
  } catch (error) {
    Log.debug("Error exporting servers:", error);
    showMessageBox({
      title: t("export_failed_title"),
      description: t("export_failed_description"),
      buttons: [
        {
          title: "OK",
          onPress: () => hideMessageBox(),
        },
      ],
    });
  }
};

export const importFavoriteListFile = async () => {
  const { showMessageBox, hideMessageBox } = useMessageBox.getState();
 
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'JSON',
        extensions: ['json']
      }]
    });
    if (!selected) return;
    const fileContent = await readTextFile(selected as string);
    const { addToFavorites } = usePersistentServers.getState();
    const { showNotification } = useNotification.getState();
   
    try {
      const data = JSON.parse(fileContent);
     
      if (!data.servers || !Array.isArray(data.servers)) {
        throw new Error("Invalid file format: missing servers array");
      }
     
      let importCount = 0;
     
      for (const importedServer of data.servers) {
        if (importedServer.ip && importedServer.port) {
          
          const tempHostname = `${importedServer.ip}:${importedServer.port}`;

          const serverInfo: Server = {
            ip: importedServer.ip,
            port: Number(importedServer.port),
            hostname: tempHostname,
            playerCount: 0,
            maxPlayers: 0,
            gameMode: "-",
            language: "-",
            hasPassword: !!importedServer.password,
            version: "-",
            usingOmp: false,
            partner: false,
            ping: 9999,
            players: [],
            password: importedServer.password || "",
            rules: {} as Server["rules"],
          };
         
          addToFavorites(serverInfo);
          importCount++;
        }
      }

      fetchServers(true);
     
      showNotification(
        t("import_successful_title"),
        t("import_successful_description")
      );
     
    } catch (parseError) {
      showMessageBox({
        title: t("import_failed_title"),
        description: t("import_invalid_data_description"),
        buttons: [
          {
            title: "OK",
            onPress: () => hideMessageBox(),
          },
        ],
      });
      Log.debug("Error parsing imported file:", parseError);
    }
   
  } catch (error) {
    showMessageBox({
      title: t("import_failed_title"),
      description: t("import_failed_description"),
      buttons: [
        {
          title: "OK",
          onPress: () => hideMessageBox(),
        },
      ],
    });
    Log.debug("Error importing servers:", error);
  }
};