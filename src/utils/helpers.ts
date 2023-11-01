import { invoke, shell } from "@tauri-apps/api";
import { getVersion } from "@tauri-apps/api/app";
import { ask, confirm, message } from "@tauri-apps/api/dialog";
import { exists } from "@tauri-apps/api/fs";
import { type } from "@tauri-apps/api/os";
import { getCachedList, getUpdateInfo } from "../api/apis";
import { useAppState } from "../states/app";
import { usePersistentServersStore, useServers } from "../states/servers";
import { APIResponseServer, Player, Server } from "./types";

export const mapAPIResponseServerListToAppStructure = (
  list: APIResponseServer[]
) => {
  const restructuredList: Server[] = list.map((server) => {
    return {
      hostname: server.core.hn,
      gameMode: server.core.gm,
      ip: server.core.ip.split(":")[0],
      port: parseInt(server.core.ip.split(":")[1]),
      language: server.core.la,
      hasPassword: server.core.pa,
      playerCount: server.core.pc,
      maxPlayers: server.core.pm,
      version: server.core.vn,
      rules: server.ru,
      players: [] as Player[],
      ping: 0,
      usingOmp: server.core.omp,
      partner: server.core.pr,
    } as Server;
  });

  return restructuredList;
};

export const fetchServers = async (cached: boolean = true) => {
  if (cached) {
    const response = await getCachedList();
    useServers.getState().setServers(response.servers);
    console.log(response);
  }
};

export const fetchUpdateInfo = async () => {
  const nativeVer = await getVersion();
  const hostOS = await type();
  const response = await getUpdateInfo();
  if (response.info) {
    useAppState.getState().setUpdateInfo(response.info);
    useAppState.getState().setNativeAppVersionValue(nativeVer);
    useAppState.getState().setHostOSValue(hostOS);
  }

  setTimeout(async () => {
    const updateInfo = useAppState.getState().updateInfo;
    const version = useAppState.getState().version;
    if (updateInfo && updateInfo.version != version) {
      const download = await ask(
        `New launcher build is available!
      Your launcher build version: #${version}
      Current launcher vuild version: #${updateInfo.version}
Click "Download" to open release page`,
        {
          type: "info",
          title: "Update Available",
          cancelLabel: "Ignore",
          okLabel: "Download",
        }
      );

      if (download) {
        shell.open(updateInfo.download);
      }
    }
  }, 1000);
  console.log(response);
};

export const startGame = (
  nickname: string,
  ip: string,
  port: number,
  gtasaPath: string,
  sampDllPath: string,
  password: string
) => {
  const { addToRecentlyJoined } = usePersistentServersStore.getState();
  addToRecentlyJoined(`${ip}:${port}`);
  invoke("inject", {
    name: nickname,
    ip: ip,
    port: port,
    exe: gtasaPath,
    dll: sampDllPath,
    password: password,
  });
};

export const checkDirectoryValidity = async (path: string) => {
  const gtasaExists = await exists(path + "/gta_sa.exe");
  if (!gtasaExists) {
    message(
      `Can not find the right GTA San Andreas installation in this directory:
  ${path}
Unable to find "gta_sa.exe" in your given path.
  ${path}/gta_sa.exe does not exist.
    `,
      { title: "gta_sa.exe doesn't exist", type: "error" }
    );
    return false;
  }

  const sampExists = await exists(path + "/samp.dll");
  if (!sampExists) {
    const download = await confirm(
      `Can not find the right SA-MP installation in this directory:
  ${path}
Unable to find "samp.dll" in your given path.
  ${path}/samp.dll does not exist.

Please refer to https://sa-mp.mp/ to download SA-MP
    `,
      {
        title: "samp.dll doesn't exist",
        type: "error",
        cancelLabel: "Close",
        okLabel: "Download",
      }
    );
    if (download) {
      shell.open("https://sa-mp.mp/downloads/");
    }
    return false;
  }

  return true;
};

export const validateServerAddress = (address: string) => {
  if (
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      address
    )
  ) {
    return true;
  } else {
    // Check if it's a valid domain
    let regex = new RegExp(
      /^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/
    );

    // if str
    // is empty return false
    if (address == null) {
      return false;
    }

    // Return true if the str
    // matched the ReGex
    if (regex.test(address) == true) {
      return true;
    } else {
      return false;
    }
  }
};

export const validateWebUrl = (url: string) => {
  if (
    /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
      url
    )
  ) {
    return true;
  }
  return false;
};
