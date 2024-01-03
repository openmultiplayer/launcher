import { invoke, process, shell } from "@tauri-apps/api";
import { getVersion } from "@tauri-apps/api/app";
import { exists } from "@tauri-apps/api/fs";
import { type } from "@tauri-apps/api/os";
import { t } from "i18next";
import { getCachedList, getUpdateInfo } from "../api/apis";
import { useAppState } from "../states/app";
import { useJoinServerPrompt } from "../states/joinServerPrompt";
import { useMessageBox } from "../states/messageModal";
import { usePersistentServers, useServers } from "../states/servers";
import { useSettingsModal } from "../states/settingsModal";
import { Log } from "./logger";
import { queryServer } from "./query";
import { APIResponseServer, Player, SearchData, Server } from "./types";

const PARALLEL_SERVERS_TO_UPDATE_COUNT = 5;
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
      ping: 0,
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
      for (let i = 0; i < favorites.length; i += 10) {
        setTimeout(() => {
          for (let offset = 0; offset < 10; offset++) {
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
      for (let i = 0; i < response.servers.length; i += 15) {
        setTimeout(() => {
          for (let offset = 0; offset < 15; offset++) {
            if (response.servers[i + offset])
              queryServer(response.servers[i + offset], "internet", "basic");
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
        boxWidth: 550,
        buttonWidth: 160,
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

    return (
      server.ip &&
      partnershipCheck &&
      ompCheck &&
      unpasswordedCheck &&
      nonEmptyCheck &&
      languageResult &&
      server.hostname &&
      server.hostname.toLowerCase().includes(query.toLowerCase())
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
