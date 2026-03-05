import { fs, invoke, path, process, shell } from "@tauri-apps/api";
import { open, save } from "@tauri-apps/api/dialog";
import { copyFile, exists, readTextFile, writeTextFile } from "@tauri-apps/api/fs";
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
import { PING_TIMEOUT_VALUE } from "./query";
import { sc } from "./sizeScaler";
import { Server } from "./types";
import { isIPv6, normalizeIPv6 } from "./validation";

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

const getLauncherTracePath = async (): Promise<string> => {
  const launcherDir = await invoke<string>("get_launcher_directory");
  return path.join(launcherDir, "omp-socket-trace.dll");
};

const stageTraceRuntimeIntoGameDir = async (
  gtasaPath: string,
  traceSource: string
): Promise<string | null> => {
  const traceTarget = await path.join(gtasaPath, "omp-socket-trace.dll");
  if (traceSource !== traceTarget) {
    await copyFile(traceSource, traceTarget);
  }

  const traceSourceDir = await path.dirname(traceSource);
  const runtimeSource = await path.join(traceSourceDir, "libwinpthread-1.dll");
  if (!(await fs.exists(runtimeSource))) {
    throw new Error(
      `Missing trace runtime dependency next to omp-socket-trace.dll: ${runtimeSource}`
    );
  }

  const runtimeTarget = await path.join(gtasaPath, "libwinpthread-1.dll");
  if (runtimeSource !== runtimeTarget) {
    await copyFile(runtimeSource, runtimeTarget);
  }

  return traceTarget;
};

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
  const resolvedAddress = (await getIpAddress(server.ip)) ?? server.ip;
  let launchAddress = resolvedAddress;
  let traceDualstack = false;
  let traceRemoteIp = "";
  let traceRemotePort = 0;
  let injectAddress = launchAddress;

  if (resolvedAddress && isIPv6(resolvedAddress)) {
    const normalizedIPv6 = normalizeIPv6(resolvedAddress);
    let ipv6ProbeOk = false;

    try {
      ipv6ProbeOk = await invoke<boolean>("probe_ipv6_query", {
        host: normalizedIPv6,
        port: server.port,
      });
      traceDualstack = ipv6ProbeOk;
    } catch (error) {
      Log.warn("[startGame] IPv6 probe failed unexpectedly:", error);
    }

    if (!ipv6ProbeOk) {
      const fallbackIPv4 = await getIpAddress(server.ip, "ipv4");
      if (fallbackIPv4 && !isIPv6(fallbackIPv4)) {
        launchAddress = fallbackIPv4;
        traceDualstack = false;
        Log.warn(
          `[startGame] IPv6 probe failed for ${normalizedIPv6}:${server.port}, falling back to IPv4 ${fallbackIPv4}`
        );
      } else {
        Log.warn(
          `[startGame] IPv6 probe failed for ${normalizedIPv6}:${server.port} and no IPv4 fallback was found`
        );
      }
    }
  }

  const connectAddress =
    launchAddress && isIPv6(launchAddress)
      ? `[${normalizeIPv6(launchAddress)}]`
      : launchAddress;

  if (IN_GAME) {
    invoke("send_message_to_game", {
      id: IN_GAME_PROCESS_ID,
      message: password.length
        ? `connect:${connectAddress}:${server.port}:${nickname}:${password}`
        : `connect:${connectAddress}:${server.port}:${nickname}`,
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

  // Custom exe doesn't exist
  if ((await fs.exists(await path.join(gtasaPath, customGameExe))) === false) {
    showMessageBox({
      title: t("unable_to_find_custom_game_exe_title"),
      description: t("unable_to_find_custom_game_exe_description"),
      buttons: [{ title: t("close"), onPress: hideMessageBox }],
    });
    return;
  }

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
  let traceFile = "";

  try {
    const launcherTracePath = await getLauncherTracePath();
    if (await fs.exists(launcherTracePath)) {
      traceFile = launcherTracePath;
    } else if (launchAddress && isIPv6(launchAddress)) {
      Log.warn(
        `[startGame] omp-socket-trace.dll not found in launcher directory: ${launcherTracePath}`
      );
    }
  } catch (error) {
    Log.warn("[startGame] Failed to resolve launcher directory for trace DLL lookup:", error);
  }

  if (traceFile.length) {
    try {
      const stagedTraceFile = await stageTraceRuntimeIntoGameDir(
        gtasaPath,
        traceFile
      );
      if (stagedTraceFile) {
        traceFile = stagedTraceFile;
      }
    } catch (error) {
      Log.warn(
        "[startGame] Failed to stage optional trace runtime into GTA directory. The trace shim requires omp-socket-trace.dll and libwinpthread-1.dll in the launcher directory:",
        error
      );
      traceFile = "";
      traceDualstack = false;
    }
  }

  if (!traceFile.length) {
    traceDualstack = false;

    if (launchAddress && isIPv6(launchAddress)) {
      const fallbackIPv4 = await getIpAddress(server.ip, "ipv4");
      if (fallbackIPv4 && !isIPv6(fallbackIPv4)) {
        Log.warn(
          `[startGame] IPv6 launch requires omp-socket-trace.dll; falling back to IPv4 ${fallbackIPv4}`
        );
        launchAddress = fallbackIPv4;
      } else {
        let launcherTracePath = "launcher.exe directory";
        try {
          launcherTracePath = await getLauncherTracePath();
        } catch (error) {
          Log.warn(
            "[startGame] Failed to resolve launcher directory while preparing IPv6 compat error:",
            error
          );
        }
        showOkModal(
          "IPv6 compatibility layer missing",
          `omp-socket-trace.dll is missing or unusable at ${launcherTracePath}, and no IPv4 fallback address is available for this server.`
        );
        showPrompt(true);
        setServer(server);
        return;
      }
    }
  }

  if (launchAddress && isIPv6(launchAddress) && traceDualstack && traceFile.length) {
    traceRemoteIp = normalizeIPv6(launchAddress);
    traceRemotePort = server.port;
    injectAddress = "127.0.0.1";
  } else {
    injectAddress = launchAddress;
  }

  invoke("inject", {
    name: nickname,
    ip: injectAddress,
    port: server.port,
    exe: gtasaPath,
    dll: ourSAMPDllPath,
    traceFile,
    traceDualstack,
    traceRemoteIp,
    traceRemotePort,
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
          ping: PING_TIMEOUT_VALUE,
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
