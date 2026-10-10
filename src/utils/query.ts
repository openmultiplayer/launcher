import { invoke } from "@tauri-apps/api";
import { usePersistentServers, useServers } from "../states/servers";
import { Log } from "./logger";
import { ListType, Server } from "./types";

export const PING_TIMEOUT_VALUE = 9999;
const DEFAULT_PING_VALUE = 0;

interface QueryResult {
  info?: string;
  players?: string;
  rules?: string;
  extra_info?: string;
  ping?: number;
}

interface ServerInfo {
  password: boolean;
  players: number;
  max_players: number;
  hostname: string;
  gamemode: string;
  language: string;
  error?: boolean;
}

interface OmpExtraInfo {
  light_banner_url?: string;
  dark_banner_url?: string;
  discord_link?: string;
  logo_url?: string;
  error?: boolean;
}

interface QueryConfig {
  info: boolean;
  extraInfo: boolean;
  players: boolean;
  rules: boolean;
  ping: boolean;
}

const createQueryConfig = (
  queryType: "all" | "basic" | "ping"
): QueryConfig => {
  switch (queryType) {
    case "ping":
      return {
        info: false,
        extraInfo: false,
        players: false,
        rules: false,
        ping: true,
      };
    case "basic":
      return {
        info: true,
        extraInfo: false,
        players: false,
        rules: false,
        ping: true,
      };
    case "all":
    default:
      return {
        info: true,
        extraInfo: true,
        players: true,
        rules: true,
        ping: true,
      };
  }
};

export const queryServer = (
  server: Server,
  listType: ListType = "internet",
  queryType: "all" | "basic" = "all",
  pingOnly = false
): void => {
  try {
    const { ip, port } = server;
    const config = createQueryConfig(pingOnly ? "ping" : queryType);

    queryServerImpl(ip, port, config, listType);
  } catch (error) {
    Log.debug("[query.ts: queryServer]", error);
  }
};

const queryServerImpl = async (
  ip: string,
  port: number,
  config: QueryConfig,
  listType: ListType
): Promise<void> => {
  try {
    const result: QueryResult = JSON.parse(
      await invoke("query_server", {
        ip,
        port,
        info: config.info,
        extraInfo: config.extraInfo,
        players: config.players,
        rules: config.rules,
        ping: config.ping,
      })
    );

    await processQueryResult(ip, port, result, listType);
  } catch (e) {
    Log.debug("[query.ts: queryServerImpl]", e);
  }
};

const parseJsonResponse = <T>(jsonString: string): T | null => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
};

const processQueryResult = async (
  ip: string,
  port: number,
  result: QueryResult,
  listType: ListType
): Promise<void> => {
  if (result.info) {
    const parsedInfo = parseJsonResponse<ServerInfo>(result.info);
    if (parsedInfo && !parsedInfo.error) {
      await setServerInfo(ip, port, parsedInfo, listType);
    }
  }

  if (result.players) {
    const parsedPlayers = parseJsonResponse<any[]>(result.players);
    if (parsedPlayers) {
      if (
        !Array.isArray(parsedPlayers) ||
        !parsedPlayers.some((p: any) => p.error)
      ) {
        await setServerPlayers(ip, port, parsedPlayers, listType);
      }
    }
  }

  if (result.rules) {
    const parsedRules = parseJsonResponse<any[]>(result.rules);
    if (parsedRules && !parsedRules.some?.((r: any) => r.error)) {
      await setServerRules(ip, port, parsedRules, listType);
    }
  }

  if (result.extra_info) {
    const parsedExtraInfo = parseJsonResponse<OmpExtraInfo>(result.extra_info);
    if (parsedExtraInfo && !parsedExtraInfo.error) {
      await setServerOmpExtraInfo(ip, port, parsedExtraInfo, listType);
    }
  }

  if (result.ping != null && typeof result.ping === "number") {
    await setServerPing(ip, port, result.ping, listType);
  }
};

const setServerInfo = async (
  ip: string,
  port: number,
  res: ServerInfo,
  listType: ListType
): Promise<void> => {
  try {
    const data = {
      hasPassword: res.password,
      playerCount: res.players,
      maxPlayers: res.max_players,
      hostname: res.hostname,
      gameMode: res.gamemode,
      language: res.language,
    };

    const server = getServerFromList(ip, port, listType);
    if (server) {
      const updatedServer = { ...server, ...data };
      updateServerEveryWhere(updatedServer);
    }
  } catch (e) {
    Log.debug("[query.ts: setServerInfo]", e);
  }
};

const setServerPlayers = async (
  ip: string,
  port: number,
  res: any[],
  listType: ListType
): Promise<void> => {
  try {
    const server = getServerFromList(ip, port, listType);
    if (server && Array.isArray(res)) {
      const updatedServer = { ...server, players: [...res] };
      updateServerEveryWhere(updatedServer);
    }
  } catch (e) {
    Log.debug("[query.ts: setServerPlayers]", e);
  }
};

const determineIfOmpServer = (rules: Server["rules"]): boolean => {
  return Boolean(
    rules["allowed_clients"] ||
      (rules.version && rules.version.includes("omp "))
  );
};

const setServerRules = async (
  ip: string,
  port: number,
  res: [string, string][],
  listType: ListType
): Promise<void> => {
  try {
    const server = getServerFromList(ip, port, listType);
    if (server) {
      const rules: Server["rules"] = {} as Server["rules"];

      res.forEach(([key, value]) => {
        rules[key] = value;
      });

      const isOmp = determineIfOmpServer(rules);
      const updatedServer = { ...server, rules, usingOmp: isOmp };
      updateServerEveryWhere(updatedServer);
    }
  } catch (e) {
    Log.debug("[query.ts: setServerRules]", e);
  }
};

const createOmpExtraInfo = (res: OmpExtraInfo) => ({
  bannerLight: res.light_banner_url?.length ? res.light_banner_url : undefined,
  bannerDark: res.dark_banner_url?.length ? res.dark_banner_url : undefined,
  discordInvite: res.discord_link?.length ? res.discord_link : undefined,
  logo: res.logo_url?.length ? res.logo_url : undefined,
});

const setServerOmpExtraInfo = async (
  ip: string,
  port: number,
  res: OmpExtraInfo,
  listType: ListType
): Promise<void> => {
  try {
    const server = getServerFromList(ip, port, listType);
    if (server && res) {
      const updatedServer = {
        ...server,
        omp: createOmpExtraInfo(res),
      };
      updateServerEveryWhere(updatedServer);
    }
  } catch (e) {
    Log.debug("[query.ts: setServerOmpExtraInfo]", e);
  }
};

const calculatePing = (newPing: number, currentPing: number): number => {
  if (isNaN(newPing)) {
    return PING_TIMEOUT_VALUE;
  }

  if (newPing !== PING_TIMEOUT_VALUE) {
    return newPing;
  }

  return currentPing === DEFAULT_PING_VALUE ? newPing : currentPing;
};

const setServerPing = async (
  ip: string,
  port: number,
  res: number,
  listType: ListType
): Promise<void> => {
  try {
    const server = getServerFromList(ip, port, listType);
    if (server) {
      const ping = calculatePing(res, server.ping);
      const updatedServer = { ...server, ping };
      updateServerEveryWhere(updatedServer);
    }
  } catch (e) {
    Log.debug("[query.ts: setServerPing]", e);
  }
};

const getListBasedOnType = (listType: ListType): Server[] => {
  const { servers } = useServers.getState();
  const { favorites, recentlyJoined } = usePersistentServers.getState();

  switch (listType) {
    case "internet":
    case "partners":
      return servers;
    case "favorites":
      return favorites;
    case "recentlyjoined":
      return recentlyJoined;
    default:
      return servers;
  }
};

const getServerFromList = (
  ip: string,
  port: number,
  listType: ListType
): Server | undefined => {
  const list = getListBasedOnType(listType);
  return list.find((server) => server.ip === ip && server.port === port);
};

const updateServerEveryWhere = (server: Server): void => {
  const { updateServer, selected, setSelected } = useServers.getState();
  const { updateInFavoritesList, updateInRecentlyJoinedList } =
    usePersistentServers.getState();

  updateServer(server);
  updateInFavoritesList(server);
  updateInRecentlyJoinedList(server);

  if (selected?.ip === server.ip && selected?.port === server.port) {
    setSelected(server);
  }
};
