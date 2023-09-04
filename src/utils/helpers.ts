import { getCachedInternetList } from "../api/apis";
import { useTempServersStore } from "../states/servers";
import { Player, Server, APIResponseServer } from "./types";

export const mapAPIResponseServerListToAppStructure = (
  list: APIResponseServer[]
) => {
  const restructuredList: Server[] = list.map((server) => {
    return {
      hostname: server.hn,
      gameMode: server.gm,
      ip: server.ip.split(":")[0],
      port: parseInt(server.ip.split(":")[1]),
      language: server.la,
      hasPassword: server.pa,
      playerCount: server.pc,
      maxPlayers: server.pm,
      version: server.vn,
      rules: {} as Server["rules"],
      players: [] as Player[],
      ping: 0,
      usingOmp: false,
    };
  });

  return restructuredList;
};

export const fetchInternetServers = async (cached: boolean = true) => {
  if (cached) {
    const response = await getCachedInternetList();
    useTempServersStore.getState().setInternetList(response.servers);
    console.log(response);
  }
};
