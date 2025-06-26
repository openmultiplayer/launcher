import { shell } from "@tauri-apps/api";
import { getVersion } from "@tauri-apps/api/app";
import { type } from "@tauri-apps/api/os";
import { t } from "i18next";
import { getCachedList, getUpdateInfo } from "../api/apis";
import { useAppState } from "../states/app";
import { useMessageBox } from "../states/messageModal";
import { usePersistentServers, useServers } from "../states/servers";
import { Log } from "./logger";
import { queryServer } from "./query";
import {
  APIResponseServer,
  Player,
  SAMPDLLVersions,
  SearchData,
  Server,
} from "./types";

const PARALLEL_SERVERS_TO_UPDATE_COUNT = 2;
const PARALLEL_SERVERS_TO_UPDATE_TIMER_INTERVAL = 2000;

export const languageFilters: {
  name: string;
  keywords: string[];
}[] = [];

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
      ping: 9999,
      password: "",
      usingOmp: server.core.omp,
      partner: server.core.pr,
    } as Server;
  });

  return restructuredList;
};

export const fetchServers = async (cached: boolean = true) => {
  if (cached) {
    const { favorites } = usePersistentServers.getState();
    if (Array.isArray(favorites)) {
      // let's query servers from server list so players have updated data
      for (
        let i = 0;
        i < favorites.length;
        i += PARALLEL_SERVERS_TO_UPDATE_COUNT
      ) {
        setTimeout(() => {
          for (
            let offset = 0;
            offset < PARALLEL_SERVERS_TO_UPDATE_COUNT;
            offset++
          ) {
            if (favorites[i + offset]) {
              queryServer(favorites[i + offset], "favorites", "basic");
            }
          }
        }, 500 + (i % PARALLEL_SERVERS_TO_UPDATE_COUNT) * PARALLEL_SERVERS_TO_UPDATE_TIMER_INTERVAL);
      }
    }

    const response = await getCachedList();
    useServers.getState().setServers(response.servers);

    Log.debug(response);
    if (Array.isArray(response.servers)) {
      // let's query servers from server list so players have updated data
      for (
        let i = 0;
        i < response.servers.length;
        i += PARALLEL_SERVERS_TO_UPDATE_COUNT
      ) {
        setTimeout(() => {
          for (
            let offset = 0;
            offset < PARALLEL_SERVERS_TO_UPDATE_COUNT;
            offset++
          ) {
            if (response.servers[i + offset]) {
              queryServer(response.servers[i + offset], "internet", "basic");
            }
          }
        }, 500 + (i / PARALLEL_SERVERS_TO_UPDATE_COUNT) * PARALLEL_SERVERS_TO_UPDATE_TIMER_INTERVAL);
      }
    }
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
    const { updateInfo, version, skipUpdate, skippedUpdateVersion } =
      useAppState.getState();
    const { showMessageBox, hideMessageBox } = useMessageBox.getState();

    if (
      updateInfo &&
      updateInfo.version != version &&
      skippedUpdateVersion != updateInfo.version
    ) {
      showMessageBox({
        title: t("update_modal_update_available_title"),
        description: t("update_modal_update_available_description", {
          version,
          newVersion: updateInfo.version,
        }),
        boxWidth: 640,
        buttonWidth: 200,
        buttons: [
          {
            title: t("download"),
            onPress: () => {
              shell.open(updateInfo.download);
              hideMessageBox();
            },
          },
          {
            title: t("update_modal_remind_me_next_time"),
            onPress: () => {
              hideMessageBox();
            },
          },
          {
            title: t("update_modal_skip_this_update"),
            onPress: () => {
              skipUpdate(updateInfo.version);
              hideMessageBox();
            },
          },
        ],
      });
    }
  }, 1000);
  Log.debug(response);
};

export const validateServerAddress = (address: string) => {
  if (
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      address
    )
  ) {
    return true;
  } else {
    // Check if it's localhost
    if (address === "localhost") {
      return true;
    }

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

export const sortAndSearchInServerList = (
  servers: Server[],
  searchData: SearchData,
  checkForPartnership = false
) => {
  const {
    ompOnly,
    nonEmpty,
    unpassworded,
    query,
    sortPing,
    sortPlayer,
    sortName,
    sortMode,
    languages,
  } = searchData;
  let list = servers.filter((server) => {
    const ompCheck = ompOnly ? server.usingOmp === true : true;
    const partnershipCheck = checkForPartnership
      ? server.partner === true
      : true;
    const nonEmptyCheck = nonEmpty ? server.playerCount > 0 : true;
    const unpasswordedCheck = unpassworded
      ? server.hasPassword === false
      : true;

    let languageResult = false;

    if (!languages.length) {
      languageResult = true;
    } else {
      languages.forEach((lang) => {
        const result = checkLanguage(server.language, lang);
        if (!languageResult) {
          languageResult = result;
        }
      });
    }

    const loweredQuery = query.toLowerCase();
    return (
      server.ip &&
      partnershipCheck &&
      ompCheck &&
      unpasswordedCheck &&
      nonEmptyCheck &&
      languageResult &&
      server.hostname &&
      server.hostname.toLowerCase().includes(loweredQuery) ||
      server.gameMode.toLowerCase().includes(loweredQuery)
    );
  });

  if (sortPing !== "none") {
    list = list.sort((a, b) => {
      if (sortPing === "descending") {
        return a.ping - b.ping;
      } else {
        return b.ping - a.ping;
      }
    });
  }

  if (sortPlayer !== "none") {
    list = list.sort((a, b) => {
      if (sortPlayer === "descending") {
        return a.playerCount - b.playerCount;
      } else {
        return b.playerCount - a.playerCount;
      }
    });
  }

  if (sortName !== "none") {
    list = list.sort((a, b) => {
      const nameA = a.hostname.toUpperCase();
      const nameB = b.hostname.toUpperCase();
      let aFirst = false;
      if (nameA < nameB) {
        aFirst = true;
      }

      if (sortName === "descending") {
        return aFirst ? -1 : 1;
      } else {
        return aFirst ? 1 : -1;
      }
    });
  }

  if (sortMode !== "none") {
    list = list.sort((a, b) => {
      const nameA = a.gameMode.toUpperCase();
      const nameB = b.gameMode.toUpperCase();
      let aFirst = false;
      if (nameA < nameB) {
        aFirst = true;
      }

      if (sortMode === "descending") {
        return aFirst ? -1 : 1;
      } else {
        return aFirst ? 1 : -1;
      }
    });
  }

  return list;
};

const addLanguageFilter = (name: string, keywords: string[]) => {
  const findIndex = languageFilters.findIndex((l) => l.name === name);
  if (findIndex == -1) {
    languageFilters.push({
      name,
      keywords: [...keywords],
    });
  }
};

export const generateLanguageFilters = () => {
  addLanguageFilter("English", ["English", "EN", "Eng"]);
  addLanguageFilter("Arabic", ["Arabic", "العربية"]);
  addLanguageFilter("Czech", ["Czech", "CZ", "Čeština"]);
  addLanguageFilter("Chinese", ["Chinese", "CN", "ZH", "中文"]);
  addLanguageFilter("Bulgarian", ["Bulgarian", "BG", "Български"]);
  addLanguageFilter("Dutch", ["Dutch", "NL"]);
  addLanguageFilter("French", ["French", "FR", "Français"]);
  addLanguageFilter("Georgian", ["Georgian", "KA", "ქართული"]);
  addLanguageFilter("German", ["German", "DE", "GER", "Deutsch"]);
  addLanguageFilter("Greek", ["Greek", "EL", "Ελληνικά"]);
  addLanguageFilter("Hungarian", ["Hungarian", "HU", "Magyar"]);
  addLanguageFilter("Indonesian", ["Indonesian", "ID", "Bahasa Indonesia "]);
  addLanguageFilter("Italian", ["Italian", "IT", "Italiano"]);
  addLanguageFilter("Lithuanian", ["Lithuanian", "LT", "Lietuvių"]);
  addLanguageFilter("Polish", ["Polish", "PL", "Polski"]);
  addLanguageFilter("Portuguese", ["Portuguese", "PT", "Português"]);
  addLanguageFilter("Romanian", ["Romanian", "RO", "Română"]);
  addLanguageFilter("Russian", ["Russian", "RU", "RUS", "Русский"]);
  addLanguageFilter("Spanish", ["Spanish", "ES", "Español"]);
  addLanguageFilter("Swedish", ["Swedish", "SV", "Svenska"]);
  addLanguageFilter("Turkish", ["Turkish", "TR", "Türkçe"]);
  addLanguageFilter("Ukrainian", ["Ukrainian", "UK", "Українська"]);
  addLanguageFilter("Vietnamese", [
    "Vietnamese",
    "VI",
    "Viet Nam",
    "Tiếng Việt",
  ]);
};

export const checkLanguage = (lang: string | undefined, filter: string) => {
  if (!lang) {
    return false;
  }

  const find = languageFilters.find((l) => l.name === filter);
  if (!find) {
    return false;
  }

  return find.keywords.some((keyword) =>
    lang?.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
  );
};

export const formatBytes = (bytes: number, decimals: number) => {
  if (bytes == 0) return "0 Bytes";
  var k = 1024,
    dm = decimals || 2,
    sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const getSampVersions = (): SAMPDLLVersions[] => {
  return [
    "custom",
    "037R1_samp.dll",
    "037R2_samp.dll",
    "037R3_samp.dll",
    "037R31_samp.dll",
    "037R4_samp.dll",
    "037R5_samp.dll",
    "03DL_samp.dll",
  ];
};

export const getSampVersionName = (version: SAMPDLLVersions) => {
  switch (version) {
    case "037R1_samp.dll":
      return "0.3.7-R1";
    case "037R2_samp.dll":
      return "0.3.7-R2";
    case "037R3_samp.dll":
      return "0.3.7-R3";
    case "037R31_samp.dll":
      return "0.3.7-R3-1";
    case "037R4_samp.dll":
      return "0.3.7-R4";
    case "037R5_samp.dll":
      return "0.3.7-R5";
    case "03DL_samp.dll":
      return "0.3.DL";
    case "custom":
      return t("from_gtasa_folder");
  }
};

export const getSampVersionFromName = (name: string): SAMPDLLVersions => {
  let ret: SAMPDLLVersions = "custom";
  getSampVersions().forEach((ver) => {
    if (getSampVersionName(ver) === name) {
      ret = ver;
    }
  });
  return ret;
};
