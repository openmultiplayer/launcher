import { invoke } from "@tauri-apps/api";
import { usePersistentServers, useServers } from "../states/servers";
import { ListType, Server } from "./types";
import { Log } from "./logger";

export const queryServer = (
  server: Server,
  listType: ListType = "internet",
  queryType: "all" | "basic" = "all"
) => {
  try {
    const { ip, port } = server;

    getServerInfo(ip, port, listType);
    getServerPing(ip, port, listType);

    if (queryType === "all") {
      getServerPlayers(ip, port, listType);
      getServerRules(ip, port, listType);
      getServerOmpStatus(ip, port, listType);
    }
  } catch (error) {
    Log.debug("[query.ts: queryServer]", error);
  }
};

const getServerInfo = async (ip: string, port: number, listType: ListType) => {
  try {
    const serverInfo = await invoke<string>("request_server_info", {
      ip: ip,
      port: port,
    });

    if (serverInfo === "no_data") {
      return Log.debug(
        "[query.ts: getServerInfo]",
        "There was a problem getting server main info"
      );
    }

    let queryObj = JSON.parse(serverInfo);
    const data = {
      hasPassword: queryObj.password,
      playerCount: queryObj.players,
      maxPlayers: queryObj.max_players,
      hostname: queryObj.hostname,
      gameMode: queryObj.gamemode,
      language: queryObj.language,
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

const getServerPlayers = async (
  ip: string,
  port: number,
  listType: ListType
) => {
  try {
    const serverPlayers = await invoke<string>("request_server_players", {
      ip: ip,
      port: port,
    });

    if (serverPlayers === "no_data") {
      return Log.debug(
        "[query.ts: getServerPlayers]",
        "There was a problem getting server player list"
      );
    }

    let server = getServerFromList(ip, port, listType);

    if (server) {
      let queryObj = JSON.parse(serverPlayers);

      if (queryObj.error) {
        server = { ...server };
        updateServerEveryWhere(server);
      } else if (Array.isArray(queryObj)) {
        server = { ...server, players: [...queryObj] };
        updateServerEveryWhere(server);
      }
    }
  } catch (e) {
    Log.debug("[query.ts: getServerPlayers]", e);
  }
};

const getServerRules = async (ip: string, port: number, listType: ListType) => {
  try {
    const serverRules = await invoke<string>("request_server_rules", {
      ip: ip,
      port: port,
    });

    if (serverRules === "no_data" || !Array.isArray(JSON.parse(serverRules))) {
      return Log.debug(
        "[query.ts: getServerRules]",
        "There was a problem getting server rule list"
      );
    }

    let server = getServerFromList(ip, port, listType);

    if (server) {
      let queryObj = JSON.parse(serverRules);
      const rules: Server["rules"] = {} as Server["rules"];

      queryObj.forEach((rule: [string, string]) => {
        rules[rule[0]] = rule[1];
      });

      server = { ...server, rules: rules };
      updateServerEveryWhere(server);
    }
  } catch (e) {
    Log.debug("[query.ts: getServerRules]", e);
  }
};

const getServerOmpStatus = async (
  ip: string,
  port: number,
  listType: ListType
) => {
  try {
    const serverOmpStatus = await invoke<string>("request_server_is_omp", {
      ip: ip,
      port: port,
    });

    let server = getServerFromList(ip, port, listType);
    if (server) {
      if (
        serverOmpStatus === "no_data" ||
        JSON.parse(serverOmpStatus).isOmp == undefined
      ) {
        server = { ...server, usingOmp: false };
        updateServerEveryWhere(server);
        return;
      }

      if (!server.usingOmp) {
        server = {
          ...server,
          usingOmp: JSON.parse(serverOmpStatus).isOmp as boolean,
        };
        updateServerEveryWhere(server);
      }
    }
  } catch (e) {}
};

const getServerPing = async (ip: string, port: number, listType: ListType) => {
  try {
    const serverPing = await invoke<string>("ping_server", {
      ip: ip,
      port: port,
    });

    let server = getServerFromList(ip, port, listType);
    if (server) {
      let ping = server.ping;

      if (typeof serverPing === "number") {
        if (serverPing !== 9999) {
          ping = serverPing;
        } else {
          if (server.ping === 0) {
            ping = serverPing;
          }
        }
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
