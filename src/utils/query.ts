import { invoke } from "@tauri-apps/api";
import { usePersistentServers, useServers } from "../states/servers";
import { Log } from "./logger";
import { ListType, Server } from "./types";

export const queryServer = (
  server: Server,
  listType: ListType = "internet",
  queryType: "all" | "basic" = "all",
  pingOnly = false
) => {
  try {
    const { ip, port } = server;

    if (pingOnly) {
      queryServerImpl(ip, port, false, false, false, false, true, listType);
    } else {
      if (queryType === "basic") {
        queryServerImpl(ip, port, true, false, false, false, true, listType);
      } else {
        queryServerImpl(ip, port, true, true, true, true, true, listType);
      }
    }
  } catch (error) {
    Log.debug("[query.ts: queryServer]", error);
  }
};

const queryServerImpl = async (
  ip: string,
  port: number,
  info: boolean,
  extraInfo: boolean,
  players: boolean,
  rules: boolean,
  ping: boolean,
  listType: ListType
) => {
  try {
    const result: any = JSON.parse(
      await invoke("query_server", {
        ip: ip,
        port: port,
        info,
        extraInfo,
        players,
        rules,
        ping,
      })
    );

    if (result.info) {
      result.info = JSON.parse(result.info);
      if (result.info.error !== true) {
        setServerInfo(ip, port, result.info, listType);
      }
    }

    if (result.players) {
      result.players = JSON.parse(result.players);
      if (result.players.error !== true) {
        setServerPlayers(ip, port, result.players, listType);
      }
    }

    if (result.rules) {
      result.rules = JSON.parse(result.rules);
      if (result.rules.error !== true) {
        setServerRules(ip, port, result.rules, listType);
      }
    }

    if (result.extra_info) {
      result.extra_info = JSON.parse(result.extra_info);
      if (result.extra_info.error !== true) {
        setServerOmpExtraInfo(ip, port, result.extra_info, listType);
      }
    }

    if (result.ping != null && typeof result.ping === "number") {
      setServerPing(ip, port, result.ping, listType);
    }
  } catch (e) {
    Log.debug("[query.ts: queryServerImpl]", e);
  }
};

const setServerInfo = async (
  ip: string,
  port: number,
  res: any,
  listType: ListType
) => {
  try {
    const data = {
      hasPassword: res.password,
      playerCount: res.players,
      maxPlayers: res.max_players,
      hostname: res.hostname,
      gameMode: res.gamemode,
      language: res.language,
    };

    let server = getServerFromList(ip, port, listType);
    if (server) {
      server = { ...server, ...data };
      updateServerEveryWhere(server);
    }
  } catch (e) {
    Log.debug("[query.ts: getServerInfo]", e);
  }
};

const setServerPlayers = async (
  ip: string,
  port: number,
  res: any,
  listType: ListType
) => {
  try {
    let server = getServerFromList(ip, port, listType);
    if (server) {
      if (Array.isArray(res)) {
        server = { ...server, players: [...res] };
        updateServerEveryWhere(server);
      }
    }
  } catch (e) {
    Log.debug("[query.ts: getServerPlayers]", e);
  }
};

const setServerRules = async (
  ip: string,
  port: number,
  res: any,
  listType: ListType
) => {
  try {
    let server = getServerFromList(ip, port, listType);
    if (server) {
      const rules: Server["rules"] = {} as Server["rules"];

      res.forEach((rule: [string, string]) => {
        rules[rule[0]] = rule[1];
      });

      let isOmp = false;

      if (rules["allowed_clients"]) {
        isOmp = true;
      } else {
        if (rules.version && rules.version.includes("omp ")) {
          isOmp = true;
        }
      }

      server = { ...server, rules: rules, usingOmp: isOmp };
      updateServerEveryWhere(server);
    }
  } catch (e) {
    Log.debug("[query.ts: getServerRules]", e);
  }
};

const setServerOmpExtraInfo = async (
  ip: string,
  port: number,
  res: any,
  listType: ListType
) => {
  try {
    let server = getServerFromList(ip, port, listType);
    if (server) {
      if (res) {
        server = {
          ...server,
          omp: {
            bannerLight:
              res.light_banner_url && res.light_banner_url.length
                ? res.light_banner_url
                : undefined,
            bannerDark:
              res.dark_banner_url && res.dark_banner_url.length
                ? res.dark_banner_url
                : undefined,
            discordInvite:
              res.discord_link && res.discord_link.length
                ? res.discord_link
                : undefined,
            logo:
              res.logo_url && res.logo_url.length ? res.logo_url : undefined,
          },
        };
        updateServerEveryWhere(server);
      }
    }
  } catch (e) {}
};

const setServerPing = async (
  ip: string,
  port: number,
  res: any,
  listType: ListType
) => {
  try {
    let server = getServerFromList(ip, port, listType);
    if (server) {
      let ping = server.ping;

      if (!isNaN(res)) {
        if (res !== 9999) {
          ping = res;
        } else {
          if (server.ping === 0) {
            ping = res;
          }
        }
      } else {
        ping = 9999;
      }

      server = {
        ...server,
        ping: ping,
      };
      updateServerEveryWhere(server);
    }
  } catch (e) {}
};

const getListBasedOnType = (listType: ListType) => {
  const { servers } = useServers.getState();
  const { favorites, recentlyJoined } = usePersistentServers.getState();

  if (listType === "internet" || listType === "partners") return servers;
  else if (listType === "favorites") return favorites;
  else if (listType === "recentlyjoined") return recentlyJoined;
  else return servers;
};

const getServerFromList = (ip: string, port: number, listType: ListType) => {
  const list = getListBasedOnType(listType);
  return list.find((server) => server.ip === ip && server.port === port);
};

const updateServerEveryWhere = (server: Server) => {
  const { updateServer, selected, setSelected } = useServers.getState();
  const { updateInFavoritesList, updateInRecentlyJoinedList } =
    usePersistentServers.getState();

  updateServer(server);
  updateInFavoritesList(server);
  updateInRecentlyJoinedList(server);

  if (selected) {
    if (server.ip == selected.ip && server.port == selected.port) {
      setSelected(server);
    }
  }
};
