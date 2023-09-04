import { invoke } from "@tauri-apps/api";
import { Player, Server } from "./types";

export const querySertver = async (ip: string, port: number) => {
  return new Promise<Server>(async (resolve, reject) => {
    try {
      let server: Server = {} as Server;

      server = { ...server, ...(await getServerInfo(ip, port)) };
      server.players = await getServerPlayers(ip, port);
      server.rules = await getServerRules(ip, port);
      server.usingOmp = await getServerOmpStatus(ip, port);
      server.ping = await getServerPing(ip, port);

      return resolve(server);
    } catch (error) {
      reject(error);
    }
  });
};

const getServerInfo = async (ip: string, port: number) => {
  const serverInfo = await invoke<string>("request_server_info", {
    ip: ip,
    port: port,
  });

  if (serverInfo === "no_data") {
    throw new Error("[Query] There was a problem getting server main info");
  }

  let queryObj = JSON.parse(serverInfo);
  const server = {
    hasPassword: queryObj.password,
    playerCount: queryObj.players,
    maxPlayers: queryObj.max_players,
    hostname: queryObj.hostname,
    gameMode: queryObj.gamemode,
    language: queryObj.language,
  };

  return server;
};

const getServerPlayers = async (ip: string, port: number) => {
  const serverPlayers = await invoke<string>("request_server_players", {
    ip: ip,
    port: port,
  });

  if (
    serverPlayers === "no_data" ||
    !Array.isArray(JSON.parse(serverPlayers))
  ) {
    throw new Error("[Query] There was a problem getting server player list");
  }

  let queryObj = JSON.parse(serverPlayers);
  const players: Player[] = [...queryObj];
  return players;
};

const getServerRules = async (ip: string, port: number) => {
  const serverRules = await invoke<string>("request_server_rules", {
    ip: ip,
    port: port,
  });

  if (serverRules === "no_data" || !Array.isArray(JSON.parse(serverRules))) {
    throw new Error("[Query] There was a problem getting server rule list");
  }

  let queryObj = JSON.parse(serverRules);
  const rules: Server["rules"] = {} as Server["rules"];

  queryObj.forEach((rule: [string, string]) => {
    rules[rule[0]] = rule[1];
  });

  return rules;
};

const getServerOmpStatus = async (ip: string, port: number) => {
  const serverOmpStatus = await invoke<string>("request_server_is_omp", {
    ip: ip,
    port: port,
  });

  if (
    serverOmpStatus === "no_data" ||
    JSON.parse(serverOmpStatus).isOmp == undefined
  ) {
    return false;
  }

  return JSON.parse(serverOmpStatus).isOmp as boolean;
};

const getServerPing = async (ip: string, port: number) => {
  const serverPing = await invoke<string>("ping_server", {
    ip: ip,
    port: port,
  });

  if (typeof serverPing !== "number") {
    return 0;
  }

  return serverPing;
};
