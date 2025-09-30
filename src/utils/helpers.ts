import { invoke, shell } from "@tauri-apps/api";
import { getVersion } from "@tauri-apps/api/app";
import { type } from "@tauri-apps/api/os";
import { t } from "i18next";
import { getUpdateInfo } from "../api/apis";
import { useAppState } from "../states/app";
import { useMessageBox } from "../states/messageModal";
import { usePersistentServers } from "../states/servers";
import { chunk } from "./array";
import { Log } from "./logger";
import { queryServer } from "./query";
import {
  APIResponseServer,
  SAMPDLLVersions,
  SAMP_DLL_VERSIONS,
  SearchData,
  Server,
  SortType,
} from "./types";
import { validateServerAddressIPv4 } from "./validation";

// Server update configuration
const SERVER_UPDATE_CONFIG = {
  BATCH_SIZE: 2,
  BATCH_DELAY: 2000,
  INITIAL_DELAY: 500,
} as const;

// Language filter configuration
interface LanguageFilter {
  readonly name: string;
  readonly keywords: readonly string[];
}

export const languageFilters: LanguageFilter[] = [];

export const mapAPIResponseServerListToAppStructure = (
  list: readonly APIResponseServer[]
): Server[] => {
  return list.map((server): Server => {
    const [ip, portStr] = server.core.ip.split(":");
    const port = parseInt(portStr, 10);

    return {
      hostname: server.core.hn,
      gameMode: server.core.gm,
      ip,
      port: isNaN(port) ? 7777 : port,
      language: server.core.la,
      hasPassword: server.core.pa,
      playerCount: server.core.pc,
      maxPlayers: server.core.pm,
      version: server.core.vn,
      rules: server.ru,
      players: [],
      ping: 9999,
      password: "",
      usingOmp: server.core.omp,
      partner: server.core.pr,
    };
  });
};

const updateServersInBatches = (
  servers: Server[],
  listType: "favorites" | "internet"
): void => {
  if (!servers.length) return;

  const batches = chunk(servers, SERVER_UPDATE_CONFIG.BATCH_SIZE);

  batches.forEach((batch, batchIndex) => {
    setTimeout(() => {
      batch.forEach((server) => {
        if (server) {
          queryServer(server, listType, "basic");
        }
      });
    }, SERVER_UPDATE_CONFIG.INITIAL_DELAY + batchIndex * SERVER_UPDATE_CONFIG.BATCH_DELAY);
  });
};

export const fetchServers = async (cached: boolean = true): Promise<void> => {
  if (!cached) return;

  try {
    // Import getCachedList from the API layer
    const { getCachedList } = await import("../api/apis");

    // Update favorites in batches
    const { favorites } = usePersistentServers.getState();
    if (Array.isArray(favorites) && favorites.length > 0) {
      updateServersInBatches(favorites, "favorites");
    }

    // Fetch and set servers through the API
    const response = await getCachedList();
    if (response.success && response.data.length > 0) {
      updateServersInBatches(response.data, "internet");
      Log.debug(`Fetched ${response.data.length} servers`);
    } else {
      Log.warn(
        "Failed to fetch servers or received empty list",
        response.error
      );
    }
  } catch (error) {
    Log.error("Failed to fetch servers:", error);
  }
};

export const fetchUpdateInfo = async () => {
  const nativeVer = await getVersion();
  const hostOS = await type();
  const response = await getUpdateInfo();
  if (response.data) {
    useAppState.getState().setUpdateInfo(response.data);
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

// Validation functions are now imported from ./validation.ts
// This provides better separation of concerns and reusability

export const getIpAddress = async (
  hostname: string
): Promise<string | null> => {
  if (!hostname || typeof hostname !== "string") {
    Log.warn("Invalid hostname provided to getIpAddress:", hostname);
    return null;
  }

  // Use validation function from validation.ts
  if (validateServerAddressIPv4(hostname)) {
    return hostname;
  }

  try {
    const ip = await invoke<string>("resolve_hostname", { hostname });
    Log.debug(`Resolved ${hostname} to ${ip}`);
    return ip;
  } catch (error) {
    Log.error("Failed to resolve hostname:", error);
    return null;
  }
};

const filterServers = (
  servers: readonly Server[],
  searchData: SearchData,
  checkForPartnership: boolean
): Server[] => {
  const { ompOnly, nonEmpty, unpassworded, query, languages } = searchData;

  const loweredQuery = query.toLowerCase();

  return servers.filter((server) => {
    // Basic validation
    if (!server.ip || !server.hostname) return false;

    // Filter checks
    const ompCheck = !ompOnly || server.usingOmp;
    const partnershipCheck = !checkForPartnership || server.partner;
    const nonEmptyCheck = !nonEmpty || server.playerCount > 0;
    const unpasswordedCheck = !unpassworded || !server.hasPassword;

    // Language check - optimized
    const languageCheck =
      !languages.length ||
      languages.some((lang) => checkLanguage(server.language, lang));

    // Query check - search in hostname and gameMode
    const queryCheck =
      !query ||
      server.hostname.toLowerCase().includes(loweredQuery) ||
      server.gameMode.toLowerCase().includes(loweredQuery);

    return (
      ompCheck &&
      partnershipCheck &&
      nonEmptyCheck &&
      unpasswordedCheck &&
      languageCheck &&
      queryCheck
    );
  });
};

const applySorting = (
  servers: Server[],
  sortType: SortType,
  field: keyof Server
): Server[] => {
  if (sortType === "none") return servers;

  const direction = sortType === "descending" ? 1 : -1;

  return [...servers].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * direction;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * direction;
    }

    return 0;
  });
};

export const sortAndSearchInServerList = (
  servers: readonly Server[],
  searchData: SearchData,
  checkForPartnership = false
): Server[] => {
  // Filter first
  let filteredServers = filterServers(servers, searchData, checkForPartnership);

  // Apply sorting - order matters for performance
  const { sortPing, sortPlayer, sortName, sortMode } = searchData;

  // Sort by ping (most common/important sort)
  if (sortPing !== "none") {
    filteredServers = applySorting(filteredServers, sortPing, "ping");
  }

  // Sort by player count
  if (sortPlayer !== "none") {
    filteredServers = applySorting(filteredServers, sortPlayer, "playerCount");
  }

  // Sort by hostname
  if (sortName !== "none") {
    filteredServers = applySorting(filteredServers, sortName, "hostname");
  }

  // Sort by game mode
  if (sortMode !== "none") {
    filteredServers = applySorting(filteredServers, sortMode, "gameMode");
  }

  return filteredServers;
};

const addLanguageFilter = (name: string, keywords: readonly string[]): void => {
  const exists = languageFilters.some((filter) => filter.name === name);
  if (!exists) {
    languageFilters.push({ name, keywords });
  }
};

export const generateLanguageFilters = () => {
  addLanguageFilter("English", ["English", "EN", "Eng"]);
  addLanguageFilter("Arabic", ["Arabic", "العربية"]);
  addLanguageFilter("Czech", ["Czech", "CZ", "Čeština"]);
  addLanguageFilter("Chinese", ["Chinese", "CN", "ZH", "中文"]);
  addLanguageFilter("Bulgarian", ["Bulgarian", "BG", "Български"]);
  addLanguageFilter("Dutch", ["Dutch", "NL", "Nederlands"]);
  addLanguageFilter("French", ["French", "FR", "Français"]);
  addLanguageFilter("Georgian", ["Georgian", "KA", "GEO", "ქართული"]);
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

export const checkLanguage = (
  lang: string | undefined,
  filter: string
): boolean => {
  if (!lang || !filter) return false;

  const languageFilter = languageFilters.find((l) => l.name === filter);
  if (!languageFilter) return false;

  const normalizedLang = lang.toLowerCase();
  return languageFilter.keywords.some((keyword) =>
    normalizedLang.includes(keyword.toLowerCase())
  );
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";
  if (bytes < 0) return "Invalid";

  const k = 1024;
  const sizes = [
    "Bytes",
    "KB",
    "MB",
    "GB",
    "TB",
    "PB",
    "EB",
    "ZB",
    "YB",
  ] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  if (i >= sizes.length) return "Too Large";

  const value = bytes / Math.pow(k, i);
  return `${parseFloat(value.toFixed(decimals))} ${sizes[i]}`;
};

export const getSampVersions = (): readonly SAMPDLLVersions[] => {
  return [...SAMP_DLL_VERSIONS];
};

const VERSION_NAME_MAP: Record<SAMPDLLVersions, string | (() => string)> = {
  "037R1_samp.dll": "0.3.7-R1",
  "037R2_samp.dll": "0.3.7-R2",
  "037R3_samp.dll": "0.3.7-R3",
  "037R31_samp.dll": "0.3.7-R3-1",
  "037R4_samp.dll": "0.3.7-R4",
  "037R5_samp.dll": "0.3.7-R5",
  "03DL_samp.dll": "0.3.DL",
  custom: () => t("from_gtasa_folder"),
};

export const getSampVersionName = (version: SAMPDLLVersions): string => {
  const nameOrFunction = VERSION_NAME_MAP[version];
  return typeof nameOrFunction === "function"
    ? nameOrFunction()
    : nameOrFunction;
};

export const getSampVersionFromName = (name: string): SAMPDLLVersions => {
  if (!name) return "custom";

  const versions = getSampVersions();
  for (const version of versions) {
    if (getSampVersionName(version) === name) {
      return version;
    }
  }

  return "custom";
};

export const checkIfProcessAlive = async (pid: number): Promise<boolean> => {
  if (!pid || pid <= 0) {
    Log.warn("Invalid PID provided to checkIfProcessAlive:", pid);
    return false;
  }

  try {
    const alive = await invoke<boolean>("is_process_alive", { pid });
    Log.debug(`PID ${pid} alive: ${alive}`);
    return alive;
  } catch (error) {
    Log.error("Failed to check process:", error);
    return false;
  }
};
